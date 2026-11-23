# Round PLATFORM-1 (`T022DB0`) — Taste Skill, UI/UX Audit, Optimization & Security Hardening

- **Branch**: `chore/T022DB0-taste-skill-and-optimization`
- **Base Commit**: `eb75201` (`origin/develop`)
- **Zero Emoji Compliance**: `0` emoji characters
- **Zero Machine-Local Paths**: `0` occurrences

---

## Tóm Tắt Điều Hành (Tiếng Việt — Rule 11 Bilingual Summary)

Tài liệu này là chỉ mục trung tâm và hướng dẫn vận hành cho toàn bộ **ROUND PLATFORM-1 (`T022DB0`)**, được thực thi thành một đợt thống nhất gồm ba phần tuần tự:

1. **Part A — Chuẩn hóa và nội địa hóa `frontend-taste-anti-slop`**: Tiếp nhận có kiểm soát nguyên tắc chống thiết kế đại trà từ `Leonxlnx/taste-skill` (`v2.5.1`, commit `f6b76575f949707b4e3c37cd86cb44b0b98643e8`, giấy phép MIT) dưới dạng tài liệu hướng dẫn thuần túy tại `agent-config/skills/frontend-taste-anti-slop/` (loại bỏ hoàn toàn `Stop` hooks, trình cài đặt từ xa, script thực thi ngoài luồng và các lời gọi CDN). Đã đăng ký kỹ năng thứ `29` trên `using-rikkei-skills`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, đồng bộ `175` tệp phản chiếu (`.claude/`, `.gemini/`) và cập nhật đầy đủ bảng đối chiếu xung đột `17` mục ưu tiên quy tắc nội bộ của dự án.
2. **Part B — Đọc lại toàn bộ quy tắc/kỹ năng và kiểm định UI/UX trực tiếp qua `/browser`**: Rà soát toàn bộ `20` tuyến route + fallback `*` trên `375/768/1024/1440 px` (Sáng/Tối). Đã khắc phục an toàn các lỗi thiếu `<h1>` (`/candidate/skills`, `/candidate/evaluations`, `/candidate/gap-analysis`), thứ bậc heading (`SkillItem`, `EvaluationCard`), nhãn `"Mã học viên LMS"` sai ngữ cảnh trên `/mentor`, `/staff`, `/admin`, biểu mẫu `#reset-token` vô hiệu hóa khi thiếu token, skeleton + nút `"Thử lại"`, xóa thuật ngữ nội bộ (`"PM"`, `"Backend"`), và bọc `:hover` bằng `@media (hover: hover) and (pointer: fine)` kèm phản hồi nhấn `:active`. Mọi hạng mục chạm tệp PR #13/#21/#26 hoặc cần quyết định sản phẩm/token đều được ghi nhận trong bảng `"Proposed, not applied"`.
3. **Part C — Tối ưu hóa đo lường toàn hệ thống, nâng tải đồng thời (C1b) & gia cố bảo mật (C2, C3b)**:
   - **Hạ tầng & Tải đồng thời (`P1`, `P4`, `P5`)**: Chuyển `frontend/nginx.conf` sang `upstream backend_upstream` kèm `keepalive 64`, triệt tiêu hoàn toàn **`17,512` lỗi HTTP `502 Bad Gateway`** (`59.59%` lỗi trung vị tại `50 VUs` xuống **`0` lỗi trên toàn dải `1..200 VUs`**); giới hạn tài nguyên Tomcat/Hibernate/Async qua `ServerCapacityConfig`; dựng Docker image đa tầng `jarmode=tools` + AppCDS (`/app/app.jsa`) với `exec java` PID 1 giúp giảm thời gian khởi động lạnh **`-25.62%` đến `-41.54%`** (spread `5.97%–6.31% <= 10%`) và giữ kích thước ảnh `574 MB`.
   - **Truy cập dữ liệu Backend (`P2`, `P3`)**: Giảm số câu SQL ấm trên `GET /api/v1/profiles/me/internships` từ `46 -> 8` (`-82.6%`) và `GET /api/v1/me/gap-analysis` từ `12 -> 7` (`-41.7%`, `0` advisory lock / DELETE / INSERT khi cache hit), đồng thời vá race window Tx1->Tx2 bằng recompute dưới khóa tư vấn và kiểm thử `CountDownLatch`/`pg_locks`.
   - **Bảo mật (`SEC-01..SEC-05`)**: Bổ sung CSP nghiêm ngặt (`style-src 'self'`), security headers và chặn dotfile `403` tại Nginx; bổ sung bộ giới hạn tần suất xác thực per-IP/per-email (`AuthRateLimiter`) với chuẩn hóa IPv4/IPv6 và `trustProxyHeaders=false` mặc định; mã hóa HTML trong email đặt lại mật khẩu (`MailService`); tắt redirect + làm sạch log/URL/ngoại lệ trong `ExternalApiClient`; và gắn/kiểm chứng `iss`, `aud`, `jti` trong `JwtService`.
   - **Kiểm chứng tổng thể (M6)**: `.\check.ps1` (`26/26` PASS, `473.68 s`), `./check.sh` (`26/26` PASS, `455.94 s`), Maven (`728/728` PASS), Vitest (`36/36` tệp, `440/440` tests, `0` `act()`), production build (`99.75 kB` JS gzip / `14.10 kB` CSS gzip `<=` baseline), E2E Docker (`27/27` suites, `329` cases, `2020` assertions), và phiên `/browser` cuối kiểm chứng CSP `style-src 'self'` qua `16` tuyến route (`0` lỗi console, `0` vi phạm CSP).

