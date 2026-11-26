# `[NT-02]` Technical Guide & Reviewer Runbook - Tài Liệu Kỹ Thuật & Hướng Dẫn Nghiệm Thu (`T022BB1`)

**Task Code / Mã nhiệm vụ**: `T022BB1`
**Feature / Phân hệ**: `` `[NT-02]` `` 5-Role Data Model, Declarative RBAC, Ownership Guard, OpenAPI `/api/docs`, Shared Layout & Route Guard (Phân quyền 5 vai trò, kiểm tra quyền sở hữu, OpenAPI `/api/docs`, layout dùng chung & chặn tuyến)
**Branch / Nhánh**: `feature/T022BB1-phan-quyen-5-vai-tro` (base: `develop` / `348aadf`)
**Stack / Công nghệ**: Java 25 LTS, Spring Boot 4.1.2, PostgreSQL 18.6, Flyway 12.4.0, React 19.3.1, TypeScript 6.0.3, Nginx 1.30.6

---

## 1. Executive Summary / Tổng Quan Tính Năng

### 1.1. English

Round NT-02 (`T022BB1`) establishes unified 5-role authorization across database documentation, backend API security, OpenAPI `/api/docs`, and frontend navigation/guards inside Rikkei Jobs:

- **Database & Bilingual ERD (`docs/erd/README.md`)**: Verifies all `14` immutable Flyway migrations (`V1..V14`: `7` odd production DDL migrations covering `22` tables across `5` active DB modules + `7` even dev seeds), documents `users.company_id <-> companies.id` as a scalar cross-module reference (`0` cross-module physical foreign keys), and proves clean empty-DB migration with `9` seeded users across all `5` roles.
- **Declarative RBAC & Horizontal Ownership (`RoutePolicyRegistry`, `SecurityConfig`, `OwnershipGuard`)**: Replaces scattered security rules with a single immutable `RoutePolicyRegistry` (`PUBLIC`, `AUTHENTICATED_ANY`, `ROLES`) terminated by `.anyRequest().denyAll()` in `SecurityConfig`. Adds stateless `com.rikkei.jobs.common.security.OwnershipGuard` (`hasRole`, `hasAnyRole`, `isSelf`, `requireSelf`, `requireSelfOrRoles`, `requireCompanyAccess`) returning identical `404 NOT_FOUND` bodies on cross-tenant/cross-user access to prevent IDOR enumeration. Adds `GET /api/v1/companies/{id}` (`HR` own `200`, other `404`; `STAFF` any `200`/`404` missing; others `403`; `PUT /api/v1/companies/{id}` returns uniform `405 METHOD_NOT_ALLOWED` for `HR`/`STAFF` and `401` for anonymous). Applies Team Lead `D6` decisions across all `35` application endpoints (`docs/nt02/permission-matrix.md`).
- **Dev-Only OpenAPI `/api/docs` (`:8080` & `:3000`)**: Exposes Swagger UI at `/api/docs` (`springdoc.swagger-ui.path: /api/docs`, `springdoc.api-docs.path: /api/api-docs`, `OpenApiConfig` `@Server(url = "/")`, and minimal `frontend/nginx.conf` `location ^~ /api/`) while preserving legacy `/api-docs` and `/swagger-ui.html` on `:8080`, hiding `TestErrorController` (`@Hidden`), and disabling Springdoc completely in `prod` (`404 NOT_FOUND`).
- **Frontend Shared Layout, Collapsible Left Sidebar, Single-Source Route Policy & 403 (`SharedAppLayout`, `roleMenuConfig.ts`, `routePolicies.ts`, `RequireRole`, `ForbiddenPage`)**: Renders one unified shell across all 5 roles with a slim header, skip link (`"Bỏ qua tới nội dung chính"`), and collapsible left sidebar (`--rj-sidebar-width-expanded: 280px`, `--rj-sidebar-width-collapsed: 72px`, `< 768px` off-canvas drawer; `>= 1280px` expanded by default, `768–1279px` collapsed by default; UI preference persisted via `localStorage` key `rj_sidebar_collapsed` inside `try/catch`). Starts with `"Trang chủ"` followed by exact role items from `roleMenuConfig.ts` (`CANDIDATE` Airy `44px` vs `HR`/`MENTOR`/`STAFF`/`ADMIN` Dense `36px` at `>= 768px` and `44px` in mobile drawer), keeping unimplemented items non-focusable disabled `"Sắp ra mắt"` entries (`aria-disabled="true"`, `tabIndex={-1}`). Wraps `/candidate/jobs` via `CandidateJobsPage.tsx` (`D5`), renders `ForbiddenPage` (`403` + `enumLabels.ts` role badge + back-to-home link) inside `SharedAppLayout` (keeping public/auth pages sidebar-free), prevents stale `from` state on explicit logout (`AuthContext` `isExplicitLogout` + `state: null`), shares `PROTECTED_ROUTE_POLICIES` (`routePolicies.ts`) as the single `route -> role` source of truth between `App.tsx` and `resolvePostLoginPath` (preserving safe same-user `401` return and `mustChangePassword`), and verifies `httpClient` (`Bearer` injection, `401 -> /login` clearing session, `403` preserving session).
- **Verified Test & Gate Baselines**: Backend `641` tests across `59` classes (unchanged in `NT-02-fix`); Frontend `342` tests across `32` Vitest files; Mock `8/8` + Cloudinary; E2E `26` suites / `323` cases / `1939` assertions; Contrast `120 / 120` pairs (`compute-contrast.mjs`); `26 / 26` quality gates (`check.sh` & `check.ps1`).

