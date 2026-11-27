package com.rikkei.jobs.recruitment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Objects;

/**
 * Immutable PDF CV snapshot captured at application submission time. Updates are disabled at the
 * JPA column level and no setters are exposed.
 */
@Entity
@Table(name = "application_cv_snapshots")
public class ApplicationCvSnapshot {

    @Id
    @Column(name = "application_id", nullable = false, updatable = false)
    private Long applicationId;

    @Column(name = "original_filename", nullable = false, updatable = false, length = 255)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, updatable = false, length = 100)
    private String contentType;

    @Column(name = "file_data", nullable = false, updatable = false, columnDefinition = "bytea")
    private byte[] fileData;

    @Column(name = "file_size", nullable = false, updatable = false)
    private long fileSize;

    @Column(name = "sha256", nullable = false, updatable = false, length = 64)
    private String sha256;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected ApplicationCvSnapshot() {}

    public ApplicationCvSnapshot(
            Long applicationId,
            String originalFilename,
            String contentType,
            byte[] fileData,
            String sha256) {
        this(applicationId, originalFilename, contentType, fileData, sha256, null);
    }

    public ApplicationCvSnapshot(
            Long applicationId,
            String originalFilename,
            String contentType,
            byte[] fileData,
            String sha256,
            OffsetDateTime createdAt) {
        this.applicationId =
                Objects.requireNonNull(applicationId, "applicationId must not be null");
        this.originalFilename =
                Objects.requireNonNull(originalFilename, "originalFilename must not be null");
        this.contentType = Objects.requireNonNull(contentType, "contentType must not be null");
        byte[] nonNullData = Objects.requireNonNull(fileData, "fileData must not be null");
        this.fileData = nonNullData.clone();
        this.fileSize = this.fileData.length;
        this.sha256 = Objects.requireNonNull(sha256, "sha256 must not be null");
        this.createdAt = createdAt;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public byte[] getFileData() {
        return fileData.clone();
    }

    public long getFileSize() {
        return fileSize;
    }

    public String getSha256() {
        return sha256;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * Prevents finalizer attacks on partially constructed instances when constructor throws
     * exceptions (CERT ERR08-J / SpotBugs CT_CONSTRUCTOR_THROW).
     */
    @Override
    @SuppressWarnings({"deprecation", "removal"})
    protected final void finalize() {
        // Empty final implementation ensures subclasses cannot resurrect uninitialized instances
    }
}