---

## 1. Artifact Index (`docs/platform1/`)

| Artifact | Purpose | Policy / Status |
|---|---|---|
| [`docs/platform1/PHASE0_ACK.md`](PHASE0_ACK.md) | Phase 0 acknowledgement (written prior to any repo edit), verbatim R1 mandatory working method, Rules `01..16` & `29` skills constraint table, and chronological `Re-read:` audit log before every change group. | Append-only |
| [`docs/platform1/BASELINE.md`](BASELINE.md) | Pre-change whole-system measurements on a fresh Docker Compose stack: backend cold start/memory/endpoints/SQL/`EXPLAIN (ANALYZE, BUFFERS)`, frontend bundle/CDP/hotspots, delivery/Nginx/gate timings, and C1b `1..200 VUs` load-ramp & concurrency baselines. | Immutable baseline |
| [`docs/platform1/BROWSER_OBSERVATIONS.md`](BROWSER_OBSERVATIONS.md) | Complete live Antigravity `/browser` verification records across Part B (`Before Pass 1/2`, `After Pass 1/2`) and final Part C / M6 `SEC-01` CSP `style-src 'self'` parity verification (`dc283c86`), including honest sandbox disclosures. | Append-only |
| [`docs/platform1/PR_DESCRIPTION.md`](PR_DESCRIPTION.md) | Full round summary across Parts A, B, and C/C1b/C2/C3b: `metric \| before \| after \| delta \| command \| commit group` table, `"investigated, no gain, left as is"`, `"found, needs Owner/Team Lead decision"`, `"Proposed, not applied"`, and `8` ordered `T022DB0:` commit proposals verified `1:1` against `git status --porcelain -uall`. | Authoritative PR dossier |
| `docs/platform1/pr-screenshots/` | Live `/browser` screenshots (`33` `before/`, `27` `after/`, `4` `final-csp/` PNGs) excluded from Git tracking via `.gitignore`. | Git-ignored |

---

## 2. Operational & Runtime Configuration Reference

### 2.1 Backend Container & AppCDS (`backend/Dockerfile`)

