-- Migration V5: Authentication and Identity Evolution
-- Module Identity: users, used_sso_tickets, password_reset_tokens

-- 1. Evolve users table with authentication and lockout tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_status'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'LOCKED'));
    END IF;
END $$;

-- Allow password_hash to be NULL for LMS SSO authenticated accounts
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Index on company_id for identity queries
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- 2. Create used_sso_tickets table for atomic ticket replay prevention
CREATE TABLE IF NOT EXISTS used_sso_tickets (
    ticket VARCHAR(255) PRIMARY KEY,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create password_reset_tokens table for secure token lifecycle
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
