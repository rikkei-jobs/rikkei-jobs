# Mô Tả Pull Request: Phân Hệ Xác Thực & Quản Lý Định Danh (NT-01 / T022B63)

Tài liệu này phản ánh toàn diện trạng thái hiện tại của nhánh `feature/T022863-dang-nhap` phục vụ rà soát mã nguồn (Code Review) và nghiệm thu kỹ thuật cho phân hệ Xác thực và Định danh (Identity & Authentication).

---

## 1. Tính Năng Đã Triển Khai (Delivered Features)

Phân hệ Identity cung cấp giải pháp xác thực tập trung, bảo mật cao cho nền tảng Rikkei Jobs với các tính năng hoàn chỉnh:

1. **Xác Thực Đơn Điểm LMS SSO (Single Sign-On Authentication)**:
   - Tích hợp luồng xác thực SSO thông qua vé định danh (SSO Ticket) từ hệ thống đào tạo Rikkei LMS (`POST /api/v1/auth/sso`).
   - Tự động đồng bộ và cấp phát tài khoản ban đầu (Initial Provisioning) cho Sinh viên (vai trò `CANDIDATE`) và Giảng viên (vai trò `MENTOR`) dựa trên `lms_user_id` và mã sinh viên chuẩn hóa.
   - Cơ chế bảo vệ vai trò ASVS: Sau lần cấp phát đầu tiên, vai trò nội bộ trên hệ thống Rikkei Jobs được bảo toàn bất biến; mọi nỗ lực thay đổi vai trò qua vé SSO đều bị từ chối.
   - Phát hiện và ngăn chặn xung đột định danh: Trả về mã lỗi HTTP 409 `EMAIL_COLLISION` nếu email từ LMS trùng với tài khoản nội bộ hiện hữu.

2. **Đăng Nhập Tài Khoản Doanh Nghiệp (Enterprise HR Login)**:
   - Hỗ trợ đăng nhập bằng Email và Mật khẩu cho chuyên viên nhân sự doanh nghiệp (`HR`) và cán bộ quản trị (`ADMIN`, `STAFF`) (`POST /api/v1/auth/login`).
   - Mã hóa mật khẩu một chiều bằng thuật toán BCrypt (work factor 10).
   - Kiểm tra và ép buộc đổi mật khẩu lần đầu (`mustChangePassword = true`) đối với các tài khoản HR được cấp phát mặc định.

3. **Luồng Quản Lý Mật Khẩu Toàn Diện (Password Lifecycle)**:
   - **Quên mật khẩu (`POST /api/v1/auth/forgot-password`)**: Gửi email chứa liên kết đặt lại mật khẩu với token ngẫu nhiên bảo mật cao (32 bytes) có hiệu lực 15 phút. Luôn phản hồi HTTP 200 generic để chống rò rỉ danh tính (User Enumeration).
   - **Đặt lại mật khẩu (`POST /api/v1/auth/reset-password`)**: Xác thực token đặt lại mật khẩu đã được băm SHA-256 trong cơ sở dữ liệu, tiêu hủy token ngay sau khi đổi thành công (Single-use Token).
   - **Đổi mật khẩu trực tiếp (`POST /api/v1/auth/change-password`)**: Cho phép người dùng đã xác thực cập nhật mật khẩu, xóa cờ `mustChangePassword`, áp dụng danh sách kiểm định mật khẩu thời gian thực (tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt).

4. **Chính Sách Khóa Tài Khoản Tự Động (Account Lockout Policy)**:
   - Theo dõi số lần đăng nhập thất bại liên tiếp (`failed_login_count`).
   - Tự động tạm khóa tài khoản trong 15 phút sau 5 lần nhập sai mật khẩu liên tiếp, trả về mã lỗi HTTP 423 `ACCOUNT_LOCKED`.
   - Giao diện hiển thị đồng hồ đếm ngược thời gian thực (LockoutCountdown) và vô hiệu hóa nút submit cho đến khi hết hạn khóa.

5. **Chính Sách Vé Định Danh & Token JWT (Ticket & JWT Policy)**:
   - Vé SSO có thời gian sống ngắn (TTL = 60 giây) kể từ thời điểm phát hành (`issuedAt`).
   - Cấp phát Access Token chuẩn JWT (HMAC-SHA256) chứa các claim tiêu chuẩn (`sub`, `role`, `companyId`, `lmsUserId`, `iss`, `iat`, `exp`).
   - Token được lưu trữ hoàn toàn trong bộ nhớ RAM của trình duyệt (In-Memory Token Storage), không lưu vào `localStorage` hay `sessionStorage` theo khuyến nghị OWASP ASVS.

