DROP INDEX IF EXISTS idx_applications_active_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_job_user_unique
    ON applications(job_id, user_id);
