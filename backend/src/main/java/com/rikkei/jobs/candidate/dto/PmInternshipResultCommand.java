package com.rikkei.jobs.candidate.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Cross-module command carrying an IOC PM internship result for candidate skill evidence. Keeps the
 * 3-argument constructor for backward compatibility while supporting {@code endDate} and raw
 * serialized source {@code payload}.
 */
public record PmInternshipResultCommand(
        String batchId,
        String topicName,
        BigDecimal finalScore,
        LocalDate endDate,
        String payload) {

    public PmInternshipResultCommand(String batchId, String topicName, BigDecimal finalScore) {
        this(batchId, topicName, finalScore, null, null);
    }
}
