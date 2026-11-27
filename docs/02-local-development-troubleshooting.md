# 02 — Local Development & Troubleshooting / Phát triển Cục bộ & Khắc phục Sự cố

---

## Part 1: English Section

### 1. Development Environment Prerequisites

To run and develop **Rikkei Jobs** locally, ensure your machine has the following toolchains installed:

- **Java Development Kit**: JDK 25 LTS (OpenJDK or Eclipse Temurin). Verify with `java -version`.
- **Node.js & npm**: Node.js 24 LTS and npm 10+. Verify with `node -v` and `npm -v`.
- **Docker & Docker Compose**: Docker Engine 26+ and Compose v2.26+. Verify with `docker compose version`.
- **Git**: Git 2.40+ (read-only operations for development team).

---

### 2. Running Components Independently (Without Full Docker Stack)

While `docker compose up -d --build --wait` orchestrates all 5 services, developing individual components is faster when running them standalone on the host.

#### Step 1: Start Supporting Infrastructure Services

Only start PostgreSQL and Mailpit via Docker to avoid running your own local database instance:

```bash
docker compose up -d postgres mailpit
# PostgreSQL is ready on 127.0.0.1:5433 (DB: rikkeijobs, User: rikkei_app, Pass: rikkei_secret)
# Mailpit UI is ready on http://127.0.0.1:8025
```

#### Step 2: Run the External Systems Mock

```bash
cd mock
npm install
npm start
# Output: "Mock chạy ở http://localhost:9000"
# Port: 9000
```

#### Step 3: Run the Spring Boot Backend

Ensure the PostgreSQL container is running on port 5433 (via Step 1).

**JDK 25 Environment Configuration**:
If your machine's `JAVA_HOME` points to another JDK version (e.g., JDK 21 or JDK 17) while JDK 25 is on `PATH`, the Maven Wrapper script (`mvnw`) defaults to `$JAVA_HOME/bin/java`. Override `JAVA_HOME` to point to JDK 25 in your terminal session before running `./mvnw`:

- **Linux / macOS (Bash/Zsh)**:

  ```bash
  export JAVA_HOME=/path/to/jdk-25
  ```

- **Windows (PowerShell)**:

  ```powershell
  $env:JAVA_HOME = "C:\path\to\jdk-25"
  ```

**Standalone Datasource Environment**:
When running backend standalone on host against the Dockerized PostgreSQL instance, the default datasource configuration in `application.yml` automatically connects to `jdbc:postgresql://localhost:5433/rikkeijobs` with username `rikkei_app` and password `rikkei_secret`. You can explicitly provide or override environment variables if needed:

```bash
cd backend
# Optional explicit environment variables:
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5433/rikkeijobs"
export SPRING_DATASOURCE_USERNAME="rikkei_app"
export SPRING_DATASOURCE_PASSWORD="rikkei_secret"
export EXTERNAL_BASE_URL="http://localhost:9000"
export EXTERNAL_SERVICE_KEY="dev-key"
export APP_FRONTEND_URL="http://localhost:3000"
export APP_MAIL_FROM="no-reply@rikkeijobs.local"

# Run with the dev profile to enable seed data and Swagger UI
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# Output: Tomcat started on port 8080
# Health check: curl -i http://localhost:8080/api/v1/health
```

**Backend Integration Tests (`@ActiveProfiles("prod")`)**:
When authoring or running backend integration tests with `@ActiveProfiles("prod")`, both `ProdEnvironmentValidator` and `AuthRateLimitProdValidator` enforce fail-fast configuration validation at `prod` startup (the latter whenever `app.security.rate-limit.enabled=true`, the default). Every `@ActiveProfiles("prod")` test class must explicitly declare all 4 required `prod` properties inside `@SpringBootTest(properties = {...})`: `APP_FRONTEND_URL` (e.g., `https://jobs.rikkei.edu.vn`), `APP_MAIL_FROM` (e.g., `noreply@rikkei.edu.vn`), `APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true`, and `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES` (e.g., `127.0.0.1`); otherwise `ApplicationContext` startup will fail fast with an `IllegalStateException`.

#### Step 4: Run the React Frontend

```bash
cd frontend
npm install
npm run dev
# Vite dev server running at http://localhost:3000
```

---

### 3. Common Issues & Troubleshooting Guide

