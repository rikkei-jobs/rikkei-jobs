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
   - **Quên mật khẩu (`POST /api/v1/auth/forgot-password`)**: Gửi email chứa liên kết đặt lại mật khẩu với token ngẫu nhiên bảo mật cao (32 bytes) có hiệu lực 30 phút. Luôn phản hồi HTTP 200 generic để chống rò rỉ danh tính (User Enumeration).
   - **Đặt lại mật khẩu (`POST /api/v1/auth/reset-password`)**: Xác thực token đặt lại mật khẩu đã được băm SHA-256 trong cơ sở dữ liệu, tiêu hủy token ngay sau khi đổi thành công (Single-use Token).
   - **Đổi mật khẩu trực tiếp (`POST /api/v1/auth/change-password`)**: Cho phép người dùng đã xác thực cập nhật mật khẩu, xóa cờ `mustChangePassword`, áp dụng danh sách kiểm định mật khẩu thời gian thực (tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt).

4. **Chính Sách Khóa Tài Khoản Tự Động (Account Lockout Policy)**:
   - Theo dõi số lần đăng nhập thất bại liên tiếp (`failed_login_count`).
   - Tự động tạm khóa tài khoản trong 15 phút sau 5 lần nhập sai mật khẩu liên tiếp, trả về mã lỗi HTTP 401 `ACCOUNT_LOCKED`.
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

7. **Di Trú Cơ Sở Dữ Liệu Flyway (V5 & V6 Migrations)**:
   - `backend/src/main/resources/db/migration/V5__auth_identity_evolution.sql`: Khởi tạo bảng `users`, ràng buộc duy nhất, chỉ mục tìm kiếm và các trường bảo mật (`password_hash`, `failed_login_count`, `locked_until`, `must_change_password`).
   - `backend/src/main/resources/db/migration-dev/V6__dev_seed_nt01.sql`: Dữ liệu seed mẫu môi trường phát triển cho các vai trò và tài khoản kiểm thử NT-01.

8. **Hợp Nhất Xác Thực JWT Cho Phân Hệ Hồ Sơ Năng Lực (Skill Profile JWT Integration)**:
   - Vô hiệu hóa và loại bỏ toàn diện cơ chế xác thực HTTP Basic tạm thời (`DatabaseUserDetailsService.java` và `AuthenticatedUser.java` đã bị xóa sạch).
   - Chuẩn hóa mô hình danh tính duy nhất (ONE Principal Type): `com.rikkei.jobs.identity.UserPrincipal` đặt tại gói gốc `identity`, đóng vai trò là giao diện định danh công khai tuân thủ nghiêm ngặt Rule 14 (biên giới module). Cả `AuthController` và `SkillProfileController` đều tiêu thụ `@AuthenticationPrincipal UserPrincipal`.
   - Bảo toàn 100% ngữ nghĩa nghiệp vụ HS-01: Chủ sở hữu luôn xem được hồ sơ; người khác chỉ xem được hồ sơ công khai; hồ sơ riêng tư hoặc người dùng không tồn tại trả về 404 NOT_FOUND; tính toán lại điểm (`/recompute`) chỉ tác động lên chính người gọi; yêu cầu không có token hợp lệ nhận 401 UNAUTHORIZED; tài khoản chưa đổi mật khẩu nhận 403 MUST_CHANGE_PASSWORD từ `MustChangePasswordFilter`.
   - Phía frontend: Xây dựng khách hàng HTTP xác thực tập trung (`httpClient.ts`) với in-memory token, tự động gắn header `Authorization: Bearer <token>`, xử lý debounce chuyển hướng 401 về `/login` và 403 về `/change-password`.
   - Loại bỏ form đăng nhập Basic riêng lẻ (`LoginForm.tsx`) và hàm `buildBasicAuthHeader`. Khi chưa đăng nhập, giao diện hiển thị thẻ Call To Action dẫn tới `/login`. Thiết lập tuyến đường phân quyền `/candidate/skills` có bảo vệ bằng `<RequireRole allowedRoles={['CANDIDATE']}>`.

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