6. **Điều Hướng & Trang Chủ Phân Quyền (Role Homes & RBAC)**:
   - Bảo vệ tuyến đường (Protected Routes) qua các guard component: `<RequireRole />` và `<RequireMustChangePassword />`.
   - Hệ thống 5 trang chủ vai trò chuyên biệt:
     - Ứng viên (`/candidate`): Hiển thị hồ sơ năng lực, ra-đa kỹ năng và danh sách việc làm phù hợp.
     - Nhân sự Doanh nghiệp (`/hr`): Quản lý tin tuyển dụng và tìm kiếm ứng viên.
     - Giảng viên (`/mentor`): Theo dõi và đánh giá năng lực học viên.
     - Cán bộ Đào tạo (`/staff`): Quản lý dữ liệu khảo thí và liên kết doanh nghiệp.
     - Quản trị viên (`/admin`): Giám sát hệ thống và phân quyền người dùng.

7. **Di Trú Cơ Sở Dữ Liệu Flyway (V3 & V4 Migrations)**:
   - `backend/src/main/resources/db/migration/V3__auth_identity_evolution.sql`: Khởi tạo bảng `users`, ràng buộc duy nhất, chỉ mục tìm kiếm và các trường bảo mật (`password_hash`, `failed_login_count`, `locked_until`, `must_change_password`).
   - `backend/src/main/resources/db/migration-dev/V4__dev_seed_nt01.sql`: Dữ liệu seed mẫu môi trường phát triển cho các vai trò và tài khoản kiểm thử NT-01.

---

## 2. Quyết Định Kiến Trúc & An Toàn Bảo Mật (Security Decisions)

Mọi quyết định thiết kế an ninh đều bám sát tiêu chuẩn OWASP ASVS v4.0 (Application Security Verification Standard):

1. **Cơ Chế Tiêu Hủy Vé Đơn Lần Tại Chỗ (Atomic Ticket Burn-on-Attempt)**:
   - Vé SSO được đánh dấu tiêu hủy (`burn`) ngay khi nhận được yêu cầu trong một giao dịch độc lập cô lập (`Propagation.REQUIRES_NEW`).
   - Ngay cả khi các bước xác thực người dùng tiếp theo thất bại hoặc xảy ra ngoại lệ mạng, vé SSO đó vẫn bị hủy vĩnh viễn, triệt tiêu hoàn toàn nguy cơ tấn công phát lại (Replay Attack).

2. **Phòng Vệ Tấn Công Phân Tích Thời Gian (Anti-Timing Attack & Dummy Hash)**:
   - Khi nhận yêu cầu đăng nhập từ một email không tồn tại trong hệ thống, backend thực thi hàm băm giả lập hằng số thời gian (`BCrypt` dummy check với hằng số `DUMMY_BCRYPT_HASH`).
   - Tỷ số độ trễ trung vị đo được đạt $0.95 - 0.96$ (gần như $1.00$), khiến kẻ tấn công không thể dựa vào sai khác thời gian phản hồi để dò quét tài khoản hợp lệ (User Enumeration).
   - Giới hạn 72 bytes của thuật toán BCrypt được chặn từ tầng Validation DTO nhằm ngăn chặn tấn công DoS thuật toán băm (BCrypt DoS).

3. **Băm Token Đặt Lại Mật Khẩu (Hashed Single-Use Reset Token)**:
   - Token gửi qua email người dùng là một chuỗi ngẫu nhiên cryptographically secure (32 bytes).
   - Cơ sở dữ liệu CHỈ lưu trữ giá trị băm SHA-256 của token. Khi người dùng submit, hệ thống băm lại token và so khớp với bản ghi trong DB. Ngay khi đổi mật khẩu thành công, bản ghi token bị xóa hoặc đánh dấu hết hạn lập tức.

