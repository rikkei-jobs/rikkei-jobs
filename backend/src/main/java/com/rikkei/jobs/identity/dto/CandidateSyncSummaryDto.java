package com.rikkei.jobs.identity.dto;

/**
 * Immutable summary DTO for candidate search in STAFF data-sync screen (Rule 14 & D10). Masks PII
 * in {@link #toString()}.
 */
public record CandidateSyncSummaryDto(
        Long userId, String fullName, String email, String lmsUserId) {

    @Override
    public String toString() {
        return "CandidateSyncSummaryDto[userId=" + userId + ", lmsUserId=" + lmsUserId + "]";
    }
}
