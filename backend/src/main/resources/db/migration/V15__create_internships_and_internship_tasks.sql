
-- Migration V15: Internship and internship tasks
-- Module Internship
-- Stores internship information synchronized from PM.
-- user_id references identity.users logically (no cross-module FK).
-- internship_id references internships within the same module.

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
    synced_at TIMESTAMP WITHOUT TIME ZONE,

    CONSTRAINT uq_internships_user_batch
    UNIQUE (user_id, batch_id)
    );

CREATE INDEX IF NOT EXISTS idx_internships_user_id
    ON internships (user_id);

CREATE TABLE IF NOT EXISTS internship_tasks (
                                                id BIGSERIAL PRIMARY KEY,
                                                internship_id BIGINT NOT NULL,
                                                title VARCHAR(255) NOT NULL,
    accepted_score NUMERIC(5, 2),
    accepted_at TIMESTAMP WITH TIME ZONE,

                              CONSTRAINT fk_internship_tasks_internship
                              FOREIGN KEY (internship_id)
    REFERENCES internships (id)
                          ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_internship_tasks_internship_id
    ON internship_tasks (internship_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_internship_tasks_internship_title
    ON internship_tasks (internship_id, title);
