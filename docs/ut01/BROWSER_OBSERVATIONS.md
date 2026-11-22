# `[UT-01]` Live Browser Observations & Measurements (`BROWSER_OBSERVATIONS.md` — `T023552`)

**Task Code / Mã nhiệm vụ**: `T023552`
**Feature / Phân hệ**: `[UT-01]` Candidate CV Application & Status Tracking (with HR Read-Only Views)
**Branch / Nhánh**: `feature/T023552-candidate-application`
**Origin / Nguồn**: `http://127.0.0.1:3000` (Nginx + React) & `http://127.0.0.1:8080` (Spring Boot API)

**Evidence Sources / Nguồn bằng chứng (tách bạch rõ 3 nguồn)**:

1. `[/browser]`: Direct Playwright native locator measurements (`boundingBox()`, `getAttribute()`, `innerText()`, `inputValue()`, `isVisible()`, `isEnabled()`, `keyboard.press()`, double-click, `mouse.wheel()`, `goBack()`, `goForward()`, `reload()`, `networkRequests()`, HUD `ConsoleErrors:`) across 4 live `/browser` passes via Parent (`78f066ff-a6a7-442b-bf5b-339bf74900c5`) minting fresh 60-second LMS SSO tickets:
   - **Pass 1** (`a3eb0e52`, `07:49:02Z–07:58:40Z`): Full 7-status coverage, viewports `375 / 768 / 1024 / 1440` Light & Dark, empty state (`lms-sv-002`), parity baseline, initial discovery of D1–D5 & D10.
   - **Pass 2** (`4d39c583`, `07:59:59Z–08:12:47Z`): Real-user interactions (left/right/double-click single POST on `id=1` and `id=2`, wheel scroll, keyboard focus trap & `Escape` focus return, Back/Forward/Reload, 200% zoom, ThemeSwitch, sidebar collapse/expand, `mentor1` login) + timed motion sequences (`0..800ms` / `0..300ms`), discovering D6–D9 & D7 Part 1.
   - **Pass 3** (`0fc5eb53`, `08:25:21Z–08:30:33Z`): Post-fix verification of D2 (`WithdrawDialog` & `ApplyDialog` validation), D3 (`.rj-recruitment-detail-job-link` `44px` height), and D7 Part 1 non-replay (`ut01-return-list-{0,300,800}ms.png` Cycles 1 & 2 after DB reseed).
   - **Pass 4** (`b779bdd6`, `08:33:59Z–08:40:04Z`, authoritative post-rebuild verification at **Steps 30–42** after `rikkei-frontend` rebuild at `08:37:35Z`): Confirmed **`no defects`** for both CHECK 1 (`aria-describedby="_r_d_ _r_e_"` pointing directly to `<p>` elements with `2001` Vietnamese diacritic chars, `aria-invalid="true"`, disabled submit) and CHECK 2 (non-duplicated D1 copy in `role="alert"` across `1440` Light/Dark and `375` Light).
2. `[Static CSS / Vitest / compute-contrast]`: Direct inspection of `design-tokens.css` & `recruitment.css`, `node scripts/compute-contrast.mjs` (`120/120 PASS`), `node scripts/validate-agent-config.mjs` (Check 9 `0` raw colors), and Vitest (`473/473` passing tests, `0` `act()` warnings, including `MyApplicationsPage.test.tsx` `prefers-reduced-motion` & `requestAnimationFrame` non-replay tests and `ApplyDialog.test.tsx` `ready`/`empty`/`409`/`503` states).
3. `[Backend Maven / E2E / Raw HTTP]`: `./mvnw test` (`878/878` across `74` classes), `RbacPermissionMatrixIntegrationTest` (`146/146`), `ApplicationIntegrationTest` (`15/15`), `HrNotificationListenerTest` (`3/3`), `CvSnapshotServiceTest` (`7/7`), `RoutePolicyRegistryTest` (`6/6`), `node e2e/run-all.mjs` (`28/28` suites), and raw HTTP / Mailpit verification.

---

## 1. Block A — Accounts & Seeded Data / Tài Khoản & Dữ Liệu Khởi Tạo

### 1.1. English

- **Live `/browser` Accounts**:
  - `lms-sv-001` (`candidate1@rikkeijobs.test`, `Nguyễn Văn An`, `user_id = 1`): Signed in via fresh 60-second LMS SSO tickets (`POST /api/v1/auth/sso -> 200 OK`) in Pass 1 (`781c4019952bf680d864a5a9a458050d`), Pass 2 (`69c3f3d43c6df56299e0984bc0def669`), Pass 3 (`053ead498fd1027df2125bdb47abeced`), and Pass 4 Steps 30–42 (`bf57076f8b4860dbf166028b838441de`). (In the initial Pass 4 attempt at `08:34Z` when ticket `d08db24a5ed2209e6e5716662b391a91` expired, login fell back cleanly to `#tab-enterprise` `POST /api/v1/auth/login -> 200`.)
  - `lms-sv-002` (`candidate2@rikkeijobs.test`, `Trần Thị Bình`, `user_id = 2`): `0` applications (used to verify empty state).
  - `lms-mt-001` (`mentor1@rikkeijobs.test`, `Phạm Quốc Dũng`): `MENTOR` role (verified absence of `"Ứng tuyển"` sidebar item and `/mentor` isolation).
  - **HR Accounts (`hr1`, `hr2`)**: `hr1@rikkeijobs.test` (`company_id = 1`, `must_change_password = true`) returns `403 MUST_CHANGE_PASSWORD`; `hr2@rikkeijobs.test` (`company_id = 2`, `must_change_password = false`) has read-only access to company 2 applications (`id = 1, 2`) and receives `404 NOT_FOUND` on company 1 jobs (`1, 6`). Verified at API/E2E level in `test_applications.test.mjs` and `ApplicationIntegrationTest` (UI HR views belong to `UT-02`).
- **Seeded Applications (`V20__dev_recruitment_seed.sql`, `user_id = 1`, verified across all 7 statuses + re-verified after Pass 3 reseed)**:
  - `id = 1`: `SUBMITTED` (`Fresher Java Developer` — FPT Software, `14:45 20/11/2026`, `job_id = 2`, `company_id = 2`)
  - `id = 2`: `SCREENING` (`Software QA / QC Engineer` — FPT Software, `14:45 18/11/2026` -> `14:45 19/11/2026`, `job_id = 8`, `company_id = 2`)
  - `id = 3`: `INTERVIEW` (`Kỹ sư Lập trình Java Backend (Junior/Middle)` — Rikkeisoft, `14:45 15/11/2026` -> `17/11` -> `20/11`, `job_id = 1`)
  - `id = 4`: `OFFER` (`Backend Engineer (Spring Boot)` — VTI Group, `14:45 11/11/2026` -> `13/11` -> `18/11` -> `02:45 21/11/2026`, `job_id = 3`)
  - `id = 5`: `HIRED` (`Frontend Developer (ReactJS)` — CMC Global, 5 history milestones `01/11/2026` -> `16/11/2026`, `job_id = 4`)
  - `id = 6`: `REJECTED` (`Fullstack Java & React Developer` — NashTech Vietnam, 3 milestones `03/11/2026` -> `09/11/2026`, `job_id = 5`)
  - `id = 7`: `WITHDRAWN` (`Database & Backend Specialist` — Rikkeisoft, 2 milestones `06/11/2026` -> `07/11/2026`, `job_id = 6`)
  - `job_id = 12` (`V12` expired `APPROVED` JD, `deadline = 2024-01-01`): Not returned in top-10 `/api/v1/me/job-recommendations?limit=10`; verified `400 JOB_NOT_ELIGIBLE` (`"Vị trí tuyển dụng đã hết hạn nộp hồ sơ ứng tuyển."`) via E2E & integration tests.

### 1.2. Tiếng Việt

- **Tài khoản kiểm chứng trên `/browser`**:
  - `lms-sv-001` (`candidate1@rikkeijobs.test`, `Nguyễn Văn An`, `user_id = 1`): Đăng nhập bằng vé LMS SSO 60 giây mới (`POST /api/v1/auth/sso -> 200 OK`) ở Pass 1 (`781c4019952bf680d864a5a9a458050d`), Pass 2 (`69c3f3d43c6df56299e0984bc0def669`), Pass 3 (`053ead498fd1027df2125bdb47abeced`) và Pass 4 Steps 30–42 (`bf57076f8b4860dbf166028b838441de`). (Ở lượt Pass 4 đầu lúc `08:34Z` khi vé `d08db24a5ed2209e6e5716662b391a91` hết hạn, luồng fallback `#tab-enterprise` `POST /api/v1/auth/login -> 200` hoạt động bình thường.)
  - `lms-sv-002` (`candidate2@rikkeijobs.test`, `Trần Thị Bình`, `user_id = 2`): `0` đơn ứng tuyển (kiểm chứng trạng thái rỗng).
  - `lms-mt-001` (`mentor1@rikkeijobs.test`, `Phạm Quốc Dũng`): Vai trò `MENTOR` (kiểm chứng thanh bên không có mục `"Ứng tuyển"`).
  - **Tài khoản HR (`hr1`, `hr2`)**: `hr1@rikkeijobs.test` (`company_id = 1`, `must_change_password = true`) bị chặn `403 MUST_CHANGE_PASSWORD`; `hr2@rikkeijobs.test` (`company_id = 2`, `must_change_password = false`) xem chỉ-đọc hồ sơ thuộc công ty 2 (`id = 1, 2`) và nhận `404 NOT_FOUND` với JD công ty 1 (`1, 6`). Kiểm chứng ở mức API/E2E trong `test_applications.test.mjs` và `ApplicationIntegrationTest` (màn hình HR thuộc `UT-02`).