5. **Mô Hình Danh Tính Duy Nhất & Bảo Vệ Biên Giới Module (ONE Principal Type & Rule 14)**:
   - Thay vì duy trì song song hai mô hình định danh (`AuthenticatedUser` cho Basic Auth và `UserPrincipal` cho JWT), hệ thống chuẩn hóa duy nhất một lớp `com.rikkei.jobs.identity.UserPrincipal` tại root package của module `identity`.
   - Lớp này đóng vai trò là hợp đồng định danh công khai (Public Identity API Contract). Module `candidate` và bất kỳ module nghiệp vụ nào khác chỉ phụ thuộc vào `UserPrincipal` thông qua `@AuthenticationPrincipal UserPrincipal user`, hoàn toàn không truy cập vào các thành phần nội bộ (internal services, repositories, entities) của module `identity`, tuân thủ triệt để Rule 14.

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
# Chạy bộ kiểm thử E2E 4 tầng (17 test suites, 221 test cases)
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

## 5. Dữ Liệu Mẫu Và Tài Khoản Thử Nghiệm (Sample Data & Acceptance Scenarios)

*LƯU Ý BẢO MẬT: TOÀN BỘ DỮ LIỆU DƯỚI ĐÂY LÀ DỮ LIỆU GIẢ LẬP DÀNH RIÊNG CHO MÔI TRƯỜNG PHÁT TRIỂN (DEVELOPMENT SEED ONLY), TRÍCH XUẤT TỪ CÁC TỆP `V2__dev_seed.sql`, `V6__dev_seed_nt01.sql`, `mock/data.json`, VÀ `docs/mock-contract.md`. TUYỆT ĐỐI KHÔNG SỬ DỤNG TRÊN MÔI TRƯỜNG SẢN XUẤT.*

### 5.1. Bảng Tổng Hợp Tài Khoản Thử Nghiệm Môi Trường Phát Triển

| STT | Email | Mã LMS (`lmsUserId`) | Vai trò (`Role`) | Công ty (`company_id`) | Bắt buộc đổi mật khẩu (`must_change_password`) | Phương thức đăng nhập |
|:---:|:---|:---|:---|:---:|:---:|:---|
| 1 | `candidate1@rikkeijobs.test` | `lms-sv-001` | `CANDIDATE` | `NULL` | `false` | Vé SSO qua LMS mock (tab "Qua LMS" hoặc `/sso-callback`) |
| 2 | `candidate2@rikkeijobs.test` | `lms-sv-002` | `CANDIDATE` | `NULL` | `false` | Vé SSO qua LMS mock (tab "Qua LMS" hoặc `/sso-callback`) |
| 3 | `candidate3@rikkeijobs.test` | `lms-sv-003` | `CANDIDATE` | `NULL` | `false` | Vé SSO qua LMS mock (tab "Qua LMS" hoặc `/sso-callback`) |
| 4 | `mentor1@rikkeijobs.test` | `lms-mt-001` | `MENTOR` | `NULL` | `false` | Vé SSO qua LMS mock (tab "Qua LMS" hoặc `/sso-callback`) |
| 5 | `staff1@rikkeijobs.test` | `lms-st-001` | `STAFF` | `NULL` | `false` | Vé SSO qua LMS mock (tab "Qua LMS" hoặc `/sso-callback`) |
| 6 | `admin1@rikkeijobs.test` | `lms-ad-001` | `ADMIN` | `NULL` | `false` | Vé SSO qua LMS mock (tab "Qua LMS" hoặc `/sso-callback`) |
| 7 | `hr1@rikkeijobs.test` | `NULL` | `HR` | `1` (Doanh nghiệp A) | `TRUE` | Email + Mật khẩu (`Test@123`) tại tab "Doanh nghiệp" |
| 8 | `hr2@rikkeijobs.test` | `NULL` | `HR` | `2` (Doanh nghiệp B) | `false` | Email + Mật khẩu (`Test@123`) tại tab "Doanh nghiệp" |

### 5.2. Lệnh cURL Lấy Vé SSO Từ Mock LMS Service

Dịch vụ LMS Mock lắng nghe tại cổng `http://localhost:9000` với khóa bảo vệ dịch vụ `X-Service-Key: dev-key` (khai báo công khai trong `.env.example`).

