# M3b Content Audit and Role-Based Content Map — Rikkei Jobs

Document Path: `docs/uiux/CONTENT.md`
Round: `UIUX-polish` — Milestone `M3b`
Status: Drafted prior to `M4` pilot and `M5a` content roll-out
Primary Sources: `D:\GitHub\Rikkei\Tài liệu dự án\*.pdf`, `docs/hs-01-skill-profile.md`, `docs/nt02/permission-matrix.md`, `docs/05-open-business-questions.md`, and direct read-only inspection of `frontend/src/`

---

## Language Navigation / Điều hướng ngôn ngữ

- **English Summary & Structure** accompanies each section below alongside full **Vietnamese (Tiếng Việt có dấu đầy đủ)** tables, copy, and rewrite specifications.
- **Compliance**: Zero invented metrics, zero fake companies or testimonials, zero technical showcase in user-facing copy, zero buzzwords, zero emojis.

---

## Section 1 — Product Narrative per Role / Câu chuyện sản phẩm theo từng vai trò

### 1.1 Core Product Statement (English & Vietnamese)

- **EN**: Rikkei Jobs connects Rikkei Education learners and IOC interns with hiring companies through verified competency built from four official evidence sources (LMS course results, exams, IOC internship outcomes, and mentor evaluations). When a candidate lacks skills for a target role or job description (JD), Rikkei Jobs highlights the gap and points to supplementary LMS courses; after completing the courses, skill scores update automatically.
- **VI**: Rikkei Jobs kết nối học viên và thực tập sinh IOC của Rikkei Education với doanh nghiệp tuyển dụng dựa trên năng lực đã được xác thực từ bốn nguồn bằng chứng (kết quả học tập LMS, kết quả thi khảo thí, kết quả thực tập IOC và phiếu đánh giá của mentor). Khi ứng viên còn thiếu kỹ năng so với vị trí mục tiêu hoặc tin tuyển dụng, hệ thống chỉ rõ phần còn thiếu để học viên bổ sung qua các khóa học trên LMS và cập nhật lại hồ sơ năng lực.

### 1.2 Role-by-Role Narrative Matrix / Ma trận câu chuyện theo vai trò

| Role / Vai trò | What Rikkei Jobs does for them (EN) | Giá trị mang lại cho người dùng (VI) | Available Now (`NT-02` Verified) / Hiện có | Coming Soon (`Sắp ra mắt`) | Primary Next Action / Hành động tiếp theo |
|---|---|---|---|---|---|
| **Unauthenticated Visitor** (`Khách truy cập`) | Understand how verified learning and internship records connect learners to jobs, and sign in via LMS or company credentials. | Hiểu cách Rikkei Jobs kết nối hồ sơ năng lực đã xác thực với cơ hội việc làm, rồi chọn đúng cổng đăng nhập (LMS cho học viên/mentor/cán bộ hoặc tài khoản doanh nghiệp cho HR). | Landing overview (`/`), `/login`, `/sso-callback`, `/forgot-password`, `/reset-password`. | Public job catalog browsing before sign-in (if enabled later). | Select sign-in method on `/login`. (`Đăng nhập để bắt đầu`) |
| **`CANDIDATE`** (`Ứng viên` — Học viên / Thực tập sinh IOC) | Track verified 0–100 skill scores separately from self-declared scores, compare skills against target positions or JDs, review mentor feedback, and discover matching job suggestions. | Theo dõi điểm kỹ năng từ nguồn xác thực tách biệt với phần tự khai, xem nhận xét chi tiết từ mentor, kiểm tra mức độ sẵn sàng với vị trí mục tiêu và khám phá việc làm gợi ý. | `/candidate`, `/candidate/skills`, `/candidate/jobs`, `/candidate/jobs/:jobId`, `/candidate/gap-analysis`, `/candidate/evaluations`. | Direct job application (`Ứng tuyển`), AI Career Assistant (`Trợ lý AI`), profile visibility toggle & evidence dispute submission on UI. | Review verified skills (`/candidate/skills`) or check skill gaps (`/candidate/gap-analysis`). |
| **`HR`** (`HR` — Đại diện doanh nghiệp tuyển dụng) | Maintain an accurate company profile and logo so Rikkei Education candidates recognize the employer before applying or joining IOC internships. | Quản lý thông tin giới thiệu và logo doanh nghiệp hiển thị tới ứng viên, chuẩn bị cho việc đăng tin tuyển dụng và tiếp nhận thực tập sinh IOC. | `/hr`, `/hr/company` (company details + JPG/PNG logo upload), `/change-password`, `/forgot-password`. | Job posting management (`JD`), applicant screening & Rikkei Meet interviews (`Tuyển dụng`), IOC intern requests (`Thực tập sinh`). | Update company profile and upload logo (`/hr/company`). |
| **`MENTOR`** (`Mentor` — Giảng viên / Người hướng dẫn) | Record structured competency evaluations after interviews and IOC internship sprints so learners receive clear feedback and verified evidence. | Ghi nhận đánh giá chuyên môn cho học viên sau phỏng vấn và các đợt thực tập IOC, góp phần hình thành bằng chứng năng lực đáng tin cậy trên hồ sơ ứng viên. | `/mentor` role home (backend evaluation APIs exist; UI queue pending). | Mentor evaluation queue UI (`Cần đánh giá`). | Review account access on `/mentor` and prepare for upcoming evaluation workflow. |
| **`STAFF`** (`Nhân viên` — Cán bộ vận hành) | Coordinate the bridge between learners and companies: review candidate profiles before public listing, onboard companies and HR accounts, approve JDs, and match IOC interns. | Điều phối kết nối giữa học viên và doanh nghiệp: duyệt hồ sơ ứng viên, tạo doanh nghiệp và cấp tài khoản HR, duyệt tin tuyển dụng và ghép thực tập sinh IOC. | `/staff` role home (backend company/HR onboarding APIs exist; UI screens pending). | `Duyệt hồ sơ`, `Duyệt JD`, `Doanh nghiệp`, `Ghép thực tập`, `Báo cáo`. | Confirm account workspace on `/staff` (onboarding screens coming next). |
| **`ADMIN`** (`Quản trị viên`) | Govern the 20-skill catalog, evidence source weights, evaluation templates, verification badges, evidence disputes, and immutable action logs. | Quản lý danh mục 20 kỹ năng, trọng số nguồn bằng chứng, mẫu phiếu đánh giá, xử lý báo sai bằng chứng và tra cứu nhật ký hệ thống. | `/admin` role home. | Admin governance console (`Quản trị`). | Confirm admin workspace on `/admin` (governance modules coming next). |

---

## Section 2 — Full Copy Audit & Classification Table / Kiểm toán toàn bộ nội dung hiển thị

Classification tags (5 mandatory buckets):

- **`user value`**: Communicates concrete benefit, domain facts, or user status directly relevant to the user's goal.
- **`functional help`**: Instructions, field labels, validation rules, limits, and actionable guidance needed to finish a task.
- **`internal or technical showcase`**: Architecture jargon, security standard names, internal module codes, token/JWT/TTL/RBAC/ASVS internals, or counters proving the system exists.
- **`developer-only`**: Dev/QA shortcuts, mock endpoints, Mailpit links, health status monitors meant only for local development/testing.
- **`filler`**: Empty superlatives, buzzwords, stacked adjectives, or generic slogans without concrete meaning.

### 2.1 Public Landing & Shared Shell (`/`, `Header`, `HealthBadge`, `ModuleCard`, `features/*/index.ts`, `index.html`)

| File & Line | Current User-Visible Text (Verbatim) | Classification | Rationale / Lý do phân loại |
|---|---|---|---|
| `index.html:10` & `App.tsx:47` | `Rikkei Jobs - Nền tảng kết nối việc làm theo năng lực đã xác thực` | `user value` | Clear product identity and core value proposition. |
| `App.tsx:48` | `v1.0.0-sprint1` | `internal or technical showcase` | Internal sprint version tag exposed in header badge. |
| `App.tsx:49-50` | `Giải pháp cầu nối minh bạch giữa Sinh viên, Doanh nghiệp tuyển dụng và Cán bộ đào tạo` | `filler` | Generic `"Giải pháp cầu nối minh bạch"` phrasing; rewrite in plain active voice. |
| `App.tsx:109,116,124` | `Điều hướng chính`, `Tổng quan`, `Hồ sơ năng lực` | `functional help` | Navigation landmark and tab labels. |
| `App.tsx:134-144` | `Hồ sơ năng lực` / `Vui lòng đăng nhập bằng tài khoản học viên (LMS SSO) hoặc tài khoản doanh nghiệp để xem chỉ số kỹ năng đã xác thực.` / `Đăng nhập để xem hồ sơ năng lực` | `functional help` | Clear prompt explaining why login is needed and direct CTA. |
| `App.tsx:156` | `Đến Cổng Đăng Nhập NT-01 (LMS SSO / Doanh Nghiệp)` | `internal or technical showcase` | Exposes internal milestone code `NT-01` and uses Title-Case slogan style. |
| `App.tsx:160-167`, `HealthBadge.tsx:32-50`, `health.ts:28,33,46` | `Trạng thái kết nối Backend:`, `UP`/`DOWN`/`CONNECTING...`, `Backend đang hoạt động bình thường`, `Trạng thái không xác định: ...`, `Kiểm tra lại`, `Đang kiểm tra...`, `Đang gửi yêu cầu kiểm tra tới /api/v1/health...`, `Không thể kết nối đến máy chủ Backend` | `developer-only` | Internal health diagnostics and raw endpoint `/api/v1/health` exposed on public landing page. |
| `App.tsx:173-176` | `7 Module Nghiệp vụ Hệ thống` / `Kiến trúc Modular Monolith phân rã độc lập theo từng phân hệ nghiệp vụ chuẩn xác` | `internal or technical showcase` | Architecture showcase (`Modular Monolith`, `7 Module`, buzzword `chuẩn xác`). |
| `ModuleCard.tsx:20-26` & `features/*/index.ts` | `MOD-01`..`MOD-07`, `Module 1`..`Module 7`, `Hồ sơ năng lực (Candidate)`, `Doanh nghiệp & Tuyển dụng (Company)`, `Thực tập IOC (Internship)`, `Đánh giá năng lực (Assessment)`, `Đào tạo bổ sung (Learning)`, `Ứng tuyển & Tuyển dụng (Recruitment)`, `Trợ lý nghề nghiệp AI (AI Assistant)`, `Đối tượng: ...` | `internal or technical showcase` | Internal module IDs (`MOD-01`..`MOD-07`) and mixed English parenthetical code names; does not clearly separate what is available now vs `Sắp ra mắt`. |
| `App.tsx:188-206` | `Thông tin kỹ thuật Skeleton`, `React 19.3.1, TypeScript 6.0.3, Vite 8.3.7, Vitest 5.1.0`, `Nginx 1.30.6-alpine non-root...`, `Reverse Proxy: Định tuyến /api/ với dynamic DNS resolver`, `Bảo mật: Tuyệt đối không định tuyến hoặc expose dịch vụ Mock nội bộ ra ngoài` | `developer-only` | Pure developer stack/container specification printed on public `/`. |
| `App.tsx:214` | `(c) 2026 Rikkei Jobs Project. Sprint 1 - Task T022DB0 Skeleton & Integration Foundation.` | `internal or technical showcase` | Exposes internal Jira/task code `T022DB0` and `Sprint 1 Skeleton`. |

