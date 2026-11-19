# `[DN-01]` Technical Specification & Reviewer Guide - Tài Liệu Kỹ Thuật & Hướng Dẫn Nghiệm Thu (`T0231B5`)

**Task Code / Mã nhiệm vụ**: `T0231B5`
**Feature / Phân hệ**: `` `[DN-01]` `` Doanh nghiệp: hồ sơ công ty, tài khoản HR (Company Profile & HR Accounts)
**Branch / Nhánh**: `feature/T0231B5-ho-so-cong-ty` (base: `origin/develop` / `fb4e771`)
**Working Directory / Thư mục dự án**: `rikkei-jobs`
**Stack / Công nghệ**: Java 25 LTS, Spring Boot 4.1.2, PostgreSQL 18.6, React 19, TypeScript 6.0.3, Nginx 1.30.6

---

## 1. Executive Summary / Tổng Quan Tính Năng

### 1.1. English

Rounds DN-01, DN-01-fix, DN-01-cloud, DN-01-polish, and DN-01-polish2 (`T0231B5`) implement enterprise company creation, HR account provisioning with automated onboarding emails, and self-service HR company profile and Cloudinary CDN logo management inside the Rikkei Jobs modular monolith:

- **Staff Company & HR Provisioning (`STAFF`)**: Operational staff create companies with validated 10- or 13-digit Vietnamese tax codes (`ACTIVE` default status, `created_by` derived from authenticated principal) and provision HR user accounts (`must_change_password = true`, `SecureRandom` 14-character temporary password stored strictly as BCrypt hash, Vietnamese Mailpit notification sent outside the database transaction). If email delivery fails, the persisted HR account is intentionally retained, the API returns `502 EMAIL_DELIVERY_FAILED` without logging or exposing the temporary password, retrying the same email returns `409 CONFLICT`, and account recovery uses the existing NT-01 `forgot-password` flow (`/api/v1/auth/forgot-password` -> `/api/v1/auth/reset-password`).
- **HR Self-Service Profile & Cloudinary CDN Logo (`HR`)**: Authenticated HR users view (`GET /api/v1/companies/me`) and edit (`PUT /api/v1/companies/me`) 7 mutable company fields (`name`, `industry`, `size`, `address`, `city`, `website`, `description`) with mandatory optimistic locking (`@Version` required via `@NotNull`, missing -> `400 VALIDATION_ERROR`, stale -> `409 CONFLICT`) while keeping `tax_code` and `status` immutable. Per the project owner's architectural decision in Round DN-01-cloud, company logos are stored on Cloudinary instead of PostgreSQL: `POST /api/v1/companies/me/logo` validates PNG/JPEG uploads (`CompanyLogoValidator`: magic bytes, header-first `ImageIO` check `<= 4,096` px/side and `<= 16,777,216` total pixels before `reader.read(0)`, up to `2,097,152` bytes exact with `server.tomcat.max-swallow-size: 5MB`) and uploads **outside** any `@Transactional` boundary via the `LogoStorage` port (`CloudinaryLogoStorage` -> `ExternalApiClient.postFormUrlEncoded`), then opens a short transaction (`TransactionTemplate`) only to persist `companies.logo_url`, `companies.logo_public_id`, and `updated_at`, returning `CompanyResponse` with the new CDN `logoUrl` and refreshed `version` (or `502 LOGO_STORAGE_UNAVAILABLE` with DB unchanged on storage outage). The legacy `GET /api/v1/companies/me/logo` endpoint has been removed (5 DN-01 OpenAPI operations total).
- **Frontend "Hồ sơ công ty" (`/hr/company`), Shared Enum Localization (`R1`) & Custom `Select` (`R2`)**: Built under `frontend/src/features/company/` using `shared/api/httpClient.ts` (`FormData` upload, in-memory Bearer token; unused `requestBlob`/`fetchCompanyLogoBlob`/object-URL preview code removed), rendering logos directly from the CDN URL via `<img src={logoUrl} referrerPolicy="no-referrer">` with skeleton/shimmer loading, smooth fade-in, fallback tile, inline `502` retry, drag-and-drop, reduced-motion support, `CLS = 0`, 100% `--rj-*` design tokens, full Vietnamese diacritics, zero emoji, Light/Dark mode support, unified `"Đang tải lên logo..."` loading copy, shared `frontend/src/shared/i18n/enumLabels.ts` (replacing every raw enum/`"N/A"` UI display while keeping `HR` -> `"HR"`, `MENTOR` -> `"Mentor"`, `CANDIDATE` -> `"Ứng viên"`, `STAFF` -> `"Nhân viên"`, `ADMIN` -> `"Quản trị viên"`, `ACTIVE` -> `"Đang hoạt động"`, `LOCKED` -> `"Đã khóa"`, `MUST_CHANGE_PASSWORD` -> `"Yêu cầu đổi mật khẩu"`, and unknown -> `"Không xác định"`, preserving internal logic/test IDs/APIs), custom WAI-ARIA APG `Select` combobox/listbox in `frontend/src/shared/components/Select.tsx` (`role="combobox"` trigger + Portal `role="listbox"` + `<Icon name="check" />` + `>= 44px` option height + `375px` flip-up + hidden `<select>` `useLayoutEffect` sync + keyboard `Enter`/`Space` synthetic click suppression, removing dead native `option`/`optgroup` rules while keeping global `color-scheme`, also replacing `.gap-select` via minimal diff in `GapAnalysisSection.tsx` and removing `.cp-select`/`.candidate-select`), 4 responsive breakpoints (`375/768/1024/1440 px`), and WCAG 2.2 AA accessibility.

### 1.2. Tiếng Việt

Các đợt triển khai DN-01, DN-01-fix, DN-01-cloud, DN-01-polish và DN-01-polish2 (`T0231B5`) hoàn thiện quy trình tạo doanh nghiệp, cấp phát tài khoản HR kèm email thông báo tự động và màn hình HR tự quản lý hồ sơ và logo công ty qua Cloudinary CDN theo kiến trúc Modular Monolith của Rikkei Jobs:

- **Cán bộ tạo doanh nghiệp & cấp tài khoản HR (`STAFF`)**: Cán bộ tạo mới doanh nghiệp với mã số thuế Việt Nam 10 hoặc 13 chữ số (trạng thái mặc định `ACTIVE`, `created_by` lấy từ phiên đăng nhập) và cấp phát tài khoản HR (`must_change_password = true`, mật khẩu tạm ngẫu nhiên 14 ký tự sinh bởi `SecureRandom` chỉ lưu dưới dạng băm BCrypt, gửi email tiếng Việt có dấu qua Mailpit sau khi commit giao dịch). Nếu gửi email thất bại, tài khoản HR vẫn được giữ lại trong CSDL, API trả về `502 EMAIL_DELIVERY_FAILED` mà tuyệt đối không ghi log hay lộ mật khẩu tạm thời; nếu cán bộ gọi tạo lại cùng email sẽ nhận `409 CONFLICT` và cách khôi phục hiện tại là luồng quên mật khẩu NT-01 (`/api/v1/auth/forgot-password` -> `/api/v1/auth/reset-password`).
- **HR xem/cập nhật hồ sơ & logo qua Cloudinary CDN (`HR`)**: Tài khoản HR truy cập `GET /api/v1/companies/me` và cập nhật 7 trường thông tin qua `PUT /api/v1/companies/me` (`name`, `industry`, `size`, `address`, `city`, `website`, `description`) với trường `version` bắt buộc (`@NotNull`, thiếu -> `400 VALIDATION_ERROR`, cũ -> `409 CONFLICT`), giữ nguyên tính bất biến cho `tax_code` và `status`. Theo quyết định kiến trúc của chủ sở hữu dự án ở vòng DN-01-cloud, logo công ty được lưu trên Cloudinary thay cho PostgreSQL: `POST /api/v1/companies/me/logo` kiểm tra ảnh PNG/JPEG (`CompanyLogoValidator`: magic bytes, đọc header `ImageIO` trước `reader.read(0)` tối đa `<= 4,096` px/chiều và `<= 16,777,216` pixel chống OOM, tối đa đúng `2,097,152` bytes cùng `server.tomcat.max-swallow-size: 5MB`), tải ảnh lên **bên ngoài** `@Transactional` qua port `LogoStorage` (`CloudinaryLogoStorage` -> `ExternalApiClient.postFormUrlEncoded`), rồi mới mở giao dịch ngắn (`TransactionTemplate`) để cập nhật `companies.logo_url`, `companies.logo_public_id`, `updated_at` và trả về `CompanyResponse` có `logoUrl` CDN mới cùng `version` được làm mới (hoặc trả `502 LOGO_STORAGE_UNAVAILABLE` giữ nguyên CSDL nếu dịch vụ lưu trữ gặp sự cố). Endpoint cũ `GET /api/v1/companies/me/logo` đã được gỡ bỏ (còn tổng 5 thao tác OpenAPI cho DN-01).
- **Giao diện Frontend "Hồ sơ công ty" (`/hr/company`), Chuẩn hóa Nhãn Enum (`R1`) & `Select` Tùy Biến (`R2`)**: Đặt tại `frontend/src/features/company/`, dùng `shared/api/httpClient.ts` (`FormData` với Bearer token lưu trong bộ nhớ RAM; đã gỡ bỏ `requestBlob`/`fetchCompanyLogoBlob`/object-URL không còn dùng), hiển thị ảnh trực tiếp từ URL CDN qua `<img src={logoUrl} referrerPolicy="no-referrer">` với hiệu ứng skeleton/shimmer, fade-in, ô dự phòng (`<Icon>`), báo lỗi `502` kèm nút `"Thử lại"`, vùng kéo-thả, thống nhất chữ `"Đang tải lên logo..."`, dùng module `frontend/src/shared/i18n/enumLabels.ts` (giữ `HR` -> `"HR"`, `MENTOR` -> `"Mentor"`, Việt hóa `CANDIDATE` -> `"Ứng viên"`, `STAFF` -> `"Nhân viên"`, `ADMIN` -> `"Quản trị viên"`, `ACTIVE` -> `"Đang hoạt động"`, `LOCKED` -> `"Đã khóa"`, `MUST_CHANGE_PASSWORD` -> `"Yêu cầu đổi mật khẩu"`, fallback `"Không xác định"` thay mọi enum thô và `"N/A"`), thành phần `Select` WAI-ARIA APG tùy biến (`frontend/src/shared/components/Select.tsx`: trigger `` `[role="combobox"]` `` + Portal `` `[role="listbox"]` `` + `<Icon name="check" />` + option `>= 44px` + lật lên trên ở `375px` + đồng bộ `useLayoutEffect` `<select>` ẩn + triệt tiêu synthetic click sau `Enter`/`Space`, gỡ bỏ rule `option`/`optgroup` chết trong khi giữ `color-scheme` toàn cục, thay cả `.gap-select` với diff tối thiểu tại `GapAnalysisSection.tsx` và xóa `.cp-select`/`.candidate-select`), hỗ trợ giảm chuyển động, `CLS = 0`, 100% design token `--rj-*`, tiếng Việt đầy đủ dấu, không emoji, hỗ trợ Sáng/Tối, 4 điểm ngắt `375/768/1024/1440 px` và chuẩn tiếp cận WCAG 2.2 AA.

---

## 2. Module Architecture & Boundaries / Kiến Trúc Ranh Giới Module

### 2.1. English

The DN-01 backend preserves strict module isolation under `com.rikkei.jobs`:

```text
+-----------------------------------------------------------------------------+
|                        Spring Security & Common Layer                       |
|  - SecurityConfig (/api/v1/staff/** -> STAFF, /api/v1/companies/me* -> HR)  |
|  - MustChangePasswordFilter (403 MUST_CHANGE_PASSWORD)                      |
|  - GlobalExceptionHandler (Unified ErrorResponse {code, message}, incl. 502)|
|  - ExternalApiClient.postFormUrlEncoded (no X-Service-Key, no secret logs)  |
|  - ProdEnvironmentValidator (fail-fast prod Cloudinary URL/dummy checks)    |
+-----------------------------------------------------------------------------+
           |                                                 |
           v                                                 v
+-----------------------------------+     +-----------------------------------+
|          company module           |     |          identity module          |
|  - StaffCompanyController         |     |  - IdentityPublicService          |
|  - CompanyProfileController       |====>|    (CreateHrUserCommand ->        |
|  - CompanyServiceImpl (short TX)  |     |     CreatedHrUserResult)          |
|  - CompanyLogoValidator           |     |  - MailService (Mailpit SMTP      |
|  - LogoStorage ->                 |     |    outside @Transactional)        |
|    CloudinaryLogoStorage          |     |  - Tables: users, roles           |
|  - CloudinaryProperties (masked)  |     +-----------------------------------+
|  - Table: companies               |
+-----------------------------------+
```

- **Owned Tables**: `company` exclusively owns `companies`, `jobs`, and `job_skills` (`backend/src/main/java/com/rikkei/jobs/company/package-info.java`, `V9__company_profile.sql`, `V11__jobs_and_recommendations.sql`).
- **Storage Port & Cloudinary Adapter**: `company` owns the `LogoStorage` port (`StoredLogo(publicId, secureUrl)` and `delete(publicId)`) implemented by `CloudinaryLogoStorage`. `CompanyServiceImpl` depends only on `LogoStorage` and validates/uploads **outside** `@Transactional`, using `TransactionTemplate` for a short DB-only transaction to update `companies.logo_url`, `companies.logo_public_id`, and `updated_at`.
- **Outbound HTTP & Secrets Isolation**: `ExternalApiClient.postFormUrlEncoded` sends `application/x-www-form-urlencoded` requests to absolute third-party URLs with caller timeout and max 1 quick network retry within budget, NEVER sends `X-Service-Key` to third parties, and NEVER logs request/response bodies, URL query values, or secrets. `CloudinaryProperties` masks `apiKey`/`apiSecret` in `toString()`, and `ProdEnvironmentValidator` fails fast in `prod` on dummy, blank, non-`https://`, or mock URLs.
- **Zero Cross-Module FK / JOIN**: `companies.created_by` and `users.company_id` are plain `BIGINT` scalar columns with no cross-module database `REFERENCES` and no cross-module JPQL/SQL `JOIN`.
- **Inter-Module Record Contracts**: `company` calls `IdentityPublicService.createHrAccount(CreateHrUserCommand)` inside `identity`, receiving `CreatedHrUserResult` (Java `record`). After the `REQUIRES_NEW` user-creation transaction commits, `CompanyServiceImpl` invokes `IdentityPublicService.sendHrOnboardingEmail(SendHrOnboardingEmailCommand)` (`Propagation.NOT_SUPPORTED`) so SMTP delays or failures never hold DB connections open or roll back the committed HR user.
- **Time Determinism**: All timestamps and Cloudinary upload `timestamp` parameters use injected `java.time.Clock` (`OffsetDateTime.now(clock)`, `clock.instant().getEpochSecond()`).

### 2.2. Tiếng Việt

Kiến trúc backend DN-01 tuân thủ nghiêm ngặt ranh giới module trong `com.rikkei.jobs`:

