package com.rikkei.jobs.ai.repository;

import com.rikkei.jobs.ai.model.JobRecommendation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobRecommendationRepository extends JpaRepository<JobRecommendation, Long> {

    List<JobRecommendation> findByUserIdOrderByScoreDesc(Long userId);

    void deleteByUserId(Long userId);
}
