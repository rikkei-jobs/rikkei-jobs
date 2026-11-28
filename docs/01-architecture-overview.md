# 01 — Architecture Overview / Tổng quan Kiến trúc Hệ thống

---

## Part 1: English Section

### 1. Architectural Style: Modular Monolith

Rikkei Jobs is engineered as a **Modular Monolith** running on Java 25 LTS and Spring Boot 4.x. The platform delivers all business domains within a single deployable artifact while enforcing strict logical, data, and communication boundaries between sub-domains.

#### Why Modular Monolith over Microservices?

1. **Network Latency & Distributed Complexity**: Microservices introduce distributed transactions (Sagas, 2PC), network serialization overhead, partial failures, and event eventual consistency headaches. For Rikkei Jobs, keeping domain boundaries in-process preserves sub-millisecond call latencies and immediate transactional guarantees (ACID).
2. **Team Velocity & Operational Overhead**: Running a fleet of separate microservices requires extensive container orchestration (Kubernetes), distributed tracing, service meshes, and multi-pipeline CI/CD. A modular monolith simplifies deployment to a single container while maintaining clean separation of concerns.
3. **Refactoring Flexibility**: Early-stage domain boundaries frequently evolve. Moving code across in-process Java packages with IDE refactoring is effortless compared to breaking breaking API contracts across separate repositories and deployments.
4. **Migration Readiness**: Because physical foreign keys and cross-module database joins are strictly forbidden, any individual module can be carved out into an independent microservice in the future if high scale demands it.

#### Why PostgreSQL-First without Redis (For Now)?

1. **Operational Simplicity**: Introducing Redis adds another stateful service to local development and Docker Compose, increasing RAM footprint and failure modes.
2. **PostgreSQL Capability**: Modern PostgreSQL 18 handles indexing, JSON operations, and concurrent connection pooling with extraordinary performance. Session tokens and temporary state (such as verified SSO tickets) can be queried in sub-milliseconds with proper B-Tree indexes.
3. **Cache Invalidation Pitfalls**: Caching too early introduces cache staleness, cache stampede risks, and state synchronization bugs. Redis will be introduced in later phases specifically when distributed session clustering or multi-instance rate-limiting becomes mandatory.

---

### 2. Domain Modules & Table Ownership

The system is partitioned into **7 business modules** plus the foundational **Identity** core. Each module has exclusive read/write ownership over its designated database tables:

| Module | Backend Package | Frontend Feature | Domain Responsibility | Exclusively Owned Tables |
|---|---|---|---|---|
| **Identity & Access** | `identity` | `features/identity` | Authentication, RBAC roles, SSO verification, user accounts | `roles`, `users`, `used_sso_tickets`, `password_reset_tokens` |
| **Candidate Profile** | `candidate` | `features/candidate` | Competency profile, external sync (`LMS`/`EXAM`/`PM`), manual overrides, CV generation, privacy settings | `candidate_profiles`, `external_records`, `skill_mappings`, `skill_evidences`, `skill_scores`, `target_positions`, `position_skills`, `candidate_targets`, `gap_results`, `manual_overrides`, `sync_runs` (planned: `candidate_cvs`, `portfolios`) |
| **Company & Job** | `company` | `features/company` | Enterprise management, HR accounts, JD creation, JD approval | `companies`, `jobs`, `job_skills` |
| **Internship IOC** | `internship` | `features/internship` | IOC internship sync from `lms-pm`, batch/topic tracking, accepted task scores (future allocation tables: `internship_batches`, `internship_members`) | `internships`, `internship_tasks` |
| **Assessment** | `assessment` | `features/assessment` | Mentor evaluations, self-assessments, 20-skills catalogue | `skills`, `evaluation_templates`, `evaluation_criteria`, `evaluations`, `evaluation_scores` |
| **Supplementary Training** | `learning` | `features/learning` | JD skill-gap analysis, LMS course recommendations, enrollments | Planned (0 tables yet: `skill_gaps`, `learning_recommendations`, `course_enrollments`) |
| **Recruitment** | `recruitment` | `features/recruitment` | Job applications, immutable CV PDF snapshots, status tracking, screening transitions, interview rounds, HR & STAFF views (future UT-07/Meet tables: `interview_rooms`, `job_offers`) | `applications`, `application_status_history`, `application_cv_snapshots`, `interview_rounds` |
| **AI Career Assistant**| `ai` | `features/ai` | Gemini-powered CV review, job matching, interview rehearsal, AI governance & usage tracking | `job_recommendations`, `ai_config`, `ai_logs`, `ai_usage` |