- **Sở hữu bảng độc quyền**: Module `company` sở hữu `companies` (từ `V9__company_profile.sql`), cùng `jobs` và `job_skills` (từ `V11__jobs_and_recommendations.sql` đã hợp nhất trên `develop`).
- **Port lưu trữ & Adapter Cloudinary**: `company` sở hữu interface `LogoStorage` (`StoredLogo(publicId, secureUrl)` và `delete(publicId)`), triển khai bởi `CloudinaryLogoStorage`. `CompanyServiceImpl` chỉ phụ thuộc vào `LogoStorage`, thực hiện kiểm tra ảnh và upload **bên ngoài** `@Transactional`, rồi mới dùng `TransactionTemplate` mở giao dịch ngắn cập nhật `companies.logo_url`, `companies.logo_public_id` và `updated_at`.
- **HTTP ngoài & bảo vệ bí mật**: `ExternalApiClient.postFormUrlEncoded` gửi `application/x-www-form-urlencoded` tới URL tuyệt đối với timeout truyền vào và tối đa 1 lần retry mạng nhanh nằm trong budget timeout, tuyệt đối KHÔNG gắn `X-Service-Key` khi gọi bên thứ ba và KHÔNG log body, query hay secret. `CloudinaryProperties` che thông tin nhạy cảm trong `toString()`, còn `ProdEnvironmentValidator` chặn ngay khi khởi động profile `prod` nếu thiếu biến hoặc dùng giá trị `dummy`/non-`https://`/URL mock.
- **Không khóa ngoại hay JOIN liên module**: `companies.created_by` và `users.company_id` là các cột `BIGINT` vô hướng thuần, không khai báo `REFERENCES` sang bảng của module khác và không truy vấn `JOIN` liên module.
- **Hợp đồng Java `record` liên module**: `company` gọi `IdentityPublicService.createHrAccount(CreateHrUserCommand)` thuộc module `identity` và nhận về `CreatedHrUserResult` (Java `record`). Sau khi giao dịch `REQUIRES_NEW` tạo tài khoản HR commit thành công, `CompanyServiceImpl` mới gọi `IdentityPublicService.sendHrOnboardingEmail(SendHrOnboardingEmailCommand)` (`Propagation.NOT_SUPPORTED`) để lỗi hoặc độ trễ SMTP không làm giữ kết nối CSDL và không rollback tài khoản đã tạo.
- **Tính tất định thời gian**: Toàn bộ dấu thời gian nghiệp vụ và tham số `timestamp` gửi lên Cloudinary đều sử dụng `java.time.Clock` được tiêm qua Spring (`OffsetDateTime.now(clock)`, `clock.instant().getEpochSecond()`).

---

## 3. Database Schema & Migrations (`V9`, `V10`) / Lược Đồ CSDL & Di Trú Flyway

### 3.1. Production DDL: `backend/src/main/resources/db/migration/V9__company_profile.sql`

Idempotent DDL (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guarded `pg_constraint` blocks, and `CREATE INDEX IF NOT EXISTS`):

| Table / Bảng | Column / Cột | Type & Constraints / Kiểu & Ràng buộc | Purpose / Mục đích |
|---|---|---|---|
| `companies` | `id` | `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` | Primary key / Khóa chính |
| `companies` | `name` | `VARCHAR(255) NOT NULL` | Company name / Tên doanh nghiệp |
| `companies` | `tax_code` | `VARCHAR(13) NOT NULL`, `uq_companies_tax_code`, `CHECK (tax_code ~ '^[0-9]{10}$\|^[0-9]{13}$')` | Immutable 10/13-digit tax code / Mã số thuế bất biến |
| `companies` | `industry` | `VARCHAR(100)` | Business sector / Ngành nghề |
| `companies` | `size` | `VARCHAR(20)`, `CHECK (size IS NULL OR size IN ('1-50', '51-200', '201-1000', '1000+'))` | Headcount band / Quy mô nhân sự |
| `companies` | `address`, `city`, `website`, `logo_url`, `logo_public_id`, `description` | `VARCHAR(500)`, `VARCHAR(100)`, `VARCHAR(500)`, `VARCHAR(500)`, `VARCHAR(255)`, `TEXT` | Profile metadata, Cloudinary CDN URL & `public_id` / Thông tin hồ sơ & URL/ID logo CDN |
| `companies` | `status` | `VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`, `CHECK (status IN ('ACTIVE', 'LOCKED'))` | Lifecycle status / Trạng thái |
| `companies` | `created_by` | `BIGINT` (scalar ID, no cross-module FK) | Creating `STAFF` user ID / ID cán bộ tạo |
| `companies` | `created_at`, `updated_at`, `version` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `BIGINT NOT NULL DEFAULT 0` | Audit timestamps & `@Version` optimistic lock |

Indexes in `V9`: `idx_companies_status`, `idx_companies_created_by`.

**Why `V9__company_profile.sql` Was Directly Edited (Round DN-01-cloud C2) / Lý Do Chỉnh Sửa Trực Tiếp `V9__company_profile.sql`**:

- **English**: Because Round DN-01 (`feature/T0231B5-ho-so-cong-ty`) has not yet been merged into `develop`, Flyway's post-merge immutability rule (`agent-config/rules/06-database-flyway.md`) does not yet lock `V9__company_profile.sql`. Editing `V9` directly removes the unused `company_logos` table/constraints/index cleanly and adds `companies.logo_public_id VARCHAR(255)` with full `IF NOT EXISTS` idempotency guards while leaving `V10__dev_company_seed.sql` and merged `V11..V14` untouched.
- **Tiếng Việt**: Vì nhánh DN-01 (`feature/T0231B5-ho-so-cong-ty`) chưa được merge vào `develop`, quy tắc bất biến migration sau merge (`agent-config/rules/06-database-flyway.md`) chưa áp dụng cho `V9__company_profile.sql`. Việc chỉnh sửa trực tiếp `V9` giúp loại bỏ sạch bảng/ràng buộc/index `company_logos` không còn dùng và bổ sung cột `companies.logo_public_id VARCHAR(255)` đầy đủ bảo vệ idempotent `IF NOT EXISTS`, đồng thời giữ nguyên `V10__dev_company_seed.sql` và các migration `V11..V14` đã merge.

### 3.2. Dev Seed DML: `backend/src/main/resources/db/migration-dev/V10__dev_company_seed.sql`

- Idempotently seeds `id = 1` and `id = 2` using `OVERRIDING SYSTEM VALUE`, `ON CONFLICT DO NOTHING`, and `setval('companies_id_seq', ...)`, matching `hr1@rikkeijobs.test` (`company_id = 1`) and `hr2@rikkeijobs.test` (`company_id = 2`) with `created_by = 7` (`staff1@rikkeijobs.test`).
- Strictly preserves the existing **9 development users** (`V2` + `V6` + `V8`) without adding or modifying user rows.

### 3.3. Migration Ordering & Local Database Recreation (F3) / Thứ Tự Migration & Tái Tạo CSDL Cục Bộ

- **English**: On `origin/develop` (`fb4e771`), PR `#6` and PR `#14` already merged migrations `V11`–`V14` (`V11__jobs_and_recommendations.sql`, `V12__dev_job_seed.sql`, `V13__target_positions_gap_analysis.sql`, `V14__dev_gap_analysis_seed.sql`). DN-01 occupies `V9` (production) and `V10` (dev), producing **7 production migrations** (`V1, V3, V5, V7, V9, V11, V13`) and **14 dev migrations** (`V1..V14`) when starting from a clean database. `V10` (`companies` `1..2`) coexists cleanly with `V12` (`jobs` referencing scalar `company_id` `1..5` without a physical foreign key). Because Flyway keeps `outOfOrder=false` and `V9`/`V10` are lower than `V11..V14`, a pre-existing local database already at `V14` from `develop` fails Flyway validation (`FlywayValidateException`: `Detected resolved migration not applied to database: 9` and `10`). **Developers must recreate their local database (`docker compose down -v`) after pulling this branch.**
- **Tiếng Việt**: Trên `origin/develop` (`fb4e771`), PR `#6` và PR `#14` đã hợp nhất các migration `V11`–`V14`. Nhánh DN-01 sử dụng `V9` (production) và `V10` (dev), cho tổng cộng **7 migration production** (`V1, V3, V5, V7, V9, V11, V13`) và **14 migration dev** (`V1..V14`) khi khởi tạo từ CSDL rỗng. Dữ liệu `V10` (`companies` `1..2`) đồng tồn tại bình thường với `V12` (`jobs` tham chiếu `company_id` `1..5` dạng cột vô hướng, không có khóa ngoại). Vì Flyway giữ `outOfOrder=false` và `V9`/`V10` nhỏ hơn `V11..V14`, một CSDL cục bộ đã chạy sẵn đến `V14` của `develop` sẽ gặp lỗi xác thực `FlywayValidateException` cho phiên bản `9` và `10`. **Lập trình viên bắt buộc phải tái tạo lại CSDL cục bộ (`docker compose down -v`) sau khi pull nhánh này.**

