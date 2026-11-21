# `[NT-02]` Phân quyền 5 vai trò, Mô hình dữ liệu ERD, OpenAPI `/api/docs`, Giao diện dùng chung & Bộ lọc tuyến (`T022BB1`)

> **GitHub Pull Request Title (without Markdown backticks)**: `[NT-02] Phân quyền 5 vai trò, ERD, OpenAPI /api/docs, layout dùng chung & route guard (T022BB1)`

## Pull Request Metadata / Thông Tin Pull Request

- **Task Code / Mã nhiệm vụ**: `T022BB1`
- **Feature Code / Mã tính năng**: `` `[NT-02]` ``
- **Source Branch / Nhánh nguồn**: `feature/T022BB1-phan-quyen-5-vai-tro`
- **Target Branch / Nhánh đích**: `develop` (base commit `348aadf` including merged `DN-01` / `T0231B5`, `PR #6`, `PR #14`, `HS-01`, `DG-01`)

---

## 1. Executive Summary & Key Changes / Tóm Tắt Tổng Quan & Thay Đổi Chính

### 1.1. English

Round NT-02 (`T022BB1`) delivers end-to-end 5-role authorization (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`), bilingual database ERD documentation, centralized declarative backend RBAC with horizontal IDOR protection, OpenAPI `/api/docs` across both `:8080` and `:3000`, shared frontend navigation/layout/403 UX, `httpClient` auth-interception verification, `/browser` evidence across all 5 roles, and full CI/quality gate parity on top of `develop @ 348aadf`:

- **Database & Bilingual ERD (`docs/erd/README.md`)**: Verifies all `14` immutable Flyway migrations (`V1..V14`: `7` odd production DDL migrations defining `22` tables across `5` active database-owning modules + `7` even dev seeds providing `9` users across all `5` roles and `2` companies), confirms zero schema/seed gaps (`V15`/`V16` unnecessary), documents `users.company_id <-> companies.id` as a scalar cross-module reference (`0` cross-module physical FKs), and proves clean empty-DB migration (`A3`).
- **Declarative RBAC Policy, `OwnershipGuard`, and `GET /api/v1/companies/{id}` (`RoutePolicyRegistry`, `SecurityConfig`, `OwnershipGuard`)**: Replaces fragmented security matchers with one ordered single source of truth (`com.rikkei.jobs.common.security.RoutePolicyRegistry` with `PUBLIC`, `AUTHENTICATED_ANY`, `ROLES`) terminated by `.anyRequest().denyAll()` in `SecurityConfig`. Adds stateless `com.rikkei.jobs.common.security.OwnershipGuard` (`hasRole`, `hasAnyRole`, `isSelf`, `requireSelf`, `requireSelfOrRoles`, `requireCompanyAccess`) so horizontal IDOR violations return `404 NOT_FOUND` byte-identical to nonexistent IDs. Adds `GET /api/v1/companies/{id}` (`HR` own company -> `200`, cross-tenant/unassigned/missing -> `404`; `STAFF` any -> `200`/`404`; others -> `403`; `PUT /api/v1/companies/{id}` returns uniform `405 METHOD_NOT_ALLOWED` for `HR`/`STAFF` and `401` for anonymous). Applies Team Lead `D6` resolutions across all `35` application endpoints (`docs/nt02/permission-matrix.md`), enforced mechanically by `RbacEndpointPolicyCoverageIntegrationTest` (`RequestMappingHandlerMapping`) and `RbacPermissionMatrixIntegrationTest`.
- **OpenAPI `/api/docs` on `:8080` and `:3000` (`OpenApiConfig`, `LegacyOpenApiController`, `LegacySwaggerUiRedirectController`, `frontend/nginx.conf`)**: Exposes interactive Swagger UI at `/api/docs` (`springdoc.swagger-ui.path: /api/docs`, `springdoc.api-docs.path: /api/api-docs`, `@Server(url = "/")`, Bearer `bearerAuth`), keeps legacy `/api-docs` and `/swagger-ui.html` active on `:8080` in `dev`, uses a minimal 2-character Nginx update (`location ^~ /api/`) so static assets load cleanly on `:3000/api/docs`, hides `TestErrorController` (`@Hidden`), completes `@Tag`/`@Operation`/`@ApiResponse` (`401`/`403`/`404`) across all `25` paths / `27` operations (`12` tags), and keeps Springdoc completely disabled in `prod` (`404 NOT_FOUND` verified by `OpenApiCoverageIntegrationTest`).
- **Frontend Shared Layout, Collapsible Left Sidebar, Post-Logout Redirect Fix & 403 (`SharedAppLayout`, `roleMenuConfig.ts`, `routePolicies.ts`, `RequireRole`, `ForbiddenPage`, `roleUtils.ts`, `httpClient`)**: Implements one unified application shell across all 5 roles with a slim header, skip link (`"Bỏ qua tới nội dung chính"`), and collapsible left sidebar (`--rj-sidebar-width-expanded: 280px`, `--rj-sidebar-width-collapsed: 72px`, `< 768px` off-canvas modal drawer; `>= 1280px` expanded by default, `768–1279px` collapsed by default; UI preference persisted via `localStorage` key `rj_sidebar_collapsed` in `try/catch`; collapsed hover/focus tooltips `<= 150ms` with `Escape` dismiss; Airy `44px` for `CANDIDATE` vs Dense `36px` at `>= 768px` and `44px` in drawer for `HR`/`MENTOR`/`STAFF`/`ADMIN`; `prefers-reduced-motion`, `0` raw colors, `<Icon />` `24x24` `2px` stroke). Starts with `"Trang chủ"` followed by `ROLE_MENU_CONFIG` items, renders unimplemented items as non-focusable disabled `"Sắp ra mắt"` entries (`aria-disabled="true"`, `tabIndex={-1}`), wraps `/candidate/jobs` via `CandidateJobsPage.tsx` (`D5`), renders `ForbiddenPage` (`403` + `enumLabels.ts` role badge + back-to-home link) inside `SharedAppLayout` (keeping public/auth pages sidebar-free), prevents stale `from` on explicit logout (`AuthContext` `isExplicitLogout` + `state: null`) and validates `resolvePostLoginPath(from, role)` against the single `PROTECTED_ROUTE_POLICIES` source of truth shared with `App.tsx` (preserving safe same-user `401` return and `mustChangePassword`), and verifies `httpClient` Bearer injection, `401 -> /login` session clearing, and `403` session retention via Vitest.
- **Round NT-02-fix Remediations (`F1`–`F4` & `DESIGN_SYSTEM.md` Section 14)**:
  - **F1 (Post-Logout Stale Redirect)**: Root cause was protected route guards writing `state.from` during logout transition and `resolvePostLoginPath` not checking whether the newly logged-in role is permitted on `from`. Fixed via `(a)` `isExplicitLogout` + `state: null` in `logout` / `SharedAppLayout` / `ChangePasswordPage` and `(b)` shared `PROTECTED_ROUTE_POLICIES` (`routePolicies.ts`) used by both `App.tsx` and `resolvePostLoginPath`.
  - **F4 (Unified Collapsible Left Sidebar & 403 Inside Layout)**: Replaced the horizontal role submenu bar with the collapsible left sidebar in `SharedAppLayout` and moved `ForbiddenPage` inside `SharedAppLayout` preserving the active role's sidebar without nested `<main>`.
  - **F3 (Rule 07 403 Body Alignment)**: Updated `agent-config/rules/07-security-rbac.md:33`, `agent-config/skills/spring-security-rbac-endpoint/SKILL.md:79`, and `docs/conventions.md:45` to match actual backend 403 JSON `{"code":"FORBIDDEN","message":"Không có quyền truy cập"}` (zero backend code touched).
  - **`DESIGN_SYSTEM.md` Section 14 & Contrast**: Added bilingual `"App shell and sidebar navigation"` and Light/Dark sidebar/overlay/tooltip tokens (`120 / 120` contrast pairs verified by `compute-contrast.mjs`).

### 1.2. Tiếng Việt

Đợt triển khai NT-02 (`T022BB1`) hoàn thiện hệ thống phân quyền 5 vai trò (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`) xuyên suốt từ ERD cơ sở dữ liệu, tầng bảo mật khai báo tập trung và chống IDOR ở backend, OpenAPI `/api/docs` trên cả `:8080` và `:3000`, layout/menu/route guard/trang `403` trên frontend, kiểm thử `httpClient`, bằng chứng `/browser` đầy đủ 5 vai trò, tới tài liệu song ngữ và bộ cổng chất lượng CI trên nền `develop @ 348aadf`:

- **CSDL & ERD song ngữ (`docs/erd/README.md`)**: Xác minh toàn bộ `14` migration Flyway bất biến (`V1..V14`: `7` DDL production lẻ cho `22` bảng thuộc `5` module CSDL + `7` seed dev chẵn tạo `9` tài khoản đủ `5` vai trò và `2` doanh nghiệp), xác nhận không phát sinh khoảng trống cần `V15`/`V16`, tài liệu hóa `users.company_id <-> companies.id` là tham chiếu vô hướng (`0` khóa ngoại vật lý liên module), và chứng minh chạy migration từ CSDL rỗng (`A3`).
- **Phân quyền khai báo tập trung, `OwnershipGuard` & `GET /api/v1/companies/{id}`**: Thay thế quy tắc rải rác bằng nguồn chân lý duy nhất `com.rikkei.jobs.common.security.RoutePolicyRegistry` (`PUBLIC`, `AUTHENTICATED_ANY`, `ROLES`) kết thúc với `.anyRequest().denyAll()` trong `SecurityConfig`. Tạo tiện ích không trạng thái `com.rikkei.jobs.common.security.OwnershipGuard` (`hasRole`, `hasAnyRole`, `isSelf`, `requireSelf`, `requireSelfOrRoles`, `requireCompanyAccess`) trả `404 NOT_FOUND` giống hệt ID thiếu để chống dò ID ngang IDOR. Bổ sung `GET /api/v1/companies/{id}` (`HR` công ty mình -> `200`, công ty khác/chưa gán/thiếu -> `404`; `STAFF` mọi công ty -> `200`/`404`; vai trò khác -> `403`; `PUT /api/v1/companies/{id}` trả đồng nhất `405 METHOD_NOT_ALLOWED` cho `HR`/`STAFF` và `401` cho ẩn danh). Áp dụng đầy đủ quyết định `D6` cho toàn bộ `35` endpoint (`docs/nt02/permission-matrix.md`), kiểm chứng tự động bởi `RbacEndpointPolicyCoverageIntegrationTest` và `RbacPermissionMatrixIntegrationTest`.
- **OpenAPI `/api/docs` trên `:8080` và `:3000`**: Mở Swagger UI tại `/api/docs` (`springdoc.swagger-ui.path: /api/docs`, `springdoc.api-docs.path: /api/api-docs`, `OpenApiConfig` `@Server(url = "/")`, nút `bearerAuth`), giữ `/api-docs` và `/swagger-ui.html` hoạt động trên `:8080` ở `dev`, chỉnh tối thiểu `frontend/nginx.conf` (`location ^~ /api/`) để `:3000/api/docs` tải đủ tài nguyên tĩnh, ẩn `TestErrorController` bằng `@Hidden`, hoàn thiện `@Tag`/`@Operation`/`@ApiResponse` (`401`/`403`/`404`) cho toàn bộ `25` paths / `27` operations (`12` tags), và tắt hoàn toàn Springdoc ở `prod` (`404 NOT_FOUND` trong `OpenApiCoverageIntegrationTest`).
- **Frontend Layout dùng chung, Sidebar trái thu gọn/mở rộng, Sửa lỗi điều hướng sau đăng xuất, Trang `403` & `httpClient`**: Triển khai một khung shell thống nhất cho cả 5 vai trò gồm header gọn, skip link (`"Bỏ qua tới nội dung chính"`) và sidebar trái thu gọn/mở rộng (`--rj-sidebar-width-expanded: 280px`, `--rj-sidebar-width-collapsed: 72px`, ngăn kéo `< 768px`; mặc định mở ở `>= 1280px`, thu gọn ở `768–1279px`; lưu tùy chọn UI qua `localStorage` khóa `rj_sidebar_collapsed` trong `try/catch`; tooltip hover/focus `<= 150ms` đóng bằng `Escape`; mật độ Airy `44px` cho `CANDIDATE` vs Dense `36px` ở `>= 768px` và `44px` trong ngăn kéo cho `HR`/`MENTOR`/`STAFF`/`ADMIN`; `prefers-reduced-motion`, `0` mã màu thô, `<Icon />` `24x24` nét `2px`). Bắt đầu bằng `"Trang chủ"` theo sau là các mục từ `ROLE_MENU_CONFIG`, đánh dấu mục chưa làm `"Sắp ra mắt"` (`aria-disabled="true"`, `tabIndex={-1}`), bọc `/candidate/jobs` trong `CandidateJobsPage.tsx` (`D5`), render `ForbiddenPage` (`403` + `enumLabels.ts` + nút về trang chủ) bên trong `SharedAppLayout` (các trang công khai không có sidebar), ngăn lưu `from` khi đăng xuất chủ động (`AuthContext` `isExplicitLogout` + `state: null`) và đối chiếu `resolvePostLoginPath(from, role)` qua nguồn duy nhất `PROTECTED_ROUTE_POLICIES` dùng chung với `App.tsx` (bảo toàn quay lại trang cũ khi cùng người dùng hết phiên `401` và luồng `mustChangePassword`), cùng kiểm thử `httpClient` (`Bearer`, `401 -> /login` xóa phiên, `403` giữ phiên).
- **Khắc phục trong vòng NT-02-fix (`F1`–`F4` & `DESIGN_SYSTEM.md` Mục 14)**:
  - **F1 (Lỗi điều hướng sau đăng xuất / đăng nhập lại)**: Nguyên nhân gốc là guard tuyến bảo vệ ghi lại `state.from` trong lúc chuyển trạng thái đăng xuất và `resolvePostLoginPath` chưa kiểm tra quyền của vai trò mới trên `from`. Đã khắc phục đồng thời bằng `(a)` cờ `isExplicitLogout` + `state: null` ở `logout` / `SharedAppLayout` / `ChangePasswordPage` và `(b)` dùng chung `PROTECTED_ROUTE_POLICIES` (`routePolicies.ts`) giữa `App.tsx` và `resolvePostLoginPath`.
  - **F4 (Sidebar trái thu gọn/mở rộng thống nhất & 403 trong layout)**: Thay thanh menu ngang dưới header bằng sidebar trái thu gọn/mở rộng trong `SharedAppLayout` và đưa `ForbiddenPage` vào bên trong `SharedAppLayout` giữ nguyên sidebar vai trò hiện tại (không lồng `<main>`).
  - **F3 (Khớp thông điệp Rule 07 403)**: Cập nhật `agent-config/rules/07-security-rbac.md:33`, `agent-config/skills/spring-security-rbac-endpoint/SKILL.md:79`, và `docs/conventions.md:45` khớp JSON 403 thực tế `{"code":"FORBIDDEN","message":"Không có quyền truy cập"}` (không sửa mã backend).
  - **`DESIGN_SYSTEM.md` Mục 14 & Tương phản**: Bổ sung mục song ngữ `"App shell and sidebar navigation"` và token sidebar/overlay/tooltip Sáng/Tối (`120 / 120` cặp tương phản đạt chuẩn qua `compute-contrast.mjs`).

---

## 2. How to Run, Sample Data & Single Permission Test Command / Hướng Dẫn Chạy, Dữ Liệu Mẫu & Lệnh Test Phân Quyền

### 2.1. English — Commands, URLs & Sample Data (`V2`, `V6`, `V8`, `V10`)

- **Local Run & E2E Flow**: Copy `.env.example` to `.env` if absent (never commit `.env`), boot the 5-service Docker Compose stack from a clean DB (`docker compose down -v && docker compose up -d --build --wait`), run `node e2e/run-all.mjs` (`26` suites), and tear down cleanly (`docker compose down -v`).
- **OpenAPI / Swagger UI (`dev` only)**: `http://127.0.0.1:8080/api/docs` and `http://127.0.0.1:3000/api/docs` (`25` paths, `27` operations, `12` tags, `TestErrorController` `@Hidden`, legacy `/api-docs` & `/swagger-ui.html` retained on `:8080`; all return `404 NOT_FOUND` in `prod`).
- **Single Backend Permission Test Command**: `.\mvnw.cmd test -D "test=Rbac*IntegrationTest"` inside `backend/` on JDK 25 (`99` tests: `RbacEndpointPolicyCoverageIntegrationTest` + `RbacPermissionMatrixIntegrationTest`).
- **Sample Data Security Notice**: Dev seeds only (`V2__dev_seed.sql`, `V6__dev_seed_nt01.sql`, `V8__dev_evaluation_seed.sql`, `V10__dev_company_seed.sql`); zero accounts exist in `prod`. All 9 accounts share only the documented dev seed password `Test@123` (`README.md`, `docs/dn01/README.md`).

### 2.2. Tiếng Việt — Hướng Dẫn Chạy, URL & Dữ Liệu Mẫu (`V2`, `V6`, `V8`, `V10`)

- **Chạy stack cục bộ & E2E**: Sao chép `.env.example` sang `.env` nếu chưa có (không bao giờ commit `.env`), khởi động stack Docker Compose 5 dịch vụ từ CSDL rỗng (`docker compose down -v && docker compose up -d --build --wait`), chạy `node e2e/run-all.mjs` (`26` suite), và dọn sạch volume sau khi xong (`docker compose down -v`).
- **OpenAPI / Swagger UI (chỉ bật ở `dev`)**: `http://127.0.0.1:8080/api/docs` và `http://127.0.0.1:3000/api/docs` (`25` paths, `27` operations, `12` tags, ẩn `TestErrorController` bằng `@Hidden`, giữ `/api-docs` & `/swagger-ui.html` trên `:8080`; toàn bộ trả `404 NOT_FOUND` ở `prod`).
- **Lệnh đơn lẻ chạy test phân quyền Backend**: `.\mvnw.cmd test -D "test=Rbac*IntegrationTest"` trong `backend/` với JDK 25 (`99` test: `RbacEndpointPolicyCoverageIntegrationTest` + `RbacPermissionMatrixIntegrationTest`).
- **Lưu ý bảo mật dữ liệu mẫu**: Chỉ nạp từ các seed dev (`V2__dev_seed.sql`, `V6__dev_seed_nt01.sql`, `V8__dev_evaluation_seed.sql`, `V10__dev_company_seed.sql`); môi trường `prod` không có tài khoản mẫu nào. Cả 9 tài khoản dùng chung duy nhất mật khẩu dev đã tài liệu hóa là `Test@123` (`README.md`, `docs/dn01/README.md`).

