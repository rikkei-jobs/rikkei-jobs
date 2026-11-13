package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.CandidateCv;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateCvRepository extends JpaRepository<CandidateCv, Long> {

    Page<CandidateCv> findByUserIdOrderByUpdatedAtDesc(Long userId, Pageable pageable);

    Optional<CandidateCv> findByIdAndUserId(Long id, Long userId);
}
