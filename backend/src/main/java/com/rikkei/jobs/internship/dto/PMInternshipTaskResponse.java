package com.rikkei.jobs.internship.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Data;

@Data
public class PMInternshipTaskResponse {

    private String title;
    private BigDecimal acceptedScore;
    private OffsetDateTime acceptedAt;
}