### 1.2. Tiếng Việt

Đợt triển khai NT-02 (`T022BB1`) hoàn thiện khung phân quyền 5 vai trò thống nhất từ mô hình dữ liệu ERD, bảo mật API backend, hợp đồng OpenAPI `/api/docs`, tới layout, menu vai trò và bộ lọc tuyến frontend trên Rikkei Jobs:

- **CSDL & ERD song ngữ (`docs/erd/README.md`)**: Xác minh toàn bộ `14` migration Flyway bất biến (`V1..V14`: `7` file DDL production lẻ tạo `22` bảng thuộc `5` module CSDL + `7` file seed dev chẵn), mô tả rõ `users.company_id <-> companies.id` là tham chiếu vô hướng liên module (không có khóa ngoại vật lý liên module), và chứng minh di trú từ CSDL rỗng tạo đủ `9` tài khoản mẫu cho cả `5` vai trò.
- **Phân quyền khai báo tập trung & Chống IDOR (`RoutePolicyRegistry`, `SecurityConfig`, `OwnershipGuard`)**: Gom toàn bộ quy tắc tuyến về `RoutePolicyRegistry` (`PUBLIC`, `AUTHENTICATED_ANY`, `ROLES`) kết thúc bằng `.anyRequest().denyAll()` trong `SecurityConfig`. Bổ sung lớp tiện ích không trạng thái `com.rikkei.jobs.common.security.OwnershipGuard` (`hasRole`, `hasAnyRole`, `isSelf`, `requireSelf`, `requireSelfOrRoles`, `requireCompanyAccess`) trả về thân `404 NOT_FOUND` giống hệt ID thiếu khi truy cập trái chủ sở hữu. Bổ sung `GET /api/v1/companies/{id}` (`HR` công ty mình `200`, công ty khác `404`; `STAFF` mọi công ty `200`/`404` thiếu; vai trò khác `403`; `PUT /api/v1/companies/{id}` trả đồng nhất `405 METHOD_NOT_ALLOWED` cho `HR`/`STAFF` và `401` cho ẩn danh). Áp dụng quyết định `D6` trên toàn bộ `35` endpoint ứng dụng (`docs/nt02/permission-matrix.md`).
- **OpenAPI `/api/docs` chỉ bật ở `dev` (`:8080` & `:3000`)**: Phục vụ Swagger UI tại `/api/docs` (`springdoc.swagger-ui.path: /api/docs`, `springdoc.api-docs.path: /api/api-docs`, `OpenApiConfig` `@Server(url = "/")`, và cập nhật tối thiểu `frontend/nginx.conf` `location ^~ /api/`), giữ tương thích `/api-docs` và `/swagger-ui.html` trên `:8080`, ẩn `TestErrorController` bằng `@Hidden`, và tắt hoàn toàn ở profile `prod` (`404 NOT_FOUND`).
- **Giao diện dùng chung, Sidebar trái thu gọn/mở rộng, Nguồn tuyến duy nhất & Trang `403` (`SharedAppLayout`, `roleMenuConfig.ts`, `routePolicies.ts`, `RequireRole`, `ForbiddenPage`)**: Dùng một layout thống nhất cho cả 5 vai trò gồm header gọn, skip link (`"Bỏ qua tới nội dung chính"`) và sidebar trái thu gọn/mở rộng (`--rj-sidebar-width-expanded: 280px`, `--rj-sidebar-width-collapsed: 72px`, ngăn kéo `< 768px`; mặc định mở rộng ở `>= 1280px`, thu gọn ở `768–1279px`; lưu tùy chọn giao diện qua khóa `localStorage` `rj_sidebar_collapsed` trong `try/catch`). Mục đầu tiên luôn là `"Trang chủ"`, theo sau là các mục vai trò từ `roleMenuConfig.ts` (`CANDIDATE` Airy `44px`, `HR`/`MENTOR`/`STAFF`/`ADMIN` Dense `36px` từ `>= 768px` và `44px` trong ngăn kéo), đánh dấu mục chưa xây dựng là `"Sắp ra mắt"` (`aria-disabled="true"`, `tabIndex={-1}`, không điều hướng). Bọc mỏng `/candidate/jobs` (`CandidateJobsPage.tsx` theo `D5`), hiển thị `ForbiddenPage` (`403` + nhãn vai trò `enumLabels.ts` + nút về trang chủ) bên trong `SharedAppLayout` (các trang công khai/đăng nhập không có sidebar), xóa `from` khi đăng xuất chủ động (`AuthContext` `isExplicitLogout` + `state: null`), dùng chung nguồn sự thật `PROTECTED_ROUTE_POLICIES` (`routePolicies.ts`) giữa `App.tsx` và `resolvePostLoginPath` (bảo toàn quay lại trang cũ khi cùng người dùng hết phiên `401` và luồng `mustChangePassword`), và kiểm thử `httpClient` (`Bearer`, `401 -> /login` xóa phiên, `403` giữ phiên).
- **Số liệu kiểm thử đã xác minh**: Backend `641` test trên `59` lớp (giữ nguyên không đổi trong `NT-02-fix`); Frontend `342` test trên `32` tệp Vitest; Mock `8/8` + Cloudinary; E2E `26` suite / `323` ca / `1939` assertion; Tương phản `120 / 120` cặp (`compute-contrast.mjs`); `26 / 26` cổng chất lượng (`check.sh` & `check.ps1`).

