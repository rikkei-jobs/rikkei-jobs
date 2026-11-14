# HS-01 — Skill Profile: Feature Notes & Specification / Hồ Sơ Năng Lực: Ghi Chú Tính Năng & Đặc Tả Kỹ Thuật

Pull Request Title: `[HS-01] Skill Profile: skills, evidences and verified scores`  
Task: NT-01 (T022B63) — Unified JWT Authentication Integration & HTTP Basic Deprecation

---

## Part 1: English Section

### 1. Feature Overview & Deliverables

Each candidate in the Rikkei Jobs platform maintains a competency profile comprising quantitative skills on a 0–100 scale backed by verifiable evidence records. Verified skills (synthesized from external systems: LMS course performance, Exam testing, and PM internship projects) are strictly segregated from self-declared skills.

- **Database Layer**:
  - `V3__skill_profile.sql`: Production schema definition.
  - `V4__dev_skill_profile_seed.sql`: Development seed datasets.
- **Backend Layer**:
  - Quantitative skill recomputation engine: `recomputeSkills(userId)`.
  - Three RESTful endpoints prefixed under `/api/v1/profiles`.
  - Unified Authentication: Stateless JWT Bearer token authentication (`Authorization: Bearer <token>`). Interim HTTP Basic authentication is completely removed.
- **Frontend Layer**:
  - Skill Profile screen (`frontend/src/features/candidate`), accessible via the "Hồ sơ năng lực" navigation tab or the direct protected route `/candidate/skills`.
  - Unauthenticated visitors are presented with an elegant Call to Action (CTA) directing them to `/login`.
  - All API interactions route through the centralized HTTP client (`httpClient.ts`), automatically managing in-memory tokens and handling 401/403 session lifecycle events.

### 2. Operational Guide & Local Execution

#### 2.1 Starting Local Development Environment

```bash
docker compose up -d postgres mock mailpit
cd backend && SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
cd frontend && npm ci && npm run dev
```

Navigate to `http://127.0.0.1:3000` and select the "Hồ sơ năng lực" tab. Unauthenticated visitors click "Đăng nhập ngay" to navigate to `/login` and sign in using a seeded candidate account:

- Email: `candidate1@rikkeijobs.test`
- Password: Refer to development seed file `V2__dev_seed.sql`

Swagger UI specification (dev profile only): `http://127.0.0.1:8080/swagger-ui.html`.

#### 2.2 Automated Verification & Quality Gates