### 2.3. Commands & Sample Accounts Table / Lệnh Thực Thi & Bảng Tài Khoản Mẫu

```powershell
# 1. Prepare local .env from .env.example (never commit .env)
Copy-Item .env.example .env -ErrorAction SilentlyContinue

# 2. Boot fresh 5-service Docker Compose stack (ports 3000, 8080, 8025, 9000, 5433)
docker compose down -v
docker compose up -d --build --wait

# 3. Execute full 4-tier opaque-box E2E suite (26 suites)
node e2e/run-all.mjs

# 4. Tear down stack and clean volumes/networks
docker compose down -v
```

```powershell
# Single backend permission test command (Windows PowerShell, JDK 25)
Push-Location backend
.\mvnw.cmd test -D "test=Rbac*IntegrationTest"
Pop-Location

# Full Backend verification (JDK 25)
Push-Location backend
.\mvnw.cmd clean test spotless:check spotbugs:check
Pop-Location

# Full Frontend verification
npm run lint --prefix frontend
npm run typecheck --prefix frontend
npm test --prefix frontend -- --run
npm run build --prefix frontend

# External & Cloudinary Mock suite (requires port 9000 free)
node mock/test-runner.js

# Full 26 active quality gates (PowerShell & Git Bash)
.\check.ps1
```

| Email | Role / Vai trò | `company_id` | `must_change_password` | Dev Login Method / Cách đăng nhập dev |
|---|---|---:|:---:|---|
| `candidate1@rikkeijobs.test` | `CANDIDATE` | `NULL` | `false` | Mock LMS SSO (`lms-sv-001`) or / hoặc `Test@123` |
| `candidate2@rikkeijobs.test` | `CANDIDATE` | `NULL` | `false` | Mock LMS SSO (`lms-sv-002`) or / hoặc `Test@123` |
| `candidate3@rikkeijobs.test` | `CANDIDATE` | `NULL` | `false` | Mock LMS SSO (`lms-sv-003`) or / hoặc `Test@123` |
| `hr1@rikkeijobs.test` | `HR` | `1` | `true` | Enterprise (`Test@123`, forced `/change-password`, Company 1 / bắt buộc `/change-password`, Công ty 1) |
| `hr2@rikkeijobs.test` | `HR` | `2` | `false` | Enterprise (`Test@123`, Company 2 / Công ty 2) |
| `mentor1@rikkeijobs.test` | `MENTOR` | `NULL` | `false` | Mock LMS SSO (`lms-mt-001`) or / hoặc `Test@123` |
| `mentor2@rikkeijobs.test` | `MENTOR` | `NULL` | `false` | Mock LMS SSO (`lms-mt-002`) or / hoặc `Test@123` |
| `staff1@rikkeijobs.test` | `STAFF` | `NULL` | `false` | Mock LMS SSO (`lms-st-001`) or / hoặc `Test@123` |
| `admin1@rikkeijobs.test` | `ADMIN` | `NULL` | `false` | Mock LMS SSO (`lms-ad-001`) or / hoặc `Test@123` |

---

## 3. Team Lead Decisions (`D1`–`D8`) & Post-Survey Resolutions / Quyết Định Của Team Lead (`D1`–`D8`)

### 3.1. English — Decisions `D1`–`D8` & Post-Survey Resolutions

- **`D1` (Migration Numbering)**: Odd production (`V1..V13`, next `V15`), even dev (`V2..V14`, next `V16`), globally unique; `V1..V14` untouched (`0` new migrations needed).
- **`D2` (`companies` Table) & `D3` (9 Dev Seed Accounts)**: Verified `users.company_id <-> companies.id` (`hr1` = `1`, `hr2` = `2`) and all `9` users across `5` roles in PostgreSQL and `docs/erd/README.md`.
- **`D4` (OpenAPI `/api/docs` on `:8080` & `:3000`)** `` `[RESOLVED BY TEAM LEAD]` ``: Primary Swagger UI at `/api/docs` and spec at `/api/api-docs` with `@Server(url = "/")`, preserving legacy `/api-docs` & `/swagger-ui.html` on `:8080`, adding minimal `location ^~ /api/` in `frontend/nginx.conf` so `:3000/api/docs` serves Swagger assets cleanly, and keeping Springdoc completely disabled in `prod`.
- **`D5` (Menu Mapping & Unimplemented Items)** `` `[RESOLVED BY TEAM LEAD]` ``:
  - `CANDIDATE: Việc làm` -> protected `/candidate/jobs` (`CandidateJobsPage.tsx` thin wrapper around untouched `JobRecommendationsSection.tsx`).
  - `MENTOR: Cần đánh giá` & `ADMIN: Quản trị` (along with unimplemented `CANDIDATE`/`HR`/`STAFF` items) render disabled (`aria-disabled="true"`, `tabIndex={-1}`, non-navigating, `"Sắp ra mắt"`). Shared header Brand link routes back to each role's home (`/candidate`, `/hr`, `/mentor`, `/staff`, `/admin`).
  - **How future tasks re-enable `"Sắp ra mắt"` items**: Declare the `<Route>` in `frontend/src/App.tsx` wrapped in `<RequireRole>` + `<RoleHomeLayout>`/`<SharedAppLayout>`, add `path` and remove `disabled` / `comingSoonLabel` on that item in `frontend/src/features/identity/config/roleMenuConfig.ts` (documented step-by-step in `docs/nt02/README.md` Section 4.2), and update Vitest specs.
- **`D6` (Ownership Guard & Audit across HS-01/DT-01/DN-01)** `` `[RESOLVED BY TEAM LEAD]` ``:
  - Added `OwnershipGuard` in `com.rikkei.jobs.common.security` and `GET /api/v1/companies/{id}` (`HR` own `200`, other/unassigned/missing -> identical `404 NOT_FOUND`; `STAFF` any -> `200`/`404`; others -> `403`).
  - **Group A (5 self-service `/me` endpoints)**: `GET/POST /api/v1/profiles/me/skills*`, `GET/PUT /api/v1/me/target`, `GET /api/v1/me/gap-analysis` locked strictly to `CANDIDATE`.
  - **Group B (2 catalog/open-JD endpoints)**: `GET /api/v1/target-positions` and `GET /api/v1/jobs/{jobId}` marked `AUTHENTICATED_ANY` (`200` on `APPROVED` non-expired JDs, `404` on draft/expired/missing). Architectural invariant: any future draft or company-scoped JD endpoint MUST enforce `OwnershipGuard`.
  - **Group C (`GET /api/v1/profiles/{userId}/skills`)**: Locked symmetrically with `/evaluations` (`CANDIDATE` self only -> `200`, other candidate even if public -> `404`; `HR` public only -> `200`, private/own/missing -> `404`; `MENTOR`/`STAFF`/`ADMIN` -> `403`).
  - **`PUT /api/v1/companies/{id}` (`404` -> `405 METHOD_NOT_ALLOWED`)**: With `GET /api/v1/companies/{id}` mapped and `RoutePolicy.methodScoped = false`, `PUT /api/v1/companies/{id}` returns uniform `405 METHOD_NOT_ALLOWED` for `HR` and `STAFF` across own, cross-company (`2`), and nonexistent (`999999`) IDs (zero DB mutation, zero ID leakage), `403` for other roles, and `401` for anonymous.
- **`D7` (Unified Error Codes) & `D8` (`403` UX & `state.from`)**: Unified Vietnamese `ErrorResponse {code, message}`; `RequireRole` renders `ForbiddenPage` (`403` + `enumLabels.ts` role label + back-to-home link) instead of silent redirect; `resolvePostLoginPath` preserves `location.state?.from` safely across login/SSO/password-change flows while keeping JWT 100% in RAM.

### 3.2. Tiếng Việt — Quyết Định `D1`–`D8` & Giải Đáp Sau Khảo Sát

