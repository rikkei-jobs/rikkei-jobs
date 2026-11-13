-- Migration V3.1: Seed Recruitment Dev Data
-- Only loaded in 'dev' profile.

INSERT INTO applications (id, job_id, user_id, cv_id, cv_snapshot_url, cover_letter, status, created_at, updated_at)
VALUES
(1, 101, 1, 1, '/snapshots/cv_1_snapshot_1700000000.pdf', 'Tôi rất mong muốn được thử sức ở vị trí Backend Java.', 'SUBMITTED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(2, 102, 1, 1, '/snapshots/cv_1_snapshot_1700000001.pdf', 'Tôi có kinh nghiệm với Spring Boot và PostgreSQL.', 'SCREENING', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
(3, 103, 1, 2, '/snapshots/cv_2_snapshot_1700000002.pdf', 'Ứng tuyển vị trí Fullstack Developer.', 'INTERVIEW', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),
(4, 104, 1, 1, '/snapshots/cv_1_snapshot_1700000003.pdf', 'Tôi đã nhận được offer và đang cân nhắc.', 'OFFER', NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 hours'),
(5, 105, 1, 1, '/snapshots/cv_1_snapshot_1700000004.pdf', 'Tôi xin rút đơn vì đã nhận việc ở công ty khác.', 'WITHDRAWN', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('applications_id_seq', COALESCE((SELECT MAX(id) FROM applications), 1));

INSERT INTO application_status_history (id, application_id, from_status, to_status, actor_id, note, created_at)
VALUES
(1, 1, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển', NOW() - INTERVAL '3 days'),
(2, 2, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển', NOW() - INTERVAL '5 days'),
(3, 2, 'SUBMITTED', 'SCREENING', 2, 'HR bắt đầu sàng lọc hồ sơ', NOW() - INTERVAL '2 days'),
(4, 3, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ ứng tuyển', NOW() - INTERVAL '7 days'),
(5, 3, 'SUBMITTED', 'SCREENING', 2, 'HR thông qua hồ sơ', NOW() - INTERVAL '4 days'),
(6, 3, 'SCREENING', 'INTERVIEW', 2, 'Mời ứng viên tham gia phỏng vấn vòng 1', NOW() - INTERVAL '1 day'),
(7, 4, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ', NOW() - INTERVAL '10 days'),
(8, 4, 'SUBMITTED', 'SCREENING', 2, 'Duyệt hồ sơ', NOW() - INTERVAL '8 days'),
(9, 4, 'SCREENING', 'INTERVIEW', 2, 'Phỏng vấn kỹ thuật', NOW() - INTERVAL '3 days'),
(10, 4, 'INTERVIEW', 'OFFER', 2, 'Gửi thư mời nhận việc chính thức', NOW() - INTERVAL '12 hours'),
(11, 5, NULL, 'SUBMITTED', 1, 'Ứng viên nộp hồ sơ', NOW() - INTERVAL '15 days'),
(12, 5, 'SUBMITTED', 'WITHDRAWN', 1, 'Tôi xin rút đơn vì đã nhận việc ở công ty khác.', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('application_status_history_id_seq', COALESCE((SELECT MAX(id) FROM application_status_history), 1));