- **Build Extraction**: Multi-stage build extracts Spring Boot layered fat JAR via `java -Djarmode=tools -jar target/*.jar extract --destination /workspace/extracted --application-filename app.jar`.
- **AppCDS Archive Generation**: `/app/app.jsa` is generated during image build directly under non-root `appuser:appgroup` (`-Dspring.context.exit=onRefresh` and `-XX:ArchiveClassesAtExit=/app/app.jsa`) to avoid OverlayFS layer duplication (`574 MB` total image size).
- **Container Entrypoint**:
  - `ENV JAVA_OPTS="-XX:+UseZGC -Xms256m -Xmx512m"`
  - `ENTRYPOINT ["sh", "-c", "exec java -Xlog:cds=off $JAVA_OPTS -XX:SharedArchiveFile=/app/app.jsa -jar /app/app.jar"]`
  - `exec java` ensures `java` runs as `PID 1` so Docker `SIGTERM` triggers `Shutdown.GRACEFUL`.
  - `-Xlog:cds=off` precedes `$JAVA_OPTS` to suppress benign ZGC CDS heap-object compatibility log noise while preserving `-Xlog:cds=info` override capability and `-Xshare:auto` fallback safety.

### 2.2 Server Capacity & Dev Logging (`ServerCapacityConfig.java`, `application-dev.yml`)

- **Embedded Tomcat (`ServerCapacityConfig`)**: `Shutdown.GRACEFUL`, `connectionTimeout=5000 ms`, `maxKeepAliveRequests=1000`, `maxThreads=128`, `acceptCount=100`, `maxConnections=4096`.
- **JPA & Async Bounds**: `jakarta.persistence.query.timeout=5000 ms`, bounded `mvcTaskExecutor` (`core=8`, `max=32`, `queue=64`, `ThreadPoolExecutor.AbortPolicy`, `awaitTerminationSeconds=10`), and `5000 ms` async request timeout.
- **Dev Logging (`backend/src/main/resources/application-dev.yml`)**: `com.rikkei.jobs: INFO`, `org.flywaydb: INFO`, `org.springframework.security: WARN` (eliminating hot-path `DEBUG` overhead during load tests).

### 2.3 Nginx Reverse Proxy & Security Headers (`frontend/nginx.conf`)

- **Connection Pooling**: `worker_connections 2048` and static `upstream backend_upstream { server backend:8080; keepalive 64; keepalive_requests 10000; keepalive_timeout 60s; }` with `proxy_http_version 1.1` and `proxy_set_header Connection ""`. Paired with `depends_on: backend: condition: service_healthy` in `docker-compose.yml`, this avoids per-request ephemeral port exhaustion under load.
- **Static Caching & Dotfile Protection**:
  - `location ~ /\.` precedes static regexes and denies hidden paths (`/.env.js`, `/.git`, etc.) with `HTTP 403` + `X-Content-Type-Options: nosniff`.
  - `location ^~ /assets/` serves Vite content-hashed bundles with `Cache-Control: public, max-age=31536000, immutable`.
  - Unhashed static files use `Cache-Control: public, max-age=2592000`.
- **Security Headers & Strict CSP**:
  - `location /` enforces `Cache-Control: no-cache`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, and `Content-Security-Policy` with `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com http://127.0.0.1:9000 http://localhost:9000; font-src 'self'; connect-src 'self' http://127.0.0.1:9000 http://localhost:9000; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`.
  - `location ^~ /api/` strips `X-Powered-By` (`proxy_hide_header X-Powered-By`) without duplicating Spring Security's `X-Content-Type-Options`, while `@api_payload_too_large` attaches `X-Content-Type-Options: nosniff` on `413` responses.

### 2.4 Authentication Rate Limiting (`APP_SECURITY_RATE_LIMIT_*`)

Configured via `AuthRateLimitProperties` (`app.security.rate-limit.*`) protecting `POST /api/v1/auth/{login,sso,forgot-password,reset-password}` with `Retry-After` and unified `429 {"code":"RATE_LIMITED","message":...}` responses:

| Environment Variable | Property (`app.security.rate-limit.*`) | Default | Notes |
|---|---|---:|---|
| `APP_SECURITY_RATE_LIMIT_ENABLED` | `enabled` | `true` | Set `false` only during synthetic high-burst load benchmarks (`scripts/platform1-load-ramp.mjs`) |
| `APP_SECURITY_RATE_LIMIT_WINDOW_SECONDS` | `window-seconds` | `60` | Fixed window duration in seconds (injectable `Clock`) |
| `APP_SECURITY_RATE_LIMIT_LOGIN_MAX_REQUESTS_PER_IP` | `login-max-requests-per-ip` | `160` | Tuned above sequential E2E burst volume while blocking brute-force |
| `APP_SECURITY_RATE_LIMIT_SSO_MAX_REQUESTS_PER_IP` | `sso-max-requests-per-ip` | `60` | Per-IP `/api/v1/auth/sso` threshold |
| `APP_SECURITY_RATE_LIMIT_FORGOT_PASSWORD_MAX_REQUESTS_PER_IP` | `forgot-password-max-requests-per-ip` | `30` | Per-IP `/api/v1/auth/forgot-password` threshold |
| `APP_SECURITY_RATE_LIMIT_FORGOT_PASSWORD_MAX_REQUESTS_PER_EMAIL` | `forgot-password-max-requests-per-email` | `12` | Per-normalized-email `/forgot-password` threshold |
| `APP_SECURITY_RATE_LIMIT_RESET_PASSWORD_MAX_REQUESTS_PER_IP` | `reset-password-max-requests-per-ip` | `25` | Per-IP `/api/v1/auth/reset-password` threshold |
| `APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS` | `trust-proxy-headers` | `false` | Secure default: ignores `X-Real-IP` and always ignores `X-Forwarded-For` |
| `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES` | `trusted-proxies` | `[]` | Comma-separated exact IPs or CIDRs (e.g., `172.18.0.0/16`); if empty when `trust-proxy-headers=true`, trusts loopback only |

---

## 3. Verification Summary

- **Agent Config & Sync**: `29` skills (`frontend-taste-anti-slop` added), `175` mirror files (`sync-agent-config --check`, `validate-agent-config` Checks `1..10`, `check-gate-sync` `29/26/3/23/25`, `check-version-drift` `32/32`).
- **Backend**: `spotless:check` (`315` files), `clean test-compile` (`-Xlint:all -Werror`, `245` main + `70` test files), `spotbugs:check` (`0` bugs), `mvnw test` (**`728/728` tests**, `+27` vs `701` baseline, `0` skipped).
- **Frontend**: `lint` (`0`), `typecheck` (`0`), Vitest (**`36/36` files, `440/440` tests, `0` `act()` warnings**), production build (`99.75 kB` JS gzip / `14.10 kB` CSS gzip `<=` baseline), `compute-contrast` (`120/120` WCAG 2.2 pairs), `npm audit --omit=dev` (`0` vulnerabilities in `frontend` and `mock`).
- **Cross-Shell Parity & Live Stack**: `.\check.ps1` (`26/26` PASS, `473.68 s`), `./check.sh` (`26/26` PASS, `455.94 s`), fresh Docker E2E `node e2e/run-all.mjs` (**`27/27` suites, `329` cases, `2020` assertions**), and live `/browser` CSP verification (`0` console/CSP errors across `16` routes).

---

## PLATFORM-1-fix (T022DB0) — Fix Round Summary & Errata

### Tóm Tắt Tiếng Việt (Rule 11 Bilingual Summary)

Vòng sửa lỗi **`PLATFORM-1-fix` (`T022DB0`)** khắc phục triệt để các khiếm khuyết do Team Lead tái hiện trên bản dựng `PLATFORM-1` (giữ nguyên toàn bộ phần tài liệu trước đó theo nguyên tắc append-only và cập nhật đính chính các phát biểu cũ không còn đúng):

