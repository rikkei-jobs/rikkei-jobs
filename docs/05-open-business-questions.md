# 05 — Open Business Questions / Các Câu hỏi & Điểm Mơ hồ Nghiệp vụ

---

## Part 1: English Section

### Overview

During the in-depth architectural and specification analysis of the project reference documents and the implementation of Task NT-01 (Authentication & Authorization, code T022B63), the engineering team identified several functional ambiguities and specification gaps. This document presents 11 concrete business questions organized into two sections:

- **Section A**: General Architecture & External System Mock Questions (Questions 1–6)
- **Section B**: Task NT-01 Authentication, Multi-Tenancy & Security Lifecycle Questions (Questions 7–11)

All questions include citations, context, proposed options, and architectural impacts for review and confirmation by the Product Owner and Team Lead.

---

### Section A: General Architecture & External System Mock Questions

#### Question 1: Default Weighting Formula for Aggregate Competency Index

- **Citation**: `Rikkei Jobs — Rikkei Project.pdf` (Page 6, Section "Cần chốt") & `Rikkei Jobs — Rikkei Project3.pdf` (Page 1, Section "Chỉ số năng lực" and Section "Bằng chứng").
- **Context**: The specifications state that each skill index (0–100) is a weighted average of four primary evidence sources: LMS courses (grades, attendance, homework), Examination system results, IOC Internship project tasks, and Mentor assessment evaluations ("Chỉ số = trung bình có trọng số của các nguồn; trọng số do quản trị cấu hình, chốt ở DG-03"). However, the initial default weights among these 4 sources are not defined in the documentation.
- **Proposed Options**:
  - *Option A (Code Constants)*: Hardcode initial default weights in the application layer (e.g., LMS: 30%, Exams: 30%, IOC Internship: 20%, Mentor: 20%).
  - *Option B (Database Configuration Table)*: Introduce an `assessment_weights` table in the `assessment` module schema, allowing administrators to dynamically tune percentage weights via an administrative API without code redeployment.
  - *Option C (Category-Specific Weighting)*: Support dynamic weight profiles partitioned by skill category (e.g., higher weight on IOC for Practical Programming skills; higher weight on Mentor for Soft Skills).
- **Architectural Impact**: Affects database schema design for the `assessment` module and the implementation of the matching algorithm against Job Descriptions in subsequent sprints.

---

#### Question 2: Inconsistency in Skill Level Band Definitions

- **Citation**: `Rikkei Jobs — Rikkei Project3.pdf` (Page 1, Section "Chỉ số năng lực") vs. `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Page 3, Section 2 "Dữ liệu mẫu dùng chung").
- **Context**: Project Document 3 specifies four level bands named: *"Cơ bản, Khá, Vững, Nâng cao"*. Conversely, the latest authoritative Mock Guide (issued 10/11/2026) defines the official bands as: *"0–39 Cơ bản, 40–69 Khá, 70–84 Tốt, 85–100 Xuất sắc"*.
- **Proposed Options**:
  - *Option A (Authoritative Precedence)*: Strictly adopt the 4 bands from the authoritative Mock Guide (`0–39 Cơ bản`, `40–69 Khá`, `70–84 Tốt`, `85–100 Xuất sắc`).
  - *Option B (Dual Alias Compatibility)*: Support localization aliases mapping internal codes (`BASIC`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`) to both terminology sets.
- **Architectural Impact**: Governs TypeScript frontend enums, UI badges, report generation, and unit test assertions.

---

#### Question 3: First-Time Password Change Policy for HR Accounts

