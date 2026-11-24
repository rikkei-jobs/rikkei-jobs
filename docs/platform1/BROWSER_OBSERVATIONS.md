# Live Browser Audit & Observations — Round PLATFORM-1 (`T022DB0`)

- **Document Path**: `docs/platform1/BROWSER_OBSERVATIONS.md`
- **Branch**: `chore/T022DB0-taste-skill-and-optimization`
- **Target Stack**: `http://127.0.0.1:3000` (5/5 Docker Compose services `healthy`)
- **Screenshots Directory (git-ignored via `.gitignore`)**: `docs/platform1/pr-screenshots/` (`33` Before PNGs in `before/`, `27` After PNGs in `after/`)
- **Zero Emoji Compliance**: `0` emoji characters

---

## Tóm Tắt Điều Hành (Tiếng Việt — Rule 11 Bilingual Summary)

Tài liệu này ghi nhận toàn bộ kết quả kiểm chứng trình duyệt thực tế trước và sau khi sửa lỗi giao diện ở **Part B (Round PLATFORM-1 / `T022DB0`)** trên stack Docker Compose (`http://127.0.0.1:3000`) qua 4 phiên Antigravity `/browser` (`webview_browser`) gồm **Before Pass 1**, **Before Pass 2**, **After Pass 1**, và **After Pass 2** trên cả 4 kích thước màn hình (`375x812`, `768x1024`, `1024x768`, `1440x900`) ở hai chế độ Sáng/Tối.

- **Các hạng mục đã sửa an toàn ở Part B3 và xác minh PASS ở Part B4**:
  1. Bổ sung `<h1>` chuẩn (`1` thẻ `<h1>` duy nhất, thứ bậc heading tuần tự không nhảy bậc) trên `/candidate/skills` (`h1 -> h2 -> h3` sau khi vá `SkillItem` ở M2 Iteration 2, xác minh bằng Vitest DOM heading-order với dữ liệu `SAMPLE`), `/candidate/evaluations` (`h1 -> h2 -> h3 -> h4`), và `/candidate/gap-analysis`.
  2. Chuẩn hóa nhãn vai trò trên `RoleHomeLayout.tsx`: chỉ hiển thị `"Mã học viên LMS"` cho `CANDIDATE` và dùng `"Mã tài khoản LMS"` cho `MENTOR`, `STAFF`, `ADMIN`.
  3. Loại bỏ thuật ngữ nội bộ (`"PM"` trên nút tính lại kỹ năng tại `/candidate/skills`, `"Backend"` trong `HealthBadge.tsx`), sửa tên mock không dấu (`SsoCallbackPage.tsx`), bổ sung skeleton loading + nút `"Thử lại"` trên `SkillProfilePage` và `GapAnalysisSection`, ẩn form `#reset-token` disabled rỗng khi `/reset-password` thiếu token, và bọc `:hover` trong `@media (hover: hover) and (pointer: fine)` kèm `:active` feedback (`scale(0.985)`).
- **Các hạng mục phát hiện nhưng giữ nguyên trong `"Proposed, not applied"`**: Toàn bộ lỗi nằm trong các tệp thuộc PR #13/#21/#26 hoặc ràng buộc test contract/design spec (như thiếu `<h1>` tại `/candidate/jobs/:jobId`, `font-size: 15px < 16px` trên mobile input, nút `"Làm mới"` cao `38px < 44px`, link phụ `24px`, sidebar desktop `36px`, thứ tự DOM `<h2>` trước `<h1>` ở `AuthEditorialLayout`) đều được ghi nhận trung thực và không sửa đổi trực tiếp.
- **Kết quả đo tổng thể sau sửa**: `0` lỗi console HUD, `0` lỗi HTTP `>= 400` trên các luồng hợp lệ, `scrollWidth <= innerWidth` trên mọi breakpoint (lưu ý làm tròn DPI `375.2px` trên Windows 125% khi không có thanh cuộn dọc, không có thanh cuộn ngang), `36/36` tệp Vitest (`435/435` tests PASS, `0` cảnh báo `act()`), và `120/120` cặp tương phản WCAG 2.2 PASS.

---

## 1. Test Scope & Environment

### 1.1 Live Docker Compose Stack & Tooling

All live browser checks ran against the full local Docker Compose stack at `http://127.0.0.1:3000`:

- **Containers (`5/5` healthy)**: `rikkei-postgres` (`postgres:18.6-alpine`), `rikkei-mock` (`rikkei-jobs-mock` on `127.0.0.1:9000`), `rikkei-mailpit` (`axllent/mailpit:v1.33.1`), `rikkei-backend` (`rikkei-jobs-backend`), and `rikkei-frontend` (`rikkei-jobs-frontend` serving production Nginx bundle on `127.0.0.1:3000`).
- **Viewports**: `375x812` (mobile), `768x1024` (tablet portrait), `1024x768` (tablet landscape / small laptop), and `1440x900` (desktop).
- **Themes**: Light (`light`) and Dark (`dark`) modes across all authenticated shell routes and `/` (`HomeSkeleton`). Auth editorial pages (`/login`, `/sso-callback`, `/forgot-password`, `/reset-password`, `/reset-password/:token`, `/change-password`) intentionally have no theme switch and remain in Light mode.
- **Accounts & 60s LMS SSO Tickets**:
  - `CANDIDATE`: `candidate1@rikkeijobs.test` (`lms-sv-001`) via live 60s LMS SSO tickets (`POST /api/v1/auth/sso -> HTTP 200` in both Before Pass 1 and After Pass 1).
  - `MENTOR`: `mentor1@rikkeijobs.test` (`lms-mt-001`) — Before Pass 2 fell back to `#tab-enterprise` after 60s ticket expiry; After Pass 2 succeeded via fresh 60s SSO ticket (`POST /api/v1/auth/sso -> HTTP 200`).
  - `STAFF`: `staff1@rikkeijobs.test` (`lms-st-001`) and `ADMIN`: `admin1@rikkeijobs.test` (`lms-ad-001`) — Before Pass 2 recorded `POST /api/v1/auth/sso -> HTTP 401` on expired tickets and fell back to `#tab-enterprise`; After Pass 2 verified clean enterprise login and logout.
  - `HR`: `hr2@rikkeijobs.test` (`/hr` and `/hr/company`, non-destructive read/validation checks without saving) and `hr1@rikkeijobs.test` (`must_change_password = TRUE`, auto-redirected to `/change-password`, validation tested without submitting a password change so seed data stayed intact).
- **Real User Interactions Tested**: Left-click, hover, wheel/vertical scroll, keyboard navigation (`Tab`, `ArrowLeft`/`ArrowRight`, `Enter`, `Escape`), form validation (empty submit, invalid formats, weak/mismatched passwords, 500-character inputs), browser history (`goBack()`, `goForward()`), `page.reload()` (verifying memory-only JWT session reset to `/login`), and unauthenticated protected-route redirects.

### 1.2 Live `/browser` Transcript Sessions

