package com.rikkei.jobs.company.service;

import com.rikkei.jobs.company.service.CompanyLogoValidator.ValidatedLogo;

/** Storage port owned by the company module for externalized logo persistence. */
public interface LogoStorage {

    StoredLogo store(Long companyId, ValidatedLogo logo);

    void delete(String publicId);

    record StoredLogo(String publicId, String secureUrl) {}
}
