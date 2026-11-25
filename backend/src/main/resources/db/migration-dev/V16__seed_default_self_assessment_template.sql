
-- Migration V16: Dev seed for default self-assessment template.
-- Loaded only in the 'dev' profile.
-- The default template is shared by all candidates when no position-specific
-- self-assessment template is available.

-- 1. Default self-assessment template
INSERT INTO evaluation_templates (
    name,
    position,
    context,
    active,
    created_at,
    updated_at
)
VALUES (
           'Tự đánh giá năng lực – Mặc định',
           'DEFAULT',
           'SELF_ASSESSMENT',
           TRUE,
           NOW(),
           NOW()
       )
    ON CONFLICT DO NOTHING;

-- 2. Synchronize sequence
SELECT setval(
           'evaluation_templates_id_seq',
           COALESCE((SELECT MAX(id) FROM evaluation_templates), 1)
       );

INSERT INTO evaluation_criteria (template_id, skill_id, description, weight)
SELECT t.id, s.id, c.description, c.weight
FROM evaluation_templates t
         CROSS JOIN (
    VALUES
        ('JAVA', 'Tự đánh giá kiến thức Java Core, OOP và Collections.', 30.00),
        ('SPRING_BOOT', 'Tự đánh giá khả năng sử dụng Spring Boot, Dependency Injection và xây dựng REST API.', 25.00),
        ('SQL', 'Tự đánh giá kiến thức cơ sở dữ liệu, thiết kế bảng và truy vấn SQL.', 20.00),
        ('GIT', 'Tự đánh giá khả năng sử dụng Git, quản lý branch và xử lý merge.', 10.00),
        ('TEAMWORK', 'Tự đánh giá khả năng làm việc nhóm và phối hợp với các thành viên.', 15.00)
) AS c(skill_code, description, weight)
         JOIN skills s ON s.code = c.skill_code
WHERE t.position = 'DEFAULT'
  AND t.context = 'SELF_ASSESSMENT'
  AND t.active = TRUE
    ON CONFLICT (template_id, skill_id) DO NOTHING;
