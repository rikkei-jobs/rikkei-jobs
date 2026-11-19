package com.rikkei.jobs.company.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.rikkei.jobs.company.validation.NoControlCharacters;
import com.rikkei.jobs.company.validation.ValidCompanySize;
import com.rikkei.jobs.company.validation.ValidHttpUrl;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(
        description =
                "Yêu cầu cập nhật hồ sơ công ty từ HR (taxCode và status là bất biến, nếu gửi kèm sẽ bị bỏ qua)")
public record UpdateCompanyRequest(
        @NotBlank(message = "Tên công ty không được để trống")
                @Size(max = 255, message = "Tên công ty không được vượt quá 255 ký tự")
                @NoControlCharacters(
                        message = "Tên công ty không được chứa ký tự điều khiển hoặc xuống dòng")
                @Schema(
                        description = "Tên doanh nghiệp",
                        example = "Công ty Cổ phần Công nghệ Rikkei")
                String name,
        @Size(max = 100, message = "Ngành nghề không được vượt quá 100 ký tự")
                @NoControlCharacters(
                        message = "Ngành nghề không được chứa ký tự điều khiển hoặc xuống dòng")
                @Schema(description = "Lĩnh vực hoạt động", example = "Công nghệ thông tin")
                String industry,
        @ValidCompanySize
                @Schema(
                        description = "Quy mô nhân sự",
                        allowableValues = {"1-50", "51-200", "201-1000", "1000+"},
                        example = "201-1000")
                String size,
        @Size(max = 500, message = "Địa chỉ không được vượt quá 500 ký tự")
                @NoControlCharacters(
                        message = "Địa chỉ không được chứa ký tự điều khiển hoặc xuống dòng")
                @Schema(description = "Địa chỉ trụ sở", example = "Tầng 21, Tòa nhà Phạm Hùng")
                String address,
        @Size(max = 100, message = "Thành phố không được vượt quá 100 ký tự")
                @NoControlCharacters(
                        message = "Thành phố không được chứa ký tự điều khiển hoặc xuống dòng")
                @Schema(description = "Tỉnh/Thành phố", example = "Hà Nội")
                String city,
        @Size(max = 500, message = "Website không được vượt quá 500 ký tự")
                @NoControlCharacters(
                        message = "Website không được chứa ký tự điều khiển hoặc xuống dòng")
                @ValidHttpUrl
                @Schema(
                        description = "Địa chỉ website (http/https)",
                        example = "https://rikkei.example.vn")
                String website,
        @Size(max = 2000, message = "Mô tả công ty không được vượt quá 2000 ký tự")
                @NoControlCharacters(
                        allowNewlines = true,
                        message = "Mô tả công ty không được chứa ký tự điều khiển không hợp lệ")
                @Schema(
                        description = "Mô tả giới thiệu doanh nghiệp",
                        example = "Doanh nghiệp công nghệ thông tin hàng đầu.")
                String description,
        @NotNull(message = "Phiên bản dữ liệu không được để trống")
                @Schema(
                        description = "Phiên bản lạc quan bắt buộc để chống ghi đè đồng thời",
                        example = "0",
                        requiredMode = Schema.RequiredMode.REQUIRED)
                Long version) {}
