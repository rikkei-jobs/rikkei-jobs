package com.rikkei.jobs.internship.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PMInternshipResponse(
        String batchId,
        String batchName,
        String groupName,
        String topicName,
        String mentorEmail,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal finalScore,
        List<PMInternshipTaskResponse> tasks) {

    public PMInternshipResponse {
        tasks = tasks == null ? List.of() : tasks.stream().filter(Objects::nonNull).toList();
    }
}
