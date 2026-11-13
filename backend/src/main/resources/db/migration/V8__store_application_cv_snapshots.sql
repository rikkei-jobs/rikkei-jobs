CREATE TABLE IF NOT EXISTS application_cv_snapshots (
    application_id BIGINT PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_data BYTEA NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_application_cv_snapshots_pdf
        CHECK (content_type = 'application/pdf' AND file_size > 0)
);
