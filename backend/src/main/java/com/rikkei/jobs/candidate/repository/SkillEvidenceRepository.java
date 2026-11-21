package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.EvidenceSource;
import com.rikkei.jobs.candidate.model.SkillEvidence;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillEvidenceRepository extends JpaRepository<SkillEvidence, Long> {

    List<SkillEvidence> findByUserIdOrderByRecordedAtDesc(Long userId);

    @Query("SELECT DISTINCT e.userId FROM SkillEvidence e")
    List<Long> findDistinctUserIds();

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(
            "DELETE FROM SkillEvidence e WHERE e.userId = :userId AND e.verified = true"
                    + " AND e.source IN :sources")
    int deleteVerifiedBySources(
            @Param("userId") Long userId, @Param("sources") Collection<EvidenceSource> sources);
}