- **`D1` (Đánh số Migration)**: Production số lẻ (`V1..V13`, kế tiếp `V15`), dev số chẵn (`V2..V14`, kế tiếp `V16`), duy nhất toàn cục; giữ nguyên `V1..V14` (`0` migration mới).
- **`D2` (Bảng `companies`) & `D3` (9 Tài khoản Seed Dev)**: Đã xác minh liên kết `users.company_id <-> companies.id` (`hr1` = `1`, `hr2` = `2`) và đủ `9` tài khoản cho `5` vai trò trên PostgreSQL thực tế và `docs/erd/README.md`.
- **`D4` (OpenAPI `/api/docs` trên `:8080` & `:3000`)** `` `[TEAM LEAD ĐÃ CHỐT]` ``: Mở Swagger UI chính tại `/api/docs` và đặc tả JSON tại `/api/api-docs` với `@Server(url = "/")`, giữ nguyên `/api-docs` & `/swagger-ui.html` trên `:8080`, bổ sung tối thiểu `location ^~ /api/` trong `frontend/nginx.conf` để `:3000/api/docs` tải đủ tài nguyên tĩnh, và tắt hoàn toàn Springdoc ở profile `prod`.
- **`D5` (Ánh xạ Menu & Mục Chưa Xây Dựng)** `` `[TEAM LEAD ĐÃ CHỐT]` ``:
  - `CANDIDATE: Việc làm` -> trỏ tới `/candidate/jobs` (`CandidateJobsPage.tsx` bọc mỏng `JobRecommendationsSection.tsx` và không sửa bên trong).
  - `MENTOR: Cần đánh giá` và `ADMIN: Quản trị` (cùng các mục chưa làm của `CANDIDATE`/`HR`/`STAFF`) hiển thị dạng disabled (`aria-disabled="true"`, `tabIndex={-1}`, không nhận Tab, không điều hướng, nhãn `"Sắp ra mắt"`). Logo/liên kết thương hiệu ở header luôn dẫn về trang chủ từng vai trò (`/candidate`, `/hr`, `/mentor`, `/staff`, `/admin`).
  - **Cách bật lại mục `"Sắp ra mắt"` ở task sau**: Khai báo `<Route>` trong `frontend/src/App.tsx` bọc `<RequireRole>` + `<RoleHomeLayout>`/`<SharedAppLayout>`, bổ sung `path` và bỏ `disabled` / `comingSoonLabel` trong `frontend/src/features/identity/config/roleMenuConfig.ts` (hướng dẫn từng bước ở `docs/nt02/README.md` Mục 4.2), rồi cập nhật test Vitest.
- **`D6` (Ownership Guard & Rà soát HS-01/DT-01/DN-01)** `` `[TEAM LEAD ĐÃ CHỐT]` ``:
  - Bổ sung `OwnershipGuard` trong `com.rikkei.jobs.common.security` và endpoint `GET /api/v1/companies/{id}` (`HR` công ty mình `200`, công ty khác/chưa gán/thiếu -> `404 NOT_FOUND` đồng nhất; `STAFF` mọi công ty -> `200`/`404`; vai trò khác -> `403`).
  - **Nhóm A (5 endpoint tự phục vụ `/me`)**: `GET/POST /api/v1/profiles/me/skills*`, `GET/PUT /api/v1/me/target`, `GET /api/v1/me/gap-analysis` khóa chặt chỉ cho `CANDIDATE`.
  - **Nhóm B (2 endpoint danh mục/JD công khai)**: `GET /api/v1/target-positions` và `GET /api/v1/jobs/{jobId}` cấu hình `AUTHENTICATED_ANY` (`200` với JD `APPROVED` còn hạn, `404` với nháp/hết hạn/thiếu). Quy tắc kiến trúc bắt buộc: mọi endpoint xem JD nháp hoặc JD theo công ty sau này phải dùng `OwnershipGuard`.
  - **Nhóm C (`GET /api/v1/profiles/{userId}/skills`)**: Khóa đối xứng với `/evaluations` (`CANDIDATE` chỉ xem chính chủ -> `200`, người khác kể cả công khai -> `404`; `HR` chỉ xem `is_public = true` -> `200`, còn lại -> `404`; `MENTOR`/`STAFF`/`ADMIN` -> `403`).
  - **`PUT /api/v1/companies/{id}` (`404` -> `405 METHOD_NOT_ALLOWED`)**: Do `GET /api/v1/companies/{id}` đã ánh xạ với `RoutePolicy.methodScoped = false`, `PUT /api/v1/companies/{id}` trả đồng nhất `405 METHOD_NOT_ALLOWED` cho `HR` và `STAFF` trên cả ID của mình, ID công ty khác (`2`), và ID không tồn tại (`999999`) (không đổi DB, không lộ sự tồn tại ID), `403` cho vai trò khác, và `401` cho ẩn danh.
- **`D7` (Mã lỗi thống nhất) & `D8` (UX `403` & `state.from`)**: Thống nhất `ErrorResponse {code, message}` tiếng Việt; `RequireRole` hiển thị `ForbiddenPage` (`403` + nhãn vai trò từ `enumLabels.ts` + nút quay lại trang chủ) thay vì redirect im lặng; `resolvePostLoginPath` bảo toàn `location.state?.from` an toàn qua đăng nhập/SSO/đổi mật khẩu và giữ JWT 100% trong RAM.

---

## 4. Security Notes & Disclosed Cross-Module / Contract Changes / Bảo Mật & Công Khai Thay Đổi

### 4.1. Security Architecture Highlights / Điểm Nhấn Kiến Trúc Bảo Mật

1. **English**:
   - **Deny-by-Default & Policy Coverage**: `RoutePolicyRegistry` is the sole route registry consumed by `SecurityConfig`, ending with `.anyRequest().denyAll()`. `RbacEndpointPolicyCoverageIntegrationTest` verifies 100% endpoint coverage in `RequestMappingHandlerMapping` and `@PreAuthorize` parity (proven falsifiable via Rule 04 7-step deliberate-break protocol).
   - **Anti-IDOR `404` Masking (`OwnershipGuard`)**: Service-layer ownership checks throw `ResourceNotFoundException` / `EvaluationNotFoundException` (`404`) rather than Spring Security `AccessDeniedException` (`403`), preventing cross-tenant or cross-candidate ID probing.
   - **Frontend Auth & Open-Redirect Hardening**: `httpClient.ts` attaches Bearer tokens from memory, clears session and navigates `{ replace: true }` to `/login` on `401`, and preserves session on `403`. `resolvePostLoginPath` rejects external URLs, protocol-relative `//`, backslashes, percent-encoded slashes, control chars, and auth loop routes.
2. **Tiếng Việt**:
   - **Từ chối mặc định & Độ phủ chính sách**: `RoutePolicyRegistry` là nguồn duy nhất cấp quy tắc cho `SecurityConfig` với `.anyRequest().denyAll()` ở cuối. `RbacEndpointPolicyCoverageIntegrationTest` kiểm tra tự động 100% endpoint trong `RequestMappingHandlerMapping` và đối khớp `@PreAuthorize` (đã chứng minh khả năng phát hiện lỗi theo giao thức Rule 04).
   - **Che giấu IDOR bằng `404` (`OwnershipGuard`)**: Kiểm tra sở hữu ở tầng service ném `ResourceNotFoundException` / `EvaluationNotFoundException` (`404`) thay cho `403`, ngăn chặn dò tìm ID doanh nghiệp hoặc ứng viên khác.
   - **Gia cố xác thực & Chống Open-Redirect ở Frontend**: `httpClient.ts` gắn Bearer token từ RAM, xóa phiên và đẩy `{ replace: true }` về `/login` khi gặp `401`, đồng thời giữ nguyên phiên khi gặp `403`. `resolvePostLoginPath` chặn URL ngoài, `//`, backslash, ký tự `%2f`/`%5c` mã hóa, ký tự điều khiển và các route vòng lặp xác thực.

### 4.2. Full Disclosure of Teammate/Parallel File Touches, `cspell.json` & Contract Changes / Công Khai Đầy Đủ Tệp Đồng Đội, `cspell.json` & Thay Đổi Hợp Đồng

