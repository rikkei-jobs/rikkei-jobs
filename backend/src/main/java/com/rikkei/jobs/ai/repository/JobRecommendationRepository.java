package com.rikkei.jobs.ai.repository;

import com.rikkei.jobs.ai.model.JobRecommendation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Read access to the 24-hour recommendation cache. Writes go through the cache store upsert. */
@Repository
public interface JobRecommendationRepository extends JpaRepository<JobRecommendation, Long> {

    List<JobRecommendation> findByUserIdOrderByScoreDescJobIdAsc(Long userId);
}
