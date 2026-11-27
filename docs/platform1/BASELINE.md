# Whole-System & Load Capacity Baseline — Round PLATFORM-1 (`T022DB0`)

- **Document Path**: `docs/platform1/BASELINE.md`
- **Branch**: `chore/T022DB0-taste-skill-and-optimization` (`HEAD = eb75201`, with Part A + Part B working-tree updates)
- **Target Stack**: `http://127.0.0.1:3000` (5/5 Docker Compose services `healthy`)
- **Measurement Script**: `scripts/platform1-load-ramp.mjs` (Node built-ins only, not wired into CI/gates)
- **Zero Emoji Compliance**: `0` emoji characters
- **Zero Machine-Local Paths**: `0` occurrences

---

## Tóm Tắt Điều Hành (Tiếng Việt — Rule 11 Bilingual Summary)

Tài liệu này ghi nhận toàn bộ số đo nền (**baseline**) trước khi tối ưu hóa cho **Part C0** và **Part C1b (Round PLATFORM-1 / `T022DB0`)**, được đo trực tiếp trên stack Docker Compose mới khởi tạo hoàn toàn (`docker compose down -v && docker compose up -d --build --wait`) với dữ liệu seed nguyên bản:

- **Môi trường và giới hạn máy đơn**: Windows 11 Pro, CPU Intel Core i7-12700H (14 nhân / 20 luồng), `15.71 GB` RAM tổng (`1.64 GB` trống trước khi dựng stack và `0.63 GB` trống sau khi 5 container chạy). Do toàn bộ stack và công cụ đo cùng chia sẻ CPU/RAM trên một máy trạm cục bộ, các số liệu tải đồng thời phản ánh giới hạn môi trường phát triển cục bộ và **không đại diện cho thông số production**.
- **Backend & PostgreSQL**:
  - Thời gian khởi động lạnh Spring Boot là `9.605 s` (`10.916 s` tổng tiến trình); bộ nhớ nhàn rỗi của `rikkei-backend` là `716.7 MiB` theo `docker stats` (`729.45 MiB` `VmRSS` / `256.20 MiB` `RssAnon` + `450.38 MiB` `RssShmem` đa ánh xạ ZGC `/memfd:java_heap`, `49` luồng), trong khi JVM Heap chỉ sử dụng `128.00 MiB` (`424.00 MiB` committed / `512.00 MiB` max, `-XX:+UseZGC -Xms256m -Xmx512m`) và Non-Heap `146.90 MiB`.
  - Các điểm nghẽn SQL thực tế được phát hiện qua log truy vấn PostgreSQL: `GET /api/v1/profiles/me/internships` thực thi tới ~46 câu SQL (bao gồm gọi đồng bộ PM và chạy lại `SkillRecomputeService` ngay trong request GET); `GET /api/v1/me/gap-analysis` giữ `pg_advisory_xact_lock`, xóa và ghi lại `gap_results` trên mỗi request GET (`12` câu SQL thực thi); `GET /api/v1/me/job-recommendations?limit=6` khi cache hit vẫn chạy lại `findOpenJobs()` và tính điểm từ đầu (`9` câu SQL thực thi); `JwtAuthFilter` truy vấn `users JOIN roles` trên mọi request xác thực; và `GET /api/v1/profiles/1/evaluations` phát sinh thêm truy vấn `roles` do `FetchType.EAGER` trên `User.role`.
- **Frontend & Nginx**:
  - Build production Vite mất `9.61 s` (bundle `410 ms`), entry JS `320.27 kB` (`99.75 kB` gzip) và entry CSS `84.92 kB` (`14.10 kB` gzip); tổng 50 tệp `dist/` là `1,065,991 B` raw (`614,677 B` gzip), trong đó 8 tệp font `.woff2` tự lưu trữ chiếm `431,748 B` (`421.63 KiB`).
  - Đo trực tiếp bằng headless Chromium + CDP: `/login` đạt LCP trung vị `712 ms` (lạnh) / `620 ms` (ấm), `ScriptDuration` `32.87 ms` (lạnh) / `31.54 ms` (ấm), `CLS = 0`, `TBT = 0 ms` (ấm ghi nhận 1 lượt gai `117 ms`), `324,942 B` truyền tải khi tải lạnh. Trên `/candidate`, `ScriptDuration` trung vị `44.97 ms`, `LayoutDuration` `39.53 ms` (điểm nóng từ `skillLabels` `15.28 ms` self-time và `getBoundingClientRect` / `appendChild` + waterfall `GET /api/v1/me/gap-analysis` bị chặn sau `Promise.all`).
  - Header Nginx hiện thiếu `upstream` `keep-alive` tới backend, thiếu `immutable` trên static assets (lặp `Cache-Control`), làm rơi security header trong block static assets, và thiếu `Content-Security-Policy` / `Referrer-Policy` / `Permissions-Policy`.
- **Kiểm thử tải đồng thời C1b (1..200 VUs x 5 lượt)**:
  - **Thông lượng bền vững tối đa (0% và < 1% lỗi)**: `25 VUs` đạt trung vị `625.33 okRPS` (`p50 = 32.61 ms`, `p95 = 94.18 ms`, `0` lỗi trong lần đo nền sạch; lưu ý tùy jitter `TIME_WAIT` trên máy đơn, lỗi `502` có thể bắt đầu sớm từ `25 VUs` khi burst vượt ngưỡng port tạm).
  - **Điểm gãy (Knee)**: tại `50 VUs`, thông lượng thành công tụt xuống `444.73 okRPS` (`972.35 totalRPS`) với **`59.59%` trung vị lỗi** (`87.63%` max, **`10,831` lỗi HTTP 502 Bad Gateway**), tiếp theo là `5,182` lỗi `502` tại `100 VUs` và `1,499` lỗi `502` tại `200 VUs` (`0%` median nhưng `45.12%` max). Nguyên nhân gốc từ log Nginx là `connect() to backend:8080 failed (99: Address not available)` do thiếu `upstream` `keep-alive`. Phía sau Nginx, telemetry JMX tạm thời cũng ghi nhận **HikariCP (`maximum-pool-size=10`) bão hòa hoàn toàn từ `25+ VUs`** với hàng đợi `ThreadsAwaitingConnection` lên tới `15 -> 40 -> 89 -> 187` luồng Tomcat, `currentThreadsBusy` đạt `197/200` tại `200 VUs`, trong khi pause ZGC chỉ ở mức dưới mili-giây (`0.008–0.514 ms`, trung vị `0.037 ms`).
  - **Kiểm tra đồng thời & phục hồi**: khóa lạc quan `@Version` trên `PUT /api/v1/companies/me` trả đúng `[200, 409, 409, 409, 409]`; chống dùng lại vé SSO đồng thời trả `[200, 401, 401, 401, 401]`; `PUT /api/v1/me/target` đồng thời giữ đúng `1` dòng; hệ thống phục hồi `HTTP 200` trong `5–16 ms` ngay sau khi dừng tải `200 VUs`.

---

## 1. Machine, Toolchain, and Pristine Seed Volume

### 1.1 Host Hardware and Runtime Versions

