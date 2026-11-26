# `[UT-02]` Live Browser Verification Observations (`T0235C3`)

**Task Code**: `T0235C3` (`UT-02` Port — Recruitment Process: Screening, Interview Rounds & Staff Oversight)
**Verified Stack**: Live Docker Compose stack (`http://127.0.0.1:3000` Nginx frontend proxy -> `http://127.0.0.1:8080` Spring Boot backend, PostgreSQL `18.6`, Mock LMS `:9000`, Mailpit `http://127.0.0.1:8025`)
**Browser Sessions**:

- Pass 1 (HR `hr1` / `hr2` & modals/concurrency/responsive): session `0000cf55-50b4-434d-87b0-c42da1fb36ff` (latest screenshot: `browser_evidence/0000cf55-50b4-434d-87b0-c42da1fb36ff/final_step_103.png`)
- Pass 2 (STAFF `staff1` initial & responsive): session `acefc422-1690-4be8-b2ca-c916683b66cd`
- Pass 2b (STAFF `staff1` completion, CANDIDATE `candidate1`, Mailpit check & `375x812` dark): session `3de628e9-bee2-4e32-8df2-8db631f5964a` (latest screenshot: `browser_evidence/3de628e9-bee2-4e32-8df2-8db631f5964a/final_step_32.png`)

**Host-Verified Origins**: `http://127.0.0.1:3000`, `http://127.0.0.1:8025` (`blocked_origins: none`)
**Global Telemetry (All 3 Passes)**: `0` console errors, `0` CSP violations, `0` unintended HTTP `>= 400` responses (only the intentional 2-tab `409` concurrency test and `401` on expired 60s SSO ticket before enterprise login fallback).

---

## 1. End-to-End Role Journeys Observed

### 1.1. HR Flows (`hr1@rikkeijobs.test` & `hr2@rikkeijobs.test`) — Pass 1 (`PASS`)

1. **Mandatory Password-Change Wall (`hr1`)**:
   - Logged in via Enterprise login (`POST /api/v1/auth/login` HTTP `200`, `mustChangePassword: true`).
   - Redirected immediately to `/change-password` displaying `"Yêu cầu đổi mật khẩu: Bạn phải đổi mật khẩu trước khi có thể truy cập các tính năng khác của hệ thống."`.
   - Verified `hr1` password was left unchanged (`must_change_password = true` preserved) and logged out cleanly.

2. **Option 1A Company Jobs & Application List (`hr2` on `/hr` -> `/hr/recruitment`)**:
   - `GET /api/v1/hr/jobs?page=1&size=20` returned HTTP `200` with 3 company-2 jobs (`Job 12`: `0` apps; `Job 8`: `1` app `#2` `SCREENING` preserved; `Job 2`: `1` app `#1` `SUBMITTED`).