---

### 3. Modular Monolith Rules of Engagement

1. **Table Ownership & Zero Cross-Module Writes**:
   - A module only ever queries or modifies tables within its own domain boundary.
   - Example: The `recruitment` module cannot directly query `users` or `candidates` tables.
2. **No Physical Cross-Module Foreign Keys**:
   - Foreign Key constraints across domain boundaries are strictly prohibited. Relationships are referenced via plain logical IDs (`UUID` or `BIGINT`).
3. **No Cross-Module SQL Joins**:
   - SQL queries containing `JOIN` clauses between tables belonging to different modules are blocked by architectural linters and code review.
4. **Inter-Module Communication**:
   - **Synchronous**: Modules expose typed Java Service Interfaces returning immutable DTOs (Java Records). Modules only depend on public service interfaces of other modules.
   - **Asynchronous**: Cross-domain events (e.g., student completes course, application status changes) are broadcast via Spring `ApplicationEventPublisher` and caught by decoupled `@EventListener` handlers.
5. **Centralized External API Client**:
   - Outbound calls to external systems (LMS, Exam, PM, Meet) must route exclusively through `ExternalApiClient`. Direct ad-hoc HTTP calls from business domains are forbidden.

### 4. Active Cross-Module Contracts (`TT-01`, `UT-01`, `UT-02` & `NT-05`)

#### 4.1. `TT-01` Internship Sync

- **`internship` -> `identity`**: Consumes `IdentityPublicService#existsById(Long userId)` and `IdentityPublicService#findLmsUserIdByUserId(Long userId)` (`Optional<String>`). The `internships.user_id` column is a plain scalar `BIGINT` with no physical foreign key to `users`.
- **`internship` -> `candidate`**: Consumes `CandidatePublicService#isProfilePublic(Long candidateUserId)`, `CandidatePublicService#acquireCandidateSkillLock(Long candidateUserId)`, and `CandidatePublicService#recordPmInternshipResults(Long candidateUserId, List<PmInternshipResultCommand> results)` using the immutable record `PmInternshipResultCommand(String batchId, String topicName, BigDecimal finalScore, LocalDate endDate, String payload)` (preserving the 3-argument constructor for backward compatibility). `InternshipSyncServiceImpl` parses the raw JSON array and passes `sourcePayloadsByBatchId` into `InternshipPersistenceService#saveSyncedInternships(Long userId, List<PMInternshipResponse> pmInternships, Map<String, String> sourcePayloadsByBatchId)` so both NT-05 and TT-01 store the exact raw source JSON object (preserving unknown upstream fields and original timestamp offsets).
- **`candidate` Exclusive Skill Ownership**: The `candidate` module retains exclusive ownership of `external_records`, `skill_mappings`, `skill_evidences`, and `skill_scores`, delegating to `ExternalRecordNormalizer` for idempotent upserts on `(candidateUserId, ExternalSource.PM, batchId)` (`finalScore * 10`, `RoundingMode.HALF_UP` to 2 decimals, clamped to `[0.00, 100.00]`, skipping null `finalScore` or blank `topicName`, preserving `manual_overrides`) and invoking `SkillRecomputeService#recomputeSkills` whenever a record is inserted, updated, or deduplicated (skipping redundant writes and recomputation when a single existing PM record matches raw source `payload` JSON tree equality, `title`, normalized `score`, and `recorded_at`; see `docs/hs-01-skill-profile.md` Section 8.7 for the safety invariant).
- **Non-Transactional Fast-Fail HTTP & Bean Separation**: `InternshipSyncServiceImpl` invokes `ExternalApiClient#getStudentInternshipsFastFail` (`<= 2.5 s`, `0` retries) outside `@Transactional`, then delegates short database writes to a separate proxied bean (`InternshipPersistenceService`) using `@Transactional(rollbackFor = Exception.class)`.

