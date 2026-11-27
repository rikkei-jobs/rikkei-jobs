package com.rikkei.jobs.recruitment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request payload for candidate job application. */
@Schema(description = "Yêu cầu nộp hồ sơ ứng tuyển vào vị trí tuyển dụng")
public record ApplyJobRequest(
        @Schema(description = "ID của CV ứng viên sử dụng để nộp", example = "1")
                @NotNull(message = "cvId không được để trống")
                Long cvId,
        @Schema(
                        description = "Thư giới thiệu nguyện vọng ứng tuyển",
                        example = "Em rất mong muốn được thực tập tại công ty...")
                @Size(max = 2000, message = "Thư giới thiệu không được vượt quá 2000 ký tự")
                String coverLetter) {}
