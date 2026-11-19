package com.rikkei.jobs.company.mapper;

import com.rikkei.jobs.company.dto.request.UpdateCompanyRequest;
import com.rikkei.jobs.company.dto.response.CompanyResponse;
import com.rikkei.jobs.company.model.Company;
import org.springframework.stereotype.Component;

/** Hand-written mapper for Company entity and DTOs (DG-01 reference style). */
@Component
public class CompanyMapper {

    public CompanyResponse toResponse(Company company) {
        if (company == null) {
            return null;
        }
        return new CompanyResponse(
                company.getId(),
                company.getName(),
                company.getTaxCode(),
                company.getIndustry(),
                company.getSize(),
                company.getAddress(),
                company.getCity(),
                company.getWebsite(),
                company.getLogoUrl(),
                company.getDescription(),
                company.getStatus() != null ? company.getStatus().name() : null,
                company.getCreatedBy(),
                company.getCreatedAt(),
                company.getUpdatedAt(),
                company.getVersion());
    }

    public void updateEntity(Company company, UpdateCompanyRequest request) {
        if (company == null || request == null) {
            return;
        }
        // Only the 7 mutable profile fields are updated; taxCode, status, and createdBy remain
        // immutable.
        company.setName(request.name().trim());
        company.setIndustry(request.industry());
        company.setSize(request.size());
        company.setAddress(request.address());
        company.setCity(request.city());
        company.setWebsite(request.website());
        company.setDescription(request.description());
    }
}
