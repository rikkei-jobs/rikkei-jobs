
-- Migration V10: Dev seed for Evaluation module
-- Only loaded in the dev profile.

-- =====================================================
-- 1. INSERT EVALUATION TEMPLATES
-- =====================================================

INSERT INTO evaluation_templates (name, position, context, active)
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

INSERT INTO evaluation_templates (name, position, context, active)
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
        ('JAVA', 'Đánh giá kiến thức Java Core, OOP và Collections.', 30.00),
        ('SPRING_BOOT', 'Đánh giá khả năng sử dụng Spring Boot, Dependency Injection và xây dựng REST API.', 25.00),
        ('SQL', 'Đánh giá kiến thức cơ sở dữ liệu, thiết kế bảng và truy vấn SQL.', 20.00),
        ('GIT', 'Đánh giá khả năng sử dụng Git, quản lý branch và xử lý merge.', 10.00),
        ('TEAMWORK', 'Đánh giá khả năng làm việc nhóm và phối hợp với các thành viên.', 15.00)
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
        ('OOP', 'Đánh giá khả năng hiểu và áp dụng các nguyên lý lập trình hướng đối tượng.', 20.00),
        ('DSA', 'Đánh giá kiến thức cấu trúc dữ liệu và giải thuật.', 25.00),
        ('SQL', 'Đánh giá khả năng truy vấn, JOIN và xử lý dữ liệu SQL.', 15.00),
        ('REST_API', 'Đánh giá kiến thức thiết kế RESTful API, HTTP methods và tích hợp API.', 20.00),
        ('JAVA', 'Đánh giá kiến thức Java Core và khả năng áp dụng vào thực tế.', 20.00)
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
-- Java Backend Internship - SUBMITTED

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
    'IOC-JB-2026-09',
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
  AND e.batch_id = 'IOC-JB-2026-09'
  AND e.interview_round_id IS NULL
    )
ORDER BY t.id
    LIMIT 1;


-- Candidate 2: Tran Thi Binh
-- General Technical Interview - SUBMITTED

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
-- Java Backend Internship - DRAFT

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
    'IOC-JB-2026-09',
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
      AND e.batch_id = 'IOC-JB-2026-09'
      AND e.interview_round_id IS NULL
)
ORDER BY t.id
    LIMIT 1;


-- =====================================================
-- 4. INSERT EVALUATION SCORES
-- =====================================================

INSERT INTO evaluation_scores (
    evaluation_id,
    criterion_id,
    score,
    comment
)
SELECT
    e.id,
    ec.id,
    sd.score,
    sd.comment
FROM (
         VALUES
             -- Candidate 1: Java Backend Internship
             (1, 'INTERNSHIP', 'IOC-JB-2026-09', NULL::INTEGER, 'Java Backend – Thực tập', 'JAVA', 90, 'Nắm vững Java Core, OOP và Collections. Khả năng xử lý bài toán tốt.'),
             (1, 'INTERNSHIP', 'IOC-JB-2026-09', NULL::INTEGER, 'Java Backend – Thực tập', 'SPRING_BOOT', 85, 'Sử dụng tốt Spring Boot, Dependency Injection và xây dựng REST API.'),
             (1, 'INTERNSHIP', 'IOC-JB-2026-09', NULL::INTEGER, 'Java Backend – Thực tập', 'SQL', 80, 'Biết thiết kế bảng, JOIN và viết các truy vấn SQL cơ bản.'),
             (1, 'INTERNSHIP', 'IOC-JB-2026-09', NULL::INTEGER, 'Java Backend – Thực tập', 'GIT', 80, 'Sử dụng Git thành thạo, biết tạo branch và xử lý merge.'),
             (1, 'INTERNSHIP', 'IOC-JB-2026-09', NULL::INTEGER, 'Java Backend – Thực tập', 'TEAMWORK', 75, 'Có khả năng phối hợp nhóm và tiếp nhận phản hồi.'),

             -- Candidate 2: General Technical Interview
             (2, 'INTERVIEW', NULL::VARCHAR, 1, 'Phỏng vấn kỹ thuật chung', 'OOP', 80, 'Hiểu các nguyên lý OOP và biết áp dụng trong lập trình.'),
             (2, 'INTERVIEW', NULL::VARCHAR, 1, 'Phỏng vấn kỹ thuật chung', 'DSA', 70, 'Nắm được cấu trúc dữ liệu cơ bản, cần cải thiện phân tích độ phức tạp.'),
             (2, 'INTERVIEW', NULL::VARCHAR, 1, 'Phỏng vấn kỹ thuật chung', 'SQL', 75, 'Hiểu truy vấn SQL và các phép JOIN.'),
             (2, 'INTERVIEW', NULL::VARCHAR, 1, 'Phỏng vấn kỹ thuật chung', 'REST_API', 85, 'Hiểu RESTful API, HTTP methods và cách tích hợp API.'),
             (2, 'INTERVIEW', NULL::VARCHAR, 1, 'Phỏng vấn kỹ thuật chung', 'JAVA', 65, 'Kiến thức Java Core ở mức cơ bản, cần luyện tập thêm.'),

             -- Candidate 3: Java Backend Internship - DRAFT
             (3, 'INTERNSHIP', 'IOC-JB-2026-09', NULL::INTEGER, 'Java Backend – Thực tập', 'JAVA', 55, 'Đã nắm được cú pháp Java cơ bản, cần luyện tập OOP.'),
             (3, 'INTERNSHIP', 'IOC-JB-2026-09', NULL::INTEGER, 'Java Backend – Thực tập', 'SPRING_BOOT', 45, 'Mới làm quen Spring Boot, cần thực hành xây dựng API.')
     ) AS sd(
             user_id,
             context,
             batch_id,
             interview_round_id,
             template_name,
             skill_code,
             score,
             comment
    )
         JOIN evaluation_templates t
              ON t.name = sd.template_name
                  AND t.context = sd.context
         JOIN evaluations e
              ON e.template_id = t.id
                  AND e.user_id = sd.user_id
                  AND e.mentor_id = 6
                  AND e.context = sd.context
                  AND e.batch_id IS NOT DISTINCT FROM sd.batch_id
    AND e.interview_round_id IS NOT DISTINCT FROM sd.interview_round_id
    JOIN evaluation_criteria ec
ON ec.template_id = t.id
    JOIN skills s
    ON s.id = ec.skill_id
    AND s.code = sd.skill_code
WHERE NOT EXISTS (
    SELECT 1
    FROM evaluation_scores es
    WHERE es.evaluation_id = e.id
  AND es.criterion_id = ec.id
    );