| Component | Baseline Value | Verification Command |
|---|---|---|
| Operating System | Microsoft Windows 11 Pro (`10.0.26300`) | `Get-CimInstance Win32_OperatingSystem` |
| CPU | 12th Gen Intel Core i7-12700H (`14` Cores / `20` Logical Processors) | `Get-CimInstance Win32_Processor` |
| Total Host RAM | `15.71 GB` (Docker WSL2 container ceiling reported as `9.713 GiB`) | `Get-CimInstance Win32_OperatingSystem` / `docker stats` |
| Free Host RAM | `1.64 GB` pre-rebuild -> `0.63 GB` post-stack-up | `Get-CimInstance Win32_OperatingSystem` |
| Docker Engine / Compose | Docker `29.9.3` (build `5457199`) / Docker Compose `v5.7.1` | `docker --version`, `docker compose version` |
| Node.js | `v25.9.0` | `node -v` |
| Java JDK | OpenJDK `25.0.5` Temurin LTS (`25.0.5+8-LTS`) | `java -version` |

### 1.2 Pristine Seed Volume (Fresh `docker compose down -v && docker compose up -d --build --wait`)

Exact row counts queried from `rikkeijobs` immediately after clean stack startup and dev startup skill recomputation (`SELECT COUNT(*) FROM <table>`):

| Table | Rows | Table | Rows |
|---|---:|---|---:|
| `roles` | `5` | `target_positions` | `4` |
| `users` | `9` | `position_skills` | `21` |
| `skills` | `20` | `candidate_targets` | `0` |
| `candidate_profiles` | `3` | `gap_results` | `0` |
| `skill_mappings` | `18` | `companies` | `2` |
| `external_records` | `17` | `jobs` | `12` |
| `skill_evidences` | `39` | `job_skills` | `39` |
| `skill_scores` | `28` | `job_recommendations` | `0` |
| `evaluation_templates` | `2` | `internships` | `0` |
| `evaluation_criteria` | `10` | `internship_tasks` | `0` |
| `evaluations` | `3` | `used_sso_tickets` | `0` |
| `evaluation_scores` | `12` | `password_reset_tokens` | `0` |
| `flyway_schema_history` | `15` | | |

---

## 2. Backend Baseline

### 2.1 Cold Start, Idle Footprint, and Runtime Configuration

- **Spring Boot Cold Start** (`docker logs rikkei-backend`):
  - `Started RikkeiJobsApplication in 9.605 seconds (process running for 10.916)`
  - Followed by dev startup `SkillRecomputeService` for users `1`, `2`, `3` (`~70 ms` total).
- **Idle Container Memory, Native Process RSS, and JVM Heap** (post-startup idle on unmodified `docker-compose.yml`):
  - `rikkei-backend` (`JAVA_OPTS="-XX:+UseZGC -Xms256m -Xmx512m"`):
    - Container cgroup (`docker stats --no-stream`): `716.7 MiB` (`0.48%` CPU, `49` PIDs; `/sys/fs/cgroup/memory.current = 753,233,920 B` / `718.34 MiB`; initial pre-warm run recorded `771.6 MiB`).
    - Native process RSS (`docker exec rikkei-backend cat /proc/1/status` PID 1 `java`): `VmRSS = 746,952 kB` (`729.45 MiB`), `VmHWM = 748,028 kB` (`730.50 MiB`), `RssAnon = 262,344 kB` (`256.20 MiB`), `RssFile = 23,424 kB` (`22.88 MiB`), `RssShmem = 461,184 kB` (`450.38 MiB` from ZGC multi-mapped `/memfd:java_heap` virtual backing), `Threads = 49`.
    - JVM Heap & Non-Heap (measured via temporary JMX env-override pass on `127.0.0.1:9010`, deleted afterwards): `HeapMemoryUsage used = 134,217,728 B` (`128.00 MiB`), `committed = 444,596,224 B` (`424.00 MiB`), `max = 536,870,912 B` (`512.00 MiB`); `NonHeapMemoryUsage used = 154,028,880 B` (`146.90 MiB`), `committed = 158,662,656 B` (`151.31 MiB`).
  - `rikkei-postgres`: `58.74 MiB` (`0.02%` CPU, `19` PIDs)
  - `rikkei-frontend`: `8.672 MiB` (`0.00%` CPU, `11` PIDs)
  - `rikkei-mock`: `22.42 MiB` (`0.00%` CPU, `7` PIDs)
  - `rikkei-mailpit`: `10.67 MiB` (`2.38%` CPU, `12` PIDs)
- **Runtime Pool / Timeout / Server Config** (`backend/src/main/resources/application.yml` and `application-dev.yml`):
  - `spring.datasource.hikari.maximum-pool-size`: `10`
  - `spring.datasource.hikari.connection-timeout`: `5000 ms`
  - `spring.jpa.open-in-view`: `false`
  - `server.tomcat.max-swallow-size`: `5MB` (Tomcat thread pool, `server.compression`, `server.shutdown`, and `spring.threads.virtual.enabled` are not explicitly customized — using Spring Boot defaults)
  - `external.api.timeout-seconds`: `5`, `max-retries`: `2`; `cloudinary.timeout-seconds`: `5`; `ai.timeout-seconds`: `10`; `spring.mail.properties.mail.smtp.*timeout`: `5000 ms`
  - `application-dev.yml` sets `logging.level.com.rikkei.jobs: DEBUG` and `org.springframework.security: DEBUG`.

### 2.2 Steady-State Endpoint Latency & Throughput (`>= 5` Runs Median)

Command executed against live `http://127.0.0.1:3000`:

```bash
node scripts/platform1-load-ramp.mjs --mode endpoints --runs 5
```

Each endpoint ran a discarded warmup (`5` requests) followed by `5` measured sequential runs (`25` requests/run for reads, `10` requests/run for auth/writes). Spread % is computed as `(max - min) / median * 100`. Per **C3b**, metrics with run-to-run spread `> 10%` are explicitly flagged (`[VAR > 10%]`) and cannot alone justify an optimization claim without tightening variance or exceeding error-elimination criteria.

