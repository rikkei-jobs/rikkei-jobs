package com.rikkei.jobs.assessment.dto.response;

import com.rikkei.jobs.assessment.model.EvaluationContext;
import com.rikkei.jobs.assessment.model.EvaluationStatus;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    private Long batchId;

    private Long interviewRoundId;

    private EvaluationStatus status;

    private String overallComment;

    private LocalDateTime submittedAt;

    private List<EvaluationScoreResponse> scores;
}
