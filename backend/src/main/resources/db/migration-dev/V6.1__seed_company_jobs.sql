INSERT INTO companies (id, name, hr_owner_user_id)
VALUES
    (1, 'Rikkei Digital', 4),
    (2, 'Rikkei Solutions', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1));

INSERT INTO job_descriptions (
    id,
    company_id,
    title,
    description,
    location,
    employment_type,
    salary_range,
    status,
    deadline
)
VALUES
    (101, 1, 'Backend Java Developer (Spring Boot)', 'Phát triển và vận hành dịch vụ backend Java.', 'Hà Nội', 'FULL_TIME', 'Thỏa thuận', 'APPROVED', NOW() + INTERVAL '2 months'),
    (102, 2, 'Frontend React Engineer', 'Xây dựng giao diện sản phẩm bằng React và TypeScript.', 'Hà Nội', 'FULL_TIME', 'Thỏa thuận', 'APPROVED', NOW() + INTERVAL '1 month'),
    (103, 1, 'Fullstack Software Intern', 'Tham gia phát triển các tính năng full-stack dưới sự hướng dẫn của mentor.', 'Hà Nội', 'INTERNSHIP', 'Hỗ trợ thực tập', 'APPROVED', NOW() + INTERVAL '3 weeks'),
    (104, 2, 'DevOps / Cloud Engineer', 'Tự động hóa triển khai và vận hành nền tảng cloud.', 'Hồ Chí Minh', 'FULL_TIME', 'Thỏa thuận', 'APPROVED', NOW() + INTERVAL '3 months'),
    (105, 1, 'QA / Automation Tester', 'Thiết kế kiểm thử tự động và nâng cao chất lượng sản phẩm.', 'Hà Nội', 'FULL_TIME', 'Thỏa thuận', 'APPROVED', NOW() + INTERVAL '1 month')
ON CONFLICT (id) DO NOTHING;

SELECT setval('job_descriptions_id_seq', COALESCE((SELECT MAX(id) FROM job_descriptions), 1));
