package com.rikkei.jobs.internship.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.Data;

@Data
public class PMInternshipResponse {
    private String batchId;
    private String batchName;
    private String groupName;
    private String topicName;
    private String mentorEmail;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal finalScore;
    private List<PMInternshipTaskResponse> tasks;
}
