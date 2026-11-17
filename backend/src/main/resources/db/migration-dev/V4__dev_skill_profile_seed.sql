-- Migration V4: Dev seed for Skill Profile (HS-01). Loaded only in the 'dev' profile.
-- Provides skill groups, source-to-skill mappings, candidate visibility, sample external
-- records for 3 candidates (stand-in for NT-05) and SELF evidences.
-- Timestamps are relative to NOW() so the "within the last year" time factor stays stable.
-- Verified evidences and skill_scores are produced by recomputeSkills(userId) at dev startup.

-- 1. Skill groups
UPDATE skills SET skill_group = 'PROGRAMMING' WHERE code IN ('JAVA', 'OOP', 'DSA', 'CLEAN_CODE');
UPDATE skills SET skill_group = 'BACKEND' WHERE code IN ('SPRING_BOOT', 'SQL', 'REST_API');
UPDATE skills SET skill_group = 'FRONTEND' WHERE code IN ('HTML_CSS', 'JAVASCRIPT', 'REACTJS');
UPDATE skills SET skill_group = 'DEVOPS' WHERE code IN ('GIT', 'DOCKER', 'LINUX', 'CLOUD');
UPDATE skills SET skill_group = 'QUALITY' WHERE code IN ('TESTING', 'SECURITY');
UPDATE skills SET skill_group = 'SOFT_SKILL' WHERE code IN ('ENGLISH', 'TEAMWORK', 'COMMUNICATION', 'AGILE');

-- 2. Source code -> skill mapping (weights of one source code need not sum to 1)
INSERT INTO skill_mappings (source, source_code, skill_id, weight)
SELECT m.source, m.source_code, s.id, m.weight
FROM (VALUES
    ('LMS', 'JAVA01', 'JAVA', 0.7),
    ('LMS', 'JAVA01', 'OOP', 0.3),
    ('LMS', 'SQL01', 'SQL', 1.0),
    ('LMS', 'SPRING01', 'SPRING_BOOT', 0.7),
    ('LMS', 'SPRING01', 'REST_API', 0.3),
    ('LMS', 'WEB01', 'HTML_CSS', 0.5),
    ('LMS', 'WEB01', 'JAVASCRIPT', 0.5),
    ('LMS', 'GIT01', 'GIT', 0.8),
    ('LMS', 'GIT01', 'TEAMWORK', 0.2),
    ('LMS', 'REACT01', 'REACTJS', 0.7),
    ('LMS', 'REACT01', 'JAVASCRIPT', 0.3),
    ('EXAM', 'EX-JAVA-2026-10', 'JAVA', 0.8),
    ('EXAM', 'EX-JAVA-2026-10', 'DSA', 0.2),
    ('EXAM', 'EX-REACT-2026-10', 'REACTJS', 1.0),
    ('PM', 'IOC-JB-2026-09', 'JAVA', 0.3),
    ('PM', 'IOC-JB-2026-09', 'SPRING_BOOT', 0.3),
    ('PM', 'IOC-JB-2026-09', 'TEAMWORK', 0.2),
    ('PM', 'IOC-JB-2026-09', 'AGILE', 0.2)
) AS m (source, source_code, skill_code, weight)
INNER JOIN skills AS s ON m.skill_code = s.code
ON CONFLICT DO NOTHING;

-- 3. Visibility: candidate1 and candidate3 are private, candidate2 is public
INSERT INTO candidate_profiles (user_id, is_public) VALUES
(1, FALSE),
(2, TRUE),
(3, FALSE)
ON CONFLICT DO NOTHING;

-- 4. Sample external records (scores normalized from the 0-10 mock scale to 0-100)
INSERT INTO external_records (user_id, source, source_code, title, score, recorded_at) VALUES
-- candidate1 (user 1)
(1, 'LMS', 'JAVA01', 'Lập trình Java', 85, NOW() - INTERVAL '30 days'),
(1, 'LMS', 'JAVA01', 'Lập trình Java (kỳ trước)', 60, NOW() - INTERVAL '500 days'),
(1, 'LMS', 'SQL01', 'Cơ sở dữ liệu', 80, NOW() - INTERVAL '30 days'),
(1, 'LMS', 'SPRING01', 'Spring Boot', 75, NOW() - INTERVAL '25 days'),
(1, 'LMS', 'WEB01', 'HTML/CSS/JavaScript', 70, NOW() - INTERVAL '60 days'),
(1, 'LMS', 'GIT01', 'Git và làm việc nhóm', 90, NOW() - INTERVAL '45 days'),
(1, 'EXAM', 'EX-JAVA-2026-10', 'Bài thi Java 10/2026', 80, NOW() - INTERVAL '10 days'),
(1, 'PM', 'IOC-JB-2026-09', 'IOC Java Backend 09/2026', 85, NOW() - INTERVAL '14 days'),
-- candidate2 (user 2)
(2, 'LMS', 'WEB01', 'HTML/CSS/JavaScript', 90, NOW() - INTERVAL '40 days'),
(2, 'LMS', 'REACT01', 'ReactJS', 85, NOW() - INTERVAL '20 days'),
(2, 'LMS', 'JAVA01', 'Lập trình Java', 65, NOW() - INTERVAL '50 days'),
(2, 'LMS', 'GIT01', 'Git và làm việc nhóm', 80, NOW() - INTERVAL '45 days'),
(2, 'EXAM', 'EX-REACT-2026-10', 'Bài thi ReactJS 10/2026', 80, NOW() - INTERVAL '8 days'),
-- candidate3 (user 3)
(3, 'LMS', 'JAVA01', 'Lập trình Java', 55, NOW() - INTERVAL '35 days'),
(3, 'LMS', 'SQL01', 'Cơ sở dữ liệu', 60, NOW() - INTERVAL '35 days'),
(3, 'LMS', 'WEB01', 'HTML/CSS/JavaScript', 50, NOW() - INTERVAL '55 days'),
(3, 'EXAM', 'EX-JAVA-2026-10', 'Bài thi Java 10/2026', 45, NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- 5. Self-declared evidences. COMMUNICATION and ENGLISH have no verified evidence (self-only).
INSERT INTO skill_evidences (user_id, skill_id, source, source_ref, title, score, weight, recorded_at, verified)
SELECT e.user_id, s.id, 'SELF', NULL, e.title, e.score, 1, NOW() - e.age, FALSE
FROM (VALUES
    (1, 'JAVA', 'Tự đánh giá', 90, INTERVAL '20 days'),
    (1, 'TEAMWORK', 'Tự đánh giá', 75, INTERVAL '20 days'),
    (1, 'COMMUNICATION', 'Tự đánh giá', 70, INTERVAL '20 days'),
    (1, 'ENGLISH', 'Tự đánh giá', 65, INTERVAL '20 days'),
    (2, 'COMMUNICATION', 'Tự đánh giá', 80, INTERVAL '15 days'),
    (3, 'ENGLISH', 'Tự đánh giá', 55, INTERVAL '15 days')
) AS e (user_id, skill_code, title, score, age)
INNER JOIN skills AS s ON e.skill_code = s.code;
