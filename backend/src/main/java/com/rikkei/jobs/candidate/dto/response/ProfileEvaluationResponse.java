package com.rikkei.jobs.candidate.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

public class ProfileEvaluationResponse {
    private Long id;
    private ProfileEvaluationMentorResponse mentor;
    private Long templateId;
    private String context;
    private OffsetDateTime submittedAt;
    private String overallComment;
    private List<ProfileEvaluationScoreResponse> scores;

    public ProfileEvaluationResponse() {}

    public ProfileEvaluationResponse(
            Long id,
            ProfileEvaluationMentorResponse mentor,
            Long templateId,
            String context,
            OffsetDateTime submittedAt,
            String overallComment,
            List<ProfileEvaluationScoreResponse> scores) {
        this.id = id;
        this.mentor = mentor;
        this.templateId = templateId;
        this.context = context;
        this.submittedAt = submittedAt;
        this.overallComment = overallComment;
        this.scores = scores;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ProfileEvaluationMentorResponse getMentor() {
        return mentor;
    }

    public void setMentor(ProfileEvaluationMentorResponse mentor) {
        this.mentor = mentor;
    }

    public Long getTemplateId() {
        return templateId;
    }

    public void setTemplateId(Long templateId) {
        this.templateId = templateId;
    }

    public String getContext() {
        return context;
    }

    public void setContext(String context) {
        this.context = context;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(OffsetDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public String getOverallComment() {
        return overallComment;
    }

    public void setOverallComment(String overallComment) {
        this.overallComment = overallComment;
    }

    public List<ProfileEvaluationScoreResponse> getScores() {
        return scores;
    }

    public void setScores(List<ProfileEvaluationScoreResponse> scores) {
        this.scores = scores;
    }
}