---

## 4. Development Seed Sample Data / Dữ Liệu Mẫu Môi Trường Phát Triển

*Security notice / Lưu ý bảo mật*: All rows below are fictitious development seeds from `V2`, `V6`, `V8`, and `V10`. Never reuse them in production, and never store runtime temporary passwords in documentation or repository files.

### 4.1. Seeded Companies (`V10__dev_company_seed.sql`)

| ID | Name / Tên doanh nghiệp | Tax Code / Mã số thuế | Industry & Size | Address & City / Địa chỉ & Thành phố | Website | Status | Created By | Linked HR Account |
|---:|---|---|---|---|---|---|---|---|
| `1` | `Công ty Cổ phần Công nghệ Nam Phương` | `0109283746` (10 digits) | `Công nghệ thông tin`, `51-200` | `Tầng 8, Tòa nhà Sông Đà, Đường Phạm Hùng, Quận Nam Từ Liêm`, `Hà Nội` | `https://company-a.rikkeijobs.test` | `ACTIVE` | `7` (`staff1`) | `hr1@rikkeijobs.test` |
| `2` | `Công ty Cổ phần Giải pháp Số Đông Dương` | `0314829105001` (13 digits) | `Phát triển phần mềm`, `201-1000` | `Số 120 Đường Nguyễn Thị Minh Khai, Quận 3`, `Thành phố Hồ Chí Minh` | `https://company-b.rikkeijobs.test` | `ACTIVE` | `7` (`staff1`) | `hr2@rikkeijobs.test` |

### 4.2. Seeded Accounts Used in Verification (6 Representative Accounts of 9 Total Dev Seed Users in `V2`, `V6`, `V8`)

| Email | Role | `company_id` | `must_change_password` | Dev Login Method / Cách đăng nhập dev |
|---|---|---:|:---:|---|
| `staff1@rikkeijobs.test` | `STAFF` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-st-001`) |
| `hr1@rikkeijobs.test` | `HR` | `1` | `true` | Enterprise login (`Test@123`) — enforces `/change-password` on first login |
| `hr2@rikkeijobs.test` | `HR` | `2` | `false` | Enterprise login (`Test@123`) — active HR for Company 2 |
| `candidate1@rikkeijobs.test` | `CANDIDATE` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-sv-001`) — RBAC negative control (`403`) & Candidate UI checks |
| `mentor1@rikkeijobs.test` | `MENTOR` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-mt-001`) — RBAC negative control (`403`) |
| `admin1@rikkeijobs.test` | `ADMIN` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-ad-001`) — RBAC negative control (`403`) |

*(Total dev seed users in PostgreSQL `users` table: `9`, including `candidate2`, `candidate3`, and `mentor2`.)*

---

## 5. How to Run & OpenAPI / Hướng Dẫn Chạy & OpenAPI

### 5.1. Full Docker Compose Stack / Chạy Toàn Bộ Hệ Thống Bằng Docker

```powershell
# 1. Prepare local .env from .env.example if not already present (never commit .env)
Copy-Item .env.example .env -ErrorAction SilentlyContinue

# 2. Reset local DB volume if previously on develop V14, then build and start all 5 services
docker compose down -v
docker compose up -d --build --wait

# 3. Tear down stack and clean volumes after verification
docker compose down -v
```

Service URLs / Cổng dịch vụ:

- Frontend (Nginx): `http://127.0.0.1:3000` (HR screen: `/hr/company`; `frontend/nginx.conf` never proxies `/mock` or `/cloudinary` and adds no `Content-Security-Policy` blocking CDN `<img>` loads)
- Backend API: `http://127.0.0.1:8080`
- Mailpit UI & REST API: `http://127.0.0.1:8025` & `http://127.0.0.1:8025/api/v1/messages`
- Mock LMS & Cloudinary Mock: `http://127.0.0.1:9000` (`PUBLIC_BASE_URL=http://127.0.0.1:9000`)
- PostgreSQL (dev host port): `127.0.0.1:5433`

### 5.2. Standalone Backend, Frontend, Mock & Quality Gates / Chạy Độc Lập & Kiểm Định

```powershell
# Backend (JDK 25 + Testcontainers Docker engine running)
# Set JAVA_HOME to your JDK 25 installation if not already configured
Push-Location backend
.\mvnw.cmd clean test spotless:check spotbugs:check
Pop-Location

# Frontend (Lint, Typecheck, Vitest, Production Build)
npm run lint --prefix frontend
npm run typecheck --prefix frontend
npm test --prefix frontend -- --run
npm run build --prefix frontend

# External & Cloudinary Mock Integration Suite
node mock/test-runner.js

# Opaque-box 4-Tier E2E (requires live Docker stack)
node e2e/run-all.mjs

# Synchronized 26 Quality Gates (PowerShell and Git Bash)
.\check.ps1

# Isolated Docker CI Harness (6 jobs, verify 3 host scenarios)
powershell -ExecutionPolicy Bypass -File scripts/run-ci-in-docker.ps1
```

```bash
# Git Bash (do not set path-conversion overrides in parent shell)
./check.sh
```

### 5.3. OpenAPI Specification / Tài Liệu OpenAPI

- **Dev Profile (`SPRING_PROFILES_ACTIVE=dev`)**: Configured in `backend/src/main/resources/application.yml` (`springdoc.api-docs.path: /api-docs`, `springdoc.swagger-ui.path: /swagger-ui.html`). Live JSON spec is served at `http://127.0.0.1:8080/api-docs` (`http://127.0.0.1:8080/v3/api-docs` returns `404 NOT_FOUND`) and interactive UI at `http://127.0.0.1:8080/swagger-ui.html` with `bearerAuth`, `UpdateCompanyRequest` marking `required: ["name", "version"]`, multipart schema (`file` binary), and full `ErrorResponse` codes (`400/401/403/404/409/413/502`) across all 5 DN-01 operations.
- **Production Profile (`SPRING_PROFILES_ACTIVE=prod`)**: `backend/src/main/resources/application-prod.yml` sets `springdoc.swagger-ui.enabled: false` and `springdoc.api-docs.enabled: false`, returning `404` for both endpoints.

### 5.4. Cloudinary Integration, Env Vars, Mock Extension & Real-Account Switch (`C1`, `C4`, `C5`, `C8`)

- **Official Cloudinary Signature Specification (Checked `2026-11-18`)**:
  - Documentation URL: `https://cloudinary.com/documentation/upload_images#generating_authentication_signatures`
  - Algorithm: SHA-1 (`CloudinaryLogoStorage.signParameters`). Exclude `file`, `cloud_name`, `resource_type`, `api_key`, and `signature`; sort remaining parameters alphabetically by key (`invalidate`, `overwrite`, `public_id`, `timestamp`, `unique_filename`); join `key=value` with `&`; append `api_secret` directly without separator; hash with SHA-1 lowercase hex.
  - Documented Example Vectors Proven in `CloudinaryLogoStorageTest`:
    1. Official docs vector (`eager=w_400,h_300,c_pad|w_260,h_200,c_crop`, `public_id=sample_image`, `timestamp=1315060510`, secret `abcd`) -> `bfd09f95f331f558cbd1320e67aa8d488770583e`.
    2. Minimal vector (`timestamp=1315060510`, secret `abcd`) -> `a21ad0f63beb4de2e5575204b79ab90bffb02c10`.
- **Cloudinary Configuration Prefix & Environment Variable Names (`.env.example` Defaults Only — Zero Real Secrets)**:
  - Verified Spring configuration prefix: `cloudinary` (`CloudinaryProperties.java:8`, `application.yml:59-65`).

