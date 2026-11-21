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
}
