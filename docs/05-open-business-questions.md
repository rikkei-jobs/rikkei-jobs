# 05 — Open Business Questions / Các Câu hỏi & Điểm Mơ hồ Nghiệp vụ

---

## Part 1: English Section

### Overview
During the in-depth architectural and specification analysis of the 7 project reference documents, the engineering team identified several functional ambiguities and specification gaps. This document presents 6 concrete business questions with citations, options, and architectural impacts to be reviewed and confirmed by the Product Owner and Team Lead.

---

### Question 1: Default Weighting Formula for Aggregate Competency Index
- **Citation**: `Rikkei Jobs — Rikkei Project.pdf` (Page 6, section "Cần chốt") & `Rikkei Jobs — Rikkei Project3.pdf` (Page 1, lines 31–34).
- **Context**: The specifications state that each skill index (0–100) is a weighted average of four primary evidence sources: LMS courses (grades, attendance, homework), Examination system results, IOC Internship project tasks, and Mentor assessment evaluations ("Chỉ số = trung bình có trọng số của các nguồn; trọng số do quản trị cấu hình, chốt ở DG-03"). However, the initial default weights among these 4 sources are not defined in the documentation.
- **Proposed Options**:
  - *Option A (Code Constants)*: Hardcode initial default weights in the application layer (e.g., LMS: 30%, Exams: 30%, IOC Internship: 20%, Mentor: 20%).
  - *Option B (Database Configuration Table)*: Introduce an `assessment_weights` table in the `assessment` module schema, allowing administrators to dynamically tune percentage weights via an administrative API without code redeployment.
  - *Option C (Category-Specific Weighting)*: Support dynamic weight profiles partitioned by skill category (e.g., higher weight on IOC for Practical Programming skills; higher weight on Mentor for Soft Skills).
- **Architectural Impact**: Affects database schema design for the `assessment` module and the implementation of the matching algorithm against Job Descriptions in subsequent sprints.

---

### Question 2: Inconsistency in Skill Level Band Definitions
- **Citation**: `Rikkei Jobs — Rikkei Project3.pdf` (Page 1, line 32) vs. `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Page 3, line 80) and `PROMPT_VONG1_EN.txt` (Section 2.2, item 5).
- **Context**: Project Document 3 specifies four level bands named: *"Cơ bản, Khá, Vững, Nâng cao"*. Conversely, the latest authoritative Mock Guide (issued 10/11/2026) and Sprint 1 prompt define the official bands as: *"0–39 Cơ bản, 40–69 Khá, 70–84 Tốt, 85–100 Xuất sắc"*.
- **Proposed Options**:
  - *Option A (Authoritative Precedence)*: Strictly adopt the 4 bands from the authoritative Mock Guide (`0–39 Cơ bản`, `40–69 Khá`, `70–84 Tốt`, `85–100 Xuất sắc`).
  - *Option B (Dual Alias Compatibility)*: Support localization aliases mapping internal codes (`BASIC`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`) to both terminology sets.
- **Architectural Impact**: Governs TypeScript frontend enums, UI badges, report generation, and unit test assertions.

---

### Question 3: First-Time Password Change Policy for HR Accounts
- **Citation**: `Rikkei Jobs — Rikkei Project1.pdf` (Page 2, lines 154–155) & `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Page 3, lines 84–85).
- **Context**: Document 1 dictates that HR accounts are provisioned by Staff and must be forced to change their password upon first login (*"Doanh nghiệp: tài khoản HR do cán bộ cấp. Bắt đổi mật khẩu lần đầu"*). However, in the development environment seed, `hr1@rikkeijobs.test` and `hr2@rikkeijobs.test` are provisioned with default password `Test@123` to facilitate immediate automated integration testing.
- **Proposed Options**:
  - *Option A*: Add a `must_change_password` boolean column to the `users` table. Seed dev accounts with `must_change_password = FALSE`, while accounts created via staff admin APIs default to `TRUE`.
  - *Option B*: Enforce password change for all HR accounts uniformly, requiring automated tests to execute a password reset flow immediately upon initial login.
- **Architectural Impact**: Modifies Flyway V1 schema for the `users` table and defines the authentication state machine for task `NT-01`.

---

### Question 4: Retention and Cleanup Strategy for Used SSO Tickets
- **Citation**: `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Pages 8–9, lines 368–388) & `Rikkei Jobs — Rikkei Project4.pdf` (Page 1, line 22).
- **Context**: The mock returns HTTP 200 on repeated calls. The backend must enforce single-use by recording used tickets in a `used_sso_tickets` table and rejecting tickets older than 60 seconds. In a production environment with thousands of daily student logins, unbounded growth of `used_sso_tickets` could impact query performance.
- **Proposed Options**:
  - *Option A (Periodic TTL Pruning)*: Deploy a scheduled cron job (`@Scheduled`) to purge tickets older than 24 hours (since tickets expire after 60 seconds, an expired ticket older than 24h cannot be accepted regardless).
  - *Option B (Permanent Audit Retention)*: Retain all ticket records indefinitely for compliance and login forensics, relying on a B-Tree index on `(ticket, issued_at)`.