| Pass | Scope | Session ID | Steps Recorded | Output Artifacts |
|---|---|---|---:|---|
| **Before Pass 1** | Candidate routes (`8` routes) + Public & Auth routes | `2914d44b-3a21-4921-bd90-1ff517968d5e` | `19` scripted browser steps (`step_2`..`step_41`) | `transcript.jsonl`, `browser_sandbox/outputs/*.json`, `before/` PNGs |
| **Before Pass 2** | `MENTOR`, `STAFF`, `ADMIN`, `HR` (`/hr`, `/hr/company`), `/change-password` | `d97a23ea-8691-411e-8167-2156fc7496bf` | `11` scripted browser steps (`step_2`..`step_22`) | `transcript.jsonl`, `browser_sandbox/outputs/*.json`, `before/` PNGs |
| **After Pass 1** | Candidate routes (`8` routes) + Public & Auth routes | `fcc93cd5-391f-4586-8660-077b75406952` | `11` scripted browser steps (`step_2`..`step_22`) | `transcript.jsonl`, `browser_sandbox/outputs/*.json`, `after/` PNGs |
| **After Pass 2** | `MENTOR`, `STAFF`, `ADMIN`, `HR` (`/hr`, `/hr/company`), `/change-password` | `857c1f32-c445-4898-a4d3-1bde25ebae6c` | `9` scripted browser steps (`step_2`..`step_18`) | `transcript.jsonl`, `browser_sandbox/outputs/*.json`, `after/` PNGs |

---

## 2. Honest Sandbox Disclosure (`webview_browser`)

In strict compliance with `04-honest-verification.md` and round requirements, all runtime constraints of the Antigravity `webview_browser` sandbox are disclosed transparently:

1. **Blocked Playwright & Media/Network APIs in `webview_browser`**:
   - `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request`, `page.route`, and `page.on('console')` are blocked by the sandbox security policy.
   - `networkRequests()` strips HTTP request headers (`headers: {}`) while preserving HTTP method, URL, and response status codes.
2. **How Blocked Checks Were Covered Without Fabrication**:
   - **Geometry & Overflow**: Measured directly via Playwright native `locator.boundingBox()`, `page.viewportSize()`, and `overflowX` checks against `html` and container elements (e.g., `.gap-table-wrap` vs `.gap-table`, `.cp-page` form vs aside).
   - **DOM & Accessibility State**: Verified via Playwright native `count()`, `innerText()`, `allTextContents()`, `getAttribute('aria-expanded' | 'aria-selected' | 'aria-controls')`, `isVisible()`, `isDisabled()`, and HUD accessibility snapshots.
   - **Console & Network**: Verified via the `webview_browser` HUD `ConsoleErrors` tracker (`0` console errors across all 4 sessions) and `networkRequests()` (`[Failed Network Requests]` blocks inspected per step).
   - **Reduced Motion, Hover Media Queries, Skeleton & Error Retry Paths**: Verified via static CSS/TSX inspection (`Part B1`), Vitest component tests with fake timers and error/loading mocks (`36/36` files, `435/435` tests PASS, `0` `act()` warnings), and `node scripts/compute-contrast.mjs` (`120/120` WCAG 2.2 pairs PASS).
3. **Windows 125% DPI Fractional Rounding (`375.2px`)**:
   - On Windows with `125%` (`1.25x`) display scaling, `375` CSS pixels map to `469` physical pixels (`469 / 1.25 = 375.2px`). On `375x812` pages without a vertical scrollbar (e.g., auth pages, `/candidate/evaluations`, `/candidate/gap-analysis`), `html.boundingBox().width` reports `375.20001220703125` (`375.2px`) with **zero horizontal scrollbar**; on pages with a `15px` vertical scrollbar, `html.boundingBox().width` reports `360px`. Earlier Before Pass 1 boolean checks comparing `htmlW > vpW` (`375.2 > 375`) flagged `overflowX: true` purely due to this `0.2px` fractional DPI rounding; `.gap-table-wrap` (`309.6px` wide at `375x812`) scrolls the `560px` `.gap-table` internally without widening the document.
4. **Unauthenticated `/403` vs Authenticated `/403`**:
   - Because JWTs are stored strictly in React in-memory state (`AuthContext`), direct `page.goto('http://127.0.0.1:3000/403')` in a fresh unauthenticated tab cleanly redirects to `/login` (`HTTP 200`, `h1Count = 1`). Authenticated wrong-role `/403` inside `PersistentAppShell` is verified by `ForbiddenPage.test.tsx`, `guards.test.tsx`, and `App.test.tsx` (and was previously verified live in `docs/uiux/BROWSER_OBSERVATIONS.md`).

---

## 3. Before vs After Findings & Evidence Table