- **Dữ liệu khởi tạo (`V20__dev_recruitment_seed.sql`, `user_id = 1`, đủ 7 trạng thái, xác nhận lại sau reseed ở Pass 3)**: `id = 1` (`SUBMITTED`), `id = 2` (`SCREENING`), `id = 3` (`INTERVIEW`), `id = 4` (`OFFER`), `id = 5` (`HIRED`), `id = 6` (`REJECTED`), `id = 7` (`WITHDRAWN`), cùng `job_id = 12` (`V12` JD hết hạn `2024-01-01`, kiểm chứng `400 JOB_NOT_ELIGIBLE` ở E2E/integration test).

---

## 2. Block B & C — Screens, States & Real User Interactions / Màn Hình, Trạng Thái & Tương Tác Thực Tế

### 2.1. English

- **Sidebar & Role Isolation**:
  - `CANDIDATE` (`lms-sv-001`): `a[href="/candidate/applications"]` (`"Ứng tuyển"`) has `visible=true`, `aria-current="page"` and `class="rj-role-nav-link is-active"` on `/candidate/applications`.
  - `MENTOR` (`lms-mt-001`): Sidebar contains only `"Trang chủ"` (`/mentor`) and `"Cần đánh giá"` (disabled) — zero `"Ứng tuyển"` entry.
  - Mobile drawer (`375x812`): `button.rj-mobile-menu-toggle` (`44x44px` at `x=16, y=12`) is hidden at `768x1024` and visible at `375x812`; opening drawer shows `"Ứng tuyển"`, pressing `Escape` closes it (`aria-expanded="false"`).
  - Sidebar collapse/expand (`1440x900`): Toggles cleanly between `280px` (`aria-expanded="true"`) and `72px` (`aria-expanded="false"`).
- **Candidate Jobs & `ApplyDialog` (Pass 1–4)**:
  - All 10 job cards on `/candidate/jobs` (`"Ứng tuyển"` `364.86 x 44px`) and `JobDetailPanel` at `/candidate/jobs/2` (`134.45 x 44px`) have `"Ứng tuyển"` enabled.
  - Opening `ApplyDialog` calls `GET /api/v1/me/cvs -> 403` (Phase 1 pre-HS-04); `"Gửi hồ sơ ứng tuyển"` stays `disabled: true` and `"Thử lại"` is `isVisible: true`.
  - Focus trap keeps focus inside dialog (`activeInDialog=1`); `Escape` closes and returns focus to `"Ứng tuyển"`.
  - **Pass 4 (`b779bdd6` Steps 30–42, `08:40:04Z` post-rebuild) — `no defects`**:
    - **CHECK 2 (Final D1 copy)**: `role="alert"` `innerText` is `"Dịch vụ quản lý CV hiện chưa sẵn sàng\nTính năng chọn và tải lên CV đang được hoàn thiện. Bạn vui lòng thử lại sau.\nThử lại"` (title appears once, zero `"không có quyền"`, `"Thử lại"` visible). Verified on `1440x900` Light (`html[data-theme]=null`), `1440x900` Dark (`html[data-theme]="dark"`, `aria-checked="true"`), and `375x812` Light (`html[data-theme]="light"`).
    - **CHECK 1 (Cover Letter validation & `aria-describedby`, D2)**: Pasting `2001` Vietnamese diacritic characters yields `inputValue().length = 2001`, counter `"2001/2.000 ký tự"`, `aria-invalid = "true"`, `aria-describedby = "_r_d_ _r_e_"` (hint `<p id="_r_d_">` `"Không bắt buộc, tối đa 2.000 ký tự."` followed by error `<p id="_r_e_">` `"Thư giới thiệu không được vượt quá 2.000 ký tự."`), and `"Gửi hồ sơ ứng tuyển"` disabled. Earlier Pass 4 probe (`step_16.json`) also verified `3115` chars (`aria-invalid="true"`, submit disabled) and `2000` chars (`aria-invalid=null`, `aria-describedby` hint only).
- **`"Ứng tuyển của tôi"` List (`/candidate/applications`)**:
  - Single `<h1>`: `"Ứng tuyển của tôi"`, displaying `7` cards across all 7 statuses with full Vietnamese diacritics, zero raw enums, zero emojis, and zero internal IDs.
  - Metric tiles (`Tổng đơn đã nộp` / `Đang xử lý` / `Đã kết thúc`): `7 / 4 / 3` (dropping to `7 / 2 / 5` after withdrawing `id=1` and `id=2` in Pass 2; restored to `7 / 4 / 3` in Pass 3 after DB reseed).
  - Status filter (`[role="combobox"]` + `[role="listbox"]`): All 8 options verified (`Tất cả trạng thái` -> `7`, plus `1` card for each of the 7 individual statuses). Supports mouse click, `Space`, `ArrowDown`/`ArrowUp`/`Enter`, and `Escape` (`openBeforeEsc=true`, `openAfterEsc=false`). (Note D9: pressing `Enter` when closed does not open shared Radix `<Select>`, standard on `develop`.)
  - Pagination: `<nav>` count = `0` when total = `7` (`size=10`); full multi-page pagination covered in `MyApplicationsPage.test.tsx`.
  - Empty state (`lms-sv-002`): `"Bạn chưa nộp đơn ứng tuyển nào"` + `"Xem việc làm gợi ý"` CTA (`196.4 x 44px`).
- **Application Detail (`/candidate/applications?id=<id>`) & `WithdrawDialog`**:
  - All 7 statuses render the 5-step progress stepper (`Đã gửi`, `Sàng lọc`, `Phỏng vấn`, `Đề nghị nhận việc`, `Nhận việc`) with `aria-current="step"` on the active step or terminal branch note (`role="note"` for `REJECTED` / `WITHDRAWN`), `"Tải bản CV đã nộp"` button, and chronological `vi-VN` history (`HH:mm DD/MM/YYYY`).
  - `"Rút hồ sơ ứng tuyển"` is enabled on `SUBMITTED`, `SCREENING`, `INTERVIEW`, and disabled with explanation (`"Không thể rút hồ sơ ở giai đoạn đề nghị nhận việc trở đi hoặc khi hồ sơ đã kết thúc."`) on `OFFER`, `HIRED`, `REJECTED`, `WITHDRAWN` (`click({ force: true })` on `id=4` `OFFER` opens `0` dialogs).
  - `WithdrawDialog`: 6 consecutive `Tab` presses stay trapped inside the dialog; `Escape` closes and returns focus to `"Rút hồ sơ ứng tuyển"`.
  - **Pass 3 D2 validation**: Submitting empty reason blocks client-side (`POST .../withdraw` count = `0`, `aria-invalid="true"`, `aria-describedby="_r_f_"`, `"Vui lòng nhập lý do rút hồ sơ."`). Entering `505` Vietnamese chars preserves all `505` chars (`maxlength=null`), shows `"505/500 ký tự"`, `aria-invalid="true"`, `"Lý do rút hồ sơ không được vượt quá 500 ký tự."`, disables `"Xác nhận rút đơn"`, `POST` count = `0`.
  - **Pass 2 Double-Click Guard**: Valid reason (`"Tôi đã nhận được lời mời từ công ty khác."`) on `id=1` (1440 Light) and `id=2` (375 Dark) produced **exactly 1** `POST /api/v1/me/applications/1/withdraw -> 200` (`updatedAt: 2026-11-21T08:09:39.183857839Z`) and **exactly 1** `POST /api/v1/me/applications/2/withdraw -> 200` (`updatedAt: 2026-11-21T08:10:08.392394408Z`), immediately disabling the button (`"Đang xử lý..."`) and showing `role="status"` `"Hồ sơ ứng tuyển của bạn đã được rút thành công."`.
- **Mouse, Scroll, History, Reload, Theme & 200% Zoom (Pass 2)**:
  - Left-click (`?id=1`), right-click (`cardsCountAfterRightClick = 7`), double-click on card 2 (`?id=2`), and hover behave normally.
  - Wheel scroll `(0, 600)` / `(0, -600)`: sticky header stays pinned at `y: 0, height: 56.8px`; last card moves `1556.1 -> 956.1 -> 1556.1`.
  - Browser Back/Forward: `?id=1` -> Back -> `/candidate/applications` (`7` cards) -> Forward -> `?id=1`.
  - Reload & unauthenticated access: `page.reload()` clears in-memory token and redirects to `/login`; visiting `/candidate/applications` unauthenticated redirects to `/login`.
  - `ThemeSwitch` (`button.rj-theme-switch`): persists across SPA navigation (`/candidate/applications` <-> `/candidate/jobs`) with **0 layout shift**.
  - 200% zoom (`setViewportSize`): `720x450` (1440 @ 200%) has `html/body/main` width `704.8px <= 720` (`0` overflow); `187x406` (375 @ 200%) has `html/body/main` width `172px <= 187` (`0` horizontal overflow), with sticky header wrapping to `254.4px` (out-of-scope shell defect D8).

### 2.2. Tiếng Việt

