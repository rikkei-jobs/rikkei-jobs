# `[UIUX]` Icon-only sidebar toggle, theme switch, motion language, login radar auto-cycle & role-centered content polish

> **GitHub Pull Request Title (without Markdown backticks)**: `[UIUX] Icon-only sidebar toggle, theme switch, motion language, login radar auto-cycle & role-centered content polish`

## Pull Request Metadata / Thông Tin Pull Request

- **Rounds / Đợt triển khai**: `UIUX-polish` (`M0`–`M8`) + follow-up `UIUX-radar` (Documented task-code exception: commit prefix `"UIUX: "`, PR title prefix `` `"[UIUX]"` `` per `docs/uiux/PHASE0_ACK.md`)
- **Source Branch / Nhánh nguồn**: `feature/uiux-motion-polish`
- **Target Branch / Nhánh đích**: `feature/T022BB1-phan-quyen-5-vai-tro`
- **Screenshots Directory / Thư mục ảnh chụp**: `docs/uiux/pr-screenshots/` (git-ignored via `.gitignore`, `89` PNGs on disk: `67` `UIUX-polish` + `21` `UIUX-radar` + `1` Owner defect reference, indexed in `docs/uiux/pr-screenshots/ORDER.txt`, zero secrets or real PII)

---

## Part 1: English Section

### 1.1 Executive Summary (`UIUX-polish` `M0`–`M8` + `UIUX-radar`)

This PR combines Round `UIUX-polish` and follow-up Round `UIUX-radar` to deliver accessible M1 shell controls, research-grounded motion design, bounded `/login` hero radar auto-cycling, role-centered Vietnamese copywriting, route-level code splitting, wide-screen `/login` layout balance, and full-app `/browser` verification while adding zero new dependencies and zero backend Java/Flyway modifications:

- **M1 Accessible Shell Controls**:
  - **M1a Icon-Only Sidebar Toggle (`SharedAppLayout.tsx`)**: Replaced the text-labeled collapse button with an icon-only native `<button type="button">` (`47.2 x 44px >= 44px`), `aria-expanded`, `aria-controls`, dynamic Vietnamese `aria-label` (`"Thu gọn thanh điều hướng"` / `"Mở rộng thanh điều hướng"`), CSS `transform` flip on `<Icon />`, and an Escape-dismissible hover/focus `role="tooltip"` (`<= 200ms`), persisting state in `localStorage` (`rj_sidebar_collapsed`).
  - **M1b Icon Theme Switch (`ThemeSwitch.tsx`)**: Replaced all text-based theme toggles (including on `/` and in the shared header) with `<button type="button" role="switch">` (`60 x 44px >= 44px`), `aria-checked`, static `aria-label="Chế độ tối"`, `Space`/`Enter` toggle, sun/moon `<Icon />` (`aria-hidden="true"`), eased thumb slide, `>= 3.0:1` Light/Dark contrast, and preserved `data-theme` + OS preference fallback.
- **M2 Research & Motion Language (`docs/uiux/RESEARCH.md`, `design-tokens.css`, `motion.ts`, `DESIGN_SYSTEM.md`)**:
  - Established 7-step duration tokens, `cubic-bezier` fallbacks paired with `@supports (animation-timing-function: linear(0, 1))` springs, Spatial vs. Effects split, bounded stagger (`<= 400ms` standard / `<= 800ms` Showcase), cool navy elevation shadows `--rj-shadow-1..4` (`rgba(11, 26, 44, ...)`), `100ms` opacity cross-fades under `prefers-reduced-motion: reduce`, View Transitions route & circular theme reveal (`startThemeTransition`), and `cancelRouteTransition()` on logout/`401` boundaries.
- **M3 / M3b Audits & M4 / M4b Two-Stage Pilot**:
  - Audited all `19` route entries and `11` CSS files (`docs/uiux/AUDIT.md`), mapped all user-facing copy per role (`docs/uiux/CONTENT.md`), completed the M4 pilot (`15` PNGs), added the owner-approved **Showcase Motion Tier** (`agent-config/rules/09-frontend-design-bar.md`, `DESIGN_SYSTEM.md`), and completed the M4b rework (`24` PNGs) receiving conditional approval under 5 binding conditions.
- **M5a / M5+ Full Rollout & Route Code Splitting (`routeLazy.ts`, `App.tsx`)**:
  - Removed technical/implementation showcase (`ASVS`, `RBAC`, `TTL`, `JWT`, `Modular Monolith`, `MOD-0*`, `T022DB0`, public `HealthBadge` status) from primary UX; separated dev-only helpers (`LmsLoginForm`, `ForgotPasswordPage`, `/` `HealthBadge`) behind collapsed `import.meta.env.DEV` `<details>` containers; applied role-centered copy and real user/API data across all `5` role homes (moving account info to a secondary card and hiding `/change-password` for LMS SSO accounts), public/auth pages, and candidate sub-pages; resolved `375px` overflows; upgraded frontend skills while keeping `28` skills / `168` mirrored files.
- **M6 / M7 Verification & Bug Fixes (`BUG 1`–`BUG 4` + `CLS === 0`)**:
  - Fixed `BUG 1` (`/mentor` rubric weights `3000% -> 30%`), `BUG 2` (`RequireChangePasswordAccess.tsx` + hiding `/change-password` for LMS SSO & removing duplicate `/admin` buttons), `BUG 3` (`cancelRouteTransition()` eliminating logout shell flash), and `BUG 4` (`/change-password` `375px` placeholder clipping).
  - Stabilized `HrHomePage.tsx` (invariant `'Mở hồ sơ công ty'` CTA outside `isLoading` + fixed-height `.rj-hr-next-content`) achieving `CLS === 0` & `rawAll === 0` across all routes and `375/768/1024/1440px` Light/Dark, and captured `28` M7 screenshots (`m7-01`..`m7-28`).
