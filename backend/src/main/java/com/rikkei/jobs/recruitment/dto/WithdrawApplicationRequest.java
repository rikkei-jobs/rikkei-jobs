package com.rikkei.jobs.recruitment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request payload for withdrawing an application. */
@Schema(description = "Yêu cầu rút hồ sơ ứng tuyển")
public record WithdrawApplicationRequest(
        @Schema(
                        description = "Lý do rút hồ sơ ứng tuyển",
                        example = "Tôi đã nhận được offer từ doanh nghiệp khác phù hợp hơn.")
                @NotBlank(message = "Lý do rút đơn không được để trống")
                @Size(max = 500, message = "Lý do rút đơn không được vượt quá 500 ký tự")
                String reason) {}
