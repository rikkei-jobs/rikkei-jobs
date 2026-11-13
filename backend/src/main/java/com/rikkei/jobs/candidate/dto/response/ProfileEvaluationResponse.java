package com.rikkei.jobs.candidate.dto.response;

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
public class ProfileEvaluationResponse {
    private Long id;

    private ProfileEvaluationMentorResponse mentor;

    private Long templateId;

    private String context;

    private LocalDateTime submittedAt;

    private String overallComment;

    private List<ProfileEvaluationScoreResponse> scores;
}