1. **English**:
   - **Minimal Backend Teammate File Touches (Zero Business-Logic Changes Beyond RBAC/OpenAPI)**:
     - `backend/src/main/java/com/rikkei/jobs/ai/controller/JobRecommendationController.java`: Added `@Content(schema = @Schema(implementation = ErrorResponse.class))` on `@ApiResponse` annotations.
     - `backend/src/main/java/com/rikkei/jobs/assessment/controller/EvaluationTemplateController.java`: Added explicit `@PreAuthorize("hasRole('MENTOR')")` matching `RoutePolicyRegistry`.
     - `backend/src/main/java/com/rikkei/jobs/candidate/controller/TargetPositionController.java`: Added `@PreAuthorize("isAuthenticated()")` per `D6` Group B.
     - `backend/src/main/java/com/rikkei/jobs/company/controller/JobController.java`: Added `@PreAuthorize("isAuthenticated()")` and Javadoc/OpenAPI notes per `D6` Group B.
     - `backend/src/main/java/com/rikkei/jobs/candidate/controller/GapAnalysisController.java` & `backend/src/test/java/com/rikkei/jobs/candidate/GapAnalysisIntegrationTest.java`: Added `@PreAuthorize("hasRole('CANDIDATE')")` + `403`/`404` `@ApiResponse` and tests proving `D6` Groups A & B.
     - `backend/src/main/java/com/rikkei/jobs/assessment/service/impl/EvaluationServiceImpl.java` & `backend/src/main/java/com/rikkei/jobs/candidate/service/impl/ProfileEvaluationServiceImpl.java`: Refactored inline ownership checks to reuse `OwnershipGuard.requireSelf` / `OwnershipGuard.requireSelfOrRoles` with behavior preserved.
   - **HS-01 Contract Changes (`D6` Groups A & C — Notify HS-01 Owner)**:
     - `GET /api/v1/profiles/me/skills` and `POST /api/v1/profiles/me/skills/recompute` now require `CANDIDATE` (`403` for other roles).
     - `GET /api/v1/profiles/{userId}/skills` now matches `/evaluations`: `CANDIDATE` can read only own `userId == callerId` (other candidates return `404` even when `is_public = true`), `HR` can read only `is_public = true` (`404` otherwise), and `MENTOR`/`STAFF`/`ADMIN` receive `403`. Updated `SkillProfileController.java`, `SkillProfileService.java`, `SkillProfileIntegrationTest.java`, `e2e/tier2-boundaries/test_auth_boundaries.test.mjs` (`TC-T2-SKILL-02`), and `docs/hs-01-skill-profile.md`.
   - **DN-01 Contract Change (`PUT /api/v1/companies/{id}` `404` -> `405` — Notify DN-01 Owner)**:
     - Because `GET /api/v1/companies/{id}` is now mapped, `PUT /api/v1/companies/{id}` returns `405 METHOD_NOT_ALLOWED` (for `HR`/`STAFF` across own, cross-tenant, and nonexistent IDs; `403` for other roles; `401` for anonymous) instead of `404`. Updated `CompanySecurityIntegrationTest.java`, `e2e/tier{2,3,4}/*company*.test.mjs`, and `docs/dn01/{PHASE0_ACK,README,PR_DESCRIPTION}.md`.
   - **Frontend Teammate File Touches & Reported-Not-Fixed Overflows**:
     - `frontend/nginx.conf`: Minimal 2-character change (`location /api/ {` -> `location ^~ /api/ {`) so Nginx static-asset regex does not intercept `/api/swagger-ui/*` on `:3000`.
     - `frontend/src/features/candidate/components/SkillProfilePage.tsx:113`: Minimal 1-line wrapper (`onClick={handleLogout}` -> `onClick={() => handleLogout()}`) so React click `MouseEvent` is never forwarded as `logout(options)`.
     - `frontend/src/features/company/__tests__/CompanyProfileAccessibility.test.tsx`: Updated 2 wrong-role assertions (`CANDIDATE`/`STAFF` accessing `/hr/company`) from silent redirect to Vietnamese `403` `ForbiddenPage` (`D8`) and unified sidebar landmarks.
     - `/candidate/jobs/:jobId` (`JobDetailPanel.tsx:72`): Preserved existing back link `"Quay lại trang ứng viên"` -> `/candidate` (verified in `/browser`).
     - **Pre-existing `375px` horizontal overflows (Reported honestly, NOT modified per scope)**:
       - `/` (`PR #6`) and `/candidate/jobs` (`CandidateJobsPage` wrapping `JobRecommendationsSection`): `jobRecommendations.css:124-128` `.jobs-grid` uses `minmax(360px, 1fr)` without a mobile `@media` fallback, causing `.job-card` (`w=360` at `x=40.8`, right edge `400.8px > 375px`).
       - `/candidate/skills` (`HS-01`): `skillProfile.css:405-407` sets `grid-template-columns: minmax(0, 1fr) 24px` for 4 child elements in `SkillItem.tsx:26-73`, forcing `.sp-skill-meter` into the `24px` track and overflowing `375px` (`411px`).
   - **`cspell.json` Dictionary Update (Test Payload Tokens Only)**:
     - Added strictly `9` dictionary words in `cspell.json` for pre-existing identifier/URL-encoded bypass test payloads in two test files (zero inline `cspell:` directives anywhere): `"evals"` (`RoutePolicyRegistryTest.java:48,49,52` `evalsOf`) and `8` encoded path substrings (`"fevil"`, `"cevil"`, `"aevil"`, `"cogin"`, `"orgot"`, `"hange"`, `"eset"`, `"flogin"`) from `frontend/src/features/identity/__tests__/roleUtils.test.ts:87-143`.

2. **Tiếng Việt**:
   - **Chạm tối thiểu tệp Backend của đồng đội (Không đổi nghiệp vụ ngoài RBAC/OpenAPI)**:
     - `JobRecommendationController.java`: Bổ sung `@Content(schema = @Schema(implementation = ErrorResponse.class))` trên `@ApiResponse`.
     - `EvaluationTemplateController.java`: Bổ sung `@PreAuthorize("hasRole('MENTOR')")` khớp `RoutePolicyRegistry`.
     - `TargetPositionController.java` và `JobController.java`: Bổ sung `@PreAuthorize("isAuthenticated()")` và Javadoc/OpenAPI theo `D6` Nhóm B.
     - `GapAnalysisController.java` và `GapAnalysisIntegrationTest.java`: Bổ sung `@PreAuthorize("hasRole('CANDIDATE')")`, `@ApiResponse` `403`/`404` và test cho `D6` Nhóm A & B.
     - `EvaluationServiceImpl.java` và `ProfileEvaluationServiceImpl.java`: Tái cấu trúc kiểm tra sở hữu nội tuyến sang gọi `OwnershipGuard.requireSelf` / `OwnershipGuard.requireSelfOrRoles`, giữ nguyên hành vi.
   - **Thay đổi hợp đồng HS-01 (`D6` Nhóm A & C — Thông báo chủ sở hữu HS-01)**:
     - `GET /api/v1/profiles/me/skills` và `POST /api/v1/profiles/me/skills/recompute` chỉ cho `CANDIDATE` (`403` với vai trò khác).
     - `GET /api/v1/profiles/{userId}/skills` khóa đối xứng với `/evaluations`: `CANDIDATE` chỉ đọc của mình (`404` với người khác kể cả khi `is_public = true`), `HR` chỉ đọc hồ sơ `is_public = true` (`404` nếu riêng tư/thiếu), `MENTOR`/`STAFF`/`ADMIN` nhận `403`. Đã cập nhật `SkillProfileController.java`, `SkillProfileService.java`, `SkillProfileIntegrationTest.java`, `test_auth_boundaries.test.mjs` (`TC-T2-SKILL-02`), và `docs/hs-01-skill-profile.md`.
   - **Thay đổi hợp đồng DN-01 (`PUT /api/v1/companies/{id}` từ `404` -> `405` — Thông báo chủ sở hữu DN-01)**:
     - Khi `GET /api/v1/companies/{id}` đã được ánh xạ, `PUT /api/v1/companies/{id}` trả `405 METHOD_NOT_ALLOWED` cho `HR`/`STAFF` (cả công ty mình, công ty khác, ID thiếu), `403` cho vai trò khác, và `401` cho ẩn danh. Đã cập nhật `CompanySecurityIntegrationTest.java`, các E2E công ty (`tier2`, `tier3`, `tier4`), và `docs/dn01/{PHASE0_ACK,README,PR_DESCRIPTION}.md`.
   - **Chạm tệp Frontend & Lỗi tràn `375px` báo cáo không sửa**:
     - `frontend/nginx.conf`: Sửa tối thiểu 2 ký tự `location ^~ /api/` để tải Swagger UI trên `:3000/api/docs`.
     - `frontend/src/features/candidate/components/SkillProfilePage.tsx:113`: Bọc tối thiểu 1 dòng (`onClick={handleLogout}` -> `onClick={() => handleLogout()}`) để sự kiện `MouseEvent` không truyền nhầm vào `logout(options)`.
     - `CompanyProfileAccessibility.test.tsx`: Cập nhật 2 assertion sai vai trò từ redirect im lặng sang `ForbiddenPage` `403` tiếng Việt (`D8`) và landmark sidebar thống nhất.
     - `/candidate/jobs/:jobId` (`JobDetailPanel.tsx:72`): Giữ nguyên liên kết `"Quay lại trang ứng viên"` -> `/candidate` (đã xác minh trong `/browser`).
     - **Lỗi tràn ngang `375px` có sẵn (Báo cáo trung thực, KHÔNG sửa)**: `/` (`PR #6`) & `/candidate/jobs` (`jobRecommendations.css:124-128`, `400.8px > 375px`) và `/candidate/skills` (`HS-01`, `skillProfile.css:405-407` & `SkillItem.tsx:26-73`, `411px > 375px`).
   - **Cập nhật từ điển `cspell.json` (Chỉ phục vụ chuỗi kiểm thử hiện có)**:
     - Bổ sung đúng `9` từ vào `cspell.json` cho chuỗi test hiện có (0 chỉ thị `cspell:` inline): `"evals"` (`RoutePolicyRegistryTest.java:48,49,52` `evalsOf`) và `8` chuỗi URL-encoded bypass trong `frontend/src/features/identity/__tests__/roleUtils.test.ts:87-143` (`"fevil"`, `"cevil"`, `"aevil"`, `"cogin"`, `"orgot"`, `"hange"`, `"eset"`, `"flogin"`).

---

## 5. What Is NOT Done & Honest Coverage Notes / Phạm Vi Chưa Thực Hiện & Ghi Nhận Trung Thực

### 5.1. English

