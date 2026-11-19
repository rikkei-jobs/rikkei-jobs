package com.rikkei.jobs.company.repository;

import com.rikkei.jobs.company.model.Company;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
 feature/T023552-candidate-application

public interface CompanyRepository extends JpaRepository<Company, Long> {

    Optional<Company> findByHrOwnerUserId(Long hrOwnerUserId);

import org.springframework.stereotype.Repository;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {

    boolean existsByTaxCode(String taxCode);

    Optional<Company> findByTaxCode(String taxCode);
develop
}
