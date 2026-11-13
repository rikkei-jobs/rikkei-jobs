-- Migration V8: Dev seed for Evaluation module
-- Only loaded in the 'dev' profile.
--
-- Dependencies:
--   users
--   skills
--   evaluation_templates
--   evaluation_criteria
--   evaluations
--   evaluation_scores
--
-- Mentor:
--   User ID 6 - Pham Quoc Dung
--
-- Sample data:
--   1. Nguyen Van An - Java Backend Internship - SUBMITTED
--   2. Tran Thi Binh - General Technical Interview - SUBMITTED
--   3. Le Minh Chau - Java Backend Internship - DRAFT
-- =====================================================


-- =====================================================
-- 1. INSERT EVALUATION TEMPLATES
-- =====================================================

-- Template 1: Java Backend Internship
INSERT INTO evaluation_templates (
    name,
    position,
    context,
    active
)
SELECT
    'Java Backend – Thực tập',
    'Java Backend',
    'INTERNSHIP',
    TRUE
    WHERE NOT EXISTS (
    SELECT 1
    FROM evaluation_templates
    WHERE name = 'Java Backend – Thực tập'
      AND context = 'INTERNSHIP'
);


-- Template 2: General Technical Interview
INSERT INTO evaluation_templates (
    name,
    position,
    context,
    active
)
SELECT
    'Phỏng vấn kỹ thuật chung',
    'Software Developer',
    'INTERVIEW',
    TRUE
    WHERE NOT EXISTS (
    SELECT 1
    FROM evaluation_templates
    WHERE name = 'Phỏng vấn kỹ thuật chung'
      AND context = 'INTERVIEW'
);


-- =====================================================
-- 2. INSERT EVALUATION CRITERIA
-- =====================================================

-- Java Backend Internship
-- JAVA         : 30%
-- SPRING_BOOT  : 25%
-- SQL          : 20%
-- GIT          : 10%
-- TEAMWORK     : 15%

INSERT INTO evaluation_criteria (
    template_id,
    skill_id,
    description,
    weight
)
SELECT
    t.id,
    s.id,
    c.description,
    c.weight
FROM evaluation_templates t
         CROSS JOIN (
    VALUES
        (
            'JAVA',
            'Đánh giá kiến thức Java Core, OOP và Collections.',
            30.00
        ),
        (
            'SPRING_BOOT',
            'Đánh giá khả năng sử dụng Spring Boot, Dependency Injection và xây dựng REST API.',
            25.00
        ),
        (
            'SQL',
            'Đánh giá kiến thức cơ sở dữ liệu, thiết kế bảng và truy vấn SQL.',
            20.00
        ),
        (
            'GIT',
            'Đánh giá khả năng sử dụng Git, quản lý branch và xử lý merge.',
            10.00
        ),
        (
            'TEAMWORK',
            'Đánh giá khả năng làm việc nhóm và phối hợp với các thành viên.',
            15.00
        )
) AS c(skill_code, description, weight)
         JOIN skills s ON s.code = c.skill_code
WHERE t.name = 'Java Backend – Thực tập'
  AND t.context = 'INTERNSHIP'
  AND NOT EXISTS (
    SELECT 1
    FROM evaluation_criteria ec
    WHERE ec.template_id = t.id
      AND ec.skill_id = s.id
);


-- General Technical Interview
-- OOP      : 20%
-- DSA      : 25%
-- SQL      : 15%
-- REST_API : 20%
-- JAVA     : 20%

INSERT INTO evaluation_criteria (
    template_id,
    skill_id,
    description,
    weight
)
SELECT
    t.id,
    s.id,
    c.description,
    c.weight
FROM evaluation_templates t
         CROSS JOIN (
    VALUES
        (
            'OOP',
            'Đánh giá khả năng hiểu và áp dụng các nguyên lý lập trình hướng đối tượng.',
            20.00
        ),
        (
            'DSA',
            'Đánh giá kiến thức cấu trúc dữ liệu và giải thuật.',
            25.00
        ),
        (
            'SQL',
            'Đánh giá khả năng truy vấn, JOIN và xử lý dữ liệu SQL.',
            15.00
        ),
        (
            'REST_API',
            'Đánh giá kiến thức thiết kế RESTful API, HTTP methods và tích hợp API.',
            20.00
        ),
        (
            'JAVA',
            'Đánh giá kiến thức Java Core và khả năng áp dụng vào thực tế.',
            20.00
        )
) AS c(skill_code, description, weight)
         JOIN skills s ON s.code = c.skill_code
