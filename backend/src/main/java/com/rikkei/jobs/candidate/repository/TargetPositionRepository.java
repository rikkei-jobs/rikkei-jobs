package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.TargetPosition;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TargetPositionRepository extends JpaRepository<TargetPosition, Long> {

    Optional<TargetPosition> findByCode(String code);

    List<TargetPosition> findAllByOrderByNameAsc();
}