- **Follow-Up `UIUX-radar` (`/login` Hero Radar Auto-Cycle, 1-Shot Ambient & Layout Balance)**:
  - **R2 (Remove Visible Pause Control & Bound Ambient Arcs)**: Removed `"Tạm dừng nền"` / `"Phát nền"`, `isUserPaused`, `.rj-ambient-toggle`, and old pause-button tests (`AuthEditorialLayout.tsx`, `identity.css`, `AuthRedesignM4.test.tsx`); bounded `.rj-story-ambient` arcs to play once (`--rj-duration-ambient: 4500ms`, arc 2 `4800ms`, `<= 5s` total `forwards`), paused when `document.hidden`, and static under `prefers-reduced-motion: reduce`.
  - **R3 (`CompetencyRadarVisual` Bounded Auto-Cycle & A11y)**: Enabled `autoCycleRadar` exclusively on `LoginPage.tsx` (`/login`; `autoCycle={false}` on `CandidateHomePage` and all 4 non-login auth routes): `--rj-radar-cycle: 4000ms` per group, `<= 400ms` compositor/stroke-dashoffset highlight, single `window.setTimeout` per step (zero `setInterval`, `isMountedRef` + cleanup), pauses on radar/detail hover, focus inside radar (`focusedAxis` separated from `selectedAxis`), `document.hidden`, and `prefers-reduced-motion: reduce` (`0` timers, manual-only); click/`Enter`/`Space` holds `8s` of no pointer/focus interaction before advancing from next group (re-click deselects and resumes immediately); `Escape` clears selection and resumes without stealing focus; stops after 3 rounds (18 steps, ~72s) onto overview; dynamic `aria-live="off"` during auto-cycle vs `"polite"` on user action (and under `prefers-reduced-motion: reduce`); approved Vietnamese caption; verified with `14` fake-timer unit tests in `CompetencyRadarVisual.test.tsx` and `21` `/browser` screenshots (`radar-01`..`09`, `radar-11`..`22`; `radar-10-reduced-motion.png` omitted honestly because `webview_browser` blocks `page.emulateMedia`).
  - **R4 (Root-Cause Investigation & Minimal `/login` Layout Fix)**: Confirmed `owner-report-login-left-clipped.png` (`1662x862` left-cropped `1920px` personal capture) is non-reproducible in live browsers (`lockup.x >= 40px` at `1280..1920px`); constrained `.rj-story-content-wrapper` / `.rj-story-footer` (`680px`), `.rj-radar-detail-box` (`560px`), `.rj-radar-caption` (`54ch`), balanced `1536px+` grid tracks (`48px` card-to-divider gap), added `overflow-x: clip` + `min-width: 0`, and fixed `1280x800` vertical overflow (`6.9px -> 0px`) while keeping `375px` mobile untouched.
  - **R5 (Owner-Approved Rule 09 Deviation & Docs/Skills Sync)**: Updated `agent-config/rules/09-frontend-design-bar.md`, `agent-config/rules/10-testing-strategy.md` (`410` tests / `35` files), `docs/design/DESIGN_SYSTEM.md`, `frontend-motion-design` (`SKILL.md` + `motion-tokens.css`), `frontend-accessibility-audit` (`SKILL.md` + `a11y-checklist.md`), `README.md`, and `docs/uiux/*`, preserving `28` skills / `168` mirrors (`10/10` validation). Documented the knowing Owner-approved deviation from Rule 09's visible-pause clause on `/login` hero, compensated by interaction pause/hold/`Escape` + Vietnamese caption, 1-shot `<= 5s` ambient arcs, and 3-round auto-stop.

### 1.2 Compliance with the 5 M4b Binding Conditions & `UIUX-radar` Gates

1. **Route-Level Code Splitting (`React.lazy`) & Bundle Criteria**: Native `React.lazy` + `<Suspense>` (`routeLazy.ts`, `App.tsx`), `0` new dependencies; Entry JS gz6 is `98.62 kB` (`99.64 kB` Vite CLI gz9, strictly `<= 128.81 kB`, down `-22.19 kB` from `120.81 kB` start-of-round baseline); Combined single-stream CSS gz6 is `20.60 kB` alphabetical (`20.42 kB` entry-first, `20.32 kB` gz9, strictly `<= 20.736 kB`).
2. **Exact `CLS === 0`**: Reserved geometry for `.rj-hr-next-content`, `.rj-role-async-slot`, skeletons, `font-display: optional`, fixed radar SVG/detail geometry, and count-up slots; verified `CLS === 0` & `rawAll === 0` across all routes and `375..1920px` Light/Dark.
3. **Strict Teammate File Scope Hygiene**: `candidateEvaluations.ts` kept at `0` diff (unmount cancellation handled locally in `CandidateHomePage.tsx`); teammate CSS edits limited strictly to `375px` overflow and token alignment; every touched teammate file disclosed in Section 3 below.
4. **Full Rollout Order & Rule 09 Discipline**: Shared tokens/components -> 5 role homes -> auth/public/system routes -> candidate sub-pages -> scoped `/login` radar follow-up; Rule 09 Showcase limits + Owner-approved `/login` hero exception documented verbatim (`28` skills / `168` mirrors, `10/10` validation).
5. **`/browser`, Fresh Docker E2E & Final Gates**: Live `/browser` M7 + `UIUX-radar` PASS (`0` console/HTTP>=400 errors), `docs/uiux/` suite complete, Vitest **`410` tests / `35` files PASS**, `120/120` contrast, `8/8` mock, fresh `docker compose up -d --build --wait` -> `node e2e/run-all.mjs` (**`26/26` suites / `323` cases / `1,939` assertions PASS** in `36.42s`) -> `docker compose down -v` (`0` rikkei containers/volumes remaining), `./check.sh` & `.\check.ps1` (`26/26` PASS), git read-only (`0` staged).

### 1.3 Production Bundle Size Comparison (Before vs. After)

Measured via `npm --prefix frontend run build` (`0` warnings, `111` modules transformed) and Node `zlib.gzipSync` on `frontend/dist/assets`:

| Metric | Start Baseline (`PHASE0_ACK.md`) | End of `UIUX-polish` | Current `UIUX-radar` Build | Change & Status |
|---|---:|---:|---:|---|
| **Entry JS (Node gz6)** | `120.81 kB` (`415.90 kB` raw) | `97.80 kB` (`97,796 B`) | **`98.62 kB`** (`98,621 B` gz6 / `319,664 B` raw) | **`-22.19 kB`** (`-18.4%`, `<= 128.81 kB` PASS) |
| **Entry JS (Vite CLI / gz9)** | `120.81 kB` | `97.61 kB` (`97,605 B`) | **`99.64 kB`** Vite CLI / **`98.42 kB`** (`98,424 B` gz9) | **`<= 128.81 kB` PASS** |
| **Total JS (all `30` chunks, gz6)** | `120.81 kB` | `149.91 kB` (`149,905 B`) | **`150.69 kB`** (`150,693 B` gz6 / `478,259 B` raw) | Deferred in `React.lazy` route chunks |
| **Entry CSS (Node gz6 / Vite CLI)** | `17.28 kB` (`116.17 kB` raw) | `13.94 kB` (`13,943 B`) | **`14.10 kB`** gz6 (`14,099 B`) / **`14.04 kB`** Vite CLI | **`-3.18 kB`** (`-18.4%` vs baseline) |
| **Combined Single-Stream CSS (gz6)** | `17.28 kB` | `20.44 kB` (`20,442 B`) | **`20.60 kB`** alpha (`20,597 B` gz6 / `20.32 kB` gz9; `20.42 kB` entry-first; `130,357 B` raw) | **`+3.32 kB`** (`+19.2%`, `<= 20.736 kB` PASS) |
| **Sum of `7` Lazy CSS Chunks (gz6)** | `17.28 kB` | `24.25 kB` (`24,255 B`) | **`24.41 kB`** (`24,411 B` gz6 across `7` separate files) | Includes `7` per-chunk gzip headers/dictionaries |

---

## Part 2: Vietnamese Section / Bản Dịch Tiếng Việt

### 2.1 Tóm Tắt Thay Đổi Chính (`UIUX-polish` `M0`–`M8` + `UIUX-radar`)

PR này gộp trọn vẹn vòng `UIUX-polish` và vòng nối tiếp `UIUX-radar` nhằm hoàn thiện điều khiển trợ năng M1, ngôn ngữ chuyển động có nghiên cứu, cơ chế tự chuyển có giới hạn cho biểu đồ radar tại `/login`, nội dung tiếng Việt hướng vai trò, chia tách mã nguồn theo tuyến, cân đối bố cục màn hình rộng `/login` và kiểm chứng trình duyệt toàn ứng dụng, giữ nguyên `0` dependency mới và `0` sửa đổi Java/Flyway backend:

