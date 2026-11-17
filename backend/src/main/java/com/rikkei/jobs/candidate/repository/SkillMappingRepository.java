package com.rikkei.jobs.candidate.repository;

import com.rikkei.jobs.candidate.model.ExternalSource;
import com.rikkei.jobs.candidate.model.SkillMapping;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillMappingRepository extends JpaRepository<SkillMapping, Long> {
    List<SkillMapping> findBySourceAndSourceCode(ExternalSource source, String sourceCode);
}
