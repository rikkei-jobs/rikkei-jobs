CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    hr_owner_user_id BIGINT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_descriptions (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(180) NOT NULL,
    employment_type VARCHAR(40) NOT NULL,
    salary_range VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
    deadline TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_job_descriptions_status CHECK (
        status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CLOSED', 'EXPIRED')
    )
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_company_id
    ON job_descriptions(company_id);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_status_deadline
    ON job_descriptions(status, deadline);