---

## 2. Development Seed Sample Data (`V2`, `V6`, `V8`, `V10`) / Dữ Liệu Mẫu Môi Trường Dev

*Security notice (EN)*: All 9 accounts below come strictly from development seeds (`V2__dev_seed.sql`, `V6__dev_seed_nt01.sql`, `V8__dev_evaluation_seed.sql`, `V10__dev_company_seed.sql`) and share only the documented dev seed password `Test@123` (`README.md`, `docs/dn01/README.md`). Zero accounts are seeded in `prod`, and zero runtime or temporary passwords are documented anywhere.

*Lưu ý bảo mật (VI)*: Toàn bộ 9 tài khoản dưới đây chỉ được tạo từ các tệp seed môi trường phát triển (`V2__dev_seed.sql`, `V6__dev_seed_nt01.sql`, `V8__dev_evaluation_seed.sql`, `V10__dev_company_seed.sql`) và dùng chung duy nhất mật khẩu mẫu dev đã công bố là `Test@123` (`README.md`, `docs/dn01/README.md`). Môi trường `prod` không seed tài khoản nào và không có mật khẩu runtime/tạm thời nào được ghi trong tài liệu.

| # | Email | Full Name / Họ tên | Role / Vai trò | `company_id` | `must_change_password` | Dev Login Method / Cách đăng nhập dev |
|---:|---|---|---|---:|:---:|---|
| 1 | `candidate1@rikkeijobs.test` | Nguyễn Văn An | `CANDIDATE` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-sv-001`) or / hoặc `Test@123` |
| 2 | `candidate2@rikkeijobs.test` | Trần Thị Bình | `CANDIDATE` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-sv-002`) or / hoặc `Test@123` |
| 3 | `candidate3@rikkeijobs.test` | Lê Minh Châu | `CANDIDATE` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-sv-003`) or / hoặc `Test@123` |
| 4 | `hr1@rikkeijobs.test` | Đại diện Doanh nghiệp A | `HR` | `1` | `true` | Enterprise login (`Test@123`) — enforces `/change-password` on first login; owns Company `1` / Bắt buộc `/change-password` lần đầu; sở hữu Công ty `1` |
| 5 | `hr2@rikkeijobs.test` | Đại diện Doanh nghiệp B | `HR` | `2` | `false` | Enterprise login (`Test@123`) — owns Company `2` / Sở hữu Công ty `2` |
| 6 | `mentor1@rikkeijobs.test` | Phạm Quốc Dũng | `MENTOR` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-mt-001`) or / hoặc `Test@123` |
| 7 | `mentor2@rikkeijobs.test` | Trần Minh Tuấn | `MENTOR` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-mt-002`) or / hoặc `Test@123` |
| 8 | `staff1@rikkeijobs.test` | Hoàng Thu Hà | `STAFF` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-st-001`) or / hoặc `Test@123` |
| 9 | `admin1@rikkeijobs.test` | Đỗ Thanh Hải | `ADMIN` | `NULL` | `false` | Mock LMS SSO (`lmsUserId = lms-ad-001`) or / hoặc `Test@123` |

