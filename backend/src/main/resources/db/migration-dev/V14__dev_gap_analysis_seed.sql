-- Migration V12: Dev seed for target positions and skill gap analysis (DT-01).
-- Loaded only in the 'dev' profile. Positions reference the 20-skill catalogue by code so the
-- seed stays stable even when sequence values change.

-- 1. Target positions
INSERT INTO target_positions (code, name, description) VALUES
('JAVA_BACKEND_FRESHER', 'Java Backend Fresher', 'Vị trí fresher phát triển backend Java với Spring Boot, SQL và REST API.'),
('FRONTEND_REACTJS_FRESHER', 'Frontend ReactJS Fresher', 'Vị trí fresher phát triển giao diện web bằng ReactJS, JavaScript và HTML/CSS.'),
('TESTER', 'Tester', 'Vị trí kiểm thử phần mềm: thiết kế test case, kiểm thử API và phối hợp với đội phát triển.'),
('FULLSTACK', 'Fullstack', 'Vị trí fullstack phát triển cả frontend ReactJS và backend Java Spring Boot.')
ON CONFLICT (code) DO NOTHING;

SELECT setval('target_positions_id_seq', COALESCE((SELECT MAX(id) FROM target_positions), 1));

-- 2. Skills required by each position
INSERT INTO position_skills (position_id, skill_id, min_score)
SELECT target_position.id, skill.id, requirement.min_score
FROM (VALUES
    ('JAVA_BACKEND_FRESHER', 'JAVA', 75),
    ('JAVA_BACKEND_FRESHER', 'SPRING_BOOT', 70),
    ('JAVA_BACKEND_FRESHER', 'SQL', 65),
    ('JAVA_BACKEND_FRESHER', 'REST_API', 65),
    ('JAVA_BACKEND_FRESHER', 'DOCKER', 60),
    ('JAVA_BACKEND_FRESHER', 'GIT', 50),
    ('JAVA_BACKEND_FRESHER', 'CLEAN_CODE', 60),
    ('FRONTEND_REACTJS_FRESHER', 'REACTJS', 70),
    ('FRONTEND_REACTJS_FRESHER', 'JAVASCRIPT', 75),
    ('FRONTEND_REACTJS_FRESHER', 'HTML_CSS', 65),
    ('FRONTEND_REACTJS_FRESHER', 'GIT', 50),
    ('FRONTEND_REACTJS_FRESHER', 'REST_API', 55),
    ('TESTER', 'TESTING', 70),
    ('TESTER', 'SQL', 60),
    ('TESTER', 'JAVA', 50),
    ('TESTER', 'COMMUNICATION', 60),
    ('FULLSTACK', 'JAVA', 65),
    ('FULLSTACK', 'SPRING_BOOT', 60),
    ('FULLSTACK', 'REACTJS', 55),
    ('FULLSTACK', 'SQL', 55),
    ('FULLSTACK', 'GIT', 50)
) AS requirement (position_code, skill_code, min_score)
INNER JOIN target_positions AS target_position
    ON target_position.code = requirement.position_code
INNER JOIN skills AS skill ON skill.code = requirement.skill_code
ON CONFLICT (position_id, skill_id) DO NOTHING;

SELECT setval('position_skills_id_seq', COALESCE((SELECT MAX(id) FROM position_skills), 1));