| Variable Name | `.env.example` Dummy Default | Purpose / Mục đích |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | `dev-cloud` | Target Cloudinary cloud name / Tên cloud Cloudinary |
| `CLOUDINARY_API_KEY` | `dev-key` | Cloudinary upload API key (never logged) / API key (không ghi log) |
| `CLOUDINARY_API_SECRET` | `dev-secret` | Cloudinary SHA-1 signing secret (never logged) / Secret ký SHA-1 |
| `CLOUDINARY_API_BASE_URL` | `http://mock:9000/cloudinary/v1_1` | Uncommented in `.env.example:76` (CI/mock default); commenting it out falls back to the mock URL (`.env.example:69`), and local `.env` keeps it commented for mock tests |
| `CLOUDINARY_DELIVERY_BASE_URL` | `http://127.0.0.1:9000/cloudinary` | Required `secure_url` prefix enforced before DB persistence |
| `CLOUDINARY_TIMEOUT_SECONDS` | `5` | Outbound HTTP timeout budget (with max 1 quick network retry) |
| `MOCK_PUBLIC_BASE_URL` | `http://127.0.0.1:9000` | Public base URL embedded in mock `secure_url` responses (`PUBLIC_BASE_URL`) |

- **Trivial Switch to Real Cloudinary Account (`C8`) / Hướng Dẫn Chuyển Sang Tài Khoản Cloudinary Thật**:
  - **English**: Keep `CLOUDINARY_API_BASE_URL` commented out in `.env` for all local/automated mock testing (note: `.env.example:76` leaves `CLOUDINARY_API_BASE_URL=http://mock:9000/cloudinary/v1_1` uncommented as the template/CI default, and `.env.example:69` documents that commenting it out falls back to the local mock). To smoke-test against a real Cloudinary account in git-ignored `.env`:
    1. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env` to your real Cloudinary credentials.
    2. Set `CLOUDINARY_API_BASE_URL=https://api.cloudinary.com/v1_1`.
    3. Set `CLOUDINARY_DELIVERY_BASE_URL=https://res.cloudinary.com/<your-cloud-name>/image/upload` (must match the `secure_url` prefix returned by Cloudinary).
    4. Restart the `backend` container/process (`docker compose up -d backend`).
  - **Tiếng Việt**: Trong mọi lượt kiểm thử cục bộ/tự động dùng mock, giữ `CLOUDINARY_API_BASE_URL` ở trạng thái comment trong `.env` (lưu ý `.env.example:76` để `CLOUDINARY_API_BASE_URL=http://mock:9000/cloudinary/v1_1` không comment làm mẫu cho CI, còn `.env.example:69` hướng dẫn bỏ/comment dòng này để tự động fallback về mock). Khi cần smoke-test với tài khoản Cloudinary thật trong `.env` (git-ignored):
    1. Điền thông tin thật cho `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET` trong `.env`.
    2. Đặt `CLOUDINARY_API_BASE_URL=https://api.cloudinary.com/v1_1`.
    3. Đặt `CLOUDINARY_DELIVERY_BASE_URL=https://res.cloudinary.com/<your-cloud-name>/image/upload` (khớp đúng tiền tố `secure_url` Cloudinary trả về).
    4. Khởi động lại container/tiến trình `backend`.
- **Local Mock Cloudinary Extension (`C5`)**:
  - `mock/server.js` adds an isolated `/cloudinary/*` router exempt from `X-Service-Key` and `/mock/requests` logging (`POST /cloudinary/v1_1/:cloud/image/upload` with `5mb` `urlencoded` parser and SHA-1 verification returning `401` on mismatch, `GET /cloudinary/:cloud/image/upload/*` returning exact raw bytes + `Content-Type`, optional `POST /cloudinary/v1_1/:cloud/image/destroy`), plus testing tool #5 (`POST /mock/cloudinary/fail-next`, reset via `POST /mock/reset`).
- **Minimal `docker-compose.yml` (`C4`) & 3-Scenario Docker CI Harness (`scripts/run-ci-in-docker.ps1`)**:
  - `docker-compose.yml` adds minimal `${VAR:-dummy}` pass-through variables to `mock` and `backend` without adding new named volumes or changing service topology.
  - Scenario 1 (dev stack running on host): detected port conflicts on `127.0.0.1:{5433,8080,3000,9000,8025,1025}`, failed fast with `Exit Code: 1`, and left all 5 running dev containers untouched.
  - Scenario 2 (dev stack stopped via `docker compose stop`): printed `` `[ISOLATION NOTICE]` ``, generated ephemeral `docker-compose.override.yml` under `rikkei-ci-d18ffdf1`, passed 6/6 CI jobs (`mock-test` `1s`, `frontend-check` `61s`, `backend-check` `339s`, `docker-compose-check` `99s`, `clean-code-and-linters` `36s`, `smoke-test` `58s` — `OVERALL CI STATUS: PASS`, `Total Duration: 594s`, `Exit Code: 0`), and left `rikkei_postgres_data`, `rikkei-network`, and stopped `rikkei-*` containers intact.
  - Scenario 3 (clean host via `docker compose down -v`): printed no `` `[ISOLATION NOTICE]` ``, passed 6/6 CI jobs under `rikkei-ci-967e7351` (`mock-test` `1s`, `frontend-check` `62s`, `backend-check` `335s`, `docker-compose-check` `4s`, `clean-code-and-linters` `38s`, `smoke-test` `61s` — `OVERALL CI STATUS: PASS`, `Total Duration: 502s`, `Exit Code: 0`), and left 0 `rikkei` / `rikkei-ci-*` containers, volumes, or networks afterward.

---

## 6. API Reference, RBAC Matrix & Payloads / Tham Chiếu API, Phân Quyền & Dữ Liệu

### 6.1. Endpoint Summary (5 DN-01 Operations)

