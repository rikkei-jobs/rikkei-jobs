package com.rikkei.jobs.assessment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class EvaluationScoreResponse {
    private Long criterionId;
    private Integer score;
    private String comment;
}
