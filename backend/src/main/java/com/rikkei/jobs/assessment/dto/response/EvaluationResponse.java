package com.rikkei.jobs.assessment.dto.response;

import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import java.time.OffsetDateTime;
import java.util.List;

<<<<<<< HEAD
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EvaluationResponse {
    private Long id;

    private Long templateId;

    private Long userId;

    private Long mentorId;

    private EvaluationContext context;

    private String batchId;

    private Long interviewRoundId;

    private EvaluationStatus status;

    private String overallComment;

    private LocalDateTime submittedAt;

    private List<EvaluationScoreResponse> scores;
}
=======
public record EvaluationResponse(
        Long id,
        Long templateId,
        Long userId,
        Long mentorId,
        EvaluationContext context,
        Long batchId,
        Long interviewRoundId,
        EvaluationStatus status,
        String overallComment,
        OffsetDateTime submittedAt,
        List<EvaluationScoreResponse> scores) {}
>>>>>>> origin/develop