- **Disabled `"Sắp ra mắt"` Menu Pages**: `Ứng tuyển`, `Trợ lý AI` (`CANDIDATE`), `JD`, `Tuyển dụng`, `Thực tập sinh` (`HR`), `Cần đánh giá` (`MENTOR`), `Duyệt hồ sơ`, `Duyệt JD`, `Doanh nghiệp`, `Ghép thực tập`, `Báo cáo` (`STAFF`), and `Quản trị` (`ADMIN`) intentionally render disabled (`aria-disabled="true"`, `tabIndex={-1}`, `"Sắp ra mắt"`) until their respective business rounds build those screens.
- **Out-of-Scope Pre-Existing CSS Overflows**: `375px` overflows on `/` (`PR #6`), `/candidate/jobs` (inherited from `JobRecommendationsSection`), and `/candidate/skills` (`HS-01`) are documented in `docs/nt02/BROWSER_OBSERVATIONS.md` and left untouched.
- **Sandbox Limits in `/browser` (`4f13d835-58c2-4809-bb98-81bee2586afb` & `d7ae3948`)**: `webview_browser` blocks `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request`, and `page.route`, and direct `GET /api/docs` (`302`) triggers `net::ERR_ABORTED`. Therefore:
  - `/api/docs` `302 -> 200` on `:8080` & `:3000` is verified by E2E `TC-T1-DOCS-01`, while `/browser` opened `/api/swagger-ui/index.html` (`200 OK`, `12` tags, `27` operations, Bearer `Authorize` + `/api/v1/auth/me` -> `200`) on both `:8080` and `:3000` (`d7ae3948`), and verified all `F1` & `F4` flows on the rebuilt `:3000` stack (`4f13d835-58c2-4809-bb98-81bee2586afb`, `/assets/index-bvlZtaHC.js`).
  - `401 -> /login` API interception is verified by Vitest (`httpClient.test.ts`, `App.test.tsx`, `postLoginRedirect.test.tsx`), while `/browser` verified session reset + same-user return on `page.reload()`.
  - `Rule 09` score in `docs/nt02/BROWSER_OBSERVATIONS.md` is capped honestly at **`11 / 12`** (`C5 = 1 / 2` because `emulateMedia` is blocked in `webview_browser`).

### 5.2. Tiếng Việt

- **Các trang menu trạng thái `"Sắp ra mắt"`**: Các mục `Ứng tuyển`, `Trợ lý AI` (`CANDIDATE`), `JD`, `Tuyển dụng`, `Thực tập sinh` (`HR`), `Cần đánh giá` (`MENTOR`), `Duyệt hồ sơ`, `Duyệt JD`, `Doanh nghiệp`, `Ghép thực tập`, `Báo cáo` (`STAFF`), và `Quản trị` (`ADMIN`) được cố tình đặt ở trạng thái disabled (`aria-disabled="true"`, `tabIndex={-1}`, `"Sắp ra mắt"`) cho tới khi các đợt sau xây dựng trang nghiệp vụ tương ứng.
- **Lỗi tràn ngang CSS có sẵn ngoài phạm vi**: Lỗi tràn `375px` tại `/` (`PR #6`), `/candidate/jobs` (kế thừa từ `JobRecommendationsSection`), và `/candidate/skills` (`HS-01`) được ghi nhận trung thực trong `docs/nt02/BROWSER_OBSERVATIONS.md` và không tự ý sửa.
- **Giới hạn sandbox trong `/browser` (`4f13d835-58c2-4809-bb98-81bee2586afb` & `d7ae3948`)**: Công cụ `webview_browser` chặn `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request`, `page.route`, và gọi trực tiếp `GET /api/docs` (`302`) phát sinh `net::ERR_ABORTED`. Do đó:
  - Luồng `/api/docs` `302 -> 200` trên cả `:8080` & `:3000` được kiểm chứng bằng E2E `TC-T1-DOCS-01`, `/browser` mở `/api/swagger-ui/index.html` (`200 OK`, `12` tags, `27` operations, Bearer `Authorize` + `/api/v1/auth/me` -> `200`) trên `:8080` & `:3000` (`d7ae3948`), và xác minh toàn bộ luồng `F1` & `F4` trên stack `:3000` vừa build lại (`4f13d835-58c2-4809-bb98-81bee2586afb`, `/assets/index-bvlZtaHC.js`).
  - Cơ chế `401 -> /login` khi gọi API được chứng minh qua Vitest (`httpClient.test.ts`, `App.test.tsx`, `postLoginRedirect.test.tsx`), còn `/browser` kiểm chứng xóa phiên và quay lại đúng trang khi cùng người dùng `page.reload()`.
  - Điểm `Rule 09` trong `docs/nt02/BROWSER_OBSERVATIONS.md` được giữ trung thực ở mức **`11 / 12`** (`C5 = 1 / 2` do `emulateMedia` bị chặn trong `webview_browser`).

---

## 6. PR Screenshots (`34` PNGs) / Danh Sách `34` Ảnh Màn Hình Đính Kèm PR

- **English**: All `34` curated screenshots are stored in git-ignored `docs/nt02/pr-screenshots/`, indexed 1:1 in `docs/nt02/pr-screenshots/ORDER.txt`, and mapped in `docs/nt02/BROWSER_OBSERVATIONS.md` (`01-`..`03-` from `d7ae3948`; `04-`..`34-` from `4f13d835-58c2-4809-bb98-81bee2586afb`).
- **Tiếng Việt**: Toàn bộ `34` ảnh chụp được lưu trong thư mục bị git-ignore `docs/nt02/pr-screenshots/`, đối chiếu `1:1` trong `docs/nt02/pr-screenshots/ORDER.txt` và `docs/nt02/BROWSER_OBSERVATIONS.md` (`01-`..`03-` từ `d7ae3948`; `04-`..`34-` từ `4f13d835-58c2-4809-bb98-81bee2586afb`).

