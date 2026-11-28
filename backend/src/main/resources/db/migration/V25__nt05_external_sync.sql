-- Migration V25: NT-05 external sync schema evolution, manual_overrides, sync_runs, and H1 uniqueness safety net
-- Module Candidate: external_records (evolved), skill_evidences (external_record_id + partial unique index),
--                   manual_overrides, sync_runs.
-- Zero external_records rows are deleted; zero cross-module physical foreign keys.

-- 1. Evolve external_records (preserve all historical rows; deterministic #h<id> suffix for older duplicates)
ALTER TABLE external_records
    ADD COLUMN IF NOT EXISTS source_key VARCHAR(160),
    ADD COLUMN IF NOT EXISTS payload JSONB,
    ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

WITH ranked_records AS (
    SELECT
        id,
        user_id,
        source_code,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, source, source_code
            ORDER BY recorded_at DESC, id DESC
        ) AS rn
    FROM external_records
)

UPDATE external_records AS er
SET
    source_key = COALESCE(
        er.source_key,
        CASE
            WHEN rr.rn = 1 THEN rr.user_id::TEXT || ':' || rr.source_code
            ELSE rr.user_id::TEXT || ':' || rr.source_code || '#h' || rr.id::TEXT
        END
    ),
    payload = COALESCE(
        er.payload,
        CASE er.source
            WHEN 'LMS' THEN jsonb_build_object(
                'subjectCode', er.source_code,
                'subjectName', er.title,
                'score', ROUND(er.score / 10.0, 2)
            )
            WHEN 'EXAM' THEN jsonb_build_object(
                'examCode', er.source_code,
                'score', ROUND(er.score / 10.0, 2),
                'takenAt', er.recorded_at
            )
            ELSE jsonb_build_object(
                'batchId', er.source_code,
                'topicName', er.title,
                'finalScore', ROUND(er.score / 10.0, 2)
            )
        END
    ),
    synced_at = COALESCE(er.synced_at, er.created_at, NOW())
FROM ranked_records AS rr
WHERE er.id = rr.id
  AND (er.source_key IS NULL OR er.payload IS NULL OR er.synced_at IS NULL);

ALTER TABLE external_records
    ALTER COLUMN source_key SET NOT NULL,
    ALTER COLUMN payload SET NOT NULL,
    ALTER COLUMN synced_at SET NOT NULL,
    ALTER COLUMN synced_at SET DEFAULT NOW();

ALTER TABLE external_records
    DROP CONSTRAINT IF EXISTS uq_external_records_natural;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_external_records_source_key'
          AND conrelid = 'external_records'::regclass
    ) THEN
        ALTER TABLE external_records
            ADD CONSTRAINT uq_external_records_source_key UNIQUE (source, source_key);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_external_records_user_source_code
    ON external_records (user_id, source, source_code);

-- 2. Evolve skill_evidences: link external_record_id, deduplicate legacy external-derived verified rows,
--    and enforce partial unique index without constraining MENTOR or SELF evidences.
ALTER TABLE skill_evidences
    ADD COLUMN IF NOT EXISTS external_record_id BIGINT REFERENCES external_records (id) ON DELETE SET NULL;

UPDATE skill_evidences AS se
SET external_record_id = matched.record_id
FROM (
    SELECT
        se_inner.id AS evidence_id,
        (
            SELECT er.id
            FROM external_records AS er
            WHERE er.user_id = se_inner.user_id
              AND er.source = CASE se_inner.source WHEN 'INTERNSHIP' THEN 'PM' ELSE se_inner.source END
              AND er.source_code = se_inner.source_ref
            ORDER BY
                (er.recorded_at = se_inner.recorded_at) DESC,
                (er.score = se_inner.score) DESC,
                (er.title = se_inner.title) DESC,
                er.id DESC
            LIMIT 1
        ) AS record_id
    FROM skill_evidences AS se_inner
    WHERE se_inner.verified = TRUE
      AND se_inner.source IN ('LMS', 'EXAM', 'INTERNSHIP')
      AND se_inner.external_record_id IS NULL
) AS matched
WHERE se.id = matched.evidence_id
  AND matched.record_id IS NOT NULL;

DELETE FROM skill_evidences AS se
USING (
    SELECT ranked_linked.id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY external_record_id, skill_id
                ORDER BY id ASC
            ) AS rn
        FROM skill_evidences
        WHERE verified = TRUE
          AND source IN ('LMS', 'EXAM', 'INTERNSHIP')
          AND external_record_id IS NOT NULL
    ) AS ranked_linked
    WHERE ranked_linked.rn > 1
) AS dup_linked
WHERE se.id = dup_linked.id;

DELETE FROM skill_evidences AS se
USING (
    SELECT ranked_unlinked.id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY user_id, skill_id, source, COALESCE(source_ref, ''), title, score, recorded_at
                ORDER BY id ASC
            ) AS rn
        FROM skill_evidences
        WHERE verified = TRUE
          AND source IN ('LMS', 'EXAM', 'INTERNSHIP')
          AND external_record_id IS NULL
    ) AS ranked_unlinked
    WHERE ranked_unlinked.rn > 1
) AS dup_unlinked
WHERE se.id = dup_unlinked.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_evidences_external_record_skill
    ON skill_evidences (external_record_id, skill_id)
    WHERE external_record_id IS NOT NULL;

-- 3. Append-only audit table for staff manual overrides (candidate module)
CREATE TABLE IF NOT EXISTS manual_overrides (
    id BIGSERIAL PRIMARY KEY,
    record_id BIGINT NOT NULL REFERENCES external_records (id),
    field VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    staff_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_overrides_record_id_created_at
    ON manual_overrides (record_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_manual_overrides_staff_id
    ON manual_overrides (staff_id);

-- 4. Sync execution log table (candidate module)
CREATE TABLE IF NOT EXISTS sync_runs (
    id BIGSERIAL PRIMARY KEY,
    trigger VARCHAR(20) NOT NULL CHECK (trigger IN ('NIGHTLY', 'ON_OPEN', 'MANUAL')),
    user_id BIGINT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,
    error VARCHAR(500),
    counts JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at_id
    ON sync_runs (started_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_user_id_started_at
    ON sync_runs (user_id, started_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_status_started_at
    ON sync_runs (status, started_at DESC, id DESC);