- **Thanh điều hướng & Cách ly vai trò**: Mục `"Ứng tuyển"` (`/candidate/applications`) hoạt động cho `CANDIDATE` (`aria-current="page"` khi đang ở trang), ẩn khỏi `MENTOR` (`lms-mt-001`); drawer mobile `375x812` mở bằng `button.rj-mobile-menu-toggle` (`44x44px`) và đóng bằng `Escape`; thu gọn/mở rộng sidebar `280px` <-> `72px`.
- **Việc làm & `ApplyDialog` (Pass 1–4)**: 10 thẻ việc làm (`364.86 x 44px`) và `JobDetailPanel` (`134.45 x 44px`) bật nút `"Ứng tuyển"`. Khi mở dialog ở Phase 1 (`GET /api/v1/me/cvs -> 403`), nút gửi bị vô hiệu, hiện cảnh báo D1 cuối ở Pass 4 (`b779bdd6` Steps 30–42, **`no defects`**): tiêu đề `"Dịch vụ quản lý CV hiện chưa sẵn sàng"` xuất hiện đúng 1 lần, nội dung `"Tính năng chọn và tải lên CV đang được hoàn thiện. Bạn vui lòng thử lại sau."` và nút `"Thử lại"`. Ô `"Thư giới thiệu"` với `2001` ký tự tiếng Việt có dấu giữ đủ `2001` ký tự, hiện `"2001/2.000 ký tự"`, `aria-invalid="true"`, `aria-describedby="_r_d_ _r_e_"` trỏ tới 2 thẻ `<p>` hợp lệ và khóa nút gửi; `2000` ký tự hợp lệ (`aria-invalid=null`); `Escape` đóng và trả tiêu điểm về nút mở.
- **Danh sách, Chi tiết & `WithdrawDialog`**: Danh sách 7 thẻ đủ 7 trạng thái (thống kê `7 / 4 / 3`), lọc cả 8 lựa chọn trên `[role="combobox"]`, trạng thái rỗng ở `lms-sv-002`; chi tiết hiển thị stepper 5 bước + lịch sử `vi-VN`; rút đơn bật ở `SUBMITTED`/`SCREENING`/`INTERVIEW` và khóa có giải thích từ `OFFER` trở đi; Pass 3 xác nhận lỗi inline rỗng và `505/500` ký tự; Pass 2 double-click chứng minh chỉ gửi **đúng 1** `POST .../withdraw -> 200` (nút chuyển `"Đang xử lý..."`). Chuột trái/phải/cuộn, Back/Forward, Reload -> `/login`, đổi theme (`0` CLS) và zoom 200% (`720x450` `0` tràn ngang) đều hoạt động ổn định.

---

## 3. Block D — Raw Measurements / Bảng Đo Đạc Thô

### 3.1. Viewport Width & Horizontal Overflow (`boundingBox()` vs Requested Viewport Width)

*(Because `page.evaluate` is blocked in `webview_browser`, layout widths are measured directly via `locator('html').boundingBox().width`, `locator('body').boundingBox().width`, and `locator('main').boundingBox().width`.)*

| Screen & State | Requested Viewport | Theme | `html` (`x, y, w, h`) | `body` (`w, h`) | `main` (`x, y, w, h`) | `h1` (`x, y, w, h`) | Horizontal Overflow |
|---|---|---|---|---|---|---|---|
| List (Pass 1) | `1440x900` | Light | `0, 0, 1424.8, 1764.8` | `1424.8, 1764.8` | `280, 56.8, 1144.8, 1708` | `304, 88.8, 1096.8, 36.4` | `0` (`<= 1440`) |
| List (Pass 1) | `1440x900` | Dark | `0, -20, 1424.8, 1764.8` | `1424.8, 1764.8` | `280, 36.8, 1144.8, 1708` | `304, 68.8, 1096.8, 36.4` | `0` (`<= 1440`) |
| List (Pass 3) | `1440x900` | Light | `0, 0, 1424.8, 1764.8` | `1424.8, 1764.8` | — | `304, 88.8, 1096.8, 36.4` | `0` (`<= 1440`) |
| List (Pass 3) | `1440x900` | Dark | `0, 0, 1424.8, 1764.8` | `1424.8, 1764.8` | — | `304, 88.8, 1096.8, 36.4` | `0` (`<= 1440`) |
| List (Pass 1) | `1024x768` | Light / Dark | `w = 1008.8` | `w = 1008.8` | `w = 728.8` | `304, 88.8, 680.8, 36.4` | `0` (`<= 1024`) |
| List (Pass 1) | `768x1024` | Light / Dark | `w = 752.8` | `w = 752.8` | `w = 472.8` | `296, 80.8, 440.8, 36.4` | `0` (`<= 768`) |
| List (Pass 1) | `375x812` | Light | `w = 360` | `w = 360` | `w = 360` | `16, 169.9, 328, 36.4` | `0` (`<= 375`) |
| List (Pass 1) | `375x812` | Dark | `w = 360` | `w = 360` | `w = 360` | `16, 177.9, 328, 36.4` | `0` (`<= 375`) |
| List (Pass 3) | `375x812` | Light | `w = 360, h = 2873.35` | `w = 360` | — | `16, 177.9, 328, 36.4` | `0` (`<= 375`) |
| List (Pass 3) | `375x812` | Dark | `w = 360, h = 2865.35` | `w = 360` | — | `16, 169.9, 328, 36.4` | `0` (`<= 375`) |
| Detail `id=1` (Pass 1) | `1024x768` | Light / Dark | `w = 1008.8` | `w = 1008.8` | `w = 728.8` | `328.8, 181.6, 290.0, 72.8` | `0` (`<= 1024`) |
| Detail `id=1` (Pass 1) | `768x1024` | Light / Dark | `w = 752.8` | `w = 752.8` | `w = 472.8` | `320.8, 173.6, 292.9, 72.8` | `0` (`<= 768`) |
| Detail `id=1` (Pass 1) | `375x812` | Light / Dark | `w = 360` | `w = 360` | `w = 360` | `40.8, 270.7, 278.4, 72.8` | `0` (`<= 375`) |
| Detail `id=1` D3 (Pass 3) | `1440x900` | Light / Dark | `w = 1424.8, h = 900.8` | `w = 1424.8` | — | — | `0` (`<= 1440`) |
| Detail `id=1` D3 (Pass 3) | `375x812` | Light | `w = 360, h = 1794.65` | `w = 360` | — | — | `0` (`<= 375`) |
| Empty `lms-sv-002` (Pass 1) | `1440x900` | Light | `w = 1424.8` | `w = 1424.8` | `280, 56.8, 1144.8, 844` | `304, 88.8, 1096.8, 36.4` | `0` (`<= 1440`) |
| Empty `lms-sv-002` (Pass 1) | `375x812` | Dark | `w = 360, h = 997.3` | `w = 360` | `w = 360` | — | `0` (`<= 375`) |
| Zoom 200% List/Detail (Pass 2) | `720x450` | Light | `w = 704.8` | `w = 704.8` | `w = 704.8` | — | `0` (`<= 720`) |
| Zoom 200% List/Detail (Pass 2) | `187x406` | Light | `w = 172` | `w = 172` | `w = 172` | — | `0` (shell header `254.4px` D8) |

### 3.2. Touch Targets (`>= 44px`), Dialog Boxes & Element Geometry (Pass 1 & Pass 3)

- **Page & Card Offsets (`1440x900` Light)**: `.rj-page-header` `(304, 88.8, 1096.8, 66.9)`; first application card `(304, 399.9, 1096.8, 176.7)`; status filter combobox `(304, 331.9, 280, 44)`.
- **Stepper Boxes (`1440x900` Light)**: `328.8, 263.65, 665.6, 62.2` (`id=1`/`id=2`); `328.8, 259.25, 665.6, 62.2` (`id=3`); `328.8, 199.65, 665.6, 62.2` (`id=4` `OFFER`); `328.8, 139.65, 665.6, 62.2` (`id=5` `HIRED`); `328.8, 184.45, 665.6, 136.8` (`id=6` `REJECTED`); `328.8, 243.65, 665.6, 136.8` (`id=7` `WITHDRAWN`).
- **History Card (`1440x900` Light)**: `304, 617.45, 715.2, 136.3` (`id=1`) to `304, 493.45, 715.2, 374.3` (`id=5`).
- **Dialogs**: `ApplyDialog` = `560 x 531.3px` (`1440x900`) and `328 x 642.3px` (`375x812`); `WithdrawDialog` = `432.4, 282.9, 560 x 334.2px` (`1440x900`).
- **All UT-01 Interactive Touch Targets (`>= 44px`)**:
  - `"Ứng tuyển"` on `/candidate/jobs` card: `364.86 x 44px`; on `JobDetailPanel`: `134.45 x 44px`.
  - Status combobox: `280 x 44px`; `button.rj-mobile-menu-toggle`: `44 x 44px`; `"Xem việc làm gợi ý"` empty CTA: `196.4 x 44px`.
  - `.rec-dialog-close` (`recruitment.css:556-561`): `min-width: 44px; min-height: 44px`.
  - `"Đăng xuất"`, `"Xem chi tiết"`, `"Quay lại danh sách ứng tuyển"`, `"Tải bản CV đã nộp"`, `"Rút hồ sơ ứng tuyển"`: all `44px–62.6px` height.
  - `.rj-recruitment-detail-job-link` (D3 fix, Pass 3): pre-fix `162.9 x 18.4px` (Pass 1) -> post-fix **`174.53 x 44px`** at `1440x900` Light (`x=1068, y=240.8`), `1440x900` Dark (`x=1068, y=240.8`), and `375x812` Light (`x=40.8, y=1272.05`).

### 3.3. Contrast Pairs for Status Badges (`DESIGN_SYSTEM.md` & `compute-contrast.mjs` `120/120 PASS`)

