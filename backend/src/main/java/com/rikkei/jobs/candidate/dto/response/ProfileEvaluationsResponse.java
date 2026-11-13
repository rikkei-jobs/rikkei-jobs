package com.rikkei.jobs.candidate.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProfileEvaluationsResponse {
    private Long userId;

    private List<ProfileEvaluationResponse> evaluations;
}
