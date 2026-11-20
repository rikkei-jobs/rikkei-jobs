package com.rikkei.jobs.internship.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record InternshipResponse(
        Long id,
        String batchId,
        String batchName,
        String groupName,
        String topicName,
        String mentorEmail,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal finalScore,
        LocalDateTime syncedAt,
        List<InternshipTaskResponse> tasks) {}
