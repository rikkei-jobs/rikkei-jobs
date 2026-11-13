-- Migration V5: Job catalogue and AI job recommendations (T023D8B)
-- Module Company & Job: companies, jobs, job_skills
-- Module Candidate    : candidate_skills (verified competency snapshot used by the matcher)
-- Module AI & Recommendation: job_recommendations (24h recommendation cache)
-- No cross-module foreign keys: company_id / user_id / skill_code are plain scalar references.

-- Module Company & Job: companies, jobs, job_skills
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    location VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company_id BIGINT,
    company_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    salary_range VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
    deadline TIMESTAMPTZ NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_skills (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    skill_code VARCHAR(50) NOT NULL,
    required_level INT NOT NULL,
    mandatory BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_deadline ON jobs(status, deadline);
CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_code ON job_skills(skill_code);

-- Module Candidate: candidate_skills
CREATE TABLE IF NOT EXISTS candidate_skills (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    skill_code VARCHAR(50) NOT NULL,
    score INT NOT NULL,
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_user_id ON candidate_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_code ON candidate_skills(skill_code);

-- Module AI & Recommendation: job_recommendations
CREATE TABLE IF NOT EXISTS job_recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    score INT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_recommendations_user_id ON job_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_job_recommendations_created_at ON job_recommendations(created_at);