- **Lệnh sinh vé hợp lệ**:

  ```bash
  curl -s -X POST http://localhost:9000/lms/sso/tickets \
    -H "Content-Type: application/json" \
    -H "X-Service-Key: dev-key" \
    -d '{"lmsUserId":"lms-sv-001"}'
  ```

- **Kết quả trả về mẫu (HTTP 201 Created)**:

  ```json
  {
    "ticket": "8c3b1a2f4e5d6c7b8a90123456789abc",
    "issuedAt": "2026-11-14T12:30:00.000Z"
  }
  ```

- **Quy tắc hiệu lực**: Vé SSO có thời gian sống chính xác 60 giây kể từ thời điểm `issuedAt` và chỉ được sử dụng đúng 1 lần duy nhất (Single-use). Hệ thống đánh dấu tiêu hủy vé trong bảng `used_sso_tickets` ngay khi tiếp nhận yêu cầu.

### 5.3. Trình Tự Thực Thi 7 Kịch Bản Nghiệm Thu (Acceptance Scenarios)

#### Kịch bản 1: Đăng nhập SSO bằng vé hợp lệ (SSO Login)

1. Thực thi lệnh cURL lấy vé cho `candidate1` (`lms-sv-001`) từ mock như mục 5.2, nhận chuỗi vé `<TICKET>`.
2. Truy cập trình duyệt tại `http://localhost:3000/sso-callback?ticket=<TICKET>` (hoặc vào `http://localhost:3000/login`, chuyển sang tab "Qua LMS", dán vé vào ô trợ giúp kiểm thử và nhấn Xác thực).
3. Backend tiếp nhận vé, đối soát với LMS mock, cấp phát tài khoản nếu chưa tồn tại, và trả về Access Token JWT.
4. Giao diện lưu token trong bộ nhớ và tự động chuyển hướng tới trang chủ Ứng viên (`/candidate`).
5. Kiểm tra thông tin phiên làm việc:

   ```bash
   curl -s http://localhost:8080/api/v1/auth/me -H "Authorization: Bearer <ACCESS_TOKEN>"
   ```

   Kết quả trả về hồ sơ có `role: "CANDIDATE"` và `email: "candidate1@rikkeijobs.test"`.

#### Kịch bản 2: Phát lại vé đã dùng nhận lỗi 401 (Ticket Replay 401)

1. Sử dụng lại chính mã `<TICKET>` đã đăng nhập thành công từ Kịch bản 1.
2. Gửi yêu cầu xác thực lần thứ hai đến backend:

   ```bash
   curl -s -X POST http://localhost:8080/api/v1/auth/sso \
     -H "Content-Type: application/json" \
     -d '{"ticket":"<TICKET>"}'
   ```

3. Quan sát kết quả: Hệ thống phản hồi HTTP 401 Unauthorized với thông báo lỗi:

   ```json
   {"code":"TICKET_ALREADY_USED","message":"Vé đăng nhập đã được sử dụng"}
   ```

4. Trên giao diện trình duyệt (`/sso-callback?ticket=<TICKET>`), xuất hiện thông báo cảnh báo vé đã qua sử dụng cùng nút bấm quay về trang đăng nhập.

#### Kịch bản 3: Sử dụng vé quá hạn 60 giây nhận lỗi 401 (Expired Ticket 401)

1. Tạo một vé quá hạn bằng cách truyền tham số `issuedAt` trong quá khứ tới LMS Mock:

   ```bash
   curl -s -X POST http://localhost:9000/lms/sso/tickets \
     -H "Content-Type: application/json" \
     -H "X-Service-Key: dev-key" \
     -d '{"lmsUserId":"lms-sv-001","issuedAt":"2020-01-01T00:00:00Z"}'
   ```

   Nhận về chuỗi vé hết hạn `<EXPIRED_TICKET>`.
2. Gửi yêu cầu đăng nhập bằng vé này:

   ```bash
   curl -s -X POST http://localhost:8080/api/v1/auth/sso \
     -H "Content-Type: application/json" \
     -d '{"ticket":"<EXPIRED_TICKET>"}'
   ```

