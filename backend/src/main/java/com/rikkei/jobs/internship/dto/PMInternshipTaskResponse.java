package com.rikkei.jobs.internship.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PMInternshipTaskResponse(
        String title, BigDecimal acceptedScore, OffsetDateTime acceptedAt) {}
