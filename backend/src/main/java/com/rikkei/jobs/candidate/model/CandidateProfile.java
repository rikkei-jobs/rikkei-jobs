package com.rikkei.jobs.candidate.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Visibility of a candidate profile. Table: candidate_profiles (owned by candidate module). */
@Entity
@Table(name = "candidate_profiles")
public class CandidateProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "is_public", nullable = false)
    private boolean publicProfile;

    protected CandidateProfile() {}

    public Long getUserId() {
        return userId;
    }

    public boolean isPublicProfile() {
        return publicProfile;
    }
}