*(Because `getComputedStyle` is blocked in `webview_browser`, CSS tokens in `recruitment.css:43-96` are mapped directly to `DESIGN_SYSTEM.md` & `design-tokens.css`, mathematically verified by `node scripts/compute-contrast.mjs`: `120/120` color pairs PASS, `0` WCAG violations, `0` ratio mismatches > `0.01`.)*

| Status Badge (`recruitment.css`) | Text / Background Tokens | Light Mode (`FG` / `BG` / Contrast) | Dark Mode (`FG` / `BG` / Contrast) |
|---|---|---|---|
| `SUBMITTED` (`Đã gửi`) | `--rj-color-text-secondary` / `--rj-color-surface-subtle` | `#25394E` / `#E1E8F2` -> **9.60:1** (`AAA`) | `#CBD5E1` / `#101724` -> **12.09:1** (`AAA`) |
| `SCREENING` (`Sàng lọc`) | `--rj-color-status-info-text` / `--rj-color-status-info-bg` | `#134B5E` / `#EBF5FB` -> **8.65:1** (`DESIGN_SYSTEM.md:332`) | `#5DADE2` / `rgba(93,173,226,0.15)` (~`#071E28`) -> **6.97:1** (`DESIGN_SYSTEM.md:409`) |
| `INTERVIEW` (`Phỏng vấn`) | `--rj-color-badge-brand-text` / `--rj-color-badge-brand-bg` | `#0D55B8` / `#EBF2FC` -> **6.20:1** (`AA`, `DESIGN_SYSTEM.md:589`) | `#6EA2F4` / `#16243A` -> **6.04:1** (`AA`, `DESIGN_SYSTEM.md:651`) |
| `OFFER` (`Đề nghị nhận việc`) | `--rj-color-status-warning-text` / `--rj-color-status-warning-bg` | `#7A4305` / `#FEF9E7` -> **7.57:1** (`DESIGN_SYSTEM.md:322`) | `#F5B041` / `rgba(245,176,65,0.15)` (~`#2C1600`) -> **9.14:1** (`DESIGN_SYSTEM.md:399`) |
| `HIRED` (`Nhận việc`) | `--rj-color-status-success-text` / `--rj-color-status-success-bg` | `#0E6251` / `#E8F8F5` -> **6.65:1** (`AA`, `DESIGN_SYSTEM.md:587`) | `#48C78E` / `rgba(72,199,142,0.15)` (~`#06281E`) -> **7.40:1** (`AAA`, `DESIGN_SYSTEM.md:650`) |
| `REJECTED` (`Không đạt`) | `--rj-color-status-danger-text` / `--rj-color-status-danger-bg` | `#9B1C2A` / `#FDF2F4` -> **7.40:1** (`AAA`, `DESIGN_SYSTEM.md:585`) | `#F1707A` / `rgba(155,28,42,0.15)` (~`#2D0A0E`) -> **6.32:1** (`AAA`, `DESIGN_SYSTEM.md:649`) |
| `WITHDRAWN` (`Đã rút`) | `--rj-color-text-muted` / `--rj-color-surface-subtle` | `#475B70` / `#E1E8F2` -> **5.68:1** (`AA`, `DESIGN_SYSTEM.md:564`) | `#94A3B8` / `#101724` -> **7.00:1** (`AAA`, `DESIGN_SYSTEM.md:633`) |

### 3.4. Motion Durations & Easings vs Rule 09 Budgets (`design-tokens.css` & `recruitment.css`)

| Element / Effect | Token | Duration & Easing | Rule 09 Budget | Status |
|---|---|---|---|---|
| Hover / Focus / Link (`recruitment.css:278,596`) | `--rj-duration-fast` + `--rj-ease-hover` | `150ms cubic-bezier(0.2, 0, 0, 1)` | Micro `<= 150ms` | `[PASS]` |
| Dialog backdrop (`recruitment.css:492`) | `--rj-duration-normal` + `--rj-ease-entrance` | `180ms cubic-bezier(0.16, 1, 0.3, 1)` | Dialog/Drawer `<= 300ms` | `[PASS]` |
| Dialog panel (`recruitment.css:509`) | `--rj-duration-moderate` + `--rj-ease-spring-gentle` | `280ms` spring/ease-out | Dialog/Drawer `<= 300ms` | `[PASS]` |
| Card stagger (`recruitment.css:104`, `design-tokens.css:273`) | `--rj-motion-stagger-showcase` (`min(idx,6)*55ms` max `330ms` + `<= 340ms`) | Total max `<= 670ms` (`--rj-duration-showcase: 720ms`) | Showcase entrance `<= 800ms` | `[PASS]` |
| Stepper fill (`recruitment.css:330`) | `--rj-duration-showcase` + `--rj-ease-entrance` | `720ms cubic-bezier(0.16, 1, 0.3, 1)` | Stepper reveal `<= 800ms` | `[PASS]` |
| Stepper step pop (`recruitment.css:362-363`) | `--rj-duration-moderate` + `idx * --rj-motion-stagger-showcase` | `280ms` + max `220ms` = `500ms` | Stepper reveal `<= 800ms` | `[PASS]` |
| Count-up (`motion.ts:517`, `MyApplicationsPage.tsx:39`) | `useCountUp(value, active, 640)` | `640ms` | Showcase `<= 800ms` | `[PASS]` |
| Route transition (`design-tokens.css:237,243`) | `--rj-duration-vt-out` / `--rj-duration-vt-route` | Old `140ms`, New `480ms` | Route `<= 600ms` | `[PASS]` (shared shell D7-P2) |
| Theme circular reveal (`design-tokens.css:244`) | `--rj-duration-theme-reveal` | `500ms` | `<= 600ms` | `[PASS]` |

### 3.5. Console Errors & HTTP `>= 400` Breakdown Across Passes 1–4

- **Console Errors**: **`0`** across all 4 passes (no `ConsoleErrors:` entry appeared in any HUD across Pass 1, Pass 2, Pass 3, or Pass 4).
- **HTTP `>= 400` Breakdown**:
  1. `GET /api/v1/me/cvs -> 403`: Expected in Phase 1 whenever `ApplyDialog` opens (`HS-04` not merged yet); handled gracefully as D1 friendly alert.
  2. `GET /api/v1/me/target -> 404`: Pre-existing `/candidate` home page behavior when candidate has no target role set.
  3. Transient `status: 0` entries during SSO callback redirect (Pass 1) and aborted CSS preloads on navigation (Pass 4).
  4. **Zero unexpected `4xx` or `5xx` responses**.

---

## 4. Block E — Motion Frame Sequences, Compositor-Only, Non-Replay & `prefers-reduced-motion`

### 4.1. Timed Frame Sequences (`Pass 2` & `Pass 3`, `1440x900` Light)

1. **Application cards first-entrance stagger (Pass 2)**: `ut01-motion-cards-{0,150,300,450,600,800}ms.png` (`Pass2:step_4_shot_1..6`).
2. **Progress stepper reveal across 3 statuses (Pass 2)**:
   - `id=3` (`INTERVIEW`): `ut01-motion-stepper-id3-{0,150,300,450,600,800}ms.png` — elapsed timestamps from click: `1210, 1312, 1369, 1454, 1494, 1559` ms (inter-frame deltas `102, 57, 85, 40, 65` ms).
   - `id=4` (`OFFER`): `ut01-motion-stepper-id4-{0,150,300,450,600,800}ms.png` — elapsed from click: `664, 748, 823, 888, 941, 1012` ms (deltas `84, 75, 65, 53, 71` ms).
   - `id=5` (`HIRED`): `ut01-motion-stepper-id5-{0,150,300,450,600,800}ms.png` — elapsed post-click: `67, 309, 511, 728, 951, 1216` ms (deltas `242, 202, 217, 223, 265` ms).
3. **Dialog open/close (`0..300ms`, Pass 2)**:
   - `WithdrawDialog` open (`id=1`): `ut01-motion-withdraw-open-{0,100,200,300}ms.png` (`62, 284, 510, 717` ms); close: `ut01-motion-withdraw-close-{0,100,200,300}ms.png` (`78, 237, 406, 598` ms).
   - `ApplyDialog` open: `ut01-motion-apply-open-{0,100,200,300}ms.png` (`52, 230, 414, 610` ms); close: `ut01-motion-apply-close-{0,100,200,300}ms.png` (`60, 246, 433, 638` ms).
4. **Route transition `/candidate/jobs` -> `/candidate/applications` (Pass 2)**: `ut01-motion-route-{0,200,400,600}ms.png` (`Pass2:step_4_shot_7..10`; cross-fade behavior captured as out-of-scope D7 Part 2).
5. **Theme switch Light -> Dark (Pass 2)**: `ut01-motion-theme-{0,100,200,400}ms.png` (`48, 267, 552, 821` ms); `h1` and `main` coordinates remain unchanged (`0` CLS).
6. **Non-replay on return from detail (D7 Part 1 fix — Pass 3 + Vitest)**:
   - Fix in `MyApplicationsPage.tsx:69-80` (`isListReady` gating `markMotionPlayed(APPLICATIONS_MOTION_KEY)` and disabling `playEntrance` on return when `hasPlayedMotionOnce` is true).
   - Pass 3 live `/browser` (`ut01-return-list-{0,300,800}ms.png`): Cycle 1 (`id=1 -> Quay lại`: `dtMs = 710, 1009, 1296, 1986`) and Cycle 2 (`id=3 -> Quay lại`: `dtMs = 409, 621, 948, 1524`) both render `7 / 4 / 3` metrics and all `7` visible cards immediately (`[true x7]`, no `6 / 3 / 3` count-up replay).
   - Vitest (`MyApplicationsPage.test.tsx:441-532`): Confirms `.rec-card.is-staggered` absent, `.rj-stagger-item` absent, `7 / 4 / 3` immediate, and `requestAnimationFrame` not re-invoked.

