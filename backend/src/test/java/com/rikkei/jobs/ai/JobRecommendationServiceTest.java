package com.rikkei.jobs.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rikkei.jobs.ai.config.AiProperties;
import com.rikkei.jobs.ai.dto.JobRecommendationsResponse;
import com.rikkei.jobs.ai.model.JobRecommendation;
import com.rikkei.jobs.ai.repository.JobRecommendationRepository;
import com.rikkei.jobs.ai.service.AiClient;
import com.rikkei.jobs.ai.service.AiProvider;
import com.rikkei.jobs.ai.service.AiService;
import com.rikkei.jobs.ai.service.JobRecommendationService;
import com.rikkei.jobs.ai.service.MockAiClient;
import com.rikkei.jobs.assessment.model.Skill;
import com.rikkei.jobs.assessment.repository.SkillRepository;
import com.rikkei.jobs.candidate.model.CandidateSkill;
import com.rikkei.jobs.candidate.repository.CandidateSkillRepository;
import com.rikkei.jobs.company.model.Job;
import com.rikkei.jobs.company.model.JobSkill;
import com.rikkei.jobs.company.repository.JobRepository;
import com.rikkei.jobs.company.repository.JobSkillRepository;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class JobRecommendationServiceTest {

    @Mock private JobRepository jobRepository;
    @Mock private JobSkillRepository jobSkillRepository;
    @Mock private CandidateSkillRepository candidateSkillRepository;
    @Mock private JobRecommendationRepository jobRecommendationRepository;
    @Mock private SkillRepository skillRepository;

    private AiProperties aiProperties;
    private MockAiClient mockAiClient;
    private AiService aiService;
    private JobRecommendationService recommendationService;

    @BeforeEach
    void setUp() {
        aiProperties = new AiProperties();
        aiProperties.setProvider("mock");
        mockAiClient = new MockAiClient(aiProperties);
        aiService = new AiService(aiProperties, List.of(mockAiClient));
        recommendationService =
                new JobRecommendationService(
                        jobRepository,
                        jobSkillRepository,
                        candidateSkillRepository,
                        jobRecommendationRepository,
                        skillRepository,
                        aiService);
    }

    @Test
    @DisplayName(
            "AI_PROVIDER=mock: executes end-to-end recommendation flow and returns mock explanation")
    void testAiProviderMockFlow() {
        Long userId = 1L;
        when(jobRecommendationRepository.findByUserIdOrderByScoreDesc(userId))
                .thenReturn(List.of());

        // Candidate with Java (80)
        CandidateSkill candJava = new CandidateSkill(userId, "JAVA", 80, true);
        when(candidateSkillRepository.findByUserIdAndVerifiedTrue(userId))
                .thenReturn(List.of(candJava));

        // Two jobs: Job 1 requires Java (80), Job 2 requires React (80)
        OffsetDateTime future = OffsetDateTime.now().plusDays(30);
        Job job1 =
                new Job(
                        1L,
                        "Java Dev",
                        1L,
                        "Company A",
                        "Hanoi",
                        "20M",
                        "APPROVED",
                        future,
                        "Desc 1");
        Job job2 =
                new Job(
                        2L,
                        "React Dev",
                        1L,
                        "Company A",
                        "Hanoi",
                        "20M",
                        "APPROVED",
                        future,
                        "Desc 2");
        when(jobRepository.findByStatusAndDeadlineAfter(eq("APPROVED"), any()))
                .thenReturn(List.of(job1, job2));

        JobSkill reqJava = new JobSkill(1L, "JAVA", 80, true);
        JobSkill reqReact = new JobSkill(2L, "REACTJS", 80, true);
        when(jobSkillRepository.findByJobIdIn(any())).thenReturn(List.of(reqJava, reqReact));

        Skill skillJava = new Skill("JAVA", "Lập trình Java", "Java Programming", "0-100", "Desc");
        Skill skillReact = new Skill("REACTJS", "Thư viện ReactJS", "ReactJS", "0-100", "Desc");
        when(skillRepository.findAll()).thenReturn(List.of(skillJava, skillReact));

        JobRecommendationsResponse response =
                recommendationService.getRecommendations(userId, 10, false);

        assertNotNull(response);
        assertEquals(2, response.items().size());
        assertEquals("MOCK", response.activeProvider());
        assertFalse(response.isCached());

        // Top 1 should be Java Dev with 100% score
        assertEquals(1L, response.items().get(0).jobId());
        assertEquals(100, response.items().get(0).score());
        assertTrue(response.items().get(0).isAiGenerated());
        assertEquals(
                aiProperties.getMock().getExplanation(), response.items().get(0).explanation());

        // Top 2 should be React Dev with 0% score
        assertEquals(2L, response.items().get(1).jobId());
        assertEquals(0, response.items().get(1).score());
    }

    @Test
    @DisplayName("Recommendations must be strictly ordered by matching score descending")
    void testMatchingScoreOrdering() {
        Long userId = 1L;
        when(jobRecommendationRepository.findByUserIdOrderByScoreDesc(userId))
                .thenReturn(List.of());

        CandidateSkill candJava = new CandidateSkill(userId, "JAVA", 80, true);
        CandidateSkill candSql = new CandidateSkill(userId, "SQL", 60, true);
        when(candidateSkillRepository.findByUserIdAndVerifiedTrue(userId))
                .thenReturn(List.of(candJava, candSql));

        OffsetDateTime future = OffsetDateTime.now().plusDays(30);
        Job jobLow = new Job(10L, "Low Match", 1L, "Co", "HN", "10M", "APPROVED", future, "Desc");
        Job jobHigh = new Job(20L, "High Match", 1L, "Co", "HN", "20M", "APPROVED", future, "Desc");
        Job jobMid = new Job(30L, "Mid Match", 1L, "Co", "HN", "15M", "APPROVED", future, "Desc");
        when(jobRepository.findByStatusAndDeadlineAfter(eq("APPROVED"), any()))
                .thenReturn(List.of(jobLow, jobHigh, jobMid));

        JobSkill sLow = new JobSkill(10L, "PYTHON", 80, true); // candidate has 0 -> 0%
        JobSkill sHigh = new JobSkill(20L, "JAVA", 80, true); // candidate has 80 -> 100%
        JobSkill sMid = new JobSkill(30L, "SQL", 100, true); // candidate has 60 -> 60%
        when(jobSkillRepository.findByJobIdIn(any())).thenReturn(List.of(sLow, sHigh, sMid));

        when(skillRepository.findAll()).thenReturn(List.of());

        JobRecommendationsResponse response =
                recommendationService.getRecommendations(userId, 10, false);

        assertEquals(3, response.items().size());
        assertEquals(20L, response.items().get(0).jobId(), "Highest match must be rank 1");
        assertEquals(100, response.items().get(0).score());
        assertEquals(30L, response.items().get(1).jobId(), "Middle match must be rank 2");
        assertEquals(60, response.items().get(1).score());
        assertEquals(10L, response.items().get(2).jobId(), "Lowest match must be rank 3");
        assertEquals(0, response.items().get(2).score());
    }

    @Test
    @DisplayName("Prompt and logging must strictly not contain PII (name, email, phone)")
    void testPromptDoesNotContainPii() {
        Job job =
                new Job(
                        1L,
                        "Java Backend",
                        1L,
                        "Rikkei",
                        "HN",
                        "20M",
                        "APPROVED",
                        OffsetDateTime.now(),
                        "D");
        JobSkill js = new JobSkill(1L, "JAVA", 70, true);
        Skill skill = new Skill("JAVA", "Lập trình Java", "Java", "0-100", "D");

        var matchResult =
                recommendationService.calculateMatch(
                        job,
                        List.of(js),
                        java.util.Map.of("JAVA", 80),
                        java.util.Map.of("JAVA", skill));

        String prompt =
                recommendationService.buildAnonymizedPrompt(
                        matchResult, java.util.Map.of("JAVA", 80), java.util.Map.of("JAVA", skill));

        // Assert strictly no PII
        assertFalse(prompt.contains("candidate1@rikkeijobs.test"), "Prompt must not contain email");
        assertFalse(prompt.contains("@"), "Prompt must not contain @ character");
        assertFalse(prompt.contains("Nguyễn Văn An"), "Prompt must not contain candidate name");
        assertFalse(prompt.contains("098"), "Prompt must not contain phone numbers");

        // Verification passes through AiService validator
        aiService.validateNoPii(prompt);

        // Assert that privacy violation is caught if email or phone is injected
        assertThrows(
                IllegalArgumentException.class,
                () -> aiService.validateNoPii("Test prompt containing student@gmail.com"));
        assertThrows(
                IllegalArgumentException.class,
                () -> aiService.validateNoPii("Test prompt containing phone 0912345678"));
    }

    @Test
    @DisplayName("AI failure or timeout falls back seamlessly to rule-based explanation")
    void testAiFailureFallback() {
        // Create an AiClient that throws an exception (simulating wrong key or network issue)
        AiClient brokenClient =
                new AiClient() {
                    @Override
                    public AiProvider getProvider() {
                        return AiProvider.OPENAI;
                    }

                    @Override
                    public String generateExplanation(String prompt) {
                        throw new RuntimeException("401 Unauthorized: Invalid OpenAI API key");
                    }
                };

        AiProperties brokenProps = new AiProperties();
        brokenProps.setProvider("openai");
        AiService resilientService = new AiService(brokenProps, List.of(brokenClient));

        String fallback = "Hồ sơ của bạn phù hợp 90% với vị trí này. Điểm mạnh: Java.";
        String result =
                resilientService.generateJobExplanation("Safe prompt without PII", fallback);

        assertEquals(
                fallback, result, "Should gracefully fall back to default explanation on error");
    }

    @Test
    @DisplayName("24-Hour cache: calling endpoint again within 24h does NOT invoke AI again")
    void testCache24HoursAvoidsAiCall() {
        Long userId = 1L;
        OffsetDateTime oneHourAgo = OffsetDateTime.now().minusHours(1);

        JobRecommendation cachedRec =
                new JobRecommendation(1L, userId, 100L, 85, "Cached AI Explanation", oneHourAgo);
        when(jobRecommendationRepository.findByUserIdOrderByScoreDesc(userId))
                .thenReturn(List.of(cachedRec));

        // Candidate skills updated 2 hours ago (before cache)
        CandidateSkill candSkill = new CandidateSkill(userId, "JAVA", 80, true);
        candSkill.setUpdatedAt(OffsetDateTime.now().minusHours(2));
        when(candidateSkillRepository.findByUserId(userId)).thenReturn(List.of(candSkill));
        when(candidateSkillRepository.findByUserIdAndVerifiedTrue(userId))
                .thenReturn(List.of(candSkill));

        // Jobs updated 2 hours ago (before cache)
        Job job =
                new Job(
                        100L,
                        "Spring Dev",
                        1L,
                        "Co",
                        "HN",
                        "20M",
                        "APPROVED",
                        OffsetDateTime.now().plusDays(10),
                        "Desc");
        job.setUpdatedAt(OffsetDateTime.now().minusHours(2));
        when(jobRepository.findByStatusAndDeadlineAfter(eq("APPROVED"), any()))
                .thenReturn(List.of(job));
        when(jobRepository.findAllById(any())).thenReturn(List.of(job));
        when(jobSkillRepository.findByJobIdIn(any())).thenReturn(List.of());
        when(skillRepository.findAll()).thenReturn(List.of());

        JobRecommendationsResponse response =
                recommendationService.getRecommendations(userId, 10, false);

        assertTrue(response.isCached(), "Response should be marked as cached");
        assertEquals("Cached AI Explanation", response.items().get(0).explanation());
        verify(jobRecommendationRepository, never()).deleteByUserId(any());
    }
}