#### 4.2. `UT-01` Candidate CV Application & Status Tracking

- **`recruitment` -> `identity`**: Consumes `IdentityPublicService#findActiveHrRecipientsByCompanyId(Long companyId)` returning `List<HrRecipientDto(Long userId, String email, String fullName)>` (no raw `User` entity exposed). Scalar columns `applications.user_id` and `application_status_history.actor_id` carry no physical foreign keys to `users`.
- **`recruitment` -> `company`**: Consumes `JobQueryService#findJobForApplication(Long jobId)`, `findJobSummariesByIds(Set<Long> jobIds)`, and `isJobOwnedByCompany(Long jobId, Long companyId)` returning immutable `JobApplicationInfoDto` records over the existing `jobs` table (`V11`). `applications.job_id` is a plain scalar `BIGINT`.
- **`recruitment` <-> `candidate` (`CvPort`)**: `recruitment` owns the `CvPort` interface (`getOwnedCvForApplication(Long cvId, Long candidateUserId)` -> `CvSnapshotPayload`). Until `HS-04` merges into `develop`, a `@ConditionalOnMissingBean(CvPort.class)` placeholder throws `CvServiceUnavailableException` (`503 CV_SERVICE_UNAVAILABLE`). Once `HS-04` lands, `candidate` provides the Spring adapter without modifying `recruitment`.
- **Transaction Split & Post-Commit Async Mail**: `ApplicationServiceImpl` performs JD eligibility checks, duplicate pre-checks, and `CvPort` PDF snapshot capture outside any transaction, then delegates to `ApplicationPersistenceTxService` (`@Transactional(rollbackFor = Exception.class)`) for single-insert `applications` (sequence-allocated `id`), `application_cv_snapshots`, initial `application_status_history`, and `ApplicationSubmittedEvent` publication. `HrNotificationListener` dispatches HR emails via Spring Mail only at `TransactionPhase.AFTER_COMMIT` on a bounded `ThreadPoolTaskExecutor` (`notificationTaskExecutor`).

#### 4.3. `UT-02` Recruitment Process (`T0235C3`)

- **`recruitment` -> `identity`**: Consumes `IdentityPublicService#getUserById(Long)` and `getUsersByIds(Set<Long>)` returning immutable `UserSummaryDto` records for candidate display info and transition notifications (zero `User` entity exposure).
- **`recruitment` -> `company`**: Consumes `JobQueryService#findJobIdsByCompanyId(Long)`, `isJobOwnedByCompany(Long, Long)`, `getJobRequiredSkills(Long)`, `getJobRequiredSkillsByJobIds(Set<Long>)`, and `findJobsByCompanyId(Long, int, int)` (Option 1A `GET /api/v1/hr/jobs`, to be expanded by `DN-04`).
- **`recruitment` -> `candidate`**: Consumes `CandidatePublicService#getVerifiedSkillScores(Long)` and batch `getVerifiedSkillScoresByUserIds(Set<Long>)` for deterministic `MatchScoreCalculator` scoring with zero N+1 queries.
- **State Machine, Concurrency & Post-Commit Candidate Email**: `ApplicationStatus.allowedUt02Transitions()` enforces strict forward-only transitions (`SUBMITTED -> SCREENING|REJECTED`, `SCREENING -> INTERVIEW|REJECTED`, `INTERVIEW -> REJECTED`); `isOfferAllowed(Long)` provides the UT-07 hook (`INTERVIEW -> OFFER` and `OFFER -> HIRED|REJECTED` remain reserved for UT-07). `CandidateTransitionNotificationListener` sends HTML-escaped Vietnamese emails at `TransactionPhase.AFTER_COMMIT` on `notificationTaskExecutor` with PII-free single-line logging.

#### 4.4. `NT-05` External Data Sync (`T022C02`)

