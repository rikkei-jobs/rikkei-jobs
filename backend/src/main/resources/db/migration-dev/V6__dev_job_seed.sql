-- Migration V6: Dev seed for job catalogue and AI recommendations (T023D8B). Loaded only in the 'dev' profile.
-- Provides sample companies, verified candidate skills, approved/expired/draft JDs and their
-- required skills so the recommendation matcher has realistic data to work with.

-- 1. Insert Sample Companies
INSERT INTO companies (id, name, industry, location, logo_url) VALUES
(1, 'Rikkeisoft', 'Software Engineering & IT Outsourcing', 'Hà Nội', 'https://rikkei.vn/wp-content/uploads/2021/08/logo-rikkei.png'),
(2, 'FPT Software', 'Information Technology', 'Đà Nẵng', 'https://fptsoftware.com/logo.png'),
(3, 'VTI Group', 'Technology Solutions', 'Hà Nội', 'https://vti.com.vn/logo.png'),
(4, 'CMC Global', 'IT Services', 'TP. Hồ Chí Minh', 'https://cmcglobal.vn/logo.png'),
(5, 'NashTech Vietnam', 'Software Development', 'TP. Hồ Chí Minh', 'https://nashtechglobal.com/logo.png')
ON CONFLICT (id) DO NOTHING;

SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1));

-- 2. Insert Sample Candidate Skills (Verified competency data)
INSERT INTO candidate_skills (user_id, skill_code, score, verified) VALUES
-- Candidate 1: Nguyễn Văn An (Strong Java, Spring Boot, SQL, REST API)
(1, 'JAVA', 85, TRUE),
(1, 'SPRING_BOOT', 80, TRUE),
(1, 'SQL', 75, TRUE),
(1, 'REST_API', 85, TRUE),
(1, 'GIT', 80, TRUE),
(1, 'OOP', 80, TRUE),
(1, 'DOCKER', 45, TRUE),

-- Candidate 2: Trần Thị Bình (Strong ReactJS, Frontend, JavaScript)
(2, 'REACTJS', 85, TRUE),
(2, 'JAVASCRIPT', 80, TRUE),
(2, 'HTML_CSS', 85, TRUE),
(2, 'GIT', 75, TRUE),
(2, 'REST_API', 65, TRUE),
(2, 'JAVA', 30, TRUE),

-- Candidate 3: Lê Minh Châu (Fresher / Basic Skills)
(3, 'JAVA', 40, TRUE),
(3, 'SQL', 35, TRUE),
(3, 'GIT', 40, TRUE),
(3, 'HTML_CSS', 45, TRUE)
ON CONFLICT DO NOTHING;

SELECT setval('candidate_skills_id_seq', COALESCE((SELECT MAX(id) FROM candidate_skills), 1));

-- 3. Insert Sample Jobs (10 Approved Active, 1 Draft, 1 Expired)
INSERT INTO jobs (id, title, company_id, company_name, location, salary_range, status, deadline, description) VALUES
(1, 'Kỹ sư Lập trình Java Backend (Junior/Middle)', 1, 'Rikkeisoft', 'Hà Nội', '15 - 25 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Tham gia phát triển hệ thống Enterprise quy mô lớn bằng Java 25 & Spring Boot.'),
(2, 'Fresher Java Developer', 2, 'FPT Software', 'Đà Nẵng', '8 - 14 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Được đào tạo bài bản và tham gia dự án thực chiến với khách hàng Nhật Bản.'),
(3, 'Backend Engineer (Spring Boot)', 3, 'VTI Group', 'Hà Nội', '18 - 30 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Xây dựng microservices, tối ưu cơ sở dữ liệu quan hệ và thiết kế RESTful APIs.'),
(4, 'Frontend Developer (ReactJS)', 4, 'CMC Global', 'TP. Hồ Chí Minh', '14 - 22 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Phát triển ứng dụng Web SPA hiện đại sử dụng React 19, TypeScript và Tailwind.'),
(5, 'Fullstack Java & React Developer', 5, 'NashTech Vietnam', 'TP. Hồ Chí Minh', '20 - 35 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Đảm nhận cả tầng Frontend React và Backend Spring Boot trong dự án tài chính.'),
(6, 'Database & Backend Specialist', 1, 'Rikkeisoft', 'Hà Nội', '16 - 26 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Tập trung thiết kế CSDL SQL, tối ưu chỉ mục và phát triển module xử lý dữ liệu nặng.'),
(7, 'Cloud & DevOps Junior Engineer', 4, 'CMC Global', 'Hà Nội', '12 - 20 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Triển khai hạ tầng CI/CD, đóng gói Docker và quản trị hệ thống Linux.'),
(8, 'Software QA / QC Engineer', 2, 'FPT Software', 'Đà Nẵng', '10 - 18 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Viết test case, kiểm thử tự động API và phối hợp chặt chẽ trong quy trình Agile.'),
(9, 'Junior Frontend Engineer', 3, 'VTI Group', 'Hà Nội', '12 - 18 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Phát triển giao diện người dùng tối ưu trải nghiệm và kết nối API RESTful.'),
(10, 'Software Engineer (Agile Team)', 5, 'NashTech Vietnam', 'TP. Hồ Chí Minh', '15 - 24 triệu', 'APPROVED', '2027-12-31 23:59:59+07', 'Làm việc theo mô hình Scrum/Agile, phát triển tính năng mới với Clean Code.'),
(11, 'Golang Backend Architect (DRAFT - Không gợi ý)', 1, 'Rikkeisoft', 'Hà Nội', '40 - 60 triệu', 'DRAFT', '2027-12-31 23:59:59+07', 'Vị trí bản nháp - không được xuất hiện trong danh sách gợi ý ứng viên.'),
(12, 'Java Developer 2024 (EXPIRED - Không gợi ý)', 2, 'FPT Software', 'Đà Nẵng', '10 - 15 triệu', 'APPROVED', '2024-01-01 00:00:00+07', 'Vị trí đã hết hạn ứng tuyển - không được xuất hiện trong gợi ý.')
ON CONFLICT (id) DO NOTHING;