### 4.2. Compositor-Only & `prefers-reduced-motion` Proof

- **Compositor-only `@keyframes` (`recruitment.css`)**: `rec-stepper-grow-x` (`transform: scaleX(...)`), `rec-stepper-grow-y` (`transform: scaleY(...)`), `rec-step-pop` (`opacity`, `transform: scale(...)`), `rec-backdrop-in` (`opacity`), `rec-dialog-in` (`opacity`, `transform: translateY(...) scale(...)`). Zero `width`, `height`, `top`, `left`, `margin`, or `padding` animations.
- **`prefers-reduced-motion: reduce`** (replacing blocked `page.emulateMedia` with CSS + Vitest):
  - `recruitment.css:742-766` & `design-tokens.css:847-896` disable stagger/step animations, lock `.rec-stepper-fill` at final `scaleX(var(--rec-stepper-ratio, 0))` (`scaleY` on `<= 767px`), and clamp dialog animations to `rj-fade-in 100ms ease both` (`0.001ms` tokens).
  - `MyApplicationsPage.tsx:58` & `ApplicationProgressStepper.tsx:42` check `!prefersReducedMotion()`.
  - `MyApplicationsPage.test.tsx:319-361` mocks `window.matchMedia` (`matches: true`) and asserts immediate `'5'` count, null `.rec-card.is-staggered`, and null `.rj-stepper-wrap.is-animated`.

---

## 5. Block F — Parity Table vs Polished Candidate Pages / Bảng Đối Chiếu Tương Đồng

*(Pass 1 `boundingBox()` measurements compared against `/candidate/jobs` baseline; `getComputedStyle` blocked in sandbox.)*

- **`/candidate/jobs` baseline**: `1440x900` Light: `main=(280, 56.8, 1144.8, 2684.7)`, `.rj-page-header=(304, 88.8, 1096.8, 66.9)`, `h1=(304, 88.8, 1096.8, 36.4)`, first card `(328.8, 379.3, 513.6, 420.4)`. `375x812` Light: `main=(0, 153.9, 360, 7461.2)`, `.rj-page-header=(16, 169.9, 328, 89.4)`, `h1=(16, 169.9, 328, 36.4)`, first card `(40.8, 645.3, 278.4, 651.4)`.

| Route | Viewport & Theme | `main` (`dx, dy, dw`) | `.rj-page-header` (`dx, dy, dw, dh`) | `h1` (`dx, dy, dw, dh`) | First Card (`dx, dy, dw, dh`) | Notes |
|---|---|---|---|---|---|---|
| `/candidate/applications` | `1440x900` Light | `0, 0, 0` | `0, 0, 0, 0` | `0, 0, 0, 0` | `-24.8, +20.6, +583.2, -243.7` | Matches shell, `.rj-page-header`, and `h1` `36.4px` (`28px` font + `1.3` line-height); single-column list cards |
| `/candidate/internships` | `1440x900` Light | `0, 0, 0` | `0, 0, 0, 0` | `0, 0, 0, 0` | `-24.8, -95.0, +583.2, -68.25` | Matches shell, header, and `h1` 100% |
| `/candidate/skills` | `1440x900` Light | `0, 0, 0` | `null` | `null` (`h1Count=0`, `h2` `304,96.8,648.95,42`) | `-24.8, +1258.9, +196.26, -261.2` | Legacy `develop` page uses `<h2>` (out of scope D5) |
| `/candidate/applications` | `375x812` Light | `0, 0, 0` | `0, 0, 0, +22.5` | `0, 0, 0, 0` | `-24.8, +98.9, +49.6, -367.9` | Subtitle wraps cleanly (`+22.5px` matching `/candidate/internships`) |
| `/candidate/internships` | `375x812` Light | `0, 0, 0` | `0, 0, 0, +22.5` | `0, 0, 0, 0` | `-24.8, -142.3, +49.6, -65.65` | Structurally identical to `/candidate/applications` |
| `/candidate/skills` | `375x812` Light | `0, 0, 0` | `null` | `null` (`h1Count=0`, `h2` `16,177.9,328,42`) | `-24.8, +2703.6, +49.6, -427.4` | Legacy `develop` page |
| All 4 routes | `1440` & `375` Dark | `0` diff at `1440` (`skills` `main.y +8px` at `375` on toggle) | Same as Light | Same as Light | Same as Light | `0` layout shift on `ThemeSwitch` |

---

## 6. Block G — Screenshot Index Summary / Tổng Hợp Ảnh Chụp (`89` PNGs)

- All **`89`** verified PNG screenshots (`0` corrupted, `0` secrets, `0` real personal data) reside in git-ignored `docs/ut01/pr-screenshots/` and are indexed 1:1 in `docs/ut01/pr-screenshots/ORDER.txt`:
  - **Group 1 (`8` PNGs)**: `/candidate/jobs` (`1`) + `ApplyDialog` pre-fix Pass 1 (`3`, labeled `BEFORE pre-fix D1/D2`) + Pass 4 `b779bdd6` post-rebuild `ut01-apply-dialog-fixed-{1440-light,1440-dark,375-light,overlong-1440-light}.png` (`4`, superseding Pass 1 & Pass 3).
  - **Group 2 (`6` PNGs)**: `/candidate/applications` list (`1440`/`375` Light & Dark) + `lms-sv-002` empty state (`1440` Light, `375` Dark).
  - **Group 3 (`10` PNGs)**: Detail views across `SUBMITTED`, `INTERVIEW`, `OFFER`, `REJECTED`, `WITHDRAWN`, `375` Light/Dark, Dark list scrolled to `OFFER`, and Pass 3 D3 touch-target fix (`ut01-detail-d3-{1440,375}-light.png` superseding Pass 1 link height).
  - **Group 4 (`6` PNGs)**: `WithdrawDialog` (`1440` Light/Dark, `375` Dark), Pass 3 D2 validation fix (`ut01-withdraw-dialog-fixed-1440-light.png`), double-click `"Đang xử lý..."` guard (`ut01-withdraw-success-1440-light.png`), and post-withdraw success (`ut01-withdraw-success-375-dark.png`).
  - **Group 5 (`8` PNGs)**: Focus / `:focus-visible` states (`6`) and 200% zoom `720x450` (`2`).
  - **Group 6 (`51` PNGs)**: Timed motion sequences (`cards` `6`, Pass 3 `return-list` `3`, `stepper id=3/4/5` `18`, `ApplyDialog` open/close `8`, `WithdrawDialog` open/close `8`, `route` `4`, `theme` `4`).

---

## 7. Block H — Honest Sandbox Limitations & Exact Replacement Proofs / Giới Hạn Sandbox & Bằng Chứng Thay Thế

| Blocked Check in `webview_browser` | Sandbox Technical Reason | Exact Replacement Proof Executed & Passing |
|---|---|---|
| `getComputedStyle` (`font-size`, `font-family`, `border-radius`, rendered RGB) | `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval` blocked | `boundingBox()` (`h1` height `36.4px` matching `/candidate/jobs`) + static inspection of `DESIGN_SYSTEM.md` & `recruitment.css` (`28px`, `--rj-*` tokens) + `node scripts/compute-contrast.mjs` (`120/120 PASS`). |
| `page.emulateMedia({ reducedMotion: 'reduce' })` | API blocked by sandbox | `MyApplicationsPage.test.tsx:319-361` (`matchMedia` mock, `0` stagger/count-up) + static `@media (prefers-reduced-motion: reduce)` inspection (`recruitment.css:742-766`, `design-tokens.css:847-896`). |
| Mentor `403` inside SPA (`/candidate/applications` as `lms-mt-001`) | Mentor sidebar hides `"Ứng tuyển"`; `page.goto()` drops in-memory JWT redirecting to `/login`; `history.pushState` blocked without `page.evaluate` | `RbacPermissionMatrixIntegrationTest` (`146/146 PASS`), `ApplicationRouting.test.tsx` (Vitest), `test_applications.test.mjs` (`403 FORBIDDEN` for `MENTOR`), `RoutePolicyRegistryTest` (`6/6 PASS`). |
| Expired `job_id=12` & UI `Apply -> 201 -> 409 -> Snapshot -> Mailpit` | `job_id=12` not in top-10 recommendations; `/api/v1/me/cvs` returns `403` pre-HS-04 so submit is intentionally disabled; `page.route` blocked | `test_applications.test.mjs` (`400 JOB_NOT_ELIGIBLE`, `503 CV_SERVICE_UNAVAILABLE` + `0` Mailpit messages, `409 DUPLICATE_APPLICATION`, `409 CANNOT_WITHDRAW`, PDF `594B`), `ApplicationIntegrationTest` (`15/15`), `HrNotificationListenerTest` (`3/3`), `CvSnapshotServiceTest` (`7/7`), `ApplyDialog.test.tsx` (`ready`/`empty`/`409`/`503`). |
| Sub-`16ms` `requestAnimationFrame` frame probes | `waitForFunction` blocked + screenshot IPC latency `~40–265ms` | Real-timestamped `dtMs` frame sequences in Pass 2 & Pass 3 + Vitest `requestAnimationFrame` spy (`MyApplicationsPage.test.tsx:441-532`). |
| `consoleMessages` API & direct PNG output path | `page.consoleMessages` unexposed; `screenshot({path})` restricted to sandbox folder | HUD `ConsoleErrors:` verified `0` at every step of Passes 1–4; verified PNGs copied to `docs/ut01/pr-screenshots/`. |