| Endpoint | Req/Run | Med okRPS | okRPS Range (Spread %) | Med p50 (ms) | Med p95 (ms) | p95 Spread % | Med p99 (ms) | 2xx / 4xx / 5xx | C3b Flag |
|---|---:|---:|---|---:|---:|---:|---:|---|---|
| `GET /api/v1/health` | 25 | `151.00` | `139.92..180.25` (`26.71%`) | `6.56` | `7.88` | `39.72%` | `8.30` | `125 / 0 / 0` | `[VAR > 10%]` |
| `POST /api/v1/auth/login` (`hr2`) | 10 | `14.42` | `14.38..14.69` (`2.15%`) | `68.74` | `72.50` | `8.46%` | `72.50` | `50 / 0 / 0` | `<= 10%` (`n=10`: `p95==p99==max`) |
| `POST /api/v1/auth/login` (`candidate1`) | 10 | `14.82` | `13.91..15.00` (`7.35%`) | `67.19` | `70.03` | `31.97%` | `70.03` | `50 / 0 / 0` | `p95 [VAR > 10%]` (`n=10`: `p95==p99==max`) |
| `POST /api/v1/auth/sso` (pre-minted) | 10 | `62.11` | `55.12..71.53` (`26.42%`) | `15.88` | `17.87` | `23.45%` | `17.87` | `50 / 0 / 0` | `[VAR > 10%]` (`n=10`: `p95==p99==max`) |
| `GET /api/v1/jobs/1` | 25 | `95.72` | `92.98..101.64` (`9.05%`) | `10.21` | `12.54` | `13.96%` | `12.88` | `125 / 0 / 0` | `p95 [VAR > 10%]` |
| `GET /api/v1/me/job-recommendations?limit=6` | 25 | `64.62` | `53.44..68.54` (`23.37%`) | `15.46` | `19.10` | `39.74%` | `19.33` | `125 / 0 / 0` | `[VAR > 10%]` |
| `GET /api/v1/profiles/me/skills` | 25 | `97.42` | `76.55..107.96` (`32.24%`) | `10.10` | `12.00` | `55.67%` | `12.64` | `125 / 0 / 0` | `[VAR > 10%]` |
| `GET /api/v1/me/gap-analysis` | 25 | `69.82` | `65.78..77.79` (`17.20%`) | `13.76` | `17.30` | `32.20%` | `18.99` | `125 / 0 / 0` | `[VAR > 10%]` |
| `GET /api/v1/profiles/1/evaluations` | 25 | `102.25` | `89.07..125.57` (`35.70%`) | `9.86` | `12.40` | `39.52%` | `14.50` | `125 / 0 / 0` | `[VAR > 10%]` |
| `GET /api/v1/profiles/me/internships` | 25 | `32.62` | `28.39..37.65` (`28.39%`) | `29.71` | `35.81` | `57.11%` | `43.68` | `125 / 0 / 0` | `[VAR > 10%]` |
| `GET /api/v1/companies/me` | 25 | `154.87` | `149.94..179.70` (`19.22%`) | `6.26` | `7.72` | `40.67%` | `9.30` | `125 / 0 / 0` | `[VAR > 10%]` |
| `PUT /api/v1/me/target` | 10 | `104.82` | `101.27..111.40` (`9.66%`) | `9.37` | `10.82` | `16.91%` | `10.82` | `50 / 0 / 0` | `p95 [VAR > 10%]` (`n=10`: `p95==p99==max`) |
| `PUT /api/v1/companies/me` | 10 | `116.33` | `107.33..119.15` (`10.16%`) | `8.22` | `10.35` | `18.65%` | `10.35` | `50 / 0 / 0` | `[VAR > 10%]` (`n=10`: `p95==p99==max`) |
| `POST /api/v1/profiles/me/skills/recompute` | 10 | `47.36` | `38.71..62.81` (`50.89%`) | `19.20` | `29.55` | `51.74%` | `29.55` | `50 / 0 / 0` | `[VAR > 10%]` (`n=10`: `p95==p99==max`) |

Note on variance and small-`n` percentiles: For `n = 10` (`auth`/`write` scenarios), nearest-rank percentile `Math.ceil((p / 100) * 10) - 1` yields index `9` for both `p95` and `p99`, so `p95 == p99 == max` by definition. With `10–25` sequential requests per run on sub-`25 ms` endpoints under Docker Desktop WSL2, single-request OS/loopback jitter (`5–15 ms`) produces `> 10%` spread across runs. Longer steady-state runs should be paired with **C3b** deterministic query-count reductions (`>= 5 queries/request`) where applicable.

### 2.3 SQL Query Counts per Endpoint (Measured via Temporary PostgreSQL `log_statement = 'all'`)

Measured by temporarily enabling `ALTER SYSTEM SET log_statement = 'all'` on `rikkei-postgres`, sending one clean HTTP request per endpoint, counting executed SQL statements (excluding `BEGIN`/`COMMIT` transaction control), and immediately resetting `log_statement` before any benchmark runs:

| Endpoint | Executed SQL Statements | Breakdown / Observed Bottlenecks |
|---|---:|---|
| `GET /api/v1/health` | `1` | `SELECT COUNT(*) FROM flyway_schema_history WHERE success = true` |
| `POST /api/v1/auth/login` | `1` | `users JOIN roles` lookup + BCrypt strength-10 verification (`~70 ms` CPU) |
| `POST /api/v1/auth/sso` | `5` | `INSERT used_sso_tickets` + external HTTP `/lms/sso/verify` + `roles` + `users` + `roles` + `users JOIN roles` |
| `GET /api/v1/jobs/1` | `4` | `JwtAuthFilter` (`users JOIN roles`) + `jobs` + `job_skills` + `skills` |
| `GET /api/v1/me/job-recommendations?limit=6` (cold miss) | `20` | `JwtAuthFilter` + `job_recommendations` + `skill_scores` + `skills` + `jobs` + `job_skills` + `skills` + `10x INSERT job_recommendations` + `DELETE` |
| `GET /api/v1/me/job-recommendations?limit=6` (warm hit) | `9` | `JwtAuthFilter` + `job_recommendations` + `skill_scores` + `MAX(updated_at)` + `jobs` + `job_skills` + `skills` + duplicate `skill_scores` + duplicate `skills` |
| `GET /api/v1/profiles/me/skills` | `4` | `JwtAuthFilter` + `skill_scores` + `skill_evidences` + `skills` |
| `GET /api/v1/me/gap-analysis` | `12` | `JwtAuthFilter` + `pg_advisory_xact_lock` + target/position/skills/scores (`5` selects) + `DELETE gap_results` + `2x SELECT gap_results` (Hibernate `isNew` check) + `2x INSERT gap_results` |
| `GET /api/v1/profiles/1/evaluations` | `5` | `JwtAuthFilter` + `COUNT(*) users` + 4-way join `evaluations` + `users WHERE id IN (...)` + N+1 `roles WHERE id = $1` |
| `GET /api/v1/profiles/me/internships` (warm) | `46` | `JwtAuthFilter` + `COUNT(*) users` + duplicate `users JOIN roles` + HTTP call to PM mock + `internships` + `3x internship_tasks` + `external_records` update + `skill_evidences` delete + `17x` insert + `13x` `skill_scores` update + final read |
| `GET /api/v1/companies/me` | `2` | `JwtAuthFilter` (`users JOIN roles`) + `companies` |
| `PUT /api/v1/me/target` | `7` | `JwtAuthFilter` + `pg_advisory_xact_lock` + `candidate_targets` + `target_positions` + `position_skills` + `skills` + `UPDATE candidate_targets` |
| `POST /api/v1/profiles/me/skills/recompute` | `39` | `JwtAuthFilter` + `DELETE skill_evidences` + `skill_mappings` + `external_records` + `17x INSERT` + `2x SELECT` + `13x UPDATE skill_scores` + `3x` read-back |

### 2.4 `EXPLAIN (ANALYZE, BUFFERS)` Summaries on Core Queries

