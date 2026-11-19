package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.GapResult;
import com.rikkei.jobs.candidate.model.GapResultId;
import com.rikkei.jobs.candidate.model.GapTargetType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface GapResultRepository extends JpaRepository<GapResult, GapResultId> {

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(
            "DELETE FROM GapResult g WHERE g.userId = :userId AND g.targetType = :targetType"
                    + " AND g.targetId = :targetId")
    int deleteByTarget(
            @Param("userId") Long userId,
            @Param("targetType") GapTargetType targetType,
            @Param("targetId") Long targetId);

    List<GapResult> findByUserIdAndTargetTypeAndTargetId(
            Long userId, GapTargetType targetType, Long targetId);
}