### 2.2 Auth Editorial Layout, Competency Radar & Login (`/login`, `AuthEditorialLayout`, `CompetencyRadarVisual`, `LmsLoginForm`, `EnterpriseLoginForm`, `LockoutCountdown`)

| File & Line | Current User-Visible Text (Verbatim) | Classification | Rationale / Lý do phân loại |
|---|---|---|---|
| `AuthEditorialLayout.tsx:25,43` | `Cổng Định Danh Doanh Nghiệp & Học Viên` / `Hệ Thống Đánh Giá & Tuyển Dụng Xác Thực Năng Lực` | `filler` | Heavy Title-Case `"Cổng Định Danh..."` phrasing; replace with clear role-focused subtitle. |
| `AuthEditorialLayout.tsx:27-28` | `Định Danh Chuẩn Xác — Minh Bạch Năng Lực Theo Khung Chuẩn Hóa` / `Nền tảng kết nối trực tiếp dữ liệu học tập từ LMS và khảo thí tới phân hệ tuyển dụng doanh nghiệp. Mọi hồ sơ năng lực được xác thực minh bạch qua 20 kỹ năng chuẩn hóa và cơ chế phân quyền 5 vai trò bảo mật.` | `filler` + `internal or technical showcase` | Uses forbidden word `chuẩn xác`, Title-Case slogan, and internal `"phân quyền 5 vai trò"` showcase. |
| `AuthEditorialLayout.tsx:72` | `Chuẩn bảo mật định danh ASVS V2/V4 • Bảo trợ bởi Rikkei Education` | `internal or technical showcase` | Explicitly showcases `ASVS V2/V4` standard to end users. |
| `CompetencyRadarVisual.tsx:23,102-119` | `Biểu đồ ra-đa 6 chiều đánh giá năng lực chuẩn kỹ sư Rikkei Education`, `Kiến trúc Hệ thống`, `Lập trình Cốt lõi`, `Tư duy Thuật toán`, `Quy chuẩn CI/CD`, `Năng lực Thực chiến`, `Kỷ luật Chất lượng` | `filler` + `internal or technical showcase` | Uses unverified 6 axes not matching `skillLabels.ts` (`GROUP_LABELS`) and presents fixed sample data (`[0.92, 0.88, ...]`) without an illustration label. |
| `CompetencyRadarVisual.tsx:134-147` | `20 / Kỹ Năng Chuẩn Hóa / Khung năng lực kiểm định đa nguồn`, `60s / Hiệu Lực Vé SSO / Vé định danh dùng một lần (TTL 60s)`, `5 / Vai Trò Hệ Thống / Phân quyền RBAC chuẩn xác minh` | `internal or technical showcase` | Explicitly listed in `PROMPT_UIUX_EN.txt`: boasts `TTL 60s`, `RBAC`, `5 Vai Trò Hệ Thống`, and `Kỹ Năng Chuẩn Hóa` counters. |
| `LoginPage.tsx:35,37,39` | `Cổng Định Danh Bảo Mật` / `Cổng Đăng Nhập` / `Hệ thống tuyển dụng và đánh giá năng lực kỹ sư Rikkei Education` | `filler` | Redundant `"Cổng Định Danh Bảo Mật"` badge and Title-Case heading. |
| `LoginPage.tsx:44,59,71` | `Phương thức đăng nhập`, `Qua LMS (SSO)`, `Doanh Nghiệp` | `functional help` | Clear tab labels (refine to glossary terms `Đăng nhập qua LMS` and `Tài khoản doanh nghiệp`). |
| `LmsLoginForm.tsx:59,69,77,82` | `Mã vé SSO (Ticket từ LMS)` / `Dán mã vé SSO (ví dụ: ticket-sv-001-...)` / `Vé SSO có thời hạn sử dụng 60 giây và chỉ dùng một lần.` / `Xác Thực & Đăng Nhập` | `functional help` | Hint about 60s single-use is useful functional help; button text `Xác Thực & Đăng Nhập` is slightly formal Title-Case. |
| `LmsLoginForm.tsx:91-118` | `Lấy vé nhanh (Chỉ môi trường Dev)`, chips `candidate1 (Ứng viên 1)` .. `admin1 (Quản trị viên)`, `Không thể lấy vé từ Mock LMS` | `developer-only` | Dev/QA helper; must be visually separated and collapsed by default in `import.meta.env.DEV` only, preserving QA accessibility. Note also `mentor1 (Giảng viên)` and `staff1 (Cán bộ tuyển sinh)` deviate from canonical `Mentor` / `Nhân viên`. |
| `EnterpriseLoginForm.tsx:25,72,82,98` | `Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại thông tin.`, `Đăng nhập không thành công`, `Tài khoản của bạn đã bị tạm khóa do nhập sai mật khẩu quá 5 lần.`, `Thử lại` | `functional help` | Concrete, actionable auth feedback. |
| `EnterpriseLoginForm.tsx:116,126,139,142,145,157,162` | `Email Doanh Nghiệp`, `hr@company.com`, `Mật Khẩu`, `Quên mật khẩu?`, `Nhập mật khẩu`, `Đang xác thực...`, `Đăng Nhập` | `functional help` | Functional form labels (normalize casing from Title-Case to sentence-case where tests allow or update tests cleanly). |
| `LockoutCountdown.tsx:12,43,47` | `Tài khoản tạm thời bị khóa do nhập sai quá 5 lần.`, `Vui lòng thử lại sau:`, `Thời gian chờ: {minutes} phút {seconds} giây` | `functional help` | Clear user-facing security guidance. |

### 2.3 Password Recovery, Forced Change Password & SSO Callback (`/forgot-password`, `/reset-password`, `/change-password`, `/sso-callback`)

| File & Line | Current User-Visible Text (Verbatim) | Classification | Rationale / Lý do phân loại |
|---|---|---|---|
| `ForgotPasswordPage.tsx:33-36` | `Kênh Khôi Phục Truy Cập Doanh Nghiệp` / `Khôi Phục Quyền Truy Cập An Toàn — Bảo Mật Đa Tầng` / `Liên kết xác thực khôi phục mật khẩu một lần (TTL 30 phút) được gửi riêng tới email doanh nghiệp đã xác minh, bảo đảm tính toàn vẹn và chống tấn công dò quét tài khoản.` | `internal or technical showcase` + `filler` | Contains `TTL 30 phút`, `Bảo Mật Đa Tầng`, `chống tấn công dò quét tài khoản` (anti-enumeration internals). |
| `ForgotPasswordPage.tsx:42-65,101-146` | `Khôi Phục Mật Khẩu`, `Quên Mật Khẩu`, `Nhập email tài khoản doanh nghiệp để nhận liên kết khôi phục mật khẩu`, `Yêu cầu đã được ghi nhận!`, `Nếu email tồn tại trong hệ thống, liên kết khôi phục (hiệu lực 30 phút) đã được gửi đến hòm thư của bạn.`, `Email Doanh Nghiệp`, `Hệ thống sẽ gửi mã xác thực an toàn tới địa chỉ email này.`, `Gửi Liên Kết Khôi Phục`, `Quay lại Trang Đăng Nhập` / `Quay lại Đăng nhập` | `functional help` | Functional form copy and 30-min hint (`hiệu lực 30 phút` is helpful); standardize sentence-case and note link vs code (`liên kết khôi phục`, not `mã xác thực`). |
| `ForgotPasswordPage.tsx:70-88` | `Môi trường phát triển (Dev)`, `Kiểm tra email reset mật khẩu tại Mailpit UI: http://127.0.0.1:8025` | `developer-only` | Dev-only Mailpit hint; collapse/visually separate as secondary helper. |
| `ResetPasswordPage.tsx:48-51` | `Xác Thực Đặt Lại Mật Khẩu` / `Thiết Lập Mật Khẩu Mới — Bảo Đảm Tiêu Chuẩn ASVS` / `Quy trình đặt lại mật khẩu bảo vệ tài khoản doanh nghiệp khỏi tấn công brute-force và rò rỉ thông tin thông qua mã token ngẫu nhiên entropy cao.` | `internal or technical showcase` | Mentions `Tiêu Chuẩn ASVS`, `brute-force`, `mã token ngẫu nhiên entropy cao`. |
| `ResetPasswordPage.tsx:57-68,97-184` | `Thiết Lập Mật Khẩu`, `Đặt Lại Mật Khẩu`, `Nhập mật khẩu mới an toàn cho tài khoản của bạn`, `Mã token xác thực không tìm thấy trên đường dẫn...`, `Thành Công!`, `Mật khẩu đã được cập nhật thành công...`, `Đi đến Đăng Nhập`, `Mã Token Xác Thực`, `Mật Khẩu Mới`, `Xác Nhận Mật Khẩu Mới`, `Đang cập nhật...`, `Đặt Lại Mật Khẩu`, `Quay lại Đăng nhập` | `functional help` | Clear user guidance; simplify `Mã Token Xác Thực` -> `Mã đặt lại mật khẩu` (or keep functional clarity without jargon). |
| `ChangePasswordPage.tsx:77-80` | `Bảo Mật & Tuân Thủ Tiêu Chuẩn ASVS` / `Nâng Cao Tiêu Chuẩn An Toàn — Bảo Vệ Dữ Liệu Tuyển Dụng` / `Rikkei Jobs áp dụng quy chuẩn độ phức tạp mật khẩu cao cấp nhằm ngăn ngừa rủi ro rò rỉ dữ liệu và bảo vệ quyền sở hữu trí tuệ...` | `internal or technical showcase` + `filler` | Mentions `ASVS`, `cao cấp`, `nâng cao tiêu chuẩn`. |
| `ChangePasswordPage.tsx:86-181` | `Bảo Mật Tài Khoản`, `Đổi Mật Khẩu`, `Thiết lập mật khẩu mới an toàn cho tài khoản của bạn`, `Yêu Cầu Đổi Mật Khẩu: Bạn phải đổi mật khẩu trước khi có thể truy cập các tính năng khác của hệ thống.`, `Mật Khẩu Hiện Tại`, `Mật Khẩu Mới`, `Xác Nhận Mật Khẩu Mới`, `Đang xử lý...`, `Cập Nhật Mật Khẩu`, `Đăng Xuất` | `functional help` | Necessary forced-change guidance; polish to sentence-case. |
| `PasswordField.tsx:64` & `PasswordValidationList.tsx:23-40` | `Hiện mật khẩu` / `Ẩn mật khẩu`, `Quy tắc mật khẩu`, `Tối thiểu 8 ký tự`, `Chứa ít nhất 1 chữ cái`, `Chứa ít nhất 1 chữ số`, `Mật khẩu xác nhận trùng khớp` | `functional help` | Concrete, accurate rules matching backend policy. |
| `SsoCallbackPage.tsx:96-99` | `Tiến Trình Xác Thực Vé Định Danh SSO` / `Xác Thực Định Danh Đơn Lần — Liên Thông Toàn Diện LMS` / `Cơ chế định danh một lần (Single Sign-On) bảo mật cao theo chuẩn ASVS V2/V4...` | `internal or technical showcase` + `filler` | Exposes `ASVS V2/V4`, `Single Sign-On`, buzzword `Liên Thông Toàn Diện`. |
| `SsoCallbackPage.tsx:110-146,168-272` | `Đang xác thực vé SSO từ LMS...`, `1. Đọc vé xác thực SSO`, `2. Kiểm tra chữ ký số LMS`, `3. Cấp phiên làm việc an toàn`, `Xác lập phiên JWT và cấp quyền truy cập`, `Xác Thực Thất Bại`, `Đăng Nhập Thành Công!`, `Chào mừng {fullName} ({role}). Đang chuyển hướng về trang chủ...`, `Quay lại Trang Đăng Nhập` | `internal or technical showcase` (line 143 `phiên JWT`, line 132 `chữ ký số`, line 249 `hợp chuẩn`) + `functional help` | Replace internal `JWT` and `chữ ký số` jargon with plain user language (`Kiểm tra thông tin từ LMS`, `Mở phiên làm việc`). |