- **M1 Hai Điều Khiển Shell (`SharedAppLayout.tsx`, `ThemeSwitch.tsx`)**:
  - **M1a Nút thu gọn sidebar chỉ dùng biểu tượng**: Nút `<button type="button">` (`47.2 x 44px >= 44px`), `aria-expanded`, `aria-controls`, `aria-label` đổi động (`"Thu gọn thanh điều hướng"` / `"Mở rộng thanh điều hướng"`), lật biểu tượng `<Icon />` qua `transform`, tooltip `role="tooltip"` (`<= 200ms`) đóng bằng `Escape`, lưu khóa `rj_sidebar_collapsed`.
  - **M1b Công tắc sáng/tối**: `<button type="button" role="switch">` (`60 x 44px >= 44px`), `aria-checked`, `aria-label="Chế độ tối"` cố định, hỗ trợ `Space`/`Enter`, biểu tượng mặt trời/mặt trăng (`aria-hidden="true"`), nút trượt mượt, tương phản `>= 3.0:1` ở Sáng/Tối, giữ nguyên `data-theme` và fallback OS.
- **M2 Nghiên Cứu & Ngôn Ngữ Chuyển Động (`RESEARCH.md`, `design-tokens.css`, `motion.ts`, `DESIGN_SYSTEM.md`)**: Thang 7 thời lượng, đường cong `cubic-bezier` kèm nâng cấp lò xo `linear()`, tách Spatial vs. Effects, stagger có chặn trên, bóng đổ navy lạnh `--rj-shadow-1..4`, cross-fade `100ms` khi giảm chuyển động, View Transitions đổi trang & vòng tròn đổi theme (`startThemeTransition`), và `cancelRouteTransition()` chống nháy khi đăng xuất/`401`.
- **M3/M3b Kiểm Toán & M4/M4b Thí Điểm Hai Vòng**: Kiểm toán `19` tuyến & `11` tệp CSS (`AUDIT.md`), lập bản đồ nội dung 5 vai trò (`CONTENT.md`), dừng M4 (`15` ảnh), bổ sung **Showcase Motion Tier** theo chỉ đạo của Product Owner vào Rule 09 & `DESIGN_SYSTEM.md`, và hoàn thành M4b (`24` ảnh) đạt phê duyệt có điều kiện với 5 ràng buộc.
- **M5a/M5+ Mở Rộng Toàn Bộ & `React.lazy` (`routeLazy.ts`, `App.tsx`)**: Xóa toàn bộ từ ngữ phô trương kỹ thuật (`ASVS`, `RBAC`, `TTL`, `JWT`, `Modular Monolith`, `MOD-0*`, `T022DB0`, `HealthBadge` công khai), đưa công cụ dev vào `<details>` thu gọn chỉ hiện ở `DEV`, dẫn dắt cả 5 trang chủ vai trò bằng dữ liệu thật (chuyển bảng tài khoản xuống vùng phụ, ẩn `/change-password` với tài khoản LMS SSO), sửa tràn `375px`, tách chunk tuyến bằng `React.lazy`, và nâng cấp các skill frontend giữ nguyên `28` skill / `168` bản sao.
- **M6/M7 Kiểm Chứng & Sửa Lỗi (`BUG 1`–`BUG 4` + `CLS === 0`)**: Khắc phục `BUG 1` (trọng số `/mentor` `3000% -> 30%`), `BUG 2` (chặn LMS SSO vào `/change-password` & bỏ nút trùng ở `/admin`), `BUG 3` (`cancelRouteTransition()` xóa nháy shell lúc đăng xuất), `BUG 4` (cắt placeholder `375px`), cố định hình học `HrHomePage` (`'Mở hồ sơ công ty'` + `.rj-hr-next-content`) đạt `CLS === 0`, và lưu `28` ảnh M7 (`m7-01`..`m7-28`).
- **Vòng Nối Tiếp `UIUX-radar` (Radar `/login`, Vòng Nền 1-Shot & Cân Đối Bố Cục)**:
  - **R2**: Gỡ bỏ hoàn toàn nút `"Tạm dừng nền"` / `"Phát nền"`, state `isUserPaused` và test cũ; giới hạn `.rj-story-ambient` chạy 1 lần duy nhất (`4500ms`/`4800ms <= 5s`) rồi đứng yên, tự dừng khi `document.hidden`, tĩnh dưới `prefers-reduced-motion: reduce`.
  - **R3**: Bật `autoCycleRadar` duy nhất trên `/login` (`autoCycle={false}` ở `CandidateHomePage` và 4 trang auth khác): `--rj-radar-cycle: 4000ms` mỗi nhóm, highlight `<= 400ms` compositor/stroke-dashoffset, 1 `setTimeout` mỗi bước (không `setInterval`), tạm dừng khi hover radar/hộp chi tiết, focus bên trong (`focusedAxis` tách khỏi `selectedAxis`), `document.hidden`, và `prefers-reduced-motion: reduce` (`0` timer, thủ công hoàn toàn); click/`Enter`/`Space` giữ `8s` rồi tự sang nhóm kế (click lại để bỏ chọn & chạy tiếp ngay); `Escape` chạy tiếp không cướp focus; tự dừng sau 3 vòng (18 bước ~72s) về tổng quan; `aria-live="off"` khi tự chuyển và `"polite"` khi người dùng thao tác (và dưới `prefers-reduced-motion: reduce`); chú thích tiếng Việt súc tích; kiểm chứng bởi `14` test fake-timer mới (`CompetencyRadarVisual.test.tsx`) và `21` ảnh `/browser` (`radar-01`..`09`, `radar-11`..`22`; không có `radar-10-reduced-motion.png` do `webview_browser` chặn `page.emulateMedia`).
  - **R4**: Xác nhận `owner-report-login-left-clipped.png` (`1662x862` crop trái bản `1920px` trên máy Owner) không tái hiện trên trình duyệt sống; cân đối lại khối story/footer (`680px`), hộp chi tiết (`560px`), chú thích (`54ch`), tỷ lệ lưới `1536px+` (card cách đường chia `48px`), thêm `overflow-x: clip` + `min-width: 0`, triệt tiêu `6.9px` tràn dọc ở `1280x800` và giữ nguyên mobile `375px`.
  - **R5**: Cập nhật Rule 09/10 (`410` tests / `35` files), `DESIGN_SYSTEM.md`, `frontend-motion-design`, `frontend-accessibility-audit`, `README.md` và `docs/uiux/*`, giữ `28` skills / `168` mirrors (`10/10`), ghi nhận minh bạch ngoại lệ Rule 09 được Owner phê duyệt (bỏ nút tạm dừng hiển thị trên hero `/login`).

### 2.2 Tuân Thủ 5 Điều Kiện M4b & Cổng `UIUX-radar`

1. **Chia Tách Mã Nguồn (`React.lazy`) & Dung Lượng**: Dùng `React.lazy` + `<Suspense>` thuần (`0` gói mới); Entry JS gz6 đạt `98.62 kB` (`99.64 kB` Vite CLI gz9, `<= 128.81 kB`); CSS gộp đơn luồng gz6 đạt `20.60 kB` alpha (`20.42 kB` entry-first, `<= 20.736 kB`).
2. **`CLS === 0` Tuyệt Đối**: Cố định kích thước `.rj-hr-next-content`, `.rj-role-async-slot`, skeleton, `font-display: optional`, radar SVG & hộp chi tiết; xác minh `CLS === 0` & `rawAll === 0` trên mọi tuyến và `375..1920px`.
3. **Vệ Sinh Tệp Đồng Đội**: Giữ `candidateEvaluations.ts` nguyên vẹn `0` diff (hủy bất đồng bộ cục bộ trong `CandidateHomePage.tsx`); mọi tệp đồng đội đã chạm đều công bố đầy đủ ở Mục 3.
4. **Thứ Tự Triển Khai & Rule 09**: Tokens/shared -> 5 role homes -> auth/public -> candidate sub-pages -> mở rộng có kiểm soát cho `/login` radar; giữ nguyên `28` skill / `168` bản sao (`10/10`).
5. **`/browser`, Docker E2E & Cổng Cuối**: `/browser` M7 & `UIUX-radar` PASS (`0` lỗi console/HTTP>=400), Vitest **`410` tests / `35` tệp PASS**, `120/120` contrast, `8/8` mock, Docker E2E mới (`26/26` suites / `323` cases / `1,939` assertions PASS, `36.42s`) kèm `docker compose down -v` sạch `0` container/volume, `./check.sh` & `.\check.ps1` (`26/26` PASS), git read-only (`0` staged).