- **`candidate` Exclusive Sync Ownership**: Under design decision D1, `external_records`, `manual_overrides`, and `sync_runs` are owned exclusively by `candidate`. `ExternalRecordNormalizer` and unified upsert logic are shared by both NT-05 (`ExternalSyncService`) and TT-01 (`CandidatePublicServiceImpl#recordPmInternshipResults`).
- **`candidate` -> `identity`**: Consumes `IdentityPublicService#findCandidateSyncTargetByUserId(Long userId)` (`Optional<CandidateSyncTargetDto>`), `findActiveSyncCandidates(int page, int size)` (`PageResponse<CandidateSyncTargetDto>`), `searchCandidatesForSync(String q, int page, int size)` (`PageResponse<CandidateSyncSummaryDto>`), `findLmsUserIdByUserId(Long userId)` (`Optional<String>`), and `getUsersByIds(Set<Long> userIds)` (`Map<Long, UserSummaryDto>`) without cross-module FKs or SQL joins.
- **Timeout & Retry Split (NT-05 vs TT-01)**: All three NT-05 endpoints (`LMS`, `EXAM`, and `PM` via `ExternalApiClient#getStudentInternships`) use the `5 s` timeout with `2` retries on network errors, whereas TT-01's on-read internship screen preserves `ExternalApiClient#getStudentInternshipsFastFail` (`<= 2.5 s`, `0` retries). The TT-01 internship page continues to display the `internship` module's own `internships` and `internship_tasks` source data regardless of candidate `manual_overrides`.
- **Per-User Serialization & Concurrency**: HTTP fetches run strictly outside `@Transactional`. Database mutations acquire `pg_advisory_xact_lock` via `CandidateSkillLockService` (namespace `0x524B534B` `"RKSK"` and folded 64-bit `userId`) before any read or delete across recompute, NT-05 sync, TT-01 PM write, manual override, and mentor evaluation, backed by `V25` partial unique index `uq_skill_evidences_external_record_skill`. On-open sync (`GET /api/v1/profiles/me/skills`, > 1 hour staleness, skipping candidates without a non-blank `lms_user_id`) runs asynchronously on the bounded `rikkei-sync-` executor.

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### 1. Định hướng Kiến trúc: Modular Monolith

Hệ thống **Rikkei Jobs** được thiết kế và xây dựng theo mô hình **Modular Monolith** (Khối đơn mô-đun hoá) trên nền tảng Java 25 LTS và Spring Boot 4.x. Toàn bộ nền tảng được đóng gói và vận hành trong một đơn vị triển khai duy nhất nhưng tuân thủ ranh giới logic, dữ liệu và giao tiếp hoàn toàn cô lập giữa các miền nghiệp vụ (sub-domains).

#### Vì sao chọn Modular Monolith thay vì Microservices?

1. **Giảm thiểu độ trễ mạng và độ phức tạp phân tán**: Kiến trúc Microservices làm phát sinh giao dịch phân tán (Saga, 2PC), phụ phí serialize dữ liệu qua mạng, lỗi mạng cục bộ và tính nhất quán sau cùng (eventual consistency). Modular Monolith duy trì các lời gọi nội bộ trong bộ nhớ máy chủ (in-process) với độ trễ dưới 1 mili-giây và bảo đảm trọn vẹn tính toàn vẹn giao dịch (ACID).
2. **Tối ưu tốc độ phát triển và chi phí vận hành**: Việc quản lý nhiều microservices riêng biệt đòi hỏi hạ tầng phức tạp (Kubernetes, distributed tracing, service mesh, CI/CD phân mảnh). Modular Monolith đơn giản hóa quá trình đóng gói và triển khai thành 1 container duy nhất mà vẫn đảm bảo tính tách bạch về trách nhiệm nghiệp vụ.
3. **Linh hoạt tái cấu trúc (Refactoring)**: Trong giai đoạn đầu phát triển, ranh giới giữa các domain thường xuyên biến động. Việc tái cấu trúc package nội bộ bằng IDE dễ dàng và an toàn hơn rất nhiều so với việc sửa đổi các hợp đồng API mạng giữa các repository độc lập.
4. **Sẵn sàng chuyển đổi khi cần**: Nhờ loại bỏ hoàn toàn khóa ngoại (FK) và truy vấn JOIN trực tiếp giữa các bảng khác module, từng module có thể dễ dàng tách thành một microservice độc lập trong tương lai nếu lưu lượng truy cập đòi hỏi mở rộng quy mô riêng biệt.