### 2.4 Shared Dashboard Layout, Sidebar & Role Homes (`SharedAppLayout.tsx`, `roleMenuConfig.ts`, `RoleHomeLayout.tsx`, 5 Role Homes, `ForbiddenPage.tsx`)

| File & Line | Current User-Visible Text (Verbatim) | Classification | Rationale / Lý do phân loại |
|---|---|---|---|
| `SharedAppLayout.tsx:314,327,360,363,371,405,411,421,429,439` | `Bỏ qua tới nội dung chính`, `Đóng menu điều hướng`/`Mở menu điều hướng`, `Chuyển sang chế độ sáng`/`Chuyển sang chế độ tối`, `Chế độ sáng`/`Chế độ tối` (button text), `Đăng Xuất`, `Mở rộng thanh điều hướng`/`Thu gọn thanh điều hướng` (text + aria-label), `Đóng bảng điều hướng`, `Điều hướng theo vai trò`, `{label} — Sắp ra mắt` | `functional help` | Note M1 rules: sidebar toggle becomes **icon-only** (keep `aria-label` + add tooltip); theme toggle becomes **icon switch** (`role="switch"`, `aria-label="Chế độ tối"`, remove visible text `Chế độ sáng`/`Chế độ tối`). |
| `SharedAppLayout.tsx:340` | `Rikkei Jobs Cổng Quản Trị` | `internal or technical showcase` | Misleading across roles: a Candidate or Mentor is NOT in an `"Admin Portal"` (`Cổng Quản Trị`). Use `Rikkei Jobs` (or role-appropriate subtitle). |
| `roleMenuConfig.ts:14-131` | `Trang chủ`, `Hồ sơ`, `Việc làm`, `Ứng tuyển (Sắp ra mắt)`, `Lộ trình`, `Trợ lý AI (Sắp ra mắt)`, `Công ty`, `JD (Sắp ra mắt)`, `Tuyển dụng (Sắp ra mắt)`, `Thực tập sinh (Sắp ra mắt)`, `Cần đánh giá (Sắp ra mắt)`, `Duyệt hồ sơ (Sắp ra mắt)`, `Duyệt JD (Sắp ra mắt)`, `Doanh nghiệp (Sắp ra mắt)`, `Ghép thực tập (Sắp ra mắt)`, `Báo cáo (Sắp ra mắt)`, `Quản trị (Sắp ra mắt)` | `functional help` | Verified NT-02 menu items and honest `Sắp ra mắt` badges; keep structure intact. |
| `RoleHomeLayout.tsx:67,74,87,96,100,124` | `Chào mừng, {fullName}!`, `Đổi Mật Khẩu`, `Thông Tin Tài Khoản`, `Họ và tên`, `Địa chỉ Email`, `Trạng thái tài khoản` | `user value` + `functional help` | Useful personal account summary. |
| `RoleHomeLayout.tsx:92,104,113,119` | `Mã người dùng (User ID)`, `Vai trò hệ thống`, `Mã doanh nghiệp (Company ID)`, `Tài khoản LMS liên kết` | `internal or technical showcase` | Internal DB/tech wording (`User ID`, `Company ID`, `Vai trò hệ thống`, `Tài khoản LMS liên kết`) explicitly flagged in `PROMPT_UIUX_EN.txt`. |
| `CandidateHomePage.tsx:12,23-148` | `Trang chủ dành cho học viên và ứng viên...`, `Hồ Sơ Tuyển Dụng` (no link/no Sắp ra mắt label!), `Khóa Học & Chứng Chỉ LMS` (no Sắp ra mắt label!), `Hồ Sơ Năng Lực` (`Xem Hồ Sơ Năng Lực`), `Khoảng Thiếu Hụt Năng Lực` (`Phân Tích Khoảng Thiếu`), `Đánh Giá Từ Mentor` (`Xem Đánh Giá`) | `user value` (last 3) / `internal or technical showcase` or misleading availability (first 2) | First 2 cards describe features not yet built on UI without saying `Sắp ra mắt`. Mark honestly as `Sắp ra mắt` and refine voice to active, sentence-case Vietnamese. |
| `HrHomePage.tsx:9,12,32-74` | `Doanh nghiệp (HR)`, `Trang chủ quản trị dành cho nhà tuyển dụng...`, `Hồ Sơ Công Ty` (`Hồ sơ công ty`), `Đăng Tin Tuyển Dụng` (uses `xuất bản`, missing `Sắp ra mắt`), `Quản Lý Ứng Viên` (missing `Sắp ra mắt`) | `user value` (card 1) / misleading availability (cards 2–3) | Unimplemented cards must be clearly marked `Sắp ra mắt`. `Trang chủ quản trị` sounds like Admin rather than HR. |
| `MentorHomePage.tsx:7,10,14-23` | `Giảng viên / Mentor`, `Trang chủ dành cho giảng viên...`, `Đánh Giá Ứng Viên`, `Theo Dõi Thực Tập` | `user value` (needs `Sắp ra mắt` marker) | Features are not wired to UI yet (`Cần đánh giá` in sidebar is disabled `Sắp ra mắt`). Clearly mark `Sắp ra mắt` and unify role label `Mentor`. |
| `StaffHomePage.tsx:7,10,14-23` | `Cán bộ tuyển sinh`, `Trang chủ vận hành tiếp nhận hồ sơ, đối soát hợp đồng...`, `Tiếp Nhận & Điều Phối`, `Báo Cáo Tỷ Lệ Có Việc` | `user value` (inaccurate term + missing `Sắp ra mắt`) | `Cán bộ tuyển sinh` conflicts with `enumLabels.ts` (`Nhân viên`) and `Rikkei Project1.pdf` (`Nhân viên / Cán bộ vận hành`); `đối soát hợp đồng` is not in product scope. Also mark unimplemented cards `Sắp ra mắt`. |
| `AdminHomePage.tsx:7,10,14-23` | `Quản trị viên`, `Trung tâm điều hành cấu hình phân quyền hệ thống, tài khoản và tích hợp dịch vụ`, `Quản Trị Người Dùng & Phân Quyền`, `Giám Sát Tích Hợp LMS SSO` (`Theo dõi nhật ký xác thực vé SSO, tỉ lệ thành công và trạng thái kết nối backend.`) | `internal or technical showcase` | Mentions `trạng thái kết nối backend`, `tích hợp dịch vụ`, and describes unimplemented UI without `Sắp ra mắt`. Align with real `ADMIN` domain duties (`danh mục 20 kỹ năng, trọng số nguồn đánh giá, xử lý báo sai bằng chứng, nhật ký thao tác`) + mark `Sắp ra mắt`. |
| `ForbiddenPage.tsx:41,48,51-64` | `Rikkei Jobs`, `403`, `Bạn không có quyền truy cập trang này`, `Tài khoản của bạn không được cấp quyền truy cập khu vực này.`, `Vai trò hiện tại:`, `Quay lại trang chủ` | `functional help` | Concise and clear; note `<BrandMark /> + Rikkei Jobs` inside the 403 card duplicates the `SharedAppLayout` top bar (can be simplified visually while keeping role & CTA clear). |

### 2.5 Company Profile (`/hr/company`: `CompanyProfilePage`, `CompanyProfileForm`, `CompanyLogoPanel`, `CompanyStatusBadge`, `companyValidation.ts`)

| File & Line | Current User-Visible Text (Verbatim) | Classification | Rationale / Lý do phân loại |
|---|---|---|---|
| `CompanyProfilePage.tsx:55,61-65,71-101,144-165` | `Quay lại trang chủ HR`, `Hồ sơ công ty`, `Xem thông tin pháp lý cố định và cập nhật hồ sơ hiển thị của doanh nghiệp trên Rikkei Jobs.`, loading/empty/error states (`Đang tải hồ sơ công ty`, `Chưa có hồ sơ doanh nghiệp`, `Không thể tải hồ sơ công ty`, `Thử lại`), `Thông tin định danh`, `Mã số thuế`, `Trạng thái doanh nghiệp` | `user value` + `functional help` | Clean, role-centered copy. Polish `Thông tin định danh` -> `Thông tin pháp lý cố định` for plain clarity. |
| `CompanyProfileForm.tsx:94,108-112,132,154-350` | `Thông tin doanh nghiệp`, `Cập nhật thông tin giới thiệu, địa điểm và trang web chính thức của công ty.`, `Tải lại dữ liệu mới nhất`, field labels (`Tên công ty *`, `Ngành nghề`, `Quy mô nhân sự`, `Trang web`, `Địa chỉ`, `Thành phố`, `Mô tả công ty`), hints (`Sử dụng đường dẫn đầy đủ bắt đầu bằng http:// hoặc https://`, `Tối đa 2.000 ký tự.`), `Lưu thay đổi` / `Đang lưu...` | `functional help` | Clear, concrete, accurate. |
| `CompanyLogoPanel.tsx:100-260` | `Logo doanh nghiệp`, `Hiển thị cùng tin tuyển dụng và hồ sơ công ty với ứng viên.`, `Chưa có logo công ty`, `Không thể tải ảnh logo`, `Tải lại ảnh`, `Đang tải lên logo...`, `Tải lên logo`, `Kéo thả ảnh vào đây hoặc nhấn để chọn tệp`, `Hỗ trợ ảnh JPG hoặc PNG, dung lượng tối đa 2 MB.` | `functional help` | Clear states and exact file rules (`JPG/PNG <= 2 MB`). |
| `companyValidation.ts`, `useCompanyProfile.ts`, `useCompanyLogo.ts`, `company.types.ts` | Validation messages (`Vui lòng nhập tên công ty.`, `Dung lượng logo vượt quá giới hạn tối đa 2 MB (2.097.152 byte).`, 409 conflict message, 502 storage fallback, `Đã lưu thay đổi hồ sơ công ty.`, `Đã tải lên logo công ty thành công.`, size options `1 - 50 nhân viên` .. `Trên 1.000 nhân viên`) | `functional help` | Accurate, helpful, non-technical error handling (even sanitizes Cloudinary URLs/keys). |