1. `01-openapi-8080-1440px-light.png` — Swagger UI on `:8080` (`12` tags, `27` operations, `TestErrorController` hidden) / Giao diện Swagger UI `:8080` (`12` tag, `27` operation, ẩn controller test)
2. `02-openapi-3000-authorized-me-200-1440px-light.png` — Swagger UI on Nginx `:3000` after Bearer `Authorize` + `GET /api/v1/auth/me -> 200` / Swagger UI `:3000` sau `Authorize` & gọi `/api/v1/auth/me` thành công `200`
3. `03-logged-out-redirect-login-1440px-light.png` — Logged-out protected routes -> `/login` (`0` flash) / Chưa đăng nhập truy cập trang bảo vệ -> `/login` (`0` nháy)
4. `04-hr1-must-change-password-no-sidebar-1440px-light.png` — `hr1` forced `/change-password` with `0` sidebar / Ép `hr1` đổi mật khẩu tại `/change-password` không có sidebar
5. `05-f1-case1-staff-sso-logout-hr2-home-1440px-light.png` — F1 Case 1: `staff1` LMS SSO -> logout -> `hr2` lands on `/hr` / F1 Ca 1: `staff1` LMS SSO -> đăng xuất -> `hr2` vào `/hr`
6. `06-f1-case2-hr2-logout-admin1-home-1440px-light.png` — F1 Case 2: `hr2` `/hr/company` -> logout -> `admin1` lands on `/admin` / F1 Ca 2: `hr2` `/hr/company` -> đăng xuất -> `admin1` vào `/admin`
7. `07-f1-case3-admin1-logout-candidate1-sso-home-1440px-light.png` — F1 Case 3: `admin1` -> logout -> `candidate1` 60s LMS SSO (`lms-sv-001`) lands on `/candidate` / F1 Ca 3: `admin1` -> đăng xuất -> `candidate1` LMS SSO vào `/candidate`
8. `08-skip-link-focused-1440px-light.png` — Skip link `"Bỏ qua tới nội dung chính"` (`224.54x44px` at `(8, 8)`) / Liên kết bỏ qua tới nội dung chính khi nhấn Tab đầu tiên
9. `09-candidate-sidebar-expanded-1440px-light.png` — `CANDIDATE` `/candidate` expanded left sidebar (`280px`, `44px` items) Light / Sidebar trái `CANDIDATE` mở rộng (`280px`) Sáng
10. `10-candidate-sidebar-expanded-1440px-dark.png` — `CANDIDATE` `/candidate` expanded left sidebar (`280px`) Dark / Sidebar trái `CANDIDATE` mở rộng (`280px`) Tối
11. `11-candidate-sidebar-collapsed-tooltip-1440px-light.png` — `CANDIDATE` collapsed rail (`72px`) + hover tooltip Light / Rail thu gọn `72px` + tooltip hover Sáng
12. `12-candidate-sidebar-collapsed-tooltip-1440px-dark.png` — `CANDIDATE` collapsed rail (`72px`) + keyboard focus tooltip Dark / Rail thu gọn `72px` + tooltip focus Tối
13. `13-candidate-skills-sidebar-1440px-light.png` — `CANDIDATE` `/candidate/skills` inside unified sidebar (`Hồ sơ` active) / Trang `/candidate/skills` với mục `"Hồ sơ"` đang chọn
14. `14-candidate-jobs-sidebar-1440px-light.png` — `CANDIDATE` `/candidate/jobs` inside unified sidebar (`Việc làm` active) / Trang `/candidate/jobs` với mục `"Việc làm"` đang chọn
15. `15-hr-sidebar-expanded-1440px-light.png` — `HR` `/hr` expanded left sidebar (`280px`, `36px` Dense items) Light / Sidebar trái `HR` mở rộng (`36px`) Sáng
16. `16-hr-sidebar-expanded-1440px-dark.png` — `HR` `/hr` expanded left sidebar (`280px`) Dark / Sidebar trái `HR` mở rộng Tối
17. `17-hr-company-sidebar-1440px-light.png` — `HR` `/hr/company` inside unified sidebar (`Công ty` active) / Hồ sơ Công ty với mục `"Công ty"` đang chọn
18. `18-mentor-sidebar-expanded-1440px-light.png` — `MENTOR` `/mentor` expanded left sidebar (`Trang chủ`, `Cần đánh giá` `"Sắp ra mắt"`) / Sidebar `MENTOR` mở rộng
19. `19-staff-sidebar-expanded-1440px-light.png` — `STAFF` `/staff` expanded left sidebar (`Trang chủ` + `5` `"Sắp ra mắt"` items, `0` ellipsis truncation) / Sidebar `STAFF` mở rộng (`0` cắt chữ)
20. `20-admin-sidebar-expanded-1440px-light.png` — `ADMIN` `/admin` expanded left sidebar (`Trang chủ`, `Quản trị` `"Sắp ra mắt"`) / Sidebar `ADMIN` mở rộng
21. `21-candidate-403-in-layout-1440px-light.png` — `CANDIDATE` `403` inside `SharedAppLayout` (`280px` sidebar, badge `"Ứng viên"`, `/candidate`) Light / Trang `403` `CANDIDATE` trong layout Sáng
22. `22-candidate-403-in-layout-1440px-dark.png` — `CANDIDATE` `403` inside `SharedAppLayout` Dark / Trang `403` `CANDIDATE` trong layout Tối
23. `23-hr-403-in-layout-1440px-light.png` — `HR` `403` inside `SharedAppLayout` (`HR` sidebar preserved) / Trang `403` `HR` trong layout
24. `24-mentor-403-in-layout-1440px-light.png` — `MENTOR` `403` inside `SharedAppLayout` (`MENTOR` sidebar preserved) / Trang `403` `MENTOR` trong layout
25. `25-staff-403-in-layout-1440px-light.png` — `STAFF` `403` inside `SharedAppLayout` (`STAFF` sidebar preserved) / Trang `403` `STAFF` trong layout
26. `26-admin-403-in-layout-1440px-light.png` — `ADMIN` `403` inside `SharedAppLayout` (`ADMIN` sidebar preserved) / Trang `403` `ADMIN` trong layout
27. `27-candidate-sidebar-1024px-collapsed-light.png` — `CANDIDATE` `/candidate` at `1024x768` (`72px` default collapsed rail, `0` overflow) / Bố cục `1024x768` thu gọn mặc định `72px`
28. `28-candidate-sidebar-768px-collapsed-light.png` — `CANDIDATE` `/candidate` at `768x1024` (`72px` default collapsed rail, `0` overflow) Light / Bố cục `768x1024` thu gọn `72px` Sáng
29. `29-candidate-sidebar-768px-collapsed-dark.png` — `CANDIDATE` `/candidate` at `768x1024` (`72px` collapsed rail, `0` overflow) Dark / Bố cục `768x1024` thu gọn `72px` Tối
30. `30-candidate-drawer-open-375px-light.png` — `CANDIDATE` `375x812` open modal drawer (`280x812`, `44x44` buttons, `44px` items, `0` truncation) Light / Drawer mobile `CANDIDATE` Sáng
31. `31-candidate-drawer-open-375px-dark.png` — `CANDIDATE` `375x812` open modal drawer Dark / Drawer mobile `CANDIDATE` Tối
32. `32-hr-drawer-open-375px-light.png` — `HR` `375x812` open modal drawer (`44px` elevated items, `0` truncation) / Drawer mobile `HR` (`44px`, `0` cắt chữ)
33. `33-candidate-403-in-layout-375px-light.png` — `CANDIDATE` `403` inside `SharedAppLayout` at `375x812` (`44x44` menu toggle, `375.2px`, `0` overflow) / Trang `403` trong layout mobile `375px`
34. `34-sidebar-focus-visible-1440px-light.png` — Sidebar keyboard `:focus-visible` outline ring / Vòng focus bàn phím `:focus-visible` trên sidebar

---

## 7. Verified Empirical Metrics / Số Liệu Kiểm Định Thực Tế

### 7.1. English

- **Docker Compose Opaque-Box E2E (`docker compose up -d --build --wait` -> `node e2e/run-all.mjs` -> `docker compose down -v`)**: `26 / 26` suites, `323 / 323` test cases, `1939` assertions (`10834` lines, `36.29s`, exit `0`); post-teardown `docker ps -a`, `docker volume ls`, `docker network ls` filtered by `rikkei` are 100% empty.
- **External & Cloudinary Mock (`node mock/test-runner.js`)**: `8 / 8` criteria + Cloudinary mock extension PASS (exit `0`).
- **Backend (`.\mvnw.cmd clean test spotless:check spotbugs:check` & `.\mvnw.cmd test -D "test=Rbac*IntegrationTest"` on JDK 25)**: `641 / 641` tests PASS across `59` test classes (`99 / 99` RBAC tests in `RbacEndpointPolicyCoverageIntegrationTest` & `RbacPermissionMatrixIntegrationTest`, plus `OpenApiCoverageIntegrationTest`, `OwnershipGuardTest`, `RoutePolicyRegistryTest`), Spotless clean, SpotBugs `0` bugs (unchanged baseline in `NT-02-fix` with `0` backend edits).
- **Frontend (`npm run lint`, `typecheck`, `test`, `build`)**: `32 / 32` test files (`342 / 342` tests PASS), ESLint `0` errors, TypeScript `0` errors, Vite build PASS, `120 / 120` contrast pairs PASS (`compute-contrast.mjs`: `61` Light + `59` Dark + `9` surface invariants + `10` UI border invariants).
- **Quality Gates & Hygiene (`.\check.ps1`, `./check.sh`, linters, sync)**: `26 / 26` active runtime gates PASS identically on Windows PowerShell and Git Bash; `sync-agent-config.mjs --check` (`168` mirror files, `0` drift), `validate-agent-config.mjs` (`10 / 10` PASS), `check-gate-sync.mjs` (`29/26/3/23/25` PASS), `check-version-drift.mjs` (PASS), `markdownlint-cli2` (`0` issues), `cspell` (`0` issues, `0` inline directives).

### 7.2. Tiếng Việt

- **E2E hộp đen trên Docker Compose (`docker compose up -d --build --wait` -> `node e2e/run-all.mjs` -> `docker compose down -v`)**: Đạt `26 / 26` suite, `323 / 323` ca kiểm thử, `1939` assertion (`10834` dòng, `36.29s`, exit `0`); sau khi dọn dẹp, `docker ps -a`, `docker volume ls`, `docker network ls` lọc theo `rikkei` trống 100%.
- **Mock LMS & Cloudinary (`node mock/test-runner.js`)**: Đạt `8 / 8` tiêu chí + Cloudinary mock extension (exit `0`).
- **Backend (`.\mvnw.cmd clean test spotless:check spotbugs:check` & `.\mvnw.cmd test -D "test=Rbac*IntegrationTest"` trên JDK 25)**: Đạt `641 / 641` test trên `59` lớp test (`99 / 99` test RBAC trong `RbacEndpointPolicyCoverageIntegrationTest` & `RbacPermissionMatrixIntegrationTest`, cùng `OpenApiCoverageIntegrationTest`, `OwnershipGuardTest`, `RoutePolicyRegistryTest`), Spotless sạch, SpotBugs `0` lỗi (giữ nguyên hoàn toàn trong `NT-02-fix`, `0` sửa đổi backend).
- **Frontend (`npm run lint`, `typecheck`, `test`, `build`)**: Đạt `32 / 32` tệp test (`342 / 342` test PASS), ESLint `0` lỗi, TypeScript `0` lỗi, Vite build thành công, `120 / 120` cặp tương phản đạt chuẩn (`compute-contrast.mjs`: `61` Light + `59` Dark + `9` surface invariants + `10` UI border invariants).
- **Cổng chất lượng & Vệ sinh repo (`.\check.ps1`, `./check.sh`, linter, sync)**: Đạt `26 / 26` cổng hoạt động đồng nhất trên PowerShell và Git Bash; `sync-agent-config.mjs --check` (`168` tệp mirror, `0` sai lệch), `validate-agent-config.mjs` (`10 / 10` PASS), `check-gate-sync.mjs` (`29/26/3/23/25` PASS), `check-version-drift.mjs` (PASS), `markdownlint-cli2` (`0` lỗi), `cspell` (`0` lỗi, `0` chỉ thị inline).

---