4. **Trình Kiểm Định Khởi Động Nghiêm Ngặt (Fail-Fast Production Validator for JWT_SECRET)**:
   - Lớp cấu hình `ProdEnvironmentValidator` (`backend/src/main/java/com/rikkei/jobs/common/config/ProdEnvironmentValidator.java`) kích hoạt ngay khi ứng dụng khởi động.
   - Nếu ứng dụng chạy ở môi trường production (`SPRING_PROFILES_ACTIVE=prod`) mà `JWT_SECRET` bị bỏ trống, mang giá trị mặc định của môi trường dev, hoặc có độ dài nhỏ hơn 256 bits (32 ký tự), hệ thống chủ động ném ngoại lệ dừng tiến trình khởi động ngay lập tức (Fail-Fast), ngăn ngừa rủi ro vận hành với khóa bảo mật yếu.

---

## 3. Quyết Định Thiết Kế Giao Diện & Công Thái Học (UI & Ergonomics Decisions)

Giao diện được thiết kế theo tiêu chuẩn Anti-AI Design Bar, loại bỏ hoàn toàn các mẫu AI rập khuôn:

1. **Bảng Màu Chủ Đạo Xanh Dương (Confident Royal Cobalt Palette)**:
   - Tuân thủ chỉ thị tối cao và bất biến: Giao diện chuẩn hóa trên hệ màu Xanh dương chủ đạo (**Royal Cobalt `#0D55B8`** ở Light Mode và **Luminous Cobalt `#508CEE`** ở Dark Mode).
   - Màu xanh đại diện cho tính chuẩn mực kỹ thuật, độ tin cậy và sự tập trung trí tuệ, loại bỏ áp lực thị giác.

2. **Phân Định Tuyệt Đối Màu Lỗi & Biểu Trưng (Quarantined Error vs Brand Mark)**:
   - Màu đỏ biểu trưng doanh nghiệp (**Rikkei Corporate Red `#C8161D`**) chỉ xuất hiện duy nhất tại logo `<BrandMark />` trên thanh Header và khung giới thiệu, không bao giờ dùng cho nút tương tác.
   - Màu báo lỗi kỹ thuật quay về sắc đỏ lạnh **Cold Crimson Brick (`#9B1C2A` Light / `#F1707A` Dark)**, luôn đi kèm 4 lớp tín hiệu phi màu sắc: icon cảnh báo monoline 2px, viền tương phản cao $CR \ge 3.0:1$, nhãn thông báo rõ ràng và thuộc tính ARIA `role="alert"`. Đạt 100% khả năng nhận diện trong kiểm thử mô phỏng khiếm khuyết thị giác màu (CVD).

3. **Thang Bề Mặt 5 Tầng Phân Tách Toán Học (5-Level Surface Elevation Ladder)**:
   - Thiết lập 5 bậc bề mặt: Level 1 (Page Canvas) $\rightarrow$ Level 2 (Hero Panel) $\rightarrow$ Level 3 (Card Container) $\rightarrow$ Level 4 (Field Inset) $\rightarrow$ Level 5 (Elevated).
   - Độ chênh lệch độ sáng toán học CIELAB đạt $\Delta L^*(\text{Canvas}, \text{Card}) = 4.65 \ge 4.0$ (Light) và $7.45 \ge 4.0$ (Dark), kết hợp viền hairline 1px `#BACAD9` / `#1E2D42` triệt tiêu lỗi "Pale on Pale".

4. **Typography Chống Nhòe Hào Quang & Tự Lưu Ký Tự (Self-Hosted Anti-Halation Typography)**:
   - Phối hợp 3 bộ font WOFF2 tự lưu trữ (Self-Hosted), tuyệt đối không gọi tới máy chủ bên thứ ba: Plus Jakarta Sans (tiêu đề), Be Vietnam Pro (nội dung tối ưu dấu tiếng Việt), JetBrains Mono (số liệu bảng).
   - Ở Dark Mode, văn bản chính sử dụng sắc trắng ngà mềm mại **Off-white `#EDF2F7`** thay vì trắng tinh `#FFFFFF` trên nền than chì `#162030` / `#0B1019`, chống hiện tượng tán xạ nhòe hào quang (Halation) cho người dùng loạn thị.

