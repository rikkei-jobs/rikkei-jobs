# `[UIUX]` UI/UX Polish, Motion Language, Login Radar Auto-Cycle & Role-Centered Content Guide / Tài Liệu Tổng Quan Vòng `UIUX-polish` & `UIUX-radar`

**Rounds / Đợt triển khai**: `UIUX-polish` + follow-up `UIUX-radar` (Commit prefix exception: `"UIUX: "`; PR title prefix: `` `"[UIUX]"` ``)  
**Branch / Nhánh**: `feature/uiux-motion-polish` (cut from `feature/T022BB1-phan-quyen-5-vai-tro`)  
**Stack / Công nghệ**: React 19.3.1, TypeScript 6.0.3, Vite 8.3.7, Vitest 5.1.0, CSS Design Tokens, WAAPI & View Transitions API (zero new dependencies)

---

## Part 1: English Section

### 1.1 Overview of Milestones (`UIUX-polish` `M0`–`M8` + `UIUX-radar`)

Round `UIUX-polish` transforms Rikkei Jobs from a functional prototype with technical showcase copy and plain transitions into a cohesive, role-centered platform with calibrated motion, accessible M1 shell controls, and verified performance budgets; follow-up round `UIUX-radar` refines the `/login` hero per Owner feedback:

- **M0 — Phase 0 Governance (`docs/uiux/PHASE0_ACK.md`)**: Recorded baseline metrics (`120.81 kB` Entry JS gz6, `17.28 kB` Entry CSS gz6, `32` Vitest files / `342` tests), all 16 enterprise rules, 20 applicable skills, and the documented `"UIUX: "` commit prefix exception prior to any edit; later appended the `UIUX-radar` Phase 0 section prior to follow-up edits (`docs/nt01/PHASE0_ACK.md` untouched).
- **M1 — Accessible Shell Controls (`SharedAppLayout.tsx`, `ThemeSwitch.tsx`)**:
  - **M1a (Icon-only sidebar toggle)**: Native `<button type="button">` (`47.2 x 44px >= 44px`), `aria-expanded`, `aria-controls`, dynamic Vietnamese `aria-label` (`"Thu gọn thanh điều hướng"` / `"Mở rộng thanh điều hướng"`), CSS `transform` flip on a single `<Icon />`, and hover/focus `role="tooltip"` (`<= 200ms`) dismissed by `Escape`, persisting UI preference in `localStorage` key `rj_sidebar_collapsed`.
  - **M1b (Icon theme switch)**: Native `<button type="button" role="switch">` (`60 x 44px >= 44px`), `aria-checked`, static `aria-label="Chế độ tối"`, `Space`/`Enter` toggle, sun/moon `<Icon />` (`aria-hidden="true"`), eased thumb slide, `>= 3.0:1` Light/Dark contrast, and preserved `data-theme` + OS fallback.