```bash
cd backend && ./mvnw test spotbugs:check
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

### 3. Data Model

| Table Name | Owning Module | Architectural Notes |
|---|---|---|
| `skills` | `assessment` | Catalogue of 20 standardized skills with `skill_group` (PROGRAMMING, BACKEND, FRONTEND, DEVOPS, QUALITY, SOFT_SKILL) |
| `candidate_profiles` | `candidate` | Candidate visibility management (`is_public`, default `FALSE`) |
| `external_records` | `candidate` | Normalized 0–100 raw records from external systems (LMS, EXAM, PM) |
| `skill_mappings` | `candidate` | Course-to-skill mapping: `(source, source_code) -> skill_id, weight` |
| `skill_evidences` | `candidate` | Granular evidence records; `weight` inherited from mapping (default 1 for self-declared) |
| `skill_scores` | `candidate` | Aggregated competency scores. `verified_score` and `level` are NULL for self-declared-only skills |

Module Boundary Enforcement (Rule 14): No physical cross-module foreign keys exist. Columns `user_id` and `skill_id` are scalar identifiers. The `candidate` module accesses the standardized skills catalogue strictly through the public interface `assessment.service.SkillCatalogService`.

### 4. Mathematical Formula & Empirical Verification

```text
verified_score = sum(score * weight * timeFactor) / sum(weight * timeFactor)
timeFactor     = 1 if evidence was recorded within the last year, 0.5 if older
level          = 0-39 Basic, 40-69 Intermediate, 70-84 Advanced, 85-100 Expert
```

Empirical hand calculation for `candidate1`, skill `JAVA` (seed data; weights defined in `skill_mappings`):

| Evidence Source | Raw Score | Weight | Time Factor | Score x Weight x Factor | Weight x Factor |
|---|---|---|---|---|---|
| LMS JAVA01 | 85 | 0.7 | 1.0 | 59.5 | 0.70 |
| LMS JAVA01 (previous term, 500 days ago) | 60 | 0.7 | 0.5 | 21.0 | 0.35 |
| EXAM EX-JAVA-2026-10 | 80 | 0.8 | 1.0 | 64.0 | 0.80 |
| PM IOC-JB-2026-09 | 85 | 0.3 | 1.0 | 25.5 | 0.30 |
| **Sum** | | | | **170.0** | **2.15** |

Calculation: `170.0 / 2.15 = 79.07` (Level: Advanced / Tốt).

Adding one subsequent LMS JAVA01 record with score 100 (recorded 1 day ago):

- New Numerator: `170.0 + (100 * 0.7 * 1.0) = 240.0`
- New Denominator: `2.15 + (0.7 * 1.0) = 2.85`
- Recalculated Score: `240.0 / 2.85 = 84.21` (Level: Advanced / Tốt).

Both calculations are asserted in integration test `SkillProfileIntegrationTest.recomputeChangesScore` and unit test `SkillScoreCalculatorTest`.

Triggering Recalculation: Dispatch `POST /api/v1/profiles/me/skills/recompute` (or click "Tính lại từ LMS, Exam, PM" in the UI).

### 5. API Specification & Unified Authentication

#### 5.1 RESTful Endpoints (OpenAPI Tag: "Skill Profile")

| HTTP Method & Path | Access Control | Description & Response Body |
|---|---|---|
| `GET /api/v1/profiles/me/skills` | Valid JWT required | Retrieves skills and evidence list for the authenticated caller: `List<SkillProfileItemDto>` |
| `GET /api/v1/profiles/{userId}/skills` | Valid JWT required | Retrieves skills for `{userId}`. The profile owner can always view it; other users can view it only if `is_public = true`, otherwise returns `404 NOT_FOUND` |
| `POST /api/v1/profiles/me/skills/recompute` | Valid JWT required | Recalculates all skill scores for the authenticated caller from `external_records` via `skill_mappings`, updates persistence, and returns updated scores |

The skills list is bounded by the 20 standardized catalog items, and is intentionally unpaginated.

#### 5.2 Unified JWT Authentication Flow

1. User authenticates via NT-01 Identity endpoints:
   - Students and Mentors authenticate via LMS SSO: `POST /api/v1/auth/sso`.
   - Recruiters (HR), Staff, and Admins authenticate via credentials: `POST /api/v1/auth/login`.
2. Backend issues an HMAC-SHA256 signed JWT Access Token.
3. Client holds the access token strictly in volatile memory (in-memory state, never localStorage or sessionStorage).
4. All subsequent API calls to `/api/v1/profiles/**` must attach the standard authorization header:

   ```http
   Authorization: Bearer <access_token>
   ```

5. Requests using legacy HTTP Basic authentication (`Authorization: Basic <credentials>`) are rejected immediately with HTTP 401.

#### 5.3 Response Status Code Matrix

All error responses strictly comply with the project error format specified in `docs/conventions.md`:

```json
{
  "code": "STRING_ERROR_CODE",
  "message": "Chi tiết thông báo lỗi bằng tiếng Việt."
}
```

| HTTP Status | Reason Phrase | Trigger Condition | JSON Error Body Structure |
|---|---|---|---|
| **200 OK** | Success | Request valid, token verified, user authorized to access resource. | Array of `SkillProfileItemDto` objects. |
| **401 UNAUTHORIZED** | Unauthorized | Missing Authorization header, malformed header, expired token, signature tampering, or attempt to authenticate with HTTP Basic. | `{"code": "UNAUTHORIZED", "message": "Yêu cầu xác thực tài khoản hoặc token đã hết hạn"}` |
| **403 FORBIDDEN** | Password Change Required | Authenticated user account has `must_change_password = true` (e.g. newly provisioned HR account). Intercepted by `MustChangePasswordFilter`. | `{"code": "MUST_CHANGE_PASSWORD", "message": "Tài khoản bắt buộc phải đổi mật khẩu trước khi tiếp tục"}` |
| **404 NOT_FOUND** | Not Found | Requested `{userId}` does not exist, or caller attempts to access another user's profile where `is_public = false` (or profile row absent). | `{"code": "NOT_FOUND", "message": "Không tìm thấy hồ sơ hoặc hồ sơ ở chế độ riêng tư"}` |

### 6. Acceptance Criteria Checklist

| Acceptance Criterion | Verification Evidence |
|---|---|
| `candidate1` views at least 5 skills, each displaying source and date | 13 skills present in dev seed; verified by `candidateSeesSkillsWithEvidences` |
| Inserting records and recalculating updates scores per mathematical formula | Section 4; verified by `recomputeChangesScore` |
| Self-declared skills display "Tự khai" badge with NULL verified score | Skills `COMMUNICATION` and `ENGLISH`; verified by `selfOnlySkill` |
| Course-to-skill mappings persist in database table | Verified by `mappingLivesInTable` inserting a mapping row and reading newly emerged skill |
| Accessing another user's private profile returns HTTP 404 | Verified by `privateProfileIsNotFoundForOthers` |
| Missing or invalid token returns HTTP 401 UNAUTHORIZED | Verified by `unauthenticatedReturns401`, `tamperedTokenReturns401`, `expiredTokenReturns401` |
| HTTP Basic authentication requests are rejected with HTTP 401 | Verified by `basicAuthRejectedOnGetMeSkills`, `basicAuthRejectedOnGetOtherSkills`, `basicAuthRejectedOnRecompute` |
| Account requiring password change receives HTTP 403 MUST_CHANGE_PASSWORD | Verified by `userWithMustChangePasswordGets403` |
| OpenAPI documentation accurately reflects protected endpoints | Swagger UI and `/v3/api-docs` register all 3 endpoints under `BearerAuth` |

### 7. User Interface References

- Evidence details with provenance source and timestamp: `docs/images/hs-01-skill-profile-evidences.jpg`
- Self-declared skills with "Tự khai" badge: `docs/images/hs-01-skill-profile-self-declared.jpg`

### 8. Architectural Decisions & NT-01 Synchronization

1. **HTTP Basic Removal & Unified JWT Architecture**:
   - In the initial prototype phase (HS-01), login was not yet built, so interim HTTP Basic authentication backed by `DatabaseUserDetailsService` was used.
   - In Task NT-01 (T022B63), HTTP Basic was completely disabled in `SecurityConfig`. `DatabaseUserDetailsService` and `AuthenticatedUser` were deleted. The entire application now operates exclusively on stateless HMAC-SHA256 JWT Bearer tokens.
2. **Standardized Identity Principal Model (ONE Principal Type - Rule 14)**:
   - Unified on `com.rikkei.jobs.identity.UserPrincipal` located in the identity root package as the public identity contract for all dependent modules.
   - `SkillProfileController` consumes identity via `@AuthenticationPrincipal UserPrincipal user`, maintaining strict decoupling from internal identity implementation details.
3. **Frontend Harmonization & Centralized HTTP Auth Client**:
   - Eliminated standalone `LoginForm.tsx` and helper `buildBasicAuthHeader`.
   - Utilizes `httpClient.ts` managing tokens in memory and attaching `Authorization: Bearer <token>`.
   - Guests are greeted with a clear CTA button navigating to `/login`. Once authenticated, candidates seamlessly navigate to `/candidate/skills`.
4. **Privacy-Preserving 404 Response**:
   - Profiles with `is_public = false` (or without an entry in `candidate_profiles`) return HTTP 404 `NOT_FOUND` to third-party callers. This prevents account existence enumeration and guarantees privacy.
5. **Self-Declared Score Definition**:
   - `self_score` reflects the score of the most recent `SELF` source evidence.
6. **Future Extensibility**:
   - Subsequent milestone DG-03 will enhance the scoring formula with configurable source weights via `SkillScoreCalculator`.

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### 1. Mục Tiêu & Tính Năng Phân Hệ

Mỗi ứng viên trong hệ thống Rikkei Jobs sở hữu một hồ sơ năng lực gồm danh sách các kỹ năng với điểm số định lượng trên thang điểm 0–100 kèm các bằng chứng xác thực (evidences). Các kỹ năng đã được kiểm chứng (verified skills — tổng hợp từ các hệ thống bên ngoài: kết quả học tập LMS, điểm thi Exam và dự án thực tập PM) được phân tách rõ ràng với các kỹ năng tự khai (self-declared skills).

- **Cơ sở dữ liệu**:
  - `V3__skill_profile.sql`: Cấu trúc bảng schema sản phẩm (production).
  - `V4__dev_skill_profile_seed.sql`: Dữ liệu seed mẫu phục vụ môi trường phát triển (dev).
- **Backend**:
  - Nghiệp vụ tính toán điểm năng lực: `recomputeSkills(userId)`.
  - 3 REST endpoints thuộc tiền tố `/api/v1/profiles`.
  - Cơ chế xác thực thống nhất: Sử dụng chuẩn Access Token JWT (`Authorization: Bearer <token>`), loại bỏ hoàn toàn cơ chế HTTP Basic tạm thời trước đây.
- **Frontend**:
  - Màn hình Hồ sơ năng lực (`frontend/src/features/candidate`), truy cập thông qua tab "Hồ sơ năng lực" trên thanh điều hướng hoặc tuyến đường phân quyền `/candidate/skills`.
  - Khách truy cập chưa xác thực sẽ thấy thẻ hành động (Call to Action) hướng dẫn đăng nhập trực tiếp tới `/login`.
  - Toàn bộ các yêu cầu gọi API sử dụng HTTP Auth Client tập trung (`httpClient.ts`), tự động đính kèm token trong bộ nhớ RAM và xử lý vòng đời phiên 401/403.

### 2. Hướng Dẫn Vận Hành & Khởi Chạy

#### 2.1 Khởi động môi trường phát triển cục bộ

```bash
docker compose up -d postgres mock mailpit
cd backend && SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
cd frontend && npm ci && npm run dev
```

Truy cập `http://127.0.0.1:3000`, chọn tab "Hồ sơ năng lực". Khách truy cập bấm nút "Đăng nhập ngay" để chuyển tới `/login` và đăng nhập bằng tài khoản sinh viên mẫu:

- Email: `candidate1@rikkeijobs.test`
- Mật khẩu: Tham khảo trong tệp seed `V2__dev_seed.sql`

Giao diện tài liệu Swagger UI (chỉ bật ở môi trường dev): `http://127.0.0.1:8080/swagger-ui.html`.

#### 2.2 Kiểm thử tự động & Cổng chất lượng

```bash
cd backend && ./mvnw test spotbugs:check
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

### 3. Mô Hình Dữ Liệu (Data Model)

| Tên Bảng | Module Sở Hữu | Ghi Chú Kiến Trúc |
|---|---|---|
| `skills` | `assessment` | Danh mục 20 kỹ năng chuẩn, phân nhóm `skill_group` (PROGRAMMING, BACKEND, FRONTEND, DEVOPS, QUALITY, SOFT_SKILL) |
| `candidate_profiles` | `candidate` | Quản lý trạng thái công khai `is_public`, mặc định `FALSE` |
| `external_records` | `candidate` | Lưu trữ dữ liệu điểm chuẩn hóa 0–100 từ LMS, EXAM, PM |
| `skill_mappings` | `candidate` | Bảng ánh xạ môn học/bài thi: `(source, source_code) -> skill_id, weight` |
| `skill_evidences` | `candidate` | Bằng chứng kỹ năng, trường `weight` sao chép từ mapping (mặc định 1 cho nguồn tự khai) |
| `skill_scores` | `candidate` | Điểm kỹ năng tổng hợp. `verified_score` là NULL đối với kỹ năng thuần tự khai; `level` tương ứng là NULL |

Quy tắc biên giới module (Rule 14): Không khai báo khóa ngoại vật lý liên module. Cột `user_id` và `skill_id` là các trường vô hướng (scalar). Module `candidate` chỉ đọc danh mục kỹ năng thông qua giao diện công khai `assessment.service.SkillCatalogService`.

### 4. Công Thức & Ví Dụ Tính Toán Thực Nghiệm

```text
verified_score = sum(score * weight * timeFactor) / sum(weight * timeFactor)
timeFactor     = 1 nếu bằng chứng phát sinh trong vòng 1 năm, 0.5 nếu cũ hơn
level          = 0-39 Cơ bản (Basic), 40-69 Khá (Intermediate), 70-84 Tốt (Advanced), 85-100 Xuất sắc (Expert)
```

Ví dụ kiểm chứng bằng tay đối với `candidate1`, kỹ năng `JAVA` (dữ liệu mẫu từ seed; trọng số lấy từ `skill_mappings`):

| Nguồn Bằng Chứng | Điểm Gốc | Trọng Số | Hệ Số Thời Gian | Điểm x Trọng Số x Hệ Số | Trọng Số x Hệ Số |
|---|---|---|---|---|---|
| LMS JAVA01 | 85 | 0.7 | 1.0 | 59.5 | 0.70 |
| LMS JAVA01 (kỳ trước, 500 ngày trước) | 60 | 0.7 | 0.5 | 21.0 | 0.35 |
| EXAM EX-JAVA-2026-10 | 80 | 0.8 | 1.0 | 64.0 | 0.80 |
| PM IOC-JB-2026-09 | 85 | 0.3 | 1.0 | 25.5 | 0.30 |
| **Tổng Cộng** | | | | **170.0** | **2.15** |

Phép tính: `170.0 / 2.15 = 79.07` (xếp loại Tốt / Advanced).

Khi thêm 1 bản ghi điểm LMS JAVA01 đạt 100 điểm (1 ngày trước):

- Tử số mới: `170.0 + (100 * 0.7 * 1.0) = 240.0`
- Mẫu số mới: `2.15 + (0.7 * 1.0) = 2.85`
- Điểm verified mới: `240.0 / 2.85 = 84.21` (xếp loại Tốt / Advanced).

Cả hai con số trên đều được kiểm chứng tự động bằng assertion trong `SkillProfileIntegrationTest.recomputeChangesScore` và `SkillScoreCalculatorTest`.

Thực thi tính lại: Gửi `POST /api/v1/profiles/me/skills/recompute` (hoặc bấm nút "Tính lại từ LMS, Exam, PM" trên giao diện).

### 5. Đặc Tả Giao Diện API & Quy Trình Xác Thực Thống Nhất

#### 5.1 Danh sách Endpoints RESTful (OpenAPI Tag: "Skill Profile")

| Phương Thức & Đường Dẫn | Quyền Truy Cập | Mô Tả & Dữ Liệu Phản Hồi |
|---|---|---|
| `GET /api/v1/profiles/me/skills` | Yêu cầu JWT hợp lệ | Trả về danh sách kỹ năng của chính người dùng hiện tại: `List<SkillProfileItemDto>` |
| `GET /api/v1/profiles/{userId}/skills` | Yêu cầu JWT hợp lệ | Trả về kỹ năng của người dùng `{userId}`. Chủ sở hữu luôn xem được; người dùng khác chỉ xem được nếu hồ sơ ở chế độ công khai (`is_public = true`), ngược lại trả về `404 NOT_FOUND` |
| `POST /api/v1/profiles/me/skills/recompute` | Yêu cầu JWT hợp lệ | Tính toán lại toàn bộ điểm kỹ năng của chính người gọi từ `external_records` thông qua `skill_mappings`, cập nhật cơ sở dữ liệu và trả về danh sách điểm mới |

Danh mục kỹ năng bị chặn trên bởi 20 mã kỹ năng tiêu chuẩn nên API được thiết kế không phân trang có chủ đích.

#### 5.2 Quy Trình Xác Thực Thống Nhất Bằng JWT (JWT Bearer Flow)

1. Người dùng thực hiện đăng nhập qua cổng định danh NT-01:
   - Sinh viên / Giảng viên đăng nhập qua LMS SSO: `POST /api/v1/auth/sso`.
   - Doanh nghiệp / Cán bộ / Quản trị viên đăng nhập qua biểu mẫu: `POST /api/v1/auth/login`.
2. Hệ thống cấp phát mã thông báo truy cập JWT (Access Token).
3. Phía Client lưu trữ token hoàn toàn trong bộ nhớ RAM (In-Memory Storage) thông qua React Context và `httpClient`.
4. Mọi yêu cầu gọi tới các endpoint `/api/v1/profiles/**` bắt buộc đính kèm header tiêu chuẩn:

   ```http
   Authorization: Bearer <access_token>
   ```

5. Tuyệt đối không chấp nhận xác thực HTTP Basic (`Authorization: Basic <credentials>`). Bất kỳ yêu cầu nào mang header Basic sẽ bị từ chối với HTTP 401.

#### 5.3 Ma Trận Mã Trạng Thái Phản Hồi (Response Status Code Matrix)

Tất cả các phản hồi lỗi đều tuân thủ cấu trúc đồng nhất chuẩn hóa theo `docs/conventions.md`:

```json
{
  "code": "STRING_ERROR_CODE",
  "message": "Thông điệp mô tả lỗi chi tiết bằng tiếng Việt."
}
```

| Mã HTTP | Tên Trạng Thái | Điều Kiện Kích Hoạt | Cấu Trúc JSON Phản Hồi Chi Tiết |
|---|---|---|---|
| **200 OK** | Thành công | Yêu cầu hợp lệ, token xác thực đúng, có quyền truy cập dữ liệu. | Danh sách đối tượng kỹ năng `List<SkillProfileItemDto>`. |
| **401 UNAUTHORIZED** | Chưa xác thực | Không truyền header `Authorization`, header mang định dạng không hợp lệ, token JWT bị hết hạn, giả mạo chữ ký, hoặc gửi header HTTP Basic. | `{"code": "UNAUTHORIZED", "message": "Yêu cầu xác thực tài khoản hoặc token đã hết hạn"}` |
| **403 FORBIDDEN** | Đổi mật khẩu bắt buộc | Tài khoản người dùng có cờ `must_change_password = true` (ví dụ tài khoản HR được cấp phát mặc định chưa đổi mật khẩu lần đầu). Bộ lọc `MustChangePasswordFilter` chặn trước khi vào controller. | `{"code": "MUST_CHANGE_PASSWORD", "message": "Tài khoản bắt buộc phải đổi mật khẩu trước khi tiếp tục"}` |
| **404 NOT_FOUND** | Không tìm thấy | Gọi `GET /api/v1/profiles/{userId}/skills` với `{userId}` không tồn tại trong hệ thống, hoặc người khác xem hồ sơ riêng tư (`is_public = false` hoặc chưa có bản ghi `candidate_profiles`). | `{"code": "NOT_FOUND", "message": "Không tìm thấy hồ sơ hoặc hồ sơ ở chế độ riêng tư"}` |

### 6. Danh Mục Tiêu Chí Nghiệm Thu (Acceptance Criteria Checklist)

| Tiêu Chí Nghiệm Thu | Bằng Chứng Kiểm Thử Tương Ứng |
|---|---|
| `candidate1` thấy tối thiểu 5 kỹ năng, mỗi kỹ năng có nguồn và ngày ghi nhận | 13 kỹ năng trong dev seed; kiểm chứng qua test `candidateSeesSkillsWithEvidences` |
| Thêm kết quả và tính toán lại thay đổi điểm số đúng theo công thức | Mục 4; kiểm chứng qua test `recomputeChangesScore` |
| Kỹ năng tự khai hiển thị nhãn "Tự khai", không có điểm verified | Kỹ năng `COMMUNICATION` và `ENGLISH`; kiểm chứng qua `selfOnlySkill` |
| Ánh xạ môn học sang kỹ năng lưu trữ trong bảng cơ sở dữ liệu | Kiểm chứng qua `mappingLivesInTable` chèn bản ghi mapping và kỹ năng mới xuất hiện |
| Người khác gọi xem kỹ năng của `candidate1` khi hồ sơ riêng tư nhận mã 404 | Kiểm chứng qua test `privateProfileIsNotFoundForOthers` |
| Yêu cầu không có token hoặc token sai nhận mã 401 UNAUTHORIZED | Kiểm chứng qua `unauthenticatedReturns401`, `tamperedTokenReturns401`, `expiredTokenReturns401` |
| Yêu cầu mang header HTTP Basic bị từ chối với mã 401 UNAUTHORIZED | Kiểm chứng qua `basicAuthRejectedOnGetMeSkills`, `basicAuthRejectedOnGetOtherSkills`, `basicAuthRejectedOnRecompute` |
| Tài khoản chưa đổi mật khẩu nhận mã 403 MUST_CHANGE_PASSWORD | Kiểm chứng qua `userWithMustChangePasswordGets403` |
| Tài liệu OpenAPI được cập nhật đầy đủ | Swagger UI và `/v3/api-docs` niêm yết 3 tuyến đường bảo vệ bằng BearerAuth |

### 7. Minh Họa Giao Diện

- Danh sách bằng chứng kỹ năng kèm nguồn dữ liệu và mốc thời gian: `docs/images/hs-01-skill-profile-evidences.jpg`
- Kỹ năng thuần tự khai gắn nhãn "Tự khai": `docs/images/hs-01-skill-profile-self-declared.jpg`

### 8. Quyết Định Kiến Trúc & Đồng Bộ Hóa Phân Hệ NT-01 (T022B63)

1. **Loại Bỏ HTTP Basic & Thống Nhất Cơ Chế JWT**:
   - Ở giai đoạn khởi tạo (HS-01 ban đầu), kho mã nguồn chưa có phân hệ đăng nhập nên đã sử dụng HTTP Basic tạm thời qua bảng `users` (`DatabaseUserDetailsService`).
   - Tại nhiệm vụ NT-01 (T022B63), HTTP Basic đã bị vô hiệu hóa hoàn toàn trong `SecurityConfig`. Lớp `DatabaseUserDetailsService` và `AuthenticatedUser` đã bị xóa bỏ sạch sẽ. Toàn bộ hệ thống hiện sử dụng chung một cơ chế xác thực duy nhất là JWT Bearer Token không trạng thái (Stateless HS256).
2. **Chuẩn Hóa Mô Hình Đối Tượng Danh Tính (ONE Principal Type - Rule 14)**:
   - Xác lập duy nhất một kiểu đối tượng đại diện danh tính: `com.rikkei.jobs.identity.UserPrincipal` đặt tại gói gốc `identity`. Lớp này đóng vai trò là giao diện công khai (Public Identity API) cho các module khác tiêu thụ.
   - Controller `SkillProfileController` nhận thông tin định danh thông qua `@AuthenticationPrincipal UserPrincipal user`, hoàn toàn không phụ thuộc vào chi tiết nội bộ của module identity.
3. **Phía Giao Diện Người Dùng (Frontend Harmonization)**:
   - Xóa bỏ hoàn toàn form đăng nhập Basic độc lập (`LoginForm.tsx`) và hàm tạo header Basic (`buildBasicAuthHeader`).
   - Sử dụng `httpClient.ts` quản lý token trong bộ nhớ RAM, tự động chèn header `Authorization: Bearer <token>`.
   - Khi chưa đăng nhập, giao diện Hồ sơ năng lực hiển thị khối Call to Action trang nhã dẫn thẳng tới `/login`. Sau khi đăng nhập, ứng viên có thể truy cập hồ sơ năng lực qua liên kết nhanh từ trang chủ `/candidate` tới tuyến đường `/candidate/skills`.
4. **Quy Tắc Hồ Sơ Riêng Tư**:
   - Ứng viên chưa có bản ghi trong `candidate_profiles` được xử lý mặc định là riêng tư (`is_public = false`). Khi người khác tra cứu hồ sơ này, API trả về 404 `NOT_FOUND` nhằm bảo vệ quyền riêng tư tuyệt đối, tránh rò rỉ sự tồn tại của tài khoản.
5. **Đặc Tả Điểm Tự Khai**:
   - `self_score` lấy giá trị điểm của bằng chứng tự khai (nguồn `SELF`) gần nhất.
6. **Kế Hoạch Nâng Cấp Tương Lai**:
   - Tính năng DG-03 trong tương lai sẽ thay thế công thức tính toán đơn giản bằng công thức trọng số nguồn nâng cao, đóng gói trong `SkillScoreCalculator`.
