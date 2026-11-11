package com.example.recruitment.service;

import com.example.recruitment.dto.request.CompanyRequest;
import com.example.recruitment.dto.response.CompanyResponse;

import java.util.List;

public interface CompanyService {
    CompanyResponse createCompany(CompanyRequest request);
    CompanyResponse getCompanyById(Long id);
    List<CompanyResponse> getAllCompanies();
    CompanyResponse updateCompany(Long id, CompanyRequest request);
    void deleteCompany(Long id);
}