---

## 3. How to Run, Permission Test Command & URLs / Hướng Dẫn Chạy, Lệnh Kiểm Thử Phân Quyền & URL

### 3.1. Full Stack & Service URLs / Chạy Full Stack & Danh Sách URL Dịch Vụ

- **English**: Prepare `.env` from `.env.example` (never commit `.env`), start the 5-service Docker Compose stack from a clean DB volume, run the 26-suite opaque-box E2E suite, and tear down volumes afterwards.
- **Tiếng Việt**: Tạo tệp `.env` từ `.env.example` (không bao giờ commit `.env`), khởi động stack Docker Compose 5 dịch vụ trên CSDL rỗng, chạy trọn bộ 26 suite E2E hộp đen, rồi dọn sạch container và volume.

```powershell
# 1. Prepare local .env from .env.example if needed (never commit .env)
Copy-Item .env.example .env -ErrorAction SilentlyContinue

# 2. Boot clean 5-service Docker Compose stack (requires clean DB volume)
docker compose down -v
docker compose up -d --build --wait

# 3. Execute 4-tier opaque-box E2E suite (26 suites)
node e2e/run-all.mjs

# 4. Tear down stack and remove volumes cleanly
docker compose down -v
```

- **Frontend (Nginx) / Giao diện người dùng**: `http://127.0.0.1:3000`
- **Swagger UI (Dev Profile Only — Both Origins) / Giao diện Swagger UI (Chỉ bật ở `dev` — Cả hai origin)**: `http://127.0.0.1:8080/api/docs` and / và `http://127.0.0.1:3000/api/docs`
- **OpenAPI JSON Spec (Dev Profile Only) / Đặc tả OpenAPI JSON (Chỉ bật ở `dev`)**: `http://127.0.0.1:8080/api/api-docs` and / và `http://127.0.0.1:3000/api/api-docs` (legacy `/api-docs` and `/swagger-ui.html` remain active on `:8080` in `dev`; all OpenAPI/Swagger routes return `404 NOT_FOUND` in `prod` / tuyến cũ `/api-docs` và `/swagger-ui.html` giữ nguyên ở `:8080` trong `dev`; mọi tuyến OpenAPI/Swagger trả `404 NOT_FOUND` ở `prod`)
- **Backend API Base / API gốc**: `http://127.0.0.1:8080/api/v1`
- **External & Cloudinary Mock / Dịch vụ giả lập LMS & Cloudinary**: `http://127.0.0.1:9000`
- **Mailpit Web UI / Giao diện thư thử nghiệm Mailpit**: `http://127.0.0.1:8025`
- **PostgreSQL (Dev Host Port) / CSDL PostgreSQL (Cổng host dev)**: `127.0.0.1:5433`

### 3.2. Single Backend Permission Test Command & Full Verification Commands / Lệnh Đơn Lẻ Chạy Test Phân Quyền Backend & Bộ Kiểm Định Đầy Đủ

