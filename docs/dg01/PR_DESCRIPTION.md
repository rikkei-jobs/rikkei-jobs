
# DG-01: Phiếu đánh giá của mentor theo khung kỹ năng (Mentor Evaluation on Candidate Skill Framework) #3

## Pull Request Information / Thông Tin Pull Request

- **Task ID**: T023B91
- **Feature Code**: DG-01
- **Branch / Nhánh**: `feature/t023b91-phieu-danh-gia`
- **Target Branch / Nhánh Đích**: `develop`
- **Related PRs / Các PR Liên Quan**: PR #3 (Current), PR #6, PR #13, PR #14, DN-01

---

## 1. Executive Summary / Tóm Tắt Tổng Quan

### 1.1. English

This Pull Request delivers the complete, production-ready implementation of feature DG-01 ("Mentor Evaluation on Candidate Skill Framework") for PR #3, including Round DG-01-fix and Round DG-01-e2e. It strictly repairs and narrows the scope from prior erroneous commits: restores develop migrations V1-V6 byte-identical, completely purges out-of-scope files and unauthorized libraries (Lombok, MapStruct), implements clean Modular Monolith boundaries between `assessment`, `candidate`, and `identity` modules, creates production migration V7 and dev seed V8 (with a second idempotent dev mentor `mentor2@rikkeijobs.test` at user ID `9`), enforces strict RBAC and IDOR protection, guarantees idempotent concurrent submit via Optimistic Locking (`@Version`), avoids N+1 query patterns, embeds the accessible, responsive "Đánh giá từ mentor" block in the candidate profile frontend using 100% design tokens and zero emojis, and provides comprehensive opaque-box HTTP E2E coverage across `e2e/`.

### 1.2. Tiếng Việt

Pull Request này triển khai hoàn chỉnh và chuẩn hóa ở cấp độ production tính năng DG-01 ("Phiếu đánh giá của mentor theo khung kỹ năng") cho PR #3, bao gồm cả vòng DG-01-fix và vòng DG-01-e2e. PR thực hiện sửa chữa và thu hẹp phạm vi nghiêm ngặt từ các commit lỗi trước đó: khôi phục nguyên vẹn byte-identical các migration V1-V6 từ develop, loại bỏ hoàn toàn các file ngoài phạm vi và thư viện không được phép (Lombok, MapStruct), thiết lập ranh giới Modular Monolith chuẩn giữa các module `assessment`, `candidate`, và `identity`, tạo migration production V7 và dev seed V8 (bổ sung tài khoản mentor thứ hai idempotent `mentor2@rikkeijobs.test` với ID `9`), thiết lập bảo mật RBAC và chống IDOR chặt chẽ, bảo vệ submit đồng thời nguyên tử qua Optimistic Locking (`@Version`), triệt tiêu hoàn toàn truy vấn N+1, nhúng khối "Đánh giá từ mentor" chuẩn tiếp cận WCAG 2.2 AA vào hồ sơ ứng viên sử dụng 100% design token và tuyệt đối không có emoji, đồng thời bổ sung đầy đủ bộ kiểm thử E2E hộp đen qua HTTP trong thư mục `e2e/`.

---

## 2. Key Changes & Scope Restoration / Tóm Tắt Thay Đổi & Khôi Phục Phạm Vi

