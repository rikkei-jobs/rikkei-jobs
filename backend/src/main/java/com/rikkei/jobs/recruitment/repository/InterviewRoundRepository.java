package com.rikkei.jobs.recruitment.repository;

import com.rikkei.jobs.recruitment.model.InterviewRound;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Spring Data JPA repository for {@link InterviewRound} entities (UT-02). */
@Repository
public interface InterviewRoundRepository extends JpaRepository<InterviewRound, Long> {

    /** Projection for batch-counting interview rounds per application without N+1 queries. */
    interface RoundCountProjection {
        Long getApplicationId();

        long getRoundCount();
    }

    List<InterviewRound> findByApplicationIdOrderByRoundNoAsc(Long applicationId);

    Optional<InterviewRound> findByIdAndApplicationId(Long id, Long applicationId);

    @Query(
            "SELECT COALESCE(MAX(r.roundNo), 0) FROM InterviewRound r WHERE r.applicationId = :applicationId")
    int findMaxRoundNoByApplicationId(@Param("applicationId") Long applicationId);

    @Query(
            "SELECT r.applicationId AS applicationId, COUNT(r) AS roundCount "
                    + "FROM InterviewRound r "
                    + "WHERE r.applicationId IN :applicationIds "
                    + "GROUP BY r.applicationId")
    List<RoundCountProjection> countByApplicationIds(
            @Param("applicationIds") Collection<Long> applicationIds);

    List<InterviewRound> findAllByInterviewerEmailIgnoreCase(String interviewerEmail);
}