### 2.6 Candidate Feature Pages (`/candidate/skills`, `/candidate/jobs`, `/candidate/jobs/:jobId`, `/candidate/gap-analysis`, `/candidate/evaluations`)

| File & Line | Current User-Visible Text (Verbatim) | Classification | Rationale / Lý do phân loại |
|---|---|---|---|
| `SkillProfilePage.tsx:60-61,105-203` | `Hồ sơ năng lực`, `Chỉ số 0 - 100 theo từng kỹ năng, tách rõ phần đã xác thực từ LMS, bài thi, thực tập và phần tự khai.`, `Đang tải hồ sơ kỹ năng...`, `Chưa có kỹ năng nào. Nhấn "Tính lại từ LMS, Exam, PM" để tổng hợp từ kết quả học tập.`, `Tóm tắt` (`Tổng số kỹ năng`, `Đã xác thực`, `Chỉ tự khai`), `Tính lại từ LMS, Exam, PM`, `Thang bậc`, `Chỉ số xác thực là trung bình có trọng số của bằng chứng; bằng chứng cũ hơn 1 năm được tính nửa trọng số.` | `user value` + `functional help` | Very strong domain copy; minor polish needed on line 61 (`Không thể kết nối đến máy chủ Backend` -> `Không thể kết nối đến máy chủ. Vui lòng thử lại.`) and line 186 (`Tính lại từ LMS, Exam, PM` -> `Cập nhật từ dữ liệu học tập` or keep recognizable if tests require; see Section 6/7). |
| `SkillItem.tsx:35,49,58,63,67,77,89` & `skillLabels.ts:4-43` | `Chưa có chỉ số xác thực`, `Đã xác thực`, `Tự khai`, `Tự đánh giá {score}`, `Bằng chứng ({n})`, `Bảng điểm LMS`, `Bài thi`, `Thực tập IOC`, `Mentor đánh giá`, `Tự đánh giá`, `Cơ bản`/`Khá`/`Tốt`/`Xuất sắc` | `user value` + `functional help` | Matches domain model accurately. |
| `CandidateJobsPage.tsx:15-18` & `JobRecommendationsSection.tsx:106-110` | `Việc làm gợi ý`, `Khám phá các vị trí thực tập và việc làm phù hợp với hồ sơ năng lực của bạn.`, `Việc làm phù hợp với bạn`, `Hệ thống tự động phân tích hồ sơ năng lực đã xác thực và gợi ý các vị trí tối ưu nhất` | `filler` (word `tối ưu nhất`) + `user value` | Remove `tối ưu nhất` and `Hệ thống tự động...` -> state plainly that jobs are matched against verified skills. |
| `JobRecommendationsSection.tsx:124-151` | `Làm mới` / `Đang tính toán...`, `Đã tìm thấy {n} vị trí phù hợp nhất với năng lực của bạn`, `Đã lưu bộ nhớ đệm (hiệu lực 24h)` / `Mới tính toán`, `AI Provider: {meta.activeProvider}` | `internal or technical showcase` + `filler` | `AI Provider: {meta.activeProvider}` exposes backend AI provider implementation! `Đã lưu bộ nhớ đệm (hiệu lực 24h)` is technical caching jargon; `phù hợp nhất` is superlative filler. |
| `JobRecommendationsSection.tsx:159-253` | Loading/Error/Empty states, `{score}% khớp`, `Do AI tạo` / `Gợi ý hệ thống`, `Kỹ năng phân tích:`, `Ứng tuyển ngay` (Note: currently an inactive `<button>`!), `Chi tiết JD` | `functional help` + `user value` (note unimplemented `Ứng tuyển ngay`) | Note: `Ứng tuyển ngay` currently has no `onClick` handler (recruitment application module is `Sắp ra mắt`). Mark clearly or disable as `Ứng tuyển (Sắp ra mắt)` unless wired, without breaking tests. |
| `GapAnalysisSection.tsx:104-162`, `GapSkillsTable.tsx:20-50`, `JobDetailPanel.tsx:74-154`, `gapUtils.ts:9-11` | `Phân tích khoảng thiếu hụt năng lực`, `So sánh điểm kỹ năng đã xác thực với yêu cầu của vị trí mục tiêu hoặc JD.`, `Vị trí mục tiêu`, `Sẵn sàng {n}%`, `Bạn đã đáp ứng toàn bộ kỹ năng của mục tiêu này.`, table headers `Kỹ năng / Yêu cầu / Hiện tại / Thiếu / Ưu tiên`, `Quay lại trang ứng viên`, `Phân tích so với JD này`, `Không thể kết nối đến máy chủ Backend` (`gapUtils.ts:11`) | `user value` + `functional help` (except `gapUtils.ts:11` tech word `Backend`) | Replace `máy chủ Backend` in `gapUtils.ts:11` with `máy chủ`. Note also `JobDetailPanel.tsx:72` links back to `/candidate` (`Quay lại trang ứng viên`) — clarify label to `Quay lại trang chủ` or keep aligned with test. |
| `CandidateEvaluations.tsx:68-136`, `EvaluationCard.tsx:31-126`, `EvaluationScoreItem.tsx:9-59` | `Đánh giá từ mentor`, `Tổng số phiếu`, `Đánh giá từ {mentor.name}`, `Phỏng vấn` / `Thực tập`, `Xem chi tiết` / `Ẩn chi tiết`, `Kết quả theo từng tiêu chí`, `Nhận xét tổng quan`, empty/loading/error states | `user value` + `functional help` | Authentic, role-centered, clear empty/loading/error states. |

### 2.7 Shared Primitives (`Select.tsx`, `enumLabels.ts`, `httpClient.ts`, `AuthContext.tsx`)

| File & Line | Current User-Visible Text (Verbatim) | Classification | Rationale / Lý do phân loại |
|---|---|---|---|
| `Select.tsx:874` | `Không có lựa chọn` | `functional help` | Clean empty listbox fallback. |
| `enumLabels.ts:16-35` | `Không xác định`, `Ứng viên`, `HR`, `Mentor`, `Nhân viên`, `Quản trị viên`, `Đang hoạt động`, `Đã khóa`, `Yêu cầu đổi mật khẩu` | `functional help` | Canonical localization contract from `NT-02` / `DN-01`. |
| `httpClient.ts:130` | `Yêu cầu thất bại với mã trạng thái {status}` | `internal or technical showcase` | Technical HTTP status phrasing fallback when backend does not return JSON error message; rewrite to user-friendly message (`Không thể xử lý yêu cầu (mã lỗi {status}). Vui lòng thử lại.`). |

---

## Section 3 — Screen-by-Screen Content Map / Bản đồ nội dung theo từng màn hình

