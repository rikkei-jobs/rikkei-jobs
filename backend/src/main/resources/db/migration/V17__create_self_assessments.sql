-- Migration V17: Self Assessment
-- Module Assessment: self_assessments, self_assessment_scores
-- Cross-module reference: user_id is a plain BIGINT scalar.
-- Template reference: template_id references evaluation_templates(id).
-- Intra-module reference: assessment_id references self_assessments(id)
-- with ON DELETE CASCADE.

CREATE TABLE IF NOT EXISTS self_assessments
(
    id
    BIGSERIAL
    PRIMARY
    KEY,
    user_id
    BIGINT
    NOT
    NULL,
    template_id
    BIGINT
    NOT
    NULL,
    submitted_at
    TIMESTAMPTZ
    NOT
    NULL
    DEFAULT
    NOW
(
),
    CONSTRAINT fk_self_assessments_template
    FOREIGN KEY
(
    template_id
)
    REFERENCES evaluation_templates
(
    id
),
    CONSTRAINT uq_self_assessments_user_submitted
    UNIQUE
(
    user_id,
    submitted_at
)
    );

CREATE INDEX IF NOT EXISTS idx_self_assessments_user_id
    ON self_assessments (user_id);

CREATE INDEX IF NOT EXISTS idx_self_assessments_template_id
    ON self_assessments (template_id);

CREATE INDEX IF NOT EXISTS idx_self_assessments_user_submitted
    ON self_assessments (user_id, submitted_at DESC);


CREATE TABLE IF NOT EXISTS self_assessment_scores
(
    id
    BIGSERIAL
    PRIMARY
    KEY,
    assessment_id
    BIGINT
    NOT
    NULL,
    skill_id
    INTEGER
    NOT
    NULL,
    score
    INTEGER
    NOT
    NULL,
    note
    TEXT,

    CONSTRAINT
    fk_self_assessment_scores_assessment
    FOREIGN
    KEY
(
    assessment_id
)
    REFERENCES self_assessments
(
    id
)
    ON DELETE CASCADE,
    CONSTRAINT fk_self_assessment_scores_skill
    FOREIGN KEY
(
    skill_id
)
    REFERENCES skills
(
    id
),
    CONSTRAINT uq_self_assessment_scores_assessment_skill
    UNIQUE
(
    assessment_id,
    skill_id
),
    CONSTRAINT chk_self_assessment_scores_score
    CHECK
(
    score
    >=
    0
    AND
    score
    <=
    100
)
    );

CREATE INDEX IF NOT EXISTS idx_self_assessment_scores_assessment_id
    ON self_assessment_scores (assessment_id);

CREATE INDEX IF NOT EXISTS idx_self_assessment_scores_skill_id
    ON self_assessment_scores (skill_id);
