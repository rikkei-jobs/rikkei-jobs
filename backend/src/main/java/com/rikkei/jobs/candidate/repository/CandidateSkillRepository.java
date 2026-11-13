package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.CandidateSkill;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CandidateSkillRepository extends JpaRepository<CandidateSkill, Long> {

    List<CandidateSkill> findByUserIdAndVerifiedTrue(Long userId);

    List<CandidateSkill> findByUserId(Long userId);
}