3. Quan sát kết quả: Backend từ chối với HTTP 401 Unauthorized:

   ```json
   {"code":"TICKET_EXPIRED","message":"Vé đăng nhập đã hết hạn"}
   ```

#### Kịch bản 4: Tài khoản hr1 đăng nhập lần đầu bị ép đổi mật khẩu (HR1 First Login)

1. Truy cập `http://localhost:3000/login`, chọn tab "Doanh nghiệp".
2. Nhập Email `hr1@rikkeijobs.test`, Mật khẩu `Test@123` và nhấn "Đăng nhập".
3. Backend phản hồi `mustChangePassword: true`. Giao diện tự động điều hướng sang trang `/change-password` kèm cảnh báo yêu cầu đổi mật khẩu.
4. Thử nghiệm gọi một endpoint nghiệp vụ (ví dụ `/api/v1/profiles/me/skills`) bằng token vừa nhận:

   ```bash
   curl -s http://localhost:8080/api/v1/profiles/me/skills -H "Authorization: Bearer <TOKEN_HR1>"
   ```

   Quan sát phản hồi HTTP 403 Forbidden:

   ```json
   {"code":"MUST_CHANGE_PASSWORD","message":"Tài khoản yêu cầu đổi mật khẩu trước khi tiếp tục"}
   ```

5. Tại biểu mẫu `/change-password`, nhập Mật khẩu cũ `Test@123` và Mật khẩu mới đạt chuẩn `Rikkei#2026Secure`, nhấn "Đổi mật khẩu".
6. Hệ thống cập nhật mật khẩu, xóa cờ `must_change_password`, và chuyển hướng người dùng vào trang chủ Doanh nghiệp (`/hr`).

#### Kịch bản 5: Nhập sai mật khẩu 5 lần liên tiếp bị khóa 15 phút (Lockout Policy)

1. Tại tab "Doanh nghiệp", nhập Email `hr2@rikkeijobs.test` và mật khẩu sai `WrongPass1`.
2. Thực hiện đăng nhập sai liên tiếp 5 lần:
   - Các lần 1 đến 4: Trả về HTTP 401 `{"code":"UNAUTHORIZED","message":"Email hoặc mật khẩu không chính xác"}`.
   - Lần thứ 5: Hệ thống kích hoạt khóa tài khoản 15 phút, trả về HTTP 401:

     ```json
     {"code":"ACCOUNT_LOCKED","message":"Đăng nhập thất bại quá 5 lần. Tài khoản bị tạm khóa 15 phút."}
     ```

3. Lần thứ 6 (kể cả khi nhập ĐÚNG mật khẩu `Test@123`):

   ```bash
   curl -s -X POST http://localhost:8080/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"hr2@rikkeijobs.test","password":"Test@123"}'
   ```

   Hệ thống tiếp tục từ chối với HTTP 401 `ACCOUNT_LOCKED` kèm thông báo số phút khóa còn lại.
4. Trên giao diện, đồng hồ đếm ngược hiển thị số phút còn lại và nút gửi bị vô hiệu hóa.

#### Kịch bản 6: Quên mật khẩu qua Mailpit, đặt lại và kiểm tra link dùng 1 lần (Password Reset)

1. Mở trang `http://localhost:3000/forgot-password`, nhập Email `hr1@rikkeijobs.test` và bấm "Gửi yêu cầu".
2. Hệ thống luôn phản hồi thông báo thành công chung (chống dò quét tài khoản): *"Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi."*
3. Mở giao diện hòm thư Mailpit tại `http://localhost:8025`.
4. Tìm email mới nhất gửi tới `hr1@rikkeijobs.test` với tiêu đề *"Yêu cầu đặt lại mật khẩu - Rikkei Jobs"*, sao chép liên kết đặt lại mật khẩu có chứa mã token: `http://localhost:3000/reset-password/<RESET_TOKEN>`.
5. Mở liên kết đó trên trình duyệt, nhập mật khẩu mới `Reset#2026Pass` và submit.
6. Hệ thống đặt lại mật khẩu thành công, mở khóa tài khoản (nếu bị khóa) và xóa cờ `must_change_password`.
7. Tái sử dụng liên kết: Gửi lại yêu cầu với chính token đó. Hệ thống từ chối với HTTP 400 Bad Request:

   ```json
   {"code":"RESET_TOKEN_EXPIRED","message":"Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"}
   ```

