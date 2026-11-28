package com.rikkei.jobs.candidate.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** Append-only audit entry for a staff manual override on an external record. */
@Entity
@Table(name = "manual_overrides")
public class ManualOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_id", nullable = false)
    private Long recordId;

    @Column(name = "field", nullable = false, length = 50)
    private String field;

    @Column(name = "value", nullable = false, columnDefinition = "TEXT")
    private String value;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected ManualOverride() {}

    public ManualOverride(
            Long recordId,
            String field,
            String value,
            String reason,
            Long staffId,
            OffsetDateTime createdAt) {
        this.recordId = recordId;
        this.field = field;
        this.value = value;
        this.reason = reason;
        this.staffId = staffId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getRecordId() {
        return recordId;
    }

    public String getField() {
        return field;
    }

    public String getValue() {
        return value;
    }

    public String getReason() {
        return reason;
    }

    public Long getStaffId() {
        return staffId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