- **English**: Ensure `JAVA_HOME` points to Eclipse Temurin JDK 25 and Docker Desktop is running for Testcontainers before executing the single RBAC permission test command or full quality gates.
- **Tiếng Việt**: Đảm bảo biến môi trường `JAVA_HOME` trỏ tới Eclipse Temurin JDK 25 và Docker Desktop đang chạy cho Testcontainers trước khi thực thi lệnh đơn lẻ kiểm thử phân quyền RBAC hoặc toàn bộ cổng chất lượng.

```powershell
# Single command to run NT-02 RBAC policy coverage and 5-role permission matrix tests (Windows PowerShell)
Push-Location backend
.\mvnw.cmd test -D "test=Rbac*IntegrationTest"
Pop-Location
```

```bash
# Single command on Linux / macOS / Git Bash
cd backend && ./mvnw test -D "test=Rbac*IntegrationTest"
```

- **English**: Full module verification commands (Backend Spotless/SpotBugs/JUnit, Frontend ESLint/TypeScript/Vitest/Vite, Mock server, and `check.ps1` / `check.sh` 26 active gates):
- **Tiếng Việt**: Các lệnh kiểm định toàn phần theo từng phân hệ (Backend Spotless/SpotBugs/JUnit, Frontend ESLint/TypeScript/Vitest/Vite, Mock server, và 26 cổng kiểm định hoạt động trong `check.ps1` / `check.sh`):

```powershell
# Full Backend gate (compile -Werror, Spotless, SpotBugs, JUnit + Testcontainers)
Push-Location backend
.\mvnw.cmd clean test spotless:check spotbugs:check
Pop-Location

# Full Frontend gate (ESLint, TypeScript, Vitest, Vite production build)
npm run lint --prefix frontend
npm run typecheck --prefix frontend
npm test --prefix frontend -- --run
npm run build --prefix frontend

# External & Cloudinary Mock suite (ensure port 9000 is free first)
node mock/test-runner.js

# Full 26 active quality gates (PowerShell and Git Bash)
.\check.ps1
```

---

## 4. Key Architecture, Endpoint Contract & Enabling `"Sắp ra mắt"` Menu Items / Kiến Trúc Trọng Tâm, Hợp Đồng Endpoint & Cách Bật Mục `"Sắp ra mắt"`

### 4.1. New Endpoint (`GET /api/v1/companies/{id}`), `PUT` `405` & Security Helpers / Endpoint Mới (`GET /api/v1/companies/{id}`), `PUT` `405` & Tiện Ích Bảo Mật

1. **English**:
   - **New Endpoint (`GET /api/v1/companies/{id}`)**:
     - `HR`: Permitted via `OwnershipGuard.requireCompanyAccess` **only** when `id` equals `principal.getCompanyId()` (`200 OK`); any other ID, `<= 0`, or unassigned `companyId` returns `404 NOT_FOUND` with unified Vietnamese body `{"code":"NOT_FOUND","message":"Không tìm thấy doanh nghiệp"}` byte-identical to a nonexistent ID.
     - `STAFF`: Permitted to read any valid existing company (`200 OK`, or `404 NOT_FOUND` if nonexistent or `<= 0`).
     - `CANDIDATE`, `MENTOR`, `ADMIN`: Rejected with `403 FORBIDDEN`.
     - Anonymous: Rejected with `401 UNAUTHORIZED`.
     - `hr1` before password change: Rejected with `403 MUST_CHANGE_PASSWORD`.
   - **`PUT /api/v1/companies/{id}` Contract (`405 METHOD_NOT_ALLOWED`)**:
     - Because `GET /api/v1/companies/{id}` is now mapped and `RoutePolicy.methodScoped = false`, `PUT /api/v1/companies/{id}` returns `405 METHOD_NOT_ALLOWED` uniformly for `HR` and `STAFF` on own, cross-tenant (`2`), and nonexistent (`999999`) IDs without leaking company existence or mutating DB, while anonymous callers still receive `401 UNAUTHORIZED` and other roles receive `403 FORBIDDEN`.
   - **Single Declarative Policy & Ownership Guard**:
     - `com.rikkei.jobs.common.security.RoutePolicyRegistry`: single ordered `route -> accessType/roles` source consumed by `SecurityConfig` ending in `.anyRequest().denyAll()`, enforced by `RbacEndpointPolicyCoverageIntegrationTest`.
     - `com.rikkei.jobs.common.security.OwnershipGuard`: stateless horizontal ownership helper (`hasRole`, `hasAnyRole`, `isSelf`, `requireSelf`, `requireSelfOrRoles`, `requireCompanyAccess`) documented in full in `docs/nt02/permission-matrix.md`.
