package com.rikkei.jobs.ai.repository;

import com.rikkei.jobs.ai.dto.AiConfigDto;
import com.rikkei.jobs.ai.dto.UpdateAiConfigRequest;
import com.rikkei.jobs.ai.service.AiProvider;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Singleton settings; secrets are intentionally absent from the database contract. */
@Repository
public class AiConfigRepository {
    private final JdbcTemplate jdbc;

    public AiConfigRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<AiConfigDto> find() {
        return jdbc.query("SELECT * FROM ai_config WHERE id = 1", AiConfigRepository::map).stream()
                .findFirst();
    }

    public void initialize(AiConfigDto defaults) {
        jdbc.update(
                """
                INSERT INTO ai_config (id, provider, model, temperature, max_tokens,
                    daily_limit_per_user, enabled)
                VALUES (1, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING
                """,
                defaults.provider().name(),
                defaults.model(),
                defaults.temperature(),
                defaults.maxTokens(),
                defaults.dailyLimitPerUser(),
                defaults.enabled());
    }

    public boolean update(UpdateAiConfigRequest input, long adminId, OffsetDateTime now) {
        return jdbc.update(
                        """
                UPDATE ai_config SET provider = ?, model = ?, temperature = ?, max_tokens = ?,
                    daily_limit_per_user = ?, enabled = ?, updated_by = ?, updated_at = ?,
                    version = version + 1
                WHERE id = 1 AND version = ?
                """,
                        input.provider().name(),
                        input.model(),
                        input.temperature(),
                        input.maxTokens(),
                        input.dailyLimitPerUser(),
                        input.enabled(),
                        adminId,
                        now,
                        input.version())
                == 1;
    }

    private static AiConfigDto map(ResultSet row, int index) throws SQLException {
        return new AiConfigDto(
                row.getLong("id"),
                AiProvider.valueOf(row.getString("provider")),
                row.getString("model"),
                row.getBigDecimal("temperature"),
                row.getInt("max_tokens"),
                row.getInt("daily_limit_per_user"),
                row.getBoolean("enabled"),
                row.getObject("updated_by", Long.class),
                row.getObject("updated_at", OffsetDateTime.class),
                row.getLong("version"));
    }
}
