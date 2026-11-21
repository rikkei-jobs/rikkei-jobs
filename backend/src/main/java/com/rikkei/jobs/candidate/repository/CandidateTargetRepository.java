package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.CandidateTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CandidateTargetRepository extends JpaRepository<CandidateTarget, Long> {}