---

## 3. Complete Teammate File Disclosure & Justification / Công Bố Đầy Đủ Tệp Đồng Đội Đã Chạm

Locked files verified untouched (`0` diff): `frontend/src/features/candidate/api/candidateEvaluations.ts`, `frontend/src/features/identity/guards/RequireMustChangePassword.tsx`, `frontend/vitest.config.ts`, `backend/pom.xml`, `pom.xml`, `frontend/package.json`, `frontend/package-lock.json`, `mock/package.json`.

### 3.1 Group A — 4 Teammate CSS Files (Strictly `375px` Overflow & Token Alignment)

| File Path | Exact Scope & Justification |
|---|---|
| `frontend/src/App.css` | Aligned body font stack to `--rj-font-body`, header layout to accommodate `ThemeSwitch`, cool navy `--rj-shadow-2`/`3`, `minmax(min(320px, 100%), 1fr)` & `minmax(min(280px, 100%), 1fr)` fixing `375px` grid overflow, focus token, `min-height: 2.85em` on `.health-details`, and `@media (prefers-reduced-motion: reduce)`. |
| `frontend/src/features/candidate/skillProfile.css` | Fixed `.sp-skill-head` mobile grid (`411px > 375px` overflow) at `<= 767px` so all 4 child elements stack cleanly within `375px`. |
| `frontend/src/features/candidate/styles/candidateEvaluations.css` | Added `.ce-page:first-child` top-border/margin cleanup when rendered standalone at `/candidate/evaluations` and `overflow-wrap: anywhere` on `.ce-skill-name` preventing mobile overflow. |
| `frontend/src/features/candidate/styles/jobRecommendations.css` | Replaced `minmax(360px, 1fr)` (`400.8px > 375px` overflow) with `minmax(min(360px, 100%), 1fr)`, added `flex-wrap: wrap` on `.meta-badges`, aligned duration/easing/button tokens (`min-height: var(--rj-density-button-height)` + `:disabled`), removed gradient/global `spin` collision, and added `prefers-reduced-motion`. |

### 3.2 Group B — Minimal Teammate TS/TSX/Test Files (M5a Copy, Real Mentor Data, Error Copy & M4/M4b Pilot)

| File Path | Exact Scope & Justification |
|---|---|
| `frontend/src/features/candidate/JobRecommendationsSection.tsx` | M5a copy cleanup: removed internal `"AI Provider"` / `"bộ nhớ đệm"` text (`Cập nhật trong ngày`) and labeled unimplemented apply button `"Ứng tuyển (Sắp ra mắt)"` (`disabled`). |
| `frontend/src/features/candidate/JobRecommendationsSection.test.tsx` | Updated assertions to match M5a copy (`Cập nhật trong ngày`, absence of `AI Provider`, disabled `"Ứng tuyển (Sắp ra mắt)"` buttons). |
| `frontend/src/features/candidate/components/SkillProfilePage.tsx` | Line `61`: removed internal word `"Backend"` from connection error message (`CONTENT.md` M5a compliance). |
| `frontend/src/features/candidate/gapUtils.ts` | Line `11`: removed internal word `"Backend"` from gap-analysis error fallback message. |
| `frontend/src/features/assessment/index.ts` | Updated `"20 kỹ năng chuẩn hóa"` -> `"20 kỹ năng được đánh giá"` (`CONTENT.md`) and exported `fetchEvaluationTemplates`. |
| `frontend/src/features/assessment/api/evaluationTemplates.ts` | New read-only API helper (`GET /api/v1/evaluation-templates`) supplying real rubric data to `MentorHomePage.tsx` (zero invented sample data). |
| `frontend/src/shared/api/httpClient.ts` | Line `130`: rewrote generic HTTP error fallback to plain Vietnamese (`"Không thể xử lý yêu cầu (mã lỗi ...). Vui lòng thử lại."`). |
| `frontend/src/shared/api/__tests__/httpClient.test.ts` | Line `410`: updated single assertion string to match `httpClient.ts:130` (zero changes to NT-02 fallback tests). |
| `frontend/src/features/company/components/CompanyLogoPanel.tsx` | M4/M4b pilot `/hr/company`: accessible loading/error visual polish. |
| `frontend/src/features/company/components/CompanyProfileForm.tsx` | M4/M4b pilot `/hr/company`: Showcase motion feedback & clean Vietnamese labels/hints. |
| `frontend/src/features/company/pages/CompanyProfilePage.tsx` | M4/M4b pilot `/hr/company`: skeleton loading states, role-centered copy (`Thông tin pháp lý cố định`). |
| `frontend/src/features/company/styles/companyProfile.css` | M4/M4b pilot `/hr/company`: token alignment, fixed error frame height (`CLS = 0`), reduced-motion rules. |
| `frontend/src/features/company/__tests__/CompanyProfileAccessibility.test.tsx` | Updated assertions for M4/M4b copy, `await screen.findByLabelText(/Tên công ty/i)` eliminating `loading -> ready` race, exact `'Hồ sơ công ty'` link query, and deterministic lazy-route timeouts. |

---

## 4. Updated & Added Frontend Test Files (`35` Files / `410` Tests PASS)

