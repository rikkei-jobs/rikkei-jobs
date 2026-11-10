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
