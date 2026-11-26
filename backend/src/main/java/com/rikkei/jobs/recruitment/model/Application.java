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
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;

/**
 * Job application entity owned exclusively by the recruitment module. Cross-module FKs are
 * prohibited; references to job, user, and cv are stored as plain IDs.
 */
@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "applications_seq")
    @SequenceGenerator(
            name = "applications_seq",
            sequenceName = "applications_id_seq",
            allocationSize = 1)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "cv_id", nullable = false)
    private Long cvId;

    @Column(name = "cv_snapshot_url", nullable = false, length = 500)
    private String cvSnapshotUrl;

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ApplicationStatus status;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public Application() {}

    public Application(
            Long jobId,
            Long userId,
            Long cvId,
            String cvSnapshotUrl,
            String coverLetter,
            ApplicationStatus status) {
        this(jobId, userId, cvId, cvSnapshotUrl, coverLetter, status, null, null);
    }

    public Application(
            Long jobId,
            Long userId,
            Long cvId,
            String cvSnapshotUrl,
            String coverLetter,
            ApplicationStatus status,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
        this.jobId = jobId;
        this.userId = userId;
        this.cvId = cvId;
        this.cvSnapshotUrl = cvSnapshotUrl;
        this.coverLetter = coverLetter;
        this.status = status != null ? status : ApplicationStatus.SUBMITTED;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @PrePersist
    public void prePersist() {
        if (id != null && (cvSnapshotUrl == null || cvSnapshotUrl.isBlank())) {
            cvSnapshotUrl = "/api/v1/me/applications/" + id + "/cv-snapshot";
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
        if (status == null) {
            status = ApplicationStatus.SUBMITTED;
        }
    }

    @PreUpdate
    public void preUpdate() {
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
    }

    /** Transitions this application to WITHDRAWN using an injected-Clock timestamp. */
    public void markWithdrawn(OffsetDateTime withdrawnAt) {
        this.status = ApplicationStatus.WITHDRAWN;
        this.updatedAt = withdrawnAt != null ? withdrawnAt : OffsetDateTime.now();
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getJobId() {
        return jobId;
    }

    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getCvId() {
        return cvId;
    }

    public void setCvId(Long cvId) {
        this.cvId = cvId;
    }

    public String getCvSnapshotUrl() {
        return cvSnapshotUrl;
    }

    public void setCvSnapshotUrl(String cvSnapshotUrl) {
        this.cvSnapshotUrl = cvSnapshotUrl;
    }

    public String getCoverLetter() {
        return coverLetter;
    }

    public void setCoverLetter(String coverLetter) {
        this.coverLetter = coverLetter;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(ApplicationStatus status) {
        this.status = status;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