| Route & Screen | Purpose for That User / Mục đích cho người dùng | Headline (VI) | Supporting Text (VI) | Primary Action (VI) | Functional Hints & Constraints | Empty / Loading / Error / Success States |
|---|---|---|---|---|---|---|
| `/` (Public Landing) | Help visitors understand what Rikkei Jobs does and choose how to sign in. | `Kết nối học viên Rikkei Education với doanh nghiệp qua năng lực đã xác thực` | `Hồ sơ năng lực tổng hợp từ kết quả học tập LMS, bài thi khảo thí, thực tập IOC và đánh giá của mentor.` | `Đăng nhập vào Rikkei Jobs` (`/login`) | Two login channels: LMS account (`CANDIDATE`, `MENTOR`, `STAFF`, `ADMIN`) and Enterprise account (`HR`). | Skill tab when logged out: prompt to sign in + CTA to `/login`. Dev-only health widget collapsed/removed from primary UX. |
| `/login` (LMS Tab) | Let learners, mentors, staff, and admins sign in using an LMS ticket. | `Đăng nhập Rikkei Jobs` | `Chọn tài khoản LMS hoặc tài khoản doanh nghiệp để tiếp tục.` | `Đăng nhập qua LMS` | Functional hint: `Vé đăng nhập từ LMS chỉ dùng một lần và hết hạn sau 60 giây.` | Invalid/empty ticket disabled submit; error alert from `/sso-callback`; dev-only quick tickets collapsed inside dev helper box. |
| `/login` (Enterprise Tab) | Let company HR users sign in with their issued email and password. | `Đăng nhập Rikkei Jobs` | `Dành cho đại diện doanh nghiệp sử dụng email và mật khẩu được cấp.` | `Đăng nhập` | Lockout rule: 5 failed attempts trigger a 15-minute cooldown (`LockoutCountdown`). Link to `/forgot-password`. | Inline error alert (`Email hoặc mật khẩu không chính xác.`); lockout countdown state with `Thử lại` button. |
| `/sso-callback` | Exchange the 60s LMS ticket and route the user to their role home. | `Đang xác thực đăng nhập từ LMS...` | `Hệ thống đang kiểm tra vé đăng nhập của bạn.` | `Quay lại trang đăng nhập` (on error) | 3-step user-friendly timeline: 1. Tiếp nhận vé từ LMS, 2. Kiểm tra thông tin tài khoản, 3. Mở phiên làm việc. | Loading spinner + timeline; Error alert (`Vé đăng nhập không hợp lệ, đã hết hạn sau 60 giây hoặc đã được sử dụng.`); Success confirmation + auto-redirect. |
| `/forgot-password` | Let HR users request a password reset link by email. | `Quên mật khẩu` | `Nhập email tài khoản doanh nghiệp để nhận liên kết đặt lại mật khẩu.` | `Gửi liên kết đặt lại mật khẩu` | Functional hint: `Liên kết đặt lại mật khẩu dùng một lần và có hiệu lực trong 30 phút.` | Loading (`Đang gửi...`); Success anti-enumeration notice; Error alert; dev-only Mailpit link collapsed in dev helper. |
| `/reset-password/:token` | Let HR users set a new password from an email link. | `Đặt lại mật khẩu` | `Nhập mật khẩu mới cho tài khoản doanh nghiệp của bạn.` | `Đặt lại mật khẩu` | Password rules: minimum 8 characters, at least 1 letter, at least 1 digit, confirmation must match. | Missing token alert; Loading (`Đang cập nhật...`); Error alert; Success screen with CTA `Đi đến đăng nhập`. |
| `/change-password` | Enforce first-time password change for HR accounts before dashboard access. | `Đổi mật khẩu` | `Đổi mật khẩu mặc định trước khi sử dụng tài khoản doanh nghiệp.` | `Cập nhật mật khẩu` (Secondary: `Đăng xuất`) | Warning banner explaining why access is paused until password update; same 8-char/letter/digit rules. | Loading (`Đang xử lý...`); Error alert; Success banner + auto-redirect to role home. |
| `SharedAppLayout` (Shell) | Provide consistent brand anchor, role badge, theme switch, logout, and role-isolated sidebar. | Brand link: `Rikkei Jobs` (role-neutral, links to role home) | Role badge (`Ứng viên` / `HR` / `Mentor` / `Nhân viên` / `Quản trị viên`) + user full name | Sidebar navigation + `Đăng xuất` | Sidebar toggle: icon-only button (`Thu gọn thanh điều hướng` / `Mở rộng thanh điều hướng`, tooltip <= 200 ms, Escape dismisses). Theme toggle: icon switch (`role="switch"`, `aria-label="Chế độ tối"`). | Collapsed rail tooltips on hover & focus; disabled menu items labeled `Sắp ra mắt` (`aria-disabled="true"`). |
| `/candidate` (Role Home) | Give candidates a clear overview of their account and next steps. | `Chào mừng, {fullName}!` | `Theo dõi hồ sơ năng lực, phân tích kỹ năng còn thiếu và xem đánh giá từ mentor.` | `Xem hồ sơ năng lực` (`/candidate/skills`) | Action cards clearly distinguish live modules (`/candidate/skills`, `/candidate/gap-analysis`, `/candidate/evaluations`) vs `Sắp ra mắt` (`Ứng tuyển & CV`, `Khóa học LMS`). | Account summary table uses human labels (`Họ và tên`, `Email`, `Vai trò`, `Mã học viên LMS`, `Trạng thái tài khoản`). |
| `/candidate/skills` | Show verified vs self-declared 0–100 skill scores and underlying evidence. | `Hồ sơ năng lực` | `Điểm 0–100 theo từng kỹ năng, tách biệt phần đã xác thực từ LMS, bài thi, thực tập IOC, mentor và phần tự khai.` | `Tính lại từ dữ liệu học tập` (or `Tính lại từ LMS, Exam, PM`) | Shows 4 bands (`Cơ bản 0–39`, `Khá 40–69`, `Tốt 70–84`, `Xuất sắc 85–100`) and 1-year half-weight rule. | Loading (`Đang tải hồ sơ kỹ năng...`); Empty (`Chưa có dữ liệu kỹ năng...`); Error alert. |
| `/candidate/jobs` | Show job recommendations matched to the candidate's skill profile. | `Việc làm gợi ý` | `Các vị trí phù hợp dựa trên điểm kỹ năng đã xác thực của bạn.` | `Chi tiết JD` (`/candidate/jobs/:jobId`) | Shows match percentage (`{score}% khớp`), required vs candidate score per skill, and refresh timestamp/status without exposing backend AI provider names. | Loading; Error with `Thử lại`; Empty (`Hiện chưa có vị trí phù hợp với hồ sơ kỹ năng hiện tại của bạn.`). Note: `Ứng tuyển` marked `Sắp ra mắt` until recruitment flow ships. |
| `/candidate/jobs/:jobId` | Let candidates inspect a JD and run gap analysis against that specific JD. | `{job.title}` | `{job.companyName}` + location, salary range, deadline, required skill thresholds. | `Phân tích so với JD này` | Displays `Bắt buộc` tags on mandatory skills and readiness `%` after analysis. | Loading (`Đang tải chi tiết tin tuyển dụng...`); Error (`Không tìm thấy...` / invalid ID); Analysis error preserves JD view. |
| `/candidate/gap-analysis` | Let candidates pick a target position and inspect missing skills and priorities. | `Phân tích khoảng thiếu hụt năng lực` | `So sánh kỹ năng đã xác thực của bạn với yêu cầu của vị trí mục tiêu hoặc tin tuyển dụng.` | Select `Vị trí mục tiêu` | Displays readiness `%` and priority levels (`Cao`, `Trung bình`, `Thấp`). | Loading; Prompt when no target selected; Empty table (`Bạn đã đáp ứng toàn bộ kỹ năng của mục tiêu này.`); Error alert. |
| `/candidate/evaluations` | Let candidates review mentor feedback and criterion-by-criterion scores. | `Đánh giá từ mentor` | `Xem điểm số từng tiêu chí và nhận xét của mentor sau phỏng vấn hoặc thực tập IOC.` | `Xem chi tiết` / `Ẩn chi tiết` | Accordion per evaluation showing mentor, date, context (`Phỏng vấn` / `Thực tập`), scores `/100`, overall comment. | Missing account state; Loading; Error with `Thử lại`; Empty (`Chưa có đánh giá nào từ mentor...`). |
| `/hr` (Role Home) | Give HR users quick access to company profile and honest visibility into upcoming tools. | `Chào mừng, {fullName}!` | `Quản lý thông tin doanh nghiệp và chuẩn bị hoạt động tuyển dụng, tiếp nhận thực tập sinh.` | `Hồ sơ công ty` (`/hr/company`) | Clearly marks `Đăng tin tuyển dụng (JD)` and `Quản lý ứng viên` as `Sắp ra mắt`. | Account table uses plain HR labels (`Họ và tên`, `Email`, `Vai trò`, `Trạng thái tài khoản`; hide raw `Company ID` unless needed as `Mã hồ sơ công ty`). |
| `/hr/company` | Let HR update public company information and logo while viewing read-only legal fields. | `Hồ sơ công ty` | `Cập nhật thông tin giới thiệu và logo doanh nghiệp hiển thị tới ứng viên trên Rikkei Jobs.` | `Lưu thay đổi` + `Tải lên logo` | Logo: JPG/PNG <= 2 MB (`2.097.152 byte`). Description: max 2.000 chars. URL: `http://` or `https://`. Tax code & status are read-only. | Loading; Empty 404; Error with `Thử lại`; 409 conflict with `Tải lại dữ liệu mới nhất`; Inline polite validation; Logo skeleton/placeholder/CDN-error retry; Success banners. |
| `/mentor` (Role Home) | Orient mentors to their evaluation responsibilities and upcoming queue. | `Chào mừng, {fullName}!` | `Đánh giá năng lực học viên sau phỏng vấn và các đợt thực tập IOC.` | Account overview (evaluation queue `Sắp ra mắt`) | `Đánh giá ứng viên` and `Theo dõi thực tập IOC` clearly labeled `Sắp ra mắt`. | Account summary card + `Đổi mật khẩu` link if applicable. |
| `/staff` (Role Home) | Orient recruiting/operations staff to profile review, company onboarding, and IOC matching. | `Chào mừng, {fullName}!` | `Điều phối hồ sơ ứng viên, doanh nghiệp đối tác, tin tuyển dụng và đợt thực tập IOC.` | Account overview (staff workflows `Sắp ra mắt`) | Cards `Duyệt hồ sơ & doanh nghiệp`, `Duyệt tin tuyển dụng & ghép IOC`, `Báo cáo tuyển dụng` marked `Sắp ra mắt`. | Account summary card. |
| `/admin` (Role Home) | Orient administrators to catalog governance, evidence weights, disputes, and audit logs. | `Chào mừng, {fullName}!` | `Quản lý khung kỹ năng, trọng số đánh giá, xử lý báo sai bằng chứng và nhật ký hệ thống.` | Account overview (admin console `Sắp ra mắt`) | Cards `Danh mục kỹ năng & trọng số`, `Xử lý báo sai & nhật ký thao tác` marked `Sắp ra mắt`. | Account summary card. |
| `/403` (`ForbiddenPage`) | Explain access denial clearly inside the user's current layout without leaking other roles. | `Bạn không có quyền truy cập trang này` | `Tài khoản của bạn không có quyền mở khu vực này.` | `Quay lại trang chủ` (links to user's own role home) | Shows HTTP `403` and localized current role (`getRoleLabel`). | Fallback role `Không xác định` links to `/login`. |

---

## Section 4 — Terminology Glossary (EN + VI) / Bảng thuật ngữ nhất quán

Use these exact terms across all UI screens, tooltips, and labels:

| Concept (EN) | Canonical Vietnamese Term (VI) | Do NOT Use / Tránh dùng | Notes & Traceability |
|---|---|---|---|
| Sign-in via LMS (for `CANDIDATE`, `MENTOR`, `STAFF`, `ADMIN`) | `Đăng nhập qua LMS` (ticket field: `Mã vé đăng nhập từ LMS`) | `Qua LMS (SSO)`, `Cổng Định Danh Bảo Mật`, `Single Sign-On`, `TTL 60s` | `Rikkei Project1.pdf`: 4 roles sign in via LMS SSO ticket. |
| Sign-in for Company HR | `Tài khoản doanh nghiệp` (email field: `Email doanh nghiệp`) | `Doanh Nghiệp` (standalone), `Cổng Định Danh Doanh Nghiệp` | Distinguishes HR email+password from LMS flow. |
| Role: `CANDIDATE` | `Ứng viên` | `CANDIDATE`, `Học viên / Sinh viên` in badge | Canonical `enumLabels.ts` (`NT-02` verified). |
| Role: `HR` | `HR` (in descriptions: `HR / Đại diện doanh nghiệp`) | `Doanh nghiệp (HR)` in role badge, `Quản trị HR` | Canonical `enumLabels.ts` (`DN-01-polish2` decision). |
| Role: `MENTOR` | `Mentor` | `MENTOR`, `Giảng viên` (`LmsLoginForm` chip) | Canonical `enumLabels.ts`; replace `Giảng viên` in dev chip. |
| Role: `STAFF` | `Nhân viên` (in descriptions: `Nhân viên vận hành` / `Cán bộ vận hành`) | `STAFF`, `Cán bộ tuyển sinh` (`StaffHomePage`, dev chip) | Canonical `enumLabels.ts`; matches `Rikkei Project1.pdf`. |
| Role: `ADMIN` | `Quản trị viên` | `ADMIN`, `Super Admin` | Canonical `enumLabels.ts`. |
| Verified skill score | `Đã xác thực` / `Kỹ năng đã xác thực` | `Chuẩn hóa`, `Đạt chuẩn ASVS` | Contrast cleanly against `Tự khai`. |
| Self-declared skill | `Tự khai` / `Tự đánh giá` | `Chưa kiểm định` | Never merged into verified score (`hs-01-skill-profile.md`). |
| 5 Evidence sources | `Bảng điểm LMS` (`LMS`), `Bài thi` / `Khảo thí` (`EXAM`), `Thực tập IOC` (`INTERNSHIP`), `Mentor đánh giá` (`MENTOR`), `Tự đánh giá` (`SELF`) | `Mock LMS`, `pm-service`, `re-khaothi-api` | `skillLabels.ts` + `Rikkei Project3.pdf`. |
| 20-skill framework | `20 kỹ năng được đánh giá` (only when explaining scope to users) | `20 Kỹ Năng Chuẩn Hóa` (as a boasting counter) | Traceable to Mock Guide Mục 2 & `hs-01-skill-profile.md`. |
| 4 Skill level bands | `Cơ bản` (0–39), `Khá` (40–69), `Tốt` (70–84), `Xuất sắc` (85–100) | Mixing `Vững`/`Nâng cao` on UI without mapping | Matches `skillLabels.ts` & Mock Guide implementation. |
| Unimplemented feature | `Sắp ra mắt` | Describing future features as clickable/live today | Mandatory honesty rule (`PROMPT_UIUX_EN.txt`). |
| Account & company status | `Đang hoạt động`, `Đã khóa`, `Yêu cầu đổi mật khẩu`, `Không xác định` | `ACTIVE`, `LOCKED`, `N/A` | Canonical `enumLabels.ts`. |

