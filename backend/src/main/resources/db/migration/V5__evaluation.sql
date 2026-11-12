-- Migration V5: Evaluation
--
-- Module Assessment:
--   evaluation_templates
--   evaluation_criteria
--   evaluations
--   evaluation_scores
--
-- Dependencies:
--   users
--   skills
--
-- Enum:
--   EvaluationContext: INTERNSHIP, INTERVIEW
--   EvaluationStatus : DRAFT, SUBMITTED

-- 1. Evaluation templates
-- Stores evaluation templates for internship and interview contexts.

CREATE TABLE IF NOT EXISTS evaluation_templates (
                                                    id BIGSERIAL PRIMARY KEY,
                                                    name VARCHAR(150) NOT NULL,
    position VARCHAR(100) NOT NULL,
    context VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_evaluation_templates_context
    CHECK (context IN ('INTERNSHIP', 'INTERVIEW'))
    );


-- 2. Evaluation criteria
-- Each template contains multiple evaluation criteria.
-- Each criterion is associated with a skill.

CREATE TABLE IF NOT EXISTS evaluation_criteria (
                                                   id BIGSERIAL PRIMARY KEY,
                                                   template_id BIGINT NOT NULL,
                                                   skill_id BIGINT NOT NULL,
                                                   description VARCHAR(500) NOT NULL,
    weight NUMERIC(5, 2) NOT NULL,

    CONSTRAINT fk_evaluation_criteria_template
    FOREIGN KEY (template_id)
    REFERENCES evaluation_templates (id),

    CONSTRAINT fk_evaluation_criteria_skill
    FOREIGN KEY (skill_id)
    REFERENCES skills (id),

    CONSTRAINT chk_evaluation_criteria_weight
    CHECK (weight >= 0.01 AND weight <= 100.00)
    );

CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_template_id
    ON evaluation_criteria (template_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_skill_id
    ON evaluation_criteria (skill_id);


-- 3. Evaluations
-- Stores evaluation forms assigned to candidates by mentors.

CREATE TABLE IF NOT EXISTS evaluations (
                                           id BIGSERIAL PRIMARY KEY,
                                           template_id BIGINT NOT NULL,
                                           user_id BIGINT NOT NULL,
                                           mentor_id BIGINT NOT NULL,
                                           context VARCHAR(20) NOT NULL,
    batch_id BIGINT,
    interview_round_id BIGINT,
    status VARCHAR(20) NOT NULL,
    overall_comment TEXT,
    submitted_at TIMESTAMP,

    CONSTRAINT fk_evaluations_template
    FOREIGN KEY (template_id)
    REFERENCES evaluation_templates (id),

    CONSTRAINT fk_evaluations_user
    FOREIGN KEY (user_id)
    REFERENCES users (id),

    CONSTRAINT fk_evaluations_mentor
    FOREIGN KEY (mentor_id)
    REFERENCES users (id),

    CONSTRAINT chk_evaluations_context
    CHECK (context IN ('INTERNSHIP', 'INTERVIEW')),

    CONSTRAINT chk_evaluations_status
    CHECK (status IN ('DRAFT', 'SUBMITTED'))
    );

CREATE INDEX IF NOT EXISTS idx_evaluations_user_id
    ON evaluations (user_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_mentor_id
    ON evaluations (mentor_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_template_id
    ON evaluations (template_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_status
    ON evaluations (status);


-- 4. Evaluation scores
-- Stores scores and comments for each criterion in an evaluation.
-- Each criterion can only be scored once per evaluation.

CREATE TABLE IF NOT EXISTS evaluation_scores (
                                                 id BIGSERIAL PRIMARY KEY,
                                                 evaluation_id BIGINT NOT NULL,
                                                 criterion_id BIGINT NOT NULL,
                                                 score INTEGER,
                                                 comment TEXT,

                                                 CONSTRAINT fk_evaluation_scores_evaluation
                                                 FOREIGN KEY (evaluation_id)
    REFERENCES evaluations (id)
    ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_scores_criterion
    FOREIGN KEY (criterion_id)
    REFERENCES evaluation_criteria (id),

    CONSTRAINT uk_evaluation_criterion
    UNIQUE (evaluation_id, criterion_id),

    CONSTRAINT chk_evaluation_scores_score
    CHECK (score IS NULL OR (score >= 0 AND score <= 100))
    );

CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation_id
    ON evaluation_scores (evaluation_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_scores_criterion_id
    ON evaluation_scores (criterion_id);