| Finding | Clause / Rule / Skill | Fix Applied | Before Evidence (`[/browser]` Before Pass 1/2) | After Evidence (`[/browser]` After Pass 1/2 + Vitest) |
|---|---|---|---|---|
| **`/candidate/skills` missing `<h1>`, internal `"PM"` jargon, plain-text loading & error dead-end** | Rule `08`, Rule `09`, `frontend-accessibility-audit`, `frontend-taste-anti-slop` (Step 2 & Step 5) | `CandidateSkillsPage.tsx:14` passes `headingLevel={1}` to `SkillProfilePage.tsx`; `SkillProfilePage.tsx` adjusts `SectionHeadingTag` (`<h2>`), passes `headingLevel={headingLevel === 1 ? 3 : 4}` to `SkillItem.tsx` (`headingLevel?: 3 \| 4`, default `4`), and passes `headingLevel={2}` to embedded `<CandidateEvaluations>`; replaces `"Tính lại từ LMS, Exam, PM"` with `"Tính lại từ dữ liệu học tập"`; adds token-based skeleton (`role="status"`, `aria-busy="true"`) + `"Thử lại"` retry CTA on error. | `before_pass1` (`step_6.json`): `h1Count = 0`, `h2Count = 2` (`"Hồ sơ năng lực"`), `pmLines = ["Tính lại từ LMS, Exam, PM"]`. | `after_pass1` (`step_6.json`) initially recorded `h1Count = 1` (`"Hồ sơ năng lực"`), aggregate counts `h1 (1) / h2 (8) / h3 (1) / h4 (13)` where expanded `SkillItem` still hardcoded `<h4>` under `<h2>`, recalculate button text = `"Tính lại từ dữ liệu học tập"`, `pmExactMatches = 0`, `pmSubstringMatches = 0`, accordion `aria-expanded` `true -> false -> true`. Remediated in M2 Iteration 2 (`SkillItem.tsx` `headingLevel?: 3 \| 4`, `SkillProfilePage.tsx` passing `3` when `headingLevel={1}`), verified by non-empty `SAMPLE` DOM heading-order Vitest (`H1 -> H2 -> H3` zero skips, plus default `H2 -> H3 -> H4`), skeleton + retry recovery, and static chunk check after container rebuild (no additional `/browser` pass claimed beyond `after_pass1`). |
| **`/candidate/evaluations` missing `<h1>` & skipped heading level (`h2 -> h5`)** | Rule `08`, `frontend-accessibility-audit`, `frontend-taste-anti-slop` (Step 5) | `CandidateEvaluationsPage.tsx:15` passes `headingLevel={1}`; `CandidateEvaluations.tsx` renders `<HeadingTag>` (`<h1>` standalone, `<h2>` embedded) across all states (`!effectiveUserId`, `loading`, `error`, `empty`, `ready`); `EvaluationCard.tsx` + `EvaluationScoreItem.tsx` scale `CardHeadingTag`/`SubHeadingTag`/criteria headings sequentially. | `before_pass1` (`step_22.json`): `h1Count = 0`, `h2Count = 1` (`"Đánh giá từ mentor"`). | `after_pass1` (`step_8.json` & `step_10.json`): `h1Count = 1` (`"Đánh giá từ mentor"`), collapsed `h1 (1) -> h2 (1)`, expanded `h1 (1) -> h2 (1) -> h3 (2) -> h4 (5)` with zero skipped levels; card toggle `aria-expanded` `"false" -> "true" -> "false"`. |
| **`/candidate/gap-analysis` missing `<h1>`, plain-text loading & error dead-end** | Rule `08`, Rule `09`, `frontend-accessibility-audit`, `frontend-taste-anti-slop` (Step 5) | `CandidateGapAnalysisPage.tsx:14` passes `headingLevel={1}` to `GapAnalysisSection.tsx`; `GapAnalysisSection.tsx` + `gapAnalysis.css` add token-based skeleton (`role="status"`, `aria-busy="true"`) and `"Thử lại"` retry CTA (`min-height: 44px`). | `before_pass1` (`step_14.json`): `h1Count = 0`, `h2Count = 1` (`"Phân tích khoảng thiếu hụt năng lực"`). | `after_pass1` (`step_10.json`): `h1Count = 1` (`"Phân tích khoảng thiếu hụt năng lực"`), `<Select>` combobox opens `6` options & closes on `Escape`, `.gap-table-wrap` (`309.6px`) scrolls `560px` table internally at `375x812`. `GapAnalysisSection.test.tsx` verifies skeleton + retry recovery. |
| **Non-candidate role homes (`/mentor`, `/staff`, `/admin`) labeled `"Mã học viên LMS"`** | `CONTENT.md`, `module-domain-knowledge`, `frontend-taste-anti-slop` (Step 2) | `RoleHomeLayout.tsx:129-135` conditionally renders `'Mã học viên LMS'` only when `user.role === 'CANDIDATE'`, and `'Mã tài khoản LMS'` for `MENTOR`, `STAFF`, `ADMIN`. | `before_pass2` (`step_2`, `step_4`, `step_8`, `step_10`): `/mentor` (`lms-mt-001`), `/staff` (`lms-st-001`), and `/admin` (`lms-ad-001`) all rendered `"Mã học viên LMS"`. | `after_pass2` (`step_2`, `step_4`, `step_8`, `step_10`): `/mentor`, `/staff`, and `/admin` all have `hasNewLabel = true` (`"Mã tài khoản LMS"`) and `hasOldLabel = false` across `1440/1024/768/375` Light & Dark; `/candidate` retains `"Mã học viên LMS"` (`step_4.json`). |
| **`/reset-password` missing token still rendered empty disabled `#reset-token` form** | `frontend-taste-anti-slop` (Step 5 / error dead-end hygiene), `DESIGN_SYSTEM.md` | `ResetPasswordPage.tsx:64-215`: when `!token`, renders danger alert + `"Yêu cầu liên kết mới"` (`/forgot-password`) + `"Quay lại trang đăng nhập"` (`/login`) CTAs without rendering `<form>` or `#reset-token` input. | `before_pass1` (`step_39.json`): `missingInputs = 3` (empty disabled `Mã đặt lại mật khẩu` input + 2 password inputs + disabled submit button rendered beneath alert). | `after_pass1` (`step_18.json`): `formCountMissing = 0`, `allInputCountMissing = 0`, `resetTokenInputCount = 0`, `missingAlertCount = 1`, `ctaNewLinkVisible = true`, `ctaBackLoginVisible = true`; `/reset-password/invalid-token-123` retains 3-input form and displays `"Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"` (`HTTP 400`). |
| **Uncapped hover transforms on touch devices, missing `:active` press, and dev/mock copy leaks** | Rule `09`, `CONTENT.md`, `frontend-taste-anti-slop` (Step 2 & Step 4) | Wrapped `:hover` in `@media (hover: hover) and (pointer: fine)` and added `:active` `scale(0.985)` (with `prefers-reduced-motion` reset) in `skillProfile.css`, `candidateEvaluations.css`, `App.css`; updated `SsoCallbackPage.tsx:45` (`'Nguyễn Văn An'`) and `HealthBadge.tsx:32,48` (`'hệ thống'` instead of `'Backend'`). | `DOCS/UIUX/AUDIT.md` & Part B1 static audit confirmed raw `:hover` on touch devices, missing `:active`, `'Nguyen Van Sinh Vien'`, and `'Backend'` string in `HealthBadge`. | Verified in CSS diff, `App.test.tsx` (`HealthBadge`), `npm run lint` (`0`), `npm run typecheck` (`0`), `npm test` (`36/36` files / `435/435` tests PASS, `0` `act()` warnings), and `compute-contrast.mjs` (`120/120` PASS). |

---

## 4. Per-Route Raw Measurements Matrix (All `20` Route Entries + `*` Fallback)

All measurements below come directly from the 4 `webview_browser` transcripts and raw `browser_sandbox/outputs/step_*.json` logs:

- **Console errors**: `0` HUD `ConsoleErrors` entries across all 4 sessions.
- **HTTP `>= 400` separation**:
  - **Normal valid user flows**: `0` unexpected `>= 400` HTTP errors across After Pass 1 and After Pass 2.
  - **Expected / negative-test HTTP `>= 400` responses**:
    - `GET /api/v1/me/target -> HTTP 404` in Before Pass 1 (`step_14`..`step_18`) before a target role was selected for `lms-sv-001` (handled cleanly as `targetState = 'none'`); after `PUT /api/v1/me/target -> HTTP 200`, `lms-sv-001` had an active target in After Pass 1 (`0` `404`s).
    - `POST /api/v1/auth/sso -> HTTP 401` in Before Pass 2 (`step_8`, `step_10`) from 60s SSO ticket expiration before testing `/staff` and `/admin` (resolved in After Pass 2 with fresh 60s ticket `HTTP 200` on `/mentor`).
    - `POST /api/v1/auth/reset-password -> HTTP 400` in Before Pass 1 (`step_39`) & After Pass 1 (`step_18`) for intentional negative test `/reset-password/invalid-token-123`.
    - `POST /api/v1/auth/login -> HTTP 401` in Before Pass 1 (`step_30`) & After Pass 1 (`step_20`) for intentional negative test wrong password, and `POST /api/v1/auth/sso -> HTTP 400` in Before Pass 1 (`step_30`) for 500-char LMS ticket validation test.
    - `GET /api/v1/me/job-recommendations?limit=3 -> net::ERR_ABORTED` once in Before Pass 1 (`step_6`) when navigating rapidly away from `/candidate` mid-flight via `AbortController` / navigation cancellation.