---

## 8. Block I — Phase 2 Repeat Verification Checklist / Danh Mục Kiểm Chứng Lặp Lại Phase 2

1. Replace the `@ConditionalOnMissingBean` `CvPort` placeholder with the real `candidate` (`HS-04`) adapter implementation.
2. Remove `{ skip: ... }` on `TC-T1-UT01-15` in `e2e/tier1-features/test_applications.test.mjs` and re-run `node e2e/run-all.mjs`.
3. Repeat live `/browser` journey with real CVs:
   - Open `ApplyDialog` -> `GET /api/v1/me/cvs -> 200` rendering CV radio cards (plus empty-CV account check).
   - Select CV + enter cover letter -> submit -> `POST /api/v1/jobs/{id}/apply -> 201`, success banner, new card in `/candidate/applications`.
   - Re-apply to same open JD -> Vietnamese `409 DUPLICATE_APPLICATION` feedback.
   - Edit or delete source CV in `HS-04` -> download candidate & HR PDF snapshots and confirm identical SHA-256 checksums.
   - Withdraw (`SUBMITTED`/`SCREENING`/`INTERVIEW`) -> re-apply succeeds; withdraw at `OFFER` stays blocked (`409 CANNOT_WITHDRAW`).
   - Inspect Mailpit REST API `http://127.0.0.1:8025/api/v1/messages` for HR notification subject/recipients (zero PII in backend logs).

---

## 9. Defect Triage (`D1`–`D10`) / Phân Loại & Xử Lý Lỗi (`D1`–`D10`)

| ID | Finding | Pass | Severity & Scope | Resolution & Verification Proof |
|---|---|---|---|---|
| **D1** | `GET /api/v1/me/cvs` returned `403` pre-HS-04 showing `"Bạn không có quyền..."`; Pass 3 repeated `"Dịch vụ quản lý CV hiện chưa sẵn sàng"` in title & body | Pass 1 (H), Pass 3 (copy) | In-scope (`recruitmentApi.ts`, `ApplyDialog.tsx`) | **Fixed & Verified**: Pass 3 removed `"không có quyền"`; final fix updated body to `"Tính năng chọn và tải lên CV đang được hoàn thiện. Bạn vui lòng thử lại sau."`. Pass 4 (`b779bdd6` Steps 30–42) confirmed **`no defects`** + 4 updated `ut01-apply-dialog-fixed-*.png`. |
| **D2** | `ApplyDialog` (`>2000` chars) & `WithdrawDialog` (empty/`>500` chars) lacked instant inline errors/`aria-invalid`; Pass 3 nested `<span>` without `id` inside `<p id={coverLetterErrorId}>` | Pass 1/2 (M), Pass 3 (a11y) | In-scope (`ApplyDialog.tsx`, `WithdrawDialog.tsx`) | **Fixed & Verified**: Pass 3 verified `WithdrawDialog` + `ApplyDialog` validation & `POST` blocking; Pass 4 (`b779bdd6` Steps 41–42) verified `aria-describedby="_r_d_ _r_e_"` pointing directly to `<p>` hint and error nodes on `2001` Vietnamese chars. |
| **D3** | Job title link in `"Thông tin hồ sơ"` (`ApplicationDetailView`) measured `18.4px < 44px` | Pass 1 (L) | In-scope (`ApplicationDetailView.tsx`, `recruitment.css`) | **Fixed & Verified**: Added `.rj-recruitment-detail-job-link` (`min-height: 44px`). Pass 3 measured `174.53 x 44px` at `1440` Light/Dark and `375` Light. |
| **D4** | Empty state (`lms-sv-002`) had `0` `role="status"` / `role="alert"` | Pass 1 (Info) | In-scope (By design) | **By Design (Not a defect)**: Initial static `.rj-empty-state` matches `DESIGN_SYSTEM.md` & `/candidate/internships`; dynamic states use `role="status"` / `role="alert"`. |
| **D5** | `/candidate/skills` uses `<h2>` (`h1Count=0`), `/candidate/jobs/2` uses `<h2>`, `/candidate` `"Tính năng sắp ra mắt"` still lists `"Hồ sơ ứng tuyển"` | Pass 1 (Info/L) | **Out-of-scope (`develop` baseline)** | **Reported only (untouched)**: `CandidateHomePage.tsx` is locked by `RoleHomes.test.tsx:88-90` and legacy pages belong to `develop`. |
| **D6** | Already-applied JDs on `/candidate/jobs` still enable `"Ứng tuyển"` | Pass 2 | Phase 1 Module Boundary | **Accepted Phase 1**: Preserves `company`/`recruitment` boundary (and re-apply after `WITHDRAWN` is allowed); duplicate open apply returns `409 DUPLICATE_APPLICATION`. |
| **D7** | **Part 1:** Returning from `?id=1` replayed count-up (`6/3/3`) & card stagger. **Part 2:** Route ViewTransition cross-faded two overlapping pages & swallowed `<480ms` clicks | Pass 2 | **Part 1:** In-scope (`MyApplicationsPage.tsx`). **Part 2:** Out-of-scope (`design-tokens.css`) | **Part 1 Fixed & Verified:** `MyApplicationsPage.tsx:69-80` + Vitest (`MyApplicationsPage.test.tsx:441-532`) + Pass 3 live `/browser` (`7/4/3` immediate in Cycles 1 & 2). **Part 2 Out-of-scope:** Missing `::view-transition { pointer-events: none; }` in shared `design-tokens.css` (`develop`), reported for shared UIUX round. |
| **D8** | `187x406` (`375px` @ 200% zoom) sticky `<header>` wrapped to `254.4px` causing `ELEMENT_OCCLUDED` | Pass 2 | **Out-of-scope (`SharedAppLayout`)** | **Reported only (untouched)**: `html/body/main` width remained `172px <= 187px` (`0` horizontal overflow); sticky header belongs to shared shell. |
| **D9** | Closed Radix `<Select>` (`Lọc theo trạng thái`) opens via `click`/`Space` but not `Enter` | Pass 2 | **Out-of-scope (`shared/components/Select.tsx`)** | **Reported only (untouched)**: Standard behavior of shared `<Select>` on `develop`. |
| **D10** | Unauthenticated deep-link `/candidate/applications` -> `/login` -> `mentor1` login redirects to `/mentor` rather than `/403` | Pass 1/2 | **Out-of-scope (Shared Auth)** | **Reported only + RBAC covered**: `RbacPermissionMatrixIntegrationTest` (`146/146`), E2E (`403 FORBIDDEN`), and Vitest `ApplicationRouting.test.tsx` verify `MENTOR` blocking. |

---

## 10. Round UT-01-fix Live `/browser` Verification — `/candidate` (`D5`)

### 10.1. English

- **Source & Session Context**: Verified by live `/browser` subagent `bbb4153e-2309-41fb-91af-1fc4e656e978` via Parent `78f066ff-a6a7-442b-bf5b-339bf74900c5` on the fresh `UT-01-fix` Docker Compose stack (`visited_origins = http://127.0.0.1:3000`, `blocked_origins = none`). Signed in as `lms-sv-001` via real LMS SSO (`POST /api/v1/auth/sso -> 200 OK`; one re-login via enterprise tab at `375` after reload; no data mutated).
- **Screenshots (`10` PNGs in `docs/ut01/pr-screenshots/`, indexed in `ORDER.txt`)**:
  - Top-of-page & navigation frames (`6`): `ut01fix-candidate-1440-light.png`, `ut01fix-candidate-1440-dark.png`, `ut01fix-candidate-375-light.png`, `ut01fix-candidate-375-dark.png`, `ut01fix-candidate-375-drawer-light.png`, `ut01fix-candidate-applications-1440-light.png`.
  - Roadmap card frames (`4`, scrolled into view because `#cand-roadmap-heading` sits below the fold at `y = 1360.5 @1440` and `y = 4302.2 @375`; card box `357.6 x 339.6 px` at `1440` and `328 x 339.6 px` at `375`): `ut01fix-roadmap-card-1440-light.png`, `ut01fix-roadmap-card-1440-dark.png`, `ut01fix-roadmap-card-375-light.png`, `ut01fix-roadmap-card-375-dark.png`.
- **Roadmap Card (`#cand-roadmap-heading`, D5 Verification)**:
  - Identical `innerText` across all `4` combinations (`1440` / `375` x `Light` / `Dark`): `"Tính năng sắp ra mắt / Trợ lý AI / Góp ý cải thiện CV và luyện phỏng vấn thử theo yêu cầu tin tuyển dụng. / Sắp ra mắt / Khóa học bổ sung trên LMS / Gợi ý học phần bù đắp kỹ năng còn thiếu trực tiếp trên LMS. / Sắp ra mắt"`.
  - Stale `"Hồ sơ ứng tuyển"` and `"Quản lý CV, theo dõi trạng thái hồ sơ đã nộp và lịch phỏng vấn."` are absent; `2` items rendered with full Vietnamese diacritics; zero clipping (`item right edge 1376.0 <= card 1400.8 @1440`, `319.2 <= 344.0 @375`, max child edge `1359.2` / `302.4`); visually legible in both Light and Dark themes.
