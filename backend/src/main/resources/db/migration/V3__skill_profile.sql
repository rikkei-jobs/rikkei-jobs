-- Migration V3: Skill Profile (HS-01)
-- Module Assessment : skills (adds skill_group)
-- Module Candidate  : candidate_profiles, external_records, skill_mappings,
--                     skill_evidences, skill_scores
-- No cross-module foreign keys: user_id / skill_id are plain scalar references.

-- 1. Skill group for the Skill Profile screen (assessment module)
ALTER TABLE skills ADD COLUMN IF NOT EXISTS skill_group VARCHAR(50) NOT NULL DEFAULT 'GENERAL';

CREATE INDEX IF NOT EXISTS idx_skills_skill_group ON skills (skill_group);

-- 2. Candidate profile visibility. A profile is private until is_public = TRUE.
CREATE TABLE IF NOT EXISTS candidate_profiles (
    user_id BIGINT PRIMARY KEY,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Normalized results pulled from external systems (LMS, Exam, PM).
-- NT-05 is the long-term producer; score is normalized to the 0-100 scale.
CREATE TABLE IF NOT EXISTS external_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    source VARCHAR(10) NOT NULL CHECK (source IN ('LMS', 'EXAM', 'PM')),
    source_code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    score NUMERIC(5, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_external_records_natural UNIQUE (user_id, source, source_code, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_external_records_user_id ON external_records (user_id);

-- 4. Mapping of an external source code (e.g. LMS subject JAVA01) to skills with a weight.
-- Mapping lives in data, never hard-coded in application code.
CREATE TABLE IF NOT EXISTS skill_mappings (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(10) NOT NULL CHECK (source IN ('LMS', 'EXAM', 'PM')),
    source_code VARCHAR(100) NOT NULL,
    skill_id INT NOT NULL,
    weight NUMERIC(4, 3) NOT NULL CHECK (weight > 0 AND weight <= 1),
    CONSTRAINT uq_skill_mappings_source_skill UNIQUE (source, source_code, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_mappings_source_code ON skill_mappings (source, source_code);

-- 5. Evidence rows. weight is copied from the mapping that produced the evidence (1 otherwise).
CREATE TABLE IF NOT EXISTS skill_evidences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    skill_id INT NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('LMS', 'EXAM', 'INTERNSHIP', 'MENTOR', 'SELF')),
    source_ref VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    score NUMERIC(5, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
    weight NUMERIC(4, 3) NOT NULL DEFAULT 1 CHECK (weight > 0 AND weight <= 1),
    recorded_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_evidences_user_skill ON skill_evidences (user_id, skill_id);

-- 6. Aggregated score per candidate and skill.
CREATE TABLE IF NOT EXISTS skill_scores (
    user_id BIGINT NOT NULL,
    skill_id INT NOT NULL,
    verified_score NUMERIC(5, 2) CHECK (verified_score BETWEEN 0 AND 100),
    self_score NUMERIC(5, 2) CHECK (self_score BETWEEN 0 AND 100),
    level VARCHAR(20),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, skill_id)
);
