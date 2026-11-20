-- Migration V10: Create Interview Rounds Schema for Recruitment Module (UT-02)
-- Table: interview_rounds

CREATE TABLE IF NOT EXISTS interview_rounds (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    round_no INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    interviewer_email VARCHAR(150),
    scheduled_at TIMESTAMPTZ,
    result VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    score NUMERIC(5, 2),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_interview_rounds_result CHECK (
        result IN ('PENDING', 'PASS', 'FAIL')
    ),
    CONSTRAINT uk_interview_rounds_app_round UNIQUE (application_id, round_no)
);

CREATE INDEX IF NOT EXISTS idx_interview_rounds_app_id ON interview_rounds(application_id, round_no ASC);