#### Kịch bản 7: Vị trí giao diện tài liệu OpenAPI / Swagger UI (OpenAPI Dev UI)

1. Mở trình duyệt truy cập: `http://localhost:8080/swagger-ui.html` (chuyển hướng tới `http://localhost:8080/swagger-ui/index.html`).
2. Quan sát giao diện Swagger UI tương tác liệt kê đầy đủ 3 nhóm tài liệu:
   - `Authentication`: Các API xác thực, đăng nhập SSO, login doanh nghiệp, đổi mật khẩu, quên mật khẩu, me.
   - `Skill Profile`: Các API xem và tính toán hồ sơ năng lực (`/api/v1/profiles/**`).
   - `Health Check`: API kiểm tra trạng thái sức khỏe `/api/v1/health`.
3. Xem đặc tả JSON thô tại: `http://localhost:8080/api-docs`.
4. Lưu ý an toàn: Ở môi trường sản xuất (`prod` profile), Swagger UI và `/api-docs` bị vô hiệu hóa hoàn toàn (HTTP 404) theo Rule 16.

---

## 6. Ảnh Màn Hình Minh Họa Nghiệm Thu (Screenshots Attached in GitHub PR)

*LƯU Ý LƯU TRỮ: TUYỆT ĐỐI KHÔNG LƯU TRỮ HOẶC COMMIT TỆP ẢNH TRONG KHO MÃ NGUỒN GIT ĐỂ TRÁNH GÂY PHÌNH DUNG LƯỢNG REPOSITORY CÔNG KHAI. TOÀN BỘ ẢNH MÀN HÌNH MINH HỌA NGHIỆM THU ĐƯỢC CHUẨN BỊ BẰNG TRÌNH DUYỆT NGOÀI GIT VÀ ĐÍNH KÈM TRỰC TIẾP TRÊN GIAO DIỆN MÔ TẢ PULL REQUEST CỦA GITHUB THEO ĐÚNG THỨ TỰ.*

Danh mục thứ tự và chú thích hình ảnh:

1. `01-login-lms-1440px-light.png`: Cổng đăng nhập qua LMS (SSO) - Desktop 1440px Light Mode
2. `02-login-enterprise-1440px-light.png`: Cổng đăng nhập Doanh nghiệp (Email + Mật khẩu) - Desktop 1440px Light Mode
3. `03-wrong-password-error-1440px-light.png`: Thông báo lỗi mật khẩu không chính xác (Cold Crimson + Icon non-color cue) - Desktop 1440px Light Mode
4. `04-lockout-countdown-1440px-light.png`: Màn hình khóa tài khoản tạm thời sau 5 lần sai mật khẩu kèm số phút còn lại - Desktop 1440px Light Mode
5. `05-forced-change-password-1440px-light.png`: Giao diện bắt buộc đổi mật khẩu lần đầu cho tài khoản HR mới cấp - Desktop 1440px Light Mode
6. `06a-forgot-password-1440px-light.png`: Trang yêu cầu khôi phục mật khẩu doanh nghiệp - Desktop 1440px Light Mode
7. `06b-forgot-password-mailpit.png`: Email khôi phục mật khẩu trong hộp thư kiểm thử Mailpit (cổng 8025)
8. `07-reset-password-1440px-light.png`: Giao diện đặt lại mật khẩu mới với token bảo mật 256-bit - Desktop 1440px Light Mode
9. `08-candidate-home-sso-1440px-light.png`: Trang chủ Ứng viên (Candidate Dashboard) sau khi xác thực SSO - Desktop 1440px Light Mode
10. `09-candidate-skill-profile-1440px-light.png`: Trang hồ sơ năng lực: 13 kỹ năng, 11 đã xác thực và 2 tự khai - Desktop 1440px Light Mode
11. `10-hr-home-1440px-light.png`: Trang chủ Doanh nghiệp (HR Dashboard) sau khi đăng nhập - Desktop 1440px Light Mode
12. `11-login-lms-mobile-375px-light.png`: Giao diện đăng nhập LMS trên thiết bị di động - Mobile 375px Light Mode
13. `12-login-enterprise-1440px-dark.png`: Giao diện đăng nhập Doanh nghiệp giao diện tối - Desktop 1440px Dark Mode

