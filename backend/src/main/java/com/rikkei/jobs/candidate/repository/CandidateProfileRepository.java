package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.CandidateProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CandidateProfileRepository extends JpaRepository<CandidateProfile, Long> {

    boolean existsByUserIdAndPublicProfileTrue(Long userId);
}