- **Architectural Impact**: Affects index design on PostgreSQL and background task scheduling in the `identity` module.

---

### Question 5: Contact Information Visibility upon Application Withdrawal
- **Citation**: `Rikkei Jobs — Rikkei Project5.pdf` (Page 1, lines 7–12) & `Rikkei Jobs — Rikkei Project1.pdf` (Page 2, lines 89–96).
- **Context**: The policy mandates that candidate profiles are private by default, and HR cannot view email or phone numbers until the candidate applies to their JD or Staff explicitly approves access. If a candidate subsequently withdraws their job application or the JD is closed, does the employer retain visibility of the candidate's phone/email in historical records?
- **Proposed Options**:
  - *Option A (Dynamic Revocation)*: Contact details are dynamically masked the instant an application is withdrawn or deleted.
  - *Option B (Historical Snapshots)*: Employers retain contact info for applications already submitted and processed up to the point of withdrawal, serving legitimate recruiting audit trails.
- **Architectural Impact**: Determines whether authorization checks in `GET /api/v1/candidates/{id}` must evaluate dynamic application lifecycle states.

---

### Question 6: Synchronization Conflicts on Externally Overridden Evidence
- **Citation**: `Rikkei Jobs — Rikkei Project3.pdf` (Page 1, lines 23–30).
- **Context**: The spec states: *"Đồng bộ mỗi đêm và khi ứng viên mở hồ sơ; không ghi đè phần cán bộ đã sửa tay... Cán bộ: Bằng chứng thiếu ở nguồn, giá trị điều chỉnh, có lý do, lưu lịch sử"*. If an external LMS later corrects an erroneous course grade that had previously been manually overridden by Staff, how should the nightly sync handle the discrepancy?
- **Proposed Options**:
  - *Option A (Manual Lock Flag)*: Set a `manually_locked = true` flag on overridden records; the automated sync flags discrepancies for Staff review in an admin queue rather than updating automatically.
  - *Option B (Timestamp Precedence)*: Include a `source_updated_at` timestamp; if the upstream system updates the grade at a timestamp newer than the Staff manual override, accept the upstream correction.
- **Architectural Impact**: Defines the state attributes of the `profile_evidences` table and night-time sync error handling.

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### Tổng quan
Trong quá trình khảo sát chuyên sâu kiến trúc và đặc tả từ 7 tài liệu dự án, đội ngũ kỹ thuật đã phát hiện một số điểm mơ hồ và câu hỏi nghiệp vụ cần làm rõ. Tài liệu này tổng hợp 6 câu hỏi nghiệp vụ then chốt kèm trích dẫn văn bản, các phương án khả thi và đánh giá tác động kiến trúc để gửi Product Owner và Team Lead phê duyệt.

---

### Câu hỏi 1: Công thức và Trọng số Mặc định Tính Chỉ số Năng lực Tổng hợp
- **Trích dẫn**: `Rikkei Jobs — Rikkei Project.pdf` (Trang 6, mục "Cần chốt") & `Rikkei Jobs — Rikkei Project3.pdf` (Trang 1, dòng 31–34).
- **Ngữ cảnh**: Đặc tả quy định: *"Chỉ số = trung bình có trọng số của các nguồn; trọng số do quản trị cấu hình, chốt ở DG-03"*. Chỉ số kỹ năng (0–100) được tính từ 4 nguồn bằng chứng: Điểm môn LMS, Kết quả Khảo thí, Điểm nghiệm thu task thực tập IOC, và Phiếu đánh giá của Mentor. Tuy nhiên, tài liệu chưa định nghĩa tỷ lệ phần trăm mặc định ban đầu giữa 4 nguồn này.
- **Các phương án đề xuất**:
  - *Phương án A (Cố định ở tầng code)*: Đặt bộ trọng số mặc định ban đầu trong mã nguồn (ví dụ: LMS 30%, Khảo thí 30%, Thực tập 20%, Mentor 20%).
  - *Phương án B (Bảng cấu hình CSDL)*: Thiết kế bảng `assessment_weights` trong module `assessment`, cho phép Quản trị viên tùy chỉnh tỷ lệ phần trăm động qua API mà không cần deploy lại code.
  - *Phương án C (Cấu hình theo nhóm kỹ năng)*: Thiết lập các hồ sơ trọng số linh hoạt theo từng nhóm kỹ năng (kỹ năng thực hành lập trình ưu tiên điểm IOC; kỹ năng mềm ưu tiên đánh giá của Mentor).