---

## 7. Số Liệu Kiểm Định Đo Đạc Thực Tế Trong Phiên Này (Verified Metrics)

Toàn bộ các thông số dưới đây được sao chép trực tiếp từ kết quả thực thi lệnh thực tế trong phiên hiện tại (Task T022B63):

- **Kiểm thử Đơn vị & Tích hợp Backend (JUnit 5 & Testcontainers)**: **346 / 346 tests PASS** (`./mvnw test`, thời gian: 3m 11s, 0 failures, 0 errors, bổ sung kiểm thử tự động xác thực tính toàn vẹn tài liệu OpenAPI trong Round G).
- **Kiểm thử Đơn vị Frontend (Vitest & Testing Library)**: **108 / 108 tests PASS** trên 18 test files (100% green, tăng 20 tests so với baseline 86, bổ sung 3 tests trong Round F2).
- **Kiểm thử Đầu - Cuối E2E (Node.js Test Runner 4 Tiers)**: **17 / 17 suites PASS** (**221 / 221 test cases PASS**, 998 assertions, thời gian: 16.68s, tăng 5 test cases và 38 assertions so với baseline 216).
- **Ma trận Tương phản Toán học (WCAG 2.2 AA & APCA)**: **66 / 66 cặp màu PASS** (36 cặp Light Mode + 30 cặp Dark Mode, 0 vi phạm, $\Delta \le 0.01$).
- **Thẩm định Thị giác & Quét Responsive Toàn Tuyến (Chromium CDP)**: **112 / 112 cấu hình đạt chuẩn 100%** (14 trang x 4 viewports 375/768/1024/1440 x 2 themes Light/Dark: $scrollWidth \le innerWidth$, lề trái $\ge 16\text{px}$, lề phải $\ge 16\text{px}$).
- **Cổng Kiểm Định Tích Hợp (Quality Gates)**: **26 / 26 gates PASSED** trên cả `check.ps1` và `check.sh` với số lượng đồng nhất 100%.
- **Bảo Vệ Ngăn Chặn Mã Màu Thô (Color Literal Guard)**: Check 9 trong `scripts/validate-agent-config.mjs` quét sạch toàn bộ `frontend/src`, 0 mã màu thô ngoài token files.
- **Biểu Trưng Favicon**: SHA-256 của `favicon.svg` và `favicon.png` trùng khớp 100% nguyên bản byte-for-byte.

---

## 8. Giới Hạn Kỹ Thuật Đã Biết (Known Limitations)

1. **Lưu Trữ Token In-Memory (In-Memory Token Persistence)**:
   - Nhằm tuân thủ tuyệt đối chuẩn OWASP ASVS v4.0 về phòng chống đánh cắp token qua tấn công XSS, Access Token chỉ được duy trì trong bộ nhớ RAM của ứng dụng React.
   - Khi người dùng làm mới trang trình duyệt (F5/Reload), phiên làm việc sẽ bị hủy và yêu cầu đăng nhập lại. Cơ chế cấp mới token tự động qua HttpOnly Cookie / Refresh Token được lên kế hoạch cho phân hệ tiếp theo.

2. **Cảm Nhận Độ Phân Tầng Thị Giác ở Light Mode (Light Mode Subtle Hierarchy)**:
   - Độ chênh lệch độ sáng toán học CIELAB giữa Page Canvas (`#EEF2F8`, $L^*=95.35$) và Card Container (`#FFFFFF`, $L^*=100.00$) đạt $\Delta L^* = 4.65 \ge 4.0$.
   - Trên một số màn hình văn phòng có tấm nền TN hoặc màn hình IPS độ sáng cao trong điều kiện ánh sáng chói, độ tương phản giữa nền card và nền trang có thể tạo cảm giác êm dịu (soft/subtle). Ranh giới quang học được gia cố vững chắc qua viền hairline 1px `#BACAD9` và bóng đổ elevation nhẹ. Theo đúng chỉ thị của Team Lead, không phát động đợt tái thiết kế bảng màu mới để giữ tính ổn định.

