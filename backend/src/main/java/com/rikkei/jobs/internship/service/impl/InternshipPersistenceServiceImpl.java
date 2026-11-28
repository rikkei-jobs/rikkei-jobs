package com.rikkei.jobs.internship.service.impl;

import com.rikkei.jobs.candidate.dto.PmInternshipResultCommand;
import com.rikkei.jobs.candidate.service.CandidatePublicService;
import com.rikkei.jobs.common.exception.ValidationException;
import com.rikkei.jobs.internship.dto.InternshipResponse;
import com.rikkei.jobs.internship.dto.InternshipTaskResponse;
import com.rikkei.jobs.internship.dto.PMInternshipResponse;
import com.rikkei.jobs.internship.dto.PMInternshipTaskResponse;
import com.rikkei.jobs.internship.model.Internship;
import com.rikkei.jobs.internship.model.InternshipTask;
import com.rikkei.jobs.internship.repository.InternshipRepository;
import com.rikkei.jobs.internship.repository.InternshipTaskRepository;
import com.rikkei.jobs.internship.service.InternshipPersistenceService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Proxied transactional persistence service for internship batches, tasks, and PM skill evidence.
 *
 * <p>Local retention policy: batches and tasks previously persisted are kept intact when omitted
 * from a subsequent PM response so historical internship records and verified skill evidence are
 * never silently deleted.
 */
@Service
public class InternshipPersistenceServiceImpl implements InternshipPersistenceService {

    private final InternshipRepository internshipRepository;
    private final InternshipTaskRepository internshipTaskRepository;
    private final CandidatePublicService candidatePublicService;
    private final Clock clock;