- **Tác động kiến trúc**: Ảnh hưởng trực tiếp đến schema CSDL của module `assessment` và thuật toán tính điểm tương đồng (matching score) với JD ở các sprint sau.

---

### Câu hỏi 2: Sự Không Nhất quán trong Định nghĩa Bậc Kỹ năng (Level Bands)
- **Trích dẫn**: `Rikkei Jobs — Rikkei Project3.pdf` (Trang 1, dòng 32) đối chiếu với `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Trang 3, dòng 80) và `PROMPT_VONG1_EN.txt` (Mục 2.2, điều 5).
- **Ngữ cảnh**: Tài liệu dự án 3 quy định 4 bậc kỹ năng gồm: *"Cơ bản, Khá, Vững, Nâng cao"*. Ngược lại, Tài liệu Hướng dẫn Mock mới nhất (10/11/2026) và Prompt Vòng 1 lại chuẩn hóa: *"0–39 Cơ bản, 40–69 Khá, 70–84 Tốt, 85–100 Xuất sắc"*.
- **Các phương án đề xuất**:
  - *Phương án A (Tuân thủ tài liệu mới nhất)*: Áp dụng triệt để định nghĩa theo Tài liệu Mock hướng dẫn mới nhất (`0–39 Cơ bản`, `40–69 Khá`, `70–84 Tốt`, `85–100 Xuất sắc`) vì tài liệu này có thẩm quyền cao nhất.
  - *Phương án B (Ánh xạ song song)*: Hỗ trợ cấu hình ánh xạ linh hoạt giữa mã nội bộ (`BASIC`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`) với cả hai cách gọi hiển thị.
- **Tác động kiến trúc**: Thống nhất định dạng Enum trong TypeScript frontend, huy hiệu năng lực hiển thị và các bài test kiểm thử.

---

### Câu hỏi 3: Quy định Đổi Mật khẩu Lần đầu Đối với Tài khoản Doanh nghiệp (HR)
- **Trích dẫn**: `Rikkei Jobs — Rikkei Project1.pdf` (Trang 2, dòng 154–155) & `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Trang 3, dòng 84–85).
- **Ngữ cảnh**: Tài liệu 1 quy định: *"Doanh nghiệp: tài khoản HR do cán bộ cấp. Bắt đổi mật khẩu lần đầu"*. Tuy nhiên trong môi trường dev, 2 tài khoản mẫu `hr1@rikkeijobs.test` và `hr2@rikkeijobs.test` được seed sẵn với mật khẩu `Test@123` để phục vụ kiểm thử tích hợp tự động.
- **Các phương án đề xuất**:
  - *Phương án A*: Bổ sung cột boolean `must_change_password` vào bảng `users`. Tài khoản seed môi trường dev đặt giá trị `FALSE`, trong khi tài khoản do cán bộ cấp sau này mặc định là `TRUE`.
  - *Phương án B*: Bắt buộc toàn bộ tài khoản HR phải đổi mật khẩu, đòi hỏi kịch bản test tự động phải thực hiện luồng đổi mật khẩu ngay sau khi login lần đầu.
- **Tác động kiến trúc**: Định hình migration Flyway V1 cho bảng `users` và luồng xác thực của task `NT-01`.

---

### Câu hỏi 4: Chính sách Lưu trữ và Dọn dẹp Vé SSO Đã Sử dụng (`used_sso_tickets`)
- **Trích dẫn**: `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Trang 8–9, dòng 368–388) & `Rikkei Jobs — Rikkei Project4.pdf` (Trang 1, dòng 22).
- **Ngữ cảnh**: Mock trả về HTTP 200 cho mọi vé. Backend Rikkei Jobs có trách nhiệm lưu vé vào bảng `used_sso_tickets` và chặn nếu vé đã dùng hoặc quá 60 giây. Trong môi trường thực tế với hàng nghìn sinh viên đăng nhập mỗi ngày, bảng `used_sso_tickets` sẽ tăng trưởng liên tục.
- **Các phương án đề xuất**:
  - *Phương án A (Dọn dẹp định kỳ sau 24h)*: Thiết lập tác vụ ngầm định kỳ (`@Scheduled`) xóa các vé có thời gian tạo quá 24 giờ (vì vé hết hạn sau 60s nên vé cũ sau 24h chắc chắn không thể tái sử dụng).
  - *Phương án B (Lưu vĩnh viễn)*: Lưu trữ toàn bộ vé vĩnh viễn để phục vụ đối soát an ninh, đánh chỉ mục B-Tree trên cặp `(ticket, issued_at)`.
