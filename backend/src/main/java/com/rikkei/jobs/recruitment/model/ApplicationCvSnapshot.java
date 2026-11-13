package com.rikkei.jobs.recruitment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "application_cv_snapshots")
public class ApplicationCvSnapshot {

    @Id
    @Column(name = "application_id")
    private Long applicationId;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_data", nullable = false, columnDefinition = "bytea")
    private byte[] fileData;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected ApplicationCvSnapshot() {}

    public ApplicationCvSnapshot(
            Long applicationId, String originalFilename, String contentType, byte[] fileData) {
        this.applicationId = applicationId;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.fileData = fileData.clone();
        this.fileSize = fileData.length;
    }

    @PrePersist
    void prePersist() {
        createdAt = OffsetDateTime.now();
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
}