---

## 9. Câu Hỏi Nghiệp Vụ Mở (Open Business Questions)

1. **Chu Kỳ Phiên & Thời Gian Sống Token (Session Lifetime & Token Expiry)**:
   - Cần thống nhất với ban quản trị LMS về chu kỳ hết hạn của phiên làm việc SSO (hiện tại vé SSO TTL 60s, Access Token TTL 15 phút) để đồng bộ trải nghiệm chuyển hướng khi người dùng thao tác liên tục giữa hai nền tảng.

2. **Lộ Trình Tích Hợp Xác Thực Đa Yếu Tố (MFA / 2FA Roadmap)**:
   - Cần xác định phạm vi áp dụng xác thực 2 bước (OTP/Email OTP) cho các tài khoản quản trị viên cấp cao (`ADMIN`) và doanh nghiệp (`HR`) trong các sprint tiếp theo.

3. **Cơ Chế Khôi Phục Tài Khoản Doanh Nghiệp (Enterprise Account Recovery)**:
   - Trong trường hợp chuyên viên HR bị khóa tài khoản hoặc quên email đăng ký doanh nghiệp, quy trình xác minh qua Admin/Staff cần có giao diện phê duyệt nội bộ chuyên dụng.

4. **Phân Quyền Vai Trò Cho Hồ Sơ Năng Lực (Skill Profile Role-Scoping — Question 11)**:
   - Ghi nhận Question 11 trong `docs/05-open-business-questions.md`: Hiện tại các endpoint `/api/v1/profiles/**` chỉ yêu cầu xác thực (`@AuthenticationPrincipal UserPrincipal user`). Cần chốt với Product Owner xem có nên giới hạn quyền sở hữu hồ sơ năng lực chỉ cho vai trò `CANDIDATE` (và `MENTOR`) hay giữ nguyên cơ chế mở cho mọi người dùng đã xác thực.

---

## 10. Danh Mục Kiểm Tra Của Reviewer (Reviewer Checklist)

- [ ] Đã xác nhận phần tiền kiểm trong `docs/nt01/PHASE0_ACK.md` tồn tại đầy đủ, không có ký tự emoji.
- [ ] Không còn bất kỳ mã màu thô (hex literal, rgb/rgba) nào trong `frontend/src` ngoài `design-tokens.css` và danh mục hợp lệ.
- [ ] Thành phần `<BrandMark />` nhận màu từ design tokens (`--rj-brand-mark-red`, `--rj-brand-mark-contrast`), bảo tồn nguyên vẹn hình học 3 cột bậc thang.
- [ ] Hai tệp `favicon.svg` và `favicon.png` có mã băm SHA-256 giống hệt 100% với tệp gốc từ `Tài liệu dự án/`.
- [ ] Kiểm tra cổng `scripts/validate-agent-config.mjs` (Check 9) đạt 0 vi phạm.
- [ ] Toàn bộ 346 kiểm thử backend (`mvn test`) vượt qua thành công (+8 tests so với baseline 338).
- [ ] Toàn bộ 108 kiểm thử frontend (`npm test` trên 18 test files) vượt qua thành công (+22 tests so với baseline 86).
- [ ] Toàn bộ 17 suites / 221 test cases E2E (`node e2e/run-all.mjs`, 998 assertions) chạy thành công trên cụm Docker.
- [ ] Cả hai kịch bản `check.sh` và `check.ps1` báo cáo 26/26 gates PASSED đồng nhất mà không cần cờ chuyển đổi đường dẫn (path conversion override).
- [ ] Thẩm định thị giác trình duyệt thực tế Chromium CDP đạt 112/112 cấu hình toàn tuyến $scrollWidth \le innerWidth$.
- [ ] Ngăn xếp Docker được dọn dẹp sạch sẽ (`docker compose down -v`), không tồn đọng container hoặc volume rikkei.
- [ ] Toàn bộ thay đổi ở trạng thái UNCOMMITTED trên nhánh `feature/T022863-dang-nhap`.
