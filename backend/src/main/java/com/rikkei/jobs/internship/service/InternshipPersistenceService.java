package com.rikkei.jobs.internship.service;

import com.rikkei.jobs.internship.dto.InternshipResponse;
import com.rikkei.jobs.internship.dto.PMInternshipResponse;
import java.util.List;

/**
 * Transactional persistence boundary for internship entities and cross-module skill evidence
 * recording. Previously synced batches and tasks omitted from a subsequent PM payload are retained
 * locally rather than deleted.
 */
public interface InternshipPersistenceService {

    int saveSyncedInternships(Long userId, List<PMInternshipResponse> pmInternships);

    List<InternshipResponse> getStoredInternships(Long userId);
}
