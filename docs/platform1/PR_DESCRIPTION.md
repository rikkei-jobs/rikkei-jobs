# `[PLATFORM-1]` Vendor `frontend-taste-anti-slop`, UI/UX Audit, Whole-System & Load Capacity Optimization, and Security Hardening

> **GitHub Pull Request Title (without Markdown backticks)**: `[PLATFORM-1] Vendor frontend-taste-anti-slop, UI/UX audit, whole-system & load capacity optimization, and security hardening`

- **Task Code**: `T022DB0` (Commit prefix: `T022DB0: <type>(<scope>): <summary>`)
- **Round**: `ROUND PLATFORM-1` (Parts A, B, and C / C1b / C2 / C3b executed as one unified round)
- **Source Branch**: `chore/T022DB0-taste-skill-and-optimization` (cut from `origin/develop` `eb75201`; all changes left uncommitted and unstaged per Rule 02)
- **Supporting Documentation (`docs/platform1/`)**: `PHASE0_ACK.md`, `README.md`, `BASELINE.md`, `BROWSER_OBSERVATIONS.md`, `PR_DESCRIPTION.md` (screenshots in git-ignored `docs/platform1/pr-screenshots/`)

---

## Tóm Tắt Điều Hành (Tiếng Việt — Rule 11 Bilingual Summary)

Báo cáo Pull Request này tổng hợp đầy đủ kết quả thực thi **ROUND PLATFORM-1 (`T022DB0`)** trên nhánh `chore/T022DB0-taste-skill-and-optimization` qua 3 phần tuần tự:

- **Phần A — Tiếp nhận và nội địa hóa `taste-skill` (`frontend-taste-anti-slop`)**:
  - Đọc trực tiếp và khóa nguồn gốc kho `Leonxlnx/taste-skill` (`v2.5.1`, commit `f6b76575f949707b4e3c37cd86cb44b0b98643e8`, ngày `2026-11-07T12:33:21Z`, giấy phép MIT). Chuyển hóa thành kỹ năng thứ `29` dưới `agent-config/skills/frontend-taste-anti-slop/` chỉ gồm tài liệu hướng dẫn (`0` `Stop` hooks, `0` trình cài đặt `npx`/`install.sh`, `0` script thực thi hay gọi mạng CDN), kèm bảng giải quyết xung đột `17` mục đặt quy tắc dự án (`08`, `09`, `DESIGN_SYSTEM.md`, `--rj-*` tokens, `CONTENT.md`, Showcase Motion Tier, ngoại lệ radar `/login`) lên trên mọi quy tắc thượng nguồn.
  - Đăng ký trên `using-rikkei-skills`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` và đồng bộ `175` tệp phản chiếu (`.claude/`, `.gemini/`). Lưu ý: `.agents/PROMPT_BASE_RULES_EN.txt` là tệp chỉ đọc đối với agent nên đã báo cáo để Team Lead cập nhật trực tiếp.
- **Phần B — Đọc lại toàn bộ quy tắc/kỹ năng và kiểm định UI/UX qua `/browser`**:
  - Sau khi đọc lại toàn bộ `16` rules, `29` skills, `DESIGN_SYSTEM.md` và `docs/uiux/*`, đội ngũ đã kiểm thử `/browser` trước và sau trên `375/768/1024/1440 px` (Sáng/Tối). Đã khắc phục an toàn: bổ sung `<h1>` chuẩn trên `/candidate/skills`, `/candidate/evaluations`, `/candidate/gap-analysis` cùng thứ bậc heading tuần tự (`SkillItem` `headingLevel`, `EvaluationCard`); sửa nhãn `"Mã học viên LMS"` thành `"Mã tài khoản LMS"` trên `/mentor`, `/staff`, `/admin`; ẩn biểu mẫu `#reset-token` vô hiệu hóa khi `/reset-password` thiếu token; bổ sung skeleton + nút `"Thử lại"` trên `SkillProfilePage` và `GapAnalysisSection`; xóa từ khóa nội bộ (`"PM"`, `"Backend"`) và tên mock không dấu; bọc `:hover` trong `@media (hover: hover) and (pointer: fine)` kèm `:active` feedback.
  - Đánh giá trung thực: các quy tắc sẵn có (`08`, `09`, `DESIGN_SYSTEM.md`, `CONTENT.md`, `frontend-accessibility-audit`) đã phát hiện trước phần lớn lỗi lớn (thiếu `<h1>`, nhãn vai trò, tương phản); `frontend-taste-anti-slop` đóng góp thêm 3 điểm sắc bén mới (`>= 16px` cho input mobile `< 768px`, chuẩn hóa `@media (hover: hover)` + `:active` trên CSS cũ, và loại bỏ biểu mẫu lỗi chết không có nút phục hồi). Toàn bộ `9` hạng mục va chạm PR #13/#21/#26 hoặc thuộc quyết định sản phẩm/token được liệt kê minh bạch trong `"Proposed, not applied"`.
- **Phần C — Tối ưu hóa đo lường toàn hệ thống, nâng tải đồng thời (C1b) & gia cố bảo mật (C2, C3b)**:
  - **Hiệu năng & Năng lực tải C1b (`P1`–`P5`)**:
    - `P1` (`frontend/nginx.conf`): thay thế proxy động bằng `upstream backend_upstream` kèm `keepalive 64`, triệt tiêu **`17,512` lỗi HTTP `502 Bad Gateway`** (`59.59%` lỗi trung vị tại `50 VUs` xuống **`0` lỗi `502`/`5xx` trên toàn dải `1..200 VUs`**), nâng thông lượng `0%` lỗi từ `25 VUs` (`625.33 okRPS`) lên `200 VUs` (`1,071.64 okRPS` khi máy trạm rảnh; `684.53–723.59 okRPS` khi máy trạm chịu tải nền `[VAR > 10%]` theo C3b).
    - `P2` & `P3` (Backend SQL): giảm warm `GET /api/v1/profiles/me/internships` từ **`46 -> 8` SQL (`-82.6%`)**; giảm warm `GET /api/v1/me/gap-analysis` từ **`12 -> 7` SQL (`-41.7%`)** với `0` advisory lock / DELETE / INSERT khi cache hit và vá race Tx1->Tx2 kèm kiểm thử `CountDownLatch`/`pg_locks`.
    - `P4` (`ServerCapacityConfig` + `application-dev.yml`): giới hạn Tomcat (`maxThreads=128`, `acceptCount=100`, `maxConnections=4096`, `Shutdown.GRACEFUL`), Hibernate query timeout (`5000 ms`), bounded `mvcTaskExecutor`, log `INFO`/`WARN`.
    - `P5` (`backend/Dockerfile`): tách lớp `jarmode=tools` + AppCDS `/app/app.jsa` dưới `appuser` + `exec java` PID 1 (`574 MB`, giảm `-128 MB` so với bản sao chép lớp `702 MB`, `+13 MB` so với `561 MB` gốc), rút ngắn cold start từ `9.605 s` xuống **`5.615 s` (`-41.54%`, spread `5.97%`) – `7.144 s` (`-25.62%`, spread `6.31% <= 10%`)**, `0` dòng `[error][cds]`.
    - Các hạng mục thử nghiệm không đạt ngưỡng C3/C3b (bao gồm `P6` `frontend/vitest.config.ts` và `GapAnalysisSection` `Promise.all`, Hikari `20`) đã hoàn nguyên sạch và ghi vào mục `"investigated, no gain, left as is"`.
  - **Bảo mật (`SEC-01..SEC-05`, miễn ngưỡng hiệu năng theo C3b)**: Mỗi lỗ hổng đều có bằng chứng thất bại trước khi sửa (RED) và đạt chuẩn sau khi sửa (GREEN), gồm CSP `style-src 'self'` + security headers + chặn dotfile `403` (`SEC-01`), rate limiting xác thực per-IP/per-email với chuẩn hóa IPv4/IPv6 và `trustProxyHeaders=false` mặc định (`SEC-02`), escape HTML trong email đặt lại mật khẩu (`SEC-03`), tắt redirect + làm sạch log/URL/ngoại lệ trong `ExternalApiClient` (`SEC-04`), và phát hành/kiểm tra `iss`/`aud`/`jti` trên JWT (`SEC-05`). Các mục chạm tệp khóa/PR hoặc cần quyết định cấu hình (`SEC-06..SEC-09`, waterfall `CandidateHomePage`, tối ưu `JobRecommendationService`/`IdentityPublicServiceImpl`) nằm trong `"found, needs Owner/Team Lead decision"`.
- **Cổng kiểm tra tổng hợp & Đề xuất commit (`T022DB0:`)**: Toàn bộ `26/26` active gates trên cả `.\check.ps1` (`473.68 s`) và `./check.sh` (`455.94 s`), Maven (`728/728`), Vitest (`440/440`, `0` `act()`), Vite build (`99.75 kB` JS / `14.10 kB` CSS gzip `<=` baseline), E2E (`27/27` suites, `329` cases, `2020` assertions), dọn Docker (`0` container/volume/network còn sót), và `/browser` CSP (`0` console/CSP errors across `16` routes) đều đạt PASS. Phần cuối liệt kê `8` nhóm commit đề xuất theo đúng ánh xạ `1:1` với `git status --porcelain -uall` (`91/91` tệp, loại trừ ảnh chụp git-ignored).

---

## Part 1: Part A — Taste Skill Vendoring, Adaptation & Registration

### 1.1 Upstream Provenance & Security Exclusions

- **Upstream Repository**: `https://github.com/leonxlnx/taste-skill` (MIT License, `Copyright (c) 2026 Leonxlnx`)
- **Upstream Skill**: `skills/taste-skill/SKILL.md` (`name: design-taste-frontend`)
- **Pinned Commit SHA**: `f6b76575f949707b4e3c37cd86cb44b0b98643e8` (`2026-11-07T12:33:21Z`, version `v2.5.1`)
- **Vendored Target**: `agent-config/skills/frontend-taste-anti-slop/` (`SKILL.md`, `references/conflict-table.md`, `references/provenance-and-license.md`)
- **Naming Rationale**: Aligned with the repository's `frontend-<domain>` family (`frontend-visual-design`, `frontend-motion-design`, `frontend-iconography`, `frontend-accessibility-audit`, `frontend-feature-slice`), avoiding collision with `design-taste-frontend` and ambiguity of `taste-skill`.
- **Excluded Upstream Executables & Network Steps (`0` hooks, `0` scripts, `0` network calls)**:
  - Upstream `Stop` hook frontmatter, `npx skills add`, `install.sh`, `.claude-plugin` / `.codex-plugin` / `.agents/plugins` manifests, all upstream Node scripts (`gate.mjs`, `consistency.mjs`, `copy-lint.mjs`, `perf.mjs`, `shoot.mjs`, etc.), Google Fonts / `cdn.jsdelivr.net` / Wikimedia Commons / Overpass API fetchers, WebGL shaders, and palette/type dealers were strictly excluded to preserve Rule `03`, Rule `12`, and strict `CSP`.

### 1.2 Trigger Description, Precedence & Conflict Matrix

- **YAML Trigger Description** (`agent-config/skills/frontend-taste-anti-slop/SKILL.md:3`):
  > `"Use when auditing, crafting, or polishing frontend copy, visual hierarchy, micro-interactions, layout restraint, or anti-slop discipline across Rikkei Jobs screens."`
- **Strict Precedence Order**:
  1. Enterprise Rules (`08-frontend-engineering.md`, `09-frontend-design-bar.md`)
  2. `docs/design/DESIGN_SYSTEM.md`, `--rj-*` tokens, Role-Density specs (Airy vs Dense), Motion Budgets, Showcase Motion Tier, and Owner-approved UIUX exceptions (`/login` `CompetencyRadarVisual` auto-cycle + caption)
  3. `docs/uiux/CONTENT.md` & `frontend/src/shared/i18n/enumLabels.ts`
  4. `frontend-taste-anti-slop`
- **17-Item Conflict Resolution Summary** (`agent-config/skills/frontend-taste-anti-slop/references/conflict-table.md`): Covers palette/brand tokens (Confident Royal Cobalt & Iron Obsidian + Mentor purple badge vs upstream palette dealer), self-hosted WOFF2 trio vs Google Fonts CDN, zero runtime external asset fetches vs CDN fetches, Showcase scroll reveals vs upstream scroll-animation ban, zero WebGL shaders vs upstream WebGL allowances, `<= 150ms` micro / `linear()` springs / Dense stillness vs upstream lift timings, `SharedAppLayout` vs `100svh` marketing heroes, `/login` radar caption & 3-round auto-cycle exceptions vs upstream ban, `375/768/1024/1440` breakpoints vs `390px`, Vietnamese copy with full diacritics + `"Sắp ra mắt"` vs English marketing copy, Dense `13-14px` sizing vs `>= 16px` card body, `<Icon />` 24px monoline + `<BrandMark />` vs stock SVG packs, accessible accordions vs FAQ-open rule, shell button taxonomy, live `PasswordValidationList`, and `sync-agent-config.mjs` vs upstream Stop hooks.

### 1.3 Registration, Mirror Parity & Read-Only Notice

- Registered across `agent-config/skills/using-rikkei-skills/SKILL.md`, `agent-config/templates/CLAUDE.md`, `agent-config/templates/GEMINI.md`, `agent-config/templates/AGENTS.md` (and root `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`), `scripts/validate-agent-config.mjs`, `docs/agent-config/*`, `CONTRIBUTING.md`, `docs/conventions.md`, and `README.md`.
- Updated canonical counts from `28` skills / `168` mirrored files to **`29` skills / `175` mirrored files** (`16` rules x 2 + `29` skills x 2 + `25` reference files x 2 + `29` `.gemini/commands/*.toml` + `.claude/settings.json` + `.gemini/settings.json` + `CLAUDE.md` + `GEMINI.md` + `AGENTS.md` + `.geminiignore`).
- **Read-Only Notice**: `.agents/PROMPT_BASE_RULES_EN.txt` is strictly read-only for agents (Rule `03` / R1); the requirement to include `frontend-taste-anti-slop` in its skill list was reported to the Team Lead and is already reflected there.
- **Discovery & Sync Proof**: `node scripts/sync-agent-config.mjs --check` (`175` files synced, `0` missing/drift/orphans), `node scripts/validate-agent-config.mjs` (Checks `1..10` ALL GREEN across `223` artifacts), and `node scripts/check-gate-sync.mjs` (`29` defs = `26` active + `3` fallbacks, `23` CI, `25` Docker) all exit `0`.

---

## Part 2: Part B — Full Re-Read & Live UI/UX Audit / Safe Fixes

### 2.1 Before vs. After Findings Table (`Finding -> Clause -> Fix -> Evidence`)

Full per-route measurements across all `20` routes + `*` fallback at `375/768/1024/1440 px` Light & Dark (`33` Before + `27` After screenshots, plus `4` Final CSP screenshots) are recorded in `docs/platform1/BROWSER_OBSERVATIONS.md`:

| Finding | Clause / Rule / Skill | Fix Applied | Before Evidence | After Evidence |
|---|---|---|---|---|
| `/candidate/skills` missing `<h1>`, internal `"PM"` jargon, plain-text loading & error dead-end | Rule `08`, Rule `09`, `frontend-accessibility-audit`, `frontend-taste-anti-slop` (Steps 2 & 5) | `CandidateSkillsPage.tsx:14` passes `headingLevel={1}`; `SkillProfilePage.tsx` renders `<h2>` section headings, passes `headingLevel={headingLevel === 1 ? 3 : 4}` to `SkillItem.tsx`, and `headingLevel={2}` to embedded `<CandidateEvaluations>`; replaces `"Tính lại từ LMS, Exam, PM"` with `"Tính lại từ dữ liệu học tập"`; adds token skeleton (`role="status"`, `aria-busy="true"`) + `"Thử lại"` CTA. | `before_pass1` (`step_6.json`): `h1Count = 0`, `h2Count = 2`, `pmLines = ["Tính lại từ LMS, Exam, PM"]`. | `after_pass1` (`step_6.json`) + M2 Iter 2 Vitest (`SkillProfilePage.test.tsx`): `h1Count = 1` (`"Hồ sơ năng lực"`), sequential `H1 -> H2 -> H3` (`0` skips), `pmSubstringMatches = 0`, accordion `aria-expanded` toggles cleanly, `ConsoleErrors = 0`. |
| `/candidate/evaluations` missing `<h1>` & skipped heading level (`h2 -> h5`) | Rule `08`, `frontend-accessibility-audit`, `frontend-taste-anti-slop` (Step 5) | `CandidateEvaluationsPage.tsx:15` passes `headingLevel={1}`; `CandidateEvaluations.tsx` renders `<HeadingTag>` across all states; `EvaluationCard.tsx` + `EvaluationScoreItem.tsx` scale sequentially. | `before_pass1` (`step_22.json`): `h1Count = 0`, `h2Count = 1` (`"Đánh giá từ mentor"`). | `after_pass1` (`step_8.json`, `step_10.json`): `h1Count = 1`, collapsed `h1 -> h2`, expanded `h1 (1) -> h2 (1) -> h3 (2) -> h4 (5)`, zero skipped levels. |
| `/candidate/gap-analysis` missing `<h1>`, plain-text loading & error dead-end | Rule `08`, Rule `09`, `frontend-accessibility-audit`, `frontend-taste-anti-slop` (Step 5) | `CandidateGapAnalysisPage.tsx:14` passes `headingLevel={1}` to `GapAnalysisSection.tsx`; `GapAnalysisSection.tsx` + `gapAnalysis.css` add token skeleton (`aria-busy="true"`) and `"Thử lại"` CTA (`min-height: 44px`). | `before_pass1` (`step_14.json`): `h1Count = 0`, `h2Count = 1`. | `after_pass1` (`step_10.json`): `h1Count = 1`, `<Select>` + `Escape` verified, `.gap-table-wrap` (`309.6px`) scrolls `560px` table at `375x812`; `GapAnalysisSection.test.tsx` verifies skeleton + retry. |
| Non-candidate role homes (`/mentor`, `/staff`, `/admin`) labeled `"Mã học viên LMS"` | `CONTENT.md`, `module-domain-knowledge`, `frontend-taste-anti-slop` (Step 2) | `RoleHomeLayout.tsx:129-135` shows `'Mã học viên LMS'` only for `CANDIDATE` and `'Mã tài khoản LMS'` for `MENTOR`, `STAFF`, `ADMIN`. | `before_pass2`: `/mentor`, `/staff`, `/admin` rendered `"Mã học viên LMS"`. | `after_pass2`: `hasNewLabel = true` (`"Mã tài khoản LMS"`), `hasOldLabel = false` on `/mentor`, `/staff`, `/admin`; `/candidate` keeps `"Mã học viên LMS"`. |
| `/reset-password` missing token rendered disabled empty `#reset-token` form | `frontend-taste-anti-slop` (Step 5), `DESIGN_SYSTEM.md` | `ResetPasswordPage.tsx:64-215`: when `!token`, renders danger alert + `"Yêu cầu liên kết mới"` + `"Quay lại trang đăng nhập"` without `<form>` or `#reset-token`. | `before_pass1` (`step_39.json`): `missingInputs = 3` disabled inputs beneath alert. | `after_pass1` (`step_18.json`) & `dc283c86` (`step_14.json`): `formCount = 0`, `resetTokenInputCount = 0`, recovery CTAs visible; invalid-token `/reset-password/invalid-token-123` retains form & returns `HTTP 400` alert. |
| Unguarded touch `:hover`, missing `:active` press, and dev/mock copy leaks | Rule `09`, `CONTENT.md`, `frontend-taste-anti-slop` (Steps 2 & 4) | Wrapped `:hover` in `@media (hover: hover) and (pointer: fine)` + `:active` `scale(0.985)` (with `prefers-reduced-motion` reset) in `skillProfile.css`, `candidateEvaluations.css`, `App.css`; `SsoCallbackPage.tsx:45` -> `'Nguyễn Văn An'`; `HealthBadge.tsx` -> `'hệ thống'`. | `docs/uiux/AUDIT.md` & Part B1 static audit confirmed raw `:hover`, missing `:active`, `'Nguyen Van Sinh Vien'`, and `'Backend'`. | Verified in CSS diff, `App.test.tsx`, `npm run lint`/`typecheck`, Vitest (`440/440`, `0` `act()`), and `compute-contrast.mjs` (`120/120` PASS). |

### 2.2 Honest Evaluation of `frontend-taste-anti-slop`

- **Already caught by existing rules/docs (`08`, `09`, `DESIGN_SYSTEM.md`, `CONTENT.md`, `AUDIT.md`, `frontend-accessibility-audit`)**: Palette restraint, zero purple gradients/frosted glass, `120/120` contrast math, self-hosted WOFF2 fonts, `<= 150ms` motion budgets, `CLS = 0`, missing `<h1>` headings on candidate sub-pages, `"Mã học viên LMS"` role mislabeling, and `"PM"`/`"Backend"` jargon leaks.
- **Newly surfaced or sharpened by `frontend-taste-anti-slop`**:
  1. **`>= 16px` mobile input floor (`< 768px`)**: Surfaced `.rj-input` (`identity.css:767`) and `.rj-select` (`Select.css:21`) at `15px` (iOS Safari zoom risk; deferred to `"Proposed, not applied"` due to PR #13/#21/#26 lock).
  2. **Pointer-precision hover/press consistency**: Highlighted legacy feature CSS (`skillProfile.css`, `candidateEvaluations.css`, `App.css`, `jobRecommendations.css`) lacking `@media (hover: hover) and (pointer: fine)` and tactile `:active` feedback.
  3. **Strict error-recovery hygiene & DOM heading order**: Prompted removal of the dead `#reset-token` form when token is missing, skeleton + Retry CTAs on `SkillProfilePage`/`GapAnalysisSection`, and flagging `AuthEditorialLayout` `<h2>`-before-`<h1>` DOM order.

### 2.3 Proposed, Not Applied (PR #13/#21/#26 Collisions & Product/Token Decisions)

| Item | File & Line | Classification | Live / Static Evidence & Recommendation |
|---|---|---|---|
| Missing `<h1>` on `/candidate/jobs/:jobId` | `frontend/src/features/candidate/components/JobDetailPanel.tsx:93` (`CandidateJobDetailPage.tsx`) | PR #13 collision | `h1Count = 0`, `h2` `"Kỹ sư Lập trình Java Backend (Junior/Middle)"` (`step_12.json`). **Recommend**: add `headingLevel?: 1 \| 2` prop to `JobDetailPanel.tsx` after PR #13 merges. |
| Mobile input `font-size: 15px < 16px` | `frontend/src/features/identity/styles/identity.css:767`, `frontend/src/shared/components/Select.css:21` | PR #13/#21/#26 collision | `0.9375rem` (`15px`) on `.rj-input` and `.rj-select` under `<= 767px`. **Recommend**: set `font-size: 1rem` (`16px`) inside `@media (max-width: 767px)`. |
| `"Làm mới"` button `< 44px` height & unguarded hover | `frontend/src/features/candidate/styles/jobRecommendations.css:42-62, 147-150` | PR #13 collision | Measured `38px x 115px` (`< 44px`). **Recommend**: apply `min-height: var(--rj-density-button-height)` and `@media (hover: hover) and (pointer: fine)` after PR #13 merges. |
| Inline links `< 44px` touch height | `frontend/src/features/identity/styles/identity.css:896-901`, `JobDetailPanel.tsx`, `CandidateHomePage.tsx` | PR #13/#21/#26 collision | Measured `24px` height on auth links (`"Quên mật khẩu?"`, etc.) and `20px` on candidate home links. **Recommend**: expand touch hit-area to `44px` on `< 768px`. |
| Desktop sidebar nav item `min-height: 36px` | `frontend/src/features/identity/styles/identity.css:1284, 1329, 1548`, `SharedAppLayout.tsx` | PR #13/#21/#26 + Design Spec | Intentional Dense desktop density (`--rj-density-nav-item-min-h: 36px`; mobile drawer uses `44px`). **Recommend**: Owner decision if `1024px` tablets require `44px`. |
| `AuthEditorialLayout` DOM order (`<h2>` before `<h1>`) | `frontend/src/features/identity/components/AuthEditorialLayout.tsx:102`, `identity.css` | PR #13/#21/#26 + Test Contract | `<aside>` renders `h2.rj-story-heading` before `<main>` `h1.rj-auth-title`; locked by `AuthRedesignM4.test.tsx:133` & `identity.css`. **Recommend**: swap DOM order + CSS `order` after PRs merge. |
| `CandidateHomePage` sequential waterfall & missing `AbortSignal` | `frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx:141-187` | PR #13/#21/#26 collision | `fetchGapAnalysis` waits on `Promise.all` (`job-recommendations`); `fetchCandidateEvaluations` lacks `AbortSignal`. **Recommend**: parallelize with `Promise.allSettled` + shared `AbortController`. |
| `HomeSkeleton` `/` & `SharedAppLayout` disabled items | `frontend/src/App.tsx:274, 298`, `SharedAppLayout.tsx:603-616` | PR #13/#21/#26 collision | Locked for PR avoidance; `tabIndex={-1}` on `"Sắp ra mắt"` matches `DESIGN_SYSTEM.md` §14.2. |
| Auth inline `style={{ ... }}` & `AuthContext`/`health.ts` copy | `SsoCallbackPage.tsx`, `ResetPasswordPage.tsx`, `ForgotPasswordPage.tsx`, `ChangePasswordPage.tsx`, `EnterpriseLoginForm.tsx`, `LockoutCountdown.tsx`, `RoleHomeLayout.tsx:140`, `AuthContext.tsx:44`, `health.ts:28` | `identity.css` lock + Test Contract | Utility extraction requires `identity.css`; copy strings asserted by `App.test.tsx:104, 426`. |

---

## Part 3: Part C — Whole-System Optimization, Load Capacity (C1b) & Security Hardening (C2, C3b)

### 3.1 Consolidated Results Table

**C3 / C3b Threshold & Single-Local-Machine Disclosure**:

- Performance optimizations are kept only when meeting `>= 10%` or `>= 50 ms p95` or `>= 5 SQL queries/request`, or eliminating baseline-load HTTP errors/timeouts (`C1b`), using metrics with `<= 10%` run-to-run spread where latency/startup is cited (`[VAR > 10%]` metrics are flagged explicitly and not used alone to claim C3b speedup). Security fixes (`SEC-01..SEC-05`) are exempt from the performance threshold per **C3b** and proven by raw BEFORE-failing / AFTER-passing tests or live-stack transcripts.
- All live Docker benchmarks ran on a single Windows 11 Pro laptop (Intel Core i7-12700H, `15.71 GB` RAM, Docker Desktop WSL2, pristine `rikkeijobs` seed: `20` skills, `12` jobs, `9` users, `3` candidate profiles) where load generator and containers share CPU/RAM; numbers represent relative host-local before/after evidence, **not** production capacity claims.

| metric | before | after | delta | command | commit group |
|---|---|---|---|---|---|
| `50 VUs` HTTP `502` count & median error rate (`P1`) | `10,831` HTTP `502`s (`59.59%` med err, `87.63%` max) | **`0`** HTTP `502`s (`0.00%` med/max err across Worker + 2 Reviewer passes) | **`-10,831`** (`-100%` errors) | `node scripts/platform1-load-ramp.mjs --mode ramp --runs 5 --steps 1,5,10,25,50,100,200 --step-duration-ms 3500` | Group 6 (`frontend/nginx.conf`) |
| Total HTTP `502`s across `50..200 VUs` (`P1`) | `17,512` (`10,831` @ `50`, `5,182` @ `100`, `1,499` @ `200`) | **`0`** HTTP `502`/`5xx`/timeout across `1..200 VUs` | **`-17,512`** (`-100%` errors; `0` `Address not available` in Nginx logs) | `node scripts/platform1-load-ramp.mjs --mode all --runs 5` (`docker logs rikkei-frontend`) | Group 6 (`frontend/nginx.conf`) |
| C1b max sustainable throughput (`0%` err) & knee (`P1`, `P4`) | `25 VUs` (`625.33 okRPS`); knee **`50 VUs`** (`59.59%` err) | **`200 VUs`** (`0%` err): Worker clean host **`1,071.64 okRPS`** (`4.74%` spread, `p95=351.96 ms`, knee `null`); Reviewer under host contention **`684.53–723.59 okRPS`** (`30.81%–68.77%` spread `[VAR > 10%]`, `p95=515.40–553.43 ms`, latency knee `100–200 VUs`, `0` errors) | Errors eliminated up to `200 VUs` (`8x` VU ceiling; `okRPS` under contention flagged `[VAR > 10%]`) | `node scripts/platform1-load-ramp.mjs --mode all --runs 5` | Group 6 (`frontend/nginx.conf`) & Group 3 (`ServerCapacityConfig`) |
| C1b concurrency safety & overload recovery (`P3`, `P4`) | `[200,409x4]` company, `[200,401x4]` SSO, `[200x10]` target, `5–16 ms` recovery | `[200,409x4]` company, `[200,401x4]` SSO, `[200x10]` target (`1` row), `3.8–8.4 ms` recovery | Preserved `100%`; `ServerCapacityConfigTest` verifies bounded `AbortPolicy` rejection & graceful shutdown | `node scripts/platform1-load-ramp.mjs --mode concurrency` & `.\mvnw.cmd test -D "test=ServerCapacityConfigTest"` | Group 3 & Group 4 |
| Nginx `/assets/*` caching & `/api/` header conflicts (`P1`) | Duplicate `Cache-Control`, missing `immutable`, dropped `/assets/*` security headers, conflicting `/api/` `X-Frame-Options` | `Cache-Control: public, max-age=31536000, immutable`, `nosniff`, `DENY`, `Referrer-Policy` on `/assets/*`; single clean headers on `/api/` | Eliminated duplicate/conflicting headers & enabled immutable CDN/browser caching | `curl.exe -sI http://127.0.0.1:3000/assets/index-*.js` & `/api/v1/health` | Group 6 (`frontend/nginx.conf`) |
| Warm `GET /api/v1/profiles/me/internships` SQL count (`P2`) | `46` SQL statements | **`8`** SQL statements (Worker M4 Iter 1: `7`; Iter 2 Reviewer: `8`) | **`-38`** queries/req (**`-82.6%`**, `>= 5` threshold) | PostgreSQL `log_statement = 'all'` on warm request (immediately reset to `none`) | Group 3 (`InternshipPersistenceServiceImpl`, `CandidatePublicServiceImpl`, `SkillRecomputeService`) |
| Warm `GET /api/v1/me/gap-analysis` SQL count & race safety (`P3`) | `12` SQL (`pg_advisory_xact_lock`, `DELETE`, `2x SELECT`, `2x INSERT`) + Tx1->Tx2 race | **`7`** SQL (`0` advisory lock, `0` DELETE, `0` INSERT on cache hit) + lock-first recompute | **`-5`** queries/req (**`-41.7%`**, `>= 5` threshold) + `CountDownLatch`/`pg_locks` race test (`RED -> GREEN`) | PostgreSQL `log_statement = 'all'` & `.\mvnw.cmd test -D "test=GapAnalysisIntegrationTest"` | Group 3 (`GapAnalysisService`, `GapResultPersistenceService`) |
| `200 VU` backend threads & container RAM (`P4`) | `247` PIDs, `850.3 MiB` RAM | `178` PIDs, `786.0–808.2 MiB` RAM | `-69` threads, `-42.1 to -64.3 MiB` RAM (bounded `maxThreads=128`, `query.timeout=5000 ms`, `INFO`/`WARN` logs) | `docker stats --no-stream` during `200 VU` step of `platform1-load-ramp.mjs` | Group 3 (`ServerCapacityConfig`, `application-dev.yml`) |
| Backend Docker image size (`P5`) | `561 MB` baseline (`702 MB` naive `COPY`+`chown` intermediate) | **`574 MB`** (`COPY --chown` + AppCDS `/app/app.jsa` as `appuser`) | **`-128 MB`** vs naive copy-up (`+13 MB` AppCDS over `561 MB` baseline) | `docker images rikkei-jobs-backend` & `docker history rikkei-jobs-backend` | Group 4 (`backend/Dockerfile`) |
| Backend cold start duration (`P5`) | `9.605 s` app / `10.916 s` process (`sh -c`, no AppCDS) | Worker: **`5.615 s`** app (`5.97%` spread) / `5.903 s` proc (`6.23%`); Reviewer: **`7.144 s`** app (`6.31%` spread) / `7.471 s` proc (`6.72%`) | **`-41.54%` to `-25.62%`** app (`-45.92%` to `-31.56%` proc; spread `<= 6.72% <= 10%`; `0` `[error][cds]`) | `5x` `docker compose up -d --force-recreate --no-deps --wait backend` & `docker logs rikkei-backend` | Group 4 (`backend/Dockerfile`) |
| `SEC-01` Strict CSP, Security Headers & Dotfile Block | Missing CSP/`Referrer-Policy`/`Permissions-Policy`, `/.env.js -> 404` cached 1M, `413` missing `nosniff`, duplicate `/api/` `nosniff` | Strict CSP (`style-src 'self'`, `script-src 'self'`), `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `/.env.js -> 403` + `nosniff`, `413` + `nosniff`, `/api/v1/health` single `nosniff` | **RED -> GREEN** (`0` console/CSP errors across `16` live routes in `/browser`) | `curl.exe -sI` + live `/browser` (`dc283c86`) + `413` payload probe | Group 6 (`frontend/nginx.conf`) |
| `SEC-02` Auth Endpoint Rate Limiting & Anti-Spoof | `12/12` `200` on `/forgot-password`; `27/27` `400` on `:8080` with rotating `X-Real-IP` (`0` `429`s) | `12x 200` + `3x 429` (`Retry-After: 11`) on `/forgot-password`; `25x 400` + `2x 429` on `:8080` & `:3000` ignoring spoofed `X-Real-IP` (`trustProxyHeaders=false`) | **RED -> GREEN** (per-IP/per-email, `Clock`-based, `MAX_BUCKETS=10000`, IPv6 canonical, CIDR proxy allowlist) | `AuthRateLimiterTest` (`7`), `AuthRateLimitIntegrationTest` (`6`), live `:8080`/`:3000` burst transcripts | Group 5 (`AuthRateLimit*`, `AuthController`) |
| `SEC-03` HTML Escaping in Password Reset Email | `MailServiceTest` RED: raw `<script>` unescaped in HTML mail | `HtmlUtils.htmlEscape` on `toEmail` & `resetLink` + `plainText` fallback (`helper.setText(plainText, htmlBody)`) | **RED -> GREEN** | `.\mvnw.cmd test -D "test=MailServiceTest"` | Group 5 (`MailService`, `MailServiceTest`) |
| `SEC-04` External HTTP Redirects, Log & Error Sanitization | `ExternalApiClientRobustnessTest` RED: URL query params logged; `e.getMessage()` appended in `ExternalUnavailableException`; default redirects | `Redirect.NEVER`, `sanitizeUrlForLog` + `sanitizeControlChars`, response bodies removed from `WARN` logs, sanitized `ExternalUnavailableException` keeping `cause` | **RED -> GREEN** (`24/24` tests pass) | `.\mvnw.cmd test -D "test=ExternalApiClientRobustnessTest"` | Group 5 (`ExternalApiClient`, `ExternalApiClientRobustnessTest`) |
| `SEC-05` JWT Issuer, Audience & JTI Verification | `JwtServiceTest` RED: `iss`/`aud`/`jti` `null` and missing claims accepted | Issues `iss="rikkei-jobs"`, `aud="rikkei-jobs-api"`, UUID `jti`; enforces `.requireIssuer`/`.requireAudience`; tests reject `alg=none` & `RS256` | **RED -> GREEN** (`12/12` tests pass) | `.\mvnw.cmd test -D "test=JwtServiceTest"` | Group 5 (`JwtService`, `JwtServiceTest`) |
| Backend Maven Suite (`spotless`, `compile`, `spotbugs`, `test`) | `701/701` tests, `0` bugs, `0` warnings | **`728/728` tests** (`0` fail, `0` skip), `315` Spotless clean, `245+70` `-Xlint:all -Werror` clean, `0` SpotBugs bugs | **`+27` tests** (`0` removed) | `.\mvnw.cmd spotless:check clean test-compile spotbugs:check test` | Groups 3, 5 |
| Frontend Suite (`lint`, `typecheck`, `test`, `build`, `audit`) | `440/440` (`0` `act()`), entry JS `99.75 kB` gz, CSS `14.10 kB` gz | `lint=0`, `typecheck=0`, **`36/36` files / `440/440` tests (`0` `act()`)**, JS **`99.75 kB`** gz, CSS **`14.10 kB`** gz, `npm audit --omit=dev = 0` vuln | `0 B` bundle growth (`<=` baseline), `0` regressions | `npm --prefix frontend run lint && typecheck && test -- --run && build && audit --omit=dev` | Groups 2, 6 |
| Cross-Shell Quality Gates (`.\check.ps1` & `./check.sh`) | `26/26` PASS (`732.20 s` PS / `470.15 s` Bash) | **`26/26` PASS** (`473.68 s` PS / `455.94 s` Bash; `100%` parity; `29` defs / `26` active / `3` fallbacks / `23` CI / `25` Docker; `120/120` contrast) | **`-258.52 s`** PS (`-35.3%`), **`-14.21 s`** Bash | `.\check.ps1` and `bash -lc "./check.sh"` | All groups |
| Live Docker E2E & Clean Teardown | `27/27` suites, `329` cases, `2020` asserts (`43.22 s`) | **`27/27` suites, `329` cases, `2020` asserts, `0` fail** (`40.69 s`) with rate limiting **ENABLED**; `0` leftover `rikkei` containers/volumes/networks | Maintained `100%` pass (`-2.53 s`) | `docker compose down -v && docker compose up -d --build --wait && node e2e/run-all.mjs && docker compose down -v` | All groups |

### 3.2 Investigated, No Gain, Left As Is (Reverted / Unchanged per C3 / C3b)

1. **`P6` — `frontend/vitest.config.ts` (`css: false`, `pool: 'threads'`, `isolate: false` experiments)**:
   - Reviewer (`reviewer_m4_iter2_2`) measured `css: false` + `pool: 'threads'` at `-4.42%` Duration (`32.33 s -> 30.90 s`) / `-4.85%` wall-clock (`33.60 s -> 31.97 s`), failing the `>= 10%` threshold.
   - Follow-up test with `isolate: false` (`worker_m4_iter3`) caused cross-file mock/DOM leakage (`8/36` files, `28/440` tests failed) and still missed `>= 10%` (`29.56 s` Duration / `31.09 s` wall).
   - **Action**: Reverted `frontend/vitest.config.ts` byte-for-byte to `origin/develop` (`css: true`, default isolation). Verified `36/36` files, `440/440` tests PASS with `0` `act()` warnings.
2. **`frontend/src/features/candidate/components/GapAnalysisSection.tsx` (`Promise.all` for `fetchTargetPositions` + `fetchMyTarget`)**:
   - Measured over `5` Playwright Chromium runs: `1,163.91 ms` median (`p95 = 1,356.20 ms`, `23.44%` spread) vs sequential `1,128.55 ms` median (`49.81%` spread); individual calls took only `6.9–14.6 ms`. Failed `< 10%`, `< 50 ms p95`, and `<= 10%` spread. Reverted to M2 state.
3. **HikariCP `maximum-pool-size: 20` vs `10`**:
   - Tested `50, 100, 200 VUs` (`5` runs each): `200 VUs` dropped from `1,055.70` to `1,024.90 okRPS` (`-2.9%`) and regressed `p95` from `358.53 ms` to `390.65 ms` (`+32.12 ms`, `idleInTx = 18`). Reverted to `10` (preserving Rule `13`).
4. **`backend/Dockerfile` `jarmode=tools` extraction WITHOUT AppCDS**:
   - Cold start measured `9.008 s` median (`-6.2%` vs `9.605 s`, `17.12%` spread) — failed C3/C3b, so AppCDS (`/app/app.jsa`) was kept.
5. **`JwtAuthFilter.java:67` (`users JOIN roles`) & `V21` `jobs`/`job_recommendations` indexes**:
   - Only `1` query (`< 5` threshold), `< 0.2 ms` on `9–12` row seed tables, and `UserRepository` / `JobRepository` collide with PR #13/#21/#26. Left untouched.

### 3.3 Found, Needs Owner / Team Lead Decision

#### Performance / Concurrency Items (PR #13/#21/#26 Collisions)

1. **`frontend/src/features/identity/pages/role-homes/CandidateHomePage.tsx:141-187`**: `fetchGapAnalysis` runs sequentially after `Promise.all` waits on `fetchJobRecommendations` (`~30.5 ms` waterfall), and `fetchCandidateEvaluations` lacks `AbortSignal`. Deferred because `CandidateHomePage.tsx` collides with PR #13/#21/#26.
2. **`JobRecommendationService` / `JobQueryService` / `JobRepository`**: Warm cache hit on `GET /api/v1/me/job-recommendations?limit=6` executes `9` SQL queries (re-fetches `findOpenJobs()`, duplicate `skill_scores`, and `MAX(updated_at)` `Seq Scan` on `jobs`). Deferred because `ai/**`, `JobQueryService.java`, and `JobRepository.java` collide with PR #13/#21/#26.
3. **`IdentityPublicServiceImpl` / `UserRepository`**: `findAllById` triggers `1` extra `roles` lookup (`FetchType.EAGER` on `User.role`) during `GET /api/v1/profiles/{userId}/evaluations`. Deferred because `IdentityPublicService*.java` and `UserRepository.java` collide with PR #13/#21/#26.

#### Security & Production Configuration Items (`SEC-06`..`SEC-09` & Env Tuning)

| ID | Finding & Location | Severity | Why Deferred | Recommended Action for Owner / Team Lead |
|---|---|---|---|---|
| **`SEC-06`** | `GlobalExceptionHandler.java:91-97` (`handleConstraintViolation` echoes raw `ex.getMessage()` to client) | Medium | `GlobalExceptionHandler.java` locked for PR #13/#21/#26 collision avoidance | Return fixed Vietnamese message `"Dữ liệu yêu cầu không hợp lệ"` to clients and log details server-side only. |
| **`SEC-07`** | Missing JWT revocation (`token_version` on `users`) after password change/reset | Medium | Requires modifying `UserRepository.java` (PR-locked), `User.java`, `JwtAuthFilter.java`, `AuthService.java`, and adding Flyway `V21+` migration | Add `token_version BIGINT NOT NULL DEFAULT 0` via Flyway `V21+`, embed `tv` claim in JWT, validate in `JwtAuthFilter`, and increment on password change/reset. |
| **`SEC-08`** | `SecurityConfig.java:150` lists server-to-server header `X-Service-Key` in browser CORS `allowedHeaders` | Low | `SecurityConfig.java` locked for PR collision avoidance and asserted by `SecurityCorsIntegrationTest.java:180` | Remove `X-Service-Key` from CORS `allowedHeaders` and update `SecurityCorsIntegrationTest` once PR #13/#21/#26 merge. |
| **`SEC-09`** | `.github/workflows/ci.yml:12` lacks explicit top-level `permissions: { contents: read }` | Low | CI workflow locked from modification during round unless approved | Add minimal `permissions: { contents: read }` at workflow root (verify `check-gate-sync.mjs` afterwards). |
| **Rate-Limit Prod Tuning** | `AuthRateLimitProperties` defaults (`160/60/30/12/25` per `60s`, `trustProxyHeaders=false`) | Operational | `application-prod.yml` / `.env.example` / `docker-compose.yml` locked from unapproved edits | In production behind a reverse proxy, tighten `APP_SECURITY_RATE_LIMIT_*` thresholds and explicitly configure `APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true` + exact `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES` CIDR/IPs. |

---

## Part 4: Ordered `T022DB0:` Commit Proposals (1-to-1 Verified Against `git status --porcelain -uall`)

> **Git Read-Only Compliance**: All `91` tracked/untracked deliverable paths below remain uncommitted and unstaged on `chore/T022DB0-taste-skill-and-optimization` (`git diff --cached --name-only` is empty). Git-ignored screenshots under `docs/platform1/pr-screenshots/` (`64` PNGs) are excluded. Every single file from `git status --porcelain -uall` appears in **exactly one** commit group below (`0` missing, `0` duplicates, `0` non-existent files).

### Commit 1 — `T022DB0: feat(agent-config): vendor frontend-taste-anti-slop skill and sync 29-skill registry` (`27` files)

```bash
git add \
  AGENTS.md \
  CLAUDE.md \
  CONTRIBUTING.md \
  GEMINI.md \
  agent-config/skills/frontend-taste-anti-slop/SKILL.md \
  agent-config/skills/frontend-taste-anti-slop/references/conflict-table.md \
  agent-config/skills/frontend-taste-anti-slop/references/provenance-and-license.md \
  agent-config/skills/using-rikkei-skills/SKILL.md \
  agent-config/templates/AGENTS.md \
  agent-config/templates/CLAUDE.md \
  agent-config/templates/GEMINI.md \
  .claude/skills/frontend-taste-anti-slop/SKILL.md \
  .claude/skills/frontend-taste-anti-slop/references/conflict-table.md \
  .claude/skills/frontend-taste-anti-slop/references/provenance-and-license.md \
  .claude/skills/using-rikkei-skills/SKILL.md \
  .gemini/commands/frontend-taste-anti-slop.toml \
  .gemini/skills/frontend-taste-anti-slop/SKILL.md \
  .gemini/skills/frontend-taste-anti-slop/references/conflict-table.md \
  .gemini/skills/frontend-taste-anti-slop/references/provenance-and-license.md \
  .gemini/skills/using-rikkei-skills/SKILL.md \
  scripts/validate-agent-config.mjs \
  docs/agent-config/README.md \
  docs/agent-config/SOURCES.md \
  docs/agent-config/THIRD_PARTY_NOTICES.md \
  docs/agent-config/TOOL_COMPATIBILITY.md \
  docs/agent-config/UNTRACKED_AUDIT.md \
  docs/conventions.md
git commit -m "T022DB0: feat(agent-config): vendor frontend-taste-anti-slop skill and sync 29-skill registry"
```

### Commit 2 — `T022DB0: fix(frontend): enforce single h1 hierarchy, role copy, loading/error states, and pointer hover guards` (`26` files)

```bash
git add frontend/src/App.css \
  frontend/src/App.test.tsx \
  frontend/src/features/candidate/__tests__/CandidateEvaluations.test.tsx \
  frontend/src/features/candidate/api/candidateEvaluations.ts \
  frontend/src/features/candidate/components/CandidateEvaluations.tsx \
  frontend/src/features/candidate/components/EvaluationCard.tsx \
  frontend/src/features/candidate/components/EvaluationScoreItem.tsx \
  frontend/src/features/candidate/components/GapAnalysisSection.tsx \
  frontend/src/features/candidate/components/GapAnalysisSection.test.tsx \
  frontend/src/features/candidate/components/SkillItem.tsx \
  frontend/src/features/candidate/components/SkillProfilePage.tsx \
  frontend/src/features/candidate/components/SkillProfilePage.test.tsx \
  frontend/src/features/candidate/gapAnalysis.css \
  frontend/src/features/candidate/index.ts \
  frontend/src/features/candidate/pages/CandidateEvaluationsPage.tsx \
  frontend/src/features/candidate/skillProfile.css \
  frontend/src/features/candidate/styles/candidateEvaluations.css \
  frontend/src/features/identity/__tests__/ResetPasswordPage.test.tsx \
  frontend/src/features/identity/__tests__/RoleHomes.test.tsx \
  frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx \
  frontend/src/features/identity/pages/ResetPasswordPage.tsx \
  frontend/src/features/identity/pages/SsoCallbackPage.tsx \
  frontend/src/features/identity/pages/role-homes/CandidateGapAnalysisPage.tsx \
  frontend/src/features/identity/pages/role-homes/CandidateSkillsPage.tsx \
  frontend/src/features/identity/pages/role-homes/RoleHomeLayout.tsx \
  frontend/src/shared/components/HealthBadge.tsx
git commit -m "T022DB0: fix(frontend): enforce single h1 hierarchy, role copy, loading/error states, and pointer hover guards"
```

### Commit 3 — `T022DB0: perf(backend): eliminate redundant internship/gap writes and bound server capacity` (`13` files)

```bash
git add backend/src/main/java/com/rikkei/jobs/candidate/repository/GapResultRepository.java \
  backend/src/main/java/com/rikkei/jobs/candidate/service/GapAnalysisService.java \
  backend/src/main/java/com/rikkei/jobs/candidate/service/GapResultPersistenceService.java \
  backend/src/main/java/com/rikkei/jobs/candidate/service/SkillRecomputeService.java \
  backend/src/main/java/com/rikkei/jobs/candidate/service/impl/CandidatePublicServiceImpl.java \
  backend/src/main/java/com/rikkei/jobs/common/config/ServerCapacityConfig.java \
  backend/src/main/java/com/rikkei/jobs/internship/repository/InternshipTaskRepository.java \
  backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipPersistenceServiceImpl.java \
  backend/src/main/resources/application-dev.yml \
  backend/src/test/java/com/rikkei/jobs/candidate/CandidatePublicServiceInternshipTest.java \
  backend/src/test/java/com/rikkei/jobs/candidate/GapAnalysisIntegrationTest.java \
  backend/src/test/java/com/rikkei/jobs/config/ServerCapacityConfigTest.java \
  backend/src/test/java/com/rikkei/jobs/internship/InternshipSyncServiceTest.java
git commit -m "T022DB0: perf(backend): eliminate redundant internship/gap writes and bound server capacity"
```

### Commit 4 — `T022DB0: perf(infra): enable AppCDS layered backend image and add C1b load-ramp harness` (`2` files)

```bash
git add backend/Dockerfile \
  scripts/platform1-load-ramp.mjs
git commit -m "T022DB0: perf(infra): enable AppCDS layered backend image and add C1b load-ramp harness"
```

### Commit 5 — `T022DB0: security(backend): add auth rate limiting, JWT iss/aud/jti validation, and mail/log sanitization` (`13` files)

```bash
git add backend/src/main/java/com/rikkei/jobs/common/client/ExternalApiClient.java \
  backend/src/main/java/com/rikkei/jobs/identity/controller/AuthController.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitInterceptor.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitProperties.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitWebConfig.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimiter.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/JwtService.java \
  backend/src/main/java/com/rikkei/jobs/identity/service/MailService.java \
  backend/src/test/java/com/rikkei/jobs/client/ExternalApiClientRobustnessTest.java \
  backend/src/test/java/com/rikkei/jobs/identity/AuthRateLimitIntegrationTest.java \
  backend/src/test/java/com/rikkei/jobs/identity/JwtServiceTest.java \
  backend/src/test/java/com/rikkei/jobs/identity/security/AuthRateLimiterTest.java \
  backend/src/test/java/com/rikkei/jobs/identity/service/MailServiceTest.java
git commit -m "T022DB0: security(backend): add auth rate limiting, JWT iss/aud/jti validation, and mail/log sanitization"
```

### Commit 6 — `T022DB0: security(nginx): add upstream keepalive, immutable asset caching, CSP, and security headers` (`1` file)

```bash
git add frontend/nginx.conf
git commit -m "T022DB0: security(nginx): add upstream keepalive, immutable asset caching, CSP, and security headers"
```

### Commit 7 — `T022DB0: chore(lint): register platform1 technical terms in cspell dictionary and ignore pr-screenshots` (`2` files)

```bash
git add .gitignore \
  cspell.json
git commit -m "T022DB0: chore(lint): register platform1 technical terms in cspell dictionary and ignore pr-screenshots"
```

### Commit 8 — `T022DB0: docs(platform1): add round documentation, factual updates, and commit proposals` (`7` files)

```bash
git add README.md \
  docs/02-local-development-troubleshooting.md \
  docs/platform1/BASELINE.md \
  docs/platform1/BROWSER_OBSERVATIONS.md \
  docs/platform1/PHASE0_ACK.md \
  docs/platform1/PR_DESCRIPTION.md \
  docs/platform1/README.md
git commit -m "T022DB0: docs(platform1): add round documentation, factual updates, and commit proposals"
```

---

## Part 5: PLATFORM-1-fix (T022DB0) — Fixes, Errata, Scope Extensions, PR Collisions & Complete Commit Proposals

### 5.1 Tóm Tắt Tiếng Việt (Rule 11 Bilingual Summary)

Phần 5 ghi nhận toàn bộ kết quả sửa lỗi của vòng **`PLATFORM-1-fix` (`T022DB0`)** trên nền các thay đổi chưa commit của `PLATFORM-1`:

- **Khắc phục triệt để `F1` và `F2`**: `AuthRateLimiter` tin cậy `X-Real-IP` duy nhất khi peer trực tiếp khớp `trusted-proxies` CIDR (`172.28.0.0/16` trong Compose, bỏ qua hoàn toàn `X-Forwarded-For`), bổ sung `AuthRateLimitProdValidator` fail-fast cho profile `prod`, tách giới hạn login (`per-(IP, email)` tối đa `20` lần thất bại / `60s`, `per-IP` tối đa `60` lần thất bại / `60s`, `per-IP` tổng `160` request / `60s`), và thay fail-closed tại `MAX_BUCKETS` bằng eviction `O(1)`-amortized. Phía Nginx (`F2`) dùng `resolver 127.0.0.11 valid=5s ipv6=off` + `zone backend_upstream 64k` + `server backend:8080 resolve` + `keepalive 64`, tự phục hồi sau khi recreate `rikkei-backend` đổi IP trong `9.23 s` (`<= 30 s`, không khởi động lại Nginx) và giữ `0` lỗi suốt `1..200 VUs` với trung vị `p95 = 372.68 ms` (`+5.89% <= +10%` so với `351.96 ms`).
- **Hoàn tất `S1`–`S8`**: Cân chỉnh `Tomcat keepAliveTimeout = 65000 ms > 60000 ms` Nginx (`S1`), tách `:9000` sang template dev-only (`S2`), làm rõ kiểm tra JWT `iss`/`aud`/`alg`/`exp`/`nbf` và vai trò audit-only của `jti` (`S3`), ghim bất biến S4 bằng test và tài liệu EN+VI (`S4`), hoàn nguyên `application-dev.yml` về `DEBUG` (`S5`), đồng bộ Rules 05 & 10 lên `760/69` backend và `440/36` frontend (`S6`), loại bỏ secret tĩnh khỏi `backend/Dockerfile` (`S7`), và chứng minh cảnh báo Surefire `30 s` tồn tại sẵn trên `origin/develop` (`S8`).
- **Cổng chất lượng & Bằng chứng sống**: `/browser` (`1367f8ca` & `3caf673c`) xác nhận `0` lỗi console/CSP/`502`/`429` qua `21` tuyến route (`1440px` & `375px`, Sáng/Tối); E2E Docker chạy sạch với rate limiter bật đạt `27/27` suites / `329` cases / `2020` assertions (`0` container/volume/network còn sót); `.\check.ps1` và `./check.sh` đạt `26/26` PASS đồng nhất; và danh sách đề xuất commit `T022DB0:` cập nhật bên dưới ánh xạ chính xác `1:1` toàn bộ `112/112` tệp trong `git status --porcelain -uall`.

### 5.2 Fixes Summary (`F1`, `F2`, `S1`–`S8`)

| ID | Root Cause Fixed | Verification Summary (Raw Evidence) |
|---|---|---|
| **F1** | `trust-proxy-headers` defaulted to `false` with no Compose/prod wiring, no fail-fast prod check, no per-IP failure spray cap, and fail-closed `MAX_BUCKETS` eviction | `AuthRateLimiterTest` (`9/9`), `AuthRateLimitProdValidatorTest` (`21/21`), `AuthRateLimitIntegrationTest` (`10/10` w/ `MutableClock`), live 2-IP `:3000` (`172.28.0.1` `429` + `Retry-After` while `172.28.0.7` gets `401`/`200`), E2E `27/27` (`329/2020`) with limiter enabled |
| **F2** | Static `server backend:8080;` pinned backend IP forever on container recreate | `resolver 127.0.0.11 valid=5s ipv6=off` + `zone backend_upstream 64k` + `server backend:8080 resolve` + `keepalive 64`; live recreate IP-change `172.28.0.5 -> 172.28.0.7` recovered in `9.23 s` (`<= 30 s`) without nginx restart; 3x 5-run `1..200 VUs` ramp `0` errors, median `p95 = 372.68 ms` (`+5.89% <= +10%` vs `351.96 ms`) |
| **S1** | Tomcat `keepAliveTimeout` defaulted to `connectionTimeout` (`5000 ms < 60000 ms` Nginx), and JPA query timeout was a hardcoded constant | `app.server.tomcat.keep-alive-timeout-ms=65000`, `connection-timeout-ms=5000`, `app.server.persistence.query-timeout-ms=5000` in `application.yml` & `ServerCapacityConfig.java` (`5/5` tests); slow `1.9 MB` upload (`> 12 s`) -> `200 OK`; max Postgres SQL `6.889 ms < 5000 ms` |
| **S2** | Production `frontend/nginx.conf` allowed `http://127.0.0.1:9000` and `http://localhost:9000` in CSP | Shipped `frontend/nginx.conf` & standalone image (`:3009` `curl`) allow **0** localhost origins; `frontend/nginx.conf.template` + `docker-compose.yml` inject `:9000` dev origins via `20-envsubst-on-templates.sh` (`:3000` `curl` + `/browser` `0` CSP errors) |
| **S3** | Unclear rollout impact of required `iss`/`aud` and inaccurate `"iss/aud/jti validation"` wording | Updated `JwtService.java` Javadoc + EN/VI rollout note in `docs/04-security-secrets-policy.md` (`<= 8 h` forced re-login for pre-deploy tokens; `jti` audit/correlation only; `token_version` remains `"Proposed, not applied"`) |
| **S4** | Needed proof/docs that unchanged PM sync skip is safe against runtime mapping/scoring changes | Audited all paths (none mutate `skill_mappings`/scoring outside `EvaluationServiceImpl` + explicit `/recompute`), documented invariant in `CandidatePublicServiceImpl.java` Javadoc, `docs/hs-01-skill-profile.md` §8.7, `docs/01-architecture-overview.md`, and pinned in `CandidatePublicServiceInternshipTest` |
| **S5** | `application-dev.yml` lowered logging to `INFO`/`WARN` without `BASELINE.md` gain | Reverted `backend/src/main/resources/application-dev.yml` to `DEBUG` (`git diff origin/develop -- backend/src/main/resources/application-dev.yml` is empty) |
| **S6** | Rules 05 & 10 listed stale `701/64` and `427` baselines | Updated `agent-config/rules/{05-backend-java,10-testing-strategy}.md` to **`760` backend tests / `69` classes**, **`440` frontend tests / `36` files**, and **`27` E2E suites / `329` cases / `2020` assertions**; synced `.claude/` & `.gemini/` |
| **S7** | `backend/Dockerfile` AppCDS training run used static `-Djwt.secret=...` string | Replaced with ephemeral `JWT_SECRET="$(cat /proc/sys/kernel/random/uuid)"` inside `RUN`; verified clean in repo secret scan & `docker history --no-trunc` |
| **S8** | Full backend run printed `30 s` Surefire fork exit kill warning after `SecurityHardeningIntegrationTest` | Verified standalone `SecurityHardeningIntegrationTest` on `origin/develop` (`25/25`, `41.442 s`) and current tree (`25/25`, `26.409 s`) exit cleanly; `BASELINE.md` §4.2 confirms `30 s` Surefire fork wait already existed on `origin/develop` (`701/701`) from `SpringApplicationShutdownHook` sequentially closing cached Testcontainers `HikariPool`s |

### 5.3 Errata Correcting Earlier `PLATFORM-1` Text (Parts 1–4)

Due to append-only rules, earlier sections (`Parts 1`–`4`) remain verbatim; the following earlier statements are superseded by `PLATFORM-1-fix`:

1. **Commit 5 Message & `SEC-05` Summary**: Earlier text stated `"JWT iss/aud/jti validation"`. `JwtService` validates **`iss`, `aud`, HS256 signature (`alg`), `exp`, and `nbf`**; `jti` (UUID) is generated strictly for audit/correlation logging and is **not** validated or revoked.
2. **Rate Limiter Defaults & Caps (`SEC-02` / Operational Tuning)**: `trustProxyHeaders` defaults to `false` in Spring (`application.yml`), while `docker-compose.yml` explicitly enables `APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true` and `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES=172.28.0.0/16`, `AuthRateLimitProdValidator` enforces fail-fast `prod` validation, login caps enforce `per-IP` total `160/60s` + `per-IP` failures `60/60s` + `per-(IP, normalizedEmail)` failures `20/60s`, and `MAX_BUCKETS` (`10000`) uses bounded `O(1)`-amortized eviction instead of fail-closed denial.
3. **`frontend/nginx.conf` Static Upstream & Dev CSP Hosts (`P1` / `SEC-01`)**: Replaced static `server backend:8080;` with `resolver 127.0.0.11 valid=5s ipv6=off` + `zone backend_upstream 64k` + `server backend:8080 resolve` + `keepalive 64`; removed `:9000` localhost origins from shipped `frontend/nginx.conf` and moved dev `:9000` origins to `frontend/nginx.conf.template` + `docker-compose.yml`.
4. **`application-dev.yml` Logging (`P4`)**: Reverted from `INFO`/`WARN` back to `DEBUG` (identical to `origin/develop`, no longer in working tree diff).
5. **Verified Test Baselines**: Backend increased from `728/728` to **`760/760` across `69` classes** (`+32` new/updated tests in `PLATFORM-1-fix`); Frontend remains **`440/440` across `36` files** (`0` `act()` warnings); E2E remains **`27/27` suites / `329` cases / `2020` assertions**; Part 4's `91`-file commit proposals are superseded by Section `5.6` below (`112/112` paths).

### 5.4 Approved Scope Extensions (S2)

- **`frontend/Dockerfile` & `frontend/nginx.conf.template`** (Team Lead approved Option B): Added `ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx NGINX_ENVSUBST_FILTER=^CSP_ CSP_DEV_IMG_SRC="" CSP_DEV_CONNECT_SRC=""`, copied `nginx.conf.template` before `chown -R nginx:nginx /etc/nginx`, and left `frontend/nginx.conf` free of localhost origins so standalone production builds contain zero localhost CSP directives while Compose dev injects `:9000` via nginx's built-in `20-envsubst-on-templates.sh` without runtime `sed`.
- **`cspell.json`**: Registered `"envsubst"` so `docs/02-local-development-troubleshooting.md` passes `cspell` cleanly without inline ignores.

### 5.5 Open PR Collisions (`#13` UT-01, `#21` UT-02, `#26` AI-05)

Per Team Lead standing directive, all files required for `PLATFORM-1` and `PLATFORM-1-fix` were edited on `chore/T022DB0-taste-skill-and-optimization` without touching PR branches; Team Lead will resolve merge conflicts using this collision inventory:

| File | Overlapping PR(s) | Reason Modified in `PLATFORM-1` / `PLATFORM-1-fix` |
|---|---|---|
| `.gitignore` | `#13` | Ignores `docs/platform1/pr-screenshots/` |
| `.env.example` | `#13` | F1(a) safe defaults (`APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=false`, `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES=`) |
| `docker-compose.yml` | `#21` | F1(a) fixed `172.28.0.0/16` subnet + proxy env vars; S2 dev `:9000` `CSP_DEV_*` env vars |
| `docs/02-local-development-troubleshooting.md` | `#13` | F1/F2/S2 troubleshooting entries + EN/VI note on `@ActiveProfiles("prod")` rate-limit properties |
| `backend/src/main/resources/application.yml` | `#13`, `#21` | S1 configurable `app.server.tomcat.*` & `app.server.persistence.query-timeout-ms` properties |
| `backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java` | `#13`, `#21`, `#26` | F1(b) 2 required `APP_SECURITY_RATE_LIMIT_TRUST_*` properties in `ProdProfileHardeningTests` |
| `backend/src/test/java/com/rikkei/jobs/migration/ProfileSeparationIntegrationTest.java` | `#13`, `#21`, `#26` | F1(b) 2 required `APP_SECURITY_RATE_LIMIT_TRUST_*` properties in `@SpringBootTest` |
| `backend/src/test/java/com/rikkei/jobs/migration/CompanyMigrationIntegrationTest.java` | `#13`, `#21`, `#26` | F1(b) 2 required `APP_SECURITY_RATE_LIMIT_TRUST_*` properties in `@SpringBootTest` |
| `backend/src/test/java/com/rikkei/jobs/security/CompanyOpenApiProfileIntegrationTest.java` | `#13`, `#21`, `#26` | F1(b) 2 required `APP_SECURITY_RATE_LIMIT_TRUST_*` properties in `@SpringBootTest` |
| `backend/src/test/java/com/rikkei/jobs/security/OpenApiCoverageIntegrationTest.java` | `#13`, `#21`, `#26` | F1(b) 2 required `APP_SECURITY_RATE_LIMIT_TRUST_*` properties in `@SpringBootTest` |
| `frontend/src/App.test.tsx` | `#21` | Part B `HealthBadge` copy assertion update |
| `frontend/src/features/identity/__tests__/RoleHomes.test.tsx` | `#13`, `#26` | Part B role label `"Mã tài khoản LMS"` test coverage |
| `frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx` | `#13` | Part B role home label regression alignment |

*(Note: `ProdEnvironmentValidator.java`, `ProdEnvironmentValidatorTest.java`, `ProdEnvironmentValidatorOrderingTest.java`, and `SecurityConfig.java` were NOT modified.)*

### 5.6 Complete Updated `T022DB0:` Commit Proposals (`112/112` Paths, 1:1 Verified Against `git status --porcelain -uall`)

> Supersedes Part 4's `91`-file proposals. Every single deliverable path in `git status --porcelain -uall` (`112` paths total, excluding git-ignored `docs/platform1/pr-screenshots/`) appears in **exactly one** group below (`0` missing, `0` duplicates, `0` non-existent files; `git diff --cached --name-only` is empty).

#### Commit 1 (Updated) — `T022DB0: feat(agent-config): vendor frontend-taste-anti-slop skill, sync rules 05/10 baselines, and update 29-skill registry` (`33` files)

```bash
git add \
  AGENTS.md \
  CLAUDE.md \
  CONTRIBUTING.md \
  GEMINI.md \
  agent-config/rules/05-backend-java.md \
  agent-config/rules/10-testing-strategy.md \
  agent-config/skills/frontend-taste-anti-slop/SKILL.md \
  agent-config/skills/frontend-taste-anti-slop/references/conflict-table.md \
  agent-config/skills/frontend-taste-anti-slop/references/provenance-and-license.md \
  agent-config/skills/using-rikkei-skills/SKILL.md \
  agent-config/templates/AGENTS.md \
  agent-config/templates/CLAUDE.md \
  agent-config/templates/GEMINI.md \
  .claude/rules/05-backend-java.md \
  .claude/rules/10-testing-strategy.md \
  .claude/skills/frontend-taste-anti-slop/SKILL.md \
  .claude/skills/frontend-taste-anti-slop/references/conflict-table.md \
  .claude/skills/frontend-taste-anti-slop/references/provenance-and-license.md \
  .claude/skills/using-rikkei-skills/SKILL.md \
  .gemini/commands/frontend-taste-anti-slop.toml \
  .gemini/rules/05-backend-java.md \
  .gemini/rules/10-testing-strategy.md \
  .gemini/skills/frontend-taste-anti-slop/SKILL.md \
  .gemini/skills/frontend-taste-anti-slop/references/conflict-table.md \
  .gemini/skills/frontend-taste-anti-slop/references/provenance-and-license.md \
  .gemini/skills/using-rikkei-skills/SKILL.md \
  scripts/validate-agent-config.mjs \
  docs/agent-config/README.md \
  docs/agent-config/SOURCES.md \
  docs/agent-config/THIRD_PARTY_NOTICES.md \
  docs/agent-config/TOOL_COMPATIBILITY.md \
  docs/agent-config/UNTRACKED_AUDIT.md \
  docs/conventions.md
git commit -m "T022DB0: feat(agent-config): vendor frontend-taste-anti-slop skill, sync rules 05/10 baselines, and update 29-skill registry"
```

#### Commit 2 (Unchanged) — `T022DB0: fix(frontend): enforce single h1 hierarchy, role copy, loading/error states, and pointer hover guards` (`26` files)

```bash
git add frontend/src/App.css \
  frontend/src/App.test.tsx \
  frontend/src/features/candidate/__tests__/CandidateEvaluations.test.tsx \
  frontend/src/features/candidate/api/candidateEvaluations.ts \
  frontend/src/features/candidate/components/CandidateEvaluations.tsx \
  frontend/src/features/candidate/components/EvaluationCard.tsx \
  frontend/src/features/candidate/components/EvaluationScoreItem.tsx \
  frontend/src/features/candidate/components/GapAnalysisSection.test.tsx \
  frontend/src/features/candidate/components/GapAnalysisSection.tsx \
  frontend/src/features/candidate/components/SkillItem.tsx \
  frontend/src/features/candidate/components/SkillProfilePage.test.tsx \
  frontend/src/features/candidate/components/SkillProfilePage.tsx \
  frontend/src/features/candidate/gapAnalysis.css \
  frontend/src/features/candidate/index.ts \
  frontend/src/features/candidate/pages/CandidateEvaluationsPage.tsx \
  frontend/src/features/candidate/skillProfile.css \
  frontend/src/features/candidate/styles/candidateEvaluations.css \
  frontend/src/features/identity/__tests__/ResetPasswordPage.test.tsx \
  frontend/src/features/identity/__tests__/RoleHomes.test.tsx \
  frontend/src/features/identity/__tests__/postLoginRedirect.test.tsx \
  frontend/src/features/identity/pages/ResetPasswordPage.tsx \
  frontend/src/features/identity/pages/SsoCallbackPage.tsx \
  frontend/src/features/identity/pages/role-homes/CandidateGapAnalysisPage.tsx \
  frontend/src/features/identity/pages/role-homes/CandidateSkillsPage.tsx \
  frontend/src/features/identity/pages/role-homes/RoleHomeLayout.tsx \
  frontend/src/shared/components/HealthBadge.tsx
git commit -m "T022DB0: fix(frontend): enforce single h1 hierarchy, role copy, loading/error states, and pointer hover guards"
```

#### Commit 3 (Updated) — `T022DB0: perf(backend): eliminate redundant internship/gap writes and bound server capacity` (`13` files)

```bash
git add backend/src/main/java/com/rikkei/jobs/candidate/repository/GapResultRepository.java \
  backend/src/main/java/com/rikkei/jobs/candidate/service/GapAnalysisService.java \
  backend/src/main/java/com/rikkei/jobs/candidate/service/GapResultPersistenceService.java \
  backend/src/main/java/com/rikkei/jobs/candidate/service/SkillRecomputeService.java \
  backend/src/main/java/com/rikkei/jobs/candidate/service/impl/CandidatePublicServiceImpl.java \
  backend/src/main/java/com/rikkei/jobs/common/config/ServerCapacityConfig.java \
  backend/src/main/java/com/rikkei/jobs/internship/repository/InternshipTaskRepository.java \
  backend/src/main/java/com/rikkei/jobs/internship/service/impl/InternshipPersistenceServiceImpl.java \
  backend/src/main/resources/application.yml \
  backend/src/test/java/com/rikkei/jobs/candidate/CandidatePublicServiceInternshipTest.java \
  backend/src/test/java/com/rikkei/jobs/candidate/GapAnalysisIntegrationTest.java \
  backend/src/test/java/com/rikkei/jobs/config/ServerCapacityConfigTest.java \
  backend/src/test/java/com/rikkei/jobs/internship/InternshipSyncServiceTest.java
git commit -m "T022DB0: perf(backend): eliminate redundant internship/gap writes and bound server capacity"
```

#### Commit 4 (Updated) — `T022DB0: perf(infra): enable AppCDS layered backend image without static secret and add C1b load-ramp harness` (`2` files)

```bash
git add backend/Dockerfile \
  scripts/platform1-load-ramp.mjs
git commit -m "T022DB0: perf(infra): enable AppCDS layered backend image without static secret and add C1b load-ramp harness"
```

#### Commit 5 (Updated) — `T022DB0: security(backend): enforce trusted-proxy auth rate limiting, prod fail-fast validator, JWT iss/aud verification, and mail/log sanitization` (`22` files)

```bash
git add .env.example \
  backend/src/main/java/com/rikkei/jobs/common/client/ExternalApiClient.java \
  backend/src/main/java/com/rikkei/jobs/identity/controller/AuthController.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitInterceptor.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitProdValidator.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitProperties.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimitWebConfig.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/AuthRateLimiter.java \
  backend/src/main/java/com/rikkei/jobs/identity/security/JwtService.java \
  backend/src/main/java/com/rikkei/jobs/identity/service/MailService.java \
  backend/src/main/resources/META-INF/spring.factories \
  backend/src/test/java/com/rikkei/jobs/client/ExternalApiClientRobustnessTest.java \
  backend/src/test/java/com/rikkei/jobs/config/AuthRateLimitProdValidatorTest.java \
  backend/src/test/java/com/rikkei/jobs/identity/AuthRateLimitIntegrationTest.java \
  backend/src/test/java/com/rikkei/jobs/identity/JwtServiceTest.java \
  backend/src/test/java/com/rikkei/jobs/identity/security/AuthRateLimiterTest.java \
  backend/src/test/java/com/rikkei/jobs/identity/service/MailServiceTest.java \
  backend/src/test/java/com/rikkei/jobs/migration/CompanyMigrationIntegrationTest.java \
  backend/src/test/java/com/rikkei/jobs/migration/ProfileSeparationIntegrationTest.java \
  backend/src/test/java/com/rikkei/jobs/security/CompanyOpenApiProfileIntegrationTest.java \
  backend/src/test/java/com/rikkei/jobs/security/OpenApiCoverageIntegrationTest.java \
  backend/src/test/java/com/rikkei/jobs/security/SecurityHardeningIntegrationTest.java
git commit -m "T022DB0: security(backend): enforce trusted-proxy auth rate limiting, prod fail-fast validator, JWT iss/aud verification, and mail/log sanitization"
```

#### Commit 6 (Updated) — `T022DB0: security(nginx): add dynamic upstream resolution, keepalive pooling, dev-only CSP template, and compose wiring` (`4` files)

```bash
git add docker-compose.yml \
  frontend/Dockerfile \
  frontend/nginx.conf \
  frontend/nginx.conf.template
git commit -m "T022DB0: security(nginx): add dynamic upstream resolution, keepalive pooling, dev-only CSP template, and compose wiring"
```

#### Commit 7 (Unchanged) — `T022DB0: chore(lint): register platform1 technical terms in cspell dictionary and ignore pr-screenshots` (`2` files)

```bash
git add .gitignore \
  cspell.json
git commit -m "T022DB0: chore(lint): register platform1 technical terms in cspell dictionary and ignore pr-screenshots"
```

#### Commit 8 (Updated) — `T022DB0: docs(platform1): add round documentation, bilingual security/skill notes, and fix-round errata` (`10` files)

```bash
git add README.md \
  docs/01-architecture-overview.md \
  docs/02-local-development-troubleshooting.md \
  docs/04-security-secrets-policy.md \
  docs/hs-01-skill-profile.md \
  docs/platform1/BASELINE.md \
  docs/platform1/BROWSER_OBSERVATIONS.md \
  docs/platform1/PHASE0_ACK.md \
  docs/platform1/PR_DESCRIPTION.md \
  docs/platform1/README.md
git commit -m "T022DB0: docs(platform1): add round documentation, bilingual security/skill notes, and fix-round errata"
```