- **Modified test files (`16`)**:
  1. `frontend/src/App.test.tsx` — updated M5a landing/`/login` copy assertions, `React.lazy` preload tests, and deterministic `8000ms`/`15000ms` timeouts for cold lazy routes under parallel load.
  2. `frontend/src/features/identity/__tests__/RoleHomes.test.tsx` — updated tests for real-data leading hero blocks on all 5 role homes, secondary account card, hidden `/change-password` for LMS SSO, honest `"Sắp ra mắt"` scope, weight percentage formatting (`(30%)`), and `CLS = 0` DOM/focus stability across `isLoading` transitions.
  3. `frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx` — added M1a icon-only toggle, M1b `role="switch"` tests, logout `cancelRouteTransition()` / shell unmount checks, and lazy-route timeouts.
  4. `frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx` — updated M5a heading/copy assertions and lazy-route `waitFor` timeouts (`8000ms`/`15000ms`).
  5. `frontend/src/features/identity/__tests__/ChangePasswordPage.test.tsx` — updated M5a copy, voluntary/forced mode assertions, and `8000ms`/`15000ms` lazy-route timeouts.
  6. `frontend/src/features/company/__tests__/CompanyProfileAccessibility.test.tsx` — fixed `loading -> ready` `findByLabelText` race, exact `'Hồ sơ công ty'` link check, and timeouts.
  7. `frontend/src/features/identity/__tests__/AuthRedesignM4.test.tsx` — updated for 6 real skill group axes on `CompetencyRadarVisual`, removal of `"Tạm dừng nền"` / `"Phát nền"` toggle, approved `UIUX-radar` Vietnamese caption on `/login`, preserved tab-visibility (`document.hidden`) ambient pause test, zero `ASVS`/stats showcase, and `BrandMark` persistence.
  8. `frontend/src/features/identity/__tests__/SsoCallbackPage.test.tsx` — updated M5a Vietnamese copy and `.rj-sso-card` DOM identity stability test across `loading -> success` / `loading -> error`.
  9. `frontend/src/features/identity/__tests__/LoginPage.test.tsx` — added WAI-ARIA horizontal tab keyboard navigation (`ArrowLeft`/`ArrowRight`/`Home`/`End`), URL query sync, and `/sso-callback` preload assertions.
  10. `frontend/src/features/identity/__tests__/ForgotPasswordPage.test.tsx` — updated sentence-case Vietnamese button/label assertions.
  11. `frontend/src/features/identity/__tests__/ResetPasswordPage.test.tsx` — updated sentence-case label, placeholder, and submit button assertions.
  12. `frontend/src/features/identity/__tests__/ForbiddenPage.test.tsx` — updated `/login` heading assertion (`^Đăng nhập$`) and test fixture name.
  13. `frontend/src/features/identity/__tests__/accessibility_wcag.test.tsx` — updated `role="switch"`, static `aria-label="Chế độ tối"`, `Space`/`Enter` + `Escape` tooltip tests, and rapid theme-transition abort safety.
  14. `frontend/src/features/identity/__tests__/guards.test.tsx` — added `RequireChangePasswordAccess` suite (`4` tests covering anonymous, LMS SSO, voluntary HR, and forced `mustChangePassword`).
  15. `frontend/src/features/candidate/JobRecommendationsSection.test.tsx` — updated M5a copy & disabled apply button assertions.
  16. `frontend/src/shared/api/__tests__/httpClient.test.ts` — updated 502 error message string at line `410`.
- **New test files (`3`)**:
  1. `frontend/src/features/identity/__tests__/CompetencyRadarVisual.test.tsx` — `14` deterministic `vi.useFakeTimers()` tests covering `/login` 4s auto-advance, hover pause (radar & detail box), focus pause (`focusedAxis` vs `selectedAxis`), 8s click hold + resume, re-click deselect, `Escape` resume without focus stealing, `Escape -> Enter` focus-pause re-arming, 3-round (18-step) stop onto overview, dynamic `aria-live` (`"off"` on auto-cycle & `mouseLeave`, `"polite"` on user action & `prefers-reduced-motion: reduce`), tab visibility (`document.hidden`), `prefers-reduced-motion: reduce` (`0` timers), unmount cleanup, and `autoCycle={false}` on non-login auth & candidate pages.
  2. `frontend/src/shared/utils/__tests__/motion.test.ts` — unit tests for `navigateWithTransition`, `startThemeTransition`, `cancelRouteTransition`, `registerMotionEntrance`, and `AbortError` handling.
  3. `frontend/src/shared/utils/__tests__/routeLazy.test.tsx` — unit tests for `lazyRoute`, `preloadRouteForPath`, and preloaded route cache behavior.

---

## 5. Ordered `"UIUX: "` Commit Proposals (Verified Against `git status --porcelain=v1 -uall`)

> Note: Git remains strictly read-only (all changes uncommitted and unstaged). The Team Lead may apply these ordered commits after final verification. Every single modified/untracked path below matches `git status --porcelain=v1 -uall` 1:1 (`100` modified + `15` untracked = `115` paths total).

1. `UIUX: add Phase 0 acknowledgements, research synthesis, UI/motion audit and role content map`
   - `.gitignore`
   - `docs/uiux/PHASE0_ACK.md`
   - `docs/uiux/RESEARCH.md`
   - `docs/uiux/AUDIT.md`
   - `docs/uiux/CONTENT.md`
2. `UIUX: define motion language tokens, cool navy elevation and motion utilities`
   - `frontend/index.html`
   - `frontend/src/index.css`
   - `frontend/src/main.tsx`
   - `frontend/src/shared/styles/design-tokens.css`
   - `frontend/src/shared/styles/tokens.css`
   - `frontend/src/shared/utils/motion.ts`
   - `frontend/src/shared/utils/routeLazy.ts`
   - `frontend/src/shared/utils/__tests__/motion.test.ts`
   - `frontend/src/shared/utils/__tests__/routeLazy.test.tsx`
   - `docs/design/DESIGN_SYSTEM.md`
3. `UIUX: implement icon-only sidebar toggle, icon theme switch and shared shell polish`
   - `frontend/src/shared/components/BrandMark.tsx`
   - `frontend/src/shared/components/Header.tsx`
   - `frontend/src/shared/components/Icon.tsx`
   - `frontend/src/shared/components/Select.css`
   - `frontend/src/shared/components/ThemeSwitch.tsx`
   - `frontend/src/shared/api/httpClient.ts`
   - `frontend/src/shared/api/__tests__/httpClient.test.ts`
   - `frontend/src/features/identity/components/SharedAppLayout.tsx`
   - `frontend/src/features/identity/context/RoleShellContext.tsx`
   - `frontend/src/features/identity/guards/RequireChangePasswordAccess.tsx`
   - `frontend/src/features/identity/styles/identity.css`
   - `frontend/src/features/identity/__tests__/SharedAppLayout.test.tsx`
   - `frontend/src/features/identity/__tests__/accessibility_wcag.test.tsx`
   - `frontend/src/features/identity/__tests__/guards.test.tsx`
4. `UIUX: redesign auth flows, bounded login radar auto-cycle, layout balance and role copy`
   - `frontend/src/App.tsx`
   - `frontend/src/App.test.tsx`
   - `frontend/src/features/identity/index.ts`
   - `frontend/src/features/identity/components/AuthEditorialLayout.tsx`
   - `frontend/src/features/identity/components/CompetencyRadarVisual.tsx`
   - `frontend/src/features/identity/components/EnterpriseLoginForm.tsx`
   - `frontend/src/features/identity/components/LmsLoginForm.tsx`
   - `frontend/src/features/identity/pages/ChangePasswordPage.tsx`
   - `frontend/src/features/identity/pages/ForbiddenPage.tsx`
   - `frontend/src/features/identity/pages/ForgotPasswordPage.tsx`
   - `frontend/src/features/identity/pages/LoginPage.tsx`
   - `frontend/src/features/identity/pages/ResetPasswordPage.tsx`
   - `frontend/src/features/identity/pages/SsoCallbackPage.tsx`
   - `frontend/src/features/identity/__tests__/AuthRedesignM4.test.tsx`
   - `frontend/src/features/identity/__tests__/ChangePasswordPage.test.tsx`
   - `frontend/src/features/identity/__tests__/CompetencyRadarVisual.test.tsx`
   - `frontend/src/features/identity/__tests__/ForbiddenPage.test.tsx`
   - `frontend/src/features/identity/__tests__/ForgotPasswordPage.test.tsx`
   - `frontend/src/features/identity/__tests__/LoginPage.test.tsx`
   - `frontend/src/features/identity/__tests__/ResetPasswordPage.test.tsx`
   - `frontend/src/features/identity/__tests__/SsoCallbackPage.test.tsx`
   - `frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx`