WHERE t.name = 'Phỏng vấn kỹ thuật chung'
  AND t.context = 'INTERVIEW'
  AND NOT EXISTS (
    SELECT 1
    FROM evaluation_criteria ec
    WHERE ec.template_id = t.id
      AND ec.skill_id = s.id
);


-- =====================================================
-- 3. INSERT SAMPLE EVALUATIONS
-- =====================================================

-- Candidate 1: Nguyen Van An
INSERT INTO evaluations (
    template_id,
    user_id,
    mentor_id,
    context,
    batch_id,
    interview_round_id,
    status,
    overall_comment,
    submitted_at
)
SELECT
    t.id,
    1,
    6,
    'INTERNSHIP',
    1,
    NULL,
    'SUBMITTED',
    'Ứng viên có nền tảng Java và Spring Boot tốt. Có khả năng xây dựng REST API và sử dụng SQL. Cần cải thiện thêm kỹ năng làm việc nhóm.',
    LOCALTIMESTAMP - INTERVAL '5 days'
FROM evaluation_templates t
WHERE t.name = 'Java Backend – Thực tập'
  AND t.context = 'INTERNSHIP'
  AND NOT EXISTS (
    SELECT 1
    FROM evaluations e
    WHERE e.template_id = t.id
  AND e.user_id = 1
  AND e.mentor_id = 6
  AND e.context = 'INTERNSHIP'
  AND e.batch_id = 1
  AND e.interview_round_id IS NULL
    )
ORDER BY t.id
    LIMIT 1;


-- Candidate 2: Tran Thi Binh
INSERT INTO evaluations (
    template_id,
    user_id,
    mentor_id,
    context,
    batch_id,
    interview_round_id,
    status,
    overall_comment,
    submitted_at
)
SELECT
    t.id,
    2,
    6,
    'INTERVIEW',
    NULL,
    1,
    'SUBMITTED',
    'Ứng viên có kiến thức Frontend tốt, tư duy giải quyết vấn đề khá. Cần củng cố thêm kiến thức Java và cấu trúc dữ liệu.',
    LOCALTIMESTAMP - INTERVAL '2 days'
FROM evaluation_templates t
WHERE t.name = 'Phỏng vấn kỹ thuật chung'
  AND t.context = 'INTERVIEW'
  AND NOT EXISTS (
    SELECT 1
    FROM evaluations e
    WHERE e.template_id = t.id
  AND e.user_id = 2
  AND e.mentor_id = 6
  AND e.context = 'INTERVIEW'
  AND e.batch_id IS NULL
  AND e.interview_round_id = 1
    )
ORDER BY t.id
    LIMIT 1;


-- Candidate 3: Le Minh Chau
INSERT INTO evaluations (
    template_id,
    user_id,
    mentor_id,
    context,
    batch_id,
    interview_round_id,
    status,
    overall_comment,
    submitted_at
)
SELECT
    t.id,
    3,
    6,
    'INTERNSHIP',
    1,
    NULL,
    'DRAFT',
    'Đang trong quá trình đánh giá. Cần bổ sung nhận xét và hoàn thiện điểm các tiêu chí.',
    NULL
FROM evaluation_templates t
WHERE t.name = 'Java Backend – Thực tập'
  AND t.context = 'INTERNSHIP'
  AND NOT EXISTS (
    SELECT 1
    FROM evaluations e
    WHERE e.template_id = t.id
      AND e.user_id = 3
      AND e.mentor_id = 6
      AND e.context = 'INTERNSHIP'
      AND e.batch_id = 1
      AND e.interview_round_id IS NULL
)
ORDER BY t.id
    LIMIT 1;


-- =====================================================
-- 4. INSERT EVALUATION SCORES
-- =====================================================

-- Candidate 1: Nguyen Van An
-- Java Backend Internship

