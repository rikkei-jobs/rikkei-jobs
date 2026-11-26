-- Migration V17: Create Recruitment Applications Schema (UT-01)
-- Module Recruitment: applications, application_status_history
-- Cross-module references: job_id, user_id, cv_id, and actor_id are plain BIGINT scalars (no physical FK).
-- Intra-module reference: application_id references applications(id) with ON DELETE CASCADE.

CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    cv_id BIGINT NOT NULL,
    cv_snapshot_url VARCHAR(500) NOT NULL,
    cover_letter TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_applications_status
        CHECK (status IN ('SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_active_job_user
    ON applications (job_id, user_id)
    WHERE status IN ('SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER');

CREATE INDEX IF NOT EXISTS idx_applications_user_id_created_at
    ON applications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_user_id_status_created_at
    ON applications (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job_id_created_at
    ON applications (job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS application_status_history (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    actor_id BIGINT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_application_status_history_application
        FOREIGN KEY (application_id)
        REFERENCES applications (id)
        ON DELETE CASCADE,

    CONSTRAINT chk_application_status_history_from_status
        CHECK (from_status IS NULL OR from_status IN ('SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN')),

    CONSTRAINT chk_application_status_history_to_status
        CHECK (to_status IN ('SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'))
);

CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id_created_at
    ON application_status_history (application_id, created_at ASC);