5. `UIUX: roll out real-data role homes, HR company pilot and mobile overflow fixes`
   - `frontend/src/App.css`
   - `frontend/src/features/assessment/index.ts`
   - `frontend/src/features/assessment/api/evaluationTemplates.ts`
   - `frontend/src/features/candidate/JobRecommendationsSection.tsx`
   - `frontend/src/features/candidate/JobRecommendationsSection.test.tsx`
   - `frontend/src/features/candidate/components/SkillProfilePage.tsx`
   - `frontend/src/features/candidate/gapUtils.ts`
   - `frontend/src/features/candidate/skillProfile.css`
   - `frontend/src/features/candidate/styles/candidateEvaluations.css`
   - `frontend/src/features/candidate/styles/jobRecommendations.css`
   - `frontend/src/features/company/components/CompanyLogoPanel.tsx`
   - `frontend/src/features/company/components/CompanyProfileForm.tsx`
   - `frontend/src/features/company/pages/CompanyProfilePage.tsx`
   - `frontend/src/features/company/styles/companyProfile.css`
   - `frontend/src/features/company/__tests__/CompanyProfileAccessibility.test.tsx`
   - `frontend/src/features/identity/pages/role-homes/AdminHomePage.tsx`
   - `frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx`
   - `frontend/src/features/identity/pages/role-homes/CandidateSkillsPage.tsx`
   - `frontend/src/features/identity/pages/role-homes/HrHomePage.tsx`
   - `frontend/src/features/identity/pages/role-homes/MentorHomePage.tsx`
   - `frontend/src/features/identity/pages/role-homes/RoleHomeLayout.tsx`
   - `frontend/src/features/identity/pages/role-homes/StaffHomePage.tsx`
   - `frontend/src/features/identity/__tests__/RoleHomes.test.tsx`
6. `UIUX: sync showcase motion rules, skills, test counts and UIUX documentation`
   - `README.md`
   - `cspell.json`
   - `agent-config/rules/09-frontend-design-bar.md`
   - `agent-config/rules/10-testing-strategy.md`
   - `agent-config/skills/frontend-accessibility-audit/SKILL.md`
   - `agent-config/skills/frontend-accessibility-audit/references/a11y-checklist.md`
   - `agent-config/skills/frontend-iconography/SKILL.md`
   - `agent-config/skills/frontend-iconography/references/icon-checklist.md`
   - `agent-config/skills/frontend-motion-design/SKILL.md`
   - `agent-config/skills/frontend-motion-design/references/motion-tokens.css`
   - `agent-config/skills/frontend-motion-design/references/recipes.md`
   - `agent-config/skills/frontend-motion-design/references/spring-presets.md`
   - `agent-config/skills/frontend-visual-design/SKILL.md`
   - `agent-config/skills/frontend-visual-design/references/token-tables.md`
   - `.claude/rules/09-frontend-design-bar.md`
   - `.claude/rules/10-testing-strategy.md`
   - `.claude/skills/frontend-accessibility-audit/SKILL.md`
   - `.claude/skills/frontend-accessibility-audit/references/a11y-checklist.md`
   - `.claude/skills/frontend-iconography/SKILL.md`
   - `.claude/skills/frontend-iconography/references/icon-checklist.md`
   - `.claude/skills/frontend-motion-design/SKILL.md`
   - `.claude/skills/frontend-motion-design/references/motion-tokens.css`
   - `.claude/skills/frontend-motion-design/references/recipes.md`
   - `.claude/skills/frontend-motion-design/references/spring-presets.md`
   - `.claude/skills/frontend-visual-design/SKILL.md`
   - `.claude/skills/frontend-visual-design/references/token-tables.md`
   - `.gemini/rules/09-frontend-design-bar.md`
   - `.gemini/rules/10-testing-strategy.md`
   - `.gemini/skills/frontend-accessibility-audit/SKILL.md`
   - `.gemini/skills/frontend-accessibility-audit/references/a11y-checklist.md`
   - `.gemini/skills/frontend-iconography/SKILL.md`
   - `.gemini/skills/frontend-iconography/references/icon-checklist.md`
   - `.gemini/skills/frontend-motion-design/SKILL.md`
   - `.gemini/skills/frontend-motion-design/references/motion-tokens.css`
   - `.gemini/skills/frontend-motion-design/references/recipes.md`
   - `.gemini/skills/frontend-motion-design/references/spring-presets.md`
   - `.gemini/skills/frontend-visual-design/SKILL.md`
   - `.gemini/skills/frontend-visual-design/references/token-tables.md`
   - `docs/uiux/BROWSER_OBSERVATIONS.md`
   - `docs/uiux/PR_DESCRIPTION.md`
   - `docs/uiux/README.md`

---

## 6. Follow-Up Round `UIUX-align` (after merging `develop` / TT-01) / Vòng Bổ Sung `UIUX-align` (Sau Khi Merge `develop`)

### Part 1: English Section

#### 1.1 Executive Summary (`UIUX-align` `R1`–`R7` + Team Lead Decisions `#1` & `#2`)

Round `UIUX-align` aligns `/candidate/internships` (`TT-01`, merged at `5f817fe`) visually, structurally, semantically, and in CSS/motion discipline with `/candidate/jobs`, `/candidate`, and `/candidate/skills`, adding zero new dependencies and touching zero CSS chunks outside `frontend/src/features/internship/**`:

- **R1 — Page Header & Shell Alignment (`CandidateInternshipsPage.tsx`, `CandidateInternships.tsx`)**:
  - Replaced custom `.ci-heading` / `.ci-lead` with `<header className="rj-page-header"><h1 id="ci-heading" className="rj-page-title">Thực tập IOC</h1><p className="rj-page-subtitle">...</p></header>` (exactly one `<h1>`), eliminating the `+8.0px` vertical header offset drift seen in `M0-Before` (`y: 96.8px -> 88.8px` on `1440px`, `y: 185.9px -> 177.9px` on `375px` — achieving `0.0px` parity with `/candidate/jobs`).
  - Kept `RoleHomeLayout` (`roleTitle="Ứng viên"`, `hideAccountCard`, non-duplicating `description`), clean Vietnamese copy with full diacritics, and zero internal technical labels (`"PM"`, raw IDs).
- **R2 — Metrics Strip & `CLS = 0` Geometry (`CandidateInternships.tsx`, `candidateInternships.css`)**:
  - Adopted `.rj-stack-lg`, `.rj-cand-tile.rj-stack-xs`, `.rj-cand-kicker`, and `.rj-cand-metric-val.ci-metric-val.rj-tabular-nums` for summary metrics (`Đợt thực tập`, `Hạng mục nghiệm thu`).
  - Wrapped `useCountUp` values inside `.rj-metric-slot` / `.rj-metric-slot-reserve` / `.rj-metric-slot-live` (`CLS = 0`), collapsing the 2-column `.ci-metrics-strip` / `.ci-stats` grid cleanly to 1 column at `<= 479px`.
- **R3 — Semantic Batch Card (`InternshipCard.tsx`)**:
  - Rendered each batch as `<article className="rj-surface-card rj-interactive-card rj-stack-md ... ci-card">`, batch title in `h2.ci-batch-name` (`--rj-font-display`), batch code in `span.ci-batch-code.rj-tabular-nums` (`--rj-font-mono`, `overflow-wrap: anywhere`), 100% icons via `<Icon name=... />`, semantic `<dl>/<dt>/<dd>` metadata (`Đề tài thực tập`, `Nhóm`, `Mentor`, `Thời gian thực tập`, `Điểm cuối kỳ`, `Hạng mục nghiệm thu`), `vi-VN` (`Asia/Ho_Chi_Minh`) date formatting with en dash `–`, and null/NaN-safe fallbacks (`Chưa có điểm`, `Chưa phân nhóm`, `Chưa có mentor`, `Chưa cập nhật thời gian`).