-- JAVA: 90
INSERT INTO evaluation_scores (
    evaluation_id,
    criterion_id,
    score,
    comment
)
SELECT
    e.id,
    ec.id,
    90,
    'Nắm vững Java Core, OOP và Collections. Khả năng xử lý bài toán tốt.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 1
  AND e.mentor_id = 6
  AND t.name = 'Java Backend – Thực tập'
  AND e.context = 'INTERNSHIP'
  AND e.batch_id = 1
  AND s.code = 'JAVA'
  AND NOT EXISTS (
    SELECT 1
    FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- SPRING_BOOT: 85
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 85,
    'Sử dụng tốt Spring Boot, Dependency Injection và xây dựng REST API.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 1
  AND e.mentor_id = 6
  AND t.name = 'Java Backend – Thực tập'
  AND e.context = 'INTERNSHIP'
  AND e.batch_id = 1
  AND s.code = 'SPRING_BOOT'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- SQL: 80
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 80,
    'Biết thiết kế bảng, JOIN và viết các truy vấn SQL cơ bản.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 1
  AND e.mentor_id = 6
  AND t.name = 'Java Backend – Thực tập'
  AND e.context = 'INTERNSHIP'
  AND e.batch_id = 1
  AND s.code = 'SQL'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- GIT: 80
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 80,
    'Sử dụng Git thành thạo, biết tạo branch và xử lý merge.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 1
  AND e.mentor_id = 6
  AND t.name = 'Java Backend – Thực tập'
  AND e.context = 'INTERNSHIP'
  AND e.batch_id = 1
  AND s.code = 'GIT'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- TEAMWORK: 75
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 75,
    'Có khả năng phối hợp nhóm và tiếp nhận phản hồi.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 1
  AND e.mentor_id = 6
  AND t.name = 'Java Backend – Thực tập'
  AND e.context = 'INTERNSHIP'
  AND e.batch_id = 1
  AND s.code = 'TEAMWORK'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- Candidate 2: Tran Thi Binh
-- General Technical Interview

-- OOP: 80
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 80,
    'Hiểu các nguyên lý OOP và biết áp dụng trong lập trình.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 2
  AND e.mentor_id = 6
  AND t.name = 'Phỏng vấn kỹ thuật chung'
  AND e.context = 'INTERVIEW'
  AND e.interview_round_id = 1
  AND s.code = 'OOP'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- DSA: 70
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 70,
    'Nắm được cấu trúc dữ liệu cơ bản, cần cải thiện phân tích độ phức tạp.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 2
  AND e.mentor_id = 6
  AND t.name = 'Phỏng vấn kỹ thuật chung'
  AND e.context = 'INTERVIEW'
  AND e.interview_round_id = 1
  AND s.code = 'DSA'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- SQL: 75
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 75,
    'Hiểu truy vấn SQL và các phép JOIN.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 2
  AND e.mentor_id = 6
  AND t.name = 'Phỏng vấn kỹ thuật chung'
  AND e.context = 'INTERVIEW'
  AND e.interview_round_id = 1
  AND s.code = 'SQL'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- REST_API: 85
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 85,
    'Hiểu RESTful API, HTTP methods và cách tích hợp API.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 2
  AND e.mentor_id = 6
  AND t.name = 'Phỏng vấn kỹ thuật chung'
  AND e.context = 'INTERVIEW'
  AND e.interview_round_id = 1
  AND s.code = 'REST_API'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- JAVA: 65
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 65,
    'Kiến thức Java Core ở mức cơ bản, cần luyện tập thêm.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 2
  AND e.mentor_id = 6
  AND t.name = 'Phỏng vấn kỹ thuật chung'
  AND e.context = 'INTERVIEW'
  AND e.interview_round_id = 1
  AND s.code = 'JAVA'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- Candidate 3: Le Minh Chau
-- Java Backend Internship (DRAFT)

-- JAVA: 55
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 55,
    'Đã nắm được cú pháp Java cơ bản, cần luyện tập OOP.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 3
  AND e.mentor_id = 6
  AND t.name = 'Java Backend – Thực tập'
  AND e.context = 'INTERNSHIP'
  AND e.batch_id = 1
  AND s.code = 'JAVA'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- SPRING_BOOT: 45
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT
    e.id, ec.id, 45,
    'Mới làm quen Spring Boot, cần thực hành xây dựng API.'
FROM evaluations e
         JOIN evaluation_templates t ON t.id = e.template_id
         JOIN evaluation_criteria ec ON ec.template_id = t.id
         JOIN skills s ON s.id = ec.skill_id
WHERE e.user_id = 3
  AND e.mentor_id = 6
  AND t.name = 'Java Backend – Thực tập'
  AND e.context = 'INTERNSHIP'
  AND e.batch_id = 1
  AND s.code = 'SPRING_BOOT'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
      AND es.criterion_id = ec.id
);


-- The remaining three criteria are intentionally left unscored.
-- They can be filled in later when the mentor completes the draft evaluation.