| Query | Plan & Scan Type | Actual Rows | Buffers | Execution Time | Observation |
|---|---|---:|---|---:|---|
| `findOpenJobs` (`jobs WHERE status = 'APPROVED' AND deadline > NOW()`) | `Index Scan using idx_jobs_status_deadline` | `10` | `shared hit=2` | `0.062 ms` | Indexed composite scan |
| `findOpenJobs_skills` (`job_skills WHERE job_id IN (...)`) | `Bitmap Heap Scan` on `idx_job_skills_job_id` | `39` | `shared hit=2` | `0.043 ms` | Indexed scan |
| `findLatestUpdatedAt` (`SELECT MAX(updated_at) FROM jobs`) | `Aggregate` -> `Seq Scan on jobs` | `1` | `shared hit=1` | `0.047 ms` | No index on `jobs.updated_at` (`Seq Scan` grows with table size) |
| `job_recommendations` (`WHERE user_id = 1 ORDER BY score DESC, job_id`) | `Sort (quicksort)` -> `Bitmap Heap Scan` (`idx_job_recommendations_user_id`) | `10` | `shared hit=11` | `0.119 ms` | Extra sort step (`idx` is only on `user_id`) |
| `auth_user_role_lookup` (`users JOIN roles WHERE u.id = 1`) | `Nested Loop` -> `Seq Scan on users` + `Index Scan` on `roles` primary key | `1` | `shared hit=3` | `0.068 ms` | `9` rows in `users`; executed on every authenticated API request |
| `gap_target_lookup` (`candidate_targets WHERE user_id = 1`) | `Index Scan` on `candidate_targets` primary key | `1` | `shared hit=5` | `0.067 ms` | PK lookup |
| `gap_position_skills` (`position_skills WHERE position_id = 1`) | `Bitmap Heap Scan` (`idx_position_skills_position_id`) | `7` | `shared hit=5` | `0.059 ms` | Indexed scan |
| `gap_skill_scores` (`skill_scores WHERE user_id = 1`) | `Bitmap Heap Scan` on `skill_scores` primary key | `13` | `shared hit=5` | `0.067 ms` | PK prefix scan |
| `evaluations` (`evaluations LEFT JOIN ... WHERE user_id = 1 AND status = 'SUBMITTED'`) | `Unique` -> `Sort` -> `Nested Loop` (`idx_evaluations_user_status`) | `5` | `shared hit=44` | `0.301 ms` | `527` planning buffer hits across 5 joined tables |
| `internships` (`internships LEFT JOIN internship_tasks WHERE user_id = 1`) | `Sort` -> `Nested Loop` (`idx_internships_user_id`, `idx_internship_tasks_internship_id`) | `3` | `shared hit=10` | `0.112 ms` | Indexed join |

---

## 3. Frontend Baseline

### 3.1 Production Build Bundle Sizes (`npm --prefix frontend run build`)

- **Build Duration**: `9.61 s` total (`tsc -b && vite build`; Vite bundling step `410 ms`, `116` modules transformed).
- **Bundle Totals**: `1,065,991 B` (`1,041.01 KiB`) raw across all `50` `dist/` files, `614,677 B` (`600.27 KiB`) gzip level-9 (`431,748 B` / `421.63 KiB` of total raw size is self-hosted `.woff2` fonts).

| Asset / Chunk | Raw Size (B) | Gzip Size (B) | Notes |
|---|---:|---:|---|
| `dist/index.html` | `1,536` | `625` | Entry HTML (`vite` `0.62 kB` gzip) |
| `dist/assets/index-*.js` | `320,279` | `98,535` | Main entry JS (`vite` `99.75 kB` gzip) |
| `dist/assets/index-*.css` | `84,926` | `13,968` | Main entry CSS (`vite` `14.10 kB` gzip) |
| `dist/assets/CompanyProfilePage-*.js` | `27,726` | `7,547` | Largest lazy route JS chunk |
| `dist/assets/CandidateHomePage-*.js` | `20,230` | `5,221` | Candidate home lazy JS chunk |
| `dist/assets/Icon-*.js` | `16,429` | `5,329` | Shared icon SVG path chunk |
| `dist/assets/Select-*.js` | `11,144` | `4,053` | Custom accessible combobox JS |
| `dist/assets/CompanyProfilePage-*.css` | `11,938` | `2,367` | Largest lazy CSS chunk |
| Remaining lazy route JS/CSS chunks (`32` files) | `137,671` | `43,210` | Per-route & feature-slice split chunks (incl. `Select-*.css` `6,474 B` / `1,506 B` gz9) |
| Self-hosted WOFF2 fonts (`8` files) | `431,748` | `431,589` | `BeVietnamPro`, `PlusJakartaSans`, `JetBrainsMono` |
| Favicons (`favicon.png`, `favicon.svg`) | `2,364` | `2,233` | Root icon assets |

### 3.2 Live Headless Chromium Performance (`5` Runs Each, Cold & Warm)

Measured against `http://127.0.0.1:3000` at `1440x900` via Playwright headless Chromium (`PerformanceObserver` + `NavigationTiming` + `ResourceTiming` + `requestAnimationFrame` 45-frame sampling):

| Scenario | Metric | Min | Median | Max | Spread % | Notes |
|---|---|---:|---:|---:|---:|---|
| **Cold `/login`** (5 fresh contexts) | `LCP` (ms) | `700.00` | `712.00` | `896.00` | `27.53%` | `[VAR > 10%]` |
| Cold `/login` | `CLS` | `0.00` | `0.00` | `0.00` | `0.00%` | Zero layout shift |
| Cold `/login` | `TBT` (ms) / Long Tasks | `0.00` / `0` | `0.00` / `0` | `0.00` / `0` | `0.00%` | Zero long tasks (`> 50 ms`) |
| Cold `/login` | `DCL` / `Load` (ms) | `67.50` / `67.50` | `75.60` / `75.60` | `153.90` / `153.90` | `114.29%` | `[VAR > 10%]` |
| Cold `/login` | Transferred / Encoded (B) | `324,942` / `321,942` | `324,942` / `321,942` | `324,942` / `321,942` | `0.00%` | Deterministic wire size |
| Cold `/login` | Frame Time `p50` / `p95` / `max` (ms) | `16.70` / `16.70` / `16.80` | `16.70` / `16.70` / `16.80` | `16.70` / `16.80` / `16.80` | `0.00%`–`0.60%` | Stable `60 fps` |
| **Warm `/login`** (cached context) | `LCP` (ms) | `620.00` | `620.00` | `920.00` | `48.39%` | `[VAR > 10%]` |
| Warm `/login` | `CLS` / `TBT` (ms) | `0.00` / `0.00` | `0.00` / `0.00` | `0.00` / `117.00` | `500.00%` (mean fallback) | `[VAR > 10%]` on TBT (`med=0`, `1` run saw `2` long tasks totaling `117 ms`) |
| Warm `/login` | Transferred (B) | `300` | `300` | `41,064` | `13588.00%` | `[VAR > 10%]` Disk-cached assets (`304`/cache hit) |
| Warm `/login` | Frame Time `p50` / `p95` (ms) | `16.70` / `16.70` | `16.70` / `16.70` | `16.70` / `16.80` | `0.00%`–`0.60%` | Stable `60 fps` |
| **Post-Login `/candidate`** | Login-to-Settled (ms) | `568.91` | `572.33` | `1,262.70` | `121.22%` | `[VAR > 10%]` |
| Post-Login `/candidate` | `CLS` / `TBT` (ms) | `0.00` / `0.00` | `0.00` / `0.00` | `0.00` / `8.00` | `500.00%` (mean fallback) | `CLS = 0`; `[VAR > 10%]` on TBT spike (`max = 8.00 ms`) |
| Post-Login `/candidate` | Frame Time `p50` / `p95` (ms) | `16.70` / `16.70` | `16.70` / `33.40` | `16.70` / `50.00` | `99.70%` | `[VAR > 10%]` Occasional frame drop during route mount |

- **Chromium CDP JS Execution, Layout, and Render Hot Spots (`5` Runs Each, `100 us` CPU Sampling)**:

| Scenario | CDP Metric | Min | Median | Max | Spread % | C3b Flag / Hot Spot Detail |
|---|---|---:|---:|---:|---:|---|
| **Cold `/login`** (`234` DOM nodes) | `ScriptDuration` (ms) | `24.57` | `32.87` | `36.13` | `35.17%` | `[VAR > 10%]` (`JSHeapUsedSize` med `3.39 MiB`, `2.95%` spread) |
| Cold `/login` | `LayoutDuration` / `RecalcStyleDuration` (ms) | `16.66` / `10.39` | `19.70` / `11.30` | `22.35` / `14.04` | `28.88%` / `32.30%` | `[VAR > 10%]` (`27–29` layouts, `41–44` style recalcs) |
| Cold `/login` | `TaskDuration` (ms) | `112.53` | `115.26` | `146.80` | `29.73%` | `[VAR > 10%]` |
| **Warm `/login`** (`234` DOM nodes) | `ScriptDuration` (ms) | `28.59` | `31.54` | `41.86` | `42.07%` | `[VAR > 10%]` (`300 B` transferred per warm tab) |
| Warm `/login` | `LayoutDuration` / `RecalcStyleDuration` (ms) | `16.97` / `10.33` | `18.67` / `10.95` | `19.39` / `11.39` | `12.96%` / `9.68%` | `Layout [VAR > 10%]`, `RecalcStyle <= 10%` |
| Warm `/login` | `TaskDuration` (ms) | `106.34` | `113.48` | `122.74` | `14.45%` | `[VAR > 10%]` |
| **Post-Login `/candidate`** (`1,009` DOM nodes) | `ScriptDuration` (ms) | `37.15` | `44.97` | `76.31` | `87.08%` | `[VAR > 10%]` (`JSHeapUsedSize` med `4.61 MiB`, `1.08%` spread; separate CPU-profile trace recorded `19.57 ms`) |
| Post-Login `/candidate` | `LayoutDuration` / `RecalcStyleDuration` (ms) | `36.83` / `18.76` | `39.53` / `21.57` | `42.23` / `32.84` | `13.66%` / `65.28%` | `[VAR > 10%]` (`34–37` layouts, `35–38` style recalcs) |
| Post-Login `/candidate` | `TaskDuration` (ms) | `138.42` | `155.48` | `222.89` | `54.33%` | `[VAR > 10%]` |

- **Observed Render Hot Spots (CDP CPU Profile on `/candidate` Mount, `470.87 ms` sampling window)**:
  - Bundle evaluation & React runtime (`assets/index-*.js` module eval `29.75 ms` self-time `6.3%` + React reconciliation/commit `yl`/`Ou`/`kf`/`$o` `~7.23 ms`).
  - Skill label/category mapping (`assets/skillLabels-*.js` `15.28 ms` self-time, `3.2%`).
  - Synchronous DOM layout measurement & insertion (`getBoundingClientRect` `1.76 ms`, `appendChild` `1.58 ms`; `39.53 ms` median `LayoutDuration` across `34–37` layout passes).

- **Observed API Request Waterfall on `/candidate` (Run 5 sample)**:
  1. `POST /api/v1/auth/login`: `657.5 -> 736.6 ms` (`79.1 ms`)
  2. Parallel batch 1: `GET /api/v1/profiles/me/skills` (`18.0 ms`), `GET /api/v1/me/target` (`16.7 ms`), `GET /api/v1/profiles/1/evaluations` (`17.1 ms`), `GET /api/v1/me/job-recommendations?limit=3` (`30.5 ms`, finishes at `846.4 ms`)
  3. **Waterfall delay**: `GET /api/v1/me/gap-analysis` only starts at `848.5 ms` (`-> 876.0 ms`, `27.5 ms`) **after** the slowest call in `Promise.all` (`job-recommendations`) completes, instead of chaining immediately off `fetchMyTarget`.

---

## 4. Delivery, Infrastructure, Nginx, and Quality Suites Baseline

### 4.1 Docker Images, Build Times, and Nginx Headers

| Artifact / Check | Baseline Measurement | Notes |
|---|---|---|
| `rikkei-jobs-backend` image size | `561 MB` | `eclipse-temurin:25.0.5_8-jre-alpine-3.21`, `sh -c` entrypoint (sh -c execs java as PID 1), fat JAR |
| `rikkei-jobs-mock` image size | `260 MB` | `node:24.22.2-alpine3.23` |
| `rikkei-jobs-frontend` image size | `96.4 MB` | `nginx:1.30.6-alpine3.24` |
| `postgres:18.6-alpine` / `mailpit:v1.33.1` | `433 MB` / `53 MB` | Pinned upstream images |
| `docker compose down -v` | `6.01 s` | Clean teardown |
| `docker compose up -d --build --wait` (cached layers) | `29.73 s` | Full 5-service healthy wait |

**Nginx `curl -I -H "Accept-Encoding: gzip"` Header Findings (`frontend/nginx.conf`)**:

- `GET /`: returns `Content-Encoding: gzip`, `Cache-Control: no-cache`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`. Missing `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`.
- `GET /assets/index-*.js` and `.css`: returns `Content-Encoding: gzip`, **duplicate `Cache-Control` headers** (`Cache-Control: max-age=2592000` from `expires 1M` + `Cache-Control: public`), missing `immutable`, and **all security headers from `server {}` are dropped** because `location ~* \.(...)$` declares its own `add_header`.
- `GET /api/v1/health`: returns `Content-Encoding: gzip`, duplicate `X-Content-Type-Options: nosniff`, conflicting `X-Frame-Options: DENY` + same-origin framing policy, and conflicting `X-XSS-Protection: 0` + `1; mode=block`.
- Upstream proxy: `set $backend_upstream http://backend:8080; proxy_pass $backend_upstream;` disables HTTP `keep-alive` pooling to backend (`proxy_connect_timeout 5s`, `proxy_read_timeout 60s`).

### 4.2 Quality Gate & Automated Test Suite Baselines

Note: Timings in this table reflect single-run (`1` run) durations for full heavy test/gate suites rather than 5-run medians, with deterministic pass/fail and test counts recorded per **C3b**.

| Suite / Gate | Command | Runs | Duration | Result & Counts |
|---|---|---:|---:|---|
| Full Local Gate Suite (PowerShell) | `powershell -NoProfile -ExecutionPolicy Bypass -File .\check.ps1` | `1` | `732.20 s` | `26/26` active gates `PASS` (exit `0`) |
| Full Local Gate Suite (Git Bash) | `bash ./check.sh` (Git Bash `5.3.15` on Windows) | `1` | `470.15 s` | `26/26` active gates parity (`PASS`, exit `0`; Docker linters mounted via `pwd -W` + `MSYS_NO_PATHCONV=1`) |
| Mock Service Tests | `npm --prefix mock test` | `1` | `3.56 s` | `8/8` criteria `PASS` |
| Frontend ESLint | `npm --prefix frontend run lint` | `1` | `11.12 s` | `0` errors |
| Frontend Typecheck | `npm --prefix frontend run typecheck` | `1` | `0.71 s` | `0` errors |
| Frontend Vitest | `npm --prefix frontend run test -- --run` | `1` | `32.33 s` (`33.60 s` wall) | `36/36` files, `440/440` tests `PASS` (`jsdom` recreated `36` times = `56%` of time) |
| Frontend Prod Build | `npm --prefix frontend run build` | `2` | `8.50–9.61 s` | `116` modules (`410–487 ms` Vite bundle) |
| Backend Spotless | `.\mvnw.cmd spotless:check` | `1` | `8.98 s` | `305` files clean `PASS` |
| Backend SpotBugs | `.\mvnw.cmd spotbugs:check` | `1` | `6.42 s` | `0` bugs/errors `PASS` |
| Backend Compile | `.\mvnw.cmd clean test-compile` | `1` | `13.01 s` | `239` main + `66` test files clean `PASS` |
| Backend Test Suite | `.\mvnw.cmd test` | `1` | `493.45 s` (`08:10 min`) | `701/701` tests `PASS`, `0` skipped (`30 s` Surefire fork exit wait + Testcontainers Hikari warnings) |
| Opaque-Box E2E Suite | `node e2e/run-all.mjs` (pristine Docker seed) | `1` | `43.22 s` (`43.44 s` wall) | `27/27` suites, `329` cases, `2020` assertions `PASS`, `0` skipped |

