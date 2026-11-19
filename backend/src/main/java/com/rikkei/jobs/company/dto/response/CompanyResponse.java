package com.rikkei.jobs.company.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(description = "Thông tin hồ sơ công ty")
public record CompanyResponse(
        @Schema(description = "ID doanh nghiệp", example = "1") Long id,
        @Schema(description = "Tên doanh nghiệp", example = "Công ty Cổ phần Công nghệ Nam Phương")
                String name,
        @Schema(description = "Mã số thuế (bất biến)", example = "0109283746") String taxCode,
        @Schema(description = "Lĩnh vực hoạt động", example = "Công nghệ thông tin")
                String industry,
        @Schema(description = "Quy mô nhân sự", example = "51-200") String size,
        @Schema(description = "Địa chỉ trụ sở", example = "Tầng 21, Tòa nhà Phạm Hùng")
                String address,
        @Schema(description = "Tỉnh/Thành phố", example = "Hà Nội") String city,
        @Schema(description = "Địa chỉ website", example = "https://rikkei.example.vn")
                String website,
        @Schema(
                        description = "URL CDN công khai của logo doanh nghiệp",
                        example =
                                "https://res.cloudinary.com/demo/image/upload/v1763437800/rikkei-jobs/company-logos/company-1.png")
                String logoUrl,
        @Schema(description = "Mô tả giới thiệu doanh nghiệp") String description,
        @Schema(description = "Trạng thái doanh nghiệp", example = "ACTIVE") String status,
        @Schema(description = "ID cán bộ tạo doanh nghiệp", example = "7") Long createdBy,
        @Schema(description = "Thời điểm tạo") OffsetDateTime createdAt,
        @Schema(description = "Thời điểm cập nhật gần nhất") OffsetDateTime updatedAt,
        @Schema(description = "Phiên bản lạc quan", example = "0") Long version) {}
