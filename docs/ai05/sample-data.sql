-- Synthetic AI-05 demonstration data. Run only against a disposable development database.
-- Existing user_id = 1 is a scalar reference; there are no cross-module foreign keys.
BEGIN;

INSERT INTO ai_config (
    id, provider, model, temperature, max_tokens, daily_limit_per_user, enabled
) VALUES (1, 'MOCK', 'mock', 0.30, 150, 2, TRUE)
ON CONFLICT (id) DO UPDATE SET
    provider = EXCLUDED.provider,
    model = EXCLUDED.model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    daily_limit_per_user = EXCLUDED.daily_limit_per_user,
    enabled = EXCLUDED.enabled,
    version = ai_config.version + 1,
    updated_at = NOW();

INSERT INTO ai_logs (
    user_id, feature, provider, model, prompt_masked, response,
    tokens_in, tokens_out, latency_ms, status
) VALUES
(1, 'CHAT', 'MOCK', 'mock', '[EMAIL], [PHONE]', 'Synthetic response', 0, 0, 12, 'OK'),
(1, 'CV', 'MOCK', 'mock', 'Profile [ID]', 'Synthetic response', 0, 0, 15, 'OK'),
(1, 'PRACTICE', 'MOCK', 'mock', '[EMAIL], [PHONE]', 'Daily limit reached', 0, 0, 0, 'BLOCKED');

INSERT INTO ai_usage (user_id, date, count)
VALUES (1, (NOW() AT TIME ZONE 'UTC')::DATE, 2)
ON CONFLICT (user_id, date) DO UPDATE SET count = 2;

COMMIT;