- **M2 — Multi-Source Research & Motion Language (`docs/uiux/RESEARCH.md`, `design-tokens.css`, `motion.ts`)**: Synthesized WAI-ARIA APG, WCAG 2.2, MDN/web.dev (`linear()`, View Transitions, WAAPI, `prefers-reduced-motion`), Apple HIG, Material 3, NN/g, and practitioner craft; defined 7-step durations, `cubic-bezier` fallbacks + `linear()` springs, cool navy `--rj-shadow-1..4` (`rgba(11, 26, 44, ...)`), and `100ms` reduced-motion cross-fades.
- **M3 & M3b — Measured UI/Motion Audit & Content Map (`docs/uiux/AUDIT.md`, `docs/uiux/CONTENT.md`)**: Audited all `19` route entries (`+ *` fallback) and `11` CSS files across `1440px`/`375px` Light & Dark, mapped every user-facing string per role, and defined rewrites removing `ASVS`/`RBAC`/`TTL`/`JWT`/`Modular Monolith`/`MOD-0*` showcase copy.
- **M4 & M4b — Two-Stage Pilot Checkpoints (`docs/uiux/pr-screenshots/`, `ORDER.txt`)**: Stopped at M4 (`15` screenshots) -> incorporated owner feedback adding the **Showcase Motion Tier** (`agent-config/rules/09-frontend-design-bar.md`, `docs/design/DESIGN_SYSTEM.md`) -> reworked the 3 pilot screens (`24` M4b screenshots incl. timed frame sequences) and received conditional approval under 5 binding conditions (`React.lazy` splitting, `CLS === 0`, strict teammate file hygiene, full rollout order, M7/M8 gates).
- **M5a & M5+ — Full Rollout & Skill Upgrades**: Applied role-centered copy and visual/motion upgrades across all 5 role homes (leading with real user/API data and moving account summaries to a secondary card), public/auth routes, and candidate sub-pages; resolved `375px` overflows in teammate CSS files; implemented route-level `React.lazy` splitting (`routeLazy.ts`); upgraded the 4 frontend skills while preserving `28` skills / `168` mirrored files.
- **M6 & M7 — Performance, Accessibility & Live `/browser` Verification**: Achieved `CLS === 0` (`PerformanceObserver` verified across `/login -> /candidate`, `/hr` return under `650ms` API delay, `/mentor`, `/sso-callback`, `/staff`, `/admin`, `/hr/company`), passed `120/120` contrast pairs, fixed all 4 defects discovered in M7 Pass 1/2 (`BUG 1` mentor rubric weights, `BUG 2` LMS `/change-password` guard & `/admin` duplicate buttons, `BUG 3` logout shell flash, `BUG 4` `375px` placeholder clipping), and captured `28` final M7 screenshots (`m7-01`..`m7-28`).
- **M8 & Follow-Up `UIUX-radar` (`/login` Hero Radar, Ambient Arcs & Layout Balance)**:
  - Removed the `"Tạm dừng nền"` / `"Phát nền"` button, `isUserPaused` state, and old pause-button tests per Owner mandate; bounded `.rj-story-ambient` arcs to a 1-shot drift (`4500ms`/`4800ms <= 5s`, paused when `document.hidden`, static under `prefers-reduced-motion`).
  - Added bounded auto-cycle exclusively on `/login` `CompetencyRadarVisual` (`autoCycle={false}` default elsewhere): `--rj-radar-cycle: 4000ms` per group, `<= 400ms` compositor/stroke highlight, single `setTimeout` per step (no `setInterval`), pauses on hover (radar or detail box) / focus inside radar / `document.hidden` / `prefers-reduced-motion: reduce` (`0` timers, static manual-only), holds `8s` on click/`Enter`/`Space` before resuming from next group (re-click deselects & resumes immediately), `Escape` clears selection and resumes without stealing focus, stops after 3 rounds (18 steps, ~72s) onto overview, dynamic `aria-live="off"` during auto-cycle vs `"polite"` on user action, and concise Vietnamese caption.
  - Investigated `owner-report-login-left-clipped.png` (`1662x862` left-cropped `1920px` personal capture, non-reproducible in live browsers), fixed `1280x800` vertical overflow (`6.9px -> 0px`) and `1600–1920px` divider-to-card balance with minimal CSS (`overflow-x: clip`, `min-width: 0`, `max-width` constraints, `1536px+` grid track alignment), verified via `21` new `radar-*` `/browser` screenshots, added `14` fake-timer unit tests (`CompetencyRadarVisual.test.tsx`), and synced Rule 09/10, `DESIGN_SYSTEM.md`, `frontend-motion-design` & `frontend-accessibility-audit` skills (`168` mirrors, `10/10`).

### 1.2 Motion Language & Showcase Tier Summary (`09-frontend-design-bar.md`)

Everyday micro-interactions preserve strict Rule 09 restraint (`<= 150ms` hover/press/toggle/dense admin, `<= 200ms` tooltips, `<= 300ms` drawers/dialogs), while the owner-approved **Showcase Motion Tier** governs highlight moments:

- **Allowed Showcase Surfaces**: (a) initial entrance of primary page content and auth hero (`<= 800ms` total choreography; `<= 400ms` entrance only on dense `HR`/`STAFF`/`ADMIN` workspaces), (b) data-viz and count-up reveals (Skill Radar, progress bars, counters `<= 800ms`), (c) route transitions with shared `<BrandMark />` (`<= 600ms`), (d) circular `clip-path` theme switch reveal (`<= 500ms <= 600ms`), (e) progressive scroll reveals (`animation-timeline: view()` with safe fallback), and (f) **exclusively on `/login` hero `CompetencyRadarVisual`**: bounded `4s`/group auto-cycle across 6 skill groups (`--rj-radar-cycle: 4000ms`, `<= 400ms` highlight, 3-round / 18-step auto-stop, `8s` click hold, `Escape` resume, `aria-live` dynamic).
- **Ambient Loop & Owner-Approved `/login` Hero WCAG 2.2.2 Exception**: `.rj-story-ambient` arcs play once (`--rj-duration-ambient: 4500ms`, arc 2 `4800ms`, `<= 5s` total) then rest static, pause on `document.hidden`, and stay static under `prefers-reduced-motion: reduce`. On `/login` hero only, the visible `"Tạm dừng nền"` toggle is **intentionally omitted** (Owner-approved knowing deviation from Rule 09's visible-pause clause), compensated for WCAG 2.2.2 by: (1) interaction pause/hold/resume documented in the Vietnamese radar caption, (2) 1-shot `<= 5s` ambient arcs, and (3) 3-round (18-step) auto-stop onto overview. Any non-exempt loop `> 5s` elsewhere must still provide a visible Pause/Play button.
- **Hard Guardrails**: Zero interaction blocking (`0ms` usability), plays once per navigation (no replay on tab switch/re-render), `CLS = 0`, zero bounce/jiggle/shake, and `100ms` opacity cross-fade (`0` auto-cycle timers) under `prefers-reduced-motion: reduce`.

### 1.3 Production Bundle Size Comparison (Before vs. After)

Measured directly on `frontend/dist/assets` via `npm --prefix frontend run build` (`0` Vite warnings, `111` modules transformed) using both Vite CLI gzip (`gz9`) and Node `zlib.gzipSync` (`gz6` / `gz9`):

| Bundle Metric | Start Baseline (`PHASE0_ACK.md`) | End of `UIUX-polish` | Current `UIUX-radar` Build | Threshold Compliance |
|---|---:|---:|---:|---|
| **Entry JS (Node gz6)** | `120.81 kB` (`415.90 kB` raw) | `97.80 kB` (`97,796 B`) | **`98.62 kB`** (`98,621 B` gz6 / `319,664 B` raw) | **`-22.19 kB` vs baseline** (`<= 128.81 kB` PASS) |
| **Entry JS (Vite CLI / gz9)** | `120.81 kB` | `97.61 kB` (`97,605 B`) | **`99.64 kB`** Vite CLI / **`98.42 kB`** (`98,424 B` gz9) | **`<= 128.81 kB` PASS** |
| **Total JS (`30` chunks, gz6)** | `120.81 kB` (single bundle) | `149.91 kB` (`149,905 B`) | **`150.69 kB`** (`150,693 B` gz6 / `478,259 B` raw) | Route-level `React.lazy` chunks defer non-initial pages |
| **Entry CSS (Node gz6 / Vite CLI)** | `17.28 kB` (`116.17 kB` raw) | `13.94 kB` (`13,943 B`) | **`14.10 kB`** gz6 (`14,099 B`) / **`14.04 kB`** Vite CLI | **`-3.18 kB` vs baseline** |
| **Combined Single-Stream CSS (gz6)** | `17.28 kB` | `20.44 kB` (`20,442 B`) | **`20.60 kB`** alpha (`20,597 B` gz6 / `20.32 kB` gz9; `20.42 kB` entry-first; `130,357 B` raw) | **`+3.32 kB` (`+19.2%`, `<= 20.736 kB` PASS)** |
| **Sum of `7` Independent CSS Chunks (gz6)** | `17.28 kB` | `24.25 kB` (`24,255 B`) | **`24.41 kB`** (`24,411 B` gz6 across `7` separate files) | Includes `7` per-chunk gzip headers/dictionaries |

### 1.4 Verified Test & Quality Gate Counts

- **Frontend Vitest**: **`35` test files / `410` tests PASS** (`0` failed, `0` skipped, `0` `act()` warnings; includes `14` fake-timer radar tests in `CompetencyRadarVisual.test.tsx`).
- **Backend JUnit + Testcontainers**: **`641` tests across `59` classes** (backend Java code untouched in `UIUX-polish` & `UIUX-radar`).
- **Mock Server Suite (`node mock/test-runner.js`)**: **`8/8` criteria + Cloudinary mock extension PASS**.
- **E2E Suite (`node e2e/run-all.mjs`)**: **`26` suites / `323` test cases / `1,939` assertions PASS** (fresh Docker Compose build/run + clean `docker compose down -v` teardown).
- **Contrast Audit (`node scripts/compute-contrast.mjs`)**: **`120/120` color pairs PASS** (`9` CIELAB surface + `10` UI boundary border invariants).
- **Agent Config (`sync-agent-config.mjs --check` & `validate-agent-config.mjs`)**: **`28` skills / `168` mirrored files** (`215` total artifacts, Checks `1`–`10` ALL GREEN).

### 1.5 Document Index

- [`docs/uiux/PHASE0_ACK.md`](PHASE0_ACK.md) — Phase 0 acknowledgements for both `UIUX-polish` and `UIUX-radar`, baseline measurements, and `"UIUX: "` exception record.
- [`docs/uiux/RESEARCH.md`](RESEARCH.md) — Bilingual multi-source motion, accessibility, and anti-AI research synthesis.
- [`docs/uiux/AUDIT.md`](AUDIT.md) — Measured route-by-route and stylesheet-by-stylesheet UI/motion audit.
- [`docs/uiux/CONTENT.md`](CONTENT.md) — Bilingual copy audit, role-centered narrative map, lexicon, and forbidden terms.
- [`docs/uiux/BROWSER_OBSERVATIONS.md`](BROWSER_OBSERVATIONS.md) — Live `/browser` & Chromium evidence across M4/M4b/M7 and `UIUX-radar`, BUG 1–4 & R4 layout fixes, honest `webview_browser` sandbox disclosure, and Rule 09 rubric (`11/12`).
- [`docs/uiux/PR_DESCRIPTION.md`](PR_DESCRIPTION.md) — Bilingual `[UIUX]` PR summary, bundle sizes, complete teammate file disclosure, test updates, and ordered `"UIUX: "` commit proposals matching `git status`.
- [`docs/uiux/pr-screenshots/ORDER.txt`](pr-screenshots/ORDER.txt) — Ordered manifest of all `89` PNGs on disk (`67` M4/M4b/M7 + `21` `UIUX-radar` + `1` Owner defect reference, git-ignored).
- [`docs/design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md) — Elevation shadows (Section 3.5), Showcase motion tokens & `/login` radar exception (Sections 8.1–8.4), and M1 shell controls (Section 14.5).

---

## Part 2: Vietnamese Section / Bản Dịch Tiếng Việt

### 2.1 Tổng Quan Các Mốc Triển Khai (`UIUX-polish` `M0`–`M8` + `UIUX-radar`)

Vòng `UIUX-polish` nâng cấp toàn diện giao diện Rikkei Jobs theo hướng lấy người dùng của 5 vai trò làm trung tâm, chuẩn hóa Ngôn ngữ Chuyển động, hoàn thiện hai điều khiển M1 và kiểm soát chặt ngân sách dung lượng lẫn hiệu năng; vòng nối tiếp `UIUX-radar` hoàn thiện vùng hero `/login` theo phản hồi trực tiếp của Owner:

- **M0 — Xác nhận Giai đoạn 0 (`docs/uiux/PHASE0_ACK.md`)**: Ghi nhận số đo gốc (`120.81 kB` Entry JS gz6, `17.28 kB` Entry CSS gz6, `32` tệp Vitest / `342` test), 16 quy tắc doanh nghiệp, 20 kỹ năng áp dụng và ngoại lệ tiền tố commit `"UIUX: "` trước mọi chỉnh sửa; đồng thời nối tiếp mục Phase 0 của `UIUX-radar` trước khi sửa đổi (giữ nguyên `docs/nt01/PHASE0_ACK.md`).
- **M1 — Hai điều khiển Shell đạt chuẩn trợ năng (`SharedAppLayout.tsx`, `ThemeSwitch.tsx`)**:
  - **M1a (Nút thu gọn sidebar chỉ dùng biểu tượng)**: Thẻ `<button type="button">` (`47.2 x 44px >= 44px`), `aria-expanded`, `aria-controls`, `aria-label` tiếng Việt theo trạng thái (`"Thu gọn thanh điều hướng"` / `"Mở rộng thanh điều hướng"`), lật một `<Icon />` duy nhất qua CSS `transform`, tooltip `role="tooltip"` (`<= 200ms`) đóng bằng `Escape`, lưu khóa `localStorage` `rj_sidebar_collapsed`.
  - **M1b (Công tắc chế độ sáng/tối)**: Thẻ `<button type="button" role="switch">` (`60 x 44px >= 44px`), `aria-checked`, `aria-label="Chế độ tối"` cố định, bật/tắt bằng `Space`/`Enter`, icon mặt trời/mặt trăng (`aria-hidden="true"`), nút trượt lò xo mượt, tương phản `>= 3.0:1` ở cả hai chế độ Sáng/Tối, giữ nguyên `data-theme` và fallback theo hệ điều hành.
- **M2 — Nghiên cứu Đa nguồn & Ngôn ngữ Chuyển động (`docs/uiux/RESEARCH.md`, `design-tokens.css`, `motion.ts`)**: Tổng hợp WAI-ARIA APG, WCAG 2.2, MDN/web.dev (`linear()`, View Transitions, WAAPI, `prefers-reduced-motion`), Apple HIG, Material 3, NN/g và kinh nghiệm chống mẫu AI; xây dựng thang 7 thời lượng, đường cong `cubic-bezier` kèm nâng cấp lò xo `linear()`, bóng đổ xanh navy lạnh `--rj-shadow-1..4` và cross-fade `100ms` khi giảm chuyển động.
- **M3 & M3b — Kiểm toán Giao diện & Bản đồ Nội dung (`docs/uiux/AUDIT.md`, `docs/uiux/CONTENT.md`)**: Kiểm toán `19` tuyến (`+ *`) và `11` tệp CSS ở `1440px`/`375px` Sáng & Tối, phân loại toàn bộ văn bản hiển thị theo 5 vai trò và loại bỏ phô trương kỹ thuật (`ASVS`, `RBAC`, `TTL`, `JWT`, `Modular Monolith`, `MOD-0*`).
- **M4 & M4b — Hai vòng Thí điểm Bắt buộc (`docs/uiux/pr-screenshots/`, `ORDER.txt`)**: Dừng ở M4 (`15` ảnh) -> tiếp thu yêu cầu của Product Owner bổ sung **Showcase Motion Tier** vào Rule 09 & `DESIGN_SYSTEM.md` -> làm lại 3 màn hình thí điểm (`24` ảnh M4b gồm các chuỗi khung hình động) và được phê duyệt có điều kiện với 5 ràng buộc bắt buộc.
- **M5a & M5+ — Mở rộng Toàn bộ Ứng dụng & Nâng cấp Skill**: Áp dụng nội dung hướng vai trò, dẫn dắt bằng dữ liệu thật trên cả 5 trang chủ vai trò (chuyển khối tài khoản xuống vùng phụ), làm mới trang công khai/xác thực và trang con ứng viên, sửa tràn `375px` trong CSS đồng đội, tách chunk tuyến với `React.lazy` (`routeLazy.ts`), và cập nhật 4 skill frontend mà vẫn giữ nguyên `28` skill / `168` bản sao.
- **M6 & M7 — Hiệu năng, Trợ năng & Kiểm chứng Trình duyệt Thực tế**: Đạt `CLS === 0` (kiểm tra bằng `PerformanceObserver` qua `/login -> /candidate`, quay lại `/hr` giữ API `650ms`, `/mentor`, `/sso-callback`, `/staff`, `/admin`, `/hr/company`), đạt `120/120` cặp tương phản, sửa dứt điểm 4 lỗi phát hiện ở M7 Pass 1/2 (`BUG 1` trọng số rubric `/mentor`, `BUG 2` chặn `/change-password` cho LMS SSO & nút trùng ở `/admin`, `BUG 3` nháy shell khi đăng xuất, `BUG 4` cắt placeholder `375px`), và lưu `28` ảnh M7 cuối (`m7-01`..`m7-28`).
- **M8 & Vòng nối tiếp `UIUX-radar` (Radar `/login`, Vòng nền 1-Shot & Cân đối Bố cục)**:
  - Gỡ bỏ nút `"Tạm dừng nền"` / `"Phát nền"`, state `isUserPaused` và test cũ; giới hạn `.rj-story-ambient` chạy 1 lần duy nhất (`4500ms`/`4800ms <= 5s`) rồi đứng yên, tự dừng khi `document.hidden`, tĩnh khi `prefers-reduced-motion: reduce`.
  - Triển khai tự chuyển có giới hạn duy nhất trên radar `/login` (`autoCycle={false}` mặc định ở mọi nơi khác): `--rj-radar-cycle: 4000ms` mỗi nhóm, highlight `<= 400ms` chỉ dùng compositor/stroke-dashoffset, 1 `setTimeout` mỗi bước (không `setInterval`), tạm dừng khi hover radar/hộp chi tiết, focus bên trong, `document.hidden`, hoặc `prefers-reduced-motion: reduce` (`0` timer, tĩnh hoàn toàn); click/`Enter`/`Space` giữ `8s` trước khi chạy tiếp từ nhóm kế (click lại để bỏ chọn và chạy tiếp ngay); `Escape` chạy tiếp không cướp focus; tự dừng sau 3 vòng (18 bước ~72s) về trạng thái tổng quan; `aria-live="off"` khi tự chạy và `"polite"` khi người dùng thao tác; chú thích tiếng Việt súc tích.
  - Điều tra `owner-report-login-left-clipped.png` (`1662x862` là ảnh crop/dịch trái của bản `1920px` trên máy cá nhân Owner, không tái hiện trên trình duyệt sống), sửa tràn dọc `1280x800` (`6.9px -> 0px`) và cân đối khoảng cách `1600–1920px` quanh đường chia giữa, kiểm chứng qua `21` ảnh `radar-*` từ `/browser`, bổ sung `14` unit test fake-timer (`CompetencyRadarVisual.test.tsx`), và đồng bộ Rule 09/10, `DESIGN_SYSTEM.md`, các skill liên quan (`168` bản sao, `10/10`).

### 2.2 Tóm Tắt Ngôn Ngữ Chuyển Động & Showcase Tier (`09-frontend-design-bar.md`)

Tương tác hằng ngày giữ nguyên kỷ luật chặt chẽ của Rule 09 (`<= 150ms` cho hover/nhấn/công tắc/bảng quản trị, `<= 200ms` cho tooltip, `<= 300ms` cho drawer/dialog), trong khi **Showcase Motion Tier** áp dụng có chọn lọc cho các khoảnh khắc điểm nhấn:

- **Vùng áp dụng được phép**: (a) vào trang lần đầu cho nội dung chính và vùng hero đăng nhập (`<= 800ms` tổng choreography; khu vực dữ liệu dày `HR`/`STAFF`/`ADMIN` chỉ giữ hiệu ứng vào trang `<= 400ms`), (b) biểu đồ radar và đếm số/tiến độ (`<= 800ms`), (c) chuyển tuyến có phần tử chung `<BrandMark />` (`<= 600ms`), (d) vòng tròn lan tỏa khi đổi theme (`<= 500ms <= 600ms`), (e) hiệu ứng lộ diện theo cuộn (`animation-timeline: view()` kèm fallback), và (f) **duy nhất trên radar `CompetencyRadarVisual` tại `/login`**: tự chuyển qua 6 nhóm kỹ năng mỗi `4s` (`--rj-radar-cycle: 4000ms`, highlight `<= 400ms`, tự dừng sau 3 vòng / 18 bước, giữ `8s` khi chọn, `Escape` tiếp tục, `aria-live` động).
- **Vòng nền & Ngoại lệ WCAG 2.2.2 trên hero `/login` (Owner phê duyệt)**: `.rj-story-ambient` chạy 1 lần (`--rj-duration-ambient: 4500ms`, arc 2 `4800ms`, tổng `<= 5s`) rồi đứng yên, tự dừng khi `document.hidden` và tĩnh dưới `prefers-reduced-motion: reduce`. Riêng hero `/login` **chủ động bỏ nút `"Tạm dừng nền"`** (sai lệch có chủ đích được Owner phê duyệt khỏi điều khoản nút tạm dừng hiển thị của Rule 09), bù đắp bằng 3 cơ chế: (1) tạm dừng/giữ/tiếp tục qua tương tác ghi rõ trong chú thích dưới radar, (2) vòng nền 1-shot `<= 5s`, và (3) radar tự dừng sau 3 vòng. Các vòng lặp > 5s không thuộc ngoại lệ ở màn hình khác vẫn phải có nút Pause/Play.
- **Ràng buộc cứng**: Không chặn thao tác (`0ms`), chỉ chạy một lần mỗi lần điều hướng (không phát lại khi đổi tab hay re-render), `CLS = 0`, cấm bounce/jiggle/shake, và chuyển mờ `100ms` (`0` timer tự chuyển) dưới `prefers-reduced-motion: reduce`.

### 2.3 Bảng So Sánh Dung Lượng Bundle (Trước và Sau)

Đo trực tiếp trên `frontend/dist/assets` bằng `npm --prefix frontend run build` (`0` cảnh báo Vite, `111` module) với cả báo cáo gzip Vite CLI (`gz9`) và Node `zlib.gzipSync` (`gz6` / `gz9`):

| Chỉ số Bundle | Mốc Gốc Đầu Vòng (`PHASE0_ACK.md`) | Cuối `UIUX-polish` | Build `UIUX-radar` Hiện Tại | Tuân thủ Ngưỡng |
|---|---:|---:|---:|---|
| **Entry JS (Node gz6)** | `120.81 kB` (`415.90 kB` raw) | `97.80 kB` (`97,796 B`) | **`98.62 kB`** (`98,621 B` gz6 / `319,664 B` raw) | **`-22.19 kB` so với gốc** (`<= 128.81 kB` ĐẠT) |
| **Entry JS (Vite CLI / gz9)** | `120.81 kB` | `97.61 kB` (`97,605 B`) | **`99.64 kB`** Vite CLI / **`98.42 kB`** (`98,424 B` gz9) | **`<= 128.81 kB` ĐẠT** |
| **Tổng JS (`30` chunk, gz6)** | `120.81 kB` (1 gói đơn) | `149.91 kB` (`149,905 B`) | **`150.69 kB`** (`150,693 B` gz6 / `478,259 B` raw) | Tách route `React.lazy` trì hoãn tải các trang chưa mở |
| **Entry CSS (Node gz6 / Vite CLI)** | `17.28 kB` (`116.17 kB` raw) | `13.94 kB` (`13,943 B`) | **`14.10 kB`** gz6 (`14,099 B`) / **`14.04 kB`** Vite CLI | **`-3.18 kB` so với gốc** |
| **CSS Gộp Đơn Luồng (gz6)** | `17.28 kB` | `20.44 kB` (`20,442 B`) | **`20.60 kB`** alpha (`20,597 B` gz6 / `20.32 kB` gz9; `20.42 kB` entry-first; `130,357 B` raw) | **`+3.32 kB` (`+19.2%`, `<= 20.736 kB` ĐẠT)** |
| **Tổng `7` Chunk CSS Nén Rời (gz6)** | `17.28 kB` | `24.25 kB` (`24,255 B`) | **`24.41 kB`** (`24,411 B` gz6 trên `7` tệp `.css` tách riêng) | Tổng số học bao gồm `7` phần header & từ điển gzip độc lập |

### 2.4 Số Liệu Kiểm Thử & Cổng Chất Lượng Đã Xác Minh

- **Frontend Vitest**: **`35` tệp / `410` tests PASS** (`0` lỗi, `0` bỏ qua, `0` cảnh báo `act()`, gồm `14` test fake-timer mới của `CompetencyRadarVisual.test.tsx`).
- **Backend JUnit + Testcontainers**: **`641` tests trên `59` lớp** (mã Java backend giữ nguyên không đổi).
- **Mock Server Suite (`node mock/test-runner.js`)**: **`8/8` tiêu chí + Cloudinary mock PASS**.
- **Bộ E2E (`node e2e/run-all.mjs`)**: **`26` suites / `323` ca kiểm thử / `1,939` assertions PASS** (chạy mới trên Docker Compose và dọn sạch bằng `docker compose down -v`).
- **Tương phản (`node scripts/compute-contrast.mjs`)**: **`120/120` cặp màu PASS** (`9` CIELAB surface + `10` UI boundary border invariants).
- **Cấu hình Agent (`sync-agent-config.mjs --check` & `validate-agent-config.mjs`)**: **`28` skills / `168` tệp sao chép** (`215` artifact, Checks `1`–`10` ALL GREEN).

### 2.5 Chỉ Mục Tài Liệu Liên Quan

- [`docs/uiux/PHASE0_ACK.md`](PHASE0_ACK.md) — Xác nhận Giai đoạn 0 cho cả `UIUX-polish` và `UIUX-radar`, số đo gốc và ngoại lệ tiền tố `"UIUX: "`.
- [`docs/uiux/RESEARCH.md`](RESEARCH.md) — Tổng hợp nghiên cứu đa nguồn về chuyển động, trợ năng và tiêu chuẩn chống mẫu AI.
- [`docs/uiux/AUDIT.md`](AUDIT.md) — Báo cáo kiểm toán chi tiết từng tuyến đường và từng tệp CSS.
- [`docs/uiux/CONTENT.md`](CONTENT.md) — Kiểm toán văn bản hiển thị, bản đồ nội dung 5 vai trò, từ vựng chuẩn và danh sách từ cấm.
- [`docs/uiux/BROWSER_OBSERVATIONS.md`](BROWSER_OBSERVATIONS.md) — Bằng chứng `/browser` & Chromium (M4/M4b/M7 & `UIUX-radar`), sửa lỗi BUG 1–4 & R4, giới hạn sandbox `webview_browser` và chấm điểm Rule 09 (`11/12`).
- [`docs/uiux/PR_DESCRIPTION.md`](PR_DESCRIPTION.md) — Mô tả PR `[UIUX]` song ngữ, bảng dung lượng bundle, công bố đầy đủ tệp đồng đội đã chạm, danh sách test cập nhật và đề xuất commit `"UIUX: "` khớp `git status`.
- [`docs/uiux/pr-screenshots/ORDER.txt`](pr-screenshots/ORDER.txt) — Danh mục `89` tệp PNG trên đĩa (`67` M4/M4b/M7 + `21` `UIUX-radar` + `1` ảnh lỗi Owner, nằm trong `.gitignore`).
- [`docs/design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md) — Bóng đổ navy lạnh (Mục 3.5), Ngôn ngữ Chuyển động Showcase & ngoại lệ radar `/login` (Mục 8.1–8.4) và hai điều khiển M1 (Mục 14.5).