3. **Application Detail (`#1`, `/hr/applications/1`) & Option 2A PDF Snapshot**:
   - `GET /api/v1/applications/1` returned HTTP `200`, displaying `"Độ phù hợp 100%"`, badge `"Đã gửi"`, 5-step progress stepper/timeline, and `"Thêm vòng phỏng vấn"` disabled with hint `"Hồ sơ ở trạng thái hiện tại không thể thêm vòng phỏng vấn mới."`.
   - Clicking `"Tải bản CV đã nộp"` called `GET /api/v1/applications/1/cv-snapshot` returning HTTP `200` (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="sample-candidate-cv.pdf"`, `0` errors).

4. **`StatusTransitionModal` (`SUBMITTED -> SCREENING`) & Overlay Layering Contract**:
   - Modal was portaled outside `<main>` (`main.locator('[role="dialog"]').count() === 0`).
   - `html[data-scroll-locked]="true"` was active while open and cleared (`null`) on close.
   - `CLS = 0`: `header` bounding box `(0, 0, 1424.8, 56.8)` and `main` bounding box `(280, 56.8, 1144.8, 917.95)` remained identical before and after opening the modal.
   - Radio choices rendered strictly `detail.allowedTransitions` (`Sàng lọc`, `Không đạt`). Empty submit was blocked with inline Vietnamese validation.
   - Focus trap verified across `11/11` `Tab`/`Shift+Tab` cycles; right-click and double-click inside modal kept overlay intact; `Escape` closed the dialog and restored focus to `"Chuyển trạng thái đơn"`; `Enter` reopened it cleanly.
   - Submitted `SUBMITTED -> SCREENING` with Vietnamese note (`POST /api/v1/applications/1/transition` HTTP `200`) and verified live status toast `"Đã cập nhật trạng thái hồ sơ thành công."`.

5. **`AddInterviewRoundModal` & `SCREENING` Rules**:
   - Enabled in `SCREENING` (`44px` trigger height), portaled outside `<main>`, `data-scroll-locked="true"`, focus trap `8/8`, `Escape` returned focus to `"Thêm vòng phỏng vấn"` and `Enter` reopened it.
   - Created `"Vòng 1 - Phỏng vấn kỹ thuật Java"` (`lead.java@companyb.test`, `2026-11-26T10:00`) -> `POST /api/v1/applications/1/rounds` HTTP `201`, updating `"Các vòng phỏng vấn (1)"` (`Chờ kết quả`).

6. **`SCREENING -> INTERVIEW`, `UpdateRoundModal` Validation & `canSendOffer` Banner**:
   - Transitioned `SCREENING -> INTERVIEW` (`POST /api/v1/applications/1/transition` HTTP `200`; modal offered only `Phỏng vấn` and `Không đạt`); warning banner displayed ineligible offer state while round 1 was pending.
   - Entered invalid `score = 85.126` in `UpdateRoundModal` -> blocked client-side (`aria-invalid="true"`, `0` network calls, message `"Điểm đánh giá phải từ 0 đến 100 và tối đa 2 chữ số thập phân."`).
   - Submitted valid `score = 88.50`, result `Đạt` (`PASS`), and Vietnamese note -> `PUT /api/v1/applications/1/rounds/7` HTTP `200`; row updated to `Đạt` / `88.5 / 100` and green banner activated: `"Đủ điều kiện đề nghị nhận việc: Mọi vòng phỏng vấn đã hoàn tất và vòng cuối cùng đạt kết quả Đạt."`.

7. **Two-Tab Concurrent Optimistic-Lock Conflict (`409`)**:
   - Opened Tab B as `hr2` on `/hr/applications/1` (`INTERVIEW`), transitioned Tab A `INTERVIEW -> REJECTED` (`POST` HTTP `200`), then submitted Tab B's stale modal -> `POST` HTTP `409` displayed calm Vietnamese alert: `"Không thể chuyển sang trạng thái đã chọn từ trạng thái hiện tại của hồ sơ."` with zero optimistic state corruption. Tab A reflected `"Không đạt"`.

8. **HR Interactions & Navigation**:
   - Verified hover, right-click, double-click, wheel scroll, keyboard navigation, and browser Back/Forward with `0` layout breaks or console errors.
   - Note on memory-only JWT auth (`Rule 08`): full-document navigation via `page.goto('/hr/applications/3')` clears in-memory React `accessToken` and redirects cleanly to `/login` without firing unauthenticated `/api/v1/applications/3` requests.

### 1.2. STAFF Flows (`staff1@rikkeijobs.test`) — Pass 2 & Pass 2b (`PASS`)

1. **Login & List Filters (`/staff` -> `/staff/applications`)**:
   - Authenticated via Enterprise login (`POST /api/v1/auth/login` HTTP `200`; initial 60s SSO mock ticket expired before browser navigation completed, so fallback Enterprise login was used).
   - `GET /api/v1/staff/applications?page=1&size=20` returned HTTP `200` with `7` seeded rows (`#1..#7`).
   - Verified filters: `companyId=1` (`2/2`), `jobId=1` (`1/1`), `status=REJECTED` (`2/2`), combined `companyId=1&jobId=1&status=REJECTED` (`0/0` empty state), and `"Đặt lại"` restoring `7/7`. Pagination controls stayed hidden while `totalItems (7) <= 20`.

2. **Read-Only Detail (`/staff/applications/3`) & Option 2A PDF Snapshot**:
   - `GET /api/v1/applications/3` returned HTTP `200` with badge `"Chế độ theo dõi chỉ đọc"`, `"Độ phù hợp 87%"`, `3` history entries, `2` interview rounds, and strictly `0` mutation controls (`Chuyển trạng thái đơn`, `Thêm vòng phỏng vấn`, `Cập nhật kết quả` absent).
   - Clicking `"Tải bản CV đã nộp"` called `GET /api/v1/applications/3/cv-snapshot` returning HTTP `200` (`application/pdf`, `sample-candidate-cv.pdf`, `0` errors).

3. **Interactions, Reload & 16 Responsive Viewport/Theme Combinations**:
   - Verified hover, right-click, double-click, wheel scroll, `Space`/`Enter`, Back/Forward, unauthenticated redirect, and `page.reload()` redirect to `/login`.
   - Checked all `16` combinations across `375x812`, `768x1024`, `1024x768`, and `1440x900` in Light and Dark themes on HR/STAFF views: `0` horizontal page overflow (`body` width `360px / 752.8px / 1008.8px / 1424.8px`, strictly `<= viewport` width).

### 1.3. CANDIDATE Cross-Role Live Verification (`candidate1@rikkeijobs.test`) — Pass 2b (`PASS`)

1. Logged in via Enterprise login (`POST /api/v1/auth/login` HTTP `200`) and navigated to `/candidate/applications` and `/candidate/applications?id=1`.
2. Confirmed summary counters (`7` total: `Đang xử lý: 3`, `Đã kết thúc: 4`) and verified application `#1` displayed `"Không đạt"` with all `4` `"Lịch sử trạng thái"` items matching `hr2`'s Pass 1 transitions verbatim:
   - `Đã gửi` — `"Ứng viên nộp hồ sơ ứng tuyển."`
   - `Đã gửi → Sàng lọc` — `"Hồ sơ phù hợp kỹ năng nền tảng, chuyển sàng lọc"`
   - `Sàng lọc → Phỏng vấn` — `"Đạt vòng sàng lọc, mời phỏng vấn kỹ thuật"`
   - `Phỏng vấn → Không đạt` — `"Ứng viên chưa đạt yêu cầu cuối cùng, chuyển trạng thái không đạt"`
3. Verified `375x812` Dark mode (`body`/`main`/`#root` measured `360px`, `0` horizontal overflow) and clean logout.

---

## 2. Three Findings, Root-Cause Investigation & Resolutions

### 2.1. Finding #1: Mailpit Inbox Empty (`total: 0`) at Pass 2b (`07:31Z`)

- **Symptom**: During Pass 2b (`07:31Z`), `http://127.0.0.1:8025/api/v1/messages` returned `{"total": 0, "messages": []}` despite `hr2` performing 3 status transitions on application `#1` during Pass 1 (`06:33Z-06:40Z`).
- **Root-Cause Investigation (Executed on Running Stack Before Teardown)**:
  1. `docker inspect` across all 5 services (`rikkei-mailpit`, `rikkei-backend`, `rikkei-postgres`, `rikkei-frontend`, `rikkei-mock`) showed `RestartCount=0` and `StartedAt=2026-11-25T07:24:18Z` for every container.
  2. `docker logs rikkei-mailpit` showed two distinct boot sequences: `2026/11/25 06:18:33` and `2026/11/25 07:24:19`. Because `axllent/mailpit:v1.33.1` stores emails in RAM (ephemeral storage without a volume) whereas `rikkei-postgres` persists state in a Docker named volume, the stack restart at `07:24:18Z` cleared Mailpit's in-memory mailbox while keeping Pass 1's `application_status_history` rows (`id=22, 23, 24`) in PostgreSQL.
  3. `docker logs rikkei-backend` proved all 3 Pass 1 transitions did dispatch emails on `rikkei-async-*` with zero SMTP errors:
     - `2026-11-25T06:33:11.099Z INFO ...CandidateTransitionNotificationListener : Dispatched candidate transition email for applicationId=1 fromStatus=SUBMITTED toStatus=SCREENING`
     - `2026-11-25T06:34:44.147Z INFO ...CandidateTransitionNotificationListener : Dispatched candidate transition email for applicationId=1 fromStatus=SCREENING toStatus=INTERVIEW`
     - `2026-11-25T06:40:35.346Z INFO ...CandidateTransitionNotificationListener : Dispatched candidate transition email for applicationId=1 fromStatus=INTERVIEW toStatus=REJECTED`
- **Live Re-Verification Proof**:
  - Created temporary application `#9` for `candidate3@rikkeijobs.test` on `job_id = 2`, transitioned `SUBMITTED -> SCREENING` as `hr2` (`HTTP 200`), and queried `http://127.0.0.1:8025/api/v1/messages`:
    - Mailpit received the live message (`total: 1`, `to: candidate3@rikkeijobs.test`, `from: no-reply@rikkeijobs.local`, `subject: "Rikkei Jobs - Cập nhật trạng thái hồ sơ #9: Fresher Java Developer"`, HTML CTA link to `/candidate/applications` present).
    - Backend log emitted `2026-11-25T07:36:12.487Z INFO ...CandidateTransitionNotificationListener : Dispatched candidate transition email for applicationId=9 fromStatus=SUBMITTED toStatus=SCREENING`.
  - Cleaned up temporary application `#9`, Mailpit test message, and throwaway verification script afterward (`7` apps remained in DB).
- **Status**: Resolved — root cause was external container restart wiping Mailpit RAM storage; `CandidateTransitionNotificationListener` delivery verified live.

### 2.2. Finding #2: Dense Table Row Stretching (`135-156px`) & Mobile `375px` Touch Targets (`32px`)

- **Symptom**: Table headers (`th`) measured `38px`, but multi-line text wrapping in `/staff/applications` (`134.8px` rows) and `/hr/recruitment` (`155.8px` rows) stretched row heights, and `.rec-table-action-btn` (`"Xem chi tiết"`, `"Cập nhật kết quả"`) measured `32px` height on `375px` mobile (below WCAG 2.2 AA `44px` touch target minimum).
- **Fix Applied (`Change Group 4b`)**:
  - `frontend/src/features/recruitment/styles/recruitment.css`: added `white-space: nowrap` on `.rec-dense-table td`, added `.rec-cell-ellipsis` (`display: block; max-width: 13.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`), and under `@media (max-width: 767px)` enforced `min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; justify-content: center` on `.rec-table-action-btn`, `.rec-rounds-header .rj-btn`, and `.rec-dense-table .rj-link` (100% `--rj-*` design tokens, zero raw colors or raw z-index).
  - `StaffApplicationsPage.tsx`, `HrRecruitmentPage.tsx`, `InterviewRoundsSection.tsx`: applied `.rec-cell-ellipsis` with `title` attributes on `candidateName`, `candidateEmail`, `jobTitle`, `companyName`, `coverLetter`, `round.name`, `round.interviewerEmail`, and `round.note` so desktop dense rows stay compact without losing full-text hover/assistive access.
  - Added defensive polish in `ApplicationDetailPage.tsx` (fail-closed `user?.role === 'HR' ? 'HR' : 'STAFF'`) and `HrRecruitmentPage.tsx` (sync reset of `appsPage` to `1` when `:jobId` route param changes without double-fetch).
- **Verification**: Vitest suite (`50/50` files, `561/561` tests including `overlayLayeringContract.test.ts` and new ellipsis/`title`/fail-closed/`appsPage` reset assertions), ESLint, TypeScript, Vite build, and `compute-contrast.mjs` (`120` pairs) all pass with `0` warnings.

### 2.3. Honest Sandbox Tooling Limitations

- The `webview_browser` verification runner blocks script injection APIs (`page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, and `page.request`).
- All geometry, scroll-lock (`html[data-scroll-locked]`), focus trap, `CLS = 0`, responsive overflow, network, and console/CSP checks were measured without script injection via `boundingBox()`, `getAttribute()`, genuine keyboard/mouse/wheel inputs, and browser HUD network/console telemetry.

---

## 3. UT-02-fix (`T0235C3`) Live `/browser` Verification (D1–D4 Remediation)

- **Browser Session ID**: `86cb32d5-f925-4e04-ac62-298905a97dd2`
- **Host-Verified Origins**: `http://127.0.0.1:3000` (`blocked_origins: none`)
- **Latest Screenshot Ref**: `browser_evidence/86cb32d5-f925-4e04-ac62-298905a97dd2/final_step_63.png`
- **Global Telemetry**: `0` console errors, `0` CSP violations, `0` unintended HTTP `>= 400` responses (only the intentional 2-tab `409` optimistic-lock conflict probe).

### 3.1. D1 — HR Home (`/hr`, `hr2@rikkeijobs.test`)

1. Authenticated via Enterprise login (`POST /api/v1/auth/login` HTTP `200`).
2. Verified the `"Tính năng sắp ra mắt"` card lists ONLY genuinely pending features: `"Đăng tin tuyển dụng"` and `"Thực tập sinh IOC"` (`comingSoonHasQuanLyUngVien = false`, `comingSoonHasMoTuyenDung = false`).
3. Verified the live recruitment entry is exposed as the single primary hero CTA `"Mở tuyển dụng"` routing to `/hr/recruitment`.
4. Verified `0` `/hr/company` links inside the hero action box and `2` `/hr/company` links total across the page (left sidebar + company summary card).
5. Responsive & Theme Matrix (`0` horizontal overflow):
   - `1440x900` Light & Dark: `body = 1424.8px`, `#root = 1424.8px`, `main = 1144.8px` (all `<= 1440px`).
   - `375x812` Light & Dark: `body = 360px`, `#root = 360px`, `main = 360px` (all `<= 375px`), with `7/7` touch targets `>= 44px`.
6. Verified full user interactions: left click, right click, double click, wheel scroll, `Tab`/`Space` keyboard navigation, browser Back/Forward, and full-document reload redirecting cleanly to `/login` (memory-only JWT policy).

### 3.2. D2 — HR Recruitment (`/hr/recruitment`)

1. `GET /api/v1/hr/jobs?page=1&size=20` returned HTTP `200` with backend-computed `expired` and derived `status`.
2. Checked all `4` viewport/theme combinations (`1440x900` Light/Dark and `375x812` Light/Dark):
   - `"Java Developer 2024 (EXPIRED - Không gợi ý)"` (`01/01/2024`) rendered the `"Hết hạn"` badge with an inline `<svg>` icon (`svgCount = 1`, non-color-only) in both the job list and the job detail header.
   - `"Software QA / QC Engineer"` and `"Fresher Java Developer"` (`31/12/2027`) rendered the `"Đang mở tuyển"` badge with an inline `<svg>` icon (`svgCount = 1`).
   - `0` horizontal overflow across all 4 combinations (`1440`: `body = 1204px`, `main = 924px`; `375`: `html`, `body`, `main`, and `#root` all `360px`).

### 3.3. D3 — `UpdateRoundModal` & Two-Tab `409` Conflict (`/hr/applications/2`)

1. On `/hr/applications/2` (`SCREENING`), added round `"Vòng 1 - Phỏng vấn QA"` (`POST /api/v1/applications/2/rounds` HTTP `201`, `id = 19`, `roundNo = 1`, `version = 0`) and transitioned `SCREENING -> INTERVIEW` (`POST /api/v1/applications/2/transition` HTTP `200`).
2. Tab A updated the round (`PASS`, `86.50` -> `PUT /api/v1/applications/2/rounds/19` HTTP `200`, advancing to `version = 1`).
3. Opened Tab B on `/hr/applications/2` viewing the same round at `version = 1`. Tab A then submitted an update (`90.00` -> `PUT` HTTP `200`, advancing to `version = 2`), after which Tab B submitted its stale modal (`75.00`).
4. Tab B received `PUT /api/v1/applications/2/rounds/19` HTTP `409` and rendered the calm `[role="alert"]` banner: `"Dữ liệu hồ sơ vừa được cập nhật. Vui lòng tải lại trang và thử lại."` with zero state corruption, followed by clean logout.

### 3.4. Sandbox Tooling Limits (Honest Disclosure)

- `webview_browser` blocks script-injection APIs (`page.evaluate`, `locator.evaluate`, `page.route`, and `page.emulateMedia`).
- Overflow checks were therefore verified via `boundingBox()` width comparisons against `1440` and `375` px; Dark mode was toggled via the UI `"Chế độ tối"` control; and `375x812` measurements were captured in dedicated steps without `page.screenshot()` resetting the viewport.

---

## 4. UT-02-fix2 (`T0235C3`) — Live `/browser` Verification

- **Verified Stack & Account**: Live Docker Compose stack (`http://localhost:3000` Nginx proxy -> `http://localhost:8080` backend, PostgreSQL `18.6`, Mock `:9000`, Mailpit `:8025`), authenticated via Enterprise login as `hr2@rikkeijobs.test` (`company_id = 2`, `logo_url IS NULL`, `must_change_password = false`) across two live `/browser` passes.
- **Evidence Folder**: `docs/ut02/pr-screenshots/` (`16/16` non-zero PNG files preserved; moved from `browser_evidence/` in `UT-02-fix3`).
- **Global Telemetry**: `Console errors: 0`, `CSP violations: 0`, `Unintended HTTP >= 400: 0` (only the `4` deliberately provoked HTTP `409` responses across the two-tab D2 concurrency tests).

### 4.1. D1 — HR Home Company Next-Step Guidance (`/hr`)

1. **Multi-Viewport & Light/Dark Rendering (`0` Horizontal Overflow via `locator.boundingBox()`)**:
   - Verified `/hr` across `1440x900` Light (`docs/ut02/pr-screenshots/d1_hr_home_1440_light.png`), `1440x900` Dark (`docs/ut02/pr-screenshots/d1_hr_home_1440_dark.png`), `1024x768` Light (`docs/ut02/pr-screenshots/d1_hr_home_1024_light.png`), `768x1024` Light (`docs/ut02/pr-screenshots/d1_hr_home_768_light.png`), `375x812` Light (`docs/ut02/pr-screenshots/d1_hr_home_375_light.png`), and `375x812` Dark (`docs/ut02/pr-screenshots/d1_hr_home_375_dark.png`) with `0` horizontal overflow measured via `locator.boundingBox()`.
2. **Stacked Hero Next-Step Boxes (`16.00px` Vertical Gap)**:
   - Confirmed two stacked `.rj-cand-next-box` blocks inside `.rj-stack-md` separated by a `16.00px` gap (`docs/ut02/pr-screenshots/d1_hr_home_1440_light.png`, `docs/ut02/pr-screenshots/d1_hr_home_1440_dark.png`, `docs/ut02/pr-screenshots/d1_hr_home_1024_light.png`, `docs/ut02/pr-screenshots/d1_hr_home_768_light.png`, `docs/ut02/pr-screenshots/d1_hr_home_375_light.png`, `docs/ut02/pr-screenshots/d1_hr_home_375_dark.png`):
     - Top box (`.rj-hr-next-box`): `"Bước tiếp theo cho doanh nghiệp"` / `"Tải lên logo cho Công ty Cổ phần Giải pháp Số Đông Dương"` with primary CTA `"Mở hồ sơ công ty"` routing to `/hr/company`.
     - Second box directly below: `"Hoạt động tuyển dụng"` / `"Quản lý quy trình tuyển dụng và vòng phỏng vấn"` with secondary CTA `"Mở tuyển dụng"` routing to `/hr/recruitment`.
3. **Link Counts, Coming-Soon Card & Mobile Touch Targets**:
   - Confirmed `2` `/hr/company` links (hero primary CTA + `"Hồ sơ công ty"` summary card) and `1` `/hr/recruitment` link inside `<main>`, plus the `2`-item `"Tính năng sắp ra mắt"` `<aside>` (`"Đăng tin tuyển dụng"`, `"Thực tập sinh IOC"`) (`docs/ut02/pr-screenshots/d1_hr_home_1440_light.png`, `docs/ut02/pr-screenshots/d1_hr_home_1440_dark.png`, `docs/ut02/pr-screenshots/d1_hr_home_1024_light.png`, `docs/ut02/pr-screenshots/d1_hr_home_768_light.png`).
   - Confirmed `44px` mobile touch targets on `375x812` Light and Dark (`docs/ut02/pr-screenshots/d1_hr_home_375_light.png`, `docs/ut02/pr-screenshots/d1_hr_home_375_dark.png`).

### 4.2. D2 — Two-Tab Real `409` Conflict Recovery (`/hr/applications/{24,25,26}`)

1. **`StatusTransitionModal` (Application `#25`, `SUBMITTED`)**:
   - Entered note `"Ghi chu giu nguyen"` (`18/2000 ký tự`) with `"Sàng lọc"` selected while a second authenticated HR session transitioned `#25` `SUBMITTED -> SCREENING`. Submitting triggered `POST /api/v1/applications/25/transition` HTTP `409` (`INVALID_TRANSITION`); the modal stayed open with `"Ghi chu giu nguyen"` preserved, displayed a calm Vietnamese explanation (no `"tải lại trang"`), and exposed `"Tải lại dữ liệu mới nhất"` (`docs/ut02/pr-screenshots/d2_transition_409.png`).
   - Clicking `"Tải lại dữ liệu mới nhất"` refetched detail in-place via API (no document reload, no `/login` redirect, no blank page), updated the modal to `SCREENING`, and enabled saving `SCREENING -> INTERVIEW` (`POST` HTTP `200`), displaying `"Đã cập nhật trạng thái hồ sơ thành công."` and status `"Phỏng vấn"` (`docs/ut02/pr-screenshots/d2_transition_recovered_saved.png`).
2. **`UpdateRoundModal` (Application `#24`, Round `18` / `#1`)**:
   - Provoked `PUT /api/v1/applications/24/rounds/18` HTTP `409` (`CONFLICT`) after a second session updated round `18` (`v0 -> v1`). The modal remained open preserving `"Đạt"`, score `88.5`, and note `"Tab A draft kept"`, rendering the Vietnamese alert (no `"tải lại trang"`) and `"Tải lại dữ liệu mới nhất"` (`docs/ut02/pr-screenshots/d2_update_round_409.png`).
   - Clicking `"Tải lại dữ liệu mới nhất"` synced round `18` to `v1` in-place without `/login` redirect and saved score `91.5 / 100` (`"Tab A recovered v2 save"`) -> `PUT` HTTP `200` (`v1 -> v2`), updating the rounds table and activating the green `"Đủ điều kiện đề nghị nhận việc"` banner (`docs/ut02/pr-screenshots/d2_update_round_recovered_saved.png`).
   - Verified `375x812` mobile `409` layout (`77`, `"Tab A recovered v2 save"`) with `0` horizontal overflow and mobile touch targets `63px` (refresh button), `44px` (close icon button), and `44px` (modal action buttons) (`docs/ut02/pr-screenshots/d2_modal_375_mobile.png`).
   - After advancing round `18` in the second session (`v2 -> v3`, score `95`, `"Session 2 v3 close-test"`), closing the `409` modal via `Escape` automatically refetched page detail in-place so the table displayed `95 / 100` and `"Session 2 v3 close-test"` (`docs/ut02/pr-screenshots/d2_update_round_close_refetched.png`).
3. **`AddInterviewRoundModal` (Application `#26`, `SCREENING`)**:
   - Entered `"Vòng kỹ thuật giữ lại"`, `"tech@companyb.test"`, and `"11/28/2026 10:00 AM"` while a second session transitioned `#26` `SCREENING -> REJECTED`. Submitting triggered `POST /api/v1/applications/26/rounds` HTTP `409` (`INVALID_APPLICATION_STATE`); the dialog stayed open with all typed inputs preserved, displaying the Vietnamese explanation (no `"tải lại trang"`) and `"Tải lại dữ liệu mới nhất"` (`docs/ut02/pr-screenshots/d2_add_round_409.png`).
   - Clicking `"Tải lại dữ liệu mới nhất"` refetched `#26` as `REJECTED`, closed the dialog automatically, displayed the page-level `role="alert"` banner (`"Hồ sơ đã chuyển sang trạng thái mới và không còn cho phép thêm vòng phỏng vấn."`), and left the `"Thêm vòng phỏng vấn"` trigger disabled with helper text (`docs/ut02/pr-screenshots/d2_add_round_unavailable_notice.png`).

### 4.3. D4 — Safe Job Status Mapping (`/hr/recruitment`)

- Inspected temporary DB verification jobs `#13` (`REJECTED`) and `#14` (`ARCHIVED`, unknown fallback) on `/hr/recruitment` prior to DB cleanup:
  - Job `#13` (`REJECTED`) rendered `"Đã từ chối"` with an `x` icon in both the left job list item and the right job detail header (`docs/ut02/pr-screenshots/d4_recruitment_rejected.png`).
  - Job `#14` (`ARCHIVED`) rendered neutral `"Không xác định"` with a neutral `alert-circle` icon in both the left job list item and the right job detail header, showing `0` raw enums and `0` open-like badges (`docs/ut02/pr-screenshots/d4_recruitment_unknown.png`).

### 4.4. Honest Sandbox Tooling Disclosure

- The `webview_browser` runner blocks script-injection APIs (`page.evaluate`, `PerformanceObserver` (`CLS`), `document.documentElement.scrollWidth`, and in-page `securitypolicyviolation` listeners).
- Consequently, an in-page `PerformanceObserver` `CLS` JS numeric readout is `NOT VERIFIED via JS eval (sandboxed)`; non-overflow and layout stability were instead verified via `locator.boundingBox()` geometry checks across all viewports, fixed-height `.rj-hr-next-content` CSS (`CLS = 0` structural contract), and direct visual inspection of all `16` PNG screenshots in `docs/ut02/pr-screenshots/`.
- Browser-level telemetry (`Console errors: 0`, `CSP violations: 0`, `Unintended HTTP >= 400: 0` excluding the `4` provoked `409`s) remained active and clean throughout both passes.

---

## 5. UT-02-fix3 (`T0235C3`) — Live `/browser` Verification (D1, D3 & Responsive)

- **Context Note**: Following the Team Lead's re-verification of `UT-02-fix2` (where the Team Lead observed **`9/10`**, not `10/10`, consecutive full-suite Vitest runs due to the passive-effect focus race on Run 2 plus D1/D3 UX issues), `UT-02-fix3` was verified live on a fresh Docker Compose stack (`http://localhost:3000`, `hr2@rikkeijobs.test` / `Test@123`, `/hr/applications/2` & `/hr/applications/1`).
- **Evidence Folder (`23` PNGs Total)**: `docs/ut02/pr-screenshots/` (`16` moved `UT-02-fix2` PNGs from removed `browser_evidence/` + `7` new `ut02_fix3_*.png` screenshots).
- **Global Telemetry**: `Console errors: 0`, `Unexpected network errors: 0` (excluding the deliberately provoked `409 Conflict` responses).

### 5.1. D1 — Post-Success Immediate Apply & Reopen-Before-Refetch `409` Protection

1. **Post-Success Immediate Apply (`/hr/applications/2`)**:
   - Created Round 1 (`id=7`, `version=0`, `POST /api/v1/applications/2/rounds` -> `201 Created`) and transitioned `/hr/applications/2` to `INTERVIEW`.
   - Updated Round 1 to `PASS`, `score=91`, `"Initial HR score 91"` (`PUT /api/v1/applications/2/rounds/7` -> `200 OK`, `version=1`).
   - Verified the rounds table updated to `91 / 100` immediately and instant dialog reopen displayed `PASS`, `91`, and `"Initial HR score 91"` (no stale empty/`PENDING` values).
2. **Reopen-Before-Refetch `409` Protection (`docker pause rikkei-backend` / `docker unpause rikkei-backend` + `psql`)**:
   - Starting DB state for `id=7`: `score=91.00`, `version=3`. Tab 1 opened `UpdateRoundModal` (showing `91`, capturing `version=3`). Tab 2 saved `score=40`, `"Second session update"` (`200 OK`, `psql` confirmed DB `score=40.00, version=4`).
   - Tab 1 submitted via keyboard (`Tab` x6 -> `Enter`) -> `PUT /api/v1/applications/2/rounds/7` returned `409 Conflict` (`"Dữ liệu vòng phỏng vấn đã được cập nhật bởi một phiên thao tác khác, vui lòng tải lại trang"`). Focus moved directly to `"Tải lại dữ liệu mới nhất"` (`body:focus=0`), and `role="alert"` `aria-live="assertive"` announced (`docs/ut02/pr-screenshots/ut02_fix3_d3_update_round_409_focus.png`, `116,632` B).
   - Executed `docker pause rikkei-backend` (`paused=true`), clicked `"Hủy bỏ"` in Tab 1 (close-after-conflict background refetch held open), and reopened `"Cập nhật kết quả"` **before** unpause -> dialog showed `91`, `"Initial HR score 91"`.
   - Executed `docker unpause rikkei-backend` (`paused=false`). Refetch resolved -> rounds table updated to `40 / 100` (`"Second session update"`), while the open dialog preserved `91` / `"Initial HR score 91"`.
   - Clicked `"Lưu kết quả"` -> `PUT /api/v1/applications/2/rounds/7` returned **`409 Conflict`** (no silent `200 OK`; sent mounted `version=3`, not `4`). Direct `psql` check confirmed DB remained `score=40.00, version=4` (`1 row`) (`docs/ut02/pr-screenshots/ut02_fix3_d1_reopen_409_protected.png`, `116,073` B).
   - After another Tab 2 update (`score=55` / `"Session 2 update for 375px"`), clicked `"Tải lại dữ liệu mới nhất"` -> form synced to `55`, saved `88` / `"Recovered after reload 88"` -> `200 OK`, and `psql` confirmed DB updated to `score=88.00, version=8` (`docs/ut02/pr-screenshots/ut02_fix3_d1_reload_and_save_ok.png`, `135,200` B).

### 5.2. D3 — Keyboard Verification (`Tab` -> `Enter`) Across All 3 Dialogs (`1440x900` & `375x812`)

- **`UpdateRoundModal`** (`/hr/applications/2`, `1440x900` & `375x812`, `PUT /api/v1/applications/2/rounds/7` -> `409`): `body:focus=0`, focus moved to `"Tải lại dữ liệu mới nhất"`, `alert aria-live="assertive"`, `dialogBox.width=328px` at `375px` (`docs/ut02/pr-screenshots/ut02_fix3_d3_update_round_409_focus.png`, `116,632` B).
- **`StatusTransitionModal`** (`/hr/applications/1`, `1440x900` & `375x812`, `POST /api/v1/applications/1/transition` -> `409`): `body:focus=0`, focus moved to `"Tải lại dữ liệu mới nhất"`, `alert aria-live="assertive"`, `dialogBox.width=328px` at `375px` (`docs/ut02/pr-screenshots/ut02_fix3_d3_transition_409_focus.png`, `153,386` B).
- **`AddInterviewRoundModal`** (`/hr/applications/1` at `1440x900` & `/hr/applications/2` at `375x812`, `POST .../rounds` -> `409` after session 2 transitioned to `REJECTED`): `body:focus=0`, focus moved to `"Tải lại dữ liệu mới nhất"`, `alert aria-live="assertive"`, `dialogBox.width=328px` at `375px` (`docs/ut02/pr-screenshots/ut02_fix3_d3_add_round_409_focus.png`, `152,837` B).

### 5.3. R2 — Responsive (`1440x900`, `1024x768`, `768x1024`, `375x812`, Light & Dark) & Interactions

- Verified scroll, right-click, double-click, keyboard Tab order, browser Back/Forward, and reload across `1440x900`, `1024x768`, `768x1024`, and `375x812` (Light & Dark): all clean with zero horizontal overflow (`html=1424.8/1008.8/752.8/360px` `<=` viewport width; modal `328x726px` at `375px`).
- Captured responsive screenshots `docs/ut02/pr-screenshots/ut02_fix3_responsive_1440_light.png` (`137,280` B) and `docs/ut02/pr-screenshots/ut02_fix3_responsive_375_dark.png` (`70,815` B).

### 5.4. Honest `/browser` Sandbox Tooling Disclosure

- The `webview_browser` sandbox blocked `page.evaluate`, `locator.evaluate`, and `page.on('request')`, and `networkRequests()` did not expose raw request `postData` strings.
- Sending the mounted stale `version` (`3` rather than `4`) was proven end-to-end by the backend returning `409 Conflict` plus `psql` confirming DB row `id=7` remained `score=40.00, version=4` untouched, and horizontal fit across viewports was measured using Playwright `boundingBox()`.