    public InternshipPersistenceServiceImpl(
            InternshipRepository internshipRepository,
            InternshipTaskRepository internshipTaskRepository,
            CandidatePublicService candidatePublicService,
            Clock clock) {
        this.internshipRepository = internshipRepository;
        this.internshipTaskRepository = internshipTaskRepository;
        this.candidatePublicService = candidatePublicService;
        this.clock = clock;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int saveSyncedInternships(
            Long userId,
            List<PMInternshipResponse> pmInternships,
            Map<String, String> sourcePayloadsByBatchId) {
        if (userId == null || userId <= 0) {
            throw new ValidationException("User ID không hợp lệ");
        }
        if (pmInternships == null || pmInternships.isEmpty()) {
            return 0;
        }

        Map<String, PMInternshipResponse> deduplicatedBatches = new LinkedHashMap<>();
        for (PMInternshipResponse pmData : pmInternships) {
            if (pmData == null || pmData.batchId() == null || pmData.batchId().isBlank()) {
                throw new ValidationException("Mã đợt thực tập không được để trống");
            }
            deduplicatedBatches.put(pmData.batchId().trim(), pmData);
        }

        // Acquire the per-user advisory lock before reading internships to serialize concurrent
        // first-time syncs.
        candidatePublicService.acquireCandidateSkillLock(userId);

        OffsetDateTime now = OffsetDateTime.now(clock);
        List<PmInternshipResultCommand> commands = new ArrayList<>();
        int syncedCount = 0;

        for (Map.Entry<String, PMInternshipResponse> batchEntry : deduplicatedBatches.entrySet()) {
            String batchId = batchEntry.getKey();
            PMInternshipResponse pmData = batchEntry.getValue();

            Internship internship =
                    internshipRepository
                            .findByUserIdAndBatchId(userId, batchId)
                            .orElseGet(Internship::new);
            boolean isNewInternship = internship.getId() == null;

            internship.setUserId(userId);
            internship.setBatchId(batchId);
            internship.setBatchName(pmData.batchName());
            internship.setGroupName(pmData.groupName());
            internship.setTopicName(pmData.topicName());
            internship.setMentorEmail(pmData.mentorEmail());
            internship.setStartDate(pmData.startDate());
            internship.setEndDate(pmData.endDate());
            internship.setFinalScore(pmData.finalScore());
            internship.setSyncedAt(now);

            internship = internshipRepository.save(internship);

            Map<String, PMInternshipTaskResponse> deduplicatedTasks = new LinkedHashMap<>();
            for (PMInternshipTaskResponse taskData : pmData.tasks()) {
                if (taskData.title() == null || taskData.title().isBlank()) {
                    continue;
                }
                deduplicatedTasks.put(taskData.title().trim(), taskData);
            }

            if (!deduplicatedTasks.isEmpty()) {
                // Batch-load existing tasks once per existing batch to avoid N per-task SELECTs.
                Map<String, InternshipTask> existingTasksByTitle =
                        isNewInternship
                                ? Map.of()
                                : internshipTaskRepository
                                        .findByInternshipId(internship.getId())
                                        .stream()
                                        .collect(
                                                Collectors.toMap(
                                                        InternshipTask::getTitle,
                                                        task -> task,
                                                        (first, second) -> first));

                for (Map.Entry<String, PMInternshipTaskResponse> taskEntry :
                        deduplicatedTasks.entrySet()) {
                    String taskTitle = taskEntry.getKey();
                    PMInternshipTaskResponse taskData = taskEntry.getValue();

                    InternshipTask existingTask = existingTasksByTitle.get(taskTitle);
                    if (existingTask != null
                            && sameScore(existingTask.getAcceptedScore(), taskData.acceptedScore())
                            && sameInstant(existingTask.getAcceptedAt(), taskData.acceptedAt())) {
                        continue;
                    }

                    InternshipTask task =
                            existingTask != null ? existingTask : new InternshipTask();
                    task.setInternship(internship);
                    task.setTitle(taskTitle);
                    task.setAcceptedScore(taskData.acceptedScore());
                    task.setAcceptedAt(taskData.acceptedAt());

                    internshipTaskRepository.save(task);
                }
            }

            String sourcePayload =
                    sourcePayloadsByBatchId != null ? sourcePayloadsByBatchId.get(batchId) : null;
            commands.add(
                    new PmInternshipResultCommand(
                            batchId,
                            pmData.topicName(),
                            pmData.finalScore(),
                            pmData.endDate(),
                            sourcePayload));
            syncedCount++;
        }

        candidatePublicService.recordPmInternshipResults(userId, commands);
        return syncedCount;
    }

    private static boolean sameScore(BigDecimal existing, BigDecimal incoming) {
        if (existing == null && incoming == null) {
            return true;
        }
        return existing != null && incoming != null && existing.compareTo(incoming) == 0;
    }

    private static boolean sameInstant(OffsetDateTime existing, OffsetDateTime incoming) {
        if (existing == null && incoming == null) {
            return true;
        }
        return existing != null
                && incoming != null
                && existing.toInstant().equals(incoming.toInstant());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InternshipResponse> getStoredInternships(Long userId) {
        if (userId == null || userId <= 0) {
            throw new ValidationException("User ID không hợp lệ");
        }
        return internshipRepository.findAllByUserIdOrderBySyncedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    private InternshipResponse toResponse(Internship internship) {
        List<InternshipTaskResponse> tasks =
                internship.getTasks() == null
                        ? List.of()
                        : internship.getTasks().stream().map(this::toTaskResponse).toList();

        return new InternshipResponse(
                internship.getId(),
                internship.getBatchId(),
                internship.getBatchName(),
                internship.getGroupName(),
                internship.getTopicName(),
                internship.getMentorEmail(),
                internship.getStartDate(),
                internship.getEndDate(),
                internship.getFinalScore(),
                internship.getSyncedAt(),
                tasks);
    }

    private InternshipTaskResponse toTaskResponse(InternshipTask task) {
        return new InternshipTaskResponse(
                task.getId(), task.getTitle(), task.getAcceptedScore(), task.getAcceptedAt());
    }
}
