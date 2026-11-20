package com.rikkei.jobs.recruitment.integration;

import org.springframework.stereotype.Component;

/**
 * Calculates a deterministic matching score for candidate applications. Can be substituted with
 * AI/Assessment module calculations when integrated.
 */
@Component
public class MatchScoreCalculator {

    /**
     * Computes a deterministic score in percentage (70 - 95%) based on jobId and candidateUserId.
     */
    public int calculateMatchScore(Long jobId, Long candidateUserId) {
        if (jobId == null || candidateUserId == null) {
            return 80;
        }
        int hash = Math.abs((int) ((jobId * 31L + candidateUserId * 17L) ^ 0x5DEECE66DL));
        return 75 + (hash % 21); // Returns 75% to 95%
    }
}
