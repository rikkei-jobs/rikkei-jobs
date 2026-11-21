package com.rikkei.jobs.internship.service;

/**
 * Coordinates fast-fail PM internship fetching outside database transactions and delegates
 * persistence to {@link InternshipPersistenceService}. Local rows are retained when previously
 * synced batches or tasks are omitted from a later PM response.
 */
public interface InternshipSyncService {

    int syncInternships(Long userId, String lmsUserId);
}
