package com.rikkei.jobs.recruitment.repository;

import com.rikkei.jobs.recruitment.model.ApplicationCvSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationCvSnapshotRepository
        extends JpaRepository<ApplicationCvSnapshot, Long> {}
