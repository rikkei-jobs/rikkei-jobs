# 04 — Security & Secrets Policy / Chính sách An toàn Thông tin & Quản trị Bí mật

---

## Part 1: English Section

### 1. Zero Real Secrets Policy

The security of Rikkei Jobs is built on the strict enforcement of the **Zero Real Secrets Policy**:

- **No Production Secrets in Git**: No real cryptographic keys, database passwords, private certificates, production API tokens, or OAuth secrets may ever be committed to the git repository.
- **Pre-Commit Verification**: Contributors must inspect git diffs prior to submission. Automated CI linters scan the repository for high-entropy strings and common credential patterns.
- **Compromise Remediation**: Any credential accidentally committed to git—regardless of whether the commit was pushed—must be treated as compromised immediately and revoked at the source.

---

### 2. Environment Variables & Secret Configuration

- **`.env.example` as the Blueprint**: The committed `.env.example` file contains safe development placeholders and self-documenting defaults (e.g., `EXTERNAL_SERVICE_KEY=dev-key`, `POSTGRES_PASSWORD=rikkei_secret`).
- **`.env` Exclusion**: The `.env` file containing local execution settings is strictly listed in `.gitignore` and must never be tracked by version control.
- **Service Key Boundary**:
  - The shared service key (`X-Service-Key: dev-key`) authorizes backend-to-mock machine communications.
  - This key is strictly confined to the backend server and mock service.
  - The service key MUST NEVER be injected into frontend code or exposed in public environment files (such as `VITE_*`).
  - The Nginx reverse proxy configuration explicitly forbids proxying `/mock` or `/lms` routes directly to browser clients.

---

### 3. API Security & Role-Based Access Control (RBAC)

- **Default Deny Strategy**: The Spring Security layer enforces a default-deny posture. All API routes under `/api/v1/**` require a valid JWT Bearer token, except for explicitly whitelisted public endpoints:
  - `GET /api/v1/health` (Health verification)
  - `GET /v3/api-docs/**` and `GET /swagger-ui/**` (Enabled only in `dev` profile)
- **Unauthenticated Handling**: Any request attempting to access protected resources without an Authorization header or with an invalid token returns HTTP `401 Unauthorized` with the standard error body:

  ```json
  {
    "code": "UNAUTHORIZED",
    "message": "Yêu cầu xác thực tài khoản"
  }
  ```

- **Role Permissions (5 Roles)**:
  - `CANDIDATE`: Manages personal profile, submits applications, views own gap analysis.
  - `HR`: Manages company JD postings, searches public candidates, creates offers.
  - `MENTOR`: Submits assessment forms, records interview technical feedback.
  - `STAFF`: Approves candidate profiles, approves enterprise JDs, unlocks contact info.
  - `ADMIN`: System configuration, audit logs, 20 skills catalogue management.

---

### 4. Data Privacy, PII Protection & Audit Immutability

In accordance with Project Document 5 (Privacy & Security):

1. **Default Privacy**: Candidate skill profiles are **private by default**. Profiles are hidden from general search until the candidate explicitly toggles public consent. Candidates retain the legal right to revoke public consent at any moment.
2. **Contact Masking**: Personal Identifiable Information (PII)—specifically email addresses and telephone numbers—are strictly masked from HR views until:
   - The candidate submits a direct job application for that company's JD, OR
   - A Staff member explicitly approves contact information unlocking for that specific enterprise.
3. **AI PII Sanitization**: Before passing candidate resumes or profile text to external LLMs (Google Gemini), all direct identifiers (full name, phone, email, home address) must be redacted or sanitized.
4. **Immutable Audit Trail**: All evidence modifications, manual score overrides by Staff, and permission state changes must be appended to an immutable audit log recording: actor ID, timestamp, original value, modified value, and mandatory business justification.

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### 1. Chính sách Tuyệt đối Không đưa Bí mật vào Git (Zero Real Secrets)

An ninh của nền tảng Rikkei Jobs được xây dựng dựa trên nguyên tắc **Zero Real Secrets**:

- **Cấm đưa thông tin nhạy cảm thật vào Git**: Tuyệt đối không lưu trữ khóa mật mã thật, mật khẩu cơ sở dữ liệu thật, chứng chỉ riêng tư, token API môi trường production hoặc mã bí mật OAuth trong mã nguồn hoặc lịch sử commit.
- **Rà soát trước khi đóng góp mã nguồn**: Lập trình viên có trách nhiệm kiểm tra `git diff` trước khi tạo PR. Hệ thống CI sẽ tự động quét phát hiện các chuỗi có độ hỗn loạn entropy cao hoặc các mẫu định dạng khóa bí mật.
- **Quy trình xử lý khi lộ bí mật**: Bất kỳ thông tin nhạy cảm nào bị vô tình commit vào git—bất kể nhánh đã được push lên máy chủ hay chưa—đều phải coi là đã bị xâm phạm và phải thu hồi/đổi mới lập tức tại hệ thống gốc.