| Issue Symptom | Root Cause | Solution |
|---|---|---|
| **Port Conflict (EADDRINUSE / BindException)** | Another process (local Postgres on 5432, previous container, or zombie Node process) is occupying required ports (3000, 8080, 9000, 5433, 8025). | Identify and kill the occupying process:<br>• Linux/macOS: `lsof -i :<port>` then `kill -9 <PID>`<br>• Windows: `netstat -ano \| findstr :<port>` then `taskkill /F /PID <PID>`<br>Or run `docker compose down -v` to clear dangling containers. |
| **Database Migrations Never Execute (Tables Missing)** | Using `flyway-core` + `flyway-database-postgresql` without `spring-boot-starter-flyway`. Spring Boot 4 requires the starter for auto-configuration. | Ensure `spring-boot-starter-flyway` is declared in `backend/pom.xml`. Verify table creation directly via `docker compose exec postgres psql -U rikkei_app -d rikkeijobs -c "\dt"`. |
| **`mvnw` Fails with Java Compilation / Bytecode Error (Incompatible JDK Version)** | `JAVA_HOME` is set on the host machine pointing to an older JDK (e.g., JDK 21, 17, or 11), and `mvnw` invokes `$JAVA_HOME/bin/java` instead of JDK 25 on `PATH`. | Override `JAVA_HOME` in the current terminal session before running `./mvnw`:<br>• Linux/macOS: `export JAVA_HOME=/path/to/jdk-25`<br>• Windows PowerShell: `$env:JAVA_HOME = "C:\path\to\jdk-25"` |
| **Backend Standalone DB Authentication Failure (`password authentication failed for user "postgres"`)** | Connecting to database with default postgres superuser credentials instead of application credentials. | Ensure database connection parameters match Docker Compose defaults: URL `jdbc:postgresql://localhost:5433/rikkeijobs`, User `rikkei_app`, Password `rikkei_secret`. Set `SPRING_DATASOURCE_USERNAME=rikkei_app` and `SPRING_DATASOURCE_PASSWORD=rikkei_secret`. |
| **Mock Returns 401 `INVALID_SERVICE_KEY`** | The request to `/lms`, `/exam`, `/pm`, or `/meet` is missing the `X-Service-Key` header or passed an incorrect value. | Add `X-Service-Key: dev-key` to your HTTP request headers. (Note: `/mock/*` routes do not require this key). |
| **CORS Blocked in Browser** | Frontend origin (`http://localhost:3000`) is not listed in backend CORS configuration. | Configure `CORS_ALLOWED_ORIGINS` in `.env` (comma-separated list, e.g. `http://localhost:3000,http://127.0.0.1:3000`). Wildcard `*` with credentials is strictly disallowed. In production, `CORS_ALLOWED_ORIGINS` is mandatory and fails fast on startup if empty. |
| **Backend Returns 503 `EXTERNAL_UNAVAILABLE`** | The mock server on port 9000 is stopped, crashed, or taking longer than 5 seconds to respond. | Verify the mock process is running with `curl -i http://localhost:9000/mock/requests`. If down, start it with `npm start` in the `mock/` folder. |
| **Frontend Nginx Proxy Crashes on Startup or 502 After Backend Recreate** | Nginx cannot resolve the `backend` container hostname at startup, or caches a stale container IP after `backend` is recreated. | `docker-compose.yml` enforces `depends_on: backend: condition: service_healthy` at startup, and `frontend/nginx.conf` / `frontend/nginx.conf.template` configure `resolver 127.0.0.11 valid=5s ipv6=off` with `zone backend_upstream 64k`, `server backend:8080 resolve`, and `keepalive 64`. Backend IP changes recover within `<= 5s` without restarting `nginx`, while keeping HTTP/1.1 keepalive pooling (`keepalive_timeout 60s` < Tomcat `65000 ms`). |
| **Auth Rate Limit Shares One Bucket Behind Nginx or Dev Mock CSP Blocked** | `X-Real-IP` is ignored when the proxy subnet is untrusted, or `localhost:9000` mock endpoints/logos are omitted in dev CSP. | `docker-compose.yml` fixes `rikkei-network` subnet (`172.28.0.0/16`) and sets `APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true` + `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES=172.28.0.0/16` so `AuthRateLimiter` trusts `X-Real-IP` only from the proxy subnet. For dev mock `:9000` flows, Compose injects `CSP_DEV_IMG_SRC` and `CSP_DEV_CONNECT_SRC` into `nginx.conf.template` via `envsubst` (production default ships empty with zero `localhost` origins). |

