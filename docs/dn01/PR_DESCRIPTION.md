# `[DN-01]` Doanh nghiệp: hồ sơ công ty, tài khoản HR (`T0231B5`)

> **GitHub Pull Request Title (without Markdown backticks)**: `[DN-01] Doanh nghiệp: hồ sơ công ty, tài khoản HR (T0231B5)`

## Pull Request Metadata / Thông Tin Pull Request

- **Task Code / Mã nhiệm vụ**: `T0231B5`
- **Feature Code / Mã tính năng**: `` `[DN-01]` ``
- **Source Branch / Nhánh nguồn**: `feature/T0231B5-ho-so-cong-ty`
- **Target Branch / Nhánh đích**: `develop` (base commit `fb4e771`, with PR `#6` and PR `#14` already merged)
- **Open Related PRs / PR liên quan đang mở**: `#13` (`origin/feature/T023552-candidate-application` `26a40fb`) — PR `#6` (`d3106de`) and PR `#14` (`4cfce19`) are already merged in `fb4e771`

---

## 1. Executive Summary & Key Changes / Tóm Tắt Tổng Quan & Thay Đổi Chính

### 1.1. English

This PR implements Rounds DN-01, DN-01-fix, DN-01-cloud, DN-01-polish, and DN-01-polish2 (`T0231B5`) on top of `origin/develop` (`fb4e771`): company creation and HR account provisioning by operational staff (`STAFF`), automated Vietnamese HR onboarding email delivery via Mailpit, HR self-service company profile editing and Cloudinary CDN logo management (`HR`), shared typed Vietnamese enum localization (`frontend/src/shared/i18n/enumLabels.ts` — keeping `HR` -> `"HR"` and `MENTOR` -> `"Mentor"` per user decision, translating `CANDIDATE`/`STAFF`/`ADMIN` and account/company statuses with full diacritics, and replacing every raw enum / `"N/A"` UI label with `"Không xác định"` fallback), and a custom WAI-ARIA APG accessible `<Select>` combobox/listbox (`Select.tsx`, `Select.css` — Portal `role="listbox"`, `<Icon name="check" />`, `>= 44px` option height, `375px` flip-up, hidden `<select>` `useLayoutEffect` sync, keyboard `Enter`/`Space` synthetic click suppression, dead native popup rules removed while preserving global `color-scheme`, `88/88` Light/Dark contrast pairs PASS), alongside `button { font: inherit; }`, Light Mode role badge WCAG AA contrast (`>= 4.5:1`), and `docs/design/DESIGN_SYSTEM.md` Sections 12 & 13. Following the project owner's architectural decision, company logos are stored on Cloudinary CDN (`LogoStorage` port -> `CloudinaryLogoStorage` adapter -> `ExternalApiClient.postFormUrlEncoded` outside `@Transactional`, short `TransactionTemplate` DB update, `502 LOGO_STORAGE_UNAVAILABLE` on storage failure) and rendered directly via `<img src={logoUrl} referrerPolicy="no-referrer">` without exposing real credentials. All changes enforce header-first bounded logo validation (`<= 4,096` px/side, `<= 16,777,216` pixels), require `@Version` on `PUT /api/v1/companies/me`, bound `server.tomcat.max-swallow-size: 5MB`, extend `mock/server.js` (`/cloudinary/*` + `POST /mock/cloudinary/fail-next`), harden `ProdEnvironmentValidator`, disclose the shared `RoleHomeLayout` Light/Dark toggle and minimal cross-feature localization/polish diffs (`index.css`, `App.tsx`, `App.css`, `health.ts`, `features/*/index.ts`, `SsoCallbackPage.tsx`, role home pages, `GapAnalysisSection.tsx`, `gapAnalysis.css`, `jobRecommendations.css` dead `.candidate-select` removal, and token-only alignment on `candidateEvaluations.css` & `skillProfile.css`), and document live browser measurements (`9 / 12` pre-D1..D7 -> **`11 / 12`** locked Rule 09 score in `docs/dn01/BROWSER_OBSERVATIONS.md`, with `C5 = 1/2` capped honestly because `webview_browser` blocks `page.emulateMedia` and `page.evaluate`).

### 1.2. Tiếng Việt

Pull Request này hoàn thiện tính năng DN-01, vòng sửa lỗi DN-01-fix, vòng chuyển lưu trữ Cloudinary CDN DN-01-cloud, vòng chuẩn hóa giao diện DN-01-polish và vòng hoàn thiện DN-01-polish2 (`T0231B5`) trên nền `origin/develop` (`fb4e771`): cán bộ (`STAFF`) tạo doanh nghiệp và cấp phát tài khoản HR (gửi email tiếng Việt qua Mailpit kèm mật khẩu tạm ngẫu nhiên, bắt buộc đổi mật khẩu lần đầu), màn hình và API cho HR tự cập nhật hồ sơ công ty và tải lên logo (`HR`), chuẩn hóa nhãn vai trò/trạng thái dùng chung (`frontend/src/shared/i18n/enumLabels.ts` — giữ nguyên `HR` -> `"HR"` và `MENTOR` -> `"Mentor"` theo quyết định người dùng, Việt hóa đầy đủ dấu `CANDIDATE`/`STAFF`/`ADMIN` cùng trạng thái tài khoản/công ty và thay thế mọi mã enum thô/`"N/A"` bằng fallback `"Không xác định"`), và thành phần `<Select>` WAI-ARIA APG tùy biến (`Select.tsx`, `Select.css` — Portal `role="listbox"`, `<Icon name="check" />`, option `>= 44px`, tự lật lên trên ở `375px`, đồng bộ `useLayoutEffect` `<select>` ẩn, triệt tiêu synthetic click sau `Enter`/`Space`, gỡ bỏ CSS native popup chết trong khi giữ `color-scheme` toàn cục, `88/88` cặp tương phản Sáng/Tối PASS), kết hợp `button { font: inherit; }`, độ tương phản WCAG AA (`>= 4.5:1`) cho role badge Light Mode và tài liệu `docs/design/DESIGN_SYSTEM.md` Mục 12 & 13. Theo quyết định kiến trúc của chủ sở hữu dự án, logo doanh nghiệp được lưu trên Cloudinary CDN (port `LogoStorage` -> `CloudinaryLogoStorage` -> `ExternalApiClient.postFormUrlEncoded` chạy bên ngoài `@Transactional`, cập nhật CSDL trong giao dịch ngắn `TransactionTemplate`, trả `502 LOGO_STORAGE_UNAVAILABLE` nếu lỗi lưu trữ) và hiển thị trực tiếp qua `<img src={logoUrl} referrerPolicy="no-referrer">` mà không lộ thông tin bí mật. Toàn bộ thay đổi kiểm tra kích thước ảnh từ header chống OOM (`<= 4,096` px/chiều, `<= 16,777,216` pixel), bắt buộc `version` trên `PUT /api/v1/companies/me`, giới hạn `server.tomcat.max-swallow-size: 5MB`, mở rộng `mock/server.js` (`/cloudinary/*` + `POST /mock/cloudinary/fail-next`), bổ sung kiểm tra `ProdEnvironmentValidator`, công khai nút chuyển Sáng/Tối ở `RoleHomeLayout` cùng chỉnh sửa tối thiểu liên phân hệ (`index.css`, `App.tsx`, `App.css`, `health.ts`, `features/*/index.ts`, `SsoCallbackPage.tsx`, các trang chủ vai trò, `GapAnalysisSection.tsx`, `gapAnalysis.css`, xóa `.candidate-select` thừa ở `jobRecommendations.css`, và căn chỉnh token CSS thuần tại `candidateEvaluations.css` & `skillProfile.css`), đồng thời ghi nhận số liệu thực đo trình duyệt (`9 / 12` trước sửa D1–D7 -> **`11 / 12`** trong `docs/dn01/BROWSER_OBSERVATIONS.md`, với `C5 = 1/2` giữ trung thực do sandbox `webview_browser` chặn `page.emulateMedia` và `page.evaluate`).

### 1.3. Summary of Changes / Bảng Tóm Tắt Thay Đổi

