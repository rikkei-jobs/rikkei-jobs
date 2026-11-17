-- Migration V11: Target positions and skill gap analysis (DT-01)
-- Module Candidate: target_positions, position_skills, candidate_targets, gap_results
-- No cross-module foreign keys: user_id / skill_id / position_id / job_id are plain scalar references.
-- gap_results stores only deficits (gap > 0); satisfied skills are intentionally not persisted.

CREATE TABLE IF NOT EXISTS target_positions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS position_skills (
    id BIGSERIAL PRIMARY KEY,
    position_id BIGINT NOT NULL,
    skill_id INT NOT NULL,
    min_score INT NOT NULL CHECK (min_score BETWEEN 0 AND 100),
    CONSTRAINT uq_position_skills_position_skill UNIQUE (position_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_position_skills_position_id ON position_skills (position_id);

CREATE TABLE IF NOT EXISTS candidate_targets (
    user_id BIGINT PRIMARY KEY,
    position_id BIGINT,
    job_id BIGINT,
    chosen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_candidate_targets_single_target CHECK (
        (position_id IS NOT NULL AND job_id IS NULL)
        OR (position_id IS NULL AND job_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS gap_results (
    user_id BIGINT NOT NULL,
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('POSITION', 'JOB')),
    target_id BIGINT NOT NULL,
    skill_id INT NOT NULL,
    required NUMERIC(5, 2) NOT NULL CHECK (required BETWEEN 0 AND 100),
    current NUMERIC(5, 2) NOT NULL CHECK (current BETWEEN 0 AND 100),
    gap NUMERIC(5, 2) NOT NULL CHECK (gap > 0),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, target_type, target_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_gap_results_user_target
    ON gap_results (user_id, target_type, target_id);