1. **F1 (Nghiêm trọng — Auth Rate Limiter sau Nginx)**: Thay cơ chế tin cậy `X-Real-IP` bằng danh sách mạng proxy tin cậy (`trust-proxy-headers` chỉ kích hoạt khi peer trực tiếp khớp `trusted-proxies` CIDR; tuyệt đối bỏ qua `X-Forwarded-For`); bổ sung `AuthRateLimitProdValidator` fail-fast khi khởi động profile `prod`; tinh chỉnh ngưỡng login theo `(client IP, normalized email)` tối đa `20` lần thất bại / `60s`, tổng thất bại theo IP tối đa `60` lần / `60s` (chống password spray), và tổng request theo IP `160` / `60s`; thay cơ chế fail-closed tại `MAX_BUCKETS` bằng eviction `O(1)`-amortized (ưu tiên entry hết hạn, sau đó entry cũ nhất). Đã chứng minh qua unit/integration tests, 2 IP nguồn độc lập qua `:3000` (`429` + `Retry-After` chỉ cho IP A, IP B vẫn `401`/`200`), và E2E `27/27` (`329` cases, `2020` assertions) khi bật rate limiter.
2. **F2 (Nghiêm trọng — Nginx ghim cứng IP backend)**: Thay `upstream backend_upstream` tĩnh bằng `resolver 127.0.0.11 valid=5s ipv6=off`, `zone backend_upstream 64k`, `server backend:8080 resolve`, và `keepalive 64` trên `nginx:1.30.6-alpine3.24`. Khi recreate `rikkei-backend` đổi IP (`172.28.0.5 -> 172.28.0.7`) và chiếm dụng IP cũ, `/api/v1/health` qua `:3000` tự phục hồi về `HTTP 200` trong `9.23 s` (`<= 30 s`, không khởi động lại `rikkei-frontend`), đồng thời 3 lượt tải `1..200 VUs` đạt `0` lỗi và trung vị `p95 = 372.68 ms` (`+5.89% <= +10%` so với `351.96 ms`).
3. **S1–S8 (Các hạng mục nhỏ hơn)**:
   - **S1**: Đặt `app.server.tomcat.keep-alive-timeout-ms=65000` (`> 60000 ms` của Nginx `keepalive_timeout 60s`), tham số hóa `connection-timeout-ms=5000` và `app.server.persistence.query-timeout-ms=5000` trong `application.yml`, xác minh upload chậm `1.9 MB` (`> 12 s` -> `HTTP 200`) và truy vấn PostgreSQL chậm nhất `6.889 ms` (`< 5000 ms`).
   - **S2**: Tách `:9000` khỏi `frontend/nginx.conf` production mặc định sang `frontend/nginx.conf.template` + biến `CSP_DEV_IMG_SRC`/`CSP_DEV_CONNECT_SRC` (mặc định rỗng ở `frontend/Dockerfile`, cấp giá trị `:9000` trong `docker-compose.yml` cho dev), chứng minh `:3009` prod có `0` localhost và `:3000` dev có `0` lỗi CSP qua `/browser`.
   - **S3**: Làm rõ `JwtService` kiểm tra `iss`, `aud`, chữ ký HS256 (`alg`), `exp`, `nbf`; `jti` chỉ sinh cho audit/correlation (không thu hồi, `token_version` vẫn ở `"Proposed, not applied"`); bổ sung ghi chú triển khai EN+VI (bắt buộc đăng nhập lại tối đa `8` giờ với token cũ trước deploy).
   - **S4**: Xác nhận không có đường dẫn runtime làm lệch `skill_mappings`/điểm ngoài `EvaluationServiceImpl` và `POST /api/v1/profiles/me/skills/recompute`; ghi rõ bất biến vào Javadoc, `docs/hs-01-skill-profile.md` mục `8.7`, `docs/01-architecture-overview.md`, và test ghim hành vi bảo toàn `recorded_at`.
   - **S5**: Hoàn nguyên `backend/src/main/resources/application-dev.yml` về `DEBUG` theo Rule 15 (khớp `origin/develop`).
   - **S6**: Đồng bộ `agent-config/rules/05-backend-java.md` và `10-testing-strategy.md` lên **`760` backend tests / `69` classes**, **`440` frontend tests / `36` files**, và **`27` E2E suites / `329` cases / `2020` assertions**.
   - **S7**: Thay secret tĩnh AppCDS trong `backend/Dockerfile` bằng `JWT_SECRET="$(cat /proc/sys/kernel/random/uuid)"` trong tiến trình `RUN` (không ghi ENV/history).
   - **S8**: Kiểm chứng độc lập trên `origin/develop` (`SecurityHardeningIntegrationTest` chạy riêng `25/25` không treo; toàn bộ suite `701/701` trên `origin/develop` trong `BASELINE.md` đã ghi nhận sẵn cảnh báo chờ `30 s` của Surefire khi `SpringApplicationShutdownHook` đóng tuần tự các `HikariPool` đã tắt container Testcontainers).