---

## Section 5 — Forbidden Words & Anti-Patterns List / Danh sách từ ngữ và mẫu thiết kế bị cấm

### 5.1 Forbidden Technical & Internal Showcase Terms

Never display these in production user-facing copy (headings, subtitles, badges, footers, tooltips, alerts):

- Security & auth internals: `ASVS`, `ASVS V2/V4`, `RBAC`, `TTL`, `TTL 30 phút`, `TTL 60s`, `JWT`, `phiên JWT`, `Single Sign-On`, `SSO internals`, `entropy`, `brute-force`, `chống tấn công dò quét`, `chữ ký số`.
- Architecture & project internals: `Modular Monolith`, `Skeleton`, `NT-01`, `NT-02`, `T022DB0`, `Sprint 1`, `MOD-01`..`MOD-07`, `7 Module Nghiệp vụ`, `5 Vai Trò Hệ Thống`, `React`, `Vite`, `Nginx`, `Reverse Proxy`, `DNS resolver`, `Mock`.
- Infrastructure & backend status in primary UX: `Backend`, `máy chủ Backend`, `Backend đang hoạt động`, `/api/v1/health`, `UP`/`DOWN`/`CONNECTING...`, `AI Provider`, `bộ nhớ đệm`, `Mailpit`.
- Internal database identifiers in primary user tables: `Mã người dùng (User ID)`, `Mã doanh nghiệp (Company ID)`.

### 5.2 Forbidden Buzzwords, Style Anti-Patterns & Visual Rules

- **Forbidden Vietnamese filler words**: `chuẩn xác`, `tối ưu`, `tối ưu nhất`, `toàn diện`, `tiên tiến`, `bảo đảm tuyệt đối`, `định danh chuẩn xác`, `liên thông toàn diện`, `nâng cao tiêu chuẩn`, `cao cấp`, `đa tầng`, `hợp chuẩn`.
- **Forbidden formatting**:
  - Title-Casing every word of a Vietnamese heading or button (e.g., `Cổng Định Danh Doanh Nghiệp & Học Viên`, `Xác Thực & Đăng Nhập`, `Đăng Tin Tuyển Dụng`). Use natural Vietnamese sentence-case (`Đăng nhập`, `Đặt lại mật khẩu`, `Hồ sơ năng lực`).
  - Stacked adjectives or slogans instead of concrete actions.
  - Any emoji characters anywhere in UI or docs (`0` emojis).
  - Invented numbers (fake partner counts, fake student counts, fake placement rates), fake company logos, or fake testimonials.

---

## Section 6 — Concrete Proposed Rewrites & M4 Skill Radar Options / Đề xuất viết lại cụ thể

### 6.1 Dev-Only Tools Separation Pattern (`LmsLoginForm.tsx`, `ForgotPasswordPage.tsx`, `App.tsx`)

To keep primary UX clean while keeping QA and Vitest flows green:

1. **Dev Ticket Helper (`LmsLoginForm.tsx:87-120`)**:
   - Keep strictly behind `{import.meta.env.DEV && (...)}`.
   - Wrap inside a collapsed native `<details className="rj-dev-helper">` (closed by default so it never clutters the primary login form), with muted secondary styling (`<summary>Công cụ kiểm thử nhanh (chỉ môi trường phát triển)</summary>`).
   - Keep `aria-label={`Lấy vé cho ${u.name}`}` on each chip button so existing QA/Vitest selectors (`getByRole('button', { name: /Lấy vé cho candidate1/i })`) and keyboard access work smoothly once expanded, and align chip role labels with glossary (`Ứng viên 1`, `Ứng viên 2`, `Mentor`, `Nhân viên`, `Quản trị viên`).
2. **Mailpit Dev Hint (`ForgotPasswordPage.tsx:70-88`)**:
   - Keep strictly behind `{import.meta.env.DEV && (...)}` inside a collapsed `<details className="rj-dev-helper">` with `<summary>Hỗ trợ kiểm thử email (chỉ môi trường phát triển)</summary>`.
3. **Health Badge on `/` (`App.tsx:160-167`, `HealthBadge.tsx`)**:
   - Remove `<HealthBadge />` and `Thông tin kỹ thuật Skeleton` from primary visitor UX on `/`.
   - If kept for local dev inspection, render `<HealthBadge />` ONLY inside `{import.meta.env.DEV && (<details className="rj-dev-helper">...</details>)}` collapsed at the bottom of `/`, or move to a dev-only disclosure so production visitors see zero backend/technical status while `data-testid="backend-status-badge"` remains testable if mounted in dev/test mode (update `App.test.tsx` accordingly).

### 6.2 `Before -> After` Rewrite Table (Every `internal or technical showcase`, `developer-only`, and `filler` String)