---

### 4. Clean Isolated CI Runner in Docker (Workflow Replication)

To guarantee that the codebase passes all quality gates identically to GitHub Actions without any machine-specific dependencies or dirty host state:

```bash
# On Linux / macOS
./scripts/run-ci-in-docker.sh

# On Windows PowerShell
.\scripts\run-ci-in-docker.ps1
```

**Architecture & DooD (Docker-outside-of-Docker) Handling**:

- **Testcontainers**: Automatically detects and configures `TESTCONTAINERS_HOST_OVERRIDE` (`host.docker.internal` or gateway IP) and `.testcontainers.properties` to ensure Testcontainers and ephemeral mock containers communicate reliably in `--network host` mode.
- **Linter Volume Mapping**: A Docker CLI wrapper transparently translates `/ci-workspace` and `$PWD` bind paths to the isolated named workspace volume for containerized linters (yamllint, hadolint, actionlint, sqlfluff).
- **Hermetic Isolation**: Host artifacts (`node_modules`, `target`, `dist`, `.m2`) are excluded via read-only rsync into a clean throwaway volume.
- **Docker CI Harness Isolation & Resource Boundaries (F1)**:
  - **Isolated Resources (Containers, Volumes, Networks)**: Because `docker-compose.yml` hardcodes resource names (`container_name`, `rikkei_postgres_data`, `rikkei-network`), `COMPOSE_PROJECT_NAME` alone cannot prevent volume or container collisions when the dev stack is stopped. The harness dynamically generates an ephemeral `docker-compose.override.yml` within the container's isolated workspace (`/ci-workspace`), mapping container names (`${COMPOSE_PROJECT_NAME}-<service>`), volume name (`${COMPOSE_PROJECT_NAME}_postgres_data`), and network name (`${COMPOSE_PROJECT_NAME}_network`). The Docker CLI wrapper transparently maps container target arguments for E2E tests, and host cleanup strictly targets resources labeled `com.docker.compose.project=${COMPOSE_PROJECT_NAME}`. This guarantees that a stopped dev stack's PostgreSQL volume (`rikkei_postgres_data`) is never written to or polluted with CI data.
  - **Shared Host Resources (TCP Ports)**: Host ports `5433, 8080, 3000, 9000, 8025, 1025` are shared with the host OS. When a development stack is currently running, the harness fails fast with exit code 1 to avoid port collisions without disturbing running containers. When the dev stack is stopped, the harness outputs an `[ISOLATION NOTICE]` and executes safely.

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### 1. Yêu cầu Tiền đề Môi trường Phát triển

Để chạy và phát triển dự án **Rikkei Jobs** cục bộ, máy tính của bạn cần được cài đặt sẵn các bộ công cụ sau:

- **Java Development Kit**: JDK 25 LTS (bản OpenJDK hoặc Eclipse Temurin). Kiểm tra bằng lệnh `java -version`.
- **Node.js & npm**: Node.js 24 LTS và npm 10+. Kiểm tra bằng lệnh `node -v` và `npm -v`.
- **Docker & Docker Compose**: Docker Engine 26+ và Docker Compose v2.26+. Kiểm tra bằng lệnh `docker compose version`.
- **Git**: Phiên bản 2.40+ (đội ngũ chỉ thực hiện các thao tác đọc trạng thái git).

---

### 2. Hướng dẫn Chạy Từng Thành phần Độc lập (Không cần Docker Toàn phần)

Mặc dù lệnh `docker compose up -d --build --wait` có thể khởi động tự động toàn bộ 5 container, việc chạy độc lập từng dịch vụ trực tiếp trên máy host sẽ giúp quá trình lập trình và gỡ lỗi diễn ra nhanh chóng hơn.

#### Bước 1: Khởi động Hạ tầng Cơ sở Dữ liệu & Mail

Chỉ khởi chạy PostgreSQL và Mailpit qua Docker để có sẵn môi trường lưu trữ:

```bash
docker compose up -d postgres mailpit
# PostgreSQL lắng nghe tại 127.0.0.1:5433 (DB: rikkeijobs, User: rikkei_app, Pass: rikkei_secret)
# Giao diện Mailpit Webmail tại http://127.0.0.1:8025
```

#### Bước 2: Chạy Dịch vụ Mock Hệ thống Ngoài

