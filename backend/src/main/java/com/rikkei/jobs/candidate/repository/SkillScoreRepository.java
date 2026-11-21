package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.SkillScore;
import com.rikkei.jobs.candidate.model.SkillScoreId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillScoreRepository extends JpaRepository<SkillScore, SkillScoreId> {

    List<SkillScore> findByUserId(Long userId);
}
