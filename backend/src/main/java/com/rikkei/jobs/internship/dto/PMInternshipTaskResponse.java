package com.rikkei.jobs.internship.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
public class PMInternshipTaskResponse {

    private String title;
    private BigDecimal acceptedScore;
    private OffsetDateTime acceptedAt;
}
