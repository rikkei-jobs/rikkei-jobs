-- Migration V19: Create Immutable Application CV Snapshots Schema (UT-01)
-- Module Recruitment: application_cv_snapshots
-- Intra-module reference: application_id references applications(id) with ON DELETE CASCADE.

CREATE TABLE IF NOT EXISTS application_cv_snapshots (
    application_id BIGINT PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_data BYTEA NOT NULL,
    file_size BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_application_cv_snapshots_application
        FOREIGN KEY (application_id)
        REFERENCES applications (id)
        ON DELETE CASCADE,

    CONSTRAINT chk_application_cv_snapshots_content_type
        CHECK (content_type = 'application/pdf'),

    CONSTRAINT chk_application_cv_snapshots_file_size
        CHECK (file_size > 0 AND file_size <= 5242880),

    CONSTRAINT chk_application_cv_snapshots_sha256
        CHECK (sha256 ~ '^[0-9a-f]{64}$'),

    CONSTRAINT chk_application_cv_snapshots_file_data_length
        CHECK (octet_length(file_data) = file_size)
);
