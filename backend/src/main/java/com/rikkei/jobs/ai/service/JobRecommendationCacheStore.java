package com.rikkei.jobs.ai.service;

import com.rikkei.jobs.ai.model.JobRecommendation;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persists recommendation snapshots with an upsert on (user_id, job_id), so concurrent refreshes
 * cannot create duplicate rows nor fail on the unique constraint.
 */
@Component
public class JobRecommendationCacheStore {

    private static final String UPSERT_SQL =
            """
            INSERT INTO job_recommendations
                (user_id, job_id, score, explanation, ai_generated, quota_degraded, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id, job_id) DO UPDATE SET
                score = EXCLUDED.score,
                explanation = EXCLUDED.explanation,
                ai_generated = EXCLUDED.ai_generated,
                quota_degraded = EXCLUDED.quota_degraded,
                created_at = EXCLUDED.created_at
            """;

    private static final String DELETE_STALE_SQL =
            "DELETE FROM job_recommendations WHERE user_id = ? AND job_id NOT IN (%s)";

    private final JdbcTemplate jdbcTemplate;

    public JobRecommendationCacheStore(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Replaces the cached top recommendations of one user atomically. */
    @Transactional
    public void replaceForUser(Long userId, List<JobRecommendation> recommendations) {
        if (recommendations.isEmpty()) {
            jdbcTemplate.update("DELETE FROM job_recommendations WHERE user_id = ?", userId);
            return;
        }

        jdbcTemplate.batchUpdate(
                UPSERT_SQL,
                recommendations.stream()
                        .map(
                                recommendation ->
                                        new Object[] {
                                            userId,
                                            recommendation.getJobId(),
                                            recommendation.getScore(),
                                            recommendation.getExplanation(),
                                            recommendation.getAiGenerated(),
                                            Boolean.TRUE.equals(recommendation.getQuotaDegraded()),
                                            Timestamp.from(
                                                    recommendation.getCreatedAt().toInstant())
                                        })
                        .toList());

        List<Object> arguments = new ArrayList<>();
        arguments.add(userId);
        recommendations.forEach(recommendation -> arguments.add(recommendation.getJobId()));
        String placeholders = String.join(", ", Collections.nCopies(recommendations.size(), "?"));
        jdbcTemplate.update(String.format(DELETE_STALE_SQL, placeholders), arguments.toArray());
    }
}