## 8. Proposed Ordered `T022BB1:` Commits on Top of `348aadf` / Đề Xuất Chuỗi Commit Theo Thứ Tự

- **English**: The 7 ordered commits below cover `117 / 117` modified and untracked non-ignored paths verified in `git status --porcelain=v1 -uall` (`docs/nt02/pr-screenshots/` stays git-ignored per `.gitignore`).
- **Tiếng Việt**: 7 commit theo thứ tự dưới đây bao phủ đầy đủ `117 / 117` tệp đã sửa và mới tạo (không bị git-ignore) đã kiểm chứng trong `git status --porcelain=v1 -uall` (`docs/nt02/pr-screenshots/` được bỏ qua theo `.gitignore`).

1. `T022BB1: docs(erd): document 22 production tables, module ownership and scalar relations`
   - `docs/erd/README.md`
2. `T022BB1: feat(security): add declarative RoutePolicyRegistry, OwnershipGuard, GET /companies/{id} and RBAC tests`
   - `backend/src/main/java/com/rikkei/jobs/common/security/PolicyAccessType.java`
   - `backend/src/main/java/com/rikkei/jobs/common/security/RoutePolicy.java`
   - `backend/src/main/java/com/rikkei/jobs/common/security/RoutePolicyRegistry.java`
   - `backend/src/main/java/com/rikkei/jobs/common/security/OwnershipGuard.java`
   - `backend/src/main/java/com/rikkei/jobs/common/security/SecurityConfig.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/security/MustChangePasswordFilter.java`
   - `backend/src/main/java/com/rikkei/jobs/company/controller/CompanyProfileController.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/CompanyService.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/impl/CompanyServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/company/controller/JobController.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/controller/GapAnalysisController.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/controller/SkillProfileController.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/controller/TargetPositionController.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/service/SkillProfileService.java`
   - `backend/src/main/java/com/rikkei/jobs/candidate/service/impl/ProfileEvaluationServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/assessment/controller/EvaluationTemplateController.java`
   - `backend/src/main/java/com/rikkei/jobs/assessment/service/impl/EvaluationServiceImpl.java`
   - `backend/src/test/java/com/rikkei/jobs/common/security/OwnershipGuardTest.java`
   - `backend/src/test/java/com/rikkei/jobs/common/security/RoutePolicyRegistryTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/RbacEndpointPolicyCoverageIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/RbacPermissionMatrixIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/service/CompanyServiceImplTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/security/CompanySecurityIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/candidate/GapAnalysisIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/candidate/SkillProfileIntegrationTest.java`
3. `T022BB1: feat(openapi): expose dev Swagger UI at /api/docs on :8080 and :3000 with full endpoint coverage`
   - `backend/src/main/resources/application.yml`
   - `backend/src/main/java/com/rikkei/jobs/common/config/OpenApiConfig.java`
   - `backend/src/main/java/com/rikkei/jobs/common/config/LegacyOpenApiController.java`
   - `backend/src/main/java/com/rikkei/jobs/common/config/LegacySwaggerUiRedirectController.java`
   - `backend/src/main/java/com/rikkei/jobs/common/controller/TestErrorController.java`
   - `backend/src/main/java/com/rikkei/jobs/common/health/HealthController.java`
   - `backend/src/main/java/com/rikkei/jobs/ai/controller/JobRecommendationController.java`
   - `backend/src/test/java/com/rikkei/jobs/security/OpenApiCoverageIntegrationTest.java`
   - `frontend/nginx.conf`
4. `T022BB1: feat(frontend): add collapsible sidebar SharedAppLayout, single-source routePolicies, 403 in layout, post-logout redirect fix and Vitest suites`
   - `frontend/src/shared/styles/design-tokens.css`
   - `frontend/src/shared/api/httpClient.ts`
   - `frontend/src/shared/components/Icon.tsx`
   - `frontend/src/features/identity/config/routePolicies.ts`
   - `frontend/src/features/identity/config/roleMenuConfig.ts`
   - `frontend/src/features/identity/context/authContextDef.ts`
   - `frontend/src/features/identity/context/AuthContext.tsx`
   - `frontend/src/features/identity/utils/roleUtils.ts`
   - `frontend/src/features/identity/guards/RequireAuth.tsx`
   - `frontend/src/features/identity/guards/RequireMustChangePassword.tsx`
   - `frontend/src/features/identity/guards/RequireRole.tsx`
   - `frontend/src/features/identity/components/EnterpriseLoginForm.tsx`
   - `frontend/src/features/identity/components/LmsLoginForm.tsx`
   - `frontend/src/features/identity/components/SharedAppLayout.tsx`
   - `frontend/src/features/identity/pages/LoginPage.tsx`
   - `frontend/src/features/identity/pages/SsoCallbackPage.tsx`
   - `frontend/src/features/identity/pages/ChangePasswordPage.tsx`
   - `frontend/src/features/identity/pages/ForbiddenPage.tsx`
   - `frontend/src/features/identity/pages/role-homes/CandidateJobsPage.tsx`
   - `frontend/src/features/identity/pages/role-homes/RoleHomeLayout.tsx`
   - `frontend/src/features/identity/index.ts`
   - `frontend/src/features/identity/styles/identity.css`
   - `frontend/src/features/candidate/components/SkillProfilePage.tsx`
   - `frontend/src/App.tsx`
   - `frontend/src/App.test.tsx`
   - `frontend/src/shared/api/__tests__/httpClient.test.ts`
   - `frontend/src/shared/components/Icon.test.tsx`
   - `frontend/src/features/identity/__tests__/AuthContext.test.tsx`
   - `frontend/src/features/identity/__tests__/ChangePasswordPage.test.tsx`
   - `frontend/src/features/identity/__tests__/ForbiddenPage.test.tsx`
   - `frontend/src/features/identity/__tests__/RoleHomes.test.tsx`
   - `frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx`
   - `frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx`
   - `frontend/src/features/identity/__tests__/roleUtils.test.ts`
   - `frontend/src/features/identity/__tests__/guards.test.tsx`
   - `frontend/src/features/identity/__tests__/adversarial_security.test.tsx`
   - `frontend/src/features/company/__tests__/CompanyProfileAccessibility.test.tsx`
5. `T022BB1: test(e2e): add OpenAPI /api/docs and 5-role RBAC boundary E2E suites`
   - `e2e/README.md`
   - `e2e/helpers/http-client.mjs`
   - `e2e/run-all.mjs`
   - `e2e/tier1-features/test_openapi_docs.test.mjs`
   - `e2e/tier2-boundaries/test_rbac_matrix_boundaries.test.mjs`
   - `e2e/tier2-boundaries/test_auth_boundaries.test.mjs`
   - `e2e/tier2-boundaries/test_company_boundaries.test.mjs`
   - `e2e/tier3-combinations/test_company_combinations.test.mjs`
   - `e2e/tier4-scenarios/test_company_scenarios.test.mjs`
6. `T022BB1: docs(nt02): add bilingual RBAC/sidebar/design-system docs, PR description, browser observations and update README/contracts`
   - `.gitignore`
   - `README.md`
   - `docs/04-security-secrets-policy.md`
   - `docs/conventions.md`
   - `docs/design/DESIGN_SYSTEM.md`
   - `docs/hs-01-skill-profile.md`
   - `docs/dn01/PHASE0_ACK.md`
   - `docs/dn01/PR_DESCRIPTION.md`
   - `docs/dn01/README.md`
   - `docs/nt02/PHASE0_ACK.md`
   - `docs/nt02/permission-matrix.md`
   - `docs/nt02/README.md`
   - `docs/nt02/BROWSER_OBSERVATIONS.md`
   - `docs/nt02/PR_DESCRIPTION.md`
7. `T022BB1: chore(agent-config): update cspell dictionary, rules/skills for NT-02 RBAC, Rule 07 403 message, /api/docs and baselines and sync mirrors`
   - `cspell.json`
   - `agent-config/rules/05-backend-java.md`
   - `agent-config/rules/07-security-rbac.md`
   - `agent-config/rules/10-testing-strategy.md`
   - `agent-config/rules/14-backend-module-boundaries.md`
   - `agent-config/rules/16-backend-integrations.md`
   - `agent-config/skills/api-contract-and-errors/SKILL.md`
   - `agent-config/skills/spring-security-rbac-endpoint/SKILL.md`
   - `.claude/rules/05-backend-java.md`
   - `.claude/rules/07-security-rbac.md`
   - `.claude/rules/10-testing-strategy.md`
   - `.claude/rules/14-backend-module-boundaries.md`
   - `.claude/rules/16-backend-integrations.md`
   - `.claude/skills/api-contract-and-errors/SKILL.md`
   - `.claude/skills/spring-security-rbac-endpoint/SKILL.md`
   - `.gemini/rules/05-backend-java.md`
   - `.gemini/rules/07-security-rbac.md`
   - `.gemini/rules/10-testing-strategy.md`
   - `.gemini/rules/14-backend-module-boundaries.md`
   - `.gemini/rules/16-backend-integrations.md`
   - `.gemini/skills/api-contract-and-errors/SKILL.md`
   - `.gemini/skills/spring-security-rbac-endpoint/SKILL.md`
