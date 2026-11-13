package com.rikkei.jobs.candidate.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProfileEvaluationScoreResponse {
    private Long criterionId;

    private String criterionDescription;

    private BigDecimal score;

    private String comment;
}