#### Vì sao sử dụng PostgreSQL thuần túy và chưa dùng Redis?

1. **Tinh gọn hạ tầng**: Việc đưa thêm Redis làm tăng thêm một dịch vụ có trạng thái (stateful) vào môi trường phát triển cục bộ và Docker Compose, tiêu tốn thêm RAM và tạo thêm điểm lỗi tiềm tàng (single point of failure).
2. **Năng lực vượt trội của PostgreSQL 18**: PostgreSQL 18 hỗ trợ cực tốt chỉ mục B-Tree, kiểu dữ liệu JSONB và bộ đệm kết nối. Các trạng thái tạm thời như vé SSO đã sử dụng hoàn toàn có thể truy vấn với thời gian tính bằng micro-giây khi có index hợp lý.
3. **Tránh bẫy vô hiệu hóa cache (Cache Invalidation)**: Việc áp dụng cache quá sớm dễ dẫn đến dữ liệu không đồng nhất và lỗi đồng bộ phức tạp. Redis sẽ được bổ sung ở các giai đoạn sau khi xuất hiện nhu cầu phân cụm phiên đăng nhập trên nhiều máy chủ hoặc giới hạn tần suất gọi API (rate limiting) phân tán.

---

### 2. Danh mục 7 Module Nghiệp vụ & Quyền Sở hữu Dữ liệu

Hệ thống được chia thành **7 module nghiệp vụ** cùng module nền tảng **Identity**. Mỗi module có quyền sở hữu độc quyền đối với các bảng cơ sở dữ liệu tương ứng:

| Module | Package Backend | Thư mục Frontend | Trách nhiệm Nghiệp vụ | Bảng Dữ liệu Sở hữu Độc quyền |
|---|---|---|---|---|
| **Identity & Access** | `identity` | `features/identity` | Xác thực người dùng, phân quyền RBAC, xác minh vé SSO, tài khoản | `roles`, `users`, `used_sso_tickets`, `password_reset_tokens` |
| **Candidate Profile** | `candidate` | `features/candidate` | Hồ sơ năng lực, đồng bộ dữ liệu ngoài (`LMS`/`EXAM`/`PM`), sửa tay, sinh CV, quyền riêng tư | `candidate_profiles`, `external_records`, `skill_mappings`, `skill_evidences`, `skill_scores`, `target_positions`, `position_skills`, `candidate_targets`, `gap_results`, `manual_overrides`, `sync_runs` (dự kiến: `candidate_cvs`, `portfolios`) |
| **Company & Job** | `company` | `features/company` | Quản lý doanh nghiệp, tài khoản HR, tạo và duyệt JD | `companies`, `jobs`, `job_skills` |
| **Internship IOC** | `internship` | `features/internship` | Đồng bộ thực tập IOC từ `lms-pm`, theo dõi đợt/đề tài và điểm task đã nghiệm thu (bảng ghép đợt dự kiến giai đoạn sau: `internship_batches`, `internship_members`) | `internships`, `internship_tasks` |
| **Assessment** | `assessment` | `features/assessment` | Phiếu đánh giá của Mentor, tự đánh giá, danh mục 20 kỹ năng | `skills`, `evaluation_templates`, `evaluation_criteria`, `evaluations`, `evaluation_scores` |
| **Supplementary Training** | `learning` | `features/learning` | Phân tích khoảng thiếu hụt so với JD, gợi ý môn học LMS, ghi danh | Dự kiến (chưa có bảng: `skill_gaps`, `learning_recommendations`, `course_enrollments`) |
| **Recruitment** | `recruitment` | `features/recruitment` | Ứng tuyển bằng CV, đóng băng bản PDF snapshot, theo dõi trạng thái, sàng lọc & các vòng phỏng vấn cho HR & STAFF (bảng dự kiến `UT-07`/phỏng vấn: `interview_rooms`, `job_offers`) | `applications`, `application_status_history`, `application_cv_snapshots`, `interview_rounds` |
| **AI Career Assistant**| `ai` | `features/ai` | Trợ lý Gemini tối ưu CV, gợi ý việc làm, luyện phỏng vấn, quản trị & định mức AI | `job_recommendations`, `ai_config`, `ai_logs`, `ai_usage` |