```bash
cd mock
npm install
npm start
# Thông báo thành công: "Mock chạy ở http://localhost:9000"
# Cổng hoạt động: 9000
```

#### Bước 3: Chạy Backend Spring Boot

Đảm bảo container PostgreSQL đang chạy trên cổng 5433 (qua Bước 1).

**Cấu hình Môi trường JDK 25**:
Nếu biến môi trường `JAVA_HOME` trên máy đang trỏ tới JDK khác Java 25 (ví dụ JDK 21 hoặc JDK 17) trong khi JDK 25 nằm trên `PATH`, script Maven Wrapper (`mvnw`) sẽ ưu tiên gọi `$JAVA_HOME/bin/java`. Hãy thiết lập lại `JAVA_HOME` trỏ tới JDK 25 trong phiên làm việc trước khi chạy `./mvnw`:

- **Linux / macOS (Bash/Zsh)**:

  ```bash
  export JAVA_HOME=/path/to/jdk-25
  ```

- **Windows (PowerShell)**:

  ```powershell
  $env:JAVA_HOME = "C:\path\to\jdk-25"
  ```

**Biến Môi trường Kết nối CSDL khi Chạy Độc lập**:
Khi chạy backend độc lập trên máy host kết nối tới PostgreSQL trong Docker, cấu hình mặc định trong `application.yml` sẽ tự động kết nối tới `jdbc:postgresql://localhost:5433/rikkeijobs` với user `rikkei_app` và password `rikkei_secret`. Bạn cũng có thể thiết lập tường minh các biến môi trường nếu cần:

```bash
cd backend
# Thiết lập biến môi trường chuẩn (tùy chọn nếu muốn ghi đè):
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5433/rikkeijobs"
export SPRING_DATASOURCE_USERNAME="rikkei_app"
export SPRING_DATASOURCE_PASSWORD="rikkei_secret"
export EXTERNAL_BASE_URL="http://localhost:9000"
export EXTERNAL_SERVICE_KEY="dev-key"
export APP_FRONTEND_URL="http://localhost:3000"
export APP_MAIL_FROM="no-reply@rikkeijobs.local"

# Chạy với profile dev để tự động nạp dữ liệu mẫu seed và bật OpenAPI Swagger UI
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# Thông báo thành công: Tomcat started on port 8080
# Kiểm tra sức khỏe: curl -i http://localhost:8080/api/v1/health
```

**Kiểm thử Tích hợp Backend (`@ActiveProfiles("prod")`)**:
Khi viết hoặc chạy các bài kiểm thử tích hợp backend dùng `@ActiveProfiles("prod")`, cả `ProdEnvironmentValidator` và `AuthRateLimitProdValidator` đều thực thi kiểm định fail-fast lúc khởi động profile `prod` (với validator sau khi `app.security.rate-limit.enabled=true`, giá trị mặc định). Mọi lớp kiểm thử `@ActiveProfiles("prod")` bắt buộc phải khai báo tường minh đủ 4 biến `prod` trong `@SpringBootTest(properties = {...})`: `APP_FRONTEND_URL` (ví dụ `https://jobs.rikkei.edu.vn`), `APP_MAIL_FROM` (ví dụ `noreply@rikkei.edu.vn`), `APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true` và `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES` (ví dụ `127.0.0.1`); nếu thiếu, quá trình khởi tạo `ApplicationContext` sẽ fail-fast với lỗi `IllegalStateException`.

#### Bước 4: Chạy Frontend React

```bash
cd frontend
npm install
npm run dev
# Máy chủ phát triển Vite chạy tại http://localhost:3000
```

---

### 3. Sổ tay Xử lý Sự cố & Khắc phục Lỗi Thường gặp

