-- Migration V15: Internship and internship tasks (TT-01)
-- Module Internship: internships, internship_tasks
-- Cross-module reference: user_id is a plain BIGINT scalar (no physical FK to identity.users).
-- Intra-module reference: internship_id references internships(id) with ON DELETE CASCADE.

CREATE TABLE IF NOT EXISTS internships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    batch_id VARCHAR(255) NOT NULL,
    batch_name VARCHAR(255),
    group_name VARCHAR(255),
    topic_name VARCHAR(255),
    mentor_email VARCHAR(255),
    start_date DATE,
    end_date DATE,
    final_score NUMERIC(5, 2),
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_internships_user_batch UNIQUE (user_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_internships_user_id ON internships (user_id);

CREATE TABLE IF NOT EXISTS internship_tasks (
    id BIGSERIAL PRIMARY KEY,
    internship_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    accepted_score NUMERIC(5, 2),
    accepted_at TIMESTAMPTZ,

    CONSTRAINT fk_internship_tasks_internship FOREIGN KEY (internship_id) REFERENCES internships (id) ON DELETE CASCADE,
    CONSTRAINT uq_internship_tasks_internship_title UNIQUE (internship_id, title)
);

CREATE INDEX IF NOT EXISTS idx_internship_tasks_internship_id ON internship_tasks (internship_id);
