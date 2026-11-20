package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.InterviewResult;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** Request payload for updating interview round result, score, and feedback note (UT-02). */
@Schema(description = "Yêu cầu cập nhật kết quả vòng phỏng vấn (UT-02)")
public record UpdateInterviewRoundRequest(
        @NotNull(message = "Kết quả đánh giá không được để trống (PENDING, PASS, FAIL)")
                @Schema(description = "Kết quả vòng phỏng vấn", example = "PASS")
                InterviewResult result,
        @DecimalMin(value = "0.0", message = "Điểm đánh giá phải từ 0.0 đến 100.0")
                @DecimalMax(value = "100.0", message = "Điểm đánh giá phải từ 0.0 đến 100.0")
                @Schema(description = "Điểm đánh giá thang 100", example = "85.5")
                BigDecimal score,
        @Size(max = 2000, message = "Nhận xét không được vượt quá 2000 ký tự")
                @Schema(
                        description = "Nhận xét / ghi chú chi tiết từ người phỏng vấn",
                        example = "Ứng viên nắm vững Spring Boot, giải quyết tốt bài toán OOP.")
                String note) {}