| Area / Phân hệ | Summary (English) | Tóm tắt (Tiếng Việt) |
|---|---|---|
| **Database (`V9`, `V10`) & Merge (`F1`, `F3`, `C2`)** | Added idempotent `V9__company_profile.sql` (`companies` with `logo_url` + `logo_public_id`, scalar `created_by`, CHECK constraints, indexes; `V9` directly edited prior to `develop` merge) and dev seed `V10__dev_company_seed.sql` (companies 1 & 2 matching `hr1` & `hr2`, preserving 9 dev users). Coexists cleanly with `V11..V14` (`7` prod / `14` dev migrations from empty DB); local DBs already at `develop` `V14` require `docker compose down -v` because `outOfOrder=false`. | Thêm `V9__company_profile.sql` idempotent (`companies` gồm `logo_url` + `logo_public_id`, `created_by` vô hướng, ràng buộc CHECK, index; chỉnh trực tiếp `V9` vì chưa merge vào `develop`) và seed dev `V10__dev_company_seed.sql` (công ty 1 & 2 khớp `hr1`, `hr2`, giữ nguyên 9 users dev). Đồng tồn tại với `V11..V14` (`7` prod / `14` dev từ DB rỗng); máy dev đã ở `V14` cần chạy `docker compose down -v` vì `outOfOrder=false`. |
| **Company & Identity Backend (`C1`, `C3`, `C4`)** | Added `company` module (`StaffCompanyController`, `CompanyProfileController` with 5 DN-01 operations, `CompanyServiceImpl` keeping validation & upload outside `@Transactional` + short `TransactionTemplate`, `LogoStorage` port + `CloudinaryLogoStorage` SHA-1 adapter, `CloudinaryProperties` masked `toString()`, header-first `CompanyLogoValidator` `4,096` / `16,777,216` px, manual `CompanyMapper`, immutable Java `record` DTOs with `@NotNull` `version`), `ExternalApiClient.postFormUrlEncoded` (no `X-Service-Key` to third parties, max 1 network retry, zero body/query/secret logs), `502 LOGO_STORAGE_UNAVAILABLE`, `ProdEnvironmentValidator` Cloudinary checks, `IdentityPublicService` HR provisioning (`SecureRandom`, BCrypt, `REQUIRES_NEW` commit before Mailpit), `SecurityConfig`, `GlobalExceptionHandler`, and `application.yml` (`max-swallow-size: 5MB`, dummy Cloudinary defaults). | Bổ sung module `company` (5 thao tác DN-01, `CompanyServiceImpl` kiểm tra và upload ngoài `@Transactional` + `TransactionTemplate` ngắn, port `LogoStorage` + `CloudinaryLogoStorage` ký SHA-1, `CloudinaryProperties` che thông tin trong `toString()`, `CompanyLogoValidator` `4,096` / `16,777,216` px, mapper thủ công, DTO `record` với `version` `@NotNull`), `ExternalApiClient.postFormUrlEncoded` (không gửi `X-Service-Key` ra ngoài, tối đa 1 retry mạng, không log bí mật), `502 LOGO_STORAGE_UNAVAILABLE`, `ProdEnvironmentValidator`, `IdentityPublicService` tạo HR (`SecureRandom`, BCrypt, `REQUIRES_NEW` trước khi gửi Mailpit), `SecurityConfig`, `GlobalExceptionHandler` và `application.yml` (`max-swallow-size: 5MB`, mặc định Cloudinary giả lập). |
| **Local Mock & Docker Compose (`C4`, `C5`)** | Extended `mock/server.js` with an isolated `/cloudinary/*` router (no `X-Service-Key`, `5mb` `urlencoded` upload + SHA-1 verification returning `401` on mismatch, direct `GET` delivery with `Content-Type`, optional `destroy`, `PUBLIC_BASE_URL` default `http://127.0.0.1:9000`) and 5th testing tool (`POST /mock/cloudinary/fail-next`), updated `mock/test-runner.js` & `docs/mock-contract.md` (EN+VI), added `.env.example` Cloudinary placeholders, and minimally added `${VAR:-dummy}` pass-through variables to `docker-compose.yml` (verified via 3-scenario `scripts/run-ci-in-docker.ps1`). | Mở rộng `mock/server.js` với router `/cloudinary/*` tách biệt (không dùng `X-Service-Key`, upload + kiểm tra SHA-1 trả `401` nếu sai, delivery trả bytes + `Content-Type`, `destroy`, `PUBLIC_BASE_URL` mặc định `http://127.0.0.1:9000`) và công cụ test thứ 5 (`POST /mock/cloudinary/fail-next`), cập nhật `mock/test-runner.js` & `docs/mock-contract.md` (EN+VI), thêm `.env.example` và cập nhật tối thiểu `${VAR:-dummy}` trong `docker-compose.yml` (kiểm chứng đủ 3 kịch bản `scripts/run-ci-in-docker.ps1`). |
| **Frontend (`enumLabels`, Custom `Select`, `/hr/company`, `C7` & `F6`)** | Preserved `FormData` upload in `httpClient.ts`, added `upload` & `check` icons (`Icon.tsx`), created shared `enumLabels.ts` + `enumLabels.test.ts` (replacing every raw enum/`"N/A"` UI label across `RoleHomeLayout`, `CompanyStatusBadge`, `SsoCallbackPage`, `health.ts`, `ModuleCard`/`features/*/index.ts`, and role home pages while keeping `HR`/`Mentor` untranslated per user decision), built custom WAI-ARIA APG `<Select>` (`Select.tsx`, `Select.css`, `Select.test.tsx` incl. Finding A keyboard-click suppression & Finding B React 19 `useLayoutEffect` sync, `design-tokens.css` Light/Dark Select & role badge WCAG AA contrast tokens + dead native popup rule removal while keeping global `color-scheme`, `docs/design/DESIGN_SYSTEM.md` Sections 12 & 13), added global `button { font: inherit; }` (`index.css`), built `features/company/` (`CompanyProfilePage`, `CompanyProfileForm` with `spellCheck={false}`, `CompanyLogoPanel` rendering `<img src={logoUrl} referrerPolicy="no-referrer">` with skeleton/fade-in/fallback/`502` Retry/drag-drop/reduced-motion/`CLS=0`, `CompanyStatusBadge`, hooks enforcing required `version` + refresh on save and logo upload, `.cp-page .cp-main-card` specificity CSS), updated `frontend/nginx.conf` (`client_max_body_size 3m`, zero CSP, never proxies mock/cloudinary), linked from `HrHomePage` & `App.tsx`, polished shared auth/candidate sizing (`App.css`, `identity.css`, minimal `GapAnalysisSection.tsx` / `gapAnalysis.css`, dead `.candidate-select` removal in `jobRecommendations.css`, and pure-token alignment in `candidateEvaluations.css` / `skillProfile.css`), and disclosed `RoleHomeLayout.tsx` Light/Dark toggle. | Giữ `FormData` trong `httpClient.ts`, thêm icon `upload` & `check` (`Icon.tsx`), tạo `enumLabels.ts` + `enumLabels.test.ts` (thay mọi enum thô/`"N/A"` trên `RoleHomeLayout`, `CompanyStatusBadge`, `SsoCallbackPage`, `health.ts`, `features/*/index.ts` và các trang chủ vai trò theo quyết định giữ `HR`/`Mentor`), xây dựng custom WAI-ARIA APG `<Select>` (`Select.tsx`, `Select.css`, `Select.test.tsx` gồm sửa Finding A/B, `design-tokens.css` token Light/Dark cho Select & role badge `>= 4.5:1` + xóa rule native popup chết nhưng giữ `color-scheme` toàn cục, `DESIGN_SYSTEM.md` Mục 12 & 13), thêm reset `button { font: inherit; }` (`index.css`), xây dựng `features/company/` tại `/hr/company` (`CompanyProfileForm` có `spellCheck={false}`, `CompanyLogoPanel` hiển thị `<img src={logoUrl} referrerPolicy="no-referrer">` kèm skeleton/fade-in/fallback/nút Thử lại `502`/kéo-thả/reduced-motion/`CLS=0`, làm mới `version` sau lưu và upload, CSS `.cp-page .cp-main-card`), cập nhật `nginx.conf` (`client_max_body_size 3m`, không CSP, không proxy mock), liên kết từ `HrHomePage`, chuẩn hóa `App.css`/`identity.css` và chỉnh tối thiểu tại `GapAnalysisSection.tsx` / `gapAnalysis.css` / `jobRecommendations.css` / `candidateEvaluations.css` / `skillProfile.css`, công khai nút Sáng/Tối ở `RoleHomeLayout.tsx`. |
| **Testing, Docs & Agent-Config (`C6`, `C9`, `C10`)** | Updated backend tests (`526` total = `426` `origin/develop` + `100` DN-01/DN-01-cloud), frontend Vitest/a11y tests (`28` files / `242` tests), `mock/test-runner.js`, 4-tier E2E suites (`24/304/1,702`), `88/88` contrast pairs, bilingual `docs/dn01/*` + `docs/design/DESIGN_SYSTEM.md` + `docs/conventions.md` + `docs/04-security-secrets-policy.md` + `README.md` + `cspell.json`, and synced `agent-config/` to `.claude/` + `.gemini/` (`10/10` PASS). | Cập nhật test backend (`526`), frontend Vitest (`28` files / `242` tests), `mock/test-runner.js`, E2E 4 tầng (`24/304/1,702`), `88/88` cặp tương phản, tài liệu song ngữ `docs/dn01/*` + `docs/design/DESIGN_SYSTEM.md` + `docs/conventions.md` + `docs/04-security-secrets-policy.md` + `README.md` + `cspell.json`, và đồng bộ `agent-config/` sang `.claude/` + `.gemini/` (`10/10` PASS). |

---

## 2. Security Review Checklist & Architectural Decisions / Bảo Mật & Kiến Trúc