---

## 5. C1b Concurrency Ramp Baseline & Overload Behavior

Executed against the live Docker stack (`http://127.0.0.1:3000`) after warmup (`5` VUs for `3000 ms`) using a weighted mixed read/write workload (`GET /jobs/1`, `GET /me/job-recommendations?limit=6`, `GET /profiles/me/skills`, `GET /me/gap-analysis`, `GET /profiles/{id}/evaluations`, `GET /profiles/me/internships`, `GET /companies/me`, `PUT /me/target`, `POST /auth/login`) across `candidate1..3` and `hr2` (`5` runs x `3500 ms` per VU step). Note: running this harness mutates `7` dynamic tables (`candidate_targets`, `gap_results`, `internships`, `internship_tasks`, `job_recommendations`, `used_sso_tickets`, `companies.version`), so the stack must be reset (`docker compose down -v && docker compose up -d --build --wait`) whenever a pristine seed database is required.

```bash
node scripts/platform1-load-ramp.mjs --mode ramp --runs 5 --steps 1,5,10,25,50,100,200 --step-duration-ms 3500
```

| VUs | Med okRPS (totalRPS) | okRPS Spread % | Med p50 / p95 / p99 (ms) | p95 Spread % | Med / Max Err % | 502 / Timeout / Conn | Backend CPU / Mem / PIDs | Postgres CPU / Mem / `pg_stat_activity` (Med -> Peak active/idle/idleInTx/wait) | Nginx CPU / Mem | C3b Flag |
|---:|---:|---:|---|---:|---|---|---|---|---|---|
| `1` | `84.14` (`84.14`) | `23.71%` | `7.59` / `34.82` / `67.31` | `110.94%` | `0.00%` / `0.00%` | `0 / 0 / 0` | `39.87%` / `813 MiB` / `56` | `12.72%` / `76.1 MiB` / `0/10/0/0` -> `0/10/1/0` (`3` samples) | `1.48%` / `10.36 MiB` | `[VAR > 10%]` |
| `5` | `402.77` (`402.77`) | `11.57%` | `8.08` / `39.33` / `79.60` | `29.34%` | `0.00%` / `0.00%` | `0 / 0 / 0` | `363.26%` / `823.4 MiB` / `57` | `21.72%` / `77.25 MiB` / `0/7/3/0` -> `0/7/4/0` (`3` samples) | `6.66%` / `11.61 MiB` | `[VAR > 10%]` |
| `10` | `483.71` (`483.71`) | `59.94%` | `15.91` / `57.80` / `94.65` | `36.59%` | `0.00%` / `0.00%` | `0 / 0 / 0` | `353.55%` / `815.8 MiB` / `57` | `91.27%` / `91.19 MiB` / `1/7/2/0.5` -> `2/9/3/1` (`2` samples) | `171.54%` / `13.41 MiB` | `[VAR > 10%]` |
| `25` | `625.33` (`625.33`) | `26.68%` | `32.61` / `94.18` / `133.95` | `19.77%` | `0.00%` / `0.00%` | `0 / 0 / 0` | `456.22%` / `822 MiB` / `74` | `91.57%` / `92.18 MiB` / `2/5/3/0.5` -> `2/6/4/1` (`2` samples) | `251.00%` / `15.86 MiB` | `[VAR > 10%]` |
| `50` | `444.73` (`972.35`) | `108.15%` | `45.02` / `118.88` / `156.89` | `29.86%` | `59.59%` / `87.63%` | `10,831 / 0 / 0` | `585.18%` / `826.9 MiB` / `103` | `13.37%` / `92.89 MiB` / `2/2/6/1` -> `3/3/6/2` (`2` samples) | `95.33%` / `16.64 MiB` | `[VAR > 10%]` |
| `100` | `604.91` (`865.58`) | `58.99%` | `91.86` / `282.74` / `390.30` | `33.61%` | `18.15%` / `61.89%` | `5,182 / 0 / 0` | `539.08%` / `835.4 MiB` / `158` | `87.54%` / `93.62 MiB` / `3/1.5/5.5/1.5` -> `4/2/7/2` (`2` samples) | `281.45%` / `17.80 MiB` | `[VAR > 10%]` |
| `200` | `662.01` (`668.31`) | `30.94%` | `241.75` / `669.38` / `913.51` | `13.84%` | `0.00%` / `45.12%` | `1,499 / 0 / 0` | `192.54%` / `850.3 MiB` / `247` | `34.30%` / `94.73 MiB` / `2.5/1/6.5/1.5` -> `3/1/7/3` (`2` samples) | `417.95%` / `20.75 MiB` | `[VAR > 10%]` |

### 5.1 Backend Pool, Thread/Executor Queue, and ZGC GC Telemetry (Temporary Env-Override Pass)

Because `application.yml` only exposes Actuator `health,info` and `RoutePolicyRegistry` denies unauthenticated `/actuator/metrics` requests, internal JVM/Hikari/Tomcat/ZGC metrics were captured in a dedicated temporary env-override telemetry pass (using an external compose override in `$env:TEMP` setting `JAVA_OPTS="-XX:+UseZGC -Xms256m -Xmx512m -Xlog:gc*:stdout:time,uptime,level,tags -Dcom.sun.management.jmxremote ..."` on `127.0.0.1:9010`, `SPRING_DATASOURCE_HIKARI_REGISTER_MBEANS=true`, and `SERVER_TOMCAT_MBEANREGISTRY_ENABLED=true`, polled at `100 ms` intervals via JMX, then torn down cleanly before default measurements):

| VUs | JMX Samples | Max Heap Used (MiB) | Hikari Active (Med / Max of `10`) | Hikari `ThreadsAwaitingConnection` (Med / Max) | Tomcat Busy Threads (Med / Max of `200`) | Tomcat Current Threads / Peak Connection Count | ZGC Minor / Major Pauses Delta |
|---:|---:|---:|---:|---:|---:|---|---:|
| `10` | `71` | `484.00` | `4` / `9` | `0` / `0` | `4` / `10` | `200` / `11` (`maxConnections=8192`) | `21` / `0` |
| `25` | `79` | `462.00` | `4` / `10` | `0` / `15` | `4` / `25` | `200` / `28` | `21` / `5` |
| `50` | `89` | `462.00` | `3` / `10` | `0` / `40` | `4` / `49` | `200` / `51` | `27` / `0` |
| `100` | `89` | `486.00` | `3` / `10` | `0` / `89` | `3` / `99` | `200` / `101` | `27` / `5` |
| `200` | `91` | `476.00` | `2` / `10` | `0` / `187` | `2` / `197` | `200` / `215` | `39` / `0` |