- **Tác động kiến trúc**: Quyết định cấu trúc chỉ mục trên PostgreSQL và nhu cầu xây dựng tác vụ dọn dẹp nền trong module `identity`.

---

### Câu hỏi 5: Quyền Xem Thông tin Liên hệ Khi Ứng viên Rút Đơn Ứng tuyển
- **Trích dẫn**: `Rikkei Jobs — Rikkei Project5.pdf` (Trang 1, dòng 7–12) & `Rikkei Jobs — Rikkei Project1.pdf` (Trang 2, dòng 89–96).
- **Ngữ cảnh**: Quy định nêu rõ: *"Hồ sơ mặc định riêng tư... Doanh nghiệp không thấy email, số điện thoại cho tới khi ứng viên ứng tuyển JD của họ, hoặc cán bộ duyệt mở liên hệ"*. Nếu ứng viên sau đó quyết định rút đơn ứng tuyển (withdraw application) hoặc JD bị đóng lại, doanh nghiệp đó có quyền tiếp tục thấy email/SĐT trong danh sách lịch sử hay không?
- **Các phương án đề xuất**:
  - *Phương án A (Che lại tức thì)*: Thông tin liên hệ ngay lập tức bị che (mask) trở lại khi đơn ứng tuyển bị rút hoặc hủy.
  - *Phương án B (Giữ quyền lịch sử)*: Doanh nghiệp vẫn được xem thông tin liên hệ của các đơn ứng tuyển đã nộp thành công trong quá khứ nhằm bảo đảm tính liên tục của quy trình tuyển dụng.
- **Tác động kiến trúc**: Xác định logic kiểm tra quyền trong API xem chi tiết ứng viên (`GET /api/v1/candidates/{id}`).

---

### Câu hỏi 6: Xử lý Bất đồng bộ Khi Điểm Nguồn Bên Ngoài Thay Đổi Sau Khi Cán Bộ Đã Sửa Tay
- **Trích dẫn**: `Rikkei Jobs — Rikkei Project3.pdf` (Trang 1, dòng 23–30).
- **Ngữ cảnh**: Tài liệu quy định: *"Đồng bộ mỗi đêm và khi ứng viên mở hồ sơ; không ghi đè phần cán bộ đã sửa tay... Cán bộ: Bằng chứng thiếu ở nguồn, giá trị điều chỉnh, có lý do, lưu lịch sử"*. Trong trường hợp cán bộ sửa tay một điểm môn vì LMS gặp sự cố; sau đó LMS chính thức cập nhật điểm đúng. Làm thế nào hệ thống phân biệt được dữ liệu mới từ LMS là bản cập nhật hợp lệ hay là dữ liệu cũ bị ghi đè?
- **Các phương án đề xuất**:
  - *Phương án A (Khóa thủ công)*: Đánh dấu cờ `manually_locked = true` cho bản ghi; khi tiến trình đồng bộ ban đêm phát hiện sai khác, hệ thống sẽ đưa vào hàng đợi cảnh báo cho Cán bộ duyệt thay vì tự động ghi đè.
  - *Phương án B (Dựa vào mốc thời gian)*: Lưu trường `source_updated_at`; nếu thời điểm cập nhật tại LMS mới hơn thời điểm cán bộ sửa tay, hệ thống sẽ cho phép ghi nhận dữ liệu mới.
- **Tác động kiến trúc**: Định hình cấu trúc bảng `profile_evidences` và logic nghiệp vụ của tiến trình đồng bộ dữ liệu ban đêm.
