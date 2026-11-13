package com.rikkei.jobs.ai.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Entity representing a cached AI Job Recommendation. Table: job_recommendations(user_id, job_id,
 * score, explanation, created_at)
 */
@Entity
@Table(name = "job_recommendations")
public class JobRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(nullable = false)
    private Integer score;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String explanation;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public JobRecommendation() {}

    public JobRecommendation(Long userId, Long jobId, Integer score, String explanation) {
        this.userId = userId;
        this.jobId = jobId;
        this.score = score;
        this.explanation = explanation;
        this.createdAt = OffsetDateTime.now();
    }

    public JobRecommendation(
            Long id,
            Long userId,
            Long jobId,
            Integer score,
            String explanation,
            OffsetDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.jobId = jobId;
        this.score = score;
        this.explanation = explanation;
        this.createdAt = createdAt != null ? createdAt : OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getJobId() {
        return jobId;
    }

    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
