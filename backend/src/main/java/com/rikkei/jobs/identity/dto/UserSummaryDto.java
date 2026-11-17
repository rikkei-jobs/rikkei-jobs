package com.rikkei.jobs.identity.dto;

/** Immutable DTO transfer object for user summary information (Rule 14 & Rule 05). */
public record UserSummaryDto(Long id, String fullName, String email) {}
