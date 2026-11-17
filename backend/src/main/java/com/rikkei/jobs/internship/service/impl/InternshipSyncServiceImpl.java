package com.rikkei.jobs.internship.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.jobs.candidate.model.ExternalRecord;
import com.rikkei.jobs.candidate.model.ExternalSource;
import com.rikkei.jobs.candidate.repository.ExternalRecordRepository;
import com.rikkei.jobs.candidate.service.SkillRecomputeService;
import com.rikkei.jobs.common.client.ExternalApiClient;
import com.rikkei.jobs.identity.model.User;
import com.rikkei.jobs.identity.repository.UserRepository;
import com.rikkei.jobs.internship.dto.PMInternshipResponse;
import com.rikkei.jobs.internship.dto.PMInternshipTaskResponse;
import com.rikkei.jobs.internship.model.Internship;
import com.rikkei.jobs.internship.model.InternshipTask;
import com.rikkei.jobs.internship.repository.InternshipRepository;
import com.rikkei.jobs.internship.repository.InternshipTaskRepository;
import com.rikkei.jobs.internship.service.InternshipSyncService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InternshipSyncServiceImpl implements InternshipSyncService {
    private final ExternalApiClient externalApiClient;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final InternshipRepository internshipRepository;
    private final InternshipTaskRepository internshipTaskRepository;
    private final ExternalRecordRepository externalRecordRepository;
    private final SkillRecomputeService skillRecomputeService;

    @Transactional
    @Override
    public int syncInternships(String lmsUserId) {
        if (lmsUserId == null || lmsUserId.isBlank()) {
            throw new IllegalArgumentException("LMS User ID không được để trống");
        }

        User user =
                userRepository
                        .findByLmsUserId(lmsUserId.trim())
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "Không tìm thấy user với LMS ID: " + lmsUserId));

        String response = externalApiClient.getStudentInternships(lmsUserId);

        List<PMInternshipResponse> pmInternships;

        try {
            pmInternships =
                    objectMapper.readValue(
                            response, new TypeReference<List<PMInternshipResponse>>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Không thể đọc dữ liệu internship từ PM", e);
        }

        if (pmInternships == null || pmInternships.isEmpty()) {
            return 0;
        }

        int syncedCount = 0;

        for (PMInternshipResponse pmData : pmInternships) {
            if (pmData.getBatchId() == null || pmData.getBatchId().isBlank()) {
                throw new IllegalStateException("PM trả về internship không có batchId");
            }

            Internship internship =
                    internshipRepository
                            .findByUser_IdAndBatchId(user.getId(), pmData.getBatchId())
                            .orElseGet(Internship::new);

            internship.setUser(user);
            internship.setBatchId(pmData.getBatchId());
            internship.setBatchName(pmData.getBatchName());
            internship.setGroupName(pmData.getGroupName());
            internship.setTopicName(pmData.getTopicName());
            internship.setMentorEmail(pmData.getMentorEmail());
            internship.setStartDate(pmData.getStartDate());
            internship.setEndDate(pmData.getEndDate());
            internship.setFinalScore(pmData.getFinalScore());
            internship.setSyncedAt(LocalDateTime.now());

            internship = internshipRepository.save(internship);

            if (pmData.getTasks() != null) {
                for (PMInternshipTaskResponse taskData : pmData.getTasks()) {
                    if (taskData.getTitle() == null || taskData.getTitle().isBlank()) {
                        continue;
                    }

                    InternshipTask task =
                            internshipTaskRepository
                                    .findByInternship_IdAndTitle(
                                            internship.getId(), taskData.getTitle())
                                    .orElseGet(InternshipTask::new);

                    task.setInternship(internship);
                    task.setTitle(taskData.getTitle());
                    task.setAcceptedScore(taskData.getAcceptedScore());
                    task.setAcceptedAt(taskData.getAcceptedAt());

                    internshipTaskRepository.save(task);
                }
            }

            // Đồng bộ kết quả thực tập vào external_records
            if (internship.getTopicName() != null
                    && !internship.getTopicName().isBlank()
                    && internship.getFinalScore() != null) {

                String sourceCode = internship.getBatchId();
                String title = internship.getTopicName();

                BigDecimal score =
                        internship
                                .getFinalScore()
                                .multiply(BigDecimal.TEN)
                                .setScale(2, RoundingMode.HALF_UP);

                OffsetDateTime recordedAt = OffsetDateTime.now();

                ExternalRecord externalRecord =
                        externalRecordRepository
                                .findByUserIdAndSourceAndSourceCodeAndTitle(
                                        user.getId(), ExternalSource.PM, sourceCode, title)
                                .orElseGet(
                                        () ->
                                                new ExternalRecord(
                                                        user.getId(),
                                                        ExternalSource.PM,
                                                        sourceCode,
                                                        title,
                                                        score,
                                                        recordedAt));

                externalRecord.updateResult(title, score, recordedAt);

                externalRecordRepository.save(externalRecord);
            }

            syncedCount++;
        }

        // Tính toán lại kỹ năng sau khi đồng bộ toàn bộ internship
        skillRecomputeService.recomputeSkills(user.getId());

        return syncedCount;
    }
}