- **ZGC GC Pause Durations** (`-Xlog:gc*:stdout:time,uptime,level,tags` across `427` pause phases from startup through `200` VUs): `min = 0.008 ms`, `median = 0.037 ms`, `max = 0.514 ms` (e.g., `Pause Mark Start 0.028 ms`, `Pause Mark End 0.300 ms`, `Pause Relocate Start 0.019 ms`). ZGC STW pauses are sub-millisecond and not the concurrency bottleneck.
- **HikariCP & Tomcat Executor Queue Depth**: Under `25+` VUs, `HikariPool-1` (`maximumPoolSize=10`) hits `10/10` active connections (`6–7` held `idle in transaction` during mixed read/write/external-HTTP calls), queuing up to `15 -> 40 -> 89 -> 187` Tomcat worker threads in `ThreadsAwaitingConnection` while `Tomcat` `currentThreadsBusy` climbs from `25` to `197/200` (`acceptCount=100` socket backlog not yet overflowed since `currentThreadsBusy < 200`).

### 5.2 Knee, Max Sustainable Throughput, and Root Cause

- **Max Sustainable Throughput (`0%` and `< 1%` error thresholds, locked prior to knee)**: `25 VUs` at `625.33 okRPS` median (`p50 = 32.61 ms`, `p95 = 94.18 ms`, `0` errors across `10,898` requests in the clean baseline run).
- **Detected Knee**: **`50 VUs`** in the clean baseline run (`444.73 okRPS` / `972.35 totalRPS`, **`59.59%` median error, `87.63%` max error, `10,831` HTTP 502 responses across `18,091` requests**), followed by `5,182` HTTP 502s at `100 VUs` and `1,499` HTTP 502s at `200 VUs` (`0%` median error but `45.12%` max error). Note: because Nginx ephemeral port exhaustion is driven by cumulative `TIME_WAIT` sockets and burst rate, an earlier verification run with a higher `25 VUs` spike (`736.35 totalRPS`) observed `4,033` HTTP 502s starting at `25 VUs` (`0%` median, `89.61%` max error).
- **Root Cause Verified in `docker logs rikkei-frontend`**:
  - `connect() to 172.25.0.5:8080 failed (99: Address not available) while connecting to upstream`
  - Because `frontend/nginx.conf` proxies `/api/` via a dynamic variable (`set $backend_upstream http://backend:8080; proxy_pass $backend_upstream;`) with no `upstream` block or `keep-alive` pool, every API request opens a new ephemeral TCP port in the `rikkei-frontend` container. Once `TIME_WAIT` sockets exhaust the container ephemeral port range (`Address not available` / errno 99), Nginx fails fast with `502 Bad Gateway` before traffic reaches Tomcat/Hikari (and behind Nginx, Hikari's `10`-connection pool becomes the secondary bottleneck at `25+` VUs).
- **Recovery After Peak `200 VUs` Load**:
  - After waiting `2000 ms`, `GET /api/v1/health` returned `200` in `5.29 ms`, `GET /api/v1/jobs/1` returned `200` in `5.71 ms`, and `GET /api/v1/me/gap-analysis` returned `200` in `15.24 ms`.

### 5.3 Concurrency Safety & Optimistic Locking Baseline

Command executed: `node scripts/platform1-load-ramp.mjs --mode concurrency`:

| Check | Parallel Burst | Observed HTTP Statuses | DB Integrity Check |
|---|---|---|---|
| `PUT /api/v1/companies/me` (same stale `version`) | `5` identical concurrent requests | `[200, 409, 409, 409, 409]` | Optimistic locking `@Version` rejects stale concurrent updates cleanly with `409` |
| `POST /api/v1/auth/sso` (same freshly minted ticket) | `5` identical concurrent requests | `[200, 401, 401, 401, 401]` | `used_sso_tickets` `REQUIRES_NEW` prevents replay (`TICKET_ALREADY_USED`) |
| `PUT /api/v1/me/target` (`positionId: 1` for `candidate1`) | `10` identical concurrent requests | `[200 x 10]` | `candidate_targets` row count for `user_id=1` remained `1` (no duplicate rows) |

### 5.4 Single-Local-Machine Limits Disclosure

All measurements in this baseline were collected on a single Windows 11 developer laptop running Docker Desktop (WSL2 Linux VM) alongside the Node.js load generator on the same CPU and memory (`0.63 GB` free host RAM post-startup). Container thread scheduling, loopback NAT, and host memory pressure introduce run-to-run jitter (`> 10%` spread on multiple runs, flagged per **C3b**). These numbers serve strictly as an apples-to-apples pre-optimization baseline on the same host and seed dataset, not as production capacity claims.

---

## PLATFORM-1-fix (T022DB0) — RED Reproductions & GREEN Measurements

All measurements below were collected directly on `chore/T022DB0-taste-skill-and-optimization` during `PLATFORM-1-fix` (reproducing each defect RED on the untouched `PLATFORM-1` stack first, then verifying GREEN on the fixed workspace).

### 1. F1 — Auth Rate Limiter (RED -> GREEN)

- **RED (Untouched `PLATFORM-1`, single 60s window `2026-11-23T08:11:02.296Z..08:11:04.767Z` via Nginx `:3000`)**:
  - `165` `POST /api/v1/auth/login` requests with distinct `X-Real-IP: 10.99.0.1..165` (`f1red_clean@rikkeijobs.test`): requests `1..160` returned `401`; **request `#161..#165` returned `429`** (`Retry-After: 56`, `{"code":"RATE_LIMITED","message":"Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau 56 giây."}`).
  - Immediately afterwards via `:3000`, a completely different email (`f1red_other_clean@rikkeijobs.test`, `X-Real-IP: 10.99.1.1`) also received **`429`** (`Retry-After: 56`), while direct `:8080` (Docker bridge peer IP) still returned **`401`**.
  - **E2E Login Telemetry (single-IP `172.24.0.1` within `42.84 s`)**: `145` total `POST /api/v1/auth/login` calls (`114 x 200`, `29 x 401`, `2 x 400`; `3` via `:3000`, `142` via `:8080`), with highest per-email counts at `hr1@rikkeijobs.test` (`36` total: `26 x 200`, `9 x 401`, `1 x 400`) and `hr2@rikkeijobs.test` (`34` total: `15 x 200`, `19 x 401` across 3-tier lockout tests).
- **GREEN (Unit/Integration + Live 2-IP Docker `:3000` + E2E)**:
  - **Live 2-IP Docker Proof via Nginx `:3000`** (`rikkei-network` `172.28.0.0/16`):
    - **Source A** (Host `172.28.0.1` -> `http://127.0.0.1:3000/api/v1/auth/login`):
      - `per-(IP, email)` (`candidate1@rikkeijobs.test`): failures `1..20` -> `401`; **attempt `21` -> `429`** (`Retry-After: 49`, `"Quá nhiều lần đăng nhập thất bại cho tài khoản này. Vui lòng thử lại sau 49 giây."`).
      - `per-IP` failure cap (`40` more `401`s across `spray2` & `spray3`): **attempt `61` on fresh email `spray4@rikkeijobs.test` -> `429`** (`Retry-After: 46`, `"Quá nhiều lần đăng nhập thất bại từ địa chỉ IP này. Vui lòng thử lại sau 46 giây."`); valid `hr2` login from Source A while blocked -> **`429`** (`Retry-After: 35`).
    - **Source B** (Throwaway `node:24.22.2-alpine3.23` container `rikkei-f1-source-b` on `172.28.0.7` -> `http://frontend:8080/api/v1/auth/login`, removed with `--rm`): while Source A received `429`, Source B received `401` (`ACCOUNT_LOCKED` on `candidate1`, `UNAUTHORIZED` on `spray4`) and **`200`** on `hr2@rikkeijobs.test`.
  - **Fresh Docker E2E with Rate Limiter ENABLED**: **`27/27` suites, `329` cases, `2020` assertions PASS** in `36.98 s` (`0` failed; earlier post-fix pass `40.59 s`).

### 2. F2 — Nginx Backend IP Pinning & Recovery (RED -> GREEN)

- **RED (Untouched `PLATFORM-1`, `frontend/nginx.conf` static `server backend:8080;`)**:
  - `rikkei-backend` IP `172.24.0.5` removed, `rikkei-f2-occupier` pinned to `172.24.0.5`, `rikkei-backend` recreated at `172.24.0.7` (healthy).
  - `17/17` probes of `GET http://127.0.0.1:3000/api/v1/health` at 2s intervals (`08:13:27Z..08:13:59Z`) returned **`502 Bad Gateway`** (`32.18 s+` continuous outage without restarting nginx).
- **GREEN (`resolver 127.0.0.11 valid=5s ipv6=off`, `zone backend_upstream 64k`, `server backend:8080 resolve`, `keepalive 64`)**:
  - **Live Backend-Recreate IP-Change Recovery** (`172.28.0.5` occupied -> recreated `rikkei-backend` at `172.28.0.7` without restarting `rikkei-frontend`, `StartedAt` unchanged at `2026-11-23T09:01:54.902544686Z`):
    - `t=+0.76s..+7.11s` (`4` probes while backend starting): `HTTP=502`
    - **`t=+9.23s`**: **`HTTP=200`** (`backend_health=starting` -> `healthy` at `t=+11.43s` & `t=+13.53s`, `HTTP=200`) — recovered in **`9.23 s <= 30 s`** without nginx restart.
  - **Load Ramp Benchmark (`node scripts/platform1-load-ramp.mjs --mode ramp --runs 5 --steps 1,5,10,25,50,100,200 --step-duration-ms 3500`)**:
    - Default rate-limiter-enabled pass: `5xx=0 [502=0], timeout=0, conn=0` across `1..200 VUs` (`4.88%..4.97%` expected `429` on `slot === 19` login burst > `160/60s` from `172.28.0.1`).
    - **3 Apples-to-Apples Passes (`APP_SECURITY_RATE_LIMIT_ENABLED=false` via `$env:TEMP` compose override)**:
      - Pass 1 (`200 VUs`): `okRPS=1062.49` (`5.38%` spread), `p50=171.75 ms`, **`p95=349.20 ms`** (`335.52, 346.55, 349.2, 365.2, 362.24`), `p99=458.33 ms`, **`0` errors**.
      - Pass 2 (`200 VUs`): `okRPS=935.61` (`14.18%` spread), `p50=193.24 ms`, **`p95=386.10 ms`** (`437.78, 375.17, 386.1, 375.87, 414.34`), `p99=515.53 ms`, **`0` errors**.
      - Pass 3 (`200 VUs`): `okRPS=977.47` (`24.57%` spread), `p50=184.77 ms`, **`p95=372.68 ms`** (`372.68, 360.4, 380.59, 357.13, 469.9`), `p99=475.54 ms`, **`0` errors**.
      - **Median of 3 pass medians (and across all `15` raw `200 VU` runs)**: **`372.68 ms`** vs `351.96 ms` baseline (**`+5.89% <= +10%`** max tolerance `387.156 ms`), **`0` errors** (`0` `502`/`5xx`/`4xx`/timeout/conn) across all `1..200 VUs`.

### 3. S1, S2, S7 & S8 Measurements

- **S1 (Slow Throttled Upload & Slowest SQL Query vs `5000 ms` `jakarta.persistence.query.timeout`)**:
  - `1,900,000 B` valid PNG uploaded via `curl.exe --limit-rate 150k` (`> 12 s` > `5000 ms` `connectionTimeout`): RED `:3000` `200 OK` (`12.31 s`) & `:8080` `200 OK` (`12.08 s`); GREEN `:3000` `200 OK` (`12.087932 s`, `157198 B/s`) & `:8080` `200 OK` (`12.054666 s`, `157632 B/s`); `2,200,000 B` (`> 2 MB` limit) cleanly rejected `413 PAYLOAD_TOO_LARGE` (`13.09 s`).
  - Tomcat `keepAliveTimeout` explicitly set to **`65000 ms > 60000 ms`** Nginx `keepalive_timeout 60s`.
  - PostgreSQL `log_min_duration_statement = 1` during `--mode endpoints --runs 1`: `71` statements `>= 1 ms`, **max SQL duration = `6.889 ms`** (top 5: `6.889, 4.704, 4.381, 2.368, 2.252 ms`), `> 725x` below `5000 ms` `app.server.persistence.query-timeout-ms` (`0` timeout warnings during full E2E).
- **S2 (Prod Default CSP vs Dev Compose CSP)**:
  - RED (`curl.exe -sI http://127.0.0.1:3000/`): `img-src` & `connect-src` hardcoded `http://127.0.0.1:9000 http://localhost:9000`.
  - GREEN Prod standalone (`:3009`): `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';` (**`0` localhost origins**).
  - GREEN Dev Compose (`:3000`): `img-src 'self' data: blob: https://res.cloudinary.com http://127.0.0.1:9000 http://localhost:9000; ... connect-src 'self' http://127.0.0.1:9000 http://localhost:9000;` (`20-envsubst-on-templates.sh` active).
- **S7 (`docker history --no-trunc rikkei-jobs-backend:latest`)**:
  - RED: static `-Djwt.secret=build-time-cds-training-placeholder-secret-key-min-32`.
  - GREEN: `RUN /bin/sh -c JWT_SECRET="$(cat /proc/sys/kernel/random/uuid)" java -XX:+UseZGC ... -jar /app/app.jar # buildkit` (`0` static secrets in repo scan or `docker history --no-trunc`).
- **S8 (`origin/develop` Surefire 30s Fork Exit Comparison)**:
  - Standalone `SecurityHardeningIntegrationTest` on clean `origin/develop` archive (`25/25 PASS`, `41.442 s`) and current tree (`25/25 PASS`, `26.409 s`) both exit cleanly without triggering the 30s Surefire fork kill.
  - In the full backend suite, **`BASELINE.md` §4.2 already recorded on `eb75201` (`origin/develop` + Part A/B, zero backend edits)** that `701/701` tests hit the **`30 s Surefire fork exit wait + Testcontainers Hikari warnings`**. Inspection of the `760/760` full-suite log confirms the `30 s` delay occurs inside `SpringApplicationShutdownHook` after all tests finish (closing cached `HikariPool-17..26` sequentially against already-stopped Testcontainers PostgreSQL containers right after the last test class completes). Confirmed **pre-existing on `origin/develop`**.