2. **Tiếng Việt**:
   - **Endpoint mới (`GET /api/v1/companies/{id}`)**:
     - `HR`: Chỉ được phép đọc thông qua `OwnershipGuard.requireCompanyAccess` khi `id` trùng `principal.getCompanyId()` (`200 OK`); mọi `id` khác, `<= 0`, hoặc tài khoản `HR` chưa gắn `companyId` đều trả về `404 NOT_FOUND` với thân JSON tiếng Việt thống nhất `{"code":"NOT_FOUND","message":"Không tìm thấy doanh nghiệp"}` giống hệt từng byte so với `id` không tồn tại.
     - `STAFF`: Được phép đọc bất kỳ doanh nghiệp hợp lệ nào đang tồn tại (`200 OK`, hoặc `404 NOT_FOUND` nếu không tồn tại / `<= 0`).
     - `CANDIDATE`, `MENTOR`, `ADMIN`: Bị từ chối với `403 FORBIDDEN`.
     - Ẩn danh (chưa đăng nhập): Bị từ chối với `401 UNAUTHORIZED`.
     - `hr1` trước khi đổi mật khẩu: Bị chặn bởi `MustChangePasswordFilter` với `403 MUST_CHANGE_PASSWORD`.
   - **Hợp đồng `PUT /api/v1/companies/{id}` (`405 METHOD_NOT_ALLOWED`)**:
     - Do `GET /api/v1/companies/{id}` đã được ánh xạ và `RoutePolicy.methodScoped = false`, yêu cầu `PUT /api/v1/companies/{id}` từ `HR` hoặc `STAFF` trả đồng nhất `405 METHOD_NOT_ALLOWED` cho cả công ty của mình, công ty khác (`2`), và ID không tồn tại (`999999`) mà không làm lộ sự tồn tại của doanh nghiệp hay thay đổi dữ liệu DB; người gọi ẩn danh vẫn nhận `401 UNAUTHORIZED` và các vai trò khác nhận `403 FORBIDDEN`.
   - **Nguồn chính sách khai báo duy nhất & Lớp kiểm tra quyền sở hữu**:
     - `com.rikkei.jobs.common.security.RoutePolicyRegistry`: nguồn chân lý duy nhất theo thứ tự `route -> accessType/roles` được `SecurityConfig` nạp trước `.anyRequest().denyAll()`, và được kiểm chứng tự động qua `RbacEndpointPolicyCoverageIntegrationTest`.
     - `com.rikkei.jobs.common.security.OwnershipGuard`: lớp tiện ích không trạng thái chống IDOR theo chiều ngang (`hasRole`, `hasAnyRole`, `isSelf`, `requireSelf`, `requireSelfOrRoles`, `requireCompanyAccess`), mô tả chi tiết trong `docs/nt02/permission-matrix.md`.

### 4.2. How Future Tasks Re-Enable `"Sắp ra mắt"` Menu Items / Cách Bật Lại Mục `"Sắp ra mắt"`

1. **English**:
   1. Implement the feature page component and declare its policy in `frontend/src/features/identity/config/routePolicies.ts` (`PROTECTED_ROUTE_POLICIES`), then wire the `<Route>` inside `frontend/src/App.tsx` wrapped with `<RequireRole allowedRoles={...}>` and `<RoleHomeLayout>` / `<SharedAppLayout>` so the unified header and collapsible left sidebar remain mounted and `resolvePostLoginPath` recognizes the route automatically.
   2. Open `frontend/src/features/identity/config/roleMenuConfig.ts` and locate the target item inside `ROLE_MENU_CONFIG.<ROLE>`.
   3. Add `path: '/<role>/<route>'` and **remove** both `disabled: true` and `comingSoonLabel: 'Sắp ra mắt'`.
   4. `SharedAppLayout.tsx` automatically switches from rendering the non-focusable disabled `<span role="link" aria-disabled="true" tabIndex={-1}>` to an active React Router `<Link to={item.path}>` with `aria-current="page"` when matched (if the feature has nested sub-routes like `/candidate/jobs/:jobId`, extend the `isActive` check in `SharedAppLayout.tsx`).
   5. Add or update Vitest coverage in `frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx`, `postLoginRedirect.test.tsx`, and `App.test.tsx`.