5. **Tài Sản Biểu Trưng Nguyên Bản (Byte-Identical Brand Mark Assets)**:
   - Tích hợp trực tiếp hai tệp biểu trưng thương hiệu gốc từ tài liệu dự án: `favicon.svg` (333 bytes, SHA-256 `3FDE006C...ED20`) và `favicon.png` (100x100px, SHA-256 `0D19BBB2...E453`) sang `frontend/public/`, thay thế hoàn toàn `/vite.svg`.
   - Component `<BrandMark />` nhận màu tô từ các design token ngữ nghĩa (`var(--rj-brand-mark-red)` và `var(--rj-brand-mark-contrast)`), bảo đảm không còn giá trị màu thô trong component.

---

## 4. Hướng Dẫn Vận Hành & Kiểm Thử (Run & Test Instructions)

### 4.1. Khởi Chạy Ngăn Xếp Toàn Bộ Bằng Docker Compose

```bash
# Khởi động toàn bộ 5 dịch vụ (PostgreSQL, Mock LMS, Mailpit, Backend Spring Boot, Frontend Nginx)
docker compose up -d --build

# Kiểm tra trạng thái sức khỏe của các container
docker ps
```

Các cổng dịch vụ khả dụng:

- Giao diện người dùng (Frontend): `http://localhost:3000`
- Cổng dịch vụ lõi (Backend API): `http://localhost:8080`
- Dịch vụ giả lập đào tạo (Mock LMS): `http://localhost:9000`
- Giao diện hộp thư thử nghiệm (Mailpit UI): `http://localhost:8025`
- Cơ sở dữ liệu (PostgreSQL): `localhost:5433`

### 4.2. Thực Thi Toàn Bộ Kiểm Thử E2E Opaque-Box

```bash
# Chạy bộ kiểm thử E2E 4 tầng (17 test suites, 216 test cases)
node e2e/run-all.mjs
```

### 4.3. Thực Thi Kiểm Tra Chất Lượng Cục Bộ (Quality Gates)

```powershell
# Chạy bộ cổng kiểm định trên Windows PowerShell (26 active runtime gates)
.\check.ps1
```

```bash
# Chạy bộ cổng kiểm định trên Linux/macOS bash (26 active runtime gates)
./check.sh
```

---

## 5. Số Liệu Kiểm Định Đo Đạc Thực Tế Trong Phiên Này (Verified Metrics)

Toàn bộ các thông số dưới đây được sao chép trực tiếp từ kết quả thực thi lệnh thực tế trong phiên hiện tại:

- **Kiểm thử Đơn vị & Tích hợp Backend (JUnit 5 & Testcontainers)**: **325 / 325 tests PASS** (`./mvnw test`, thời gian: 2m 51s, 0 failures, 0 errors).
- **Kiểm thử Đơn vị Frontend (Vitest & Testing Library)**: **82 / 82 tests PASS** (16 test files, 100% green).
- **Kiểm thử Đầu - Cuối E2E (Node.js Test Runner 4 Tiers)**: **17 / 17 suites PASS** (**216 / 216 test cases PASS**, 960 assertions, thời gian: 22.15s).
- **Ma trận Tương phản Toán học (WCAG 2.2 AA & APCA)**: **66 / 66 cặp màu PASS** (36 cặp Light Mode + 30 cặp Dark Mode, 0 vi phạm, $\Delta \le 0.01$).
- **Thẩm định Thị giác Trình duyệt Thực (Chromium Headless CDP)**: **20 / 20 kịch bản đạt chuẩn** ($scrollWidth \le innerWidth$, diff = 0px).
- **Cổng Kiểm Định Tích Hợp (Quality Gates)**: **26 / 26 gates PASSED** trên cả `check.ps1` và `check.sh` với số lượng đồng nhất 100%.
- **Bảo Vệ Ngăn Chặn Mã Màu Thô (Color Literal Guard)**: Check 9 trong `scripts/validate-agent-config.mjs` quét sạch toàn bộ `frontend/src`, đã chứng minh bằng break-test (FAIL khi thêm mã màu thô, PASS khi dọn sạch).
- **Biểu Trưng Favicon**: SHA-256 của `favicon.svg` và `favicon.png` trùng khớp 100% nguyên bản byte-for-byte.

---

## 6. Giới Hạn Kỹ Thuật Đã Biết (Known Limitations)

