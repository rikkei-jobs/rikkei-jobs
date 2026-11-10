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
| **Identity & Access** | `identity` | `features/identity` | Authentication, RBAC roles, SSO verification, user accounts | `roles`, `users`, `used_sso_tickets` |
| **Candidate Profile** | `candidate` | `features/candidate` | Competency profile, CV generation, portfolio, privacy settings | `skill_profiles`, `profile_evidences`, `candidate_cvs`, `portfolios` |
| **Company & Job** | `company`, `job` | `features/company`, `features/job` | Enterprise management, HR accounts, JD creation, JD approval | `companies`, `company_hr_profiles`, `job_descriptions`, `job_skills` |
| **Internship IOC** | `internship` | `features/internship` | Enterprise internship demand, batch allocation, task scoring | `internship_batches`, `internship_members`, `internship_tasks` |
| **Assessment** | `assessment` | `features/assessment` | Mentor evaluations, self-assessments, 20-skills catalogue | `skills`, `assessment_templates`, `assessment_forms`, `skill_badges` |
| **Supplementary Training** | `learning` | `features/learning` | JD skill-gap analysis, LMS course recommendations, enrollments | `skill_gaps`, `learning_recommendations`, `course_enrollments` |
| **Recruitment** | `recruitment` | `features/recruitment` | Job applications, candidate screening, interview scheduling | `applications`, `interview_rounds`, `interview_rooms`, `job_offers` |
| **AI Career Assistant**| `ai` | `features/ai` | Gemini-powered CV review, job matching, interview rehearsal | Stateless (no persistent tables; interacts via DTOs) |

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
| **Identity & Access** | `identity` | `features/identity` | Xác thực người dùng, phân quyền RBAC, xác minh vé SSO, tài khoản | `roles`, `users`, `used_sso_tickets` |
| **Candidate Profile** | `candidate` | `features/candidate` | Quản lý hồ sơ Skill Profile, bằng chứng, sinh CV, quyền riêng tư | `skill_profiles`, `profile_evidences`, `candidate_cvs`, `portfolios` |
| **Company & Job** | `company`, `job` | `features/company`, `features/job` | Quản lý doanh nghiệp, tài khoản HR, tạo và duyệt JD | `companies`, `company_hr_profiles`, `job_descriptions`, `job_skills` |
| **Internship IOC** | `internship` | `features/internship` | Nhu cầu thực tập, ghép đợt IOC (lms-pm), theo dõi đề tài và task | `internship_batches`, `internship_members`, `internship_tasks` |
| **Assessment** | `assessment` | `features/assessment` | Phiếu đánh giá của Mentor, tự đánh giá, danh mục 20 kỹ năng | `skills`, `assessment_templates`, `assessment_forms`, `skill_badges` |
| **Supplementary Training** | `learning` | `features/learning` | Phân tích khoảng thiếu hụt so với JD, gợi ý môn học LMS, ghi danh | `skill_gaps`, `learning_recommendations`, `course_enrollments` |
| **Recruitment** | `recruitment` | `features/recruitment` | Ứng tuyển bằng CV, sàng lọc, lên lịch phỏng vấn (Rikkei Meet) | `applications`, `interview_rounds`, `interview_rooms`, `job_offers` |
| **AI Career Assistant**| `ai` | `features/ai` | Trợ lý Gemini tối ưu CV, gợi ý việc làm, luyện phỏng vấn | Không lưu bảng riêng (giao tiếp qua DTO) |

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