| Location | Class | Before (Current) | After (Proposed Vietnamese) |
|---|---|---|---|
| `App.tsx:48` | `showcase` | `v1.0.0-sprint1` | *(Remove version badge from public header)* |
| `App.tsx:49-50` | `filler` | `Giải pháp cầu nối minh bạch giữa Sinh viên, Doanh nghiệp tuyển dụng và Cán bộ đào tạo` | `Kết nối học viên Rikkei Education với doanh nghiệp qua năng lực đã được xác thực.` |
| `App.tsx:156` | `showcase` | `Đến Cổng Đăng Nhập NT-01 (LMS SSO / Doanh Nghiệp)` | `Đăng nhập vào Rikkei Jobs` |
| `App.tsx:160-167` | `dev-only` | Public `<HealthBadge />` (`Trạng thái kết nối Backend: UP/DOWN`) | *(Remove from primary `/` UX; optionally collapse inside `import.meta.env.DEV` `<details>`)* |
| `App.tsx:173-176` | `showcase` | `7 Module Nghiệp vụ Hệ thống` / `Kiến trúc Modular Monolith phân rã độc lập theo từng phân hệ nghiệp vụ chuẩn xác` | `Rikkei Jobs giúp bạn làm gì` / `Mỗi vai trò sử dụng một không gian làm việc riêng dựa trên cùng dữ liệu năng lực đã xác thực.` |
| `ModuleCard.tsx` + `features/*/index.ts` | `showcase` | `MOD-01`..`MOD-07` (`Hồ sơ năng lực (Candidate)`, etc.) | Present 5 role/capability cards in plain Vietnamese without `MOD-01..07` or English code names, clearly marking unimplemented workflows as `Sắp ra mắt`. |
| `App.tsx:186-208` | `dev-only` | `Thông tin kỹ thuật Skeleton` (`React 19.3.1...`, `Nginx...`, `Reverse Proxy...`) | *(Remove completely from `/`)* |
| `App.tsx:214` | `showcase` | `(c) 2026 Rikkei Jobs Project. Sprint 1 - Task T022DB0 Skeleton & Integration Foundation.` | `(c) 2026 Rikkei Jobs — Nền tảng kết nối việc làm của Rikkei Education.` |
| `AuthEditorialLayout.tsx:25,43` | `filler` | `Cổng Định Danh Doanh Nghiệp & Học Viên` / `Hệ Thống Đánh Giá & Tuyển Dụng Xác Thực Năng Lực` | `Kết nối việc làm theo năng lực thực` / `Rikkei Education` |
| `AuthEditorialLayout.tsx:27-28` | `filler` + `showcase` | `Định Danh Chuẩn Xác — Minh Bạch Năng Lực Theo Khung Chuẩn Hóa` / `Nền tảng kết nối trực tiếp dữ liệu học tập từ LMS và khảo thí tới phân hệ tuyển dụng doanh nghiệp. Mọi hồ sơ năng lực được xác thực minh bạch qua 20 kỹ năng chuẩn hóa và cơ chế phân quyền 5 vai trò bảo mật.` | `Tuyển dụng dựa trên năng lực đã xác thực` / `Học viên xem điểm kỹ năng từ kết quả LMS, khảo thí, thực tập IOC và đánh giá của mentor. Doanh nghiệp tiếp cận đúng ứng viên theo yêu cầu vị trí.` |
| `AuthEditorialLayout.tsx:72` | `showcase` | `Chuẩn bảo mật định danh ASVS V2/V4 • Bảo trợ bởi Rikkei Education` | `Dữ liệu học tập và đánh giá được đồng bộ từ hệ thống đào tạo Rikkei Education.` |
| `CompetencyRadarVisual.tsx:132-148` | `showcase` | `20 / Kỹ Năng Chuẩn Hóa`, `60s / Hiệu Lực Vé SSO (TTL 60s)`, `5 / Vai Trò Hệ Thống (RBAC)` | *(Remove entire 3-card showcase strip; see Section 6.3 for radar options)* |
| `LoginPage.tsx:35,37,39` | `filler` | `Cổng Định Danh Bảo Mật` / `Cổng Đăng Nhập` / `Hệ thống tuyển dụng và đánh giá năng lực kỹ sư Rikkei Education` | *(Remove redundant badge)* / `Đăng nhập` / `Chọn phương thức đăng nhập phù hợp với tài khoản của bạn.` |
| `LoginPage.tsx:59,71` | `functional` | `Qua LMS (SSO)` / `Doanh Nghiệp` | `Đăng nhập qua LMS` / `Tài khoản doanh nghiệp` |
| `LmsLoginForm.tsx:59,69,82` | `functional` | `Mã vé SSO (Ticket từ LMS)` / `Dán mã vé SSO (ví dụ: ticket-sv-001-...)` / `Xác Thực & Đăng Nhập` | `Mã vé đăng nhập từ LMS` / `Dán mã vé được cấp từ LMS` / `Đăng nhập qua LMS` *(keep hint: `Vé đăng nhập chỉ dùng một lần và hết hạn sau 60 giây.`)* |
| `LmsLoginForm.tsx:91,108` | `dev-only` | `Lấy vé nhanh (Chỉ môi trường Dev)`, `mentor1 (Giảng viên)`, `staff1 (Cán bộ tuyển sinh)` | Collapsed `<details>`: `Công cụ kiểm thử nhanh (chỉ môi trường phát triển)`, `mentor1 (Mentor)`, `staff1 (Nhân viên)` |
| `EnterpriseLoginForm.tsx:116,139,162` | `functional` | `Email Doanh Nghiệp`, `Mật Khẩu`, `Đăng Nhập` | `Email doanh nghiệp`, `Mật khẩu`, `Đăng nhập` |
| `ForgotPasswordPage.tsx:33-36` | `showcase` + `filler` | `Kênh Khôi Phục Truy Cập Doanh Nghiệp` / `Khôi Phục Quyền Truy Cập An Toàn — Bảo Mật Đa Tầng` / `Liên kết xác thực khôi phục mật khẩu một lần (TTL 30 phút)... chống tấn công dò quét tài khoản.` | `Tài khoản doanh nghiệp` / `Đặt lại mật khẩu tài khoản doanh nghiệp` / `Nhập email công ty đã được cấp tài khoản. Nếu email hợp lệ, hệ thống sẽ gửi liên kết đặt lại mật khẩu có hiệu lực trong 30 phút.` |
| `ForgotPasswordPage.tsx:42-47,121,138,146` | `functional` | `Khôi Phục Mật Khẩu`, `Quên Mật Khẩu`, `Hệ thống sẽ gửi mã xác thực an toàn...`, `Gửi Liên Kết Khôi Phục`, `Quay lại Trang Đăng Nhập` | `Tài khoản doanh nghiệp`, `Quên mật khẩu`, `Hệ thống sẽ gửi liên kết đặt lại mật khẩu tới địa chỉ email này.`, `Gửi liên kết đặt lại`, `Quay lại trang đăng nhập` |
| `ResetPasswordPage.tsx:48-51` | `showcase` | `Xác Thực Đặt Lại Mật Khẩu` / `Thiết Lập Mật Khẩu Mới — Bảo Đảm Tiêu Chuẩn ASVS` / `...chống tấn công brute-force... mã token ngẫu nhiên entropy cao.` | `Tài khoản doanh nghiệp` / `Thiết lập mật khẩu mới` / `Tạo mật khẩu mới có ít nhất 8 ký tự, gồm chữ cái và chữ số để bảo vệ tài khoản doanh nghiệp của bạn.` |
| `ResetPasswordPage.tsx:57-62,97,109,117,176` | `functional` | `Thiết Lập Mật Khẩu`, `Đặt Lại Mật Khẩu`, `Thành Công!`, `Đi đến Đăng Nhập`, `Mã Token Xác Thực`, `Đặt Lại Mật Khẩu` | `Tạo mật khẩu mới`, `Đặt lại mật khẩu`, `Đã cập nhật mật khẩu`, `Đi đến trang đăng nhập`, `Mã đặt lại mật khẩu`, `Lưu mật khẩu mới` |
| `ChangePasswordPage.tsx:77-80` | `showcase` + `filler` | `Bảo Mật & Tuân Thủ Tiêu Chuẩn ASVS` / `Nâng Cao Tiêu Chuẩn An Toàn — Bảo Vệ Dữ Liệu Tuyển Dụng` / `...độ phức tạp mật khẩu cao cấp...` | `Bảo mật tài khoản` / `Đổi mật khẩu trước khi bắt đầu` / `Tài khoản doanh nghiệp được cấp mật khẩu tạm cần đổi sang mật khẩu riêng trước khi truy cập hồ sơ công ty.` |
| `ChangePasswordPage.tsx:86-98,170,181` | `functional` | `Bảo Mật Tài Khoản`, `Đổi Mật Khẩu`, `Yêu Cầu Đổi Mật Khẩu:`, `Cập Nhật Mật Khẩu`, `Đăng Xuất` | `Đổi mật khẩu lần đầu`, `Đổi mật khẩu`, `Yêu cầu đổi mật khẩu:`, `Cập nhật mật khẩu`, `Đăng xuất` |
| `SsoCallbackPage.tsx:96-99` | `showcase` + `filler` | `Tiến Trình Xác Thực Vé Định Danh SSO` / `Xác Thực Định Danh Đơn Lần — Liên Thông Toàn Diện LMS` / `Cơ chế định danh một lần (Single Sign-On) bảo mật cao theo chuẩn ASVS V2/V4...` | `Đăng nhập qua LMS` / `Đang kết nối tài khoản LMS của bạn` / `Hệ thống đang kiểm tra vé đăng nhập từ LMS để mở đúng không gian làm việc theo vai trò.` |
| `SsoCallbackPage.tsx:122-145,192-270` | `showcase` | `1. Đọc vé xác thực SSO`, `2. Kiểm tra chữ ký số LMS`, `3. Cấp phiên làm việc an toàn` (`Xác lập phiên JWT và cấp quyền truy cập`), `Đã kiểm định định dạng vé hợp chuẩn` | `1. Tiếp nhận vé từ LMS` (`Đã nhận mã vé đăng nhập`), `2. Kiểm tra thông tin tài khoản` (`Xác nhận tài khoản và thời hạn vé 60 giây`), `3. Mở phiên làm việc` (`Chuẩn bị trang chủ theo vai trò của bạn`) |
| `SharedAppLayout.tsx:340` | `showcase` | `Rikkei Jobs Cổng Quản Trị` | `Rikkei Jobs` |
| `SharedAppLayout.tsx:355-364` | `functional` | Button with text `Chế độ sáng` / `Chế độ tối` | Icon-only `<button role="switch" aria-checked={isDark} aria-label="Chế độ tối">` with sun/moon `<Icon />` (no visible text label). |
| `SharedAppLayout.tsx:399-413` | `functional` | Button with `<span className="rj-sidebar-toggle-text">` visible when expanded | Icon-only `<button type="button" aria-expanded={...} aria-controls={...} aria-label={...}>` with tooltip matching `aria-label` on hover/focus, Escape dismisses. |
| `SharedAppLayout.tsx:371` | `functional` | `Đăng Xuất` | `Đăng xuất` |
| `RoleHomeLayout.tsx:74,87,92,104,113,119` | `showcase` | `Đổi Mật Khẩu`, `Thông Tin Tài Khoản`, `Mã người dùng (User ID)`, `Vai trò hệ thống`, `Mã doanh nghiệp (Company ID)`, `Tài khoản LMS liên kết` | `Đổi mật khẩu`, `Thông tin tài khoản`, *(remove internal `User ID` and `Company ID` rows from default view; show human fields `Họ và tên`, `Email`, `Vai trò`, `Mã học viên LMS` (only when `lmsUserId` exists), `Trạng thái tài khoản`)* |
| `CandidateHomePage.tsx:21-36` | `availability` | `Hồ Sơ Tuyển Dụng` & `Khóa Học & Chứng Chỉ LMS` (no `Sắp ra mắt` badge) | Add `Sắp ra mắt` tag on both cards; convert headings to sentence-case (`Hồ sơ ứng tuyển`, `Khóa học bổ sung trên LMS`, `Hồ sơ năng lực`, `Khoảng thiếu hụt năng lực`, `Đánh giá từ mentor`). |
| `HrHomePage.tsx:9,12,59-75` | `availability` | `Doanh nghiệp (HR)`, `Trang chủ quản trị dành cho nhà tuyển dụng...`, `Đăng Tin Tuyển Dụng` (`xuất bản`), `Quản Lý Ứng Viên` | `HR`, `Quản lý hồ sơ doanh nghiệp và chuẩn bị hoạt động tuyển dụng trên Rikkei Jobs.`; mark `Đăng tin tuyển dụng` (`Tạo và quản lý tin tuyển dụng kết nối với học viên Rikkei.`) and `Quản lý ứng viên` as `Sắp ra mắt`. |
| `MentorHomePage.tsx:7-24` | `availability` | `Giảng viên / Mentor`, `Đánh Giá Ứng Viên`, `Theo Dõi Thực Tập` | `Mentor`, `Ghi nhận đánh giá năng lực học viên sau phỏng vấn và thực tập IOC.`; mark `Đánh giá ứng viên` and `Theo dõi thực tập IOC` as `Sắp ra mắt`. |
| `StaffHomePage.tsx:7-24` | `availability` | `Cán bộ tuyển sinh`, `...đối soát hợp đồng...`, `Tiếp Nhận & Điều Phối`, `Báo Cáo Tỷ Lệ Có Việc` | `Nhân viên`, `Điều phối hồ sơ ứng viên, doanh nghiệp đối tác, tin tuyển dụng và đợt thực tập IOC.`; mark `Duyệt hồ sơ & doanh nghiệp` and `Ghép thực tập & báo cáo` as `Sắp ra mắt`. |
| `AdminHomePage.tsx:10,14-24` | `showcase` | `Trung tâm điều hành cấu hình phân quyền hệ thống, tài khoản và tích hợp dịch vụ`, `Giám Sát Tích Hợp LMS SSO` (`...trạng thái kết nối backend.`) | `Quản lý danh mục kỹ năng, trọng số đánh giá, xử lý báo sai bằng chứng và nhật ký hệ thống.`; rewrite cards to `Danh mục kỹ năng & trọng số` and `Xử lý báo sai & nhật ký thao tác`, both marked `Sắp ra mắt`. |
| `JobRecommendationsSection.tsx:109,132,139,149` | `filler` + `showcase` | `...gợi ý các vị trí tối ưu nhất`, `vị trí phù hợp nhất`, `Đã lưu bộ nhớ đệm (hiệu lực 24h)`, `AI Provider: {meta.activeProvider}` | `Gợi ý các vị trí dựa trên điểm kỹ năng đã xác thực của bạn.`, `Tìm thấy {n} vị trí phù hợp với kỹ năng của bạn`, `Cập nhật trong ngày` / `Vừa cập nhật`, *(remove `AI Provider: ...` badge from primary UI)*. |
| `SkillProfilePage.tsx:61` & `gapUtils.ts:11` | `showcase` | `Không thể kết nối đến máy chủ Backend` | `Không thể kết nối đến máy chủ. Vui lòng thử lại.` |
| `httpClient.ts:130` | `showcase` | `Yêu cầu thất bại với mã trạng thái {status}` | `Không thể xử lý yêu cầu (mã lỗi {status}). Vui lòng thử lại.` |

### 6.3 M4 Team Lead Checkpoint Question — `CompetencyRadarVisual` Options

Currently `CompetencyRadarVisual.tsx` draws a 6-axis hexagon with synthetic labels (`Kiến trúc Hệ thống`, `Lập trình Cốt lõi`, `Tư duy Thuật toán`, `Quy chuẩn CI/CD`, `Năng lực Thực chiến`, `Kỷ luật Chất lượng`) and hardcoded values `[0.92, 0.88, 0.95, 0.85, 0.90, 0.87]` without stating that it is an illustration, followed by the 3 showcase stat cards (`20`, `60s`, `5`).

Recommended options to present to the Team Lead at **Milestone M4**:

- **Option A (Recommended — Grounded Illustration)**: Remove the 3 showcase stat cards (`20 / 60s / 5`), keep the signature radar visual **only** if its 6 axes match the real `GROUP_LABELS` from `skillLabels.ts` (`Lập trình nền tảng`, `Backend và dữ liệu`, `Frontend`, `Công cụ và vận hành`, `Chất lượng và bảo mật`, `Kỹ năng mềm`), and display an explicit caption below it: `Hình minh họa 6 nhóm kỹ năng được đánh giá trên hồ sơ năng lực ứng viên.` (Never imply the polygon shows a real person's scores).
- **Option B (Pure Evidence Overview — Zero Synthetic Numbers)**: Replace the radar polygon with a calm visual diagram of the **4 verified evidence sources** (`Bảng điểm LMS`, `Bài thi khảo thí`, `Thực tập IOC`, `Đánh giá của Mentor`) feeding into `Hồ sơ năng lực 0–100`. Zero sample scores needed, 100% factual for all 5 roles.
- **Option C (Minimal Editorial Panel)**: Remove the radar visual and stats strip entirely on `/login` and keep only the role-centered headline + brief 3-bullet summary of who uses Rikkei Jobs (`Ứng viên`, `HR`, `Mentor & Cán bộ`).

---

## Section 7 — Affected Vitest Assertions Map / Danh sách assertion Vitest cần cập nhật ở M4 & M5a

Inspection of `e2e/` confirms all E2E tests are HTTP/API opaque-box assertions (`test_frontend_stack.test.mjs` only checks HTTP 200 HTML, `/favicon.svg`, `/favicon.png`, no `/vite.svg`, `/api/v1/health` JSON, and no mock data leakage) — **0 E2E copy assertions** will break.

In `frontend/src/**/*.test.*`, the following test assertions directly match old copy or control roles and MUST be updated in `M4`/`M5a`:

1. **`frontend/src/App.test.tsx`**:
   - Lines `54-59, 62-260, 276-297`: Tests for `APP_VERSION` (`v1.0.0-sprint1`), `backend-status-badge` (`UP`/`DOWN`/`CONNECTING...`, `Backend đang hoạt động bình thường`, `Kiểm tra lại`), and `MOD-01`..`MOD-07` (`module-candidate`..`module-ai`). If `<HealthBadge />` moves into dev-only collapsed `<details>` and `MOD-01..07` are replaced on `/`, update `App.test.tsx` to verify the new role-centered landing content and dev-only disclosure behavior.
   - Lines `324, 404, 430, 467, 504, 527`: Queries `getByRole('heading', { level: 1, name: /Cổng Đăng Nhập/i })` -> update regex to match new `<h1>` (`Đăng nhập` / `/Đăng nhập/i`).
   - Line `355`: Queries `/Đổi Mật Khẩu/i` -> still matches `/Đổi mật khẩu/i` (case-insensitive), verify exact casing if needed.
2. **`frontend/src/features/identity/__tests__/AuthRedesignM4.test.tsx`**:
   - Lines `29-42`: Asserts `CompetencyRadarVisual` axes (`Kiến trúc Hệ thống`, etc.) — update according to Team Lead's M4 decision on Option A / B / C.
   - Lines `44-52`: Asserts stats strip (`20`, `Kỹ Năng Chuẩn Hóa`, `60s`, `Hiệu Lực Vé SSO`, `5`, `Vai Trò Hệ Thống`) — remove/replace when showcase strip is removed.
   - Lines `56-67`: Asserts `Hệ Thống Đánh Giá & Tuyển Dụng Xác Thực Năng Lực` and `Chuẩn bảo mật định danh ASVS V2/V4` — update to new footer & subtitle.
   - Line `89`: Asserts `Cổng Định Danh Doanh Nghiệp & Học Viên` — update to new badge/story copy.
   - Lines `105-107`: Asserts `1. Đọc vé xác thực SSO`, `2. Kiểm tra chữ ký số LMS`, `3. Cấp phiên làm việc an toàn` — update to new 3-step user-friendly timeline copy.
3. **`frontend/src/features/identity/__tests__/LoginPage.test.tsx`**:
   - Line `17`: `getByText('Cổng Đăng Nhập')` -> update to new heading (`Đăng nhập`).
   - Lines `18-19, 31-32, 37, 44`: `/Qua LMS/i`, `/Doanh Nghiệp/i`, `/Mã vé SSO/i`, `/Email Doanh Nghiệp/i` -> align with `/Đăng nhập qua LMS/i`, `/Tài khoản doanh nghiệp/i`, `/Mã vé đăng nhập/i`, `/Email doanh nghiệp/i`.
4. **`frontend/src/features/identity/__tests__/EnterpriseLoginForm.test.tsx`**:
   - Lines `42, 45, 49, 72, 75, 79, 103, 106, 110`: `/Email Doanh Nghiệp/i`, `/^Mật Khẩu$/i`, `/Đăng Nhập/i` (case-insensitive regexes will still match `Email doanh nghiệp`, `Mật khẩu`, `Đăng nhập`!).
5. **`frontend/src/features/identity/__tests__/ForgotPasswordPage.test.tsx`**:
   - Lines `32, 34, 38, 42-43`: `getByText('Quên Mật Khẩu')` (case-sensitive!) -> update to `'Quên mật khẩu'`, and button `/Gửi Liên Kết Khôi Phục/i` if renamed to `Gửi liên kết đặt lại`.
6. **`frontend/src/features/identity/__tests__/ResetPasswordPage.test.tsx`**:
   - Lines `34, 43, 53-54`: `/Mã Token Xác Thực/i` -> `/Mã đặt lại mật khẩu/i`, `'Thành Công!'` -> `'Đã cập nhật mật khẩu'`, `/Đi đến Đăng Nhập/i` -> `/Đi đến trang đăng nhập/i`, `/Đặt Lại Mật Khẩu/i` -> `/Lưu mật khẩu mới/i`.
7. **`frontend/src/features/identity/__tests__/ChangePasswordPage.test.tsx`**:
   - Lines `49-50, 119, 143, 162`: Case-insensitive regexes `/Yêu Cầu Đổi Mật Khẩu:/i`, `/Cập Nhật Mật Khẩu/i`, `/Đăng Xuất/i` continue matching sentence-case Vietnamese; verify line `49` if phrasing changes.
8. **`frontend/src/features/identity/__tests__/SsoCallbackPage.test.tsx`**:
   - Lines `32, 62, 95, 118`: Exact strings `'Đăng Nhập Thành Công!'`, `'Xác Thực Thất Bại'`, and `/Quay lại Trang Đăng Nhập/i` -> update if sentence-cased (`'Đăng nhập thành công'`, `'Xác thực không thành công'`, `/Quay lại trang đăng nhập/i`).
9. **`frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx`**:
   - Lines `197, 1000`: `getByRole('link', { name: /Rikkei Jobs Cổng Quản Trị/i })` -> update to `/Rikkei Jobs/i`.
   - Line `408`: `getByRole('button', { name: 'Chuyển sang chế độ tối' })` -> update for M1b `role="switch"` (`getByRole('switch', { name: 'Chế độ tối' })`).
   - Lines `328-330, 350, 374, 382, 388, 411, 426, 451, 482, 487`: Keep `aria-label` `'Thu gọn thanh điều hướng'` / `'Mở rộng thanh điều hướng'`; add assertions for icon-only DOM (no visible text span) and toggle tooltip + Escape.
10. **`frontend/src/features/identity/__tests__/accessibility_wcag.test.tsx`**:
    - Lines `35-49`: Case-insensitive `/Email Doanh Nghiệp/i`, `/^Mật Khẩu$/i`.
    - Lines `72, 93`: `sso-ticket-hint` and `forgot-email-hint` text assertions (`Vé SSO có thời hạn sử dụng 60 giây` / `Hệ thống sẽ gửi mã xác thực an toàn...`) -> update line `93` to match rewritten reset-link hint.
    - Lines `311-449`: Entire `RoleHomeLayout Theme Toggle & Accessibility` suite queries `getByRole('button', { name: 'Chuyển sang chế độ tối' })` + `aria-pressed` + `toHaveTextContent` -> rewrite for M1b `role="switch"`, `aria-checked`, Space/Enter, and no text content.
11. **`frontend/src/features/identity/__tests__/RoleHomes.test.tsx`**:
    - Lines `38-42, 56-57, 71, 85, 99, 128`: Exact card title strings (`'Hồ Sơ Tuyển Dụng'`, `'Hồ Sơ Năng Lực'`, `'Đăng Tin Tuyển Dụng'`, `'Đánh Giá Ứng Viên'`, `'Tiếp Nhận & Điều Phối'`, `'Quản Trị Người Dùng & Phân Quyền'`), `'42'` (Company ID row removed), and `'Rikkei Jobs Cổng Quản Trị'`.
12. **`frontend/src/features/identity/__tests__/ForbiddenPage.test.tsx`**:
    - Line `197`: `/Cổng Đăng Nhập/i` -> update to `/Đăng nhập/i`.
13. **`frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx`**:
    - Lines `185, 190, 200, 226-237, 264-292, 325-330, 369, 409, 531, 588-605, 624-635, 670-680, 710-720, 751-760, 791-802, 885-892, 942, 1003, 1064, 1111, 1145-1167, 1202-1208, 1239, 1274-1281, 1311, 1348-1359, 1390-1396`:
      - Wait for card titles on `/candidate`, `/hr`, `/staff`, `/admin` (`'Hồ Sơ Tuyển Dụng'`, `'Đăng Tin Tuyển Dụng'`, `'Tiếp Nhận & Điều Phối'`, `'Quản Trị Người Dùng & Phân Quyền'`) -> update to new card titles.
      - Tab `/Doanh Nghiệp/i`, submit button `/Xác Thực & Đăng Nhập/i`, heading `/Cổng Đăng Nhập/i` -> update to `/Tài khoản doanh nghiệp/i`, `/Đăng nhập qua LMS/i`, `/Đăng nhập/i`.
      - Line `521, 546`: `getByRole('button', { name: /Lấy vé cho candidate1/i })` -> if collapsed inside `<details>`, click `<summary>` to expand first before clicking chip, or keep `<details>` accessible.
14. **`frontend/src/features/company/__tests__/CompanyProfileAccessibility.test.tsx`**:
    - Line `201`: `/Cổng Đăng Nhập/i` -> `/Đăng nhập/i`.
    - Line `244`: `/Tiếp Nhận & Điều Phối/i` -> update if `StaffHomePage` card title changes.
15. **`frontend/src/features/candidate/JobRecommendationsSection.test.tsx`**:
    - Line `98`: `/Đã lưu bộ nhớ đệm/i` -> update to `/Cập nhật trong ngày/i` if badge text changes.
    - Line `87`: `/Đang phân tích hồ sơ kỹ năng/i` -> preserve or update alongside loading text.
16. **`frontend/src/features/candidate/components/SkillProfilePage.test.tsx`**, **`GapAnalysisSection.test.tsx`**, **`JobDetailPanel.test.tsx`**, **`CandidateEvaluations.test.tsx`**, **`CompanyProfilePage.test.tsx`**:
    - Core labels (`Đã xác thực`, `Tự khai`, `Sẵn sàng ...%`, `Đánh giá từ mentor`, `Đã lưu thay đổi hồ sơ công ty.`, `Đã tải lên logo công ty thành công.`, etc.) are preserved; zero breaking changes unless `Tính lại từ LMS, Exam, PM` (`SkillProfilePage.test.tsx:117`) or `Quay lại trang ứng viên` (`JobDetailPanel.test.tsx:78`) is reworded (keep `SkillProfilePage` / `JobDetailPanel` teammate diffs minimal!).

---

## Appendix — Verification Dictionary Notes for Worker A / M8 (`cspell.json`)

If any English technical identifiers or Vietnamese domain terms in `docs/uiux/CONTENT.md` are flagged by `cspell`, inspect the exact `cspell` run output in the M3b handoff report and add only genuinely required terms to root `cspell.json` during M8 (never use inline `cspell:` directives).
