-- Migration V23: Create Interview Rounds Schema and Staff List Indexes (UT-02)
-- Module Recruitment: interview_rounds and staff/HR filtering-pagination composite indexes on applications.
-- Intra-module reference: application_id references applications(id) with ON DELETE CASCADE.

CREATE TABLE IF NOT EXISTS interview_rounds (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL,
    round_no INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    interviewer_email VARCHAR(150) NOT NULL,
    scheduled_at TIMESTAMPTZ,
    result VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    score NUMERIC(5, 2),
    note TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_interview_rounds_application
        FOREIGN KEY (application_id)
        REFERENCES applications (id)
        ON DELETE CASCADE,

    CONSTRAINT uq_interview_rounds_app_round
        UNIQUE (application_id, round_no),

    CONSTRAINT chk_interview_rounds_round_no
        CHECK (round_no >= 1),

    CONSTRAINT chk_interview_rounds_result
        CHECK (result IN ('PENDING', 'PASS', 'FAIL')),

    CONSTRAINT chk_interview_rounds_score
        CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_interview_rounds_application_id
    ON interview_rounds (application_id, round_no ASC);

CREATE INDEX IF NOT EXISTS idx_applications_created_at_id
    ON applications (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_applications_status_created_at_id
    ON applications (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_applications_job_id_status_created_at_id
    ON applications (job_id, status, created_at DESC, id DESC);
