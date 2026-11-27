package com.rikkei.jobs.ai.repository;

import com.rikkei.jobs.ai.dto.AiLogDto;
import com.rikkei.jobs.ai.dto.AiLogPage;
import com.rikkei.jobs.ai.dto.AiUsageSummary;
import com.rikkei.jobs.ai.dto.AiUsageSummary.UsageBucket;
import com.rikkei.jobs.ai.model.AiFeature;
import com.rikkei.jobs.ai.model.AiLogStatus;
import com.rikkei.jobs.ai.service.AiProvider;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * All queries stay within AI-owned tables; audit logs are immutable except for bounded retention
 * purges.
 */
@Repository
public class AiLogRepository {
    public static final long COUNT_CAP = 10_000L;
    private static final String METRICS =
            """
            COUNT(*) FILTER (WHERE status <> 'BLOCKED') AS calls,
            COUNT(*) FILTER (WHERE status = 'OK') AS ok,
            COUNT(*) FILTER (WHERE status = 'ERROR') AS errors,
            COUNT(*) FILTER (WHERE status = 'BLOCKED') AS blocked,
            COALESCE(SUM(tokens_in), 0) AS tokens_in,
            COALESCE(SUM(tokens_out), 0) AS tokens_out,
            COUNT(*) FILTER (WHERE status <> 'BLOCKED'
                AND (tokens_in IS NULL OR tokens_out IS NULL)) AS unknown_tokens
            """;
    private final NamedParameterJdbcTemplate jdbc;

    public AiLogRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(AiLogDto log) {
        Map<String, Object> values = new HashMap<>();
        values.put("user", log.userId());
        values.put("feature", log.feature().name());
        values.put("provider", log.provider().name());
        values.put("model", log.model());
        values.put("prompt", log.promptMasked());
        values.put("response", log.response());
        values.put("input", log.tokensIn());
        values.put("output", log.tokensOut());
        values.put("latency", log.latencyMs());
        values.put("status", log.status().name());
        values.put("created", log.createdAt());
        jdbc.update(
                """
                INSERT INTO ai_logs (user_id, feature, provider, model, prompt_masked, response,
                    tokens_in, tokens_out, latency_ms, status, created_at)
                VALUES (:user, :feature, :provider, :model, :prompt, :response,
                    :input, :output, :latency, :status, :created)
                """,
                values);
    }

    public AiLogPage search(
            AiFeature feature,
            Long userId,
            AiLogStatus status,
            LocalDate from,
            LocalDate to,
            int page,
            int size) {
        StringBuilder where =
                new StringBuilder(" WHERE created_at >= :from AND created_at < :until");
        Map<String, Object> params = dates(from, to);
        if (feature != null) {
            where.append(" AND feature = :feature");
            params.put("feature", feature.name());
        }
        if (userId != null) {
            where.append(" AND user_id = :user");
            params.put("user", userId);
        }
        if (status != null) {
            where.append(" AND status = :status");
            params.put("status", status.name());
        }
        params.put("countLimit", COUNT_CAP + 1);
        Long rawCount =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM (SELECT 1 FROM ai_logs"
                                + where
                                + " ORDER BY created_at DESC, id DESC LIMIT :countLimit) AS bounded",
                        params,
                        Long.class);
        long raw = rawCount == null ? 0L : rawCount;
        boolean totalCapped = raw > COUNT_CAP;
        long total = Math.min(raw, COUNT_CAP);
        params.put("limit", size);
        params.put("offset", (long) page * size);
        List<AiLogDto> rows =
                jdbc.query(
                        "SELECT * FROM ai_logs"
                                + where
                                + " ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset",
                        params,
                        AiLogRepository::map);
        return new AiLogPage(rows, total, page, size, totalCapped);
    }

    public int deleteOldestBatch(OffsetDateTime cutoff, int batchSize) {
        if (batchSize < 1) {
            throw new IllegalArgumentException("batchSize must be >= 1");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("cutoff", cutoff);
        params.put("batchSize", batchSize);
        return jdbc.update(
                """
                DELETE FROM ai_logs
                WHERE id IN (
                    SELECT id FROM ai_logs
                    WHERE created_at < :cutoff
                    ORDER BY created_at ASC, id ASC
                    LIMIT :batchSize
                )
                """,
                params);
    }

    public AiUsageSummary summary(LocalDate from, LocalDate to) {
        Map<String, Object> params = dates(from, to);
        String where = " FROM ai_logs WHERE created_at >= :from AND created_at < :until ";
        List<UsageBucket> daily =
                jdbc.query(
                        "SELECT (created_at AT TIME ZONE 'UTC')::date AS day, "
                                + METRICS
                                + where
                                + " GROUP BY day ORDER BY day",
                        params,
                        (row, index) -> bucket(row, row.getObject("day", LocalDate.class), null));
        List<UsageBucket> features =
                jdbc.query(
                        "SELECT feature, " + METRICS + where + " GROUP BY feature ORDER BY feature",
                        params,
                        (row, index) ->
                                bucket(row, null, AiFeature.valueOf(row.getString("feature"))));
        return new AiUsageSummary("UTC", from, to, daily, features);
    }

    private static Map<String, Object> dates(LocalDate from, LocalDate to) {
        Map<String, Object> params = new HashMap<>();
        params.put("from", from.atStartOfDay().atOffset(ZoneOffset.UTC));
        params.put("until", to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        return params;
    }

    private static UsageBucket bucket(ResultSet row, LocalDate date, AiFeature feature)
            throws SQLException {
        return new UsageBucket(
                date,
                feature,
                row.getLong("calls"),
                row.getLong("ok"),
                row.getLong("errors"),
                row.getLong("blocked"),
                row.getLong("tokens_in"),
                row.getLong("tokens_out"),
                row.getLong("unknown_tokens"));
    }

    private static AiLogDto map(ResultSet row, int index) throws SQLException {
        return new AiLogDto(
                row.getLong("id"),
                row.getLong("user_id"),
                AiFeature.valueOf(row.getString("feature")),
                AiProvider.valueOf(row.getString("provider")),
                row.getString("model"),
                row.getString("prompt_masked"),
                row.getString("response"),
                row.getObject("tokens_in", Integer.class),
                row.getObject("tokens_out", Integer.class),
                row.getLong("latency_ms"),
                AiLogStatus.valueOf(row.getString("status")),
                row.getObject("created_at", OffsetDateTime.class));
    }
}
