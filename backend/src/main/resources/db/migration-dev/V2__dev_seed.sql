-- Migration V2: Dev Environment Seed Data
-- Only loaded in 'dev' profile. Must NOT be loaded in 'prod' or default clean profile.

-- 1. Insert 5 Standard Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'CANDIDATE', 'Ứng viên - sinh viên / học viên Rikkei Education / thực tập sinh IOC'),
(2, 'HR', 'Doanh nghiệp tuyển dụng - quản lý JD và tìm kiếm ứng viên'),
(3, 'MENTOR', 'Giảng viên / Hướng dẫn thực tập tại doanh nghiệp'),
(4, 'STAFF', 'Cán bộ tuyển dụng Rikkei Education - kiểm duyệt và điều phối'),
(5, 'ADMIN', 'Quản trị viên hệ thống toàn quyền')
ON CONFLICT (name) DO NOTHING;

SELECT setval('roles_id_seq', COALESCE((SELECT MAX(id) FROM roles), 1));

-- 2. Insert 20 Fixed Skills Catalogue
INSERT INTO skills (id, code, name_vi, name_en, level_bands, scale, description) VALUES
(1, 'JAVA', 'Lập trình Java', 'Java Programming',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Kỹ năng lập trình Java từ cơ bản đến nâng cao'),

(2, 'SPRING_BOOT', 'Framework Spring Boot', 'Spring Boot Framework',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Phát triển backend và REST API với framework Spring Boot'),

(3, 'SQL', 'Cơ sở dữ liệu & SQL', 'SQL & Relational Databases',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Thiết kế cơ sở dữ liệu quan hệ và tối ưu truy vấn SQL'),

(4, 'GIT', 'Quản lý phiên bản Git', 'Git Version Control',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Quản lý mã nguồn nhóm, nhánh và quy trình Git Flow / GitHub'),

(5, 'REST_API', 'Thiết kế API RESTful', 'RESTful API Design',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Thiết kế kiến trúc API RESTful, OpenAPI spec và bảo mật HTTP'),

(6, 'HTML_CSS', 'Giao diện web HTML5 & CSS3', 'HTML5 & CSS3',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Cắt giao diện responsive theo chuẩn HTML5 semantic và CSS3'),

(7, 'JAVASCRIPT', 'Lập trình JavaScript', 'JavaScript Programming',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Ngôn ngữ lập trình JavaScript nền tảng, ES6+ và bất đồng bộ'),

(8, 'REACTJS', 'Thư viện ReactJS', 'ReactJS Frontend Library',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Xây dựng giao diện Single Page Application với React và Hooks'),

(9, 'DOCKER', 'Đóng gói ứng dụng Docker', 'Docker & Containerization',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Container hóa dịch vụ, viết Dockerfile và quản trị Docker Compose'),

(10, 'ENGLISH', 'Trình độ Tiếng Anh', 'English Proficiency',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Tiếng Anh chuyên ngành công nghệ thông tin và giao tiếp'),

(11, 'TESTING', 'Kiểm thử phần mềm & QA', 'Software Testing & QA',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Viết Unit Test, Integration Test, TDD và quy trình đảm bảo chất lượng'),

(12, 'LINUX', 'Quản trị hệ điều hành Linux', 'Linux Administration',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Dòng lệnh shell, quản trị tiến trình và mạng trên môi trường Linux'),

(13, 'OOP', 'Lập trình hướng đối tượng', 'Object-Oriented Programming',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Bốn nguyên lý lập trình hướng đối tượng và áp dụng trong thực tế'),

(14, 'DSA', 'Cấu trúc dữ liệu & Giải thuật', 'Data Structures & Algorithms',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Các cấu trúc dữ liệu cơ bản và giải thuật tối ưu độ phức tạp'),

(15, 'CLEAN_CODE', 'Viết mã sạch & Tái cấu trúc', 'Clean Code & Refactoring',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Quy tắc DRY, SOLID, đặt tên chuẩn mực và kỹ thuật tái cấu trúc mã nguồn'),

(16, 'TEAMWORK', 'Kỹ năng làm việc nhóm', 'Teamwork & Collaboration',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Phối hợp nhịp nhàng trong đội ngũ dự án, lắng nghe và chia sẻ thông tin'),

(17, 'COMMUNICATION', 'Kỹ năng giao tiếp', 'Communication Skills',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Trình bày ý tưởng kỹ thuật rõ ràng, phỏng vấn và trao đổi chuyên nghiệp'),

(18, 'AGILE', 'Phương pháp Agile & Scrum', 'Agile & Scrum Methodology',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Vận hành theo Sprint, Daily Scrum, Retrospective và quản lý backlog'),

(19, 'SECURITY', 'Bảo mật ứng dụng', 'Application Security',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Các nguyên tắc phòng chống OWASP Top 10 và bảo vệ dữ liệu người dùng'),

(20, 'CLOUD', 'Điện toán đám mây', 'Cloud Computing',
 '{"bands":[{"min":0,"max":39,"name_vi":"Cơ bản","name_en":"Basic"},{"min":40,"max":69,"name_vi":"Khá","name_en":"Intermediate"},{"min":70,"max":84,"name_vi":"Tốt","name_en":"Advanced"},{"min":85,"max":100,"name_vi":"Xuất sắc","name_en":"Expert"}]}'::jsonb,
 '0-100', 'Kiến trúc dịch vụ IaaS, PaaS, lưu trữ S3 và triển khai cloud')
ON CONFLICT (code) DO NOTHING;

SELECT setval('skills_id_seq', COALESCE((SELECT MAX(id) FROM skills), 1));

-- 3. Insert 8 Sample Dev Accounts (Password: Bcrypt of Test@123)
-- Password Hash: $2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a
INSERT INTO users (id, email, password_hash, full_name, lms_user_id, role_id) VALUES
(1, 'candidate1@rikkeijobs.test', '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a', 'Nguyễn Văn An', 'lms-sv-001', 1),
(2, 'candidate2@rikkeijobs.test', '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a', 'Trần Thị Bình', 'lms-sv-002', 1),
(3, 'candidate3@rikkeijobs.test', '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a', 'Lê Minh Châu', 'lms-sv-003', 1),
(4, 'hr1@rikkeijobs.test', '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a', 'Đại diện Doanh nghiệp A', NULL, 2),
(5, 'hr2@rikkeijobs.test', '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a', 'Đại diện Doanh nghiệp B', NULL, 2),
(6, 'mentor1@rikkeijobs.test', '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a', 'Phạm Quốc Dũng', 'lms-mt-001', 3),
(7, 'staff1@rikkeijobs.test', '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a', 'Hoàng Thu Hà', 'lms-st-001', 4),
(8, 'admin1@rikkeijobs.test', '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a', 'Đỗ Thanh Hải', 'lms-ad-001', 5)
ON CONFLICT (email) DO NOTHING;

SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));

-- 4. Insert Sample Companies
INSERT INTO companies (id, name, industry, location, logo_url) VALUES
(1, 'Rikkeisoft', 'Software Engineering & IT Outsourcing', 'Hà Nội', 'https://rikkei.vn/wp-content/uploads/2021/08/logo-rikkei.png'),
(2, 'FPT Software', 'Information Technology', 'Đà Nẵng', 'https://fptsoftware.com/logo.png'),
(3, 'VTI Group', 'Technology Solutions', 'Hà Nội', 'https://vti.com.vn/logo.png'),
(4, 'CMC Global', 'IT Services', 'TP. Hồ Chí Minh', 'https://cmcglobal.vn/logo.png'),
(5, 'NashTech Vietnam', 'Software Development', 'TP. Hồ Chí Minh', 'https://nashtechglobal.com/logo.png')
ON CONFLICT (id) DO NOTHING;

SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1));

-- 5. Insert Sample Candidate Skills (Verified competency data)
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

-- 6. Insert Sample Jobs (10 Approved Active, 1 Draft, 1 Expired)
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

-- 7. Insert Job Required Skills
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
