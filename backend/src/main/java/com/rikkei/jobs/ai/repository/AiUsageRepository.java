package com.rikkei.jobs.ai.repository;

import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AiUsageRepository {
    private final JdbcTemplate jdbc;

    public AiUsageRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Conditional upsert serializes contenders on the same user/day across all app instances. */
    public boolean reserve(long userId, LocalDate date, int limit) {
        return !jdbc.queryForList(
                        """
                INSERT INTO ai_usage (user_id, date, count)
                SELECT ?, CAST(? AS DATE), 1 WHERE ? > 0
                ON CONFLICT (user_id, date) DO UPDATE SET count = ai_usage.count + 1
                WHERE ai_usage.count < ?
                RETURNING count
                """,
                        Integer.class,
                        userId,
                        date,
                        limit,
                        limit)
                .isEmpty();
    }

    /** Read-only quota check for cache revalidation without consuming a slot. */
    public boolean hasQuotaAvailable(long userId, LocalDate date, int limit) {
        if (limit <= 0) {
            return false;
        }
        Boolean available =
                jdbc.queryForObject(
                        "SELECT COALESCE((SELECT count FROM ai_usage WHERE user_id = ? AND date = CAST(? AS DATE)), 0) < ?",
                        Boolean.class,
                        userId,
                        date,
                        limit);
        return Boolean.TRUE.equals(available);
    }
}
