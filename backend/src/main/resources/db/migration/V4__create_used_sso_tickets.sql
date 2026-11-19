-- Module Identity: persist hashed SSO ticket identifiers for single-use enforcement.

CREATE TABLE IF NOT EXISTS used_sso_tickets (
    ticket_hash CHAR(64) PRIMARY KEY,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
