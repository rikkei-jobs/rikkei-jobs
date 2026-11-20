package com.rikkei.jobs.recruitment.repository;

import com.rikkei.jobs.recruitment.model.InterviewRound;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data JPA Repository for InterviewRound entities (UT-02). */
@Repository
public interface InterviewRoundRepository extends JpaRepository<InterviewRound, Long> {

    List<InterviewRound> findByApplicationIdOrderByRoundNoAsc(Long applicationId);

    Optional<InterviewRound> findByIdAndApplicationId(Long id, Long applicationId);

    int countByApplicationId(Long applicationId);

    Optional<InterviewRound> findTopByApplicationIdOrderByRoundNoDesc(Long applicationId);
}