| Category / Phân Loại | Status / Trạng Thái | Technical Description (English) | Mô Tả Kỹ Thuật (Tiếng Việt) |
|---|---|---|---|
| **Scope Narrowing (G1)** | Restored / Khôi phục | Fully restored develop migrations V1-V6 byte-identical; deleted unauthorized `V3__auth_schema.sql` and redundant migration copies; restored `backend/pom.xml`, `SecurityConfig.java`, `GlobalExceptionHandler.java`; purged all controllers, HTML pages, and DTOs outside DG-01 scope. | Khôi phục nguyên vẹn V1-V6 develop byte-identical; xóa bỏ `V3__auth_schema.sql` và các file copy trùng lặp; khôi phục `backend/pom.xml`, `SecurityConfig.java`, `GlobalExceptionHandler.java`; xóa toàn bộ các controller, trang HTML và DTO ngoài phạm vi DG-01. |
| **Pure Java / Zero Lombok** | Compliant / Tuân thủ | All entities implemented as standard POJOs without Project Lombok; all request/response DTOs implemented as immutable Java `record`; handwritten manual mappers (zero MapStruct). | Toàn bộ entity là POJO thuần không dùng Lombok; toàn bộ DTO là immutable Java `record`; mapper viết tay thủ công không dùng MapStruct. |
| **Database Migrations (G2 & E1)** | Implemented / Hoàn thành | `V7__evaluation.sql` (4 relational tables, snake_case, timestamptz, index, scalar IDs); `V8__dev_evaluation_seed.sql` (seeds 2 templates: "Java Backend – Thực tập" and "Phỏng vấn kỹ thuật chung", plus idempotent second dev mentor `mentor2@rikkeijobs.test` at `id = 9` with `users_id_seq` sync; `V2` and `V6` kept byte-identical to `develop`). | `V7__evaluation.sql` (4 bảng, snake_case, timestamptz, index, scalar IDs); `V8__dev_evaluation_seed.sql` (seed 2 mẫu phiếu và tài khoản mentor thứ hai idempotent `mentor2@rikkeijobs.test` với `id = 9`, đồng bộ `users_id_seq`; `V2` và `V6` giữ nguyên từng byte so với `develop`). |
| **Security & IDOR (G3)** | Hardened / Siết chặt | Deny-by-default; `MENTOR` role owns create, update, and submit endpoints; `CANDIDATE` views own evaluations; `HR` views evaluations only if profile is public (`is_public = true`). Unauthorized queries return 404 (IDOR mask) or 403. | Deny-by-default; `MENTOR` sở hữu tạo/sửa/submit phiếu; `CANDIDATE` chỉ xem phiếu chính chủ; `HR` chỉ xem khi profile `is_public = true`. Truy cập trái phép trả về 404 (IDOR mask) hoặc 403. |
| **Atomic Submit & Clock (G4)** | Implemented / Hoàn thành | Submit handled in a single transaction: validates all criteria scores present (missing returns 400), atomically creates `skill_evidences` (`source = MENTOR`, `verified = true`), invokes `recomputeSkills`, updates status to `SUBMITTED`, injects `java.time.Clock`. | Xử lý submit trong 1 transaction duy nhất: kiểm tra đủ điểm các tiêu chí (thiếu trả về 400), sinh `skill_evidences` (`source = MENTOR`, `verified = true`), gọi `recomputeSkills`, chuyển trạng thái `SUBMITTED`, inject bean `java.time.Clock`. |
| **Concurrency & Anti N+1 (G5)** | Protected / Bảo vệ | Optimistic locking via `@Version` blocks concurrent double submits (returns 409 CONFLICT); `JOIN FETCH` queries and batch mentor ID queries completely eliminate N+1 query patterns. | Khóa lạc quan qua `@Version` ngăn chặn double submit đồng thời (trả về 409 CONFLICT); `JOIN FETCH` và truy vấn batch mentor IDs triệt tiêu hoàn toàn lỗi N+1 query. |
| **Frontend Component (G6)** | Implemented / Hoàn thành | `<CandidateEvaluations />` component embedded in `<SkillProfilePage />`; 100% design tokens `--rj-*`; zero emoji; 24px/16px vector icons; WCAG 2.2 AA; touch target $\ge 44\text{px}$; motion budget with `prefers-reduced-motion`; 4 breakpoints (375, 768, 1024, 1440px). | Khối `<CandidateEvaluations />` nhúng trực tiếp trong `<SkillProfilePage />`; 100% design tokens `--rj-*`; zero emoji; icon vector 24px/16px; WCAG 2.2 AA; vùng chạm $\ge 44\text{px}$; motion budget với `prefers-reduced-motion`; 4 responsive breakpoints (375, 768, 1024, 1440px). |
| **Frontend Test Suite** | Green (115/115 tests) | Added `CandidateEvaluations.test.tsx` (7 Vitest tests); fixed import path in `SkillProfilePage.tsx` restoring 3 previously failing test suites; all 19 test files pass 100%; `npm run typecheck`, `npm run lint`, and `npm run build` pass. | Tạo mới `CandidateEvaluations.test.tsx` (7 tests Vitest); sửa lỗi import trong `SkillProfilePage.tsx` khôi phục 3 test suites bị fail; toàn bộ 19 test files pass 100%; `npm run typecheck`, `npm run lint`, `npm run build` pass. |
| **Opaque-Box E2E Suite (E2)** | Green (20/20 suites) | Added `test_evaluation_features.test.mjs`, `test_evaluation_boundaries.test.mjs`, and `test_evaluation_scenarios.test.mjs` registered in `e2e/run-all.mjs` and documented in `e2e/README.md` (total `20` suites / `231` cases / `1139` assertions, up from `17` / `221` / `998`), covering templates, happy path, acceptance errors, visibility, simultaneous submit concurrency, and `/api-docs`. | Bổ sung 3 suite kiểm thử E2E (`test_evaluation_features`, `test_evaluation_boundaries`, `test_evaluation_scenarios`) đăng ký trong `e2e/run-all.mjs` và cập nhật `e2e/README.md` (tổng `20` suites / `231` cases / `1139` assertions), bao phủ đầy đủ 6 nhóm yêu cầu nghiệp vụ và bảo mật. |
| **Documentation (G7)** | Completed / Hoàn tất | Authored comprehensive bilingual `docs/dg01/README.md`, `docs/dg01/PR_DESCRIPTION.md`, and `docs/dg01/PHASE0_ACK.md` including migration conflict matrix, seed account `mentor2`, E2E suite summary, and Team Lead CI note. | Soạn thảo `docs/dg01/README.md`, `docs/dg01/PR_DESCRIPTION.md` và `docs/dg01/PHASE0_ACK.md` song ngữ Anh - Việt đầy đủ ma trận xung đột di trú, tài khoản `mentor2`, số liệu E2E và lưu ý CI cho Team Lead. |

