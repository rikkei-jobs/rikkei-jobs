package com.rikkei.jobs.company.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.rikkei.jobs.company.dto.request.UpdateCompanyRequest;
import com.rikkei.jobs.company.dto.response.CompanyResponse;
import com.rikkei.jobs.company.model.Company;
import com.rikkei.jobs.company.model.CompanyStatus;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("CompanyMapper Unit Tests")
class CompanyMapperTest {

    private final CompanyMapper mapper = new CompanyMapper();

    @Test
    @DisplayName("Should return null when mapping null Company entity")
    void shouldReturnNullForNullCompany() {
        assertNull(mapper.toResponse(null));
    }

    @Test
    @DisplayName("Should map all 15 Company fields to CompanyResponse")
    void shouldMapAllFieldsToResponse() {
        OffsetDateTime created = OffsetDateTime.of(2026, 11, 17, 7, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime updated = created.plusHours(1);

        Company company = new Company();
        company.setId(42L);
        company.setName("Công ty Công nghệ Nam Phương");
        company.setTaxCode("0109283746");
        company.setIndustry("Công nghệ thông tin");
        company.setSize("51-200");
        company.setAddress("Tầng 21, Phạm Hùng");
        company.setCity("Hà Nội");
        company.setWebsite("https://namphuong.example.vn");
        company.setLogoUrl(
                "https://res.cloudinary.com/demo/image/upload/v1763437800/rikkei-jobs/company-logos/company-42.png");
        company.setDescription("Mô tả doanh nghiệp");
        company.setStatus(CompanyStatus.ACTIVE);
        company.setCreatedBy(7L);
        company.setCreatedAt(created);
        company.setUpdatedAt(updated);
        company.setVersion(3L);

        CompanyResponse response = mapper.toResponse(company);

        assertEquals(42L, response.id());
        assertEquals("Công ty Công nghệ Nam Phương", response.name());
        assertEquals("0109283746", response.taxCode());
        assertEquals("Công nghệ thông tin", response.industry());
        assertEquals("51-200", response.size());
        assertEquals("Tầng 21, Phạm Hùng", response.address());
        assertEquals("Hà Nội", response.city());
        assertEquals("https://namphuong.example.vn", response.website());
        assertEquals(
                "https://res.cloudinary.com/demo/image/upload/v1763437800/rikkei-jobs/company-logos/company-42.png",
                response.logoUrl());
        assertEquals("Mô tả doanh nghiệp", response.description());
        assertEquals("ACTIVE", response.status());
        assertEquals(7L, response.createdBy());
        assertEquals(created, response.createdAt());
        assertEquals(updated, response.updatedAt());
        assertEquals(3L, response.version());
    }

    @Test
    @DisplayName(
            "updateEntity should mutate only the 7 editable fields and keep taxCode/status/createdBy/id/version untouched")
    void shouldUpdateOnlySevenEditableFields() {
        Company company = new Company();
        company.setId(10L);
        company.setName("Tên cũ");
        company.setTaxCode("0109283746");
        company.setStatus(CompanyStatus.ACTIVE);
        company.setCreatedBy(7L);
        company.setVersion(2L);

        UpdateCompanyRequest request =
                new UpdateCompanyRequest(
                        "  Tên mới  ",
                        "Tài chính",
                        "201-1000",
                        "Quận 1",
                        "TP. Hồ Chí Minh",
                        "https://moi.example.vn",
                        "Mô tả mới",
                        2L);

        mapper.updateEntity(company, request);

        assertEquals(10L, company.getId());
        assertEquals("Tên mới", company.getName());
        assertEquals("Tài chính", company.getIndustry());
        assertEquals("201-1000", company.getSize());
        assertEquals("Quận 1", company.getAddress());
        assertEquals("TP. Hồ Chí Minh", company.getCity());
        assertEquals("https://moi.example.vn", company.getWebsite());
        assertEquals("Mô tả mới", company.getDescription());
        assertEquals("0109283746", company.getTaxCode());
        assertEquals(CompanyStatus.ACTIVE, company.getStatus());
        assertEquals(7L, company.getCreatedBy());
        assertEquals(2L, company.getVersion());
    }
}