- **Citation**: `Rikkei Jobs — Rikkei Project1.pdf` (Page 2, Section "Đăng nhập") & `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Page 3, Section 2 "Dữ liệu mẫu dùng chung").
- **Context**: Document 1 dictates that HR accounts are provisioned by Staff and must be forced to change their password upon first login (*"Doanh nghiệp: tài khoản HR do cán bộ cấp. Bắt đổi mật khẩu lần đầu"*). However, in the development environment seed, `hr1@rikkeijobs.test` and `hr2@rikkeijobs.test` are provisioned with default password `Test@123` to facilitate immediate automated integration testing.
- **Proposed Options**:
  - *Option A*: Add a `must_change_password` boolean column to the `users` table. Seed dev accounts with `must_change_password = FALSE`, while accounts created via staff admin APIs default to `TRUE`.
  - *Option B*: Enforce password change for all HR accounts uniformly, requiring automated tests to execute a password reset flow immediately upon initial login.
- **Architectural Impact**: Modifies Flyway V1 schema for the `users` table and defines the authentication state machine for task `NT-01`.

---

#### Question 4: Candidate Matching Score Calculation and Ineligibility Rules for Missing Mandatory Job Skills

- **Citation**: `Rikkei Jobs — Rikkei Project3.pdf` (Page 2, Section "Điểm khớp với JD" and Section "Khoảng thiếu hụt") & `Rikkei Jobs — Rikkei Project2.pdf` (Page 1, Section "Ứng tuyển").
- **Context**: The specification mandates: *"JD khai kỹ năng bắt buộc và ưu tiên, mỗi kỹ năng có mức tối thiểu. Điểm khớp 0–100; thiếu một kỹ năng bắt buộc thì ghi rõ, không ẩn"*. However, the documents do not define whether lacking a mandatory skill caps/nullifies the total matching score or merely triggers a separate warning flag.
- **Proposed Options**:
  - *Option A (Hard Ineligibility Gate)*: The matching score is either forced to 0% or an `INELIGIBLE` status is assigned, segregating the candidate into a non-qualified group to alert HR immediately.
  - *Option B (Penalty Factor)*: The matching score is calculated across remaining skills but penalized by a severe deduction (e.g., 30–50% reduction of overall score) alongside an explicit red badge `Missing Mandatory Skills`.
  - *Option C (Independent Two-Tier Indicator)*: The numerical skill match score is computed independently (e.g., 75%), displayed in parallel with a distinct mandatory requirement fulfillment indicator (e.g., `Mandatory Skills: 2/3 passed`).
- **Architectural Impact**: Determines the matching calculation algorithm in the `recruitment`/`job` module, matching score schema attributes, and candidate filtering rules for the employer portal in Sprint 3.

---

#### Question 5: Contact Information Visibility upon Application Withdrawal

- **Citation**: `Rikkei Jobs — Rikkei Project5.pdf` (Page 1, Section 5 "Quyền riêng tư và an toàn dữ liệu") & `Rikkei Jobs — Rikkei Project1.pdf` (Page 1, Table "Việc" & Page 2, Row "Thấy email, điện thoại ứng viên").
- **Context**: The policy mandates that candidate profiles are private by default, and HR cannot view email or phone numbers until the candidate applies to their JD or Staff explicitly approves access. If a candidate subsequently withdraws their job application or the JD is closed, does the employer retain visibility of the candidate's phone/email in historical records?
- **Proposed Options**:
  - *Option A (Dynamic Revocation)*: Contact details are dynamically masked the instant an application is withdrawn or deleted.
  - *Option B (Historical Snapshots)*: Employers retain contact info for applications already submitted and processed up to the point of withdrawal, serving legitimate recruiting audit trails.
- **Architectural Impact**: Determines whether authorization checks in `GET /api/v1/candidates/{id}` must evaluate dynamic application lifecycle states.

---

#### Question 6: Synchronization Conflicts on Externally Overridden Evidence

- **Citation**: `Rikkei Jobs — Rikkei Project3.pdf` (Page 1, Section "Bằng chứng" and Section "Chỉ số năng lực").
- **Context**: The spec states: *"Đồng bộ mỗi đêm và khi ứng viên mở hồ sơ; không ghi đè phần cán bộ đã sửa tay... Cán bộ: Bằng chứng thiếu ở nguồn, giá trị điều chỉnh, có lý do, lưu lịch sử"*. If an external LMS later corrects an erroneous course grade that had previously been manually overridden by Staff, how should the nightly sync handle the discrepancy?
- **Proposed Options**:
  - *Option A (Manual Lock Flag)*: Set a `manually_locked = true` flag on overridden records; the automated sync flags discrepancies for Staff review in an admin queue rather than updating automatically.
  - *Option B (Timestamp Precedence)*: Include a `source_updated_at` timestamp; if the upstream system updates the grade at a timestamp newer than the Staff manual override, accept the upstream correction.
- **Architectural Impact**: Defines the state attributes of the `profile_evidences` table and night-time sync error handling.

---

### Section B: Task NT-01 — Authentication, Multi-Tenancy & Security Lifecycle Questions

#### Question 7: LMS SSO Role Mapping and Lifecycle Synchronization

- **Citation**: `PROMPT_NT01_EN.txt` (Section R4 "Backend Authentication APIs & Security"), `PROJECT.md` (Feature 6 "Role Preservation & Mapping"), and `mock-contract.md` (Section "LMS Verification Contract").
- **Context**: During LMS Single Sign-On (`POST /api/v1/auth/sso`), the external mock LMS returns a verified user profile with a `mockRole` (e.g., `CANDIDATE`, `MENTOR`, `STAFF`). On initial login, Rikkei Jobs automatically provisions an account in the `users` table and maps the LMS role to one of the 5 system roles (`CANDIDATE`, `MENTOR`, `STAFF`, `HR`, `ADMIN`). However, the specifications do not define how subsequent logins should handle role discrepancies if the user's role is modified in LMS (e.g., a candidate transitions to a mentor or staff member) or if a Rikkei Jobs administrator manually grants escalated privileges.
- **Proposed Options**:
  - *Option A (Authoritative LMS Master Synchronization)*: On every successful SSO login, Rikkei Jobs overwrites the local `users.role_id` with the current role reported by LMS. If an LMS user is demoted or transferred, their permissions in Rikkei Jobs immediately align on the next login.
  - *Option B (Initial Provisioning Only)*: The LMS role is applied strictly upon first account creation. Subsequent role adjustments, privilege grants, or department transfers must be managed exclusively within Rikkei Jobs by an internal Administrator, preventing external identity providers from silently overwriting local authorization rules.
  - *Option C (Hybrid with Administrative Lock)*: Support an `is_role_overridden` flag. External LMS updates synchronize automatically unless a local Administrator has explicitly pinned or modified the user's role in Rikkei Jobs.
- **Authoritative Resolution (Round B / Defect B2)**: Option B is formally adopted. Role from LMS is applied strictly during first-time provisioning for mapped roles (`CANDIDATE`, `MENTOR`, `STAFF`, `ADMIN`). On subsequent SSO logins, the user's internal role in Rikkei Jobs is strictly preserved without overwrite. Unmapped LMS roles or `HR` are rejected with HTTP 401 `UNMAPPED_LMS_ROLE`.
- **Architectural Impact**: Affects `AuthServiceImpl.verifySso()` business logic, audit logging requirements for privilege escalation/demotion, and user session revocation if roles change dynamically.

---

#### Question 8: Password Reset Token Expiration, Rate Limiting & Anti-Enumeration

- **Citation**: `PROMPT_NT01_EN.txt` (Section R4 "Backend Authentication APIs & Security"), `PROJECT.md` (Features 14 & 15), and OWASP ASVS v4.0.3 (Section V2.5 Credential Recovery).
- **Context**: The forgot-password endpoint (`POST /api/v1/auth/forgot-password`) issues a cryptographically secure 256-bit token with a 30-minute validity window stored as a SHA-256 hash in the `password_reset_tokens` table. To comply with anti-enumeration principles, the endpoint uniformly responds with HTTP 200 regardless of whether the submitted email exists in the database. However, without explicit rate-limiting and token invalidation policies, malicious actors could flood the Mailpit/SMTP relay or repeatedly request tokens for a targeted user account.
- **Proposed Options**:
  - *Option A (Single Active Token with Invalidation & Rate Limit)*: Requesting a new password reset immediately invalidates all previous unexpired, unused tokens for that user account. Apply a sliding window rate-limit (e.g., maximum 3 requests per 15 minutes per IP/email) using a filter or Redis bucket.
  - *Option B (Coexisting Tokens with First-Wins Invalidation)*: Allow multiple reset links generated within the 30-minute window to coexist, but the instant any token is consumed via `POST /api/v1/auth/reset-password`, all other outstanding tokens for that user are immediately marked as used/invalidated.
  - *Option C (Cooldown Throttle)*: Enforce a strict 60-second cooldown period between successive reset requests for the same email address, returning HTTP 429 `TOO_MANY_REQUESTS` if violated.
- **Architectural Impact**: Governs `PasswordResetTokenRepository` query semantics, scheduled cleanup tasks for expired token rows, and API gateway rate-limiting configuration.

---

#### Question 9: Company-Level Multi-Tenancy Scoping & Cross-Tenant Data Isolation

- **Citation**: `PROMPT_NT01_EN.txt` (Section R3 "Database Migrations" & Section R4 "Backend Authentication APIs & Security"), `PROJECT.md` (Features 4 & 10).
- **Context**: Migration V5 introduces `company_id` as a scalar `BIGINT` column in `users` (without cross-module foreign key constraints to preserve modular monolith boundaries). The JWT claims payload embeds `companyId` for HR enterprise accounts. However, subsequent business requirements have not defined how multi-tenancy should be enforced when multiple HR users belong to the same enterprise, or whether HR users can belong to multiple subsidiaries or transition between companies.
- **Proposed Options**:
  - *Option A (Scalar Single-Company Association)*: Keep `users.company_id` strictly scalar (one company per HR user). All downstream enterprise queries (job postings, applicant tracking, interview management) apply a tenant filter based on `companyId` extracted from the verified JWT.
  - *Option B (Multi-Company Membership Table)*: Move company association to a dedicated `company_members` join table in the enterprise module, allowing HR recruiters to hold distinct permissions (`HR_ADMIN`, `RECRUITER`, `VIEWER`) across multiple sister companies or corporate subsidiaries.
  - *Option C (Tenant Context Interceptor)*: Enforce tenant isolation transparently at the ORM layer using Hibernate filters or dynamic SQL predicates (`company_id = :currentTenant`) to eliminate the risk of accidental cross-tenant data leaks.
- **Architectural Impact**: Affects future enterprise schema designs, Spring Security method-level authorization (`@PreAuthorize("@securityService.isCompanyMember(...)")`), and JWT claim structures.

---

#### Question 10: Inactive vs. Locked User Status Lifecycle & Administrative Unban Workflows

- **Citation**: `PROMPT_NT01_EN.txt` (Section R3 "Database Migrations" & Section R4 "Backend Authentication APIs & Security"), `PROJECT.md` (Feature 11 "Account Lockout Mechanism").
- **Context**: Database migration V5 defines a database constraint `CHECK (status IN ('ACTIVE', 'LOCKED'))`, while runtime brute-force defense tracks `failed_login_count` and sets `locked_until` (15 minutes upon 5 consecutive failed login attempts). In addition, completing a password reset clears the lockout. However, the system currently lacks a clean separation between an automated temporary security lockout (due to transient brute-force attempts) and an administrative suspension/ban (e.g., employee offboarding, terms of service violation, or deactivated HR account).
- **Proposed Options**:
  - *Option A (Explicit Status Lifecycle Extension)*: Expand the `status` enum to `ACTIVE`, `TEMPORARILY_LOCKED`, `SUSPENDED`, and `INACTIVE`. Automatic 15-minute lockouts or password resets only toggle `TEMPORARILY_LOCKED` back to `ACTIVE`. A `SUSPENDED` or `INACTIVE` account can strictly be restored by an authorized Administrator via a dedicated admin API.
  - *Option B (Orthogonal Fields: Status vs. Lockout)*: Restrict `status` to administrative lifecycle states (`ACTIVE`, `INACTIVE`), while treating account lockout exclusively as a transient temporal state governed by `locked_until > NOW()`. Under this model, an administratively deactivated account (`status = 'INACTIVE'`) can never bypass suspension via password reset.
  - *Option C (Administrative Override with Audit Trail)*: Retain `ACTIVE` and `LOCKED`, but introduce an `administrative_lock` boolean flag and an audit log table recording the administrator ID, reason, and timestamp for account suspensions.
- **Architectural Impact**: Determines the state machine transitions in `AuthServiceImpl`, the SQL schema for user status constraints, and administrative user management endpoints in upcoming milestones.

---

#### Question 11: Role-Scoping Policy for Skill Profile Feature (HS-01 / NT-01 Round F)

- **Citation**: `docs/hs-01-skill-profile.md` (Section "Quyền truy cập & Phân quyền"), `PROMPT_NT01F_EN.txt` (Section R2 / F1), and `SkillProfileController.java`.
- **Context**: Currently, the Skill Profile endpoints (`GET /api/v1/profiles/me/skills`, `GET /api/v1/profiles/{userId}/skills`, and `POST /api/v1/profiles/me/skills/recompute`) only require authentication (`@AuthenticationPrincipal UserPrincipal user`), without role enforcement such as `@PreAuthorize("hasRole('CANDIDATE')")`. As a result, users with any system role (`HR`, `ADMIN`, `MENTOR`, `STAFF`) can theoretically access or recompute a personal skill profile. However, the business specifications (HS-01) focus entirely on candidate competencies derived from LMS, Exam, and Project records; employer HR accounts should not logically own candidate skill profiles.
- **Proposed Options**:
  - *Option A (Strict Candidate Scoping)*: Restrict ownership and recomputation of skill profiles (`/me/skills`, `/me/skills/recompute`) strictly to users with the `CANDIDATE` role via `@PreAuthorize("hasRole('CANDIDATE')")`. Non-candidates attempting to call these endpoints receive HTTP 403 `FORBIDDEN`. Viewing another candidate's public skills (`/{userId}/skills`) remains open to all authenticated users (or HR/Mentors).
  - *Option B (Permissive Universal Profiles - Current Behavior)*: Maintain the existing permissive behavior where any authenticated user possesses a personal skill profile. For non-candidate roles, if no external records exist in LMS/Exam/PM, the API simply returns an empty list `[]`.
  - *Option C (Candidate and Mentor Dual Scoping)*: Allow both `CANDIDATE` and `MENTOR` roles to maintain skill profiles, while strictly excluding `HR` and `ADMIN` enterprise/staff accounts from skill profile ownership.
- **Architectural Impact**: Determines whether method-level authorization `@PreAuthorize("hasRole('CANDIDATE')")` should be applied to `SkillProfileController`, how frontend routing guards (`RequireRole`) are configured, and role-based test expectations.

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### Tổng quan

Trong quá trình khảo sát kiến trúc, đối chiếu đặc tả hệ thống và thực hiện nhiệm vụ NT-01 (Đăng nhập & Xác thực Đa kênh, mã T022B63), đội ngũ kỹ sư phát hiện một số điểm mơ hồ và câu hỏi nghiệp vụ cần làm rõ. Tài liệu này tổng hợp 11 câu hỏi nghiệp vụ then chốt chia thành hai phần:

- **Phần A**: Các câu hỏi kiến trúc tổng thể và hệ thống Mock bên ngoài (Câu hỏi 1–6)
- **Phần B**: Các câu hỏi chuyên sâu về Nhiệm vụ NT-01 — Xác thực, Đa người thuê và Vòng đời bảo mật (Câu hỏi 7–11)

Mỗi câu hỏi đều có trích dẫn văn bản, ngữ cảnh phát sinh, các phương án khả thi và đánh giá tác động kiến trúc để Product Owner và Team Lead phê duyệt.

---

### Phần A: Kiến trúc Tổng thể & Hệ thống Mock Bên ngoài

#### Câu hỏi 1: Công thức và Trọng số Mặc định Tính Chỉ số Năng lực Tổng hợp

- **Trích dẫn**: `Rikkei Jobs — Rikkei Project.pdf` (Trang 6, Mục "Cần chốt") & `Rikkei Jobs — Rikkei Project3.pdf` (Trang 1, Mục "Chỉ số năng lực" và Mục "Bằng chứng").
- **Ngữ cảnh**: Đặc tả quy định: *"Chỉ số = trung bình có trọng số của các nguồn; trọng số do quản trị cấu hình, chốt ở DG-03"*. Chỉ số kỹ năng (0–100) được tính từ 4 nguồn bằng chứng: Điểm môn LMS, Kết quả Khảo thí, Điểm nghiệm thu task thực tập IOC, và Phiếu đánh giá của Mentor. Tuy nhiên, tài liệu chưa định nghĩa tỷ lệ phần trăm mặc định ban đầu giữa 4 nguồn này.
- **Các phương án đề xuất**:
  - *Phương án A (Cố định ở tầng code)*: Đặt bộ trọng số mặc định ban đầu trong mã nguồn (ví dụ: LMS 30%, Khảo thí 30%, Thực tập 20%, Mentor 20%).
  - *Phương án B (Bảng cấu hình CSDL)*: Thiết kế bảng `assessment_weights` trong module `assessment`, cho phép Quản trị viên tùy chỉnh tỷ lệ phần trăm động qua API mà không cần deploy lại code.
  - *Phương án C (Cấu hình theo nhóm kỹ năng)*: Thiết lập các hồ sơ trọng số linh hoạt theo từng nhóm kỹ năng (kỹ năng thực hành lập trình ưu tiên điểm IOC; kỹ năng mềm ưu tiên đánh giá của Mentor).
- **Tác động kiến trúc**: Ảnh hưởng trực tiếp đến schema CSDL của module `assessment` và thuật toán tính điểm tương đồng (matching score) với JD ở các sprint sau.

---

#### Câu hỏi 2: Sự Không Nhất quán trong Định nghĩa Bậc Kỹ năng (Level Bands)

- **Trích dẫn**: `Rikkei Jobs — Rikkei Project3.pdf` (Trang 1, Mục "Chỉ số năng lực") đối chiếu với `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Trang 3, Mục 2 "Dữ liệu mẫu dùng chung").
- **Ngữ cảnh**: Tài liệu dự án 3 quy định 4 bậc kỹ năng gồm: *"Cơ bản, Khá, Vững, Nâng cao"*. Ngược lại, Tài liệu Hướng dẫn Mock mới nhất (10/11/2026) định nghĩa: *"0–39 Cơ bản, 40–69 Khá, 70–84 Tốt, 85–100 Xuất sắc"*.
- **Các phương án đề xuất**:
  - *Phương án A (Tuân thủ tài liệu mới nhất)*: Áp dụng triệt để định nghĩa theo Tài liệu Mock hướng dẫn mới nhất (`0–39 Cơ bản`, `40–69 Khá`, `70–84 Tốt`, `85–100 Xuất sắc`) vì tài liệu này có tính khả thi và tương thích cao nhất với các hệ thống mock hiện hữu.
  - *Phương án B (Ánh xạ song song)*: Hỗ trợ cấu hình ánh xạ linh hoạt giữa mã nội bộ (`BASIC`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`) với cả hai cách gọi hiển thị.
- **Tác động kiến trúc**: Thống nhất định dạng Enum trong TypeScript frontend, huy hiệu năng lực hiển thị và các bài test kiểm thử.

---

#### Câu hỏi 3: Quy định Đổi Mật khẩu Lần đầu Đối với Tài khoản Doanh nghiệp (HR)

- **Trích dẫn**: `Rikkei Jobs — Rikkei Project1.pdf` (Trang 2, Mục "Đăng nhập") & `Hướng dẫn dựng mock hệ thống ngoài – Rikkei Jobs.pdf` (Trang 3, Mục 2 "Dữ liệu mẫu dùng chung").
- **Ngữ cảnh**: Tài liệu 1 quy định: *"Doanh nghiệp: tài khoản HR do cán bộ cấp. Bắt đổi mật khẩu lần đầu"*. Tuy nhiên trong môi trường dev, 2 tài khoản mẫu `hr1@rikkeijobs.test` và `hr2@rikkeijobs.test` được seed sẵn với mật khẩu `Test@123` để phục vụ kiểm thử tích hợp tự động.
- **Các phương án đề xuất**:
  - *Phương án A*: Bổ sung cột boolean `must_change_password` vào bảng `users`. Tài khoản seed môi trường dev đặt giá trị `FALSE`, trong khi tài khoản do cán bộ cấp sau này mặc định là `TRUE`.
  - *Phương án B*: Bắt buộc toàn bộ tài khoản HR phải đổi mật khẩu, đòi hỏi kịch bản test tự động phải thực hiện luồng đổi mật khẩu ngay sau khi login lần đầu.
- **Tác động kiến trúc**: Định hình migration Flyway V1 cho bảng `users` và luồng xác thực của task `NT-01`.

---

#### Câu hỏi 4: Quy tắc Tính Điểm Khớp Tuyển Dụng (Matching Score) và Xử Lý Khi Ứng Viên Thiếu Kỹ Năng Bắt Buộc Trong JD

- **Trích dẫn**: `Rikkei Jobs — Rikkei Project3.pdf` (Trang 2, Mục "Điểm khớp với JD" và Mục "Khoảng thiếu hụt") đối chiếu `Rikkei Jobs — Rikkei Project2.pdf` (Trang 1, Mục "Ứng tuyển").
- **Ngữ cảnh**: Đặc tả quy định: *"JD khai kỹ năng bắt buộc và ưu tiên, mỗi kỹ năng có mức tối thiểu. Điểm khớp 0–100; thiếu một kỹ năng bắt buộc thì ghi rõ, không ẩn"*. Tuy nhiên, tài liệu chưa định rõ công thức tính điểm khớp tổng thể khi thiếu kỹ năng bắt buộc: điểm có bị về 0 hay vẫn tính điểm nhưng gắn nhãn cảnh báo.
- **Các phương án đề xuất**:
  - *Phương án A (Hard Ineligibility Gate - Chặn cứng)*: Điểm khớp bị gán về 0% hoặc gán trạng thái `INELIGIBLE` (Không đủ điều kiện), tự động tách vào nhóm riêng để cảnh báo HR.
  - *Phương án B (Penalty Factor - Hệ số phạt)*: Điểm khớp vẫn được tính dựa trên các kỹ năng còn lại nhưng bị áp dụng hệ số phạt (trừ 30–50% tổng điểm) và gắn nhãn cảnh báo đỏ `Missing Mandatory Skills`.
  - *Phương án C (Independent Two-Tier Indicator - Hai chỉ số độc lập)*: Điểm khớp kỹ năng tính toán độc lập (ví dụ đạt 75%), hiển thị song song với chỉ số đáp ứng điều kiện bắt buộc (ví dụ `Mandatory Skills: 2/3 passed`).
- **Tác động kiến trúc**: Quyết định logic thuật toán module `recruitment`/`job`, cấu trúc dữ liệu lưu điểm khớp và bộ lọc ứng viên trên giao diện doanh nghiệp ở Sprint 3.

---

#### Câu hỏi 5: Quyền Xem Thông tin Liên hệ Khi Ứng viên Rút Đơn Ứng tuyển

- **Trích dẫn**: `Rikkei Jobs — Rikkei Project5.pdf` (Trang 1, Mục 5 "Quyền riêng tư và an toàn dữ liệu") đối chiếu `Rikkei Jobs — Rikkei Project1.pdf` (Trang 1, Bảng "Việc" & Trang 2, Hàng "Thấy email, điện thoại ứng viên").
- **Ngữ cảnh**: Quy định nêu rõ: *"Hồ sơ mặc định riêng tư... Doanh nghiệp không thấy email, số điện thoại cho tới khi ứng viên ứng tuyển JD của họ, hoặc cán bộ duyệt mở liên hệ"*. Nếu ứng viên sau đó quyết định rút đơn ứng tuyển (withdraw application) hoặc JD bị đóng lại, doanh nghiệp đó có quyền tiếp tục thấy email/SĐT trong danh sách lịch sử hay không?
- **Các phương án đề xuất**:
  - *Phương án A (Che lại tức thì)*: Thông tin liên hệ ngay lập tức bị che (mask) trở lại khi đơn ứng tuyển bị rút hoặc hủy.
  - *Phương án B (Giữ quyền lịch sử)*: Doanh nghiệp vẫn được xem thông tin liên hệ của các đơn ứng tuyển đã nộp thành công trong quá khứ nhằm bảo đảm tính liên tục của quy trình tuyển dụng.
- **Tác động kiến trúc**: Xác định logic kiểm tra quyền trong API xem chi tiết ứng viên (`GET /api/v1/candidates/{id}`).

---

#### Câu hỏi 6: Xử lý Bất đồng bộ Khi Điểm Nguồn Bên Ngoài Thay Đổi Sau Khi Cán Bộ Đã Sửa Tay

- **Trích dẫn**: `Rikkei Jobs — Rikkei Project3.pdf` (Trang 1, Mục "Bằng chứng" và Mục "Chỉ số năng lực").
- **Ngữ cảnh**: Tài liệu quy định: *"Đồng bộ mỗi đêm và khi ứng viên mở hồ sơ; không ghi đè phần cán bộ đã sửa tay... Cán bộ: Bằng chứng thiếu ở nguồn, giá trị điều chỉnh, có lý do, lưu lịch sử"*. Trong trường hợp cán bộ sửa tay một điểm môn vì LMS gặp sự cố; sau đó LMS chính thức cập nhật điểm đúng. Làm thế nào hệ thống phân biệt được dữ liệu mới từ LMS là bản cập nhật hợp lệ hay là dữ liệu cũ bị ghi đè?
- **Các phương án đề xuất**:
  - *Phương án A (Khóa thủ công)*: Đánh dấu cờ `manually_locked = true` cho bản ghi; khi tiến trình đồng bộ ban đêm phát hiện sai khác, hệ thống sẽ đưa vào hàng đợi cảnh báo cho Cán bộ duyệt thay vì tự động ghi đè.
  - *Phương án B (Dựa vào mốc thời gian)*: Lưu trường `source_updated_at`; nếu thời điểm cập nhật tại LMS mới hơn thời điểm cán bộ sửa tay, hệ thống sẽ cho phép ghi nhận dữ liệu mới.
- **Tác động kiến trúc**: Định hình cấu trúc bảng `profile_evidences` và logic nghiệp vụ của tiến trình đồng bộ dữ liệu ban đêm.

---

### Phần B: Nhiệm vụ NT-01 — Đăng nhập & Xác thực Đa kênh (T022B63)

#### Câu hỏi 7: Ánh xạ Vai trò LMS SSO và Đồng bộ Vòng đời Tài khoản

- **Trích dẫn**: `PROMPT_NT01_EN.txt` (Mục R4 "Backend Authentication APIs & Security"), `PROJECT.md` (Tính năng 6 "Role Preservation & Mapping"), và `mock-contract.md` (Mục "LMS Verification Contract").
- **Ngữ cảnh**: Khi người dùng đăng nhập qua LMS Single Sign-On (`POST /api/v1/auth/sso`), hệ thống ngoài trả về hồ sơ kèm `mockRole` (ví dụ `CANDIDATE`, `MENTOR`, `STAFF`). Trong lần đăng nhập đầu tiên, Rikkei Jobs tự động tạo bản ghi trong bảng `users` và ánh xạ vai trò sang 1 trong 5 vai trò hệ thống chuẩn (`CANDIDATE`, `MENTOR`, `STAFF`, `HR`, `ADMIN`). Tuy nhiên, tài liệu chưa quy định cơ chế xử lý cho các lần đăng nhập tiếp theo nếu vai trò trên LMS thay đổi (ví dụ học viên trở thành trợ giảng/mentor) hoặc nếu Quản trị viên Rikkei Jobs đã nâng quyền thủ công cho tài khoản đó.
- **Các phương án đề xuất**:
  - *Phương án A (LMS là nguồn sự thật duy nhất)*: Mỗi lần đăng nhập SSO thành công, hệ thống tự động ghi đè `users.role_id` theo vai trò mới nhất do LMS trả về. Đảm bảo quyền hạn luôn đồng bộ với hệ thống gốc.
  - *Phương án B (Chỉ khởi tạo lần đầu)*: Vai trò từ LMS chỉ dùng khi tạo tài khoản lần đầu. Mọi thay đổi quyền sau đó phải do Quản trị viên nội bộ Rikkei Jobs thực hiện, ngăn chặn nguy cơ phân quyền bị ghi đè ngoài ý muốn từ nhà cung cấp danh tính bên ngoài.
  - *Phương án C (Cơ chế hỗn hợp kèm cờ khóa)*: Bổ sung cờ `is_role_overridden`. Vai trò sẽ tự động đồng bộ theo LMS trừ khi Quản trị viên đã can thiệp gán quyền thủ công tại Rikkei Jobs.
- **Quyết định chính thức (Round B / Defect B2)**: Chính thức lựa chọn Phương án B. Vai trò từ LMS chỉ áp dụng khi tạo tài khoản lần đầu cho 4 vai trò hợp lệ (`CANDIDATE`, `MENTOR`, `STAFF`, `ADMIN`). Trong các lần đăng nhập SSO tiếp theo, vai trò nội bộ của người dùng trong Rikkei Jobs được bảo toàn tuyệt đối, không bị LMS ghi đè. Mọi vai trò chưa ánh xạ hoặc `HR` đều bị từ chối với HTTP 401 `UNMAPPED_LMS_ROLE`.
- **Tác động kiến trúc**: Quyết định logic xử lý trong `AuthServiceImpl.verifySso()`, nhật ký kiểm toán (audit log) phân quyền và cơ chế thu hồi phiên (session revocation) khi người dùng bị thay đổi quyền.

---

#### Câu hỏi 8: Thời hạn Token Đặt lại Mật khẩu, Giới hạn Tần suất (Rate Limiting) & Chống Liệt kê Tài khoản

- **Trích dẫn**: `PROMPT_NT01_EN.txt` (Mục R4 "Backend Authentication APIs & Security"), `PROJECT.md` (Tính năng 14 & 15), và chuẩn OWASP ASVS v4.0.3 (Mục V2.5 Khôi phục thông tin xác thực).
- **Ngữ cảnh**: Endpoint quên mật khẩu (`POST /api/v1/auth/forgot-password`) tạo token ngẫu nhiên 256-bit có hiệu lực 30 phút, băm SHA-256 lưu trong bảng `password_reset_tokens`. Để chống liệt kê tài khoản (anti-enumeration), API luôn phản hồi HTTP 200 bất kể email có tồn tại hay không. Tuy nhiên, nếu thiếu chính sách giới hạn tần suất và hủy token cũ, kẻ tấn công có thể spam gửi mail qua SMTP relay hoặc tạo nhiều token còn hiệu lực cho cùng một tài khoản.
- **Các phương án đề xuất**:
  - *Phương án A (Chỉ giữ một token hợp lệ & Giới hạn tần suất)*: Mỗi khi người dùng yêu cầu đặt lại mật khẩu mới, hệ thống lập tức hủy (invalidate) toàn bộ token chưa sử dụng trước đó của tài khoản. Đồng thời áp dụng sliding window rate-limit (tối đa 3 yêu cầu trong 15 phút theo IP/email) qua bộ lọc API.
  - *Phương án B (Nhiều token cùng tồn tại, hủy khi token đầu tiên được dùng)*: Cho phép các link đặt lại mật khẩu trong 30 phút cùng tồn tại, nhưng ngay khi một token được sử dụng thành công qua `POST /api/v1/auth/reset-password`, tất cả các token còn lại của tài khoản đó lập tức bị vô hiệu hóa.
  - *Phương án C (Thời gian chờ tối thiểu giữa các lần gửi)*: Áp dụng khoảng cách tối thiểu 60 giây giữa các lần yêu cầu đặt lại mật khẩu cho cùng một email, trả về HTTP 429 `TOO_MANY_REQUESTS` nếu vi phạm.
- **Tác động kiến trúc**: Định hình truy vấn trong `PasswordResetTokenRepository`, tác vụ định kỳ dọn dẹp các token đã hết hạn trong CSDL và cấu hình rate-limiting tại API gateway.

---

#### Câu hỏi 9: Phân vùng Dữ liệu Đa người thuê Cấp Doanh nghiệp (Multi-Tenancy) & Cô lập Dữ liệu HR

- **Trích dẫn**: `PROMPT_NT01_EN.txt` (Mục R3 "Database Migrations" & Mục R4 "Backend Authentication APIs & Security"), `PROJECT.md` (Tính năng 4 & 10).
- **Ngữ cảnh**: Migration V5 bổ sung cột vô hướng `company_id BIGINT` vào bảng `users` (không dùng khóa ngoại liên module để bảo toàn tính độc lập kiến trúc). Token JWT chứa claim `companyId` cho tài khoản HR doanh nghiệp. Tuy nhiên, đặc tả chưa làm rõ mô hình phân quyền khi một doanh nghiệp có nhiều nhân viên tuyển dụng (HR), hoặc trường hợp nhân sự phụ trách nhiều công ty con.
- **Các phương án đề xuất**:
  - *Phương án A (Gắn cứng một công ty duy nhất)*: Giữ nguyên `users.company_id` là giá trị vô hướng (mỗi HR thuộc 1 công ty). Mọi truy vấn nghiệp vụ tuyển dụng (đăng tin tuyển dụng, xem hồ sơ ứng viên, đặt lịch phỏng vấn) tự động lọc theo `companyId` lấy từ JWT.
  - *Phương án B (Bảng liên kết đa công ty)*: Chuyển quan hệ công ty sang bảng liên kết `company_members` trong module doanh nghiệp, cho phép một chuyên viên HR có các vai trò khác nhau (`HR_ADMIN`, `RECRUITER`, `VIEWER`) tại nhiều công ty thành viên.
  - *Phương án C (Bộ lọc tự động tại ORM)*: Áp dụng cơ chế cô lập dữ liệu đa người thuê thông qua Hibernate filter hoặc Dynamic SQL predicate (`company_id = :currentTenant`) để loại bỏ hoàn toàn nguy cơ rò rỉ dữ liệu chéo giữa các doanh nghiệp.
- **Tác động kiến trúc**: Chi phối thiết kế schema các module doanh nghiệp trong tương lai, cơ chế kiểm tra quyền Spring Security (`@PreAuthorize("@securityService.isCompanyMember(...)")`) và cấu trúc claim của JWT.

---

#### Câu hỏi 10: Vòng đời Trạng thái Inactive vs. Locked và Quy trình Mở khóa / Kích hoạt lại của Quản trị viên

- **Trích dẫn**: `PROMPT_NT01_EN.txt` (Mục R3 "Database Migrations" & Mục R4 "Backend Authentication APIs & Security"), `PROJECT.md` (Tính năng 11 "Account Lockout Mechanism").
- **Ngữ cảnh**: Migration V5 ràng buộc `CHECK (status IN ('ACTIVE', 'LOCKED'))`, trong khi cơ chế phòng chống brute-force tự động khóa tài khoản trong 15 phút sau 5 lần nhập sai (`locked_until = now + 15m`). Luồng đặt lại mật khẩu thành công cũng tự động xóa trạng thái khóa này. Tuy nhiên, hệ thống hiện chưa phân tách rạch ròi giữa việc khóa bảo mật tạm thời (tự động mở sau 15 phút hoặc khi đổi mật khẩu) với việc khóa hành chính do Quản trị viên xử lý (ví dụ: nhân sự nghỉ việc, tài khoản vi phạm chính sách hoặc doanh nghiệp ngừng hợp tác).
- **Các phương án đề xuất**:
  - *Phương án A (Mở rộng trạng thái tài khoản)*: Bổ sung các trạng thái rõ ràng vào enum `status`: `ACTIVE`, `TEMPORARILY_LOCKED`, `SUSPENDED`, `INACTIVE`. Khóa brute-force 15 phút hoặc đặt lại mật khẩu chỉ chuyển `TEMPORARILY_LOCKED` về `ACTIVE`. Tài khoản bị `SUSPENDED` hoặc `INACTIVE` bắt buộc phải có Quản trị viên phê duyệt mở lại qua API quản trị.
  - *Phương án B (Phân tách độc lập Trạng thái và Thời hạn khóa)*: Giữ `status` chỉ gồm các trạng thái quản trị (`ACTIVE`, `INACTIVE`), trong khi việc khóa brute-force hoàn toàn do điều kiện thời gian `locked_until > NOW()` quyết định. Tài khoản đã bị Quản trị viên tắt (`INACTIVE`) tuyệt đối không thể tự kích hoạt lại thông qua quy trình quên mật khẩu.
  - *Phương án C (Cờ khóa hành chính kèm vết kiểm toán)*: Giữ nguyên `ACTIVE` và `LOCKED`, bổ sung cờ `administrative_lock` và bảng nhật ký lưu ID quản trị viên, lý do và thời điểm khóa tài khoản.
- **Tác động kiến trúc**: Định hình máy trạng thái (state machine) trong `AuthServiceImpl`, cấu trúc ràng buộc CSDL cho trạng thái tài khoản và bộ API quản lý người dùng dành cho Quản trị viên ở các sprint tiếp theo.

---

#### Câu hỏi 11: Phân quyền Vai trò (Role-Scoping) cho Tính năng Hồ sơ Năng lực (HS-01 / NT-01 Round F)

- **Trích dẫn**: `docs/hs-01-skill-profile.md` (Mục "Quyền truy cập & Phân quyền"), `PROMPT_NT01F_EN.txt` (Mục R2 / F1), và mã nguồn `SkillProfileController.java`.
- **Ngữ cảnh**: Hiện tại, các endpoint của tính năng Hồ sơ năng lực (`GET /api/v1/profiles/me/skills`, `GET /api/v1/profiles/{userId}/skills`, và `POST /api/v1/profiles/me/skills/recompute`) chỉ yêu cầu đăng nhập (`@AuthenticationPrincipal UserPrincipal user`) mà hoàn toàn chưa có ràng buộc vai trò, ví dụ `@PreAuthorize("hasRole('CANDIDATE')")`. Do đó, bất kỳ người dùng thuộc bất kỳ vai trò nào (`HR`, `ADMIN`, `MENTOR`, `STAFF`) đều có thể gọi API để xem hoặc tính toán lại hồ sơ năng lực của bản thân. Trong khi đó, đặc tả HS-01 tập trung hoàn toàn vào năng lực của ứng viên/học viên lấy từ dữ liệu LMS, Khảo thí và Dự án thực tập; về mặt nghiệp vụ, tài khoản doanh nghiệp (HR) không nên sở hữu hồ sơ năng lực ứng viên.
- **Các phương án đề xuất**:
  - *Phương án A (Giới hạn chặt chẽ chỉ dành cho CANDIDATE)*: Áp dụng `@PreAuthorize("hasRole('CANDIDATE')")` cho các endpoint sở hữu và tính toán lại hồ sơ (`/me/skills`, `/me/skills/recompute`). Nếu tài khoản không phải `CANDIDATE` gọi tới, hệ thống trả về HTTP 403 `FORBIDDEN`. Endpoint xem kỹ năng công khai của người khác (`/{userId}/skills`) vẫn cho phép mọi người dùng đã xác thực (hoặc HR/Mentor) tra cứu.
  - *Phương án B (Cho phép phổ quát mọi vai trò - Hành vi hiện tại)*: Giữ nguyên hành vi hiện tại, cho phép mọi tài khoản đã đăng nhập đều có hồ sơ năng lực cá nhân. Với các vai trò không phải ứng viên, nếu không có dữ liệu LMS/Exam/PM, API trả về danh sách rỗng `[]`.
  - *Phương án C (Hỗ trợ CANDIDATE và MENTOR)*: Cho phép cả học viên (`CANDIDATE`) và người hướng dẫn (`MENTOR`) sở hữu hồ sơ kỹ năng, nhưng loại trừ hoàn toàn tài khoản nhân sự doanh nghiệp (`HR`) và quản trị viên (`ADMIN`).
- **Tác động kiến trúc**: Xác định việc có bổ sung phân quyền cấp phương thức `@PreAuthorize` vào `SkillProfileController` hay không, cấu hình guard bảo vệ route trên frontend (`RequireRole(['CANDIDATE'])`), và các trường hợp kiểm thử phân quyền theo vai trò.