| Method & Path | Role | Success | Error Codes (`ErrorResponse {code, message}`) | Notes / Ghi chú |
|---|---|---|---|---|
| `POST /api/v1/staff/companies` | `STAFF` | `201 Created` (`CompanyResponse`) | `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 CONFLICT` | Validates `name`, `taxCode` (10 or 13 digits), `size`, `http`/`https` `website`, lengths; defaults `status=ACTIVE`; concurrent duplicate `taxCode` -> `409`. |
| `POST /api/v1/staff/companies/{id}/hr-accounts` | `STAFF` | `201 Created` (`HrAccountResponse`) | `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `502 EMAIL_DELIVERY_FAILED` | Rejects CR/LF; trimmed case-insensitive duplicate email across all roles -> `409`; persists HR user with `mustChangePassword=true` and sends Mailpit VI email after commit; mail error retains HR user and returns `502` (retry -> `409`, recovery via NT-01 `forgot-password`). |
| `GET /api/v1/companies/me` | `HR` | `200 OK` (`CompanyResponse`) | `401 UNAUTHORIZED`, `403 FORBIDDEN`, `403 MUST_CHANGE_PASSWORD`, `404 NOT_FOUND` | Reads strictly `principal.getCompanyId()` from JWT. |
| `PUT /api/v1/companies/me` | `HR` | `200 OK` (`CompanyResponse`) | `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `403 MUST_CHANGE_PASSWORD`, `404 NOT_FOUND`, `409 CONFLICT` | Requires non-null `version` (`@NotNull` -> `400 VALIDATION_ERROR` if missing; stale `@Version` -> `409 CONFLICT`); updates only 7 mutable fields (`name`, `industry`, `size`, `address`, `city`, `website`, `description`); `taxCode` and `status` immutable (unknown fields ignored); cross-tenant `PUT /api/v1/companies/{id}` -> `404`. |
| `POST /api/v1/companies/me/logo` | `HR` | `200 OK` (`CompanyResponse`) | `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `403 MUST_CHANGE_PASSWORD`, `404 NOT_FOUND`, `413 PAYLOAD_TOO_LARGE`, `502 LOGO_STORAGE_UNAVAILABLE` | Multipart part `file`; real PNG/JPEG magic bytes + header-first `ImageIO` check (`1..4,096` px/side, `<= 16,777,216` total pixels) before `reader.read(0)`; rejects double extensions (`a.php.jpg`, `evil.svg.png`), traversal, SVG/GIF/WebP/PDF, empty; exact `<= 2,097,152` bytes (`2,097,153` -> `413` on both `:3000` & `:8080`, `max-swallow-size: 5MB`, `20 MB` rejected/closed); uploads outside `@Transactional` to Cloudinary (`max 1` network retry) and updates `companies.logo_url` + `logo_public_id` + `version`; storage failure returns `502` (`"Không thể lưu trữ logo doanh nghiệp lúc này, vui lòng thử lại sau"`) with DB unchanged and zero provider/URL/key leakage. |

*(Removed endpoint / Endpoint đã gỡ bỏ: `GET /api/v1/companies/me/logo` was removed in Round DN-01-cloud; active HR calls receive `405 METHOD_NOT_ALLOWED`, non-HR receives `403 FORBIDDEN`, unauthenticated receives `401 UNAUTHORIZED`.)*

**Public CDN URL Privacy Note (`C3`) / Lưu Ý Quyền Riêng Tư URL CDN Công Khai**:

- **English**: Uploaded logos are stored on Cloudinary CDN and served directly to browsers via `companies.logoUrl` (`<img src={logoUrl} referrerPolicy="no-referrer">`) without an authentication cookie or Bearer token. This is intentional and safe because enterprise logos are public brand assets (also visible to candidates alongside job listings), never candidate PII or private documents.
- **Tiếng Việt**: Logo doanh nghiệp được lưu trên Cloudinary CDN và hiển thị trực tiếp trên trình duyệt qua `companies.logoUrl` (`<img src={logoUrl} referrerPolicy="no-referrer">`) không cần cookie hay Bearer token xác thực. Điều này phù hợp vì logo doanh nghiệp là tài sản thương hiệu công khai (hiển thị kèm tin tuyển dụng cho ứng viên), không phải dữ liệu cá nhân PII hay tài liệu nội bộ.

### 6.2. 6-Caller RBAC Matrix / Ma Trận Phân Quyền 6 Đối Tượng

| Endpoint | Anonymous | `STAFF` | `HR` (`mustChange=false`) | `HR` (`mustChange=true`) | `CANDIDATE` | `MENTOR` | `ADMIN` |
|---|---|---|---|---|---|---|---|
| `POST /api/v1/staff/companies` | `401` | `201` | `403` | `403` | `403` | `403` | `403` |
| `POST /api/v1/staff/companies/{id}/hr-accounts` | `401` | `201` | `403` | `403` | `403` | `403` | `403` |
| `GET /api/v1/companies/me` | `401` | `403` | `200` | `403 MUST_CHANGE_PASSWORD` | `403` | `403` | `403` |
| `PUT /api/v1/companies/me` | `401` | `403` | `200` | `403 MUST_CHANGE_PASSWORD` | `403` | `403` | `403` |
| `POST /api/v1/companies/me/logo` | `401` | `403` | `200` | `403 MUST_CHANGE_PASSWORD` | `403` | `403` | `403` |

### 6.3. Example Payloads / Ví Dụ Request & Response

#### 1. `POST /api/v1/staff/companies`

Request:

```json
{
  "name": "Công ty Cổ phần Công nghệ Ánh Dương",
  "taxCode": "0109283799",
  "industry": "Công nghệ thông tin",
  "size": "51-200",
  "address": "Tầng 10, Tòa nhà Cầu Giấy",
  "city": "Hà Nội",
  "website": "https://anhduong.rikkeijobs.test",
  "description": "Đơn vị phát triển phần mềm doanh nghiệp."
}
```

Response (`201 Created`):

```json
{
  "id": 3,
  "name": "Công ty Cổ phần Công nghệ Ánh Dương",
  "taxCode": "0109283799",
  "industry": "Công nghệ thông tin",
  "size": "51-200",
  "address": "Tầng 10, Tòa nhà Cầu Giấy",
  "city": "Hà Nội",
  "website": "https://anhduong.rikkeijobs.test",
  "logoUrl": null,
  "description": "Đơn vị phát triển phần mềm doanh nghiệp.",
  "status": "ACTIVE",
  "createdBy": 7,
  "createdAt": "2026-11-17T09:00:00Z",
  "updatedAt": "2026-11-17T09:00:00Z",
  "version": 0
}
```

#### 2. `POST /api/v1/staff/companies/{id}/hr-accounts`

Request:

```json
{
  "email": "hr.contact@anhduong.rikkeijobs.test",
  "fullName": "Nguyễn Minh Châu"
}
```

Response (`201 Created` — password is never returned):

```json
{
  "userId": 10,
  "companyId": 3,
  "email": "hr.contact@anhduong.rikkeijobs.test",
  "fullName": "Nguyễn Minh Châu",
  "role": "HR",
  "status": "ACTIVE",
  "mustChangePassword": true,
  "createdAt": "2026-11-17T09:01:00Z"
}
```

#### 3. `PUT /api/v1/companies/me`

Request (note: `"version"` is **required** (`@NotNull`); `taxCode` and `status` are absent from `UpdateCompanyRequest` and unknown keys are ignored):

```json
{
  "name": "Công ty Cổ phần Giải pháp Số Đông Dương",
  "industry": "Phát triển phần mềm",
  "size": "201-1000",
  "address": "Số 120 Đường Nguyễn Thị Minh Khai, Quận 3",
  "city": "Thành phố Hồ Chí Minh",
  "website": "https://company-b.rikkeijobs.test",
  "description": "Đơn vị tư vấn chuyển đổi số, xây dựng ứng dụng web, di động và đào tạo kỹ sư phần mềm trẻ trên toàn quốc.",
  "version": 0
}
```

---

## 7. Reviewer Acceptance Scenarios / Kịch Bản Nghiệm Thu Cho Reviewer

| # | Scenario / Kịch bản | Steps / Cách thực hiện | Expected Result / Kết quả kỳ vọng |
|---:|---|---|---|
| 1 | `PHASE0_ACK.md` pre-edit record | Inspect `docs/dn01/PHASE0_ACK.md` sections `Round DN-01`, `Round DN-01-fix`, `Round DN-01-cloud`, `Round DN-01-polish`, and `Round DN-01-polish2`. | Lists all 16 rules, 28 skills, F1–F9, C1–C10, U1–U3/P1–P5, and R0–R3/V1–V5 plans, plus Team Lead F5.1 Option A decision (`4_096` / `16_777_216`) and user `HR`/`Mentor` role-label decision. |
| 2 | Staff creates company & HR account -> Mailpit -> forced password change | Log in as `staff1` via Mock LMS (`lms-st-001`), call `POST /api/v1/staff/companies`, then `POST /api/v1/staff/companies/{id}/hr-accounts`, inspect `http://127.0.0.1:8025` for email `"Thông tin tài khoản HR - Rikkei Jobs"`, log in as the new HR user at `/login?tab=enterprise`. | Company returns `201` (`ACTIVE`); HR response omits password; Mailpit delivers full-diacritic VI email without emoji; HR login returns `mustChangePassword: true` and redirects to `/change-password`. |
| 3 | Mail delivery failure preserves HR account & NT-01 recovery | Stop Mailpit (or simulate `MailSendException` in `CompanyControllerIntegrationTest`), call `POST .../hr-accounts`, retry same email, then restart Mailpit and execute `/api/v1/auth/forgot-password` -> `/api/v1/auth/reset-password`. | First call returns `502 EMAIL_DELIVERY_FAILED` without logging plaintext password; retry returns `409 CONFLICT`; NT-01 forgot-password recovers account (`200`), allowing login (`mustChangePassword: false`) and `GET /api/v1/companies/me` (`200`). |
| 4 | Duplicate HR email across any role & CR/LF rejection | Submit `HR1@RIKKEIJOBS.TEST` or `"  candidate1@rikkeijobs.test  "` to `POST .../hr-accounts`, and submit `email`/`fullName` containing `\r` or `\n`. | Duplicate email returns `409 CONFLICT` across all roles; CR/LF returns `400 VALIDATION_ERROR`. |
| 5 | Tax code format & concurrent duplicate `taxCode` | Call `POST /api/v1/staff/companies` with `12345` (invalid) or two parallel requests with identical 10-digit `taxCode`. | Invalid tax code returns `400 VALIDATION_ERROR`; concurrent calls return `[201, 409 CONFLICT]`. |
| 6 | HR self-service edit, `tax_code`/`status` immutability & required `@Version` (`400`/`409`) | As `hr2`, `GET /api/v1/companies/me`; send `PUT /api/v1/companies/me` without `version`, then with `"taxCode":"9999999999","status":"LOCKED"` and valid `version`, then with stale `version`. | Missing `version` -> `400 VALIDATION_ERROR`; `taxCode` and `status` remain unchanged (`0314829105001`, `ACTIVE`); stale `version` -> `409 CONFLICT`. |
| 7 | Cross-tenant IDOR `PUT /api/v1/companies/{idOfCompanyB}` | As `hr1` (Company 1), send `PUT /api/v1/companies/2`. | Returns `404 NOT_FOUND` with unified `{"code":"NOT_FOUND","message":"..."}`. |
| 8 | 6-caller x 5-operation RBAC matrix (plus merged F2 routes) | Call all 5 DN-01 endpoints and merged AI-01/DT-01 endpoints as Anonymous, `STAFF`, `HR`, `HR(mustChange=true)`, `CANDIDATE`, `MENTOR`, `ADMIN`; verify `GET /api/v1/companies/me/logo` is removed. | Matches Section 6.2 matrix (`401`, `403`, `403 MUST_CHANGE_PASSWORD`, `200`/`201`), `GET /api/v1/companies/me/logo` returns `405` for active HR, and `GET /api/v1/me/job-recommendations` is restricted to `CANDIDATE`. |
| 9 | Logo boundary (`2,097,152` vs `2,097,153` vs `20MB`), header-first `4,096x4,096`, CDN delivery & `502` retry | Upload `4,096x4,096` PNG, `4,097x1`/`1x4,097`/`100,000x100,000` bomb, `2,097,152`-byte PNG, `2,097,153`-byte file, and `20MB` payload on `:3000` and `:8080`, plus SVG/renamed/`evil.svg.png`/`../a.png`; fetch returned `logoUrl` from mock CDN; trigger `POST /mock/cloudinary/fail-next` then retry. | `4,096x4,096` & `2,097,152` -> `200` with refreshed `version` and `logoUrl` (`http://127.0.0.1:9000/cloudinary/...`) serving byte-exact `image/png` or `image/jpeg`; `4,097x1`/`1x4,097`/`100,000x100,000` -> `400` without OOM; `2,097,153` -> `413 PAYLOAD_TOO_LARGE` JSON on `:3000` & `:8080`; `20MB` -> `413` rejected/closed; forced outage returns `502 LOGO_STORAGE_UNAVAILABLE` with DB unchanged, then next upload succeeds (`200`). |
| 10 | Flyway `V9`–`V14` clean, coexistence & out-of-order proof | Run `CompanyMigrationIntegrationTest`, `DefaultProfileIntegrationTest`, `ProfileSeparationIntegrationTest`, and `SecurityHardeningIntegrationTest`. | Clean empty DB applies `7` prod (`V1,V3,V5,V7,V9,V11,V13`) / `14` dev (`V1..V14`); `companies.logo_public_id` exists and `company_logos` is absent; `V10` & `V12` coexist; DB at `V14` receiving `V9`/`V10` triggers `FlywayValidateException` (`outOfOrder=false`); dev user count remains `9`. |
| 11 | OpenAPI dev enabled vs prod disabled | Query `GET http://127.0.0.1:8080/api-docs` (`404` on `/v3/api-docs`) on dev stack; run `CompanyOpenApiProfileIntegrationTest`. | Dev returns `200` OpenAPI `3.1.0` JSON with all 5 DN-01 paths, `bearerAuth`, and `UpdateCompanyRequest.required = ["name", "version"]`; `prod` disables `/api-docs` and `/swagger-ui.html`. |
| 12 | Frontend `/hr/company`, `enumLabels.ts` (R1), custom `Select` (R2) & `/browser` verification | Log in across `/hr`, `/candidate`, `/staff`, `/mentor`, `/admin`, `/hr/company`, and `/candidate/gap-analysis` (Light/Dark, `1440`/`375`, 6 interaction states, Tab order, custom `Select` keyboard & open DOM listbox) and inspect `docs/dn01/BROWSER_OBSERVATIONS.md`. | Passes Vitest (`242/242` across `28` files incl. `enumLabels` & `Select` Finding A/B regression tests), Backend (`526/526`), Mock (`node mock/test-runner.js`), E2E (`24/304/1,702`), Check 9 (`0` raw colors), contrast (`88/88`), `42` curated screenshots (`01-`..`35-`, `37-`..`43-`; `36-` absent) in `pr-screenshots/ORDER.txt`, locked Rule 09 evidence (`9 / 12` pre-D1..D7 -> **`11 / 12`**, `C5 = 1/2` capped honestly because `webview_browser` blocks `page.emulateMedia` and `page.evaluate`), `/candidate/skills` `.sp-btn` single-line `44px` (`25-` refreshed at `a0e8a7ce`), `GapAnalysisSection.tsx` minimal `Select` diff & `RoleHomeLayout` toggle disclosed, and `375px` mobile overflow checked against `requestedWidth = 375` (`409px` `/` `PR #6` & `411px` `/candidate/skills` `HS-01`) documented honestly. |

