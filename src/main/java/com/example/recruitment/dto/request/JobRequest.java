package com.example.recruitment.dto.request;

import com.example.recruitment.entity.JobStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobRequest {

    @NotBlank(message = "Tiêu đề công việc không được để trống")
    private String title;

    private String description;

    @PositiveOrZero(message = "Mức lương tối thiểu không được âm")
    private BigDecimal salaryMin;

    @PositiveOrZero(message = "Mức lương tối đa không được âm")
    private BigDecimal salaryMax;

    @NotBlank(message = "Địa điểm làm việc không được để trống")
    private String location;

    private JobStatus status;

    @NotNull(message = "ID công ty không được để trống")
    private Long companyId;
}