- **Layout Stability (`boundingBox` proxy for CLS)**:
  - `Light -> Dark -> Light` delta = `0.00 px` on `html`, `body`, `main`, `.rj-cand-hero`, left column, both asides, roadmap card, and `.rj-account-card-secondary` at both `1440` and `375`.
  - `t0 -> t1500 ms` at `1440`: `html` / `body` / `main` grow `+640.6 px` in height solely from left-column async data rendering (`leftCol 811.8 -> 1452.4`); roadmap card (`1043.2, 1360.53, 357.6 x 339.6`), right aside, and `.rj-account-card-secondary` remain unchanged; hero `y` delta `-0.0075 px` (sub-pixel rounding). At `375`, `t0 == t1500` for all measured elements.
- **Overflow Check**:
  - `html` / `body` width `1424.8 <= 1440` (scrollbar inset) and `360 <= 375`; `main` width `1144.8` (`1440`) and `360` (`375`).
- **Sidebar & Navigation**:
  - On `/candidate`: `"Trang chủ"` has `aria-current="page"` + `is-active`; `"Ứng tuyển"` (`a[href="/candidate/applications"]`) is visible, enabled, `aria-current=null`, with zero `"Sắp ra mắt"` badge.
  - At `375` drawer: toggle `aria-expanded` alternates `true` / `false`, same active/enabled states, `Escape` closes the drawer.
  - Clicking `"Ứng tuyển"` navigates to `/candidate/applications` (`7` applications: `7 / 4 / 3`), setting `aria-current="page"` + `is-active` on `"Ứng tuyển"` and clearing `"Trang chủ"`; clicking `"Trang chủ"` restores `/candidate`.
- **Interactions, Console & Network**:
  - Wheel scroll (`hero y 88.8 -> -1424.8 -> 88.8`), `Tab` order (hero CTAs -> job links -> radar axis buttons), hover states, and `goBack` / `goForward` all work cleanly; `reload()` clears the in-memory token and redirects to `/login` as expected.
  - Seed KPIs settle to: verified skills `11`, average score `75/100`, readiness `60%`, mentor evaluations `5` (not a regression; viewport-gated count-up briefly reads `0` right after `goForward` or while offscreen at `375`).
  - **`0`** console errors; **`0`** HTTP responses `>= 400` (`GET /api/v1/me/target` returned `200`).
- **Block H — Honest Sandbox Limits (Round UT-01-fix)**:
  - `page.evaluate`, `emulateMedia`, `route`, and `request` are blocked in the browser sandbox, so `PerformanceObserver` CLS, `getComputedStyle`, real `scrollWidth`, and `scrollY` could not be queried directly (`boundingBox` deltas were used as geometric proxies).
  - `locator.screenshot` is not exposed (`scrollIntoView` + `page.screenshot` were used instead).
  - Because `#cand-roadmap-heading` is below the fold, the `6` top-of-page frames do not show the roadmap card; the `4` scrolled `ut01fix-roadmap-card-*` frames capture it directly.

### 10.2. Tiếng Việt

- **Nguồn kiểm chứng & Phiên đăng nhập**: Subagent `/browser` `bbb4153e-2309-41fb-91af-1fc4e656e978` qua Parent `78f066ff-a6a7-442b-bf5b-339bf74900c5` trên stack Docker `UT-01-fix` (`http://127.0.0.1:3000`, `blocked_origins=none`), đăng nhập `lms-sv-001` bằng LMS SSO thật (`POST /api/v1/auth/sso -> 200`; một lần đăng nhập lại qua tab doanh nghiệp ở `375` sau reload; không làm thay đổi dữ liệu). Đã lưu `10` ảnh PNG vào `docs/ut01/pr-screenshots/` và lập chỉ mục trong `ORDER.txt`.
- **Thẻ `"Tính năng sắp ra mắt"` (`#cand-roadmap-heading`, D5)**: Khớp 100% trên cả 4 tổ hợp (`1440`/`375` x Sáng/Tối) với 2 mục (`"Trợ lý AI"` và `"Khóa học bổ sung trên LMS"`), không còn `"Hồ sơ ứng tuyển"`, đủ dấu tiếng Việt, không tràn cắt (`1376.0 <= 1400.8` ở `1440`, `319.2 <= 344.0` ở `375`), hiển thị rõ trên cả hai giao diện.
- **Ổn định bố cục, tràn ngang, thanh bên & tương tác**: Chênh lệch `Light -> Dark -> Light` = `0.00 px`; ở `1440`, `t0 -> t1500 ms` chỉ tăng chiều cao cột trái (`+640.6 px`) khi dữ liệu bất đồng bộ nạp xong còn thẻ roadmap (`357.6 x 339.6 px`), cột phải và thẻ tài khoản giữ nguyên; không tràn ngang (`1424.8 <= 1440`, `360 <= 375`); thanh bên `"Ứng tuyển"` hoạt động đúng trạng thái ở cả `1440` và drawer `375` (`Escape` đóng); **`0`** lỗi console, **`0`** phản hồi HTTP `>= 400` (`GET /api/v1/me/target` trả `200`).
- **Giới hạn sandbox (Block H)**: `page.evaluate`/`emulateMedia`/`route`/`request` và `locator.screenshot` bị chặn trong sandbox nên dùng `boundingBox` làm thước đo thay thế CLS/`getComputedStyle`/`scrollWidth` và dùng `scrollIntoView` + `page.screenshot` cho 4 ảnh thẻ roadmap dưới màn hình đầu.

---

## 11. Round UT-01-modal Live `/browser` Verification

### 11.1. English

- **Block A — Live BEFORE Reproduction (`1440x900` Light, `/candidate/jobs`, `lms-sv-001`)**:
  - **Scrolled (`scrollY = 900`, `100-ut01-modal-before-apply-light-1440.png`, `166,611 B`)**: Opening `ApplyDialog` set `body.style="overflow: hidden;"`, turning `<body>` into an independent scroll container under `html, body { overflow-x: clip; }`. Sticky `<header>` snapped from `y = 0` to `y = -900` (`deltaY = -900.00 px`) and sticky `<aside>` snapped from `y = 56` to `y = -843.20` (`deltaY = -899.20 px`), while `main.locator('[role="dialog"]').count() === 1` proved the dialog was trapped inside `<main>` (`view-transition-name: rj-main-content`). Hit-testing via `click({ trial: true })` hit sidebar and header elements directly (`HIT_THROUGH_TO_SIDEBAR` / `HIT_THROUGH_TO_HEADER`) instead of `.rec-dialog-backdrop`. (Independent Team Lead reproduction at `scrollY = 797` also measured `<aside>` jumping `56 -> -740` and page width shifting `1425 -> 1440` when the scrollbar disappeared.)
  - **Top of page (`scrollY = 0`, `100b-ut01-modal-before-apply-top-light-1440.png`, `148,811 B`)**: Bright white undimmed sticky header (`56.8 px`) and sidebar (`280 px`) painted visually on top of `.rec-dialog-backdrop`.
- **Block B — Live AFTER Verification (Pass 1 Remediation -> Pass 2 Zero-Defect Proof)**:
  - **Pass 1 -> Iteration 3 Remediation**: Pass 1 caught Blocking Defect #1 (`mouse.wheel` bypassing `html[data-scroll-locked="true"]` because `overflow-x: clip` compiled to `overflow: clip hidden` alongside missing `{ passive: false }` wheel/touch guards in `scrollLock.ts`) and Defect #2 (`375x812` drawer frames captured mid-animation before `280ms` `rj-drawer-slide-in` settled). Iteration 3 removed `overflow-x: clip` from `html[data-scroll-locked="true"]`, added ref-counted `{ passive: false }` wheel/touch boundary listeners in `scrollLock.ts`, and rebuilt `rikkei-frontend`.
  - **Pass 2 Session Context**: Subagent `ebd271ff-ca38-442e-b3dd-6608f047873e` via Parent `78f066ff-a6a7-442b-bf5b-339bf74900c5` with browser pane **VISIBLE** (`visited_origins = http://127.0.0.1:3000`, `blocked_origins = none`, `lms-sv-001` `candidate1@rikkeijobs.test` via `#tab-enterprise` fallback after expired 60s SSO ticket `401`, zero data mutation).
  - **Scroll Lock (`mouse.wheel`, `PageDown`/`ArrowDown`, `Escape`)**:
    - `ApplyDialog` `1440x900` Light (`scrollY = 950.4`): `mouse.wheel(0, 600)` and `(0, -600)` over BOTH backdrop and dialog plus `PageDown`/`ArrowDown` kept `html.y = -950.40` across all 6 readings (`delta = 0`); `Escape` unlocked (`data-scroll-locked=null`), preserved `-950.40`, and `mouse.wheel(0, 200)` scrolled `-950.40 -> -1150.40`.
    - `ApplyDialog` `1440x900` Dark (`-950.4`), `1024x768` (`-372.80`), `768x1024` (`0`), `375x812` Light & Dark (`-856`): wheel blocked (`delta = 0`) in both `+` and `-` directions; `Escape` preserved scroll position and unlocked.
    - `375x812` Mobile Drawer Light (`scrollY = 400`) & Dark (`scrollY = 1172.8`): `mouse.wheel(0, 400)` & `(0, -400)` yielded `delta = 0`; `Escape` unlocked and restored wheel scrolling (`-572.8 -> -772.8`).
    - `WithdrawDialog` (`/candidate/applications?id=1`) `1440x900` Light/Dark (`-0.80`) & `375x812` Light (`-982.40`): `mouse.wheel(0, -400)` & `(0, 400)` over BOTH backdrop and dialog yielded `delta = 0`; `Escape` preserved scroll and unlocked (`-982.40 -> -782.40`).
  - **Settled `375x812` Mobile Drawer**: After `700ms` settle (`> 280ms` `rj-drawer-slide-in`), `asideBox = {x: 0, y: 0, width: 280, height: 812}`, first nav link `x = 12 >= 0` (not clipped), opaque `#FFFFFF` / dark surfaces, zero text bleed-through; hit-test inside hits `<aside>` and outside hits `.rj-sidebar-backdrop`.
  - **Portal, 10-Point Hit-Test, Sticky & Layout Stability**:
    - `main.locator('[role="dialog"]').count() === 0` on both `ApplyDialog` and `WithdrawDialog`; **`10/10` points** (`5` `header` + `5` `aside`: 4 corners inset `8px` + center) intercepted by `div.rec-dialog-backdrop` on both dialogs.
    - CLOSED vs OPEN vs AFTER-CLOSE `boundingBox()` of `html`, `body`, `header`, `aside`, `main` identical (`dx = 0, dy = 0, dw = 0, dh = 0`) across `1440` (`html.width = 1424.8`), `1024` (`1008.8`), `768` (`752.8`), `375` (`360`) Light & Dark, top/middle/bottom; `body.style = null`; `html.width <= viewport width`.
  - **Keyboard, Focus Return, `Select`, Back/Forward/Reload & Console/Network**:
    - Real keyboard (`Tab` + `Enter`) -> `Tab`/`Shift+Tab` focus trap (`7/7` inside `[role="dialog"]` on both dialogs) -> right-click & double-click safe -> `Escape` -> exact focus return to trigger (`"Ứng tuyển"`, `"Rút hồ sơ ứng tuyển"`).
    - `/candidate/applications`: route transition clean, `ApplyDialog` count = `0`, `<Select>` (`"Lọc theo trạng thái"`) listbox rendered above cards (`113-ut01-modal-after-select-1440-light.png`), closed cleanly on `Escape`.
    - Navigation while `WithdrawDialog` open: `goBack()` -> `/candidate/applications` (`dialogCount = 0`, `data-scroll-locked = null`, wheel scrolled `0 -> -250.4`), `goForward()` -> `dialogCount = 0`, `data-scroll-locked = null`, `reload()` -> `/login` (`dialogCount = 0`, `data-scroll-locked = null`).
    - `0` console errors; `0` unexpected HTTP `>= 400` (only expected `GET /api/v1/me/cvs -> 403` and initial expired SSO ticket `401`).
  - **Out-of-Scope `origin/develop` Observations (Reported Only)**:
    - Pre-existing `@keyframes rj-drawer-slide-in` (`identity.css:2136-2145`, unchanged vs `origin/develop`) animates `opacity: 0 -> 1` alongside `translateX(-100%) -> 0` over `280ms`, causing slight transparency during mid-slide frames prior to settling.
    - `ApplyDialog` initial focus lands on the first focusable node (`×` close button via `getFocusableElements`), pre-existing UT-01 behavior.