- **R4 — Async & Error States (`CandidateInternships.tsx`)**:
  - **Loading**: `role="status"` + `aria-live="polite"` + `.rj-sr-only` + `.rj-skeleton` / `.rj-skeleton-card` / `.ci-skeleton-card` (`min-height: 356px`).
  - **Empty**: `.rj-empty-state` without `role="status"` or `role="alert"` (`[role="status"]=0`, `[role="alert"]=0` verified live on `lms-sv-002`).
  - **Error / Missing Auth**: `.rj-alert.rj-alert-danger.ci-alert` (`role="alert"`) preserving `403`/`404`/`400`/`503`/network error mapping and a `>= 44px` `.rj-btn.rj-btn-primary` `"Thử lại"` retry button.
- **R5 — Bounded Motion & Reduced Motion (`CandidateInternships.tsx`, `candidateInternships.css`)**:
  - Entrance stagger plays once per navigation via `hasPlayedMotionOnce`/`markMotionPlayed` (`INTERNSHIPS_MOTION_KEY`), zero new `@keyframes`, zero idle loops, `<= 150ms` card hover/press, and `@media (prefers-reduced-motion: reduce)` (`transform: none; animation-delay: 0ms;` + immediate final `useCountUp` values).
- **R6 — CSS Diet & Token Hygiene (`candidateInternships.css`)**:
  - Reduced `candidateInternships.css` from **`511` lines -> `195` lines** (`-316` lines, `-61.8%`) and `CandidateInternshipsPage-*.css` chunk from **`6,486 B -> 3,034 B` raw** (`-53.2%`) / **`1,468 B -> 861 B` gz6** (`-41.3%`), 100% design tokens (Check 9 PASS), `0` `!important`, `0` inline style objects, `0` emoji, and zero edits to CSS chunks outside `frontend/src/features/internship/**`.
- **R7 & Decision #2 — Vitest Coverage & Approved `motion.ts:533` Fix**:
  - Updated `CandidateInternships.test.tsx` (`18` tests PASS, `0` `act()` warnings) and added a dedicated `useCountUp` negative-first-frame (`now < startedAt`) unit test in `frontend/src/shared/utils/__tests__/motion.test.ts` (`36` files / `429` tests PASS total).

#### 1.2 Production Bundle Budgets (Team Lead Binding Decision `#1`)

Measured directly on `frontend/dist/assets` via `npm --prefix frontend run build` (`0` warnings, `116` modules transformed) and Node `zlib.gzipSync`:

| Metric | Post-Merge Baseline (`5f817fe`) | Current `UIUX-align` Build | Threshold & Status |
|---|---:|---:|---|
| **Entry JS (`index-*.js`, gz6)** | `98,732 B` (`98.73 kB`) / `320,267 B` raw | **`98,721 B`** (`98.72 kB` gz6 / `98,526 B` gz9 / `320,279 B` raw; Vite CLI `99.74 kB`) | **`<= 128.81 kB` PASS** |
| **Combined CSS (alpha gz6, `8` files)** | `21,292 B` (`136,843 B` raw) | **`21,140 B`** (`133,391 B` raw; gz9: `20,860 B`) | **`<= 21,292 B` revised baseline PASS** (`-152 B`) |
| **Combined CSS (entry-first gz9, `8` files)** | `21,009 B` | **`20,717 B`** (gz6: `20,975 B`) | **`<= 20,736 B` entry-first PASS** (`-19 B`) |
| **`CandidateInternshipsPage-*.css` chunk** | `6,486 B` raw / `1,468 B` gz6 (`1,462 B` gz9) | **`3,034 B`** raw / **`861 B`** gz6 (`861 B` gz9) | **`-53.2%` raw, `-41.3%` gz6 PASS** |
| **`candidateInternships.css` lines** | `511` lines | **`195` lines** | **`-316` lines (`-61.8%`)** |

#### 1.3 Live `/browser` Parity Summary & Sandbox Disclosure

Verified via live `/browser` (`webview_browser` subagent `8b6f05f3-6509-491b-be78-3117fb0b95aa` on `http://127.0.0.1:3000`, `0` console errors, `0` HTTP `>= 400` errors):

- **Exact Parity**: At `1440x900` Light & Dark, `/candidate/internships` renders `.rj-page-header {x:304, y:88.8, w:1096.8, h:66.9}` and `h1.rj-page-title {x:304, y:88.8, w:1096.8, h:36.4}`, and at `375x812` Light & Dark renders `html w=360` and `h1.rj-page-title {x:16, y:177.9, w:328, h:36.4}` — **`0.0px` exact parity** with `/candidate/jobs`, while `/candidate/skills` (`1440x900` `h2 {x:304, y:96.8}`; `375x812` `h2 {x:16, y:185.9}`) and `/candidate` remain unchanged.
- **Responsive & Empty State**: Zero horizontal overflow across `375/768/1024/1440px` Light & Dark (`align-after-1440-light.png`, `align-after-1440-dark.png`, `align-after-375-light.png`, `align-after-375-dark.png`); `lms-sv-002` (`Trần Thị Bình`) authenticated via real LMS SSO `POST /api/v1/auth/sso -> HTTP 200` and `GET /api/v1/profiles/me/internships -> HTTP 200 []` rendering `.rj-empty-state` with `[role="status"]=0` and `[role="alert"]=0` (`align-after-empty-1440-light.png`); `lms-sv-001` used enterprise fallback `POST /api/v1/auth/login -> HTTP 200` after pre-minted 60s SSO tickets expired during cold-start latency.
- **Honest `webview_browser` Sandbox Disclosure**: `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request`, and `page.route` are blocked inside `webview_browser`. Therefore, JS `PerformanceObserver` (`CLS`), `getComputedStyle()`, `prefers-reduced-motion: reduce`, and synthetic error/slow-API network interception (`page.route`) could not run inside `/browser` and are verified via Vitest (`CandidateInternships.test.tsx`, `motion.test.ts`), static CSS rules, and prior Chromium `CLS` probes.

#### 1.4 Verified Full Quality Gates & Docker Compose E2E Results (`M5-Gates`)

- **Cross-Platform Full Quality Gates**: **`./check.sh` `26/26` PASS** (`exit 0`) and **`.\check.ps1` `26/26` PASS** (`exit 0`), covering Frontend (`lint`, `typecheck`, `test`, `build`), Backend (`-Xlint:all -Werror`, Spotless, SpotBugs, JUnit), Mock (`8/8`), Docker/Hadolint/Yamllint/Actionlint/SQLFluff, Docs (`markdownlint`, `cspell`, `check-version-drift.mjs`), `compute-contrast.mjs`, `check-gate-sync.mjs`, `validate-agent-config.mjs` (`10/10`, `168` mirrors), and secret/path/TODO scans.
- **Backend Maven JUnit + Testcontainers**: **`701/701` tests PASS** (`Failures: 0, Errors: 0, Skipped: 0`).
- **Frontend Vitest**: **`36/36` files / `429/429` tests PASS** (`0` `act()` warnings; includes `18` `CandidateInternships.test.tsx`, `20` `motion.test.ts`, and `37` `RoleHomes.test.tsx` tests).
- **Docker Compose Opaque-Box E2E (`node e2e/run-all.mjs`)**: **`27/27` suites / `329/329` test cases / `2,020` assertions PASS** in **`36.51s`** against a fresh 5-container stack (`docker compose up -d --build --wait`), followed by `docker compose down -v` leaving **`0` `rikkei` containers, volumes, or networks**.

