-- Migration V8: Dev Seed for Evaluation Module (DG-01)
-- Active Profile: dev

-- 0. Insert Second Dev Mentor Account (Password: Bcrypt of Test@123, matching V2__dev_seed.sql)
-- Password Hash: $2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a
INSERT INTO users (id, email, password_hash, full_name, lms_user_id, role_id, company_id, must_change_password)
VALUES (9, 'mentor2@rikkeijobs.test', '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a', 'Trần Minh Tuấn', 'lms-mt-002', 3, NULL, FALSE)
ON CONFLICT DO NOTHING;

SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));

-- 1. Insert 2 Evaluation Templates
INSERT INTO evaluation_templates (name, position, context, active)
VALUES
    ('Java Backend – Thực tập', 'Java Backend', 'INTERNSHIP', TRUE),
    ('Phỏng vấn kỹ thuật chung', 'Software Developer', 'INTERVIEW', TRUE)
ON CONFLICT (name, context) DO NOTHING;

-- 2. Insert Criteria cho Template 'Java Backend – Thực tập'
-- JAVA: 30%, SPRING_BOOT: 25%, SQL: 20%, GIT: 10%, TEAMWORK: 15% (Tổng 100%)
INSERT INTO evaluation_criteria (template_id, skill_id, description, weight)
SELECT t.id, s.id, c.description, c.weight
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
WHERE t.name = 'Java Backend – Thực tập' AND t.context = 'INTERNSHIP'
ON CONFLICT (template_id, skill_id) DO NOTHING;

-- 3. Insert Criteria cho Template 'Phỏng vấn kỹ thuật chung'
-- OOP: 20%, DSA: 25%, SQL: 15%, REST_API: 20%, JAVA: 20% (Tổng 100%)
INSERT INTO evaluation_criteria (template_id, skill_id, description, weight)
SELECT t.id, s.id, c.description, c.weight
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
WHERE t.name = 'Phỏng vấn kỹ thuật chung' AND t.context = 'INTERVIEW'
ON CONFLICT (template_id, skill_id) DO NOTHING;

-- 4. Sample Evaluations
-- Phiếu 1: Candidate 1 (Nguyễn Văn An) - SUBMITTED
INSERT INTO evaluations (template_id, user_id, mentor_id, context, batch_id, interview_round_id, status, overall_comment, submitted_at, version)
SELECT t.id, 1, 6, 'INTERNSHIP', 1, NULL, 'SUBMITTED',
       'Ứng viên có nền tảng Java và Spring Boot tốt. Có khả năng xây dựng REST API và sử dụng SQL. Cần cải thiện thêm kỹ năng làm việc nhóm.',
       NOW() - INTERVAL '5 days', 0
FROM evaluation_templates t
WHERE t.name = 'Java Backend – Thực tập' AND t.context = 'INTERNSHIP'
  AND NOT EXISTS (
      SELECT 1 FROM evaluations e WHERE e.user_id = 1 AND e.template_id = t.id AND e.context = 'INTERNSHIP'
  );

-- Phiếu 2: Candidate 2 (Trần Thị Bình) - SUBMITTED
INSERT INTO evaluations (template_id, user_id, mentor_id, context, batch_id, interview_round_id, status, overall_comment, submitted_at, version)
SELECT t.id, 2, 6, 'INTERVIEW', NULL, 1, 'SUBMITTED',
       'Ứng viên có kiến thức Frontend tốt, tư duy giải quyết vấn đề khá. Cần củng cố thêm kiến thức Java và cấu trúc dữ liệu.',
       NOW() - INTERVAL '2 days', 0
FROM evaluation_templates t
WHERE t.name = 'Phỏng vấn kỹ thuật chung' AND t.context = 'INTERVIEW'
  AND NOT EXISTS (
      SELECT 1 FROM evaluations e WHERE e.user_id = 2 AND e.template_id = t.id AND e.context = 'INTERVIEW'
  );

-- Phiếu 3: Candidate 3 (Lê Minh Châu) - DRAFT
INSERT INTO evaluations (template_id, user_id, mentor_id, context, batch_id, interview_round_id, status, overall_comment, submitted_at, version)
SELECT t.id, 3, 6, 'INTERNSHIP', 1, NULL, 'DRAFT',
       'Đang trong quá trình đánh giá. Cần bổ sung nhận xét và hoàn thiện điểm các tiêu chí.',
       NULL, 0
