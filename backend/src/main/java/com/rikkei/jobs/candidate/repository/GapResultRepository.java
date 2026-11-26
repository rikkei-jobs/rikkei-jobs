package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.GapResult;
import com.rikkei.jobs.candidate.model.GapResultId;
import com.rikkei.jobs.candidate.model.GapTargetType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GapResultRepository extends JpaRepository<GapResult, GapResultId> {

    List<GapResult> findByUserIdAndTargetTypeAndTargetId(
            Long userId, GapTargetType targetType, Long targetId);
}