---

## 3. Migration Conflict Audit Matrix / Báo Cáo Xung Đột Di Trú Chi Tiết

### 3.1. Cross-Branch Migration & Schema Conflict Table / Bảng Đối Chiếu Hiện Trạng Di Trú & Lược Đồ Bảng

| Branch / PR | Prod Migration (`db/migration/`) | Dev Seed Migration (`db/migration-dev/`) | Created Table Names / Tên Bảng Dữ Liệu Tạo Mới | Conflict Status & Risks (English / Tiếng Việt) |
|---|---|---|---|---|
| **develop** (Baseline) | `V1__init_schema.sql`<br>`V3__skill_profile.sql`<br>`V5__auth_identity_evolution.sql` | `V2__dev_seed.sql`<br>`V4__dev_skill_profile_seed.sql`<br>`V6__dev_seed_nt01.sql` | `roles`, `users`, `skills`, `candidate_profiles`, `skill_evidences`, `used_sso_tickets`, etc. | **BASELINE CHUẨN / OFFICIAL BASELINE**. Unaltered. Ends at V6. Không thay đổi. Dừng lại ở V6. |
| **PR #3** (DG-01 - T023B91)<br>*(This PR)* | **`V7__evaluation.sql`** | **`V8__dev_evaluation_seed.sql`** | `evaluation_templates`, `evaluation_criteria`, `evaluations`, `evaluation_scores` | **PR #3 TARGET (V7 & V8)**. Clean schema, isolated module tables, scalar external IDs, zero foreign keys cross-module. Chuẩn hóa V7 & V8 cho DG-01, không FK sang module khác. |
| **PR #6** (`feat/AI-recommendation`) | `V7__jobs_and_recommendations.sql` | `V8__dev_job_seed.sql` | `companies`, `jobs`, `job_skills`, `candidate_skills`, `job_recommendations` | **DIRECT VERSION CONFLICT WITH PR #3**. Both target V7 and V8 against develop. Xung đột trực tiếp số phiên bản V7 & V8 với PR #3. |
| **PR #14** (`feature/T023D16-phan-tich-khoang-thieu-hut`) | `V7__jobs_and_recommendations.sql`<br>`V9__target_positions_gap_analysis.sql` | `V8__dev_job_seed.sql`<br>`V10__dev_gap_analysis_seed.sql` | `target_positions`, `position_skills`, `candidate_targets`, `gap_results` | **DEPENDENT CONFLICT**. Inherits PR #6. `V10` dev seed is already properly in `db/migration-dev/`. Needs sequential renumbering after PR #6. Xung đột phụ thuộc kế thừa PR #6; file dev seed V10 vốn đã nằm đúng trong `db/migration-dev/`. |
| **PR #13** (`feature/T023552-candidate-application`) | `V3__create_recruitment_applications.sql`<br>`V4__create_used_sso_tickets.sql`<br>`V5__prevent_repeated_job_applications.sql`<br>`V6__create_company_job_descriptions.sql`<br>`V7__create_candidate_cv_files.sql`<br>`V8__store_application_cv_snapshots.sql` | `V3.1__seed_recruitment_dev_data.sql`<br>`V6.1__seed_company_jobs.sql`<br>`V8.1__seed_application_cv_snapshots.sql` | `applications`, `application_status_history`, `used_sso_tickets`, `companies`, `job_descriptions`, `candidate_cvs`, `application_cv_snapshots` | **SEVERE ARCHITECTURAL & SCHEMA CONFLICT**. Forked from legacy commit lacking develop V3-V6; uses invalid decimal versions (V3.1, V6.1, V8.1); duplicates `used_sso_tickets` (already in develop V5); table `companies` conflicts with PR #6; table `job_descriptions` conflicts conceptually with PR #6 `jobs`. Xung đột toàn diện nghiêm trọng về cả số version lẫn schema bảng. |
| **NT-01** (Đăng nhập - T022863) | Already merged in develop (V5) | Already merged in develop (V6) | `used_sso_tickets` | **RESOLVED & NON-CONFLICTING**. Merged into develop baseline. Đã hoàn tất và nằm trong baseline develop. |

