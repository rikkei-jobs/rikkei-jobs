package com.rikkei.jobs.company.service;

import com.rikkei.jobs.company.dto.request.CreateCompanyRequest;
import com.rikkei.jobs.company.dto.request.CreateHrAccountRequest;
import com.rikkei.jobs.company.dto.request.UpdateCompanyRequest;
import com.rikkei.jobs.company.dto.response.CompanyResponse;
import com.rikkei.jobs.company.dto.response.HrAccountResponse;
import org.springframework.web.multipart.MultipartFile;

/** Public service interface for the company module. */
public interface CompanyService {

    CompanyResponse createCompany(CreateCompanyRequest request, Long staffUserId);

    HrAccountResponse createHrAccount(Long companyId, CreateHrAccountRequest request);

    CompanyResponse getMyCompany(Long companyId);

    CompanyResponse updateMyCompany(Long companyId, UpdateCompanyRequest request);

    CompanyResponse uploadMyLogo(Long companyId, MultipartFile file);
}