---

### 2. Quản lý Biến Môi trường & Ranh giới Khóa Dịch vụ

- **`.env.example` làm tài liệu chuẩn**: Tệp `.env.example` được lưu trong Git chỉ chứa các giá trị giả lập an toàn phục vụ môi trường dev cục bộ (ví dụ: `EXTERNAL_SERVICE_KEY=dev-key`, `POSTGRES_PASSWORD=rikkei_secret`).
- **Cô lập tệp `.env` thực tế**: Tệp `.env` cấu hình môi trường thực tế bắt buộc phải nằm trong `.gitignore` và không bao giờ được đưa lên hệ thống quản lý phiên bản.
- **Ranh giới Bảo vệ Khóa Dịch vụ (Service Key)**:
  - Khóa dịch vụ (`X-Service-Key: dev-key`) được dùng cho giao tiếp nội bộ giữa Backend và dịch vụ Mock.
  - Khóa này tuyệt đối chỉ nằm trong cấu hình của Backend và Mock server.
  - Nghiêm cấm đưa khóa này vào mã nguồn Frontend hoặc các biến môi trường trình duyệt (`VITE_*`).
  - Máy chủ web Nginx cấu hình tuyệt đối không chuyển tiếp các route nội bộ `/mock` hay `/lms` ra ngoài internet.

---

### 3. Kiểm soát Truy cập Dựa trên Vai trò (RBAC) & Bảo mật API

- **Chiến lược Từ chối Mặc định (Default Deny)**: Tầng Spring Security áp dụng quy tắc đóng toàn bộ các API `/api/v1/**`, ngoại trừ các endpoint công khai được chỉ định rõ:
  - `GET /api/v1/health` (Kiểm tra sức khỏe hệ thống)
  - `GET /v3/api-docs/**` và `GET /swagger-ui/**` (Chỉ kích hoạt trên profile `dev`)
- **Xử lý Khi Chưa Xác thực**: Bất kỳ yêu cầu nào không có header Authorization hợp lệ đều bị chặn và trả về HTTP `401 Unauthorized` kèm cấu trúc JSON chuẩn:

  ```json
  {
    "code": "UNAUTHORIZED",
    "message": "Yêu cầu xác thực tài khoản"
  }
  ```

- **Phân quyền 5 Vai trò**:
  - `CANDIDATE`: Quản lý hồ sơ cá nhân, nộp đơn ứng tuyển, xem phân tích thiếu hụt kỹ năng.
  - `HR`: Quản lý tin tuyển dụng JD, tìm kiếm ứng viên công khai, gửi offer phỏng vấn.
  - `MENTOR`: Điền phiếu đánh giá năng lực, chấm điểm chuyên môn phỏng vấn.
  - `STAFF`: Xét duyệt hồ sơ năng lực, phê duyệt JD của doanh nghiệp, mở thông tin liên hệ.
  - `ADMIN`: Quản trị hệ thống, danh mục 20 kỹ năng, xem nhật ký kiểm toán (audit log).

---

### 4. Quyền Riêng tư Dữ liệu, Bảo vệ PII & Nhật ký Bất biến

Theo quy định tại Tài liệu dự án 5 (Bảo mật & Quyền riêng tư):

1. **Hồ sơ mặc định riêng tư**: Hồ sơ Skill Profile của ứng viên mặc định ở chế độ riêng tư (private). Hồ sơ chỉ xuất hiện trên danh sách tìm kiếm khi ứng viên chủ động kích hoạt đồng ý công khai. Ứng viên có quyền rút lại sự đồng ý này bất cứ lúc nào.
2. **Che giấu thông tin liên hệ (PII Masking)**: Doanh nghiệp không thể nhìn thấy địa chỉ email và số điện thoại của ứng viên cho đến khi:
   - Ứng viên chủ động nộp hồ sơ vào tin tuyển dụng JD của chính doanh nghiệp đó, HOẶC
   - Cán bộ tuyển dụng (Staff) phê duyệt cấp quyền mở liên hệ cho doanh nghiệp đó.
3. **Khử định danh trước khi gửi tới AI**: Trước khi chuyển hồ sơ ứng viên qua mô hình AI (Google Gemini), toàn bộ thông tin định danh cá nhân (họ tên, email, số điện thoại, địa chỉ) phải được che giấu hoặc làm sạch.
4. **Nhật ký Kiểm toán Bất biến (Immutable Audit Log)**: Mọi thao tác chỉnh sửa bằng chứng, điều chỉnh điểm số thủ công của cán bộ đều phải được ghi lại vĩnh viễn kèm theo: định danh người thực hiện, thời gian, giá trị cũ, giá trị mới và lý do nghiệp vụ bắt buộc.