---

### 3.2. Technical Conflict Warnings & Resolution / Cảnh Báo Xung Đột Kỹ Thuật & Giải Pháp

#### Critical Schema Conflict Warnings / Cảnh Báo Xung Đột Schema Nguy Hiểm

1. **`companies` Table Collision (PR #13 vs PR #6)**:
   - *English*: Both PR #13 and PR #6 declare a new table named `companies` with conflicting column definitions and business purposes. Merging both will cause catastrophic Flyway migration failure. A shared core company entity or centralized `company` module must be established on `develop`.
   - *Tiếng Việt*: Cả PR #13 và PR #6 đều tự tạo bảng có tên `companies` với cấu trúc cột và mục đích khác nhau. Việc merge cả 2 PR sẽ gây lỗi sập Flyway migration nghiêm trọng. Nhóm cần thống nhất tạo bảng `companies` chung trong core schema hoặc module company tập trung trên `develop`.
2. **`used_sso_tickets` Redundant Collision (PR #13 vs develop V5)**:
   - *English*: PR #13 creates table `used_sso_tickets` in its custom `V4`, completely unaware that `develop` already created this table in `V5__auth_identity_evolution.sql`. PR #13 must drop this file entirely during rebase.
   - *Tiếng Việt*: PR #13 tự tạo bảng `used_sso_tickets` trong tệp `V4`, trong khi `develop` đã chính thức tạo bảng này trong `V5__auth_identity_evolution.sql`. Tác giả PR #13 bắt buộc phải xóa bỏ tệp này khi rebase.
3. **`jobs` vs `job_descriptions` Domain Fragmentation (PR #13 vs PR #6)**:
   - *English*: PR #6 creates table `jobs` while PR #13 creates `job_descriptions`. Having two divergent tables representing job postings fragments the recruitment domain.
   - *Tiếng Việt*: PR #6 tạo bảng `jobs` trong khi PR #13 tạo bảng `job_descriptions`. Tồn tại song song 2 bảng đại diện cho vị trí tuyển dụng sẽ làm phân mảnh domain tuyển dụng.

---

### 3.3. Renumbering Execution Plan for Tech Lead / Kế Hoạch Đổi Số Thứ Tự Chi Tiết Cho Tech Lead

1. **Cho PR #3 (DG-01 - T023B91)**:
   - **English**: Merge PR #3 into `develop` first. PR #3 permanently claims **`V7__evaluation.sql`** (prod) and **`V8__dev_evaluation_seed.sql`** (dev seed).
   - **Tiếng Việt**: Merge PR #3 vào `develop` đầu tiên. PR #3 chốt mốc vĩnh viễn **`V7__evaluation.sql`** (prod) và **`V8__dev_evaluation_seed.sql`** (dev seed).

2. **Cho PR #6 (`feat/AI-recommendation`)**:
   - **English**: After PR #3 is merged, rebase PR #6 onto latest `develop` and renumber:
     - `V7__jobs_and_recommendations.sql` $\rightarrow$ **`V9__jobs_and_recommendations.sql`** (in `db/migration/`).
     - `V8__dev_job_seed.sql` $\rightarrow$ **`V10__dev_job_seed.sql`** (in `db/migration-dev/`).
   - **Tiếng Việt**: Sau khi PR #3 merge vào `develop`, tác giả PR #6 rebase trên `develop` mới và đánh số lại:
     - `V7__jobs_and_recommendations.sql` $\rightarrow$ **`V9__jobs_and_recommendations.sql`** (trong `db/migration/`).
     - `V8__dev_job_seed.sql` $\rightarrow$ **`V10__dev_job_seed.sql`** (trong `db/migration-dev/`).

3. **Cho PR #14 (`feature/T023D16-phan-tich-khoang-thieu-hut`)**:
   - **English (Factual Correction)**: Note that `V10__dev_gap_analysis_seed.sql` is **already properly located** in `backend/src/main/resources/db/migration-dev/`. After PR #6 is updated to V9/V10, PR #14 simply renumbers sequentially:
     - `V9__target_positions_gap_analysis.sql` $\rightarrow$ **`V11__target_positions_gap_analysis.sql`** (in `db/migration/`).
     - `V10__dev_gap_analysis_seed.sql` $\rightarrow$ **`V12__dev_gap_analysis_seed.sql`** (in `db/migration-dev/`).
   - **Tiếng Việt (Đính chính thực tế)**: Tệp `V10__dev_gap_analysis_seed.sql` **vốn đã nằm sẵn hoàn toàn đúng** trong thư mục dev seed `backend/src/main/resources/db/migration-dev/`. Sau khi PR #6 đổi thành V9/V10, PR #14 chỉ cần đổi số thứ tự tuần tự:
     - `V9__target_positions_gap_analysis.sql` $\rightarrow$ **`V11__target_positions_gap_analysis.sql`** (trong `db/migration/`).
     - `V10__dev_gap_analysis_seed.sql` $\rightarrow$ **`V12__dev_gap_analysis_seed.sql`** (trong `db/migration-dev/`).

4. **Cho PR #13 (`feature/T023552-candidate-application`)**:
   - **English**: Author must perform a mandatory hard rebase on updated `develop`:
     - Delete custom versions `V3`, `V4`, `V5`, `V6`, `V7`, `V8`.
     - Delete duplicate `used_sso_tickets` DDL (already in develop V5).
     - Delete all non-standard decimal version files (`V3.1`, `V6.1`, `V8.1`).
     - Reconcile `companies` and `job_descriptions` schema with PR #6.
     - Renumber cleanly to integer sequences starting from **V13** (prod) and **V14** (dev seed), or subsequent numbers after PR #14.
   - **Tiếng Việt**: Tác giả PR #13 bắt buộc phải thực hiện hard rebase trên `develop` mới:
     - Xóa bỏ các file tự chế `V3`, `V4`, `V5`, `V6`, `V7`, `V8`.
     - Xóa bỏ file tạo bảng trùng lặp `used_sso_tickets` (vì đã có trong develop V5).
     - Xóa bỏ toàn bộ các file đánh số thập phân trái chuẩn (`V3.1`, `V6.1`, `V8.1`).
     - Đồng nhất schema bảng `companies` và `job_descriptions` với PR #6.
     - Đánh số lại thành số nguyên tuần tự bắt đầu từ **V13** (prod) và **V14** (dev seed), hoặc dải số sau PR #14.

---

## 4. Acceptance Criteria Checklist / Danh Mục Nghiệm Thu Tiêu Chí

- [x] **Phase 0 ACK**: `docs/dg01/PHASE0_ACK.md` complete with all 16 rules, 28 skills, and verification strategies. / *Hoàn thành đầy đủ 16 rules, 28 skills và phương án kiểm chứng.*
- [x] **Git Tree Hygiene**: Zero new/renamed branches; `.gitignore` is byte-identical to `develop`; 0 screenshot files committed in repo; uncommitted working tree. / *Không tạo/chuyển nhánh; `.gitignore` khớp 100% byte-identical develop; 0 file ảnh nào được commit; toàn bộ thay đổi uncommitted.*
- [x] **Scope Narrowing (G1)**: Develop migrations V1-V6 restored byte-identical; all out-of-scope files deleted; all 33 previously failing tests pass without changing test code. / *Khôi phục V1-V6 develop nguyên vẹn; xóa sạch file ngoài phạm vi; 33 test cũ pass trở lại.*
- [x] **Database & Migrations (G2)**: `V7__evaluation.sql` and `V8__dev_evaluation_seed.sql` pass idempotently; scalar IDs; no cross-module FKs; exactly 2 templates seeded. / *V7 prod và V8 dev seed áp dụng thành công, scalar IDs, không FK cross-module, seed đúng 2 mẫu phiếu.*
- [x] **Security & IDOR (G3)**: Deny-by-default; RBAC matrix for MENTOR/CANDIDATE/HR strictly enforced; unauthorized access hidden with HTTP 404 NOT_FOUND. / *Deny-by-default; phân quyền MENTOR/CANDIDATE/HR chuẩn; che giấu dữ liệu bằng mã lỗi 404 chống IDOR.*
- [x] **Atomic Submit & Evidence (G4)**: Submit with missing scores returns 400; complete submit generates `skill_evidences` (`source = MENTOR`, `verified = true`), invokes `recomputeSkills`, updates status to `SUBMITTED`, injects `Clock`. / *Thiếu điểm trả về 400; đủ điểm sinh evidence xác thực, gọi recomputeSkills, đổi status SUBMITTED, tiêm Clock.*
- [x] **Concurrency & Anti N+1 (G5)**: Optimistic locking with `@Version` blocks concurrent double submit (HTTP 409 CONFLICT); `JOIN FETCH` and batch mentor query prevent N+1 queries. / *Khóa lạc quan `@Version` chống double submit trả về 409 CONFLICT; JOIN FETCH và batch query triệt tiêu hoàn toàn N+1 query.*
- [x] **Frontend Mentor Evaluations (G6)**: Embedded `<CandidateEvaluations />` in `<SkillProfilePage />`; 100% `--rj-*` design tokens; zero emoji; WCAG 2.2 AA; 4 responsive breakpoints; motion budget. / *Khối đánh giá nhúng trong hồ sơ; 100% design token; không emoji; WCAG 2.2 AA; 4 breakpoints; motion budget.*
- [x] **Frontend Quality Gates**: Vitest 19/19 files (115/115 tests green); `npm run typecheck` 0 errors; `npm run lint` 0 errors; `npm run build` succeeds. / *Vitest pass 115/115 tests; typecheck 0 lỗi; lint 0 lỗi; build bundle thành công.*
- [x] **Documentation & Conflict Audit (G7)**: Complete bilingual `docs/dg01/README.md` and `docs/dg01/PR_DESCRIPTION.md`; complete table name conflict analysis and renumbering plan. / *Tài liệu song ngữ hoàn chỉnh; phân tích xung đột tên bảng và kế hoạch renumbering chi tiết.*
- [x] **Second Dev Mentor Seed (E1)**: Idempotent `mentor2@rikkeijobs.test` (`id = 9`, `MENTOR`, no `company_id`) added to `V8__dev_evaluation_seed.sql` only (`V2` and `V6` byte-identical to `develop`); `FlywayMigrationIntegrationTest` and `ProfileSeparationIntegrationTest` updated to expect `9` users; all `389` backend tests pass green. / *Tài khoản `mentor2@rikkeijobs.test` (`id = 9`, `MENTOR`) được seed idempotent trong `V8` (`V2`, `V6` giữ nguyên bản so với `develop`); cập nhật 2 test migration lên `9` user; toàn bộ `389` test backend pass.*
- [x] **Opaque-Box E2E Suite & Quality Gates (E2)**: Added 3 DG-01 suites (`20` suites / `231` cases / `1139` assertions total) passing twice consecutively on a fresh Docker stack, deliberate break proved in OS temp copy, and `./check.sh` / `.\check.ps1` pass `26/26` gates. / *Bổ sung 3 suite E2E (`20` suites / `231` cases / `1139` assertions) pass 2 lần liên tiếp trên stack sạch, chứng minh deliberate break trong thư mục tạm OS, và `./check.sh` / `.\check.ps1` đạt `26/26` gates.*

---

## 5. Verification Commands, Screenshot Plan & OpenAPI / Hướng Dẫn Kiểm Tra, Kế Hoạch Ảnh & OpenAPI

### 5.1. Verification Commands / Lệnh Kiểm Tra Độc Lập

#### 1. Git Hygiene Verification / Kiểm Tra Git Hygiene

```powershell
Set-Location "D:\GitHub\Rikkei\rikkei-jobs"

# Verify .gitignore is 100% byte-identical to origin/develop (exit code 0, no output)
git diff origin/develop -- .gitignore

# Confirm docs/dg01/pr-screenshots does NOT exist in repository
Test-Path "docs/dg01/pr-screenshots"

# Confirm zero PNG files in docs/dg01/
Get-ChildItem -Recurse docs/dg01 -Filter *.png
```

#### 2. Frontend Comprehensive Verification / Kiểm Tra Toàn Diện Frontend

```powershell
Set-Location "D:\GitHub\Rikkei\rikkei-jobs\frontend"

# Run all 19 Vitest test suites (115 tests passing green)
npm test -- --run

# Run TypeScript strict typecheck (0 errors)
npm run typecheck

# Run ESLint code quality check (0 errors)
npm run lint

# Build production bundle
npm run build
```

#### 3. Backend Verification on JDK 25 / Kiểm Tra Backend trên JDK 25

```powershell
Set-Location "D:\GitHub\Rikkei\rikkei-jobs\backend"

# Run all 389 backend unit, security, concurrency, and migration integration tests
.\mvnw.cmd clean test
```

#### 4. Opaque-Box E2E Verification / Kiểm Tra E2E Hộp Đen

```powershell
Set-Location "D:\GitHub\Rikkei\rikkei-jobs"

# Start fresh stack and run all 20 E2E suites twice consecutively (231 cases / 1139 assertions)
docker compose up -d --build --wait
node e2e/run-all.mjs
node e2e/run-all.mjs
```

#### 5. Contrast Ratio & Full Local Quality Gates / Kiểm Tra Tương Phản & Toàn Bộ 26 Gates

```powershell
Set-Location "D:\GitHub\Rikkei\rikkei-jobs"

# Verify 66 color pairs conform to WCAG 2.2 AA / AAA
node scripts/compute-contrast.mjs

# Run all 26 synchronized quality gates
.\check.ps1
```

> **Team Lead CI Note / Lưu ý dành cho Team Lead về CI**:  
> In `.github/workflows/ci.yml` (around line 295, job `smoke-test`), the step checks `if [ "$USERS_COUNT" -ne 8 ]` against the `dev` database. Because Round DG-01-e2e requirement E1 adds `mentor2@rikkeijobs.test` (`id = 9`) to `V8__dev_evaluation_seed.sql`, the `dev` profile now seeds `9` users instead of `8`. Since `.github/` is Scope OUT for this agent round, please update `.github/workflows/ci.yml:295` to expect `9` users when merging PR #3.  
> *Trong `.github/workflows/ci.yml` (khoảng dòng 295, job `smoke-test`) hiện đang kiểm tra cứng `USERS_COUNT -ne 8`. Do yêu cầu E1 bổ sung `mentor2@rikkeijobs.test` (`id = 9`) vào `V8__dev_evaluation_seed.sql`, môi trường `dev` hiện có `9` tài khoản thay vì `8`. Vì `.github/` thuộc phạm vi Scope OUT của vòng agent này, Team Lead cần cập nhật ngưỡng kiểm tra thành `9` khi merge PR #3.*

---

### 5.2. Visual Screenshot Plan / Kế Hoạch Ảnh Chụp Màn Hình Minh Họa

> **IMPORTANT GIT HYGIENE NOTICE / LƯU Ý QUAN TRỌNG VỀ GIT HYGIENE**:  
> **Zero image files are committed into the Git repository** in order to preserve strict repository cleanliness and avoid bloated binary commit history. The Antigravity browser automation test protocol executes and validates UI rendering in headless mode without persisting files. The following table specifies the exact visual screenshots and captions planned for manual capture by the author/Tech Lead to attach directly to the GitHub PR review interface:

| # | Filename / Tên Tệp Dự Kiến | Resolution / Độ Phân Giải | Theme / Chế Độ | Viewport & Content / Nội Dung & Góc Nhìn | Visual Caption / Chú Thích Minh Họa |
|---|---|---|---|---|---|
| 1 | `01_profile_evaluations_desktop_light_1440.png` | 1440 × 900 px | Light Mode | Candidate profile with embedded "Đánh giá từ mentor" card. Mentor info, overall comment, criteria breakdown. | Toàn cảnh khối "Đánh giá từ mentor" trên màn hình Desktop (1440px) ở chế độ Sáng. |
| 2 | `02_profile_evaluations_desktop_dark_1440.png` | 1440 × 900 px | Dark Mode | High-contrast dark theme verification showing `--rj-color-surface`, badge contrast, and text readability. | Khối đánh giá trên Desktop (1440px) ở chế độ Tối, kiểm chứng tỷ lệ tương phản token. |
| 3 | `03_profile_evaluations_laptop_light_1024.png` | 1024 × 768 px | Light Mode | Expanded accordion state revealing detailed criteria scores, progress bars, and qualitative mentor notes. | Chi tiết accordion mở rộng trên Laptop (1024px) hiển thị thanh tiến độ và nhận xét tiêu chí. |
| 4 | `04_profile_evaluations_tablet_light_768.png` | 768 × 1024 px | Light Mode | Tablet layout showing fluid header and responsive 2-column adaptation. | Bố cục co giãn tự nhiên trên máy tính bảng (768px) với tiêu đề 2 cột linh hoạt. |
| 5 | `05_profile_evaluations_mobile_light_375.png` | 375 × 812 px | Light Mode | Mobile portrait view showing single-column layout, zero horizontal overflow ($scrollWidth \le 375\text{px}$). | Giao diện di động (375px) bố cục 1 cột xếp chồng, không tràn viền ngang, nút bấm $\ge 44\text{px}$. |
| 6 | `06_profile_evaluations_mobile_dark_375.png` | 375 × 812 px | Dark Mode | Mobile portrait dark theme showing tabular score numerals and category badges ("Xuất sắc", "Khá"). | Giao diện di động (375px) chế độ Tối, hiển thị font JetBrains Mono số dạng bảng và huy hiệu xếp loại. |
| 7 | `07_profile_evaluations_empty_state.png` | 1024 × 768 px | Light Mode | Graceful empty state card when candidate has no submitted evaluations yet. | Trạng thái rỗng chuẩn mực khi ứng viên chưa có phiếu đánh giá nào từ mentor. |
| 8 | `08_profile_evaluations_keyboard_focus.png` | 1024 × 768 px | Light Mode | Keyboard navigation highlighting clear `3px solid var(--rj-color-focus)` outline on interactive elements. | Kiểm thử điều hướng bàn phím với viền focus tiếp cận rõ nét 3px chuẩn WCAG 2.2 AA. |

---

### 5.3. OpenAPI & Swagger UI Access / Hướng Dẫn Truy Cập Tài Liệu OpenAPI

All 5 endpoints of feature DG-01 are fully documented with SpringDoc OpenAPI 3 annotations, including descriptive operation summaries, request/response schemas, and standard HTTP error response codes (400, 401, 403, 404, 409):

- **Swagger UI Interactive Explorer**:
  - URL: `http://localhost:8080/swagger-ui.html` (or `http://localhost:8080/swagger-ui/index.html`)
  - Tag: `Evaluation` (Mentor endpoints) & `Candidate Evaluation Profile` (Profile query endpoint).
- **OpenAPI v3 JSON Specification**:
  - URL: `http://localhost:8080/v3/api-docs`
  - Group: `default` or `public-api`