1. **Lưu Trữ Token In-Memory (In-Memory Token Persistence)**:
   - Nhằm tuân thủ tuyệt đối chuẩn OWASP ASVS v4.0 về phòng chống đánh cắp token qua tấn công XSS, Access Token chỉ được duy trì trong bộ nhớ RAM của ứng dụng React.
   - Khi người dùng làm mới trang trình duyệt (F5/Reload), phiên làm việc sẽ bị hủy và yêu cầu đăng nhập lại. Cơ chế cấp mới token tự động qua HttpOnly Cookie / Refresh Token được lên kế hoạch cho phân hệ tiếp theo.

2. **Cảm Nhận Độ Phân Tầng Thị Giác ở Light Mode (Light Mode Subtle Hierarchy)**:
   - Độ chênh lệch độ sáng toán học CIELAB giữa Page Canvas (`#EEF2F8`, $L^*=95.35$) và Card Container (`#FFFFFF`, $L^*=100.00$) đạt $\Delta L^* = 4.65 \ge 4.0$.
   - Trên một số màn hình văn phòng có tấm nền TN hoặc màn hình IPS độ sáng cao trong điều kiện ánh sáng chói, độ tương phản giữa nền card và nền trang có thể tạo cảm giác êm dịu (soft/subtle). Ranh giới quang học được gia cố vững chắc qua viền hairline 1px `#BACAD9` và bóng đổ elevation nhẹ. Theo đúng chỉ thị của Team Lead, không phát động đợt tái thiết kế bảng màu mới để giữ tính ổn định.

---

## 7. Câu Hỏi Nghiệp Vụ Mở (Open Business Questions)

1. **Chu Kỳ Phiên & Thời Gian Sống Token (Session Lifetime & Token Expiry)**:
   - Cần thống nhất với ban quản trị LMS về chu kỳ hết hạn của phiên làm việc SSO (hiện tại vé SSO TTL 60s, Access Token TTL 15 phút) để đồng bộ trải nghiệm chuyển hướng khi người dùng thao tác liên tục giữa hai nền tảng.

2. **Lộ Trình Tích Hợp Xác Thực Đa Yếu Tố (MFA / 2FA Roadmap)**:
   - Cần xác định phạm vi áp dụng xác thực 2 bước (OTP/Email OTP) cho các tài khoản quản trị viên cấp cao (`ADMIN`) và doanh nghiệp (`HR`) trong các sprint tiếp theo.

3. **Cơ Chế Khôi Phục Tài Khoản Doanh Nghiệp (Enterprise Account Recovery)**:
   - Trong trường hợp chuyên viên HR bị khóa tài khoản hoặc quên email đăng ký doanh nghiệp, quy trình xác minh qua Admin/Staff cần có giao diện phê duyệt nội bộ chuyên dụng.

---

## 8. Danh Mục Kiểm Tra Của Reviewer (Reviewer Checklist)

- [ ] Đã xác nhận phần tiền kiểm trong `docs/nt01/PHASE0_ACK.md` tồn tại đầy đủ, không có ký tự emoji.
- [ ] Không còn bất kỳ mã màu thô (hex literal, rgb/rgba) nào trong `frontend/src` ngoài `design-tokens.css` và danh mục hợp lệ.
- [ ] Thành phần `<BrandMark />` nhận màu từ design tokens (`--rj-brand-mark-red`, `--rj-brand-mark-contrast`), bảo tồn nguyên vẹn hình học 3 cột bậc thang.
- [ ] Hai tệp `favicon.svg` và `favicon.png` có mã băm SHA-256 giống hệt 100% với tệp gốc từ `Tài liệu dự án/`.
- [ ] Kiểm tra cổng `scripts/validate-agent-config.mjs` (Check 9) đã được chứng minh qua break-test.
- [ ] Toàn bộ 325 kiểm thử backend (`mvn test`) và 82 kiểm thử frontend (`npm test`) vượt qua thành công.
- [ ] Toàn bộ 17 suites / 216 test cases E2E (`node e2e/run-all.mjs`) chạy thành công trên cụm Docker.
- [ ] Cả hai kịch bản `check.sh` và `check.ps1` báo cáo 26/26 gates PASSED đồng nhất mà không cần cờ chuyển đổi đường dẫn (path conversion override).
- [ ] Ngăn xếp Docker được dọn dẹp sạch sẽ (`docker compose down -v`), không tồn đọng container hoặc volume rikkei.
- [ ] Toàn bộ thay đổi ở trạng thái UNCOMMITTED trên nhánh `feature/T022863-dang-nhap`.
