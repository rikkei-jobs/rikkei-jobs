package com.rikkei.jobs.identity.dto;

/**
 * Immutable DTO identifying a candidate eligible for external data sync (Rule 14). Masks PII in
 * {@link #toString()}.
 */
public record CandidateSyncTargetDto(
        Long userId, String fullName, String email, String lmsUserId, boolean active) {

    @Override
    public String toString() {
        return "CandidateSyncTargetDto[userId="
                + userId
                + ", lmsUserId="
                + lmsUserId
                + ", active="
                + active
                + "]";
    }
}
