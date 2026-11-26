-- Migration V24: Dev Seed for Interview Rounds (UT-02)
-- Only loaded in 'dev' profile. Runs after V22 (applications) and V23 (interview_rounds).
-- Seeds interview rounds for applications 3 (INTERVIEW), 4 (OFFER), 5 (HIRED), and 6 (REJECTED).
-- Intentionally leaves applications 1 (SUBMITTED), 2 (SCREENING, used by UT-01 E2E), and 7 (WITHDRAWN) without rounds.

INSERT INTO interview_rounds (
    id,
    application_id,
    round_no,
    name,
    interviewer_email,
    scheduled_at,
    result,
    score,
    note,
    version,
    created_at,
    updated_at
)
VALUES
    (1, 3, 1, 'Vòng 1: Phỏng vấn chuyên môn Java', 'tech-lead@rikkeisoft.test', NOW() - INTERVAL '2 days', 'PASS', 85.00, 'Ứng viên nắm vững Java Core, Spring Boot và thiết kế API.', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
    (2, 3, 2, 'Vòng 2: Phỏng vấn kiến trúc hệ thống', 'architect@rikkeisoft.test', NOW() + INTERVAL '2 days', 'PENDING', NULL, 'Đã gửi lịch phỏng vấn vòng 2.', 0, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (3, 4, 1, 'Vòng 1: Đánh giá kỹ thuật Backend', 'lead-backend@vti.test', NOW() - INTERVAL '6 days', 'PASS', 88.50, 'Tư duy thiết kế CSDL và tối ưu truy vấn tốt.', 1, NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
    (4, 4, 2, 'Vòng 2: Phỏng vấn quản lý kỹ thuật', 'em@vti.test', NOW() - INTERVAL '2 days', 'PASS', 91.00, 'Phù hợp định hướng nhóm và kỹ năng phối hợp tốt.', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
    (5, 5, 1, 'Vòng 1: Phỏng vấn Frontend ReactJS', 'fe-lead@cmcglobal.test', NOW() - INTERVAL '11 days', 'PASS', 90.00, 'Kiến thức ReactJS, TypeScript và khả năng tối ưu UI xuất sắc.', 1, NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'),
    (6, 6, 1, 'Vòng 1: Phỏng vấn Fullstack', 'reviewer@nashtech.test', NOW() - INTERVAL '13 days', 'FAIL', 42.50, 'Kinh nghiệm triển khai dự án thực tế chưa đạt ngưỡng yêu cầu.', 1, NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('interview_rounds_id_seq', COALESCE((SELECT MAX(id) FROM interview_rounds), 1));
