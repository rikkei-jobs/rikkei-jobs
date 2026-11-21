package com.rikkei.jobs.company.dto.request;

import com.rikkei.jobs.company.validation.NoControlCharacters;
import com.rikkei.jobs.company.validation.ValidHrEmail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu cấp tài khoản HR cho doanh nghiệp")
public record CreateHrAccountRequest(
        @NotBlank(message = "Email không được để trống")
                @ValidHrEmail
                @Schema(
                        description = "Email đăng nhập tài khoản HR",
                        example = "hr-contact@company.example.vn",
                        requiredMode = Schema.RequiredMode.REQUIRED)
                String email,
        @NotBlank(message = "Họ và tên không được để trống")
                @Size(max = 100, message = "Họ và tên không được vượt quá 100 ký tự")
                @NoControlCharacters(
                        message = "Họ và tên không được chứa ký tự điều khiển hoặc xuống dòng")
                @Schema(description = "Họ và tên người phụ trách HR", example = "Nguyễn Thị Lan")
                String fullName) {

    @Override
    public String toString() {
        return "CreateHrAccountRequest[email=***, fullName=***]";
    }
}
