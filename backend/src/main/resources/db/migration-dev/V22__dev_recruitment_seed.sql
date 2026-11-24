-- Migration V20: Dev Seed for Recruitment Applications and Snapshots (UT-01)
-- Only loaded in 'dev' profile. Runs after V17 (applications) and V19 (application_cv_snapshots).
-- Seeds 7 applications for candidate1 (user_id = 1) covering all 7 statuses on valid V12 job IDs
-- (including company_id = 2 jobs 2 and 8 for hr2 read-only views) and 0 applications for candidate2 (user_id = 2).
-- V12 job_id = 12 already provides an APPROVED expired job (deadline = 2024-01-01).

INSERT INTO applications (
    id,
    job_id,
    user_id,
    cv_id,
    cv_snapshot_url,
    cover_letter,
    status,
    version,
    created_at,
    updated_at
)
VALUES
    (1, 2, 1, 1, '/api/v1/me/applications/1/cv-snapshot', 'Tôi mong muốn ứng tuyển vị trí Fresher Java Developer tại FPT Software.', 'SUBMITTED', 0, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (2, 8, 1, 1, '/api/v1/me/applications/2/cv-snapshot', 'Tôi có nền tảng kiểm thử tự động API và SQL.', 'SCREENING', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
    (3, 1, 1, 2, '/api/v1/me/applications/3/cv-snapshot', 'Tôi có kinh nghiệm Java và Spring Boot qua các dự án thực tế.', 'INTERVIEW', 2, NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),
    (4, 3, 1, 1, '/api/v1/me/applications/4/cv-snapshot', 'Tôi đã hoàn thành tốt vòng phỏng vấn chuyên môn Backend.', 'OFFER', 3, NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 hours'),
    (5, 4, 1, 2, '/api/v1/me/applications/5/cv-snapshot', 'Tôi rất hào hứng gia nhập đội ngũ ReactJS của CMC Global.', 'HIRED', 4, NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days'),
    (6, 5, 1, 1, '/api/v1/me/applications/6/cv-snapshot', 'Ứng tuyển vị trí Fullstack Java & React Developer.', 'REJECTED', 2, NOW() - INTERVAL '18 days', NOW() - INTERVAL '12 days'),
    (7, 6, 1, 1, '/api/v1/me/applications/7/cv-snapshot', 'Ứng tuyển vị trí Database & Backend Specialist.', 'WITHDRAWN', 1, NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('applications_id_seq', COALESCE((SELECT MAX(id) FROM applications), 1));

INSERT INTO application_status_history (
    id,
    application_id,
    from_status,
    to_status,
    actor_id,
    note,
    created_at
)
VALUES
    (1, 1, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển.', NOW() - INTERVAL '1 day'),
    (2, 2, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển.', NOW() - INTERVAL '3 days'),
    (3, 2, 'SUBMITTED', 'SCREENING', 5, 'HR bắt đầu sàng lọc hồ sơ.', NOW() - INTERVAL '2 days'),
    (4, 3, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển.', NOW() - INTERVAL '6 days'),
    (5, 3, 'SUBMITTED', 'SCREENING', 4, 'Hồ sơ đạt yêu cầu kỹ năng nền tảng.', NOW() - INTERVAL '4 days'),
    (6, 3, 'SCREENING', 'INTERVIEW', 4, 'Mời ứng viên tham gia phỏng vấn kỹ thuật.', NOW() - INTERVAL '1 day'),
    (7, 4, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển.', NOW() - INTERVAL '10 days'),
    (8, 4, 'SUBMITTED', 'SCREENING', 7, 'Thông qua vòng sàng lọc hồ sơ.', NOW() - INTERVAL '8 days'),
    (9, 4, 'SCREENING', 'INTERVIEW', 7, 'Đạt phỏng vấn kỹ thuật.', NOW() - INTERVAL '3 days'),
    (10, 4, 'INTERVIEW', 'OFFER', 7, 'Gửi thư mời nhận việc chính thức.', NOW() - INTERVAL '12 hours'),
    (11, 5, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển.', NOW() - INTERVAL '20 days'),
    (12, 5, 'SUBMITTED', 'SCREENING', 7, 'Đạt vòng sàng lọc.', NOW() - INTERVAL '17 days'),
    (13, 5, 'SCREENING', 'INTERVIEW', 7, 'Đạt vòng phỏng vấn chuyên môn.', NOW() - INTERVAL '12 days'),
    (14, 5, 'INTERVIEW', 'OFFER', 7, 'Gửi đề nghị nhận việc.', NOW() - INTERVAL '8 days'),
    (15, 5, 'OFFER', 'HIRED', 7, 'Ứng viên xác nhận nhận việc.', NOW() - INTERVAL '5 days'),
    (16, 6, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển.', NOW() - INTERVAL '18 days'),
    (17, 6, 'SUBMITTED', 'SCREENING', 7, 'Đang xem xét mức độ phù hợp.', NOW() - INTERVAL '15 days'),
    (18, 6, 'SCREENING', 'REJECTED', 7, 'Kinh nghiệm dự án chưa phù hợp với yêu cầu hiện tại.', NOW() - INTERVAL '12 days'),
    (19, 7, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển.', NOW() - INTERVAL '15 days'),
    (20, 7, 'SUBMITTED', 'WITHDRAWN', 1, 'Tôi xin rút đơn vì đã nhận cơ hội phù hợp hơn.', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('application_status_history_id_seq', COALESCE((SELECT MAX(id) FROM application_status_history), 1));

WITH sample_pdf AS (
    SELECT
        decode(
            '255044462d312e340a312030206f626a0a3c3c202f54797065202f436174616c6f67202f5061676573203220302052203e3e0a656e646f626a0a322030206f626a0a3c3c202f54797065202f5061676573202f4b696473205b33203020525d202f436f756e742031203e3e0a656e646f626a0a332030206f626a0a3c3c202f54797065202f50616765202f506172656e74203220302052202f4d65646961426f78205b30203020363132203739325d202f5265736f7572636573203c3c202f466f6e74203c3c202f4631203420302052203e3e203e3e202f436f6e74656e7473203520302052203e3e0a656e646f626a0a342030206f626a0a3c3c202f54797065202f466f6e74202f53756274797065202f5479706531202f42617365466f6e74202f48656c766574696361203e3e0a656e646f626a0a352030206f626a0a3c3c202f4c656e677468203531203e3e0a73747265616d0a4254202f463120313820546620373220373230205464202853616d706c652063616e6469646174652043562920546a2045540a656e6473747265616d0a656e646f626a0a787265660a3020360a303030303030303030302036353533352066200a30303030303030303039203030303030206e200a30303030303030303538203030303030206e200a30303030303030313135203030303030206e200a30303030303030323431203030303030206e200a30303030303030333131203030303030206e200a747261696c65720a3c3c202f53697a652036202f526f6f74203120302052203e3e0a7374617274787265660a3431310a2525454f460a',
            'hex'
        ) AS content
)

INSERT INTO application_cv_snapshots (
    application_id,
    original_filename,
    content_type,
    file_data,
    file_size,
    sha256
)
SELECT
    seeded.application_id,
    'sample-candidate-cv.pdf' AS original_filename,
    'application/pdf' AS content_type,
    sample_pdf.content AS file_data,
    594 AS file_size,
    '9b71184ae956dd96864598cc8abfffb29bcf23c9bff28aff431fd779ac564782' AS sha256
FROM (VALUES (1), (2), (3), (4), (5), (6), (7)) AS seeded (application_id)
CROSS JOIN sample_pdf
ON CONFLICT (application_id) DO NOTHING;
