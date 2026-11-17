package com.rikkei.jobs.candidate.dto.response;

import java.math.BigDecimal;

public class ProfileEvaluationScoreResponse {
    private Long criterionId;
    private String criterionDescription;
    private BigDecimal score;
    private String comment;

    public ProfileEvaluationScoreResponse() {}

    public ProfileEvaluationScoreResponse(
            Long criterionId, String criterionDescription, BigDecimal score, String comment) {
        this.criterionId = criterionId;
        this.criterionDescription = criterionDescription;
        this.score = score;
        this.comment = comment;
    }

    public Long getCriterionId() {
        return criterionId;
    }

    public void setCriterionId(Long criterionId) {
        this.criterionId = criterionId;
    }

    public String getCriterionDescription() {
        return criterionDescription;
    }

    public void setCriterionDescription(String criterionDescription) {
        this.criterionDescription = criterionDescription;
    }

    public BigDecimal getScore() {
        return score;
    }

    public void setScore(BigDecimal score) {
        this.score = score;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