| Hiện tượng Lỗi | Nguyên nhân Gốc rễ | Giải pháp Khắc phục |
|---|---|---|
| **Xung đột cổng (EADDRINUSE / BindException)** | Có một tiến trình khác (Postgres cài trên máy, container cũ chưa tắt, hoặc tiến trình Node chạy ngầm) đang chiếm dụng các cổng 3000, 8080, 9000, 5433, hoặc 8025. | Tìm và giải phóng tiến trình chiếm cổng:<br>• Linux/macOS: `lsof -i :<port>` sau đó `kill -9 <PID>`<br>• Windows: `netstat -ano \| findstr :<port>` sau đó `taskkill /F /PID <PID>`<br>Hoặc gõ `docker compose down -v` để dọn dẹp các container đang chạy dở. |
| **Flyway không chạy migration (Database rỗng)** | Chỉ khai báo `flyway-core` + `flyway-database-postgresql` mà thiếu `spring-boot-starter-flyway`. Trong Spring Boot 4, bắt buộc phải có starter để kích hoạt cấu hình tự động. | Bổ sung starter `spring-boot-starter-flyway` vào `backend/pom.xml`. Kiểm tra các bảng đã tạo bằng lệnh: `docker compose exec postgres psql -U rikkei_app -d rikkeijobs -c "\dt"`. |
| **`mvnw` báo lỗi biên dịch Java (Sai phiên bản JDK)** | Biến `JAVA_HOME` trên máy host trỏ tới JDK cũ (JDK 21, 17, 11), và `mvnw` gọi `$JAVA_HOME/bin/java` thay vì JDK 25 trên `PATH`. | Ghi đè `JAVA_HOME` trong terminal hiện tại trước khi gọi `./mvnw`:<br>• Linux/macOS: `export JAVA_HOME=/path/to/jdk-25`<br>• Windows PowerShell: `$env:JAVA_HOME = "C:\path\to\jdk-25"` |
| **Lỗi xác thực CSDL khi chạy Standalone (`password authentication failed for user "postgres"`)** | Ứng dụng kết nối bằng tài khoản mặc định `postgres` thay vì tài khoản ứng dụng `rikkei_app`. | Đảm bảo thông số kết nối CSDL khớp với Docker Compose: URL `jdbc:postgresql://localhost:5433/rikkeijobs`, User `rikkei_app`, Password `rikkei_secret`. Thiết lập biến `SPRING_DATASOURCE_USERNAME=rikkei_app` và `SPRING_DATASOURCE_PASSWORD=rikkei_secret`. |
| **Mock báo lỗi 401 `INVALID_SERVICE_KEY`** | Lời gọi API tới `/lms`, `/exam`, `/pm`, hoặc `/meet` bị thiếu header `X-Service-Key` hoặc truyền sai giá trị. | Bổ sung header `X-Service-Key: dev-key` vào HTTP request. (Lưu ý: Các route tiện ích `/mock/*` không đòi hỏi header này). |
| **Trình duyệt báo lỗi chặn CORS** | Tên miền frontend (`http://localhost:3000`) chưa được khai báo trong danh sách origin cho phép của Backend. | Cấu hình biến `CORS_ALLOWED_ORIGINS` trong `.env` (danh sách phân tách bởi dấu phẩy, ví dụ `http://localhost:3000,http://127.0.0.1:3000`). Tuyệt đối không dùng wildcard `*` kèm credentials. Trên production, biến này là bắt buộc và server sẽ fail-fast từ chối khởi động nếu bị bỏ trống. |
| **Backend trả về lỗi 503 `EXTERNAL_UNAVAILABLE`** | Mock server trên cổng 9000 bị tắt, bị treo hoặc phản hồi quá thời gian timeout (5 giây). | Kiểm tra xem tiến trình Mock có đang chạy hay không bằng lệnh `curl -i http://localhost:9000/mock/requests`. Nếu chưa chạy, thực hiện `npm start` trong thư mục `mock/`. |
| **Nginx Proxy ở Frontend bị crash khi khởi động hoặc trả 502 sau khi recreate Backend** | Nginx không thể phân giải tên miền container `backend` lúc khởi động, hoặc giữ IP cũ trong cache sau khi container `backend` được tạo lại. | `docker-compose.yml` bắt buộc `depends_on: backend: condition: service_healthy` lúc khởi động, đồng thời `frontend/nginx.conf` và `frontend/nginx.conf.template` cấu hình `resolver 127.0.0.11 valid=5s ipv6=off` kèm `zone backend_upstream 64k`, `server backend:8080 resolve` và `keepalive 64`. Khi `backend` đổi IP, Nginx tự cập nhật trong `<= 5s` mà không cần khởi động lại, vẫn giữ pool keepalive (`keepalive_timeout 60s` < Tomcat `65000 ms`). |
| **Rate limit Auth gộp chung 1 bucket sau Nginx hoặc CSP dev chặn Mock `:9000`** | `X-Real-IP` bị bỏ qua khi dải mạng proxy chưa được tin cậy, hoặc CSP chặn endpoint/ảnh mock `localhost:9000` ở môi trường dev. | `docker-compose.yml` cố định subnet `rikkei-network` (`172.28.0.0/16`) và truyền `APP_SECURITY_RATE_LIMIT_TRUST_PROXY_HEADERS=true` + `APP_SECURITY_RATE_LIMIT_TRUSTED_PROXIES=172.28.0.0/16` để `AuthRateLimiter` chỉ tin `X-Real-IP` từ subnet proxy. Với mock `:9000` ở dev, Compose nạp `CSP_DEV_IMG_SRC` và `CSP_DEV_CONNECT_SRC` vào `nginx.conf.template` qua `envsubst` (mặc định production rỗng, không chứa `localhost`). |

