package com.rikkei.jobs.candidate.service;

import com.rikkei.jobs.candidate.dto.GapTargetDto;
import com.rikkei.jobs.candidate.model.GapTargetType;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Isolates read-only gap computation transactions from serialized write-on-miss persistence so warm
 * gap-analysis reads never acquire advisory locks or mutate gap_results.
 */
@Service
public class GapResultPersistenceService {

    public record PersistTargetSnapshot(
            GapTargetDto targetDto,
            GapTargetType targetType,
            Long targetId,
            int readiness,
            List<GapAnalysisCalculator.MissingSkill> missingSkills,
            boolean matchesExisting) {

        public PersistTargetSnapshot {
            missingSkills = List.copyOf(missingSkills);
        }
    }

    private static final String DELETE_BY_TARGET_SQL =
            "DELETE FROM gap_results WHERE user_id = ? AND target_type = ? AND target_id = ?";

    private static final String INSERT_GAP_RESULT_SQL =
            """
            INSERT INTO gap_results
                (user_id, target_type, target_id, skill_id, required, current, gap, computed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    public GapResultPersistenceService(JdbcTemplate jdbcTemplate, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public <T> T readOnly(Supplier<T> action) {
        return action.get();
    }

    @Transactional(rollbackFor = Exception.class)
    public PersistTargetSnapshot persistDeficits(
            Long userId, Supplier<PersistTargetSnapshot> snapshotReader) {
        jdbcTemplate.query(
                "SELECT pg_advisory_xact_lock(?)",
                statement -> statement.setLong(1, userId),
                (ResultSetExtractor<Void>) resultSet -> null);

        // Recompute under the advisory lock so a stalled Tx1 cannot write stale deficits over newer
        // skill_scores or gap_results updates.
        PersistTargetSnapshot current = snapshotReader.get();
        if (current.matchesExisting()) {
            return current;
        }

        jdbcTemplate.update(
                DELETE_BY_TARGET_SQL, userId, current.targetType().name(), current.targetId());
        if (current.missingSkills().isEmpty()) {
            return current;
        }

        Timestamp computedAt = Timestamp.from(OffsetDateTime.now(clock).toInstant());
        jdbcTemplate.batchUpdate(
                INSERT_GAP_RESULT_SQL,
                current.missingSkills().stream()
                        .map(
                                missing ->
                                        new Object[] {
                                            userId,
                                            current.targetType().name(),
                                            current.targetId(),
                                            missing.skillId(),
                                            missing.required(),
                                            missing.current(),
                                            missing.gap(),
                                            computedAt
                                        })
                        .toList());
        return current;
    }
}
