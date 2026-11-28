package com.rikkei.jobs.candidate.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.stereotype.Service;

/**
 * Acquires a PostgreSQL transaction-scoped advisory lock per candidate user ID using a dedicated
 * 2-argument namespace so skill recompute, sync, mentor evaluation, and PM internship writes
 * serialize without colliding with 1-argument gap analysis locks.
 */
@Service
public class CandidateSkillLockService {

    private static final int CANDIDATE_SKILL_LOCK_NAMESPACE = 0x524B534B;

    private final JdbcTemplate jdbcTemplate;

    public CandidateSkillLockService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void acquireUserLock(Long userId) {
        if (userId == null || userId <= 0) {
            return;
        }
        int userKey = (int) (userId ^ (userId >>> 32));
        jdbcTemplate.query(
                "SELECT pg_advisory_xact_lock(?, ?)",
                statement -> {
                    statement.setInt(1, CANDIDATE_SKILL_LOCK_NAMESPACE);
                    statement.setInt(2, userKey);
                },
                (ResultSetExtractor<Void>) resultSet -> null);
    }
}