---

### 3. Quy tắc Ranh giới Bất biến (Rules of Engagement)

1. **Quyền sở hữu bảng độc quyền**:
   - Một module chỉ được phép đọc và ghi dữ liệu trên các bảng do chính mình quản lý.
   - Ví dụ: Module `recruitment` tuyệt đối không được truy vấn trực tiếp vào bảng `users` hay `candidates`.
2. **Cấm Khóa Ngoại vật lý chéo Module (No Cross-Module FK)**:
   - Nghiêm cấm tạo ràng buộc `FOREIGN KEY` nối bảng giữa 2 module khác nhau. Các mối quan hệ chỉ được lưu trữ dưới dạng ID thô (`UUID` hoặc `BIGINT`).
3. **Cấm JOIN SQL chéo Module**:
   - Cấm viết các câu lệnh truy vấn SQL có chứa `JOIN` giữa các bảng thuộc về hai module khác nhau. Quy tắc này được kiểm soát nghiêm ngặt qua linter và code review.
4. **Cơ chế Giao tiếp giữa các Module**:
   - **Đồng bộ**: Các module công khai Service Interface kèm DTO bất biến (Java Records). Module khác chỉ được phép phụ thuộc vào Interface này.
   - **Bất đồng bộ**: Sử dụng cơ chế phát sự kiện Spring `ApplicationEventPublisher` và các phương thức bắt sự kiện `@EventListener` để giữ tính phi tập trung.
5. **Thành phần Tích hợp Hệ thống Ngoài Tập trung**:
   - Toàn bộ giao tiếp ra hệ thống ngoài (LMS, Khảo thí, IOC PM, Meet) bắt buộc phải đi qua `ExternalApiClient` dùng chung. Nghiêm cấm các domain module tự tạo HTTP client riêng lẻ.

### 4. Hợp đồng Giao tiếp Liên Module Hiện hành (`TT-01`, `UT-01`, `UT-02` & `NT-05`)

#### 4.1. Đồng bộ Thực tập IOC (`TT-01`)

- **`internship` -> `identity`**: Gọi `IdentityPublicService#existsById(Long userId)` và `IdentityPublicService#findLmsUserIdByUserId(Long userId)` (`Optional<String>`). Cột `internships.user_id` là `BIGINT` vô hướng, không tạo khóa ngoại vật lý tới `users`.
- **`internship` -> `candidate`**: Gọi `CandidatePublicService#isProfilePublic(Long candidateUserId)`, `CandidatePublicService#acquireCandidateSkillLock(Long candidateUserId)` và `CandidatePublicService#recordPmInternshipResults(Long candidateUserId, List<PmInternshipResultCommand> results)` qua bản ghi bất biến `PmInternshipResultCommand(String batchId, String topicName, BigDecimal finalScore, LocalDate endDate, String payload)` (vẫn giữ constructor 3 tham số cho tương thích ngược). `InternshipSyncServiceImpl` phân tích mảng JSON thô và truyền `sourcePayloadsByBatchId` vào `InternshipPersistenceService#saveSyncedInternships(Long userId, List<PMInternshipResponse> pmInternships, Map<String, String> sourcePayloadsByBatchId)` để cả NT-05 và TT-01 lưu nguyên vẹn object JSON nguồn (gồm cả trường lạ và offset thời gian gốc) mà không serialize lại DTO.
- **Quyền sở hữu độc quyền dữ liệu kỹ năng của `candidate`**: Module `candidate` toàn quyền quản lý `external_records`, `skill_mappings`, `skill_evidences` và `skill_scores`, ủy quyền `ExternalRecordNormalizer` thực hiện upsert bất biến theo khóa `(candidateUserId, ExternalSource.PM, batchId)` (`finalScore * 10`, làm tròn `RoundingMode.HALF_UP` 2 chữ số, kẹp trong khoảng `[0.00, 100.00]`, bỏ qua khi `finalScore` null hoặc `topicName` rỗng, bảo toàn `manual_overrides`) rồi kích hoạt `SkillRecomputeService#recomputeSkills` khi có bản ghi thêm mới, cập nhật hoặc khử trùng lặp (bỏ qua ghi và tính lại khi bản ghi PM duy nhất khớp cây JSON `payload` nguồn, `title`, `score` chuẩn hóa và `recorded_at`; xem bất biến an toàn tại `docs/hs-01-skill-profile.md` mục 8.7).
- **Tách HTTP Fast-Fail khỏi `@Transactional`**: `InternshipSyncServiceImpl` gọi `ExternalApiClient#getStudentInternshipsFastFail` (`<= 2.5 giây`, `0` retry) bên ngoài giao dịch DB, sau đó ủy quyền ghi DB ngắn qua bean riêng có proxy (`InternshipPersistenceService`) với `@Transactional(rollbackFor = Exception.class)`.

