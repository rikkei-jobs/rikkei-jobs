package com.rikkei.jobs.assessment.repository;

import com.rikkei.jobs.assessment.model.Skill;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillRepository extends JpaRepository<Skill, Integer> {
    Optional<Skill> findByCode(String code);
}
