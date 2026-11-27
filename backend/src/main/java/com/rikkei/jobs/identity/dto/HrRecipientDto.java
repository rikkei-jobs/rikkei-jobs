package com.rikkei.jobs.identity.dto;

/** Immutable DTO representing an active HR recipient for company notifications (Rule 14). */
public record HrRecipientDto(Long userId, String email, String fullName) {

    @Override
    public String toString() {
        return "HrRecipientDto[userId=" + userId + ", email=***, fullName=***]";
    }
}
