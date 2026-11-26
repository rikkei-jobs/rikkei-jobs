package com.rikkei.jobs.recruitment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

/** Request payload for creating a new interview round (UT-02). */
@Schema(description = "Yêu cầu thêm vòng phỏng vấn mới (UT-02)")
public record CreateInterviewRoundRequest(
        @NotBlank(message = "Tên vòng phỏng vấn không được để trống")
                @Size(max = 100, message = "Tên vòng phỏng vấn không được vượt quá 100 ký tự")
                @Schema(description = "Tên vòng phỏng vấn", example = "Phỏng vấn kỹ thuật vòng 1")
                String name,
        @NotBlank(message = "Email người phỏng vấn không được để trống")
                @Email(message = "Email người phỏng vấn không đúng định dạng")
                @Size(max = 150, message = "Email người phỏng vấn không được vượt quá 150 ký tự")
                @Schema(
                        description = "Email của người thực hiện phỏng vấn",
                        example = "techlead@rikkeidigital.com")
                String interviewerEmail,
        @Schema(description = "Thời gian lên lịch phỏng vấn", example = "2026-11-25T14:30:00+07:00")
                OffsetDateTime scheduledAt) {}
