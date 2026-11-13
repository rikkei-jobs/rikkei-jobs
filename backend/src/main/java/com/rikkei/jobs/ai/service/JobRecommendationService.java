package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.dto.JobRecommendationDto;
import com.rikkei.jobs.ai.dto.JobRecommendationsResponse;
import com.rikkei.jobs.ai.dto.JobSkillDto;
import com.rikkei.jobs.ai.model.JobRecommendation;
import com.rikkei.jobs.ai.repository.JobRecommendationRepository;
import com.rikkei.jobs.assessment.model.Skill;
import com.rikkei.jobs.assessment.repository.SkillRepository;
import com.rikkei.jobs.candidate.model.CandidateSkill;
import com.rikkei.jobs.candidate.repository.CandidateSkillRepository;
import com.rikkei.jobs.company.model.Job;
import com.rikkei.jobs.company.model.JobSkill;
import com.rikkei.jobs.company.repository.JobRepository;
import com.rikkei.jobs.company.repository.JobSkillRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobRecommendationService {

    private static final Logger log = LoggerFactory.getLogger(JobRecommendationService.class);

    private final JobRepository jobRepository;
    private final JobSkillRepository jobSkillRepository;
    private final CandidateSkillRepository candidateSkillRepository;
    private final JobRecommendationRepository jobRecommendationRepository;
    private final SkillRepository skillRepository;
    private final AiService aiService;

    public JobRecommendationService(
            JobRepository jobRepository,
            JobSkillRepository jobSkillRepository,
            CandidateSkillRepository candidateSkillRepository,
            JobRecommendationRepository jobRecommendationRepository,
            SkillRepository skillRepository,
            AiService aiService) {
        this.jobRepository = jobRepository;
        this.jobSkillRepository = jobSkillRepository;
        this.candidateSkillRepository = candidateSkillRepository;
        this.jobRecommendationRepository = jobRecommendationRepository;
        this.skillRepository = skillRepository;
        this.aiService = aiService;
    }

    /**
     * Retrieves top recommended jobs for candidate. Implements 24-hour database caching, DN-06
     * matching calculation, anonymized AI prompt generation for top 5, and graceful fallback.
     */
    @Transactional
    public JobRecommendationsResponse getRecommendations(
            Long userId, int limit, boolean forceRefresh) {
        int boundedLimit = Math.max(1, Math.min(limit, 100));

        // 1. Check 24-hour database cache
        List<JobRecommendation> cached =
                jobRecommendationRepository.findByUserIdOrderByScoreDesc(userId);
        if (!forceRefresh && !cached.isEmpty()) {
            OffsetDateTime cacheTimestamp =
                    cached.stream()
                            .map(JobRecommendation::getCreatedAt)
                            .max(Comparator.naturalOrder())
                            .orElse(OffsetDateTime.MIN);

            boolean isWithin24Hours = cacheTimestamp.isAfter(OffsetDateTime.now().minusHours(24));
            if (isWithin24Hours && !isCacheInvalidated(userId, cacheTimestamp)) {
                log.info(
                        "[JOB_REC_CACHE_HIT] Candidate {}, cached at {}, skipping AI invocation",
                        userId,
                        cacheTimestamp);
                return buildResponseFromCache(userId, cached, boundedLimit, cacheTimestamp);
            }
        }

        log.info(
                "[JOB_REC_COMPUTE] Computing fresh recommendations for Candidate {}, limit {}",
                userId,
                boundedLimit);

        // 2. Fetch candidate verified skills
        List<CandidateSkill> candidateSkills =
                candidateSkillRepository.findByUserIdAndVerifiedTrue(userId);
        Map<String, Integer> candidateSkillMap =
                candidateSkills.stream()
                        .collect(
                                Collectors.toMap(
                                        CandidateSkill::getSkillCode,
                                        CandidateSkill::getScore,
                                        (a, b) -> Math.max(a, b)));

        // 3. Fetch all active APPROVED JDs (deadline > now)
        List<Job> activeJobs =
                jobRepository.findByStatusAndDeadlineAfter("APPROVED", OffsetDateTime.now());
        if (activeJobs.isEmpty()) {
            return new JobRecommendationsResponse(
                    List.of(),
                    0,
                    userId,
                    false,
                    OffsetDateTime.now(),
                    aiService.getActiveProvider().name());
        }

        // Fetch skills catalogue for friendly names
        Map<String, Skill> skillsCatalogue =
                skillRepository.findAll().stream()
                        .collect(
                                Collectors.toMap(Skill::getCode, Function.identity(), (a, b) -> a));

        // Fetch required skills for all candidate jobs
        List<Long> jobIds = activeJobs.stream().map(Job::getId).toList();
        Map<Long, List<JobSkill>> jobSkillsByJobId =
                jobSkillRepository.findByJobIdIn(jobIds).stream()
                        .collect(Collectors.groupingBy(JobSkill::getJobId));

        // 4. Calculate DN-06 matching score for each job
        List<JobMatchResult> matchResults = new ArrayList<>();
        for (Job job : activeJobs) {
            List<JobSkill> requiredSkills = jobSkillsByJobId.getOrDefault(job.getId(), List.of());
            JobMatchResult result =
                    calculateMatch(job, requiredSkills, candidateSkillMap, skillsCatalogue);
            matchResults.add(result);
        }

        // Sort by score DESC, then jobId ASC
        matchResults.sort(
                Comparator.comparingInt(JobMatchResult::score)
                        .reversed()
                        .thenComparing(r -> r.job().getId()));

        // Limit to top 10 (or requested limit)
        List<JobMatchResult> topResults = matchResults.stream().limit(boundedLimit).toList();

        // 5. Generate explanation: Top 5 via AI Service, Ranks 6+ via rule template
        List<JobRecommendation> newRecommendations = new ArrayList<>();
        List<JobRecommendationDto> dtoList = new ArrayList<>();

        for (int i = 0; i < topResults.size(); i++) {
            JobMatchResult mr = topResults.get(i);
            int rank = i + 1;
            boolean isTop5 = rank <= 5;

            String defaultExplanation = buildDefaultExplanation(mr);
            String finalExplanation;
            boolean isAiGenerated = false;

            if (isTop5) {
                String prompt = buildAnonymizedPrompt(mr, candidateSkillMap, skillsCatalogue);
                finalExplanation = aiService.generateJobExplanation(prompt, defaultExplanation);
                isAiGenerated = true;
            } else {
                finalExplanation = defaultExplanation;
            }

            JobRecommendation rec =
                    new JobRecommendation(userId, mr.job().getId(), mr.score(), finalExplanation);
            newRecommendations.add(rec);

            JobRecommendationDto dto =
                    new JobRecommendationDto(
                            mr.job().getId(),
                            mr.job().getId(),
                            mr.job().getTitle(),
                            mr.job().getCompanyName(),
                            mr.job().getLocation(),
                            mr.job().getSalaryRange(),
                            mr.job().getDeadline() != null
                                    ? mr.job().getDeadline().toString()
                                    : null,
                            mr.score(),
                            finalExplanation,
                            isAiGenerated,
                            rank,
                            mr.matchingSkillNames(),
                            mr.missingSkillNames(),
                            mr.requiredSkillDtos());
            dtoList.add(dto);
        }

        // 6. Persist to job_recommendations table
        jobRecommendationRepository.deleteByUserId(userId);
        jobRecommendationRepository.saveAll(newRecommendations);

        return new JobRecommendationsResponse(
                dtoList,
                dtoList.size(),
                userId,
                false,
                OffsetDateTime.now(),
                aiService.getActiveProvider().name());
    }

    /** Checks if candidate skills or active jobs were modified since the cache was created. */
    private boolean isCacheInvalidated(Long userId, OffsetDateTime cacheTimestamp) {
        List<CandidateSkill> skills = candidateSkillRepository.findByUserId(userId);
        boolean candidateUpdated =
                skills.stream()
                        .anyMatch(
                                s ->
                                        s.getUpdatedAt() != null
                                                && s.getUpdatedAt().isAfter(cacheTimestamp));
        if (candidateUpdated) {
            return true;
        }

        List<Job> jobs =
                jobRepository.findByStatusAndDeadlineAfter("APPROVED", OffsetDateTime.now());
        return jobs.stream()
                .anyMatch(
                        j -> j.getUpdatedAt() != null && j.getUpdatedAt().isAfter(cacheTimestamp));
    }

    /** Builds response from database cache without calling external AI. */
    private JobRecommendationsResponse buildResponseFromCache(
            Long userId, List<JobRecommendation> cached, int limit, OffsetDateTime cacheTimestamp) {
        List<Long> jobIds = cached.stream().map(JobRecommendation::getJobId).toList();
        Map<Long, Job> jobMap =
                jobRepository.findAllById(jobIds).stream()
                        .collect(Collectors.toMap(Job::getId, Function.identity()));

        Map<Long, List<JobSkill>> jobSkillsMap =
                jobSkillRepository.findByJobIdIn(jobIds).stream()
                        .collect(Collectors.groupingBy(JobSkill::getJobId));

        List<CandidateSkill> candSkills =
                candidateSkillRepository.findByUserIdAndVerifiedTrue(userId);
        Map<String, Integer> candSkillMap =
                candSkills.stream()
                        .collect(
                                Collectors.toMap(
                                        CandidateSkill::getSkillCode,
                                        CandidateSkill::getScore,
                                        (a, b) -> a));

        Map<String, Skill> skillsCatalogue =
                skillRepository.findAll().stream()
                        .collect(
                                Collectors.toMap(Skill::getCode, Function.identity(), (a, b) -> a));

        List<JobRecommendationDto> dtoList = new ArrayList<>();
        int rank = 1;
        for (JobRecommendation rec : cached) {
            if (dtoList.size() >= limit) {
                break;
            }
            Job job = jobMap.get(rec.getJobId());
            if (job == null) {
                continue;
            }

            List<JobSkill> jSkills = jobSkillsMap.getOrDefault(job.getId(), List.of());
            JobMatchResult mr = calculateMatch(job, jSkills, candSkillMap, skillsCatalogue);

            dtoList.add(
                    new JobRecommendationDto(
                            rec.getId(),
                            job.getId(),
                            job.getTitle(),
                            job.getCompanyName(),
                            job.getLocation(),
                            job.getSalaryRange(),
                            job.getDeadline() != null ? job.getDeadline().toString() : null,
                            rec.getScore(),
                            rec.getExplanation(),
                            rank <= 5,
                            rank,
                            mr.matchingSkillNames(),
                            mr.missingSkillNames(),
                            mr.requiredSkillDtos()));
            rank++;
        }

        return new JobRecommendationsResponse(
                dtoList,
                dtoList.size(),
                userId,
                true,
                cacheTimestamp,
                aiService.getActiveProvider().name());
    }

    /**
     * Implements DN-06 skill matching formula: Mandatory skills weight = 2.0, preferred skills
     * weight = 1.0. Ratio = min(1.0, candScore / requiredLevel).
     */
    public JobMatchResult calculateMatch(
            Job job,
            List<JobSkill> requiredSkills,
            Map<String, Integer> candidateSkillMap,
            Map<String, Skill> skillsCatalogue) {

        if (requiredSkills == null || requiredSkills.isEmpty()) {
            return new JobMatchResult(job, 100, List.of(), List.of(), List.of());
        }

        double totalWeightedRatio = 0.0;
        double totalWeight = 0.0;

        List<String> matchingSkillNames = new ArrayList<>();
        List<String> missingSkillNames = new ArrayList<>();
        List<JobSkillDto> skillDtos = new ArrayList<>();

        for (JobSkill req : requiredSkills) {
            boolean mandatory = Boolean.TRUE.equals(req.getMandatory());
            double weight = mandatory ? 2.0 : 1.0;
            totalWeight += weight;

            int candScore = candidateSkillMap.getOrDefault(req.getSkillCode(), 0);
            int reqLevel = Math.max(1, req.getRequiredLevel());
            double ratio = Math.min(1.0, (double) candScore / (double) reqLevel);
            totalWeightedRatio += (ratio * weight);

            String displayName = resolveSkillName(req.getSkillCode(), skillsCatalogue);
            boolean satisfied = candScore >= req.getRequiredLevel();

            if (satisfied) {
                matchingSkillNames.add(displayName);
            } else {
                missingSkillNames.add(
                        displayName + " (" + candScore + "/" + req.getRequiredLevel() + ")");
            }

            skillDtos.add(
                    new JobSkillDto(
                            req.getSkillCode(),
                            displayName,
                            req.getRequiredLevel(),
                            candScore,
                            mandatory,
                            satisfied));
        }

        int score =
                totalWeight > 0.0
                        ? (int) Math.round((totalWeightedRatio / totalWeight) * 100.0)
                        : 100;
        score = Math.max(0, Math.min(100, score));

        return new JobMatchResult(job, score, matchingSkillNames, missingSkillNames, skillDtos);
    }

    /**
     * Constructs anonymized prompt containing ONLY skill names and indices. Strictly omits
     * candidate name, email, and phone number.
     */
    public String buildAnonymizedPrompt(
            JobMatchResult mr,
            Map<String, Integer> candidateSkillMap,
            Map<String, Skill> skillsCatalogue) {

        StringBuilder sb = new StringBuilder();
        sb.append("Dựa trên dữ liệu năng lực kỹ thuật và yêu cầu vị trí dưới đây, ");
        sb.append(
                "hãy viết lời giải thích ngắn gọn (tối đa 60 từ) bằng tiếng Việt nêu rõ vì sao ứng viên phù hợp ");
        sb.append("và kỹ năng nào còn thiếu cần hoàn thiện thêm.\n\n");

        sb.append("Vị trí công việc: ").append(mr.job().getTitle()).append("\n");
        sb.append("Kỹ năng công việc yêu cầu:\n");
        for (JobSkillDto req : mr.requiredSkillDtos()) {
            String type = Boolean.TRUE.equals(req.mandatory()) ? "Bắt buộc" : "Ưu tiên";
            sb.append("- ")
                    .append(req.skillName())
                    .append(": Mức ")
                    .append(req.requiredLevel())
                    .append("/100 (")
                    .append(type)
                    .append(")\n");
        }

        sb.append("\nKỹ năng ứng viên đã xác thực:\n");
        for (JobSkillDto req : mr.requiredSkillDtos()) {
            int score = candidateSkillMap.getOrDefault(req.skillCode(), 0);
            sb.append("- ")
                    .append(req.skillName())
                    .append(": Điểm ")
                    .append(score)
                    .append("/100\n");
        }

        sb.append(
                "\nYêu cầu định dạng: Lời nhận xét súc tích, chuyên nghiệp, không dài quá 60 từ.");
        return sb.toString();
    }

    /** Generates a clean rule-based explanation used as fallback or for ranks 6-10. */
    public String buildDefaultExplanation(JobMatchResult mr) {
        String matchStr =
                mr.matchingSkillNames().isEmpty()
                        ? "nền tảng chung"
                        : String.join(", ", mr.matchingSkillNames());

        if (mr.missingSkillNames().isEmpty()) {
            return String.format(
                    "Hồ sơ của bạn phù hợp %d%% với vị trí này nhờ đáp ứng xuất sắc các kỹ năng cốt lõi: %s. Bạn hoàn toàn sẵn sàng ứng tuyển.",
                    mr.score(), matchStr);
        }

        String missingStr = String.join(", ", mr.missingSkillNames());
        return String.format(
                "Hồ sơ của bạn phù hợp %d%% với vị trí này. Điểm mạnh nổi bật: %s. Kỹ năng cần bổ sung thêm: %s.",
                mr.score(), matchStr, missingStr);
    }

    private String resolveSkillName(String code, Map<String, Skill> catalogue) {
        Skill skill = catalogue.get(code);
        if (skill != null && skill.getNameVi() != null) {
            return skill.getNameVi();
        }
        return code;
    }

    public record JobMatchResult(
            Job job,
            int score,
            List<String> matchingSkillNames,
            List<String> missingSkillNames,
            List<JobSkillDto> requiredSkillDtos) {}
}
