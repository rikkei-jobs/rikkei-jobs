-- Migration V9: Allow candidate to re-apply after withdrawing previous application
-- Restores partial unique index: 1 candidate can only have 1 active (open) application per job
DROP INDEX IF EXISTS idx_applications_job_user_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_active_unique
    ON applications(job_id, user_id)
    WHERE status IN ('SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER');