- **Block C — Screenshots (`15` PNGs in `docs/ut01/pr-screenshots/`, indexed in `ORDER.txt`)**:
  - BEFORE (`2`): `100-ut01-modal-before-apply-light-1440.png` (`166,611 B`), `100b-ut01-modal-before-apply-top-light-1440.png` (`148,811 B`).
  - AFTER (`13`): `101-ut01-modal-after-apply-scrolled-1440-light.png` (`171,320 B`), `102-ut01-modal-after-apply-top-1440-light.png` (`145,373 B`), `103-ut01-modal-after-apply-scrolled-1440-dark.png` (`129,438 B`), `104-ut01-modal-after-apply-1024-light.png` (`129,241 B`), `105-ut01-modal-after-apply-768-light.png` (`135,412 B`), `106-ut01-modal-after-apply-375-light.png` (`72,862 B`), `107-ut01-modal-after-apply-375-dark.png` (`68,530 B`), `108-ut01-modal-after-withdraw-1440-light.png` (`114,813 B`), `109-ut01-modal-after-withdraw-1440-dark.png` (`89,598 B`), `110-ut01-modal-after-withdraw-375-light.png` (`77,511 B`), `111-ut01-modal-after-drawer-375-light.png` (`26,894 B`), `112-ut01-modal-after-drawer-375-dark.png` (`26,035 B`), `113-ut01-modal-after-select-1440-light.png` (`91,987 B`).
- **Block D — Honest Sandbox Limits & Replacements**:
  - `webview_browser` blocks `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request`, and `page.route`. Replaced natively with `click({ trial: true, timeout: 1000 })`, `boundingBox()`, `getAttribute()`, `main.locator(...)`, plus Vitest/`jsdom` suites covering `React.StrictMode` double-invocation, `prefers-reduced-motion`, simultaneous drawer + dialog `Option 1A` (`SharedAppLayout.test.tsx`), and CSS/source token scanning (`overlayLayeringContract.test.ts`).

### 11.2. Tiếng Việt

- **Block A — Tái hiện TRƯỚC khi sửa (`1440x900` Sáng, `/candidate/jobs`, `lms-sv-001`)**:
  - Tại `scrollY = 900` (`100-ut01-modal-before-apply-light-1440.png`, `166,611 B`): mở `ApplyDialog` gán `body.style="overflow: hidden;"`, làm `header` tụt `0 -> -900` (`-900.00 px`), `aside` tụt `56 -> -843.20` (`-899.20 px`), `main.locator('[role="dialog"]').count() === 1`, và kiểm thử chạm `click({ trial: true })` bấm xuyên vào sidebar/header (`HIT_THROUGH_TO_SIDEBAR` / `HIT_THROUGH_TO_HEADER`) (kèm đo đạc của Team Lead tại `scrollY = 797`: `aside` nhảy `56 -> -740` và `clientWidth` dịch `1425 -> 1440`). Tại `scrollY = 0` (`100b-ut01-modal-before-apply-top-light-1440.png`, `148,811 B`), header (`56.8 px`) và sidebar (`280 px`) trắng sáng không bị làm tối nổi đè trên `.rec-dialog-backdrop`.
- **Block B — Xác minh SAU khi sửa (Pass 1 phát hiện lỗi -> Pass 2 đạt 0 lỗi)**:
  - Sau khi Pass 1 phát hiện Blocking Defect #1 (`mouse.wheel` vượt khóa vì `overflow: clip hidden` và thiếu listener `{ passive: false }`) và Defect #2 (ảnh drawer `375px` chụp giữa animation `280ms`), Iteration 3 đã sửa `design-tokens.css` và `scrollLock.ts` rồi build lại `rikkei-frontend`.
  - **Pass 2 (`ebd271ff-ca38-442e-b3dd-6608f047873e` qua Parent `78f066ff-a6a7-442b-bf5b-339bf74900c5`, cửa sổ trình duyệt HIỂN THỊ, `lms-sv-001` qua tab doanh nghiệp sau vé SSO hết hạn 401, không thay đổi dữ liệu)**:
    - Chặn cuộn `mouse.wheel` cả 2 chiều `+`/`-` và `PageDown`/`ArrowDown` (`delta html.y = 0`) trên `ApplyDialog` (`1440` Sáng/Tối `-950.4`, `1024` `-372.80`, `768` `0`, `375` Sáng/Tối `-856`), Mobile Drawer `375x812` Sáng (`400`) & Tối (`1172.8`), và `WithdrawDialog` (`1440` Sáng/Tối `-0.80`, `375` Sáng `-982.40`); phím `Escape` mở khóa (`data-scroll-locked=null`), giữ nguyên vị trí cuộn và khôi phục cuộn bánh xe.
    - Mobile drawer `375x812` sau khi dừng trượt (`700ms > 280ms`): `asideBox = {x: 0, y: 0, width: 280, height: 812}`, liên kết đầu `x = 12 >= 0` không bị cắt, nền đặc `#FFFFFF` / tối không lộ chữ nền.
    - `main.locator('[role="dialog"]').count() === 0`; **`10/10` điểm** (5 trên `header` + 5 trên `aside`) bị `div.rec-dialog-backdrop` chặn đúng trên cả hai dialog; `boundingBox()` đóng/mở/sau-đóng của `html`, `body`, `header`, `aside`, `main` đồng nhất 100% (`dx = 0, dy = 0, dw = 0, dh = 0`), `body.style = null`, `html.width <= chiều rộng viewport`.
    - Bàn phím thật (`Tab` + `Enter`) -> focus trap (`7/7` trong dialog) -> chuột phải & double-click an toàn -> `Escape` trả tiêu điểm chính xác về nút mở (`"Ứng tuyển"`, `"Rút hồ sơ ứng tuyển"`); `<Select>` (`"Lọc theo trạng thái"`) nổi trên thẻ và đóng bằng `Escape`; `goBack()`/`goForward()`/`reload()` khi `WithdrawDialog` mở không rò rỉ khóa (`data-scroll-locked = null`, cuộn bình thường sau `goBack()`); `0` lỗi console, `0` HTTP `>= 400` ngoài dự kiến.
    - Ghi nhận ngoài phạm vi (`origin/develop`): `@keyframes rj-drawer-slide-in` (`opacity: 0 -> 1` trong `280ms`) và tiêu điểm ban đầu của `ApplyDialog` đặt vào nút `×`.
- **Block C & D — Ảnh chụp & Giới hạn Sandbox**: `15` ảnh PNG (`100`, `100b`, `101`..`113`) trong `docs/ut01/pr-screenshots/` khớp `ORDER.txt`; đã công khai trung thực giới hạn `webview_browser` (`page.evaluate`/`emulateMedia`/`route`/`request` bị chặn) và các phép đo native (`click({ trial: true })`, `boundingBox()`, `getAttribute()`, `main.locator()`) cùng Vitest/`jsdom` thay thế tương ứng.
