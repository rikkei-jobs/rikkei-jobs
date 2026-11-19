-- Migration V9: Company Profile Schema (DN-01)
-- Module Company: companies
-- Cross-module references: created_by is a plain BIGINT scalar (no physical FK to identity.users).
-- Idempotent DDL: safe to execute against an empty database or re-run against an existing schema.

-- 1. Table companies
CREATE TABLE IF NOT EXISTS companies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(13) NOT NULL,
    industry VARCHAR(100),
    size VARCHAR(20),
    address VARCHAR(500),
    city VARCHAR(100),
    website VARCHAR(500),
    logo_url VARCHAR(500),
    logo_public_id VARCHAR(255),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT uq_companies_tax_code
        UNIQUE (tax_code),

    CONSTRAINT chk_companies_tax_code_format
        CHECK (tax_code ~ '^[0-9]{10}$|^[0-9]{13}$'),

    CONSTRAINT chk_companies_size
        CHECK (size IS NULL OR size IN ('1-50', '51-200', '201-1000', '1000+')),

    CONSTRAINT chk_companies_status
        CHECK (status IN ('ACTIVE', 'LOCKED'))
);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_code VARCHAR(13);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS size VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_public_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_companies_tax_code'
    ) THEN
        ALTER TABLE companies ADD CONSTRAINT uq_companies_tax_code UNIQUE (tax_code);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_companies_tax_code_format'
    ) THEN
        ALTER TABLE companies
            ADD CONSTRAINT chk_companies_tax_code_format
            CHECK (tax_code ~ '^[0-9]{10}$|^[0-9]{13}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_companies_size'
    ) THEN
        ALTER TABLE companies
            ADD CONSTRAINT chk_companies_size
            CHECK (size IS NULL OR size IN ('1-50', '51-200', '201-1000', '1000+'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_companies_status'
    ) THEN
        ALTER TABLE companies
            ADD CONSTRAINT chk_companies_status
            CHECK (status IN ('ACTIVE', 'LOCKED'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_status
    ON companies (status);
CREATE INDEX IF NOT EXISTS idx_companies_created_by
    ON companies (created_by);
