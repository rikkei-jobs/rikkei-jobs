package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.InterviewResult;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Request payload for updating interview round result, score, and feedback note (UT-02). Requires
 * {@code version} for explicit optimistic-locking stale-read detection.
 */
@Schema(description = "Yêu cầu cập nhật kết quả vòng phỏng vấn (UT-02)")
public record UpdateInterviewRoundRequest(
        @NotNull(message = "Kết quả đánh giá không được để trống (PENDING, PASS, FAIL)")
                @Schema(description = "Kết quả vòng phỏng vấn", example = "PASS")
                InterviewResult result,
        @DecimalMin(value = "0.0", message = "Điểm đánh giá phải từ 0.0 đến 100.0")
                @DecimalMax(value = "100.0", message = "Điểm đánh giá phải từ 0.0 đến 100.0")
                @Digits(
                        integer = 3,
                        fraction = 2,
                        message = "Điểm đánh giá tối đa 3 chữ số nguyên và 2 chữ số thập phân")
                @Schema(description = "Điểm đánh giá thang 100", example = "85.5")
                BigDecimal score,
        @Size(max = 2000, message = "Nhận xét không được vượt quá 2000 ký tự")
                @Schema(
                        description = "Nhận xét / ghi chú chi tiết từ người phỏng vấn",
                        example = "Ứng viên nắm vững Spring Boot, giải quyết tốt bài toán OOP.")
                String note,
        @NotNull(message = "Phiên bản vòng phỏng vấn không được để trống")
                @Min(value = 0, message = "Phiên bản vòng phỏng vấn không hợp lệ")
                @Schema(
                        description = "Phiên bản optimistic locking của vòng phỏng vấn",
                        example = "0",
                        requiredMode = Schema.RequiredMode.REQUIRED)
                Long version) {}