2. **Tiếng Việt**:
   1. Tạo màn hình chức năng mới, khai báo chính sách tuyến trong `frontend/src/features/identity/config/routePolicies.ts` (`PROTECTED_ROUTE_POLICIES`), rồi khai báo `<Route>` trong `frontend/src/App.tsx` bọc bởi `<RequireRole allowedRoles={...}>` và dùng `RoleHomeLayout` hoặc `SharedAppLayout` để giữ nguyên header và sidebar trái dùng chung, đồng thời giúp `resolvePostLoginPath` tự động nhận diện quyền tuyến mới.
   2. Mở `frontend/src/features/identity/config/roleMenuConfig.ts` và tìm mục tương ứng trong `ROLE_MENU_CONFIG.<ROLE>`.
   3. Bổ sung `path: '/<role>/<route>'` và **xóa** cả hai thuộc tính `disabled: true` cùng `comingSoonLabel: 'Sắp ra mắt'`.
   4. `SharedAppLayout.tsx` sẽ tự động chuyển mục đó từ thẻ `<span role="link" aria-disabled="true" tabIndex={-1}>` không nhận focus sang thẻ `<Link to={item.path}>` có trạng thái active `aria-current="page"` (nếu có route con như `/candidate/jobs/:jobId`, cập nhật thêm điều kiện `isActive` trong `SharedAppLayout.tsx`).
   5. Bổ sung hoặc cập nhật kiểm thử Vitest tại `SharedAppLayout.test.tsx`, `postLoginRedirect.test.tsx`, và `App.test.tsx`.

---

## 5. Related NT-02 Documents / Tài Liệu Liên Quan NT-02

- `docs/erd/README.md` — Bilingual ERD covering all 22 production tables (`V1..V13`), module boundaries, scalar cross-module links, and empty-DB migration proof. / Sơ đồ ERD song ngữ mô tả 22 bảng production (`V1..V13`), ranh giới module, liên kết vô hướng và bằng chứng chạy migration từ CSDL rỗng.
- `docs/nt02/permission-matrix.md` — Complete bilingual 35-endpoint RBAC matrix, `RoutePolicyRegistry` invariants, `OwnershipGuard` reference, and `D6` contract disclosures. / Ma trận phân quyền song ngữ đầy đủ 35 endpoint, bất biến của `RoutePolicyRegistry`, tài liệu `OwnershipGuard` và công bố hợp đồng `D6`.
- `docs/nt02/PHASE0_ACK.md` — Pre-edit Phase 0 acknowledgement, baseline facts, Team Lead decisions `D1`–`D8`, and post-survey resolutions. / Ghi nhận Phase 0 trước khi sửa mã, hiện trạng baseline, quyết định `D1`–`D8` và các giải đáp sau khảo sát từ Team Lead.
- `docs/nt02/BROWSER_OBSERVATIONS.md` — Live `/browser` measurements across all 5 roles (F1 logout/re-login reproductions, F4 collapsible left sidebar & 403 in layout), OpenAPI `:8080` & `:3000`, responsive `375/768/1024/1440px` Light & Dark, all 34 screenshot index mappings, and honest Rule 09 rubric (`11/12`). / Nhật ký đo đạc `/browser` thực tế đủ 5 vai trò (F1 đăng xuất/đăng nhập lại, F4 sidebar trái thu gọn/mở rộng & 403 trong layout), OpenAPI `:8080` & `:3000`, responsive `375/768/1024/1440px` Sáng & Tối, chỉ mục đủ 34 ảnh chụp và bảng điểm Rule 09 trung thực (`11/12`).
- `docs/nt02/PR_DESCRIPTION.md` — Complete bilingual EN + VI PR text for `develop`. / Nội dung Pull Request song ngữ EN + VI đầy đủ để gộp vào `develop`.
- `docs/nt02/pr-screenshots/ORDER.txt` — Index of all 34 curated PR screenshots (git-ignored binaries). / Danh mục đối chiếu 34 ảnh chụp màn hình PR (các tệp PNG được bỏ qua bởi `.gitignore`).
