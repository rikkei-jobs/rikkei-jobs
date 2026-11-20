package com.rikkei.jobs.recruitment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Entity representing an interview round for a recruitment application (UT-02). Managed within the
 * recruitment module boundary.
 */
@Entity
@Table(name = "interview_rounds")
public class InterviewRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "round_no", nullable = false)
    private Integer roundNo;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "interviewer_email", length = 150)
    private String interviewerEmail;

    @Column(name = "scheduled_at")
    private OffsetDateTime scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 20)
    private InterviewResult result = InterviewResult.PENDING;

    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public InterviewRound() {}

    public InterviewRound(
            Long applicationId,
            Integer roundNo,
            String name,
            String interviewerEmail,
            OffsetDateTime scheduledAt) {
        this.applicationId = applicationId;
        this.roundNo = roundNo;
        this.name = name;
        this.interviewerEmail = interviewerEmail;
        this.scheduledAt = scheduledAt;
        this.result = InterviewResult.PENDING;
    }

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (result == null) {
            result = InterviewResult.PENDING;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(Long applicationId) {
        this.applicationId = applicationId;
    }

    public Integer getRoundNo() {
        return roundNo;
    }

    public void setRoundNo(Integer roundNo) {
        this.roundNo = roundNo;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getInterviewerEmail() {
        return interviewerEmail;
    }

    public void setInterviewerEmail(String interviewerEmail) {
        this.interviewerEmail = interviewerEmail;
    }

    public OffsetDateTime getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(OffsetDateTime scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public InterviewResult getResult() {
        return result;
    }

    public void setResult(InterviewResult result) {
        this.result = result;
    }

    public BigDecimal getScore() {
        return score;
    }

    public void setScore(BigDecimal score) {
        this.score = score;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