---

## 8. Known Limits & Follow-ups / Giới Hạn & Công Việc Tiếp Theo

1. **Security Recommendation — Rotate Cloudinary API Secret After Delivery / Khuyến Nghị Bảo Mật Xoay Vòng API Secret Sau Bàn Giao (`C9`)**:
   - *English*: Because the real Cloudinary API secret used by the Team Lead was shared in a chat channel during project setup, **rotate the Cloudinary API secret immediately in the Cloudinary console after project delivery and update `.env` / production secret stores**.
   - *Tiếng Việt*: Vì Cloudinary API secret thật do Team Lead sử dụng từng được chia sẻ qua kênh chat trong quá trình thiết lập dự án, **hãy xoay vòng (rotate) Cloudinary API secret ngay trên Cloudinary Console sau khi bàn giao dự án và cập nhật lại `.env` / kho bí mật production**.
2. **Public CDN URL Privacy Note (`C3`) / Lưu Ý Quyền Riêng Tư URL CDN Công Khai**:
   - *English*: Uploaded company logos are served directly via public Cloudinary CDN URLs (`<img src={logoUrl} referrerPolicy="no-referrer">`) without cookie or Bearer auth. This is intentional because company logos are public brand assets; do not reuse this public-URL bucket pattern for private candidate CVs or verification documents.
   - *Tiếng Việt*: Logo công ty được phục vụ trực tiếp qua URL Cloudinary CDN công khai (`<img src={logoUrl} referrerPolicy="no-referrer">`) không yêu cầu cookie hay Bearer token. Điều này hợp lệ vì logo là tài sản thương hiệu công khai; tuyệt đối không áp dụng mô hình URL công khai này cho CV ứng viên hay tài liệu xác minh nội bộ.
3. **`LOCKED` Company Policy / Chính sách doanh nghiệp bị khóa (`LOCKED`)**:
   - *English*: `V9` defines `status IN ('ACTIVE', 'LOCKED')`, and no DN-01 endpoint transitions `status` to `LOCKED`. Login, editing, and public visibility behavior when a company is `LOCKED` are intentionally deferred to a follow-up task rather than inventing undocumented rules.
   - *Tiếng Việt*: CSDL `V9` định nghĩa `status IN ('ACTIVE', 'LOCKED')` nhưng DN-01 không có endpoint chuyển trạng thái sang `LOCKED`. Chính sách đăng nhập, chỉnh sửa và hiển thị khi công ty ở trạng thái `LOCKED` được chuyển cho nhiệm vụ kế tiếp để không tự suy diễn nghiệp vụ.
4. **Task `DN-05` (Staff Management UI & Complete Company Profile)**:
   - *English*: The frontend UI for `STAFF` to create companies and provision HR accounts, as well as the full multi-section company profile experience, belongs to `DN-05`.
   - *Tiếng Việt*: Giao diện frontend cho `STAFF` tạo doanh nghiệp, cấp tài khoản HR và phiên bản hoàn chỉnh của hồ sơ doanh nghiệp nằm ngoài phạm vi DN-01 và thuộc nhiệm vụ `DN-05`.
