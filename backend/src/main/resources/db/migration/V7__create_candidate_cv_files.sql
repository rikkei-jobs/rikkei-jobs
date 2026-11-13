CREATE TABLE IF NOT EXISTS candidate_cvs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(120) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_data BYTEA NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_candidate_cvs_pdf_content_type
        CHECK (content_type = 'application/pdf'),
    CONSTRAINT chk_candidate_cvs_file_size
        CHECK (file_size > 0 AND file_size <= 5242880)
);

CREATE INDEX IF NOT EXISTS idx_candidate_cvs_user_id
    ON candidate_cvs(user_id);
