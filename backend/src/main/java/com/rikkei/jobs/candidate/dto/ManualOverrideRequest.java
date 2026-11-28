package com.rikkei.jobs.candidate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.annotation.JsonDeserialize;

/** Request payload for STAFF manual override on an external record (D9). */
public record ManualOverrideRequest(
        @NotBlank(message = "Trường cần sửa không được để trống")
                @Size(max = 50, message = "Tên trường không được vượt quá 50 ký tự")
                String field,
        @NotNull(message = "Giá trị sửa tay không được để trống")
                @JsonDeserialize(using = ManualOverrideValueDeserializer.class)
                Object value,
        @NotBlank(message = "Lý do sửa tay không được để trống")
                @Size(max = 500, message = "Lý do không được vượt quá 500 ký tự")
                String reason) {}
