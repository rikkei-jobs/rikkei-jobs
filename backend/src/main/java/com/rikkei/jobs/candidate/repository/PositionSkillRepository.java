package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.PositionSkill;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PositionSkillRepository extends JpaRepository<PositionSkill, Long> {

    List<PositionSkill> findByPositionId(Long positionId);
}