| # | Route (`App.tsx`) | Viewports & Themes Tested | `htmlW` vs Viewport (`375 / 768 / 1024 / 1440`) | `h1Count` Before -> After | Console / Non-Test HTTP `>= 400` | Verified Interactions & Observations |
|---:|---|---|---|---:|---:|---|
| 1 | `/` (`HomeSkeleton`) | `375`, `768`, `1024`, `1440` (Light & Dark) | `360 / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | `ThemeSwitch` toggles Light/Dark; public skills summary & role roadmap render cleanly (`HTTP 200`). |
| 2 | `/login` (`LoginPage`) | `375`, `768`, `1024`, `1440` (Light) | `375.2* / 768 / 1008.8 / 1440` (`<= vpW`) | `1 -> 1` | `0 / 0` | Tabs switch via click & `ArrowRight`/`ArrowLeft`; empty submit triggers `2` invalid fields; wrong password returns `HTTP 401` `"Email hoặc mật khẩu không chính xác"`. |
| 3 | `/sso-callback` (`SsoCallbackPage`) | `375`, `768`, `1024`, `1440` (Light) | `375.2* / 768 / 1024 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | Without ticket renders `"Xác thực không thành công"`; with fresh ticket `POST /api/v1/auth/sso -> HTTP 200` redirects to role home. |
| 4 | `/forgot-password` (`ForgotPasswordPage`) | `375`, `768`, `1024`, `1440` (Light) | `375.2* / 768 / 1024 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | Empty submit disabled; valid email `POST /api/v1/auth/forgot-password -> HTTP 200`. |
| 5 | `/reset-password/:token` | `375`, `1440` (Light) | `360 / 1440` (`<= vpW`) | `1 -> 1` | `0 / 0` | Weak/mismatched passwords keep submit disabled; valid format with `invalid-token-123` returns intentional `HTTP 400` alert. |
| 6 | `/reset-password` (missing token) | `375`, `768`, `1024`, `1440` (Light) | `375.2* / 768 / 1024 / 1440` (`<= vpW`) | `1 -> 1` | `0 / 0` | **Fixed**: form & `#reset-token` input removed (`3 -> 0` inputs); alert + both recovery CTA links visible. |
| 7 | `/change-password` (`hr1` forced) | `375`, `768`, `1024`, `1440` (Light) | `360 / 768 / 1008.8 / 1440` (`<= vpW`) | `1 -> 1` | `0 / 0` | Auto-redirects from `/login`; submit disabled initially, on weak password, and on mismatch; `"Đăng xuất"` returns to `/login`. |
| 8 | `/candidate` (`CandidateHomePage`) | `375`, `768`, `1024`, `1440` (Light & Dark) | `360 / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | Account card retains `"Mã học viên LMS"` (`lms-sv-001`); mobile drawer opens and closes on `Escape`. |
| 9 | `/candidate/skills` (`CandidateSkillsPage`) | `375`, `768`, `1024`, `1440` (Light & Dark) | `360 / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | **`0 -> 1`** | `0 / 0` | **Fixed**: `h1` `"Hồ sơ năng lực"`, `h1->h2->h3` (`SkillItem` `headingLevel=3` fixed in M2 Iteration 2, verified via non-empty `SAMPLE` Vitest), `0` `"PM"`, button `"Tính lại từ dữ liệu học tập"`, accordion toggles cleanly. |
| 10 | `/candidate/jobs` (`CandidateJobsPage`) | `375`, `1440` (Light & Dark; `768/1024` Before) | `360 / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | 10 job cards & `"Chi tiết JD"` links render; `"Làm mới"` (`38x115px`) logged in Proposed, not applied. |
| 11 | `/candidate/jobs/:jobId` (`/candidate/jobs/1`) | `375`, `1440` (Light & Dark; `768/1024` Before) | `360 / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | `0 -> 0` | `0 / 0` | `goBack()`/`goForward()` verified; `h1Count=0` (`JobDetailPanel.tsx` in PR #13) logged in Proposed, not applied. |
| 12 | `/candidate/gap-analysis` (`CandidateGapAnalysisPage`) | `375`, `768`, `1024`, `1440` (Light & Dark) | `375.2* / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | **`0 -> 1`** | `0 / 0` | **Fixed**: `h1` `"Phân tích khoảng thiếu hụt năng lực"`; `<Select>` combobox + `Escape`; `.gap-table-wrap` (`309.6px`) scrolls `560px` table cleanly. |
| 13 | `/candidate/evaluations` (`CandidateEvaluationsPage`) | `375`, `768`, `1024`, `1440` (Light & Dark) | `375.2* / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | **`0 -> 1`** | `0 / 0` | **Fixed**: `h1` `"Đánh giá từ mentor"`, expanded sequential `h1 (1) -> h2 (1) -> h3 (2) -> h4 (5)`, `"Xem chi tiết"`/`"Ẩn chi tiết"` toggles cleanly. |
| 14 | `/candidate/internships` (`CandidateInternshipsPage`) | `375`, `1440` (Light & Dark; `768/1024` Before) | `360 / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | `h1` `"Thực tập IOC"`, `page.reload()` clears memory JWT cleanly to `/login`. |
| 15 | `/hr` (`HrHomePage`) | `375`, `1440` (Light & Dark; `768/1024` Before) | `360 / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | Navigates to `/hr/company` and back cleanly; zero overflow. |
| 16 | `/hr/company` (`CompanyProfilePage`) | `375`, `768`, `1024`, `1440` (Light & Dark) | `360 / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | 2-col (`1440`: form `673.6px` + aside `357.6px`; `1024`: `398.9px` + `220.3px`) -> 1-col stacked (`768` & `375`); `goBack()`/`goForward()` verified. |
| 17 | `/mentor` (`MentorHomePage`) | `375`, `768`, `1024`, `1440` (Light & Dark) | `360 / 752.8 / 1008.8 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | **Fixed**: `"Mã tài khoản LMS"` (`lms-mt-001`), sidebar collapse/expand (`true -> false -> true`), mobile drawer `Escape`, SSO `HTTP 200`. |
| 18 | `/staff` (`StaffHomePage`) | `375`, `1440` (Light & Dark) | `360 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | **Fixed**: `"Mã tài khoản LMS"`, 4 target positions displayed cleanly, logout -> `/login`. |
| 19 | `/admin` (`AdminHomePage`) | `375`, `1440` (Light & Dark) | `360 / 1424.8` (`<= vpW`) | `1 -> 1` | `0 / 0` | **Fixed**: `"Mã tài khoản LMS"` (`lms-ad-001`), 0 duplicate buttons, logout -> `/login`. |
| 20 | `/403` (`ForbiddenPage`) | `375`, `768`, `1024`, `1440` (Light, unauth) | `375.2* / 768 / 1008.8 / 1440` (`<= vpW`) | `1 -> 1` | `0 / 0` | Unauthenticated direct visit redirects cleanly to `/login` (`HTTP 200`); authenticated `/403` covered by Vitest (`ForbiddenPage.test.tsx`, `guards.test.tsx`). |
| 21 | `*` (`404` fallback) | `375`, `768`, `1024`, `1440` (Light) | `375.2* / 768 / 1008.8 / 1440` (`<= vpW`) | `1 -> 1` | `0 / 0` | `/route-khong-ton-tai-404` redirects cleanly to `/login` (`HTTP 200`, `0` errors). |

*\*`375.2*` denotes `375.20001220703125px` from Windows 125% DPI fractional scaling on pages without a vertical scrollbar, with zero horizontal scrollbar.*

---

## 5. Proposed, Not Applied Table

All items below were verified during static and/or live `/browser` audits but **deliberately NOT modified** in Part B3 because they collide with open PRs (#13, #21, #26) or require an explicit product/design-spec/test-contract decision:

| Item | File & Line | Classification | Live / Static Evidence & Proposed Fix |
|---|---|---|---|
| **Missing `<h1>` on `/candidate/jobs/:jobId`** | `frontend/src/features/candidate/components/JobDetailPanel.tsx:93` (`CandidateJobDetailPage.tsx`) | PR #13 collision | Live `/browser` (`before_pass1/step_10`, `after_pass1/step_16`) confirmed `h1Count = 0`, `h2` `"Kỹ sư Lập trình Java Backend (Junior/Middle)"`. Adding `<h1>` in `CandidateJobDetailPage.tsx` above `<JobDetailPanel>` would stack two headings above `<p class="jd-eyebrow">Chi tiết JD</p><h2>{job.title}</h2>`. Propose adding `headingLevel?: 1 \| 2` to `JobDetailPanel.tsx` after PR #13 merges. |
| **Mobile input `font-size: 0.9375rem` (`15px < 16px`)** | `frontend/src/features/identity/styles/identity.css:767` (`.rj-input`), `frontend/src/shared/components/Select.css:21` (`.rj-select`) | PR #13/#21/#26 collision | Static CSS check confirmed `15px` default on `.rj-input` and `.rj-select` with no override inside `@media (max-width: 767px)` (`identity.css:2147-2213`), risking iOS Safari auto-zoom on `375px`. Propose setting `font-size: 1rem` (`16px`) under `@media (max-width: 767px)`. |
| **`"Làm mới"` button `< 44px` height & unguarded hover** | `frontend/src/features/candidate/styles/jobRecommendations.css:42-62, 147-150` | PR #13 collision | Live `/browser` (`before_pass1/step_8`) measured `"Làm mới"` at `38px x 115px` (`< 44px`). `.refresh-button:hover` and `.job-card:hover` (`translateY(-2px)`) also lack `@media (hover: hover) and (pointer: fine)`. Propose `min-height: var(--rj-density-button-height)` and media-guarded hover after PR #13 merges. |
| **Inline links `< 44px` touch height** | `frontend/src/features/identity/styles/identity.css:896-901`; `JobDetailPanel.tsx` / `CandidateHomePage.tsx` | PR #13/#21/#26 collision | Live `/browser` measured `"Quên mật khẩu?"` (`24px x 113px`), `"Quay lại trang đăng nhập"` (`24px x 196px`), `"Quay lại trang ứng viên"` (`24px x 205px`), and candidate home job links (`20px` h). Propose expanding touch hit-area / vertical padding to `44px` on mobile `< 768px`. |
| **Desktop sidebar nav item `min-height: 36px`** | `frontend/src/features/identity/styles/identity.css:1284, 1329, 1548`, `SharedAppLayout.tsx` | PR #13/#21/#26 + Design Spec | Live `/browser` (`before_pass2/step_8..14`) measured desktop Dense sidebar items at `36px x 255.2px` (intentional per Dense spec `--rj-density-nav-item-min-h: 36px`; mobile `375px` drawer uses `44px`). Needs product/design approval if `1024px` touch tablets should adopt `44px`. |
| **`AuthEditorialLayout` DOM order (`<h2>` before `<h1>`)** | `frontend/src/features/identity/components/AuthEditorialLayout.tsx:102`, `identity.css` | PR #13/#21/#26 + Test Contract | `<aside>` renders `<h2 className="rj-story-heading">` before `<main>`'s `<h1 className="rj-auth-title">` in DOM order on `/login`, `/forgot-password`, `/reset-password`, `/change-password`. `AuthRedesignM4.test.tsx:133` asserts `h2.rj-story-heading`, while placing `<main>` before `<aside>` in DOM requires CSS `order` in locked `identity.css`. |
| **`CandidateHomePage` sequential waterfall & missing `AbortSignal`** | `frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx:146` | PR #13/#21/#26 collision | `fetchCandidateEvaluations(user.id)` lacks `AbortSignal` and `fetchGapAnalysis` runs sequentially after `targetRes` (and `before_pass1/step_6` logged one `net::ERR_ABORTED` on rapid route switch). Propose parallelizing with `Promise.allSettled` + shared `AbortController` signal. |
| **`HomeSkeleton` public `/` & `SharedAppLayout` disabled-item tooltip** | `frontend/src/App.tsx:274, 298`, `SharedAppLayout.tsx:603-616` | PR #13/#21/#26 collision | `App.tsx` and `SharedAppLayout.tsx` are locked for PR collision avoidance; `SharedAppLayout` `tabIndex={-1}` on `"Sắp ra mắt"` items matches `DESIGN_SYSTEM.md` §14.2. |
| **Auth inline `style={{ ... }}` & `AuthContext`/`health.ts` copy** | `SsoCallbackPage.tsx`, `ResetPasswordPage.tsx`, `ForgotPasswordPage.tsx`, `ChangePasswordPage.tsx`, `EnterpriseLoginForm.tsx`, `LockoutCountdown.tsx`, `RoleHomeLayout.tsx:140`, `AuthContext.tsx:44`, `health.ts:28` | `identity.css` lock + Test Contract | Extracting inline `style={{ ... }}` into utility classes requires editing `identity.css`; `AuthContext.tsx:44` and `health.ts:28` strings are locked by assertions in `App.test.tsx:104, 426`. |

---

## 6. Honest Evaluation of `frontend-taste-anti-slop`

In accordance with R3, here is an honest assessment of what the newly vendored `frontend-taste-anti-slop` skill contributed compared to existing rules (`08`, `09`), `docs/design/DESIGN_SYSTEM.md`, `docs/uiux/CONTENT.md`, `docs/uiux/AUDIT.md`, and `frontend-accessibility-audit`:

1. **What Existing Project Rules & Docs Already Covered**:
   - **Color & Anti-Slop Surface Restraint**: Rule `09` and `DESIGN_SYSTEM.md` already enforced Confident Royal Cobalt / Iron Obsidian tokens, banned purple SaaS gradients and frosted-glass clutter, and verified `120/120` contrast pairs via `compute-contrast.mjs`.
   - **Typography, Motion Budgets & Contrast**: Rule `09`, `frontend-visual-design`, and `frontend-motion-design` already enforced the self-hosted WOFF2 trio, `<= 150ms` micro / `0.001ms` reduced-motion budgets, `CLS = 0`, and 4 async states.
   - **Missing `<h1>`, Role Labeling & Clean Vietnamese Copy**: `frontend-accessibility-audit`, `CONTENT.md`, and `docs/uiux/AUDIT.md` already flagged missing `<h1>` tags on candidate sub-routes, `"Mã học viên LMS"` mislabeling on non-candidate role homes, `"PM"`/`"Backend"` technical leaks, and unaccented mock names.
2. **What `frontend-taste-anti-slop` Actually Added or Sharpened**:
   - **`16px+` Mobile Input Minimum (`< 768px`)**: Neither Rule `08`/`09` nor `DESIGN_SYSTEM.md` had an explicit `>= 16px` mobile input floor to prevent iOS Safari auto-zoom; this directly surfaced `.rj-input` (`identity.css:767`) and `.rj-select` (`Select.css:21`) at `15px`.
   - **Consistent `@media (hover: hover) and (pointer: fine)` + `:active` Press Discipline**: Highlighted the gap between newer CSS (`identity.css`, `companyProfile.css`) and legacy feature CSS (`skillProfile.css`, `candidateEvaluations.css`, `App.css`, `jobRecommendations.css`) that still had unguarded `:hover` rules and missing tactile `:active` feedback.
   - **Strict DOM Heading Order & Anti-Error-Dead-End Enforcement**: Sharpened the check against error dead-ends (adding Retry CTAs + token-based skeletons in `SkillProfilePage` and `GapAnalysisSection`, and stripping the dead disabled `#reset-token` form on `/reset-password` without token) and explicitly flagged `AuthEditorialLayout`'s `<h2>`-before-`<h1>` DOM order.

---

## 7. Screenshot Inventory (`docs/platform1/pr-screenshots/`)

All `60` PNG files below are stored under `docs/platform1/pr-screenshots/` and excluded from Git tracking by `.gitignore` line `104` (`docs/platform1/pr-screenshots/`).

### 7.1 Before Screenshots (`33` PNGs in `docs/platform1/pr-screenshots/before/`)

1. `before-403-1440-light.png` (`191,062 B`)
2. `before-404-1440-light.png` (`191,112 B`)
3. `before-admin-1440-light.png` (`130,781 B`)
4. `before-admin-375-dark.png` (`92,224 B`)
5. `before-candidate-evals-1440-light.png` (`59,784 B`)
6. `before-candidate-gap-1440-light.png` (`71,533 B`)
7. `before-candidate-gap-375-light.png` (`63,364 B`)
8. `before-candidate-home-1440-light.png` (`154,147 B`)
9. `before-candidate-home-375-dark.png` (`81,114 B`)
10. `before-candidate-internships-1440-light.png` (`71,547 B`)
11. `before-candidate-job-detail-1440-light.png` (`83,795 B`)
12. `before-candidate-jobs-1440-light.png` (`178,089 B`)
13. `before-candidate-skills-1440-light.png` (`128,808 B`)
14. `before-change-password-1440-light.png` (`206,071 B`)
15. `before-change-password-375-light.png` (`104,402 B`)
16. `before-forgot-1440-light.png` (`185,156 B`)
17. `before-hr-company-1440-dark.png` (`149,622 B`)
18. `before-hr-company-1440-light.png` (`152,129 B`)
19. `before-hr-company-375-light.png` (`83,549 B`)
20. `before-hr-company-768-light.png` (`159,603 B`)
21. `before-hr-home-1440-light.png` (`142,635 B`)
22. `before-hr-home-375-dark.png` (`82,607 B`)
23. `before-login-1440-dark.png` (`191,440 B`)
24. `before-login-1440-light.png` (`193,414 B`)
25. `before-login-375-light.png` (`77,422 B`)
26. `before-mentor-1440-light.png` (`103,863 B`)
27. `before-mentor-375-dark.png` (`91,034 B`)
28. `before-public-home-1440-light.png` (`144,713 B`)
29. `before-public-home-375-dark.png` (`77,389 B`)
30. `before-reset-missing-1440-light.png` (`199,659 B`)
31. `before-sso-error-1440-light.png` (`191,745 B`)
32. `before-staff-1440-light.png` (`165,141 B`)
33. `before-staff-375-light.png` (`86,740 B`)

### 7.2 After Screenshots (`27` PNGs in `docs/platform1/pr-screenshots/after/`)

1. `after-admin-1440-light.png` (`130,781 B`)
2. `after-admin-375-dark.png` (`92,250 B`)
3. `after-candidate-evals-1440-light.png` (`60,756 B`)
4. `after-candidate-evals-375-dark.png` (`55,655 B`)
5. `after-candidate-gap-1440-light.png` (`71,525 B`)
6. `after-candidate-gap-375-light.png` (`63,921 B`)
7. `after-candidate-home-1440-light.png` (`155,982 B`)
8. `after-candidate-home-375-dark.png` (`81,509 B`)
9. `after-candidate-internships-1440-light.png` (`49,537 B`)
10. `after-candidate-job-detail-1440-light.png` (`83,795 B`)
11. `after-candidate-jobs-1440-light.png` (`178,491 B`)
12. `after-candidate-skills-1440-dark.png` (`119,378 B`)
13. `after-candidate-skills-1440-light.png` (`126,969 B`)
14. `after-candidate-skills-375-light.png` (`71,789 B`)
15. `after-change-password-1440-light.png` (`204,510 B`)
16. `after-hr-company-1440-light.png` (`152,129 B`)
17. `after-hr-company-375-light.png` (`82,954 B`)
18. `after-hr-home-1440-light.png` (`142,635 B`)
19. `after-login-1440-light.png` (`188,792 B`)
20. `after-mentor-1440-light.png` (`160,457 B`)
21. `after-mentor-375-dark.png` (`92,207 B`)
22. `after-public-home-1440-light.png` (`144,713 B`)
23. `after-reset-invalid-1440-light.png` (`198,414 B`)
24. `after-reset-missing-1440-light.png` (`180,914 B`)
25. `after-reset-missing-375-light.png` (`76,112 B`)
26. `after-staff-1440-light.png` (`165,141 B`)
27. `after-staff-375-light.png` (`88,055 B`)

---

## 8. Final Part C / M6 Live `/browser` Verification (`SEC-01` CSP `style-src 'self'` & UI Parity)

After all Part C performance optimizations (M4) and Part C2 security hardenings (M5, including strict `Content-Security-Policy` with `style-src 'self'` without `'unsafe-inline'` in `frontend/nginx.conf`) were finalized, a full live Antigravity `/browser` (`webview_browser`) verification session (`dc283c86-d852-48cc-900d-138197d4bb6c`) was executed against the rebuilt `http://127.0.0.1:3000` Docker Compose stack using fresh 60s SSO tickets (`lms-sv-001` via Parent Team Lead) and enterprise logins (`hr2`, `mentor1`, `staff1`, `admin1`).

### 8.1 Bilingual Summary (Tiếng Việt)

- **Phạm vi kiểm chứng sau M5 (`SEC-01` CSP `style-src 'self'`)**: Đã kiểm tra trực tiếp **`16` route** (`/`, `/login`, `/forgot-password`, `/reset-password`, `/candidate`, `/candidate/skills`, `/candidate/gap-analysis`, `/candidate/evaluations`, `/candidate/jobs`, `/candidate/jobs/1`, `/candidate/internships`, `/hr`, `/hr/company`, `/mentor`, `/staff`, `/admin`) ở `1440x900` và `375x812`, chế độ Sáng/Tối, với tương tác người dùng thật (`Tab`/`Enter`/`Escape`, cuộn chuột, công tắc giao diện, thu gọn sidebar, `<Select>`, accordion, `page.reload()`).
- **Kết quả CSP & Toàn vẹn giao diện**: **`ConsoleErrors = 0`**, **`0` vi phạm CSP** (`style-src 'self'`, `script-src`, `img-src`), **`0` lỗi HTTP `>= 400` bất thường** (chỉ ghi nhận `GET /api/v1/me/target -> HTTP 404` như thiết kế trên dữ liệu seed gốc chưa chọn vị trí mục tiêu), và **`0` tràn ngang** (ghi nhận giá trị làm tròn DPI Windows 125% `375.2px` trên các trang không có thanh cuộn dọc, không có thanh cuộn ngang).
- **Ảnh chụp kiểm tra (`docs/platform1/pr-screenshots/final-csp/`, git-ignored)**: Lưu `4` ảnh đối chứng gồm `final-csp-candidate-1440-light.png` (`105,307 B`), `final-csp-skills-1440-dark.png` (`124,856 B`), `final-csp-login-375-light.png` (`79,224 B`), và `final-csp-hr-company-1440-light.png` (`152,129 B`).

### 8.2 Verified Route & Interaction Matrix (`16` Routes, `dc283c86`)

| # | Route | Viewports & Modes | `htmlW` (`1440` / `375`) | `h1` Count | CSP / Console Errors | Unexpected HTTP `>= 400` | Verified Real Interactions & Observations |
|---:|---|---|---|---:|---:|---:|---|
| 1 | `/` | `1440`, `375` (Light) | `1424.8` / `360` | `1` / `1` | `0` | `0` | Public landing loads cleanly (`status=200`), zero CSP console errors (`step_14`). |
| 2 | `/login` | `1440`, `375` (Light) | `1440` / `375.2*` | `1` / `1` | `0` | `0` | Switched `#tab-lms` / `#tab-enterprise`; `svgCount=9`, `radarNodeCount=6`, `radarClicked=true`, `Tab`/`Enter`/`Escape` verified (`step_14`). |
| 3 | `/forgot-password` | `1440`, `375` (Light) | `1440` / `375.2*` | `1` / `1` | `0` | `0` | Heading `"Quên mật khẩu"` visible cleanly with zero overflow (`step_14`). |
| 4 | `/reset-password` | `1440`, `375` (Light) | `1440` / `375.2*` | `1` / `1` | `0` | `0` | Missing-token alert rendered cleanly with `formCount=0` (`step_14`). |
| 5 | `/candidate` | `1440`, `375` (Light & Dark) | `1424.8` / `360` | `1` / `1` | `0` | `0` | Fresh 60s SSO (`POST /api/v1/auth/sso -> 200`), wheel scroll `+/-600px`, `ThemeSwitch` (`false -> true -> false`), `svgCount=22`, expected `GET /me/target -> 404` on pristine seed (`step_2`, `step_4`). |
| 6 | `/candidate/skills` | `1440` (Light & Dark), `375` (Light) | `1424.8` / `360` | `1` / `1` | `0` | `0` | `data-theme="dark"` verified (`svgCount=65`), accordion toggle `accCount=15` (`false -> true -> false`) (`step_6`). |
| 7 | `/candidate/gap-analysis` | `1440`, `375` (Light) | `1424.8` / `375.2*` | `1` / `1` | `0` | `0` | `<Select>` opens (`selectOpened=true`) and closes on `Escape` (`selectClosedEsc=true`) (`step_8`). |
| 8 | `/candidate/evaluations` | `1440`, `375` (Light) | `1424.8` / `375.2*` | `1` / `1` | `0` | `0` | Evaluation details toggle `"Xem chi tiết"` -> `"Ẩn chi tiết"` -> `"Xem chi tiết"` cleanly (`step_8`). |
| 9 | `/candidate/jobs` | `1440`, `375` (Light) | `1424.8` / `360` | `1` / `1` | `0` | `0` | `"Việc làm gợi ý"` renders with zero overflow or CSP errors (`step_12`). |
| 10 | `/candidate/jobs/1` | `1440`, `375` (Light) | `1424.8` / `360` | `0` (`h2=1`) | `0` | `0` | `"Kỹ sư Lập trình Java Backend (Junior/Middle)"` renders cleanly; `h1=0` matches PR #13 `"Proposed, not applied"` entry (`step_12`). |
| 11 | `/candidate/internships` | `1440`, `375` (Light) | `1424.8` / `360` | `1` / `1` | `0` | `0` | `"Thực tập IOC"` verified; `page.reload()` cleanly resets in-memory session to `/login` (`step_12`). |
| 12 | `/hr` | `1440`, `375` (Light & Dark) | `1424.8` / `360` | `1` / `1` | `0` | `0` | `"Chào mừng, Đại diện Doanh nghiệp B!"`, `lightAttr="light"`, `darkAttr="dark"`, `apiErrors=[]` (`step_18`). |
| 13 | `/hr/company` | `1440` (Light & Dark), `375` (Light) | `1424.8` / `360` | `1` / `1` | `0` | `0` | `"Hồ sơ công ty"` verified non-destructively (no Save), logout -> `/login`, `apiErrors=[]` (`step_18`). |
| 14 | `/mentor` | `1440` (Light & Dark), `375` (Light) | `1424.8` / `360` | `1` / `1` | `0` | `0` | Sidebar collapse `"true" -> "false" -> "true"`, mobile drawer opens (`navVisibleOpen=true`) & closes on `Escape` (`navVisibleAfterEsc=false`), logout -> `/login` (`step_20`). |
| 15 | `/staff` | `1440`, `375` (Light & Dark) | `1424.8` / `360` | `1` / `1` | `0` | `0` | `"Chào mừng, Hoàng Thu Hà!"`, Light & Dark verified, logout -> `/login`, `apiErrors=[]` (`step_22`). |
| 16 | `/admin` | `1440`, `375` (Light & Dark) | `1424.8` / `360` | `1` / `1` | `0` | `0` | `"Chào mừng, Đỗ Thanh Hải!"`, Light & Dark verified, logout -> `/login`, `apiErrors=[]` (`step_22`). |

*\*`375.2*` reflects Windows 125% DPI fractional CSS pixel rounding on pages without a vertical scrollbar; zero horizontal scrollbar exists.*

### 8.3 Spot-Check Screenshots (`docs/platform1/pr-screenshots/final-csp/`, git-ignored)

1. `final-csp-candidate-1440-light.png` (`105,307 B`) — `/candidate` at `1440x900` Light (`step_4_shot_1.png`)
2. `final-csp-skills-1440-dark.png` (`124,856 B`) — `/candidate/skills` at `1440x900` Dark (`step_6_shot_1.png`)
3. `final-csp-login-375-light.png` (`79,224 B`) — `/login` at `375x812` Light (`step_14_shot_1.png`)
4. `final-csp-hr-company-1440-light.png` (`152,129 B`) — `/hr/company` at `1440x900` Light (`step_18_shot_1.png`)

### 8.4 Honest Sandbox Disclosure (`webview_browser`)

The final M6 live check ran in the same Antigravity `webview_browser` sandbox (without `page.evaluate`, `locator.evaluate`, `page.emulateMedia`, `page.request`, or `page.route`). Console and CSP cleanliness (`style-src 'self'`, `script-src 'self'`, `img-src`) were verified directly from the live `webview_browser` HUD `ConsoleErrors` tracker (`0` errors across all `11` executed browser steps) and live HTTP header/asset inspections, with geometry measured via Playwright native `locator.boundingBox()` and `page.viewportSize()`. In `step_4`, the `/candidate` drawer check script used a stale selector assertion (`drawerClosedOnEsc: false`) even though the `step_4` HUD showed the drawer closed (`button "Mở menu điều hướng" [active]`); the identical `SharedAppLayout` mobile drawer `Escape` close behavior was subsequently confirmed explicitly via `navVisibleOpen: true -> navVisibleAfterEsc: false` in `step_20` (`/mentor`).

---

## 9. PLATFORM-1-fix (T022DB0) — Live `/browser` Verification

Following completion of F1, F2, and S1–S8 (including S2 dev-only CSP template and F1/F2 Nginx + rate-limiter wiring), two live Antigravity `/browser` (`webview_browser`) passes were executed against the rebuilt `http://127.0.0.1:3000` Docker Compose stack (`5/5` services healthy, pristine seed DB, browser pane visible, zero destructive mutations):

- **Pass 1 (`1367f8ca-b2d1-4352-9d4c-6b9f71c430b8`)**: All `7` candidate routes (authenticated via `#tab-lms` -> fresh 60s LMS SSO ticket `aff687d77c326d0fb822a0c7886a4e45` for `lms-sv-001` `Nguyễn Văn An` -> `POST /api/v1/auth/sso -> HTTP 200`), all public & auth routes, and intentional wrong-password negative check (`401`). Host facts: `visited_origins=http://127.0.0.1:3000`, `blocked_origins=none`.
- **Pass 2 (`3caf673c-d896-47dc-acf7-a3c3c84d9a60`)**: All `5` enterprise logins (`hr2`, `hr1`, `mentor1`, `staff1`, `admin1`) through Nginx `:3000` (`POST /api/v1/auth/login -> HTTP 200` for all 5, `0` `502`/`429`), covering `/hr`, `/hr/company`, `/change-password`, `/mentor`, `/staff`, and `/admin` at `1440x900` & `375x812` Light & Dark. Host facts: `visited_origins=http://127.0.0.1:3000`, `blocked_origins=none`.

### 9.1 Bilingual Summary (Tiếng Việt)

- **Luồng đăng nhập qua Nginx (`:3000`) — Kiểm chứng F1/F2/S2**:
  - **LMS SSO (`#tab-lms` -> `/sso-callback` -> `/candidate`)**: Vé 60s mới `lms-sv-001` (`Nguyễn Văn An`) trả về `POST /api/v1/auth/sso -> HTTP 200` (`0` lỗi `502`, `0` lỗi `429`, `0` lỗi console/CSP).
  - **Tất cả `5` tài khoản doanh nghiệp/nội bộ (`#tab-enterprise`, `POST /api/v1/auth/login`)**: `hr2@rikkeijobs.test` (`200` -> `/hr` -> `/hr/company` -> đăng xuất), `hr1@rikkeijobs.test` (`200` -> tự chuyển `/change-password`, nút `"Cập nhật mật khẩu"` khóa khi rỗng/yếu/không khớp), `mentor1@rikkeijobs.test` (`200` -> `/mentor`), `staff1@rikkeijobs.test` (`200` -> `/staff`), `admin1@rikkeijobs.test` (`200` -> `/admin`), và kiểm tra sai mật khẩu (`hr2@rikkeijobs.test` / `WrongPass!`) trả về đúng **`HTTP 401`** (`Email hoặc mật khẩu không chính xác`), không bị `429` hay `502`.
- **Kiểm tra toàn bộ `21` tuyến route (`1440x900` & `375x812`, Sáng/Tối)**:
  - **`ConsoleErrors` (HUD)**: **`0`** trên toàn bộ các bước của cả 2 lượt.
  - **Vi phạm CSP & lỗi HTTP bất thường**: **`0`** vi phạm CSP, **`0`** lỗi `502` / `429` ngoài ý muốn (`GET /api/v1/me/target -> 404` trên seed nguyên bản chưa chọn mục tiêu + `401` sai mật khẩu chủ đích).
  - **Độ vừa ngang**: `htmlW = 1424.8` / `1440` tại `1440px`; `360` (có thanh cuộn dọc) hoặc `375.2` (làm tròn DPI Windows 125% khi không có thanh cuộn dọc) tại `375px` — không tràn ngang.
  - **Hình ảnh (`<img>` / `:9000/cloudinary/...` / `data:` / `blob:`)**: Trên dữ liệu seed nguyên bản (chỉ đọc, không đột biến), công ty của `hr2` (`Công ty Cổ phần Giải pháp Số Đông Dương`) chưa tải logo nên hiển thị placeholder `"Chưa có logo công ty"` (`0` thẻ `<img>`), và các trang ứng viên/công khai/xác thực dùng icon `<svg>` nội tuyến (`0` thẻ `<img>`). Do đó `0` ảnh vỡ xảy ra trên trình duyệt, còn khả năng tải logo mock `:9000/cloudinary/...` được chứng minh trực tiếp bởi E2E `test_company_profile.test.mjs` kết hợp header CSP dev thực tế qua `curl` (`img-src 'self' data: blob: https://res.cloudinary.com http://127.0.0.1:9000 http://localhost:9000`).
  - *(Ghi chú thẩm mỹ thời điểm chụp ở Pass 2: `fix-hr-company-375-dark.png` và `fix-mentor-1440-dark.png` được chụp đúng lúc hiệu ứng chuyển giao diện tối/resize đang kết thúc.)*

### 9.2 Verified Route & Interaction Coverage (`21` Route Entries, Passes `1367f8ca` & `3caf673c`)

| Scope / Routes | Viewports & Themes | `htmlW` (`1440` / `375`) | Console / CSP Errors | Unexpected `502` / `429` / `>= 400` | Verified Interactions & Observations |
|---|---|---|---|---|---|
| **Public & Auth (`7` routes)**: `/`, `/login`, `/sso-callback`, `/forgot-password`, `/reset-password`, `/reset-password/invalid-token-123`, `/change-password` (`hr1`) | `1440x900`, `375x812` (Light; `/` Light & Dark) | `1424.8..1440` / `360..375.2*` | `0 / 0` | `0 / 0 / 0` (intentional `401` on `WrongPass!`) | `#tab-lms` & `#tab-enterprise` flows, `/sso-callback` error & valid states, `/change-password` disabled validation on empty/weak/mismatch, logout -> `/login`. |
| **Candidate (`7` routes)**: `/candidate`, `/candidate/skills`, `/candidate/jobs`, `/candidate/jobs/1`, `/candidate/jobs/2`, `/candidate/gap-analysis`, `/candidate/evaluations`, `/candidate/internships` | `1440x900`, `375x812` (Light & Dark) | `1424.8` / `360..375.2*` | `0 / 0` | `0 / 0 / 0` (expected seed `GET /me/target -> 404`) | Wheel scroll, hover, dblclick, right-click, `Tab`, mobile drawer + `Escape`, skill accordion (`false -> true`), `10` job cards, `goBack()`/`goForward()` (job detail `h1Count=0` uses `<h2>` per pre-existing PR #13 note), `<Select>` + `Escape`, evaluation expand/collapse, `page.reload()` -> `/login`. |
| **Internal Roles (`5` routes)**: `/hr`, `/hr/company`, `/mentor`, `/staff`, `/admin` | `1440x900`, `375x812` (Light & Dark) | `1424.8` / `360` | `0 / 0` | `0 / 0 / 0` | `5/5` enterprise logins `HTTP 200`, `/hr/company` wheel/hover/`Tab`/`goBack()`/`goForward()` (non-destructive, Save not clicked, `"Chưa có logo công ty"` placeholder, `0` broken `<img>`), `"Mã tài khoản LMS"` on `/mentor`/`/staff`/`/admin`, sidebar collapse (`true->false->true`), mobile drawer `Escape`. |
| **Error / Fallback (`2` entries)**: `/403`, `/route-khong-ton-tai-404` | `1440x900`, `375x812` (Light) | `1440` / `375.2*` | `0 / 0` | `0 / 0 / 0` | Unauthenticated direct visits cleanly redirect to `/login`. |

### 9.3 Fix Screenshots (`6` PNGs in `docs/platform1/pr-screenshots/fix/`, git-ignored)

1. `fix-candidate-1440-light.png`
2. `fix-jobs-1440-dark.png`
3. `fix-login-375-light.png`
4. `fix-hr-company-1440-light.png`
5. `fix-hr-company-375-dark.png` *(captured mid-transition right after resize/theme-switch circular reveal)*
6. `fix-mentor-1440-dark.png` *(captured mid-transition right after theme-switch circular reveal)*

### 9.4 Honest Sandbox Disclosure (`webview_browser`)

As in Sections `2` and `8.4`, `webview_browser` blocks `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request`, and `page.route`. Native replacements used were `boundingBox()` for `htmlW` and layout boxes, `getAttribute('data-theme')` + UI `"Chế độ tối"` switch, `networkRequests()` for HTTP statuses, and HUD `ConsoleErrors` for `0` console/CSP errors. Because pristine seed `hr2` has no uploaded company logo (`0` `<img>` tags on `/hr/company`), `:9000/cloudinary/...` image loading is proven by E2E `test_company_profile.test.mjs` alongside the live dev `curl` CSP header (`img-src ... http://127.0.0.1:9000 http://localhost:9000`).
