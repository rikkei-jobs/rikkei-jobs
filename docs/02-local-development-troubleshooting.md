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

# Run with the dev profile to enable seed data and Swagger UI
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# Output: Tomcat started on port 8080
# Health check: curl -i http://localhost:8080/api/v1/health
```

#### Step 4: Run the React Frontend

```bash
cd frontend
npm install
npm run dev
# Vite dev server running at http://localhost:5173 (or http://localhost:3000)
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
| **CORS Blocked in Browser** | Frontend origin (`http://localhost:3000` or `http://localhost:5173`) is not listed in backend CORS configuration. | Configure `CORS_ALLOWED_ORIGINS` in `.env` (comma-separated list, e.g. `http://localhost:3000,http://127.0.0.1:3000`). Wildcard `*` with credentials is strictly disallowed. In production, `CORS_ALLOWED_ORIGINS` is mandatory and fails fast on startup if empty. |
| **Backend Returns 503 `EXTERNAL_UNAVAILABLE`** | The mock server on port 9000 is stopped, crashed, or taking longer than 5 seconds to respond. | Verify the mock process is running with `curl -i http://localhost:9000/mock/requests`. If down, start it with `npm start` in the `mock/` folder. |
| **Frontend Nginx Proxy Crashes on Startup** | Nginx cannot resolve the `backend` container hostname when backend starts slower than frontend. | Use a dynamic variable proxy with resolver directive `resolver 127.0.0.11 valid=30s;` in `nginx.conf` so Nginx starts smoothly even if backend is temporarily down. |

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

# Chạy với profile dev để tự động nạp dữ liệu mẫu seed và bật OpenAPI Swagger UI
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# Thông báo thành công: Tomcat started on port 8080
# Kiểm tra sức khỏe: curl -i http://localhost:8080/api/v1/health
```

#### Bước 4: Chạy Frontend React

```bash
cd frontend
npm install
npm run dev
# Máy chủ phát triển Vite chạy tại http://localhost:5173 (hoặc http://localhost:3000)
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
| **Trình duyệt báo lỗi chặn CORS** | Tên miền frontend (`http://localhost:3000` hoặc `http://localhost:5173`) chưa được khai báo trong danh sách origin cho phép của Backend. | Cấu hình biến `CORS_ALLOWED_ORIGINS` trong `.env` (danh sách phân tách bởi dấu phẩy, ví dụ `http://localhost:3000,http://127.0.0.1:3000`). Tuyệt đối không dùng wildcard `*` kèm credentials. Trên production, biến này là bắt buộc và server sẽ fail-fast từ chối khởi động nếu bị bỏ trống. |
| **Backend trả về lỗi 503 `EXTERNAL_UNAVAILABLE`** | Mock server trên cổng 9000 bị tắt, bị treo hoặc phản hồi quá thời gian timeout (5 giây). | Kiểm tra xem tiến trình Mock có đang chạy hay không bằng lệnh `curl -i http://localhost:9000/mock/requests`. Nếu chưa chạy, thực hiện `npm start` trong thư mục `mock/`. |
| **Nginx Proxy ở Frontend bị crash khi khởi động** | Nginx không thể phân giải tên miền container `backend` nếu container backend khởi động chậm hơn container frontend. | Sử dụng biến proxy động kết hợp chỉ thị resolver nội bộ Docker: `resolver 127.0.0.11 valid=30s;` trong `nginx.conf` để Nginx khởi động ổn định ngay cả khi Backend chưa sẵn sàng. |
