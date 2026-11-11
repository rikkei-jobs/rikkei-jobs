package com.rikkei.jobs.company.repository;

import com.rikkei.jobs.company.model.JobSkill;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobSkillRepository extends JpaRepository<JobSkill, Long> {

    List<JobSkill> findByJobId(Long jobId);

    List<JobSkill> findByJobIdIn(Collection<Long> jobIds);
}
