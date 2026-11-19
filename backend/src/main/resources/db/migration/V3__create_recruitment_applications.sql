-- Migration V3: Create Recruitment Applications Schema
-- Module Recruitment: applications, application_status_history

CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    cv_id BIGINT NOT NULL,
    cv_snapshot_url VARCHAR(500) NOT NULL,
    cover_letter TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_applications_status CHECK (
        status IN ('SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN')
    )
);

-- Partial Unique Index: 1 candidate can only have 1 active (open) application per job
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_active_unique
ON applications(job_id, user_id)
WHERE status IN ('SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER');

-- Query performance indices
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);

CREATE TABLE IF NOT EXISTS application_status_history (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    actor_id BIGINT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_history_app_id ON application_status_history(application_id, created_at ASC);