#### 4.2. Ứng tuyển bằng CV & Theo dõi Trạng thái (`UT-01`)

- **`recruitment` -> `identity`**: Gọi `IdentityPublicService#findActiveHrRecipientsByCompanyId(Long companyId)` trả về `List<HrRecipientDto(Long userId, String email, String fullName)>` (không lộ entity `User`). Các cột `applications.user_id` và `application_status_history.actor_id` là `BIGINT` vô hướng không khóa ngoại tới `users`.
- **`recruitment` -> `company`**: Gọi `JobQueryService#findJobForApplication(Long jobId)`, `findJobSummariesByIds(Set<Long> jobIds)` và `isJobOwnedByCompany(Long jobId, Long companyId)` trả về bản ghi bất biến `JobApplicationInfoDto` trên bảng `jobs` (`V11`). Cột `applications.job_id` là `BIGINT` vô hướng.
- **`recruitment` <-> `candidate` (`CvPort`)**: Module `recruitment` sở hữu interface `CvPort` (`getOwnedCvForApplication(Long cvId, Long candidateUserId)` -> `CvSnapshotPayload`). Trong khi chờ `HS-04` hợp nhất vào `develop`, bean `@ConditionalOnMissingBean(CvPort.class)` trả lỗi `CvServiceUnavailableException` (`503 CV_SERVICE_UNAVAILABLE`). Khi `HS-04` sẵn sàng, `candidate` cung cấp adapter thật mà không cần sửa `recruitment`.
- **Tách ranh giới giao dịch & Gửi email sau commit**: `ApplicationServiceImpl` kiểm tra điều kiện JD, kiểm tra trùng đơn mở và tải byte PDF qua `CvPort` bên ngoài `@Transactional`, sau đó ủy quyền cho `ApplicationPersistenceTxService` (`@Transactional(rollbackFor = Exception.class)`) chèn đơn `applications` trong một lệnh `INSERT` duy nhất (cấp `id` từ sequence), lưu `application_cv_snapshots`, ghi mốc `application_status_history` đầu tiên và phát `ApplicationSubmittedEvent`. `HrNotificationListener` gửi email qua Spring Mail ở pha `TransactionPhase.AFTER_COMMIT` trên `ThreadPoolTaskExecutor` giới hạn (`notificationTaskExecutor`).

#### 4.3. Quy trình Tuyển dụng (`UT-02` / `T0235C3`)

