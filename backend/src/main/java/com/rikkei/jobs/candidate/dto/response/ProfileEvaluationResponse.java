package com.rikkei.jobs.candidate.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

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