SELECT setval('jobs_id_seq', COALESCE((SELECT MAX(id) FROM jobs), 1));

-- 4. Insert Job Required Skills
INSERT INTO job_skills (job_id, skill_code, required_level, mandatory) VALUES
-- Job 1 (Rikkei Java Backend): JAVA, SPRING_BOOT, SQL, REST_API, DOCKER
(1, 'JAVA', 75, TRUE),
(1, 'SPRING_BOOT', 70, TRUE),
(1, 'SQL', 60, TRUE),
(1, 'REST_API', 70, FALSE),
(1, 'DOCKER', 60, FALSE),

-- Job 2 (FPT Fresher Java): JAVA, OOP, SQL, GIT
(2, 'JAVA', 60, TRUE),
(2, 'OOP', 60, TRUE),
(2, 'SQL', 50, TRUE),
(2, 'GIT', 50, FALSE),

-- Job 3 (VTI Spring Boot): JAVA, SPRING_BOOT, REST_API, SQL
(3, 'JAVA', 80, TRUE),
(3, 'SPRING_BOOT', 75, TRUE),
(3, 'REST_API', 75, TRUE),
(3, 'SQL', 70, FALSE),

-- Job 4 (CMC Frontend React): REACTJS, JAVASCRIPT, HTML_CSS, GIT
(4, 'REACTJS', 75, TRUE),
(4, 'JAVASCRIPT', 75, TRUE),
(4, 'HTML_CSS', 70, TRUE),
(4, 'GIT', 60, FALSE),

-- Job 5 (NashTech Fullstack): JAVA, SPRING_BOOT, REACTJS, SQL
(5, 'JAVA', 70, TRUE),
(5, 'SPRING_BOOT', 65, TRUE),
(5, 'REACTJS', 65, TRUE),
(5, 'SQL', 60, FALSE),

-- Job 6 (Rikkei DB Specialist): SQL, JAVA, CLEAN_CODE
(6, 'SQL', 80, TRUE),
(6, 'JAVA', 70, TRUE),
(6, 'CLEAN_CODE', 65, FALSE),

-- Job 7 (CMC Cloud/DevOps): LINUX, DOCKER, GIT, CLOUD
(7, 'LINUX', 70, TRUE),
(7, 'DOCKER', 70, TRUE),
(7, 'GIT', 65, TRUE),
(7, 'CLOUD', 60, FALSE),

-- Job 8 (FPT QA/QC): TESTING, SQL, JAVA, COMMUNICATION
(8, 'TESTING', 75, TRUE),
(8, 'SQL', 60, TRUE),
(8, 'JAVA', 50, FALSE),
(8, 'COMMUNICATION', 65, FALSE),

-- Job 9 (VTI Junior Frontend): JAVASCRIPT, REACTJS, REST_API
(9, 'JAVASCRIPT', 70, TRUE),
(9, 'REACTJS', 70, TRUE),
(9, 'REST_API', 60, FALSE),

-- Job 10 (NashTech Agile SE): JAVA, OOP, AGILE, TEAMWORK
(10, 'JAVA', 65, TRUE),
(10, 'OOP', 70, TRUE),
(10, 'AGILE', 65, FALSE),
(10, 'TEAMWORK', 70, FALSE)
ON CONFLICT DO NOTHING;

SELECT setval('job_skills_id_seq', COALESCE((SELECT MAX(id) FROM job_skills), 1));
