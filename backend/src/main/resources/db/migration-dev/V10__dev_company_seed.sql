-- Migration V10: Dev Seed for Company Profile Module (DN-01)
-- Active Profile: dev
-- Seeds companies 1 and 2 matching hr1@rikkeijobs.test (company_id = 1) and hr2@rikkeijobs.test (company_id = 2).
-- Cross-module reference: created_by = 7 (staff1@rikkeijobs.test). Total dev users remain strictly 9.

INSERT INTO companies (
    id,
    name,
    tax_code,
    industry,
    size,
    address,
    city,
    website,
    logo_url,
    description,
    status,
    created_by
)
OVERRIDING SYSTEM VALUE
VALUES
    (
        1,
        'Công ty Cổ phần Công nghệ Nam Phương',
        '0109283746',
        'Công nghệ thông tin',
        '51-200',
        'Tầng 8, Tòa nhà Sông Đà, Đường Phạm Hùng, Quận Nam Từ Liêm',
        'Hà Nội',
        'https://company-a.rikkeijobs.test',
        NULL,
        'Doanh nghiệp phát triển nền tảng phần mềm, dịch vụ đám mây và giải pháp dữ liệu cho khách hàng doanh nghiệp tại Việt Nam.',
        'ACTIVE',
        7
    ),
    (
        2,
        'Công ty Cổ phần Giải pháp Số Đông Dương',
        '0314829105001',
        'Phát triển phần mềm',
        '201-1000',
        'Số 120 Đường Nguyễn Thị Minh Khai, Quận 3',
        'Thành phố Hồ Chí Minh',
        'https://company-b.rikkeijobs.test',
        NULL,
        'Đơn vị tư vấn chuyển đổi số, xây dựng ứng dụng web, di động và đào tạo kỹ sư phần mềm trẻ trên toàn quốc.',
        'ACTIVE',
        7
    )
ON CONFLICT DO NOTHING;

SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1));