---

### Part 2: Vietnamese Section / Bản Dịch Tiếng Việt

#### 2.1 Tóm Tắt Vòng `UIUX-align` (`R1`–`R7` + Quyết Định `#1` & `#2`)

Vòng `UIUX-align` đồng bộ trang `/candidate/internships` (`TT-01`, đã merge tại `5f817fe`) về bố cục, thứ bậc thị giác, ngữ nghĩa, trạng thái, chuyển động và kỷ luật CSS với `/candidate/jobs`, `/candidate`, và `/candidate/skills`, giữ nguyên `0` dependency mới và không chạm bất kỳ tệp CSS nào ngoài `frontend/src/features/internship/**`:

- **R1–R4 (Header, Thống kê, Thẻ đợt thực tập & Trạng thái bất đồng bộ)**: Chuyển sang `.rj-page-header` / `h1.rj-page-title` / `.rj-page-subtitle` (triệt tiêu độ lệch dọc `+8.0px` so với `/candidate/jobs`), `.rj-stack-lg`, `.rj-cand-tile`, `.rj-metric-slot` (`CLS = 0`), thẻ `<article className="rj-surface-card rj-interactive-card ... ci-card">` dùng `<dl>/<dt>/<dd>`, 100% `<Icon name=... />`, định dạng `vi-VN` (`Asia/Ho_Chi_Minh`) với en dash `–`, fallback an toàn (`Chưa có điểm`), skeleton loading (`role="status"`), `.rj-empty-state` không gắn `role="status"`/`"alert"`, và `.rj-alert.rj-alert-danger` kèm nút `"Thử lại"` (`>= 44px`).
- **R5–R6 (Chuyển động & Tinh gọn CSS)**: Stagger chạy 1 lần mỗi lượt điều hướng (`hasPlayedMotionOnce`/`markMotionPlayed`), hover/press `<= 150ms`, đầy đủ `@media (prefers-reduced-motion: reduce)`; giảm `candidateInternships.css` từ **`511 -> 195` dòng** (`-61.8%`) và chunk CSS từ **`6,486 B -> 3,034 B` raw** (`-53.2%`) / **`1,468 B -> 861 B` gz6** (`-41.3%`).
- **R7 & Kiểm chứng `/browser`**: `36/36` tệp Vitest / `429/429` tests PASS (`0` cảnh báo `act()`), `120/120` contrast, `10/10` agent-config, parity `0.0px` với `/candidate/jobs` tại `1440px` và `375px` Light/Dark, không tràn ngang ở `375/768/1024/1440px`, cùng công bố trung thực giới hạn sandbox `webview_browser` (xem mục 1.3 và `docs/uiux/BROWSER_OBSERVATIONS.md`).

#### 2.2 Kết Quả Cổng Chất Lượng & Docker Compose E2E (`M5-Gates`)

- **Cổng chất lượng đa nền tảng**: **`./check.sh` `26/26` PASS** (`exit 0`) và **`.\check.ps1` `26/26` PASS** (`exit 0`).
- **Backend Maven JUnit + Testcontainers**: **`701/701` tests PASS** (`Failures: 0, Errors: 0, Skipped: 0`).
- **Docker Compose E2E (`node e2e/run-all.mjs`)**: **`27/27` suites / `329/329` ca / `2,020` assertions PASS** trong **`36.51s`** trên stack 5 container mới dựng, sau đó `docker compose down -v` dọn sạch **`0`** container/volume/network `rikkei` còn sót.

---

### 3. Out-of-Scope-But-Approved Fix Disclosure (`Team Lead Decision #2`) / Công Bố Bản Sửa Ngoài Phạm Vi Đã Được Phê Duyệt

Per Team Lead Decision `#2` at the M1 stop gate, two files outside `frontend/src/features/internship/**` were modified with explicit approval:

1. **`frontend/src/shared/utils/motion.ts` (Line `533`)**:
   - **Change**: `const elapsed = now - startedAt;` -> `const elapsed = Math.max(0, now - startedAt);` inside `useCountUp`.
   - **Why**: Prevents negative `elapsed` and negative rendered numbers on the first `requestAnimationFrame` callback when `now < startedAt`.
2. **`frontend/src/shared/utils/__tests__/motion.test.ts` (Lines `702`–`791`)**:
   - **Change**: Added a dedicated `useCountUp` unit test verifying `now = 950 < startedAt = 1000` clamps `elapsed` to `0`, advances cleanly (`88` at `1320ms`), completes at `100` (`1640ms`), leaves `rafQueue` empty, and emits `0` `console.error` calls.
3. **Proof `/candidate` (`CandidateHomePage.tsx`) Is Unchanged**:
   - Only two `useCountUp` consumers exist in the codebase (`CandidateHomePage.tsx:51` and `CandidateInternships.tsx:33`).
   - `git diff -- frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx` is **empty (`0` lines changed)**.
   - `RoleHomes.test.tsx` (`37/37` tests PASS) and live `/browser` on `/candidate` verified exact non-regressed metric values (`Kỹ năng đã xác thực: 11`, `Điểm trung bình: 79/100`, `Mức sẵn sàng mục tiêu: Chưa chọn`, `Đánh giá từ mentor: 1`, `0` negative values, `0` errors).
4. **Locked / Untouched Verification**:
   - Zero CSS files outside `frontend/src/features/internship/styles/candidateInternships.css` were modified; `backend/`, `e2e/`, `frontend/src/App.tsx`, `frontend/package.json`, `mock/package.json`, `backend/pom.xml`, and `docs/design/DESIGN_SYSTEM.md` all have `0` diff.

---

### 4. Ordered `"UIUX: "` Commit Proposals (Verified 1:1 Against `git status --porcelain=v1 -uall`)

> Note: Git remains strictly read-only (`0` staged files, `0` commits created). Excluding git-ignored artifacts under `docs/uiux/pr-screenshots/` (`ORDER.txt` and `*.png` via `.gitignore`), the **`11` modified files** in `git status --porcelain=v1 -uall` map 1:1 to the following ordered `"UIUX: "` commits:

1. `UIUX: record Phase 0 acknowledgement for /candidate/internships alignment`
   - `docs/uiux/PHASE0_ACK.md`
2. `UIUX: clamp negative rAF elapsed time in useCountUp with unit test`
   - `frontend/src/shared/utils/motion.ts`
   - `frontend/src/shared/utils/__tests__/motion.test.ts`
3. `UIUX: align /candidate/internships layout, semantics, motion, CSS diet and tests`
   - `frontend/src/features/internship/pages/CandidateInternshipsPage.tsx`
   - `frontend/src/features/internship/components/CandidateInternships.tsx`
   - `frontend/src/features/internship/components/InternshipCard.tsx`
   - `frontend/src/features/internship/styles/candidateInternships.css`
   - `frontend/src/features/internship/__tests__/CandidateInternships.test.tsx`
4. `UIUX: update UIUX documentation, browser parity logs and PR description`
   - `docs/uiux/README.md`
   - `docs/uiux/BROWSER_OBSERVATIONS.md`
   - `docs/uiux/PR_DESCRIPTION.md`