5. **Task `NT-02` (Global Role Guards)**:
   - *English*: DN-01 adds only the minimal extensible `SecurityConfig` rules for `/api/v1/staff/**` (`STAFF`) and `/api/v1/companies/me` (`HR`). System-wide role guards for remaining endpoints belong to `NT-02`.
   - *Tiếng Việt*: DN-01 chỉ bổ sung các rule tối thiểu cho `/api/v1/staff/**` (`STAFF`) và `/api/v1/companies/me` (`HR`); bộ phân quyền tổng quát toàn hệ thống thuộc về nhiệm vụ `NT-02`.
6. **Simultaneous Form + Logo Error Alert Framing**:
   - *English*: `CompanyProfilePage` renders separate status banners for form errors and logo upload errors; consolidating concurrent error banners can be refined in `DN-05` if desired.
   - *Tiếng Việt*: `CompanyProfilePage` hiển thị hai vùng thông báo riêng cho lỗi form hồ sơ và lỗi tải logo; có thể gộp điều phối thông báo nếu cần ở `DN-05`.
7. **Mail Delivery Failure Recovery & Follow-up (`re-issue / resend HR onboarding mail (DN-05)`)**:
   - *English*: When `POST /api/v1/staff/companies/{id}/hr-accounts` returns `502 EMAIL_DELIVERY_FAILED`, the HR user remains committed in `users` (`409 CONFLICT` on repeat creation) and no DN-01 endpoint re-issues or re-sends the temporary onboarding password. Live verification confirms the existing NT-01 `forgot-password` flow (`/api/v1/auth/forgot-password` -> `/api/v1/auth/reset-password`) successfully recovers the account once SMTP recovers. Adding a dedicated `re-issue / resend HR onboarding mail (DN-05)` staff endpoint is tracked as a follow-up.
   - *Tiếng Việt*: Khi `POST /api/v1/staff/companies/{id}/hr-accounts` trả về `502 EMAIL_DELIVERY_FAILED`, tài khoản HR vẫn được giữ trong bảng `users` (tạo lại cùng email bị chặn `409 CONFLICT`) và DN-01 chưa có API cấp lại hay gửi lại email mật khẩu tạm. Kiểm chứng thực tế trên stack xác nhận luồng quên mật khẩu sẵn có của NT-01 (`/api/v1/auth/forgot-password` -> `/api/v1/auth/reset-password`) khôi phục được tài khoản sau khi dịch vụ mail hoạt động lại. Đề xuất bổ sung follow-up: `re-issue / resend HR onboarding mail (DN-05)`.
8. **`RoleHomeLayout` Light/Dark Toggle, Minimal `GapAnalysisSection.tsx` Diff & Pre-Existing Candidate `/` `375px` Layout Finding**:
   - *English*: The Light/Dark theme switch added to `RoleHomeLayout.tsx` affects all roles (beyond the DN-01 acceptance checklist) to enable Light/Dark verification; unit tests (`accessibility_wcag.test.tsx`) prove it toggles cleanly without persisting to `localStorage`, `sessionStorage`, or `document.cookie`. Round `DN-01-polish` also applies a minimal diff in `GapAnalysisSection.tsx` / `gapAnalysis.css` (switching `.gap-select` to shared `Select`) and removes dead `.candidate-select` CSS in `jobRecommendations.css`. Live `/browser` checks (`8cebc05c`, `5dbb289a`) confirm zero regressions on `/candidate`, `/candidate/skills`, `/candidate/evaluations`, `/candidate/jobs/1`, and `/candidate/gap-analysis`, while documenting the pre-existing PR `#6` mobile `375px` horizontal overflow on `/` (`jobRecommendations.css:124-128` `.jobs-grid` `minmax(360px, 1fr)`).
   - *Tiếng Việt*: Nút chuyển giao diện Sáng/Tối trong `RoleHomeLayout.tsx` áp dụng chung cho mọi vai trò (nằm ngoài danh sách nghiệm thu DN-01, được thêm để phục vụ kiểm thử Sáng/Tối) và đã có unit test (`accessibility_wcag.test.tsx`) chứng minh không lưu vào `localStorage`, `sessionStorage` hay `cookie`. Vòng `DN-01-polish` cũng chỉ thay tối thiểu `GapAnalysisSection.tsx` / `gapAnalysis.css` (chuyển `.gap-select` sang `Select` dùng chung) và xóa CSS chết `.candidate-select` trong `jobRecommendations.css`. Kiểm tra `/browser` (`8cebc05c`, `5dbb289a`) xác nhận không gây hồi quy trên `/candidate`, `/candidate/skills`, `/candidate/evaluations`, `/candidate/jobs/1`, `/candidate/gap-analysis`, đồng thời ghi nhận trung thực lỗi tràn ngang có sẵn ở `/` `375px` từ PR `#6` (`.jobs-grid` `minmax(360px, 1fr)`).
9. **Surefire 30-Second Fork-Kill Warning Investigation (`SecurityHardeningIntegrationTest`)**:
   - *English*: Maven builds pass `526 / 526` tests (`54` XML test classes) while printing `[ERROR] Surefire is going to kill self fork JVM. The exit has elapsed 30 seconds after System.exit(0).` after `SecurityHardeningIntegrationTest`. Code and report evidence proves this is pre-existing context-cache shutdown pressure, not a DN-01/DN-01-cloud leak: `origin/develop` (`fb4e771`) already contained `33` `@SpringBootTest` / `34` `@Container` annotations (vs `40` `@SpringBootTest` / `41` `@Container` in the working tree) against Spring TestContext's `DefaultContextCache` (`maxSize = 32`); `SecurityHardeningIntegrationTest` runs `25 / 25` isolated in `01:07 min` with `0` warnings (where `git diff fb4e771` adds only Cloudinary test properties and `6 -> 7` migration assertions); and full-run dump `backend/target/surefire-reports/2026-11-18T16-07-00_811-jvmRun1.dump` (plus `.dumpstream`) shows `main` waiting in `ApplicationShutdownHooks` on `"SpringApplicationShutdownHook"` -> `HikariPool.shutdown` -> `ThreadPoolExecutor.awaitTermination` across cached Spring contexts (`21` active `HikariPool-*` / `12` `container-*` / `27` `HttpClient-*` pools in the dump). Not caused by an unclosed DN-01/DN-01-cloud executor or HTTP server.
   - *Tiếng Việt*: Lần chạy Maven vượt qua `526 / 526` test (`54` lớp XML) và in `[ERROR] Surefire is going to kill self fork JVM. The exit has elapsed 30 seconds after System.exit(0).` sau `SecurityHardeningIntegrationTest`. Bằng chứng mã nguồn và dump xác minh đây là áp lực đóng context có sẵn trên `develop`, không phải rò rỉ từ DN-01/DN-01-cloud: `origin/develop` (`fb4e771`) đã có `33` `@SpringBootTest` / `34` `@Container` (so với `40` `@SpringBootTest` / `41` `@Container` ở working tree) vượt ngưỡng `DefaultContextCache = 32` của Spring TestContext; `SecurityHardeningIntegrationTest` chạy riêng đạt `25 / 25` trong `01:07 min` với `0` cảnh báo (nơi `git diff fb4e771` chỉ thêm cấu hình Cloudinary test và đổi số migration `6 -> 7`); và dump toàn bộ lượt chạy `backend/target/surefire-reports/2026-11-18T16-07-00_811-jvmRun1.dump` (cùng `.dumpstream`) cho thấy luồng `main` chờ trong `ApplicationShutdownHooks` tại `"SpringApplicationShutdownHook"` -> `HikariPool.shutdown` -> `ThreadPoolExecutor.awaitTermination` trên các context đã cache (`21` `HikariPool-*` đang đóng / `12` `container-*` / `27` `HttpClient-*`). Không phải do executor hay HTTP server chưa đóng từ mã nguồn DN-01/DN-01-cloud.