- **IDOR Prevention (`404` Masking & 5 DN-01 Operations)**: `GET/PUT /api/v1/companies/me` and `POST /api/v1/companies/me/logo` resolve `principal.getCompanyId()` strictly from the authenticated JWT principal (legacy `GET /api/v1/companies/me/logo` removed). In DN-01 pre-NT02, `PUT /api/v1/companies/{idOfCompanyB}` matched no route and returned `404 NOT_FOUND`; as of Round NT-02 (`D6`), `GET /api/v1/companies/{id}` is mapped (`HR` own -> `200`, cross-company -> `404`, `STAFF` -> `200`/`404`), so `PUT /api/v1/companies/{id}` now returns `405 METHOD_NOT_ALLOWED` with unified `ErrorResponse {code, message}` uniformly for own, cross-tenant, and nonexistent IDs (DB unchanged; anonymous -> `401`).
- **Mass Assignment & Immutability**: `UpdateCompanyRequest` omits `taxCode` and `status` completely and sets `@JsonIgnoreProperties(ignoreUnknown = true)`. Attempts to inject `taxCode` or `status` cannot mutate database fields.
- **Mandatory Optimistic Locking (`@Version`)**: `UpdateCompanyRequest.version` is required (`@NotNull` -> `400 VALIDATION_ERROR` when omitted; `CompanyServiceImpl` also guards defensively). Stale versions trigger `ObjectOptimisticLockingFailureException` -> `409 CONFLICT` handled by `GlobalExceptionHandler` and surfaced in the UI with a reload recovery action.
- **Header-First Upload Hardening, Transaction Boundary & Cloudinary CDN (`C1`, `C3`)**: `CompanyLogoValidator` enforces exact `1..2,097,152` byte bounds (`2,097,153` rejected `413`), verifies magic bytes (`PNG` / `JPEG`) matching extension, reads `reader.getWidth(0)` / `reader.getHeight(0)` from the `ImageIO` header BEFORE `reader.read(0)` pixel allocation (`1..4,096` px/side and `<= 16,777,216` total pixels per Team Lead Option A), decodes valid images, and rejects SVG/GIF/WebP/PDF, polyglot markup (`<svg`, `<script`, `<html`, `<!doctype`), path traversal (`..`, `/`, `\`), and 32 dangerous intermediate extensions (e.g., `a.php.jpg`, `evil.svg.png`). Validation and Cloudinary upload (`LogoStorage` -> `CloudinaryLogoStorage` -> `ExternalApiClient.postFormUrlEncoded` with max 1 network retry within timeout and `secure_url` prefix validation against `CLOUDINARY_DELIVERY_BASE_URL`) execute completely **outside** `@Transactional`, opening a short `TransactionTemplate` DB transaction only to update `companies.logo_url`, `logo_public_id`, and `updated_at`. Storage failures leave the DB unchanged and return `502 LOGO_STORAGE_UNAVAILABLE` with clean Vietnamese `ErrorResponse` (`"Không thể lưu trữ logo doanh nghiệp lúc này, vui lòng thử lại sau"`) without exposing provider details/URL/key. `application.yml` bounds `server.tomcat.max-swallow-size: 5MB` (`2 MB` passes `200`, `2 MB + 1 B` returns `413 PAYLOAD_TOO_LARGE` JSON on both `:3000` and `:8080`, `20 MB` rejected `413`).
- **Public CDN URL Privacy Note (`C3`)**: Uploaded company logos are rendered directly from public Cloudinary CDN URLs (`<img src={logoUrl} referrerPolicy="no-referrer">`) without cookie or Bearer auth. This is intentional because company logos are public enterprise brand assets (never candidate PII or private documents).
- **Clean Literal Constants (`F5.4`)**: Zero split-string spell-checker workarounds remain in backend, frontend, or E2E code (`"nosniff"`, `"phar"`, `"jspx"`, `"IHDR"`, `"IDAT"`, `"IEND"`, `"endobj"`), with legitimate technical terms registered in `cspell.json`.
- **Credential, Log Hygiene & Secret Rotation Recommendation (`C4`, `C9`)**: Temporary HR passwords (14-char `SecureRandom`, BCrypt-only, masked `CreateHrAccountRequest.toString()`) and Cloudinary credentials (`CloudinaryProperties` masked `toString()`, `ExternalApiClient` never attaching `X-Service-Key` to third-party URLs and never logging bodies/queries/secrets) are proven absent from `DEBUG` logs via SLF4J `ListAppender` and live `docker compose logs backend`. `ProdEnvironmentValidator` fails fast in `prod` on blank, dummy (`dev-cloud`, `dev-secret`, `dummy`, `your-*`), non-`https://`, or mock/loopback Cloudinary URLs. **Security Recommendation (`C9`)**: Because the real Cloudinary API secret used by the Team Lead was shared in a chat channel, rotate the Cloudinary API secret on the Cloudinary console immediately after project delivery.
- **SMTP Header Injection Defense**: `@NoControlCharacters` rejects CR (`\r`), LF (`\n`), control characters (`< 0x20`), and Unicode line/paragraph separators on `email` and `fullName`; HTML email body escapes `fullName` via `HtmlUtils.htmlEscape`.
- **SQL Parameterization & OpenAPI Prod Guard**: All queries use Spring Data JPA / parameterized SQL. `application-prod.yml` explicitly disables `/api-docs` and `/swagger-ui.html`.

---

## 3. How to Run, Sample Data & Migration Note / Hướng Dẫn Chạy, Dữ Liệu Mẫu & Di Trú CSDL

### 3.1. Commands / Lệnh thực thi

```powershell
# Recreate local DB cleanly if previously on develop V14, then boot full Docker stack (ports 3000, 8080, 8025, 9000, 5433)
docker compose down -v
docker compose up -d --build --wait

# Run E2E against live stack
node e2e/run-all.mjs

# Backend unit + Testcontainers + Spotless + SpotBugs (JDK 25)
Push-Location backend; .\mvnw.cmd clean test spotless:check spotbugs:check; Pop-Location

# Frontend checks
npm run lint --prefix frontend
npm run typecheck --prefix frontend
npm test --prefix frontend -- --run
npm run build --prefix frontend

# External & Cloudinary Mock Integration Suite
node mock/test-runner.js

# Quality Gates (Windows PowerShell & Git Bash)
.\check.ps1

# Isolated Docker CI Harness (verify 3 host isolation scenarios)
powershell -ExecutionPolicy Bypass -File scripts/run-ci-in-docker.ps1
```

### 3.2. Dev Seed Sample Data (`V6` + `V10`, Development Only)

- **Company 1**: `Công ty Cổ phần Công nghệ Nam Phương` (`tax_code = 0109283746`, `ACTIVE`) — linked HR: `hr1@rikkeijobs.test` (`Test@123`, `must_change_password = true`).
- **Company 2**: `Công ty Cổ phần Giải pháp Số Đông Dương` (`tax_code = 0314829105001`, `ACTIVE`) — linked HR: `hr2@rikkeijobs.test` (`Test@123`, `must_change_password = false`).
- **Staff**: `staff1@rikkeijobs.test` (`lmsUserId = lms-st-001`, `STAFF`, `created_by = 7`).
- **Total Dev Seed Users**: `9` (`V2 + V6 + V8` untouched).

### 3.3. Local Database Migration Note (`F3`, `C2`) / Lưu Ý Di Trú CSDL Cục Bộ & Chỉnh Sửa `V9`

- **English**: Because `V9__company_profile.sql` and `V10__dev_company_seed.sql` are lower than `V11..V14` already merged into `develop` (`fb4e771`), and Flyway keeps `outOfOrder=false`, any pre-existing database already migrated to `V14` fails validation (`FlywayValidateException` on `9` and `10`). From a clean database, Flyway applies `7` production migrations (`V1, V3, V5, V7, V9, V11, V13`) or `14` dev migrations (`V1..V14`) in order, and `V10` (`companies` `1..2`) coexists with `V12` (`jobs` `company_id` `1..5` scalar). **Why `V9` was edited directly**: Because DN-01 is not yet merged into `develop`, `V9__company_profile.sql` was updated directly in place to keep `companies` (`logo_url` + `logo_public_id`) without leaving unused schema artifacts, while `V10` and `V11..V14` remain untouched. **Developers must recreate their local database (`docker compose down -v`) after pulling this branch.**
- **Tiếng Việt**: Vì `V9__company_profile.sql` và `V10__dev_company_seed.sql` có số phiên bản thấp hơn `V11..V14` đã merge trên `develop` (`fb4e771`) trong khi Flyway giữ `outOfOrder=false`, mọi CSDL cục bộ đang ở `V14` sẵn sẽ báo lỗi xác thực `FlywayValidateException` cho `9` và `10`. Từ CSDL rỗng, Flyway chạy tuần tự đủ `7` migration production hoặc `14` migration dev và đồng tồn tại bình thường giữa `V10` với `V12`. **Lý do chỉnh sửa trực tiếp `V9`**: Vì nhánh DN-01 chưa merge vào `develop`, `V9__company_profile.sql` được cập nhật trực tiếp tại chỗ để bổ sung `companies.logo_public_id` và giữ thiết kế bảng sạch mà không chạm vào `V10` hay `V11..V14`. **Lập trình viên bắt buộc tái tạo CSDL cục bộ (`docker compose down -v`) sau khi pull nhánh này.**

### 3.4. Mail Failure Recovery Behavior (`F5.5`) / Cơ Chế Khôi Phục Khi Gửi Mail Thất Bại

- **English**: If SMTP delivery fails during `POST /api/v1/staff/companies/{id}/hr-accounts`, the HR account remains committed in `users` and the API returns `502 EMAIL_DELIVERY_FAILED` without logging the plaintext password. Retrying the same email returns `409 CONFLICT`, and DN-01 does not expose a temporary-password resend endpoint. Live stack verification confirms the existing NT-01 forgot-password flow (`/api/v1/auth/forgot-password` -> `/api/v1/auth/reset-password`) recovers the account cleanly once mail delivery is restored. Follow-up added: `re-issue / resend HR onboarding mail (DN-05)`.
- **Tiếng Việt**: Nếu gửi SMTP thất bại ở `POST /api/v1/staff/companies/{id}/hr-accounts`, tài khoản HR vẫn được giữ lại và API trả `502 EMAIL_DELIVERY_FAILED` (không ghi log mật khẩu). Gọi lại cùng email sẽ trả `409 CONFLICT` và DN-01 chưa có API cấp lại mật khẩu tạm. Kiểm chứng thực tế trên stack xác nhận luồng quên mật khẩu sẵn có của NT-01 (`/api/v1/auth/forgot-password` -> `/api/v1/auth/reset-password`) khôi phục được tài khoản sau khi Mailpit hoạt động lại. Đề xuất follow-up: `re-issue / resend HR onboarding mail (DN-05)`.

### 3.5. Cloudinary Configuration, Official Signature Docs, Mock Extension & Real-Account Switch (`C1`, `C4`, `C5`, `C8`)

- **Official Cloudinary Signature Specification (Checked `2026-11-18`)**: `https://cloudinary.com/documentation/upload_images#generating_authentication_signatures` — SHA-1 over alphabetically sorted signed parameters (`invalidate`, `overwrite`, `public_id`, `timestamp`, `unique_filename`) joined with `&` + `api_secret` appended directly (`CloudinaryLogoStorageTest` proves `bfd09f95f331f558cbd1320e67aa8d488770583e` and `a21ad0f63beb4de2e5575204b79ab90bffb02c10`).
- **Environment Variable Names (Dummy `.env.example` Defaults Only — Zero Real Secrets)**: `CLOUDINARY_CLOUD_NAME` (`dev-cloud`), `CLOUDINARY_API_KEY` (`dev-key`), `CLOUDINARY_API_SECRET` (`dev-secret`), `CLOUDINARY_API_BASE_URL` (`.env.example:76` sets `http://mock:9000/cloudinary/v1_1` as an explicit placeholder, `.env.example:69` notes commenting it out falls back to mock, and local `.env` keeps it commented during mock testing), `CLOUDINARY_DELIVERY_BASE_URL` (`http://127.0.0.1:9000/cloudinary`), `CLOUDINARY_TIMEOUT_SECONDS` (`5`), `MOCK_PUBLIC_BASE_URL` (`http://127.0.0.1:9000`).
- **Trivial Switch to Real Cloudinary Account (`C8`)**: In git-ignored `.env`, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, set `CLOUDINARY_API_BASE_URL=https://api.cloudinary.com/v1_1`, set `CLOUDINARY_DELIVERY_BASE_URL=https://res.cloudinary.com/<your-cloud-name>/image/upload`, and restart `backend` (see `docs/dn01/README.md` Section 5.4 for full EN + VI steps).
- **Minimal `docker-compose.yml` & 3-Scenario Docker CI Harness (`C4`)**: `docker-compose.yml` adds only `${VAR:-dummy}` pass-through variables on `mock` and `backend` (no new named volumes). `scripts/run-ci-in-docker.ps1` is verified across all 3 scenarios: (1) dev stack running -> port-conflict fail-fast exit `1` on `{5433,8080,3000,9000,8025,1025}` leaving dev containers untouched; (2) dev stack stopped (`docker compose stop`) -> `` `[ISOLATION NOTICE]` ``, `docker-compose.override.yml`, 6/6 CI jobs PASS (`rikkei-ci-d18ffdf1`, `594s`, `Exit Code: 0`) leaving `rikkei_postgres_data` and `rikkei-network` untouched; (3) clean env (`docker compose down -v`) -> no `` `[ISOLATION NOTICE]` ``, 6/6 CI jobs PASS (`rikkei-ci-967e7351`, `502s`, `Exit Code: 0`) with 0 residual resources.

---

## 4. Verified Empirical Metrics / Số Liệu Kiểm Định Đo Đạc Thực Tế

- **Backend (`.\backend\mvnw.cmd -f backend/pom.xml clean test spotless:check spotbugs:check`)**: `526 / 526` tests PASS across `54` Surefire test classes (`0` failures, `0` errors, `0` skipped; incl. `CloudinaryLogoStorageTest`, `CloudinaryPropertiesTest`, `ExternalApiClientRobustnessTest`, `ProdEnvironmentValidatorTest`, `CompanyControllerIntegrationTest`, `CompanyLogoIntegrationTest`, `CompanyMapperTest`, `CompanySecurityIntegrationTest`, `CompanyLogoValidatorTest`, `CompanyServiceImplTest`, `IdentityPublicServiceImplTest`, `CompanyMigrationIntegrationTest`, `CompanyOpenApiProfileIntegrationTest`), Spotless `272` files clean, SpotBugs `0` bugs.
  - *Surefire 30s Fork-Kill Warning Note*: Pre-existing context-cache shutdown pressure (`33` `@SpringBootTest` / `34` `@Container` on `origin/develop` `fb4e771` vs `40 / 41` in working tree, Spring `DefaultContextCache = 32`). `SecurityHardeningIntegrationTest` runs `25 / 25` isolated in `01:07 min` with `0` warnings (and `git diff fb4e771` adds only Cloudinary test properties and `6 -> 7` migration assertions), while full-run dump `backend/target/surefire-reports/2026-11-18T16-07-00_811-jvmRun1.dump` (and `.dumpstream`) shows `main` waiting inside `ApplicationShutdownHooks` -> `"SpringApplicationShutdownHook"` -> `HikariPool.shutdown` -> `ThreadPoolExecutor.awaitTermination` across cached contexts (`21` active `HikariPool-*` / `12` `container-*` / `27` `HttpClient-*` pools in the dump). Not caused by an unclosed DN-01/DN-01-cloud executor or HTTP server.
- **Frontend (`npm test --prefix frontend -- --run`, `lint`, `typecheck`, `build`)**: `28 / 28` test files (`242 / 242` tests PASS, incl. `enumLabels.test.ts` `14/14`, `CompanyStatusBadge.test.tsx` `3/3`, `RoleHomes.test.tsx` `32/32`, `Select.test.tsx` `22/22` with Finding A & B regression tests, `CompanyProfilePage.test.tsx`, `CompanyProfileApi.test.ts`, `CompanyProfileAccessibility.test.tsx`, `httpClient.test.ts`, `Icon.test.tsx`, `accessibility_wcag.test.tsx`, `AuthRedesignM4.test.tsx`), ESLint `0` errors, TypeScript `0` errors, Vite build `PASS`, Check 9 `0` raw color literals, `88 / 88` contrast pairs PASS (`node scripts/compute-contrast.mjs`), `0` `Content-Security-Policy` headers in `frontend/nginx.conf`.
- **External & Cloudinary Mock (`node mock/test-runner.js`)**: PASS (`11` business endpoints + `/cloudinary/*` SHA-1 upload/delivery/destroy + `5` testing tools incl. `POST /mock/cloudinary/fail-next`).
- **Opaque-Box E2E (`node e2e/run-all.mjs`)**: `24 / 24` suites, `304 / 304` test cases, `1,702` assertions (`9,524` lines) PASS on a fresh Docker Compose stack (`9` dev seed users, `0` secrets in `docker compose logs backend`).
- **Docker CI Harness (`scripts/run-ci-in-docker.ps1`)**: All 3 host isolation scenarios verified (Scenario 1 running dev stack fail-fast exit `1`; Scenario 2 stopped dev stack `` `[ISOLATION NOTICE]` `` + 6/6 CI jobs PASS in `594s` under `rikkei-ci-d18ffdf1`; Scenario 3 clean env 6/6 CI jobs PASS in `502s` under `rikkei-ci-967e7351` + 0 residual CI resources).
- **Quality Gates (`./check.sh` & `.\check.ps1`)**: `26 / 26` active runtime gates PASS identically on both scripts; `node scripts/sync-agent-config.mjs --check` (`168` mirror files, `0` drift); `node scripts/validate-agent-config.mjs` (`10 / 10` PASS); `node scripts/check-gate-sync.mjs` (`PASS`); `node scripts/check-version-drift.mjs` (`32 / 32` PASS); `markdownlint-cli2` (`0` issues); `cspell` (`0` issues, `0` inline directives); secret & conflict-marker scans (`0` issues).

---

## 5. OpenAPI `/api-docs` Note / Lưu Ý OpenAPI `/api-docs`

- Dev OpenAPI JSON spec is served at `http://127.0.0.1:8080/api-docs` (HTTP `200`, OpenAPI `3.1.0`; `http://127.0.0.1:8080/v3/api-docs` returns `404 NOT_FOUND`) and Swagger UI at `http://127.0.0.1:8080/swagger-ui.html`, covering all 5 DN-01 operations (`Staff Company Management` & `Company Profile`; legacy `GET /api/v1/companies/me/logo` removed), `bearerAuth` security scheme, `UpdateCompanyRequest` with `required: ["name", "version"]`, multipart `file` binary upload schema, and `ErrorResponse` payloads (`400/401/403/404/409/413/502`) without temporary password or Cloudinary secret examples.
- Production (`SPRING_PROFILES_ACTIVE=prod`) disables both endpoints (`springdoc.api-docs.enabled: false`, `springdoc.swagger-ui.enabled: false`), verified by `CompanyOpenApiProfileIntegrationTest` (`2 / 2` PASS).

---

## 6. PR Screenshots & Honest Coverage Notes / Ảnh Màn Hình Đính Kèm PR

*Git Hygiene*: `42` curated screenshot binaries (`01-`..`35-`, `37-`..`43-`; `36-` does not exist on disk because `webview_browser` did not delay API calls for `isSaving` disabled state, which is proven via Vitest + static CSS) are stored outside Git in git-ignored `docs/dn01/pr-screenshots/` (indexed 1:1 with source runs `a0e8a7ce`, `5dbb289a`, & `8cebc05c` in `docs/dn01/pr-screenshots/ORDER.txt`) and attached directly to the GitHub PR UI. Zero PNGs are committed.

1. `01-login-enterprise-1440px-light.png` — Enterprise login tab (`/login?tab=enterprise`) Desktop 1440px Light (`8cebc05c`)
2. `02-login-lms-1440px-light.png` — LMS SSO login tab (`/login?tab=lms`) Desktop 1440px Light (`8cebc05c`)
3. `03-login-enterprise-375px-light.png` — Enterprise login Mobile 375px Light (`5dbb289a`: single-line `44px` tabs + `24px` `"Quên mật khẩu?"`)
4. `04-forgot-password-1440px-light.png` — Forgot Password (`/forgot-password`) `44px` controls + `24px` link, Desktop 1440px Light (`8cebc05c`)
5. `05-reset-password-1440px-light.png` — Reset Password (`/reset-password/test-token`) `44px` inputs/toggles, Desktop 1440px Light (`8cebc05c`)
6. `06-change-password-1440px-light.png` — Forced first-login password change (`/change-password`) for `hr1`, Desktop 1440px Light (`8cebc05c`)
7. `07-hr-home-1440px-light.png` — HR Home (`/hr`) showing localized `"HR"` & `"Đang hoạt động"`, Dense Mode table + Company Profile card, Desktop 1440px Light (`a0e8a7ce`)
8. `08-hr-home-1440px-dark.png` — HR Home (`/hr`) Dark Mode showing localized `"HR"` & `"Đang hoạt động"`, Desktop 1440px Dark (`a0e8a7ce`)
9. `09-company-profile-closed-1440px-light.png` — `/hr/company` default closed custom WAI-ARIA `<Select>` (`#company-size`) matching `.rj-input` `44px` metrics & `"Đang hoạt động"`, Desktop 1440px Light (`a0e8a7ce`)
10. `10-company-profile-focus-visible-1440px-light.png` — `/hr/company` keyboard `:focus-visible` on custom `<Select>`, Desktop 1440px Light (`a0e8a7ce`)
11. `11-company-profile-hover-1440px-light.png` — `/hr/company` `:hover` on custom `<Select>`, Desktop 1440px Light (`a0e8a7ce`)
12. `12-company-profile-select-open-1440px-light.png` — `/hr/company` open custom DOM `.rj-select-listbox` with `<Icon name="check" />`, Desktop 1440px Light (`a0e8a7ce`)
13. `13-company-profile-invalid-1440px-light.png` — `/hr/company` `aria-invalid` inline validation error on `#company-name`, Desktop 1440px Light (`a0e8a7ce`)
14. `14-company-profile-filled-1440px-light.png` — `/hr/company` filled and saved state with success banner, Desktop 1440px Light (`a0e8a7ce`)
15. `15-company-profile-closed-1440px-dark.png` — `/hr/company` Dark Mode closed custom `<Select>`, Desktop 1440px Dark (`a0e8a7ce`)
16. `16-company-profile-focus-visible-1440px-dark.png` — `/hr/company` Dark Mode `:focus-visible` on custom `<Select>`, Desktop 1440px Dark (`a0e8a7ce`)
17. `17-company-profile-hover-1440px-dark.png` — `/hr/company` Dark Mode `:hover` on custom `<Select>`, Desktop 1440px Dark (`a0e8a7ce`)
18. `18-company-profile-select-open-1440px-dark.png` — `/hr/company` Dark Mode open custom DOM `.rj-select-listbox` (tokenized dark surface, active highlight, check icon), Desktop 1440px Dark (`a0e8a7ce`)
19. `19-company-profile-invalid-1440px-dark.png` — `/hr/company` Dark Mode `aria-invalid` inline validation state, Desktop 1440px Dark (`a0e8a7ce`)
20. `20-company-profile-filled-1440px-dark.png` — `/hr/company` Dark Mode filled & saved state, Desktop 1440px Dark (`a0e8a7ce`)
21. `21-company-profile-mobile-closed-375px-dark.png` — `/hr/company` Mobile 375px Dark Mode closed (`0` overflow), (`a0e8a7ce`)
22. `22-company-profile-mobile-select-open-375px-dark.png` — `/hr/company` Mobile 375px Dark Mode open custom DOM listbox automatically flipped upward (`` `[data-placement="top"]` ``, `0` overflow) (`a0e8a7ce`)
23. `23-candidate-home-1440px-light.png` — Candidate Home (`/candidate`) Light Mode showing `"Ứng viên"` & `"Đang hoạt động"`, Airy Mode table + `44px` buttons (`a0e8a7ce`)
24. `24-candidate-home-1440px-dark.png` — Candidate Home (`/candidate`) Dark Mode showing `"Ứng viên"` & `"Đang hoạt động"` (`a0e8a7ce`)
25. `25-candidate-skills-1440px-light.png` — Candidate Skill Profile (`/candidate/skills`) refreshed post-M4b snapshot (`a0e8a7ce`) showing `"Ứng viên"` header badge & single-line `44px` `.sp-btn` (`249.78 x 44` at `1440x900` & `262.45 x 44` at `375x812`)
26. `26-candidate-gap-analysis-closed-1440px-light.png` — Candidate Gap Analysis (`/candidate/gap-analysis`) closed custom `<Select>`, Desktop 1440px Light (`a0e8a7ce`)
27. `27-candidate-gap-analysis-select-open-1440px-light.png` — `/candidate/gap-analysis` open custom DOM `.rj-select-listbox`, Desktop 1440px Light (`a0e8a7ce`)
28. `28-candidate-gap-analysis-closed-1440px-dark.png` — `/candidate/gap-analysis` Dark Mode closed custom `<Select>`, Desktop 1440px Dark (`a0e8a7ce`)
29. `29-candidate-gap-analysis-select-open-1440px-dark.png` — `/candidate/gap-analysis` Dark Mode open custom DOM `.rj-select-listbox`, Desktop 1440px Dark (`a0e8a7ce`)
30. `30-candidate-evaluations-1440px-light.png` — Candidate Evaluations (`/candidate/evaluations`) Light Mode with `44px` quiet button (`8cebc05c`)
31. `31-candidate-jd-detail-1440px-light.png` — Candidate JD Detail (`/candidate/jobs/1`) Desktop 1440px Light (`8cebc05c`)
32. `32-candidate-jd-detail-1440px-dark.png` — Candidate JD Detail (`/candidate/jobs/1`) Desktop 1440px Dark (`8cebc05c`)
33. `33-home-loggedin-ai-recommendations-1440px-light.png` — Logged-in Candidate Home (`/`) AI Job Recommendations, Desktop 1440px Light (`8cebc05c`)
34. `34-home-loggedin-mobile-overflow-375px-light.png` — Logged-in `/` Mobile 375px Light (`8cebc05c`; documents pre-existing PR `#6` `.jobs-grid` horizontal overflow)
35. `35-company-profile-select-keyboard-selected-1440px-light.png` — `/hr/company` custom `<Select>` keyboard-selected state (`Arrow`/`Enter`) on `#company-size`, Desktop 1440px Light (`a0e8a7ce`)
36. *(Prefix `36-` absent on disk)* — Disabled form `<Select>` while `isSaving=true` was not captured in `webview_browser` (API completes immediately without request interception); disabled behavior is verified by Vitest (`Select.test.tsx`, `CompanyProfilePage.test.tsx`) and static CSS (`.rj-select:disabled`).
37. `37-company-profile-mobile-select-open-375px-light.png` — `/hr/company` Mobile 375px Light Mode open custom DOM listbox flipped upward (`` `[data-placement="top"]` ``, `0` overflow) (`a0e8a7ce`)
38. `38-candidate-gap-analysis-mobile-select-open-375px-light.png` — `/candidate/gap-analysis` Mobile 375px Light Mode open custom DOM listbox (`>= 44px` option height, `0` overflow) (`a0e8a7ce`)
39. `39-candidate-gap-analysis-mobile-select-open-375px-dark.png` — `/candidate/gap-analysis` Mobile 375px Dark Mode open custom DOM listbox (`0` overflow) (`a0e8a7ce`)
40. `40-staff-home-1440px-light.png` — Staff Home (`/staff`) Light Mode showing localized `"Nhân viên"` & `"Đang hoạt động"` (`a0e8a7ce`)
41. `41-staff-home-1440px-dark.png` — Staff Home (`/staff`) Dark Mode showing localized `"Nhân viên"` & `"Đang hoạt động"` (`a0e8a7ce`)
42. `42-mentor-home-1440px-light.png` — Mentor Home (`/mentor`) Light Mode showing `"Mentor"` (untranslated per user decision) & `"Đang hoạt động"` (`a0e8a7ce`)
43. `43-admin-home-1440px-light.png` — Admin Home (`/admin`) Light Mode showing localized `"Quản trị viên"` & `"Đang hoạt động"` (`a0e8a7ce`)

### 6.1. Global UI & Cross-Feature Minimal Diff Disclosure / Công Khai Thay Đổi Toàn Cục & Liên Phân Hệ

- **Global Light/Dark Toggle Disclosure (`RoleHomeLayout.tsx`)**:
  - *English*: The Light/Dark theme toggle button in `frontend/src/features/identity/pages/role-homes/RoleHomeLayout.tsx` applies to all authenticated role layouts (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`), which goes beyond the DN-01 acceptance checklist. It was kept because the round requires Light/Dark verification across screens and no switch previously existed. Unit tests in `frontend/src/features/identity/__tests__/accessibility_wcag.test.tsx` prove the toggle switches `data-theme` cleanly without writing to `localStorage`, `sessionStorage`, or `document.cookie`.
  - *Tiếng Việt*: Nút chuyển chế độ Sáng/Tối trong `RoleHomeLayout.tsx` tác động lên giao diện chung của mọi vai trò (nằm ngoài danh sách nghiệm thu riêng của DN-01), được giữ lại vì yêu cầu kiểm thử Sáng/Tối và hệ thống chưa có công tắc sẵn. Unit test tại `accessibility_wcag.test.tsx` chứng minh nút hoạt động chuẩn và hoàn toàn không lưu trạng thái vào `localStorage`, `sessionStorage` hay `document.cookie`.
- **Minimal Cross-Feature UI Polish Diffs (`index.css`, `App.tsx`, `App.css`, `GapAnalysisSection.tsx`, `gapAnalysis.css`, `jobRecommendations.css`, `candidateEvaluations.css`, `skillProfile.css`)**:
  - *English*: To fix `DN-01-polish` defects `U1`–`U3` and Team Lead findings `D1`–`D3`, `D6`, `D7` without altering teammate layout/JSX architecture: `frontend/src/index.css` adds the global `button { font: inherit; }` reset; `frontend/src/App.tsx` removes inline padding/fontSize on `a.rj-btn-primary`; `frontend/src/App.css` aligns `.refresh-btn` to `44px` (`--rj-density-button-height`), `6px` radius, `0.9375rem / 600`, and `150ms` transition; `frontend/src/features/candidate/components/GapAnalysisSection.tsx` & `gapAnalysis.css` replace the native `<select>` with shared `<Select>` (`#target-position-select`) and `.gap-field .rj-select-wrapper`; `frontend/src/features/candidate/styles/jobRecommendations.css` removes only the unused `.candidate-select` rule; and `frontend/src/features/candidate/styles/candidateEvaluations.css` & `frontend/src/features/candidate/skillProfile.css` apply a minimal pure-CSS token alignment (zero TSX/HTML edits) unifying `.ce-btn` and `.sp-btn` (`44px`, `8px 16px`, `6px`, `'Be Vietnam Pro'`, `0.9375rem / 600`, `150ms`, `2px` `--rj-color-focus-ring`, and `.ce-btn-quiet`/`.sp-btn-quiet` border `--rj-color-border-interactive`, keeping `.sp-btn` single-line `44px` on both `1440x900` `249.78 x 44` and `375x812` `262.45 x 44`), while preserving `.sp-skill-head` as an intentional `56px / radius 0` accordion row. Untouched teammate findings remain disclosed in `docs/dn01/BROWSER_OBSERVATIONS.md` (`D4`: PR `#6` `/` `.app-container` `-apple-system`, `.job-card` `10px`, `.apply-button`/`.details-button`/`.refresh-button` sizing, and `409px` mobile overflow at `requestedWidth = 375`; `D5`: `HS-01` `/candidate/skills` `411px` mobile overflow at `requestedWidth = 375`; `/candidate/jobs/1` `.jd-back` `24px`; and missing back links on `/candidate/skills`, `/candidate/gap-analysis`, `/candidate/evaluations`).
  - *Tiếng Việt*: Để xử lý lỗi `U1`–`U3` và các phát hiện `D1`–`D3`, `D6`, `D7` từ Team Lead mà không phá cấu trúc JSX/layout của đồng đội: `frontend/src/index.css` thêm reset toàn cục `button { font: inherit; }`; `frontend/src/App.tsx` bỏ inline padding/fontSize trên `a.rj-btn-primary`; `frontend/src/App.css` chuẩn hóa `.refresh-btn` (`44px`, bo `6px`, `0.9375rem / 600`, `150ms`); `GapAnalysisSection.tsx` & `gapAnalysis.css` chuyển `<select>` sang `<Select>` dùng chung (`#target-position-select`) và `.gap-field .rj-select-wrapper`; `jobRecommendations.css` chỉ xóa class thừa `.candidate-select`; và `candidateEvaluations.css` & `skillProfile.css` chỉ chỉnh CSS thuần theo token (không sửa TSX/HTML) để `.ce-btn`, `.sp-btn`, `.ce-btn-quiet`, `.sp-btn-quiet` đồng bộ kích thước/font/viền `--rj-color-border-interactive` với `.rj-btn` (giữ `.sp-btn` gọn 1 dòng `44px` trên cả `1440x900` `249.78 x 44` lẫn `375x812` `262.45 x 44`), đồng thời giữ `.sp-skill-head` là hàng accordion `56px / radius 0`. Các phát hiện thuộc mã nguồn đồng đội được giữ nguyên và công khai tại `docs/dn01/BROWSER_OBSERVATIONS.md` (`D4`: `PR #6` `/` `409px` tại `requestedWidth = 375`, `-apple-system` và kích thước nút của `jobRecommendations.css`; `D5`: `HS-01` `/candidate/skills` `411px` tại `requestedWidth = 375`; `/candidate/jobs/1` `.jd-back` `24px`; thiếu nút quay lại trên 3 trang candidate).
- **Honest Browser Verification Summary (`41d81ef1`, `8cebc05c`, `5dbb289a`, `a0e8a7ce`, & Team Lead Measurement Runs)**:
  - Four headless Playwright `/browser` runs inspected the live stack (`http://127.0.0.1:3000`): Baseline `41d81ef1` (reproduced U1–U3), Post-fix #2 `8cebc05c` (61 PNGs across all 13 HR + CANDIDATE routes), Post-fix #3 `5dbb289a` (20 PNGs verifying `index-BD-_Z-VO.css` and post-M4b `index-CD2hyvGG.css` Steps 72–74), and **Round `DN-01-polish2` `a0e8a7ce`** (`index-N261Tiub.css`, `31` new PNGs covering custom WAI-ARIA `<Select>` DOM listbox open in Light/Dark at `1440` & `375`, flip-up `` `[data-placement="top"]` ``, keyboard selection `35-`, post-M4b `25-`, and all 5 localized role homes `/hr`, `/candidate`, `/staff`, `/mentor`, `/admin`). Note honestly that the `webview_browser` sandbox blocks `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, and `page.emulateMedia`, so `a0e8a7ce` collected measurements via Playwright native locators and caught two real-Chromium issues in `Select.tsx` (**Finding A**: trailing synthetic `click` after `Enter`/`Space`; **Finding B**: React 19 `restoreControlledState` hidden `<select>.value` drift), both now fixed with regression tests in `Select.test.tsx`.
  - **Rule 09 Evidence Rubric (`9 / 12` pre-D1..D7 -> `11 / 12` `DN-01-polish2` locked)**: Re-scored strictly from `a0e8a7ce` `/browser` evidence, `88/88` `compute-contrast.mjs`, `28/242` Vitest, and Team Lead's post-M4b re-run (`C1=2`, `C2=2`, `C3=2`, `C4=2`, **`C5=1/2` capped honestly because `webview_browser` blocks `page.emulateMedia` and `page.evaluate`**, `C6=2`).
  - Earlier Round `DN-01-cloud` Pass A/B also verified interactive PNG/JPG upload (`valid-logo.png`, `valid-logo.jpg`), forced `502 LOGO_STORAGE_UNAVAILABLE` via `POST /mock/cloudinary/fail-next`, `"Thử lại"` recovery (`200 OK`), direct CDN `<img>` rendering (`referrerPolicy="no-referrer"`, `naturalWidth > 0`), and `409 CONFLICT` reload recovery. Mailpit HR onboarding email delivery was verified via Mailpit API/UI without exporting a screenshot containing a plaintext temporary password.

---

## 7. Open PR Conflict Report (`#13` Only) / Báo Cáo Xung Đột Với PR Đang Mở

PR `#6` (`65742a1` / `d3106de`) and PR `#14` (`fb4e771` / `4cfce19`) are **already merged** into `origin/develop` (`fb4e771`) and are already integrated into this branch. Only **PR `#13`** (`origin/feature/T023552-candidate-application`, commit `26a40fbe341cb445c7fa067e531487f1b37ee269`) remains open.

### 7.1. Migration & `companies` Table Comparison / Bảng Đối Chiếu Migration & Bảng `companies`

| PR / Ref | Prod Migration (`db/migration/`) | Dev Seed (`db/migration-dev/`) | `companies` Schema & Seed | Conflict Level with DN-01 & `develop` (`fb4e771`) |
|---|---|---|---|---|
| **DN-01 (`feature/T0231B5-ho-so-cong-ty`)** *(This PR)* | `V9__company_profile.sql` | `V10__dev_company_seed.sql` | `companies` (16 cols incl. `tax_code NOT NULL`, `size`, `address`, `city`, `website`, `logo_url`, `logo_public_id`, `description`, `status`, `created_by`, `version`); seed `id=1,2` matching `hr1,hr2` | **Cleanly layered on `develop` `fb4e771`** alongside `V11..V14` (prod `V1,V3,V5,V7,V9,V11,V13`; dev `V1..V14`). |
| **PR `#13` (`origin/feature/T023552-candidate-application`, `26a40fb`)** | `V3__create_recruitment_applications.sql`, `V4__create_used_sso_tickets.sql`, `V5__prevent_repeated_job_applications.sql`, `V6__create_company_job_descriptions.sql`, `V7__create_candidate_cv_files.sql`, `V8__store_application_cv_snapshots.sql` | `V3.1__seed_recruitment_dev_data.sql`, `V6.1__seed_company_jobs.sql`, `V8.1__seed_application_cv_snapshots.sql` | `companies(id, name VARCHAR(150) NOT NULL, hr_owner_user_id BIGINT NOT NULL UNIQUE, created_at, updated_at)` + `job_descriptions REFERENCES companies(id)`; `V6.1` seeds `(1, 'Rikkei Digital', 4)` and `(2, 'Rikkei Solutions', 5)`; declares `company/model/Company.java` & `CompanyRepository.java` | **SEVERE ARCHITECTURAL, MIGRATION & CLASS COLLISION**: Collides with `develop` `V3..V8` (duplicates `used_sso_tickets`), uses invalid decimal versions (`V3.1`, `V6.1`, `V8.1`), defines an incompatible `companies` table (`hr_owner_user_id NOT NULL UNIQUE` breaks 1-company-many-HR and `V10`), duplicates `Company.java` / `CompanyRepository.java`, and commits 13 `.gradle/**` build artifacts. |

### 7.2. Overlapping Source Files & Rebase Guidance for PR `#13` / Trùng Lặp Tệp & Hướng Dẫn Rebase PR `#13`

- **Shared files in PR `#13` (`26a40fb`) vs DN-01 / `develop`**: `SecurityConfig.java`, `UserRepository.java`, `application.yml`, `ProfileSeparationIntegrationTest.java`, `SecurityHardeningIntegrationTest.java`, `App.tsx`, plus duplicate `backend/src/main/java/com/rikkei/jobs/company/model/Company.java` and `backend/src/main/java/com/rikkei/jobs/company/repository/CompanyRepository.java`, and accidentally committed `.gradle/**` files (`13` files).
- **Actionable Guidance for PR `#13` Owner (after DN-01 merges to `develop`)**:
  1. Hard rebase `feature/T023552-candidate-application` onto post-DN-01 `develop`.
  2. Remove conflicting `V3..V8` (including duplicate `used_sso_tickets`), decimal `V*.1` migrations, duplicate `Company.java` / `CompanyRepository.java`, and all tracked `.gradle/**` artifacts.
  3. Reuse the DN-01 `companies` table (`V9`) and scalar `users.company_id` (instead of creating a second `companies` table with `hr_owner_user_id NOT NULL UNIQUE`).
  4. Renumber recruitment migrations sequentially starting from **`V15+`** (even/odd convention on top of `V1..V14`), and reconcile the 6 shared files (`SecurityConfig.java`, `UserRepository.java`, `application.yml`, `ProfileSeparationIntegrationTest.java`, `SecurityHardeningIntegrationTest.java`, `App.tsx`).

---

## 8. Follow-ups & Reviewer Checklist / Công Việc Tiếp Theo & Danh Mục Kiểm Tra

### 8.1. Follow-ups

1. **Rotate Cloudinary API Secret After Delivery (`C9` Security Recommendation)**: Because the real Cloudinary API secret used by the Team Lead was shared in a chat channel, rotate the Cloudinary API secret immediately in the Cloudinary console after project delivery and update `.env` / production secret stores.
2. **Public CDN URL Privacy Scope (`C3`)**: Company logos use public Cloudinary CDN URLs (`<img src={logoUrl} referrerPolicy="no-referrer">`); never reuse public-URL storage for private candidate CVs or verification files.
3. **`LOCKED` Company Policy**: Define login, edit, and public visibility rules when `companies.status = 'LOCKED'` in a follow-up task.
4. **Task `DN-05`**: Implement `STAFF` UI for company creation / HR provisioning, the full company profile experience, and `re-issue / resend HR onboarding mail (DN-05)` for accounts affected by SMTP `502` failures.
5. **Task `NT-02`**: Implement general system-wide role guards beyond the minimal DN-01 rules in `SecurityConfig`.
6. **Candidate `/` Mobile `375px` Layout (Pre-Existing PR `#6`)**: Adjust `.jobs-grid` `minmax(360px, 1fr)` in `frontend/src/features/candidate/styles/jobRecommendations.css` in an AI-01/UI follow-up so `375px` mobile viewports have zero horizontal overflow.

### 8.2. Reviewer Checklist

- [ ] `docs/dn01/PHASE0_ACK.md` sections `Round DN-01`, `Round DN-01-fix`, `Round DN-01-cloud`, `Round DN-01-polish`, and `Round DN-01-polish2` exist with all 16 rules, 28 skills, F1–F9, C1–C10, U1–U3/P1–P5, and R0–R3/V1–V5 proof plans, Team Lead F5.1 Option A decision, and user `HR`/`Mentor` role-label decision.
- [ ] `git diff --cached --name-only` is empty; `git grep -n -E '^(<<<<<<< |>>>>>>> )'` is empty; no `.env`, `*.pem`, real Cloudinary secrets, or binary screenshots committed (`docs/dn01/pr-screenshots/` ignored by `.gitignore`).
- [ ] Backend `526 / 526` (`.\backend\mvnw.cmd -f backend/pom.xml clean test spotless:check spotbugs:check`), Frontend `28 / 242` (`lint`, `typecheck`, `test`, `build`), Mock (`node mock/test-runner.js`), E2E `24 / 304 / 1,702` on fresh stack (`9` seed users, `0` secrets in backend logs), and 3-scenario `scripts/run-ci-in-docker.ps1` pass.
- [ ] `node scripts/sync-agent-config.mjs --check`, `node scripts/validate-agent-config.mjs` (`10/10`), `node scripts/check-gate-sync.mjs`, `node scripts/check-version-drift.mjs` (`32/32`), `node scripts/compute-contrast.mjs` (`88/88`), `markdownlint-cli2` (`0`), `cspell` (`0`), `./check.sh`, and `.\check.ps1` (`26 / 26` gates) pass.
- [ ] `docker compose down -v` leaves 0 `rikkei` containers, volumes, and networks.

---

## 9. Proposed Ordered `T0231B5:` Commits on Top of `fb4e771` / Đề Xuất Chuỗi Commit Theo Thứ Tự

1. `T0231B5: docs(dn01): add Phase 0 acknowledgements for DN-01 rounds`
   - `docs/dn01/PHASE0_ACK.md`
2. `T0231B5: feat(mock): add Cloudinary upload, delivery and failure-simulation endpoints`
   - `mock/server.js`
   - `mock/test-runner.js`
   - `mock/README.md`
   - `docs/mock-contract.md`
3. `T0231B5: chore(env): add Cloudinary environment placeholders and Compose defaults`
   - `.env.example`
   - `docker-compose.yml`
4. `T0231B5: feat(db): add company profile schema V9, dev seed V10 and migration tests`
   - `backend/src/main/resources/db/migration/V9__company_profile.sql`
   - `backend/src/main/resources/db/migration-dev/V10__dev_company_seed.sql`
   - `backend/src/test/java/com/rikkei/jobs/migration/CompanyMigrationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/DefaultProfileIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/migration/ProfileSeparationIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java`
5. `T0231B5: feat(identity): add HR account provisioning and post-commit onboarding mail`
   - `backend/src/main/java/com/rikkei/jobs/common/exception/EmailDeliveryException.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/dto/CreateHrUserCommand.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/dto/CreatedHrUserResult.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/dto/SendHrOnboardingEmailCommand.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/repository/UserRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/service/IdentityPublicService.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/service/MailService.java`
   - `backend/src/main/java/com/rikkei/jobs/identity/service/impl/IdentityPublicServiceImpl.java`
   - `backend/src/test/java/com/rikkei/jobs/identity/service/IdentityPublicServiceImplTest.java`
6. `T0231B5: feat(company): add company profile APIs, Cloudinary logo storage, RBAC and OpenAPI`
   - `backend/src/main/java/com/rikkei/jobs/common/client/ExternalApiClient.java`
   - `backend/src/main/java/com/rikkei/jobs/common/config/ProdEnvironmentValidator.java`
   - `backend/src/main/java/com/rikkei/jobs/common/exception/GlobalExceptionHandler.java`
   - `backend/src/main/java/com/rikkei/jobs/common/exception/LogoStorageUnavailableException.java`
   - `backend/src/main/java/com/rikkei/jobs/common/exception/PayloadTooLargeException.java`
   - `backend/src/main/java/com/rikkei/jobs/common/security/SecurityConfig.java`
   - `backend/src/main/resources/application.yml`
   - `backend/src/main/java/com/rikkei/jobs/company/package-info.java`
   - `backend/src/main/java/com/rikkei/jobs/company/config/CloudinaryProperties.java`
   - `backend/src/main/java/com/rikkei/jobs/company/controller/CompanyProfileController.java`
   - `backend/src/main/java/com/rikkei/jobs/company/controller/StaffCompanyController.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/request/CreateCompanyRequest.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/request/CreateHrAccountRequest.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/request/UpdateCompanyRequest.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/response/CompanyResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/company/dto/response/HrAccountResponse.java`
   - `backend/src/main/java/com/rikkei/jobs/company/mapper/CompanyMapper.java`
   - `backend/src/main/java/com/rikkei/jobs/company/model/Company.java`
   - `backend/src/main/java/com/rikkei/jobs/company/model/CompanyStatus.java`
   - `backend/src/main/java/com/rikkei/jobs/company/repository/CompanyRepository.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/CompanyLogoValidator.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/CompanyService.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/LogoStorage.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/impl/CloudinaryLogoStorage.java`
   - `backend/src/main/java/com/rikkei/jobs/company/service/impl/CompanyServiceImpl.java`
   - `backend/src/main/java/com/rikkei/jobs/company/validation/CompanySizeValidator.java`
   - `backend/src/main/java/com/rikkei/jobs/company/validation/HrEmailValidator.java`
   - `backend/src/main/java/com/rikkei/jobs/company/validation/HttpUrlValidator.java`
   - `backend/src/main/java/com/rikkei/jobs/company/validation/NoControlCharacters.java`
   - `backend/src/main/java/com/rikkei/jobs/company/validation/NoControlCharactersValidator.java`
   - `backend/src/main/java/com/rikkei/jobs/company/validation/ValidCompanySize.java`
   - `backend/src/main/java/com/rikkei/jobs/company/validation/ValidHrEmail.java`
   - `backend/src/main/java/com/rikkei/jobs/company/validation/ValidHttpUrl.java`
   - `backend/src/test/java/com/rikkei/jobs/challenger/Milestone2AdversarialStressTest.java`
   - `backend/src/test/java/com/rikkei/jobs/client/ExternalApiClientIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/client/ExternalApiClientRobustnessTest.java`
   - `backend/src/test/java/com/rikkei/jobs/config/ProdEnvironmentValidatorOrderingTest.java`
   - `backend/src/test/java/com/rikkei/jobs/config/ProdEnvironmentValidatorTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/CompanyControllerIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/CompanyLogoIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/CompanyTestImages.java`
   - `backend/src/test/java/com/rikkei/jobs/company/config/CloudinaryPropertiesTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/mapper/CompanyMapperTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/security/CompanySecurityIntegrationTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/service/CompanyLogoValidatorTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/service/CompanyServiceImplTest.java`
   - `backend/src/test/java/com/rikkei/jobs/company/service/impl/CloudinaryLogoStorageTest.java`
   - `backend/src/test/java/com/rikkei/jobs/security/CompanyOpenApiProfileIntegrationTest.java`
7. `T0231B5: feat(ui): add shared enumLabels module, custom WAI-ARIA Select, contrast tokens and DESIGN_SYSTEM docs`
   - `frontend/src/index.css`
   - `frontend/src/shared/styles/design-tokens.css`
   - `frontend/src/shared/i18n/enumLabels.ts`
   - `frontend/src/shared/i18n/enumLabels.test.ts`
   - `frontend/src/shared/components/Select.tsx`
   - `frontend/src/shared/components/Select.css`
   - `frontend/src/shared/components/Select.test.tsx`
   - `docs/design/DESIGN_SYSTEM.md`
8. `T0231B5: feat(frontend): add HR company profile screen, CDN logo display, localized role/status UI and polish`
   - `frontend/nginx.conf`
   - `frontend/src/shared/api/health.ts`
   - `frontend/src/shared/api/httpClient.ts`
   - `frontend/src/shared/api/__tests__/httpClient.test.ts`
   - `frontend/src/shared/components/Icon.tsx`
   - `frontend/src/shared/components/Icon.test.tsx`
   - `frontend/src/App.css`
   - `frontend/src/App.tsx`
   - `frontend/src/App.test.tsx`
   - `frontend/src/features/ai/index.ts`
   - `frontend/src/features/assessment/index.ts`
   - `frontend/src/features/candidate/index.ts`
   - `frontend/src/features/candidate/components/GapAnalysisSection.tsx`
   - `frontend/src/features/candidate/components/GapAnalysisSection.test.tsx`
   - `frontend/src/features/candidate/pages/CandidateEvaluationsPage.tsx`
   - `frontend/src/features/candidate/gapAnalysis.css`
   - `frontend/src/features/candidate/skillProfile.css`
   - `frontend/src/features/candidate/styles/candidateEvaluations.css`
   - `frontend/src/features/candidate/styles/jobRecommendations.css`
   - `frontend/src/features/identity/pages/SsoCallbackPage.tsx`
   - `frontend/src/features/identity/pages/role-homes/AdminHomePage.tsx`
   - `frontend/src/features/identity/pages/role-homes/CandidateGapAnalysisPage.tsx`
   - `frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx`
   - `frontend/src/features/identity/pages/role-homes/CandidateJobDetailPage.tsx`
   - `frontend/src/features/identity/pages/role-homes/CandidateSkillsPage.tsx`
   - `frontend/src/features/identity/pages/role-homes/HrHomePage.tsx`
   - `frontend/src/features/identity/pages/role-homes/MentorHomePage.tsx`
   - `frontend/src/features/identity/pages/role-homes/RoleHomeLayout.tsx`
   - `frontend/src/features/identity/pages/role-homes/StaffHomePage.tsx`
   - `frontend/src/features/identity/styles/identity.css`
   - `frontend/src/features/identity/__tests__/RoleHomes.test.tsx`
   - `frontend/src/features/identity/__tests__/SsoCallbackPage.test.tsx`
   - `frontend/src/features/identity/__tests__/accessibility_wcag.test.tsx`
   - `frontend/src/features/internship/index.ts`
   - `frontend/src/features/learning/index.ts`
   - `frontend/src/features/recruitment/index.ts`
   - `frontend/src/features/company/index.ts`
   - `frontend/src/features/company/api/companyProfile.ts`
   - `frontend/src/features/company/components/CompanyLogoPanel.tsx`
   - `frontend/src/features/company/components/CompanyProfileForm.tsx`
   - `frontend/src/features/company/components/CompanyStatusBadge.tsx`
   - `frontend/src/features/company/hooks/useCompanyLogo.ts`
   - `frontend/src/features/company/hooks/useCompanyProfile.ts`
   - `frontend/src/features/company/pages/CompanyProfilePage.tsx`
   - `frontend/src/features/company/styles/companyProfile.css`
   - `frontend/src/features/company/types/company.types.ts`
   - `frontend/src/features/company/utils/companyValidation.ts`
   - `frontend/src/features/company/__tests__/CompanyProfileAccessibility.test.tsx`
   - `frontend/src/features/company/__tests__/CompanyProfileApi.test.ts`
   - `frontend/src/features/company/__tests__/CompanyProfilePage.test.tsx`
   - `frontend/src/features/company/__tests__/CompanyStatusBadge.test.tsx`
9. `T0231B5: test(e2e): add 4-tier company profile, HR onboarding and Cloudinary E2E suites`
   - `e2e/README.md`
   - `e2e/config.mjs`
   - `e2e/run-all.mjs`
   - `e2e/helpers/http-client.mjs`
   - `e2e/helpers/company-fixtures.mjs`
   - `e2e/tier1-features/test_mock_4_tools.test.mjs`
   - `e2e/tier1-features/test_company_features.test.mjs`
   - `e2e/tier2-boundaries/test_company_boundaries.test.mjs`
   - `e2e/tier3-combinations/test_company_combinations.test.mjs`
   - `e2e/tier4-scenarios/test_company_scenarios.test.mjs`
10. `T0231B5: docs(dn01): update bilingual README, PR description, browser observations, security docs, conventions, gitignore and cspell`
    - `.gitignore`
    - `cspell.json`
    - `README.md`
    - `docs/04-security-secrets-policy.md`
    - `docs/conventions.md`
    - `docs/dn01/README.md`
    - `docs/dn01/PR_DESCRIPTION.md`
    - `docs/dn01/BROWSER_OBSERVATIONS.md`
    - *(Note: `docs/dn01/pr-screenshots/ORDER.txt` and `*.png` remain git-ignored per `.gitignore:100` and are never committed.)*
11. `T0231B5: chore(agent-config): update rules/skills for Cloudinary logo storage, testing counts and sync mirrors`
    - `agent-config/rules/05-backend-java.md`
    - `agent-config/rules/06-database-flyway.md`
    - `agent-config/rules/07-security-rbac.md`
    - `agent-config/rules/10-testing-strategy.md`
    - `agent-config/rules/13-backend-data-access-performance.md`
    - `agent-config/rules/14-backend-module-boundaries.md`
    - `agent-config/rules/16-backend-integrations.md`
    - `agent-config/skills/backend-module-boundaries/SKILL.md`
    - `agent-config/skills/ci-local-and-debug/SKILL.md`
    - `agent-config/skills/external-system-integration-and-mock/SKILL.md`
    - `agent-config/skills/module-domain-knowledge/SKILL.md`
    - `agent-config/skills/spring-security-rbac-endpoint/SKILL.md`
    - `.claude/rules/05-backend-java.md`, `.claude/rules/06-database-flyway.md`, `.claude/rules/07-security-rbac.md`, `.claude/rules/10-testing-strategy.md`, `.claude/rules/13-backend-data-access-performance.md`, `.claude/rules/14-backend-module-boundaries.md`, `.claude/rules/16-backend-integrations.md`
    - `.claude/skills/backend-module-boundaries/SKILL.md`, `.claude/skills/ci-local-and-debug/SKILL.md`, `.claude/skills/external-system-integration-and-mock/SKILL.md`, `.claude/skills/module-domain-knowledge/SKILL.md`, `.claude/skills/spring-security-rbac-endpoint/SKILL.md`
    - `.gemini/rules/05-backend-java.md`, `.gemini/rules/06-database-flyway.md`, `.gemini/rules/07-security-rbac.md`, `.gemini/rules/10-testing-strategy.md`, `.gemini/rules/13-backend-data-access-performance.md`, `.gemini/rules/14-backend-module-boundaries.md`, `.gemini/rules/16-backend-integrations.md`
    - `.gemini/skills/backend-module-boundaries/SKILL.md`, `.gemini/skills/ci-local-and-debug/SKILL.md`, `.gemini/skills/external-system-integration-and-mock/SKILL.md`, `.gemini/skills/module-domain-knowledge/SKILL.md`, `.gemini/skills/spring-security-rbac-endpoint/SKILL.md`
