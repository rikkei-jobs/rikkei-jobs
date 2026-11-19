package com.rikkei.jobs.identity.dto;

import java.time.OffsetDateTime;

/**
 * Result record returned after committing a new HR user account. Never log rawTemporaryPassword.
 */
public record CreatedHrUserResult(
        Long userId,
        Long companyId,
        String email,
        String fullName,
        String rawTemporaryPassword,
        OffsetDateTime createdAt) {

    @Override
    public String toString() {
        return "CreatedHrUserResult[userId="
                + userId
                + ", companyId="
                + companyId
                + ", email=***, fullName=***, rawTemporaryPassword=***, createdAt="
                + createdAt
                + "]";
    }
}
