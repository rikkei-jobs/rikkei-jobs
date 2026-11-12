-- Migration V1: Initial Schema for Rikkei Jobs
-- Module Identity: roles, users
-- Module Assessment: skills

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    lms_user_id VARCHAR(50) UNIQUE,
    role_id INT NOT NULL REFERENCES roles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_vi VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    level_bands JSONB,
    scale VARCHAR(50),
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_lms_user_id ON users(lms_user_id);
CREATE INDEX IF NOT EXISTS idx_skills_code ON skills(code);

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
