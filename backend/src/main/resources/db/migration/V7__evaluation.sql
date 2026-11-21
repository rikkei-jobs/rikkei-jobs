-- Migration V7: Evaluation Module Schema (DG-01)
-- Module Assessment: evaluation_templates, evaluation_criteria, evaluations, evaluation_scores
-- Dependencies: skills (table owned by assessment module)
-- Cross-module references: user_id and mentor_id are plain BIGINT scalars (no FK to users or candidate_profiles).

-- 1. Bảng evaluation_templates
CREATE TABLE IF NOT EXISTS evaluation_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    position VARCHAR(100) NOT NULL,
    context VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_evaluation_templates_context
        CHECK (context IN ('INTERNSHIP', 'INTERVIEW')),
    CONSTRAINT uq_evaluation_templates_name_context
        UNIQUE (name, context)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_templates_position
    ON evaluation_templates (position);
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_context
    ON evaluation_templates (context);
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_active
    ON evaluation_templates (active);

-- 2. Bảng evaluation_criteria
CREATE TABLE IF NOT EXISTS evaluation_criteria (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL,
    skill_id INT NOT NULL,
    description VARCHAR(500) NOT NULL,
    weight NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_evaluation_criteria_template
        FOREIGN KEY (template_id)
        REFERENCES evaluation_templates (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_criteria_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills (id),

    CONSTRAINT chk_evaluation_criteria_weight
        CHECK (weight >= 0.01 AND weight <= 100.00),

    CONSTRAINT uq_evaluation_criteria_template_skill
        UNIQUE (template_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_template_id
    ON evaluation_criteria (template_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_skill_id
    ON evaluation_criteria (skill_id);

-- 3. Bảng evaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    mentor_id BIGINT NOT NULL,
    context VARCHAR(20) NOT NULL,
    batch_id BIGINT,
    interview_round_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    overall_comment TEXT,
    submitted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_evaluations_template
        FOREIGN KEY (template_id)
        REFERENCES evaluation_templates (id),

    CONSTRAINT chk_evaluations_context
        CHECK (context IN ('INTERNSHIP', 'INTERVIEW')),

    CONSTRAINT chk_evaluations_status
        CHECK (status IN ('DRAFT', 'SUBMITTED'))
);

CREATE INDEX IF NOT EXISTS idx_evaluations_user_id
    ON evaluations (user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_mentor_id
    ON evaluations (mentor_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_mentor_status
    ON evaluations (mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_evaluations_template_id
    ON evaluations (template_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_status
    ON evaluations (status);
CREATE INDEX IF NOT EXISTS idx_evaluations_user_status
    ON evaluations (user_id, status);

-- 4. Bảng evaluation_scores
CREATE TABLE IF NOT EXISTS evaluation_scores (
    id BIGSERIAL PRIMARY KEY,
    evaluation_id BIGINT NOT NULL,
    criterion_id BIGINT NOT NULL,
    score INT,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_evaluation_scores_evaluation
        FOREIGN KEY (evaluation_id)
        REFERENCES evaluations (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_scores_criterion
        FOREIGN KEY (criterion_id)
        REFERENCES evaluation_criteria (id),

    CONSTRAINT uq_evaluation_scores_evaluation_criterion
        UNIQUE (evaluation_id, criterion_id),

    CONSTRAINT chk_evaluation_scores_score
        CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation_id
    ON evaluation_scores (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_criterion_id
    ON evaluation_scores (criterion_id);