### Errata Correcting Earlier `PLATFORM-1` Statements

The fixes in `PLATFORM-1-fix` render the following statements in Sections `1`–`3` above outdated; authoritative current behavior is:

1. **Dev Logging (§2.2, `application-dev.yml`)**: Earlier text stated `com.rikkei.jobs: INFO` and `org.springframework.security: WARN`. Per **S5** and Rule `15`, `application-dev.yml` is reverted to `DEBUG` (identical to `origin/develop`).
2. **Nginx Upstream & CSP (§2.3, `frontend/nginx.conf`, `frontend/nginx.conf.template`)**: Earlier text stated static `server backend:8080;` relying solely on `depends_on` and listed `http://127.0.0.1:9000 http://localhost:9000` in shipped `nginx.conf`. Current config uses `resolver 127.0.0.11 valid=5s ipv6=off` + `zone backend_upstream 64k` + `server backend:8080 resolve` + `keepalive 64`, while shipped `frontend/nginx.conf` and standalone image defaults allow **zero** localhost origins (`CSP_DEV_IMG_SRC=""`, `CSP_DEV_CONNECT_SRC=""`); Compose injects `:9000` dev origins solely through `nginx.conf.template` via `20-envsubst-on-templates.sh`.
3. **Server Capacity (§2.2, `ServerCapacityConfig.java`, `application.yml`)**: Tomcat keep-alive timeout is now explicitly set via `app.server.tomcat.keep-alive-timeout-ms` (`65000 ms > 60000 ms` Nginx `keepalive_timeout`), and JPA query timeout is configurable via `app.server.persistence.query-timeout-ms` (`5000 ms`).
4. **Rate Limiter Defaults & Caps (§2.4, `AuthRateLimit*`)**: `trustProxyHeaders` remains `false` by default in Spring (`application.yml`), while `docker-compose.yml` configures `APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true` and `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES=172.28.0.0/16` (and `prod` startup fails fast via `AuthRateLimitProdValidator` if `enabled=true` without valid proxy settings). Login rate limiting now enforces `per-IP` total `160/60s`, `per-IP` failures `60/60s` (`400`/`401`), and `per-(client IP, normalized email)` failures `20/60s` (`400`/`401`), with bounded `O(1)`-amortized eviction at `MAX_BUCKETS` (`10000`) instead of fail-closed denial.
5. **JWT Claims (Executive Summary item 3)**: `JwtService` enforces `iss`, `aud`, HS256 signature (`alg`), `exp`, and `nbf`; `jti` is generated strictly for audit/correlation logging and is **not** validated or revoked (`token_version` remains in `"Proposed, not applied"`).
6. **Updated Verified Test Totals (§3)**: Backend **`760/760` tests across `69` classes** (`+32` tests in `PLATFORM-1-fix`), Frontend **`36/36` files / `440/440` tests** (`0` `act()` warnings), and Docker E2E **`27/27` suites / `329` cases / `2020` assertions**.