---

### 4. Chạy Kiểm Thử Toàn Diện CI Trong Docker Cách Ly (Mô phỏng GitHub Actions)

Để đảm bảo toàn bộ mã nguồn vượt qua 100% các cổng chất lượng giống hệt môi trường GitHub Actions Ubuntu runner mà không bị ảnh hưởng bởi trạng thái máy host:

```bash
# Trên Linux / macOS
./scripts/run-ci-in-docker.sh

# Trên Windows PowerShell
.\scripts\run-ci-in-docker.ps1
```

**Cơ chế Kỹ thuật & Môi trường DooD (Docker-outside-of-Docker)**:

- **Testcontainers**: Tự động phát hiện và cấu hình `TESTCONTAINERS_HOST_OVERRIDE` (IP của `host.docker.internal` hoặc gateway) và file `.testcontainers.properties` để Testcontainers kết nối tin cậy tới daemon và các container dịch vụ trên chế độ `--network host`.
- **Ánh xạ Volume cho Linters**: Tích hợp wrapper cho lệnh Docker CLI để chuyển đổi đường dẫn `/ci-workspace` và `$PWD` sang tên volume độc lập, giúp các công cụ linter (yamllint, hadolint, actionlint, sqlfluff) đọc file chính xác trong môi trường container lồng.
- **Cô lập Tuyệt đối**: Thư mục repo máy host được mount dạng chỉ đọc (`:ro`) và sao chép qua rsync loại trừ hoàn toàn các tệp rác, thư viện `node_modules`, `target`, `dist`, và cache `.m2` của máy host.
- **Cơ Chế Cách Ly Docker CI Harness & Ranh Giới Tài Nguyên (F1)**:
  - **Tài nguyên được cách ly (Containers, Volumes, Networks)**: Do tệp `docker-compose.yml` cố định tên tài nguyên (`container_name`, volume `rikkei_postgres_data`, network `rikkei-network`), chỉ đặt biến môi trường `COMPOSE_PROJECT_NAME` là chưa đủ để ngăn chặn chiếm dụng volume khi dev stack đã dừng. Harness tự động sinh tệp `docker-compose.override.yml` tạm thời bên trong volume làm việc cô lập (`/ci-workspace`), gán tiền tố ngẫu nhiên `${COMPOSE_PROJECT_NAME}` cho 5 container (`${COMPOSE_PROJECT_NAME}-<service>`), volume (`${COMPOSE_PROJECT_NAME}_postgres_data`) và network (`${COMPOSE_PROJECT_NAME}_network`). Wrapper Docker trong container tự động chuyển tiếp tên container cho các bài kiểm thử E2E, và quy trình dọn dẹp trên máy host chỉ lọc chính xác theo nhãn `com.docker.compose.project=${COMPOSE_PROJECT_NAME}`. Cơ chế này bảo đảm 100% rằng khi dev stack đã dừng, volume PostgreSQL của dev (`rikkei_postgres_data`) không bao giờ bị ghi đè hay ô nhiễm dữ liệu CI.
  - **Tài nguyên dùng chung (Cổng mạng host)**: Các cổng mạng trên máy host (`5433, 8080, 3000, 9000, 8025, 1025`) là tài nguyên dùng chung. Khi stack dev đang chạy chiếm dụng các cổng này, harness sẽ từ chối khởi động an toàn (fail fast với mã thoát 1) để bảo toàn tuyệt đối môi trường dev. Khi stack dev đã dừng, harness hiển thị thông báo `[ISOLATION NOTICE]` và thực thi an toàn mà không ảnh hưởng tới dữ liệu dev.