- **`recruitment` -> `identity`**: Gọi `IdentityPublicService#getUserById(Long)` và `getUsersByIds(Set<Long>)` nhận bản ghi bất biến `UserSummaryDto` phục vụ hiển thị ứng viên và gửi thông báo chuyển trạng thái.
- **`recruitment` -> `company`**: Gọi `JobQueryService#findJobIdsByCompanyId(Long)`, `isJobOwnedByCompany(Long, Long)`, `getJobRequiredSkills(Long)`, `getJobRequiredSkillsByJobIds(Set<Long>)` và `findJobsByCompanyId(Long, int, int)` (Option 1A `GET /api/v1/hr/jobs`, sẽ được `DN-04` mở rộng sau).
- **`recruitment` -> `candidate`**: Gọi `CandidatePublicService#getVerifiedSkillScores(Long)` và hàm batch `getVerifiedSkillScoresByUserIds(Set<Long>)` cho `MatchScoreCalculator` tất định, không sinh N+1 query.
- **Máy trạng thái, Đồng thời & Email ứng viên sau commit**: `ApplicationStatus.allowedUt02Transitions()` chỉ cho phép đi tiến (`SUBMITTED -> SCREENING|REJECTED`, `SCREENING -> INTERVIEW|REJECTED`, `INTERVIEW -> REJECTED`); `isOfferAllowed(Long)` là hook cho UT-07 (`INTERVIEW -> OFFER` và `OFFER -> HIRED|REJECTED` thuộc UT-07). `CandidateTransitionNotificationListener` gửi email tiếng Việt có thoát HTML tại pha `TransactionPhase.AFTER_COMMIT` trên `notificationTaskExecutor` với log một dòng không PII.

#### 4.4. Đồng bộ Dữ liệu Ngoài (`NT-05` / `T022C02`)

- **Quyền sở hữu độc quyền của `candidate`**: Theo quyết định D1, `external_records`, `manual_overrides` và `sync_runs` thuộc module `candidate`. `ExternalRecordNormalizer` và logic upsert thống nhất được dùng chung cho cả NT-05 (`ExternalSyncService`) và TT-01 (`CandidatePublicServiceImpl#recordPmInternshipResults`).
- **`candidate` -> `identity`**: Gọi `IdentityPublicService#findCandidateSyncTargetByUserId(Long userId)` (`Optional<CandidateSyncTargetDto>`), `findActiveSyncCandidates(int page, int size)` (`PageResponse<CandidateSyncTargetDto>`), `searchCandidatesForSync(String q, int page, int size)` (`PageResponse<CandidateSyncSummaryDto>`), `findLmsUserIdByUserId(Long userId)` (`Optional<String>`) và `getUsersByIds(Set<Long> userIds)` (`Map<Long, UserSummaryDto>`), không tạo khóa ngoại hay SQL `JOIN` chéo module.
- **Phân tách Timeout & Retry (NT-05 vs TT-01)**: Cả ba endpoint trong luồng đồng bộ NT-05 (`LMS`, `EXAM` và `PM` qua `ExternalApiClient#getStudentInternships`) dùng timeout `5 giây` và `2` lần thử lại khi gặp lỗi mạng, trong khi màn hình thực tập TT-01 giữ nguyên `ExternalApiClient#getStudentInternshipsFastFail` (`<= 2.5 giây`, `0` retry). Trang thực tập TT-01 vẫn hiển thị dữ liệu nguồn riêng của module `internship` (`internships`, `internship_tasks`) độc lập với `manual_overrides`.
- **Tuần tự hóa theo ứng viên & Đồng thời**: Mọi lời gọi HTTP thực hiện hoàn toàn ngoài `@Transactional`. Các luồng ghi DB xin khóa `pg_advisory_xact_lock` qua `CandidateSkillLockService` (namespace `0x524B534B` `"RKSK"` và `userId` 64-bit gấp gọn) trước khi đọc/xóa trên cả 5 luồng ghi (tính lại điểm, đồng bộ NT-05, ghi PM TT-01, sửa tay, đánh giá mentor), kết hợp chỉ mục duy nhất bán phần `uq_skill_evidences_external_record_skill` tại `V25`. Luồng đồng bộ khi mở hồ sơ (`GET /api/v1/profiles/me/skills`, quá 1 giờ, bỏ qua ứng viên chưa có `lms_user_id` hợp lệ) chạy nền trên executor giới hạn `rikkei-sync-`.