FROM evaluation_templates t
WHERE t.name = 'Java Backend – Thực tập' AND t.context = 'INTERNSHIP'
  AND NOT EXISTS (
      SELECT 1 FROM evaluations e WHERE e.user_id = 3 AND e.template_id = t.id AND e.context = 'INTERNSHIP'
  );

-- 5. Scores cho Phiếu 1 (Candidate 1: Đủ 5 tiêu chí)
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT e.id, ec.id, s_data.score, s_data.comment
FROM evaluations e
JOIN evaluation_templates t ON t.id = e.template_id
JOIN evaluation_criteria ec ON ec.template_id = t.id
JOIN skills s ON s.id = ec.skill_id
CROSS JOIN (
    VALUES
        ('JAVA', 90, 'Nắm vững Java Core, OOP và Collections. Khả năng xử lý bài toán tốt.'),
        ('SPRING_BOOT', 85, 'Sử dụng tốt Spring Boot, Dependency Injection và xây dựng REST API.'),
        ('SQL', 80, 'Biết thiết kế bảng, JOIN và viết các truy vấn SQL cơ bản.'),
        ('GIT', 80, 'Sử dụng Git thành thạo, biết tạo branch và xử lý merge.'),
        ('TEAMWORK', 75, 'Có khả năng phối hợp nhóm và tiếp nhận phản hồi.')
) AS s_data(skill_code, score, comment)
WHERE e.user_id = 1 AND e.status = 'SUBMITTED' AND s.code = s_data.skill_code
ON CONFLICT (evaluation_id, criterion_id) DO NOTHING;

-- 6. Scores cho Phiếu 2 (Candidate 2: Đủ 5 tiêu chí)
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT e.id, ec.id, s_data.score, s_data.comment
FROM evaluations e
JOIN evaluation_templates t ON t.id = e.template_id
JOIN evaluation_criteria ec ON ec.template_id = t.id
JOIN skills s ON s.id = ec.skill_id
CROSS JOIN (
    VALUES
        ('OOP', 80, 'Hiểu các nguyên lý OOP và biết áp dụng trong lập trình.'),
        ('DSA', 70, 'Nắm được cấu trúc dữ liệu cơ bản, cần cải thiện phân tích độ phức tạp.'),
        ('SQL', 75, 'Hiểu truy vấn SQL và các phép JOIN.'),
        ('REST_API', 85, 'Hiểu RESTful API, HTTP methods và cách tích hợp API.'),
        ('JAVA', 65, 'Kiến thức Java Core ở mức cơ bản, cần luyện tập thêm.')
) AS s_data(skill_code, score, comment)
WHERE e.user_id = 2 AND e.status = 'SUBMITTED' AND s.code = s_data.skill_code
ON CONFLICT (evaluation_id, criterion_id) DO NOTHING;

-- 7. Scores cho Phiếu 3 (Candidate 3: DRAFT - chỉ có 2 tiêu chí, 3 tiêu chí để trống)
INSERT INTO evaluation_scores (evaluation_id, criterion_id, score, comment)
SELECT e.id, ec.id, s_data.score, s_data.comment
FROM evaluations e
JOIN evaluation_templates t ON t.id = e.template_id
JOIN evaluation_criteria ec ON ec.template_id = t.id
JOIN skills s ON s.id = ec.skill_id
CROSS JOIN (
    VALUES
        ('JAVA', 55, 'Đã nắm được cú pháp Java cơ bản, cần luyện tập OOP.'),
        ('SPRING_BOOT', 45, 'Mới làm quen Spring Boot, cần thực hành xây dựng API.')
) AS s_data(skill_code, score, comment)
WHERE e.user_id = 3 AND e.status = 'DRAFT' AND s.code = s_data.skill_code
ON CONFLICT (evaluation_id, criterion_id) DO NOTHING;

-- 8. Cập nhật Sequencers
SELECT setval('evaluation_templates_id_seq', COALESCE((SELECT MAX(id) FROM evaluation_templates), 1));
SELECT setval('evaluation_criteria_id_seq', COALESCE((SELECT MAX(id) FROM evaluation_criteria), 1));
SELECT setval('evaluations_id_seq', COALESCE((SELECT MAX(id) FROM evaluations), 1));
SELECT setval('evaluation_scores_id_seq', COALESCE((SELECT MAX(id) FROM evaluation_scores), 1));
