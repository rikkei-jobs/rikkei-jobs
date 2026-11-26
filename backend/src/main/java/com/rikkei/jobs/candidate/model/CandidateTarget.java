package com.rikkei.jobs.candidate.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * The single target a candidate currently benchmarks against: either a target position or one job
 * description.
 */
@Entity
@Table(name = "candidate_targets")
public class CandidateTarget {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "position_id")
    private Long positionId;

    @Column(name = "job_id")
    private Long jobId;

    @Column(name = "chosen_at", nullable = false)
    private OffsetDateTime chosenAt;

    public CandidateTarget() {}

    public CandidateTarget(Long userId) {
        this.userId = userId;
    }

    public void choosePosition(Long positionId, OffsetDateTime now) {
        this.positionId = positionId;
        this.jobId = null;
        this.chosenAt = now;
    }

    public void chooseJob(Long jobId, OffsetDateTime now) {
        this.positionId = null;
        this.jobId = jobId;
        this.chosenAt = now;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getPositionId() {
        return positionId;
    }

    public Long getJobId() {
        return jobId;
    }

    public OffsetDateTime getChosenAt() {
        return chosenAt;
    }
}
