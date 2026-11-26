CREATE TABLE IF NOT EXISTS ai_config (
    id BIGSERIAL PRIMARY KEY CHECK (id = 1),
    provider VARCHAR(16) NOT NULL CHECK (provider IN ('MOCK', 'OPENAI', 'GEMINI', 'CLAUDE')),
    model VARCHAR(120) NOT NULL,
    temperature NUMERIC(3, 2) NOT NULL CHECK (temperature BETWEEN 0 AND 1),
    max_tokens INTEGER NOT NULL CHECK (max_tokens BETWEEN 1 AND 8192),
    daily_limit_per_user INTEGER NOT NULL CHECK (daily_limit_per_user BETWEEN 0 AND 100000),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ai_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    feature VARCHAR(16) NOT NULL CHECK (feature IN ('RECOMMEND', 'CV', 'PRACTICE', 'CHAT')),
    provider VARCHAR(16) NOT NULL CHECK (provider IN ('MOCK', 'OPENAI', 'GEMINI', 'CLAUDE')),
    model VARCHAR(120) NOT NULL,
    prompt_masked TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_in INTEGER CHECK (tokens_in >= 0),
    tokens_out INTEGER CHECK (tokens_out >= 0),
    latency_ms BIGINT NOT NULL CHECK (latency_ms >= 0),
    status VARCHAR(16) NOT NULL CHECK (status IN ('OK', 'ERROR', 'BLOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at_id
    ON ai_logs (created_at DESC, id DESC)
    INCLUDE (feature, status, tokens_in, tokens_out);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id_created_at_id
    ON ai_logs (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_non_ok_status
    ON ai_logs (status, created_at DESC, id DESC)
    WHERE status <> 'OK';

CREATE TABLE IF NOT EXISTS ai_usage (
    user_id BIGINT NOT NULL,
    date DATE NOT NULL,
    count INTEGER NOT NULL CHECK (count >= 0),
    PRIMARY KEY (user_id, date)
);

ALTER TABLE job_recommendations
ADD COLUMN IF NOT EXISTS quota_degraded BOOLEAN NOT NULL DEFAULT FALSE;
