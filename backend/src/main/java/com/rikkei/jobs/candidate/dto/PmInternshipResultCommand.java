package com.rikkei.jobs.candidate.dto;

import java.math.BigDecimal;

/** Cross-module command carrying an IOC PM internship result for candidate skill evidence. */
public record PmInternshipResultCommand(String batchId, String topicName, BigDecimal finalScore) {}
