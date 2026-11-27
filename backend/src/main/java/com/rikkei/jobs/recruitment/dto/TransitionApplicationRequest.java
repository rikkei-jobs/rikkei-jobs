package com.rikkei.jobs.recruitment.dto;

import com.rikkei.jobs.recruitment.model.ApplicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for transitioning application status according to UT-02 state transition rules.
 */
@Schema(description = "Yêu cầu chuyển trạng thái đơn ứng tuyển (UT-02)")
public record TransitionApplicationRequest(
        @NotNull(message = "Trạng thái mới không được để trống")
                @Schema(description = "Trạng thái đích muốn chuyển sang", example = "SCREENING")
                ApplicationStatus toStatus,
        @NotBlank(message = "Ghi chú/lý do chuyển trạng thái không được để trống")
                @Size(max = 2000, message = "Ghi chú không được vượt quá 2000 ký tự")
                @Schema(
                        description = "Ghi chú hoặc lý do chuyển trạng thái",
                        example = "Hồ sơ ứng viên phù hợp với tiêu chí vòng sàng lọc.")
                String note) {}
