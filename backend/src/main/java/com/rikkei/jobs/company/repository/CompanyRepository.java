package com.rikkei.jobs.company.repository;

import com.rikkei.jobs.company.model.Company;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {

    Optional<Company> findByHrOwnerUserId(Long hrOwnerUserId);
}
