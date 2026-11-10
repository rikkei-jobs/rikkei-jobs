# 03 — Version Table / Bảng Phiên bản Công nghệ Chính thức

---

## Part 1: English Section

### 1. Technology Verification Overview

This table details the official verified versions of all programming languages, runtimes, frameworks, build plugins, libraries, database engines, and container images used in the **Rikkei Jobs** platform.

- **Verification Date**: **2026-11-10**
- **Verification Method**: Verified directly against project manifests (`backend/pom.xml`, `mock/package.json`, `frontend/package.json`, `Dockerfiles`, `docker-compose.yml`) and official vendor registries (Maven Central, npm registry, Docker Hub).

### 2. Official Technology & Library Version Matrix

| Category | Component / Tool | Verified Version | Purpose in Rikkei Jobs | Official Registry URL |
|---|---|---|---|---|
| **Runtime & Language** | Java (Eclipse Temurin) | `25 LTS (25.0.5_8)` | Backend language runtime (Virtual Threads, Pattern Matching) | [https://hub.docker.com/_/eclipse-temurin/tags?name=25.0.5_8](https://hub.docker.com/_/eclipse-temurin/tags?name=25.0.5_8) |
| **Backend Framework** | Spring Boot Starter Parent | `4.1.2` | Core modular monolith application framework | [https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-parent/4.1.2/](https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-parent/4.1.2/) |
| **Database Migration** | Flyway Starter | `11.8.2` (via starter 4.1.2) | Automated database schema versioning & dev seeds | [https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-flyway/4.1.2/](https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-flyway/4.1.2/) |
| **API Documentation** | Springdoc OpenAPI UI | `3.2.0` | Dev profile Swagger UI & OpenAPI 3.1 specification | [https://repo1.maven.org/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/3.2.0/](https://repo1.maven.org/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/3.2.0/) |
| **Backend Testing** | Testcontainers | `2.0.5` | Isolated PostgreSQL container execution during tests | [https://repo1.maven.org/maven2/org/testcontainers/testcontainers/2.0.5/](https://repo1.maven.org/maven2/org/testcontainers/testcontainers/2.0.5/) |
| **Code Formatting** | Spotless Maven Plugin | `3.11.0` | Strict deterministic Java code style enforcement | [https://repo1.maven.org/maven2/com/diffplug/spotless/spotless-maven-plugin/3.11.0/](https://repo1.maven.org/maven2/com/diffplug/spotless/spotless-maven-plugin/3.11.0/) |
| **Java Code Formatter**| Google Java Format | `1.30.0` | Google AOSP style engine for Spotless plugin | [https://repo1.maven.org/maven2/com/google/googlejavaformat/google-java-format/1.30.0/](https://repo1.maven.org/maven2/com/google/googlejavaformat/google-java-format/1.30.0/) |
| **Static Code Analysis**| SpotBugs Maven Plugin | `4.10.5.0` | Static bytecode bug detection & quality gate | [https://repo1.maven.org/maven2/com/github/spotbugs/spotbugs-maven-plugin/4.10.5.0/](https://repo1.maven.org/maven2/com/github/spotbugs/spotbugs-maven-plugin/4.10.5.0/) |
| **Build Tool** | Apache Maven Wrapper | `3.9.16` | Deterministic build toolchain distribution | [https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.16/](https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.16/) |
| **Database Engine** | PostgreSQL Image | `18.6-alpine` | Relational database (bigint identity / BIGSERIAL primary keys) | [https://hub.docker.com/_/postgres/tags?name=18.6-alpine](https://hub.docker.com/_/postgres/tags?name=18.6-alpine) |
| **Runtime & Language** | Node.js Alpine Image | `24.22.2-alpine3.23` | Runtime for external mock service and frontend build | [https://hub.docker.com/_/node/tags?name=24.22.2-alpine3.23](https://hub.docker.com/_/node/tags?name=24.22.2-alpine3.23) |
| **Mock Web Framework** | Express.js | `5.3.0` | Lightweight HTTP server for external mock APIs | [https://www.npmjs.com/package/express/v/5.3.0](https://www.npmjs.com/package/express/v/5.3.0) |
| **Frontend Library** | React | `19.3.1` | Declarative UI component library | [https://www.npmjs.com/package/react/v/19.3.1](https://www.npmjs.com/package/react/v/19.3.1) |
| **Frontend DOM Engine**| React DOM | `19.3.1` | React renderer for web browser DOM | [https://www.npmjs.com/package/react-dom/v/19.3.1](https://www.npmjs.com/package/react-dom/v/19.3.1) |
| **Frontend Language** | TypeScript | `6.0.3` | Type-safe static analysis for frontend application | [https://www.npmjs.com/package/typescript/v/6.0.3](https://www.npmjs.com/package/typescript/v/6.0.3) |
| **Frontend Bundler** | Vite | `8.3.7` | Fast ESM build tool and development server | [https://www.npmjs.com/package/vite/v/8.3.7](https://www.npmjs.com/package/vite/v/8.3.7) |
| **Frontend Testing** | Vitest | `5.1.0` | High-performance unit test runner for React components | [https://www.npmjs.com/package/vitest/v/5.1.0](https://www.npmjs.com/package/vitest/v/5.1.0) |
| **Frontend Linter** | ESLint | `10.14.0` | Static code analysis and linting for TS/React | [https://www.npmjs.com/package/eslint/v/10.14.0](https://www.npmjs.com/package/eslint/v/10.14.0) |
| **Frontend Formatter** | Prettier | `3.9.10` | Opinionated multi-language code formatter | [https://www.npmjs.com/package/prettier/v/3.9.10](https://www.npmjs.com/package/prettier/v/3.9.10) |
| **Production Web Server**| Nginx Image | `1.30.6-alpine3.24` | Non-root reverse proxy container for frontend SPA | [https://hub.docker.com/_/nginx/tags?name=1.30.6-alpine3.24](https://hub.docker.com/_/nginx/tags?name=1.30.6-alpine3.24) |
| **Email Testing UI** | Mailpit Image | `v1.33.1` | Local fake SMTP server and webmail inspector UI | [https://hub.docker.com/r/axllent/mailpit/tags?name=v1.33.1](https://hub.docker.com/r/axllent/mailpit/tags?name=v1.33.1) |

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### 1. Tổng quan Xác thực Phiên bản

Bảng dưới đây kê khai chi tiết các phiên bản chính thức đã được xác thực của toàn bộ ngôn ngữ lập trình, môi trường thực thi (runtime), framework, plugin build, thư viện, hệ quản trị cơ sở dữ liệu và Docker images sử dụng trong hệ thống **Rikkei Jobs**.

- **Ngày xác thực chính thức**: **10/11/2026**
- **Phương thức xác thực**: Tra cứu và đối chiếu trực tiếp từ các tệp manifest cấu hình dự án (`backend/pom.xml`, `mock/package.json`, `frontend/package.json`, `Dockerfiles`, `docker-compose.yml`) và các kho lưu trữ chính thức (Maven Central, npm registry, Docker Hub).

### 2. Bảng Ma trận Phiên bản Công nghệ Chính thức

| Nhóm Công nghệ | Thành phần / Công cụ | Phiên bản Xác thực | Vai trò trong Dự án Rikkei Jobs | Đường dẫn Nguồn / Registry Chính thức |
|---|---|---|---|---|
| **Môi trường & Ngôn ngữ** | Java (Eclipse Temurin) | `25 LTS (25.0.5_8)` | Nền tảng thực thi Backend (Virtual Threads, Pattern Matching) | [https://hub.docker.com/_/eclipse-temurin/tags?name=25.0.5_8](https://hub.docker.com/_/eclipse-temurin/tags?name=25.0.5_8) |
| **Framework Backend** | Spring Boot Starter Parent | `4.1.2` | Khung ứng dụng chính cho khối Modular Monolith | [https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-parent/4.1.2/](https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-parent/4.1.2/) |
| **Quản lý Schema DB** | Flyway Starter | `11.8.2` (qua starter 4.1.2) | Tự động hóa migration cơ sở dữ liệu và nạp seed dữ liệu dev | [https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-flyway/4.1.2/](https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-starter-flyway/4.1.2/) |
| **Tài liệu hóa API** | Springdoc OpenAPI UI | `3.2.0` | Giao diện Swagger UI và đặc tả OpenAPI 3.1 cho profile dev | [https://repo1.maven.org/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/3.2.0/](https://repo1.maven.org/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/3.2.0/) |
| **Kiểm thử Tích hợp** | Testcontainers | `2.0.5` | Khởi tạo PostgreSQL container cô lập phục vụ kiểm thử | [https://repo1.maven.org/maven2/org/testcontainers/testcontainers/2.0.5/](https://repo1.maven.org/maven2/org/testcontainers/testcontainers/2.0.5/) |
| **Định dạng Mã nguồn** | Spotless Maven Plugin | `3.11.0` | Định dạng chuẩn mã nguồn Java thống nhất toàn đội ngũ | [https://repo1.maven.org/maven2/com/diffplug/spotless/spotless-maven-plugin/3.11.0/](https://repo1.maven.org/maven2/com/diffplug/spotless/spotless-maven-plugin/3.11.0/) |
| **Bộ Format Java** | Google Java Format | `1.30.0` | Engine định dạng chuẩn Google AOSP cho Spotless | [https://repo1.maven.org/maven2/com/google/googlejavaformat/google-java-format/1.30.0/](https://repo1.maven.org/maven2/com/google/googlejavaformat/google-java-format/1.30.0/) |
| **Phân tích Mã tĩnh** | SpotBugs Maven Plugin | `4.10.5.0` | Phát hiện lỗi bytecode tiềm ẩn và kiểm soát chất lượng mã | [https://repo1.maven.org/maven2/com/github/spotbugs/spotbugs-maven-plugin/4.10.5.0/](https://repo1.maven.org/maven2/com/github/spotbugs/spotbugs-maven-plugin/4.10.5.0/) |
| **Bộ công cụ Build** | Apache Maven Wrapper | `3.9.16` | Phân phối bộ công cụ build Java xác định | [https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.16/](https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.16/) |
| **Hệ quản trị CSDL** | PostgreSQL Image | `18.6-alpine` | CSDL quan hệ chính (khóa chính bigint identity / BIGSERIAL) | [https://hub.docker.com/_/postgres/tags?name=18.6-alpine](https://hub.docker.com/_/postgres/tags?name=18.6-alpine) |
| **Môi trường & Ngôn ngữ** | Node.js Alpine Image | `24.22.2-alpine3.23` | Môi trường chạy Mock service và công cụ build Frontend | [https://hub.docker.com/_/node/tags?name=24.22.2-alpine3.23](https://hub.docker.com/_/node/tags?name=24.22.2-alpine3.23) |
| **Framework Mock API** | Express.js | `5.3.0` | Máy chủ HTTP giả lập các API hệ thống ngoài | [https://www.npmjs.com/package/express/v/5.3.0](https://www.npmjs.com/package/express/v/5.3.0) |
| **Thư viện Giao diện** | React | `19.3.1` | Thư viện xây dựng giao diện người dùng đơn trang (SPA) | [https://www.npmjs.com/package/react/v/19.3.1](https://www.npmjs.com/package/react/v/19.3.1) |
| **Renderer Giao diện** | React DOM | `19.3.1` | Bộ render DOM trên trình duyệt web cho React | [https://www.npmjs.com/package/react-dom/v/19.3.1](https://www.npmjs.com/package/react-dom/v/19.3.1) |
| **Ngôn ngữ Frontend** | TypeScript | `6.0.3` | Kiểm soát kiểu dữ liệu tĩnh cho mã nguồn Frontend | [https://www.npmjs.com/package/typescript/v/6.0.3](https://www.npmjs.com/package/typescript/v/6.0.3) |
| **Bộ công cụ Bundler** | Vite | `8.3.7` | Máy chủ phát triển siêu tốc và đóng gói ứng dụng web | [https://www.npmjs.com/package/vite/v/8.3.7](https://www.npmjs.com/package/vite/v/8.3.7) |
| **Kiểm thử Giao diện** | Vitest | `5.1.0` | Bộ chạy kiểm thử đơn vị cho các component React | [https://www.npmjs.com/package/vitest/v/5.1.0](https://www.npmjs.com/package/vitest/v/5.1.0) |
| **Kiểm tra Cú pháp** | ESLint | `10.14.0` | Phân tích mã tĩnh và kiểm soát chất lượng code Frontend | [https://www.npmjs.com/package/eslint/v/10.14.0](https://www.npmjs.com/package/eslint/v/10.14.0) |
| **Định dạng Mã Frontend**| Prettier | `3.9.10` | Định dạng thống nhất mã nguồn đa ngôn ngữ Frontend | [https://www.npmjs.com/package/prettier/v/3.9.10](https://www.npmjs.com/package/prettier/v/3.9.10) |
| **Máy chủ Web Nginx** | Nginx Image | `1.30.6-alpine3.24` | Reverse proxy container chạy quyền non-root cho Frontend | [https://hub.docker.com/_/nginx/tags?name=1.30.6-alpine3.24](https://hub.docker.com/_/nginx/tags?name=1.30.6-alpine3.24) |
| **Giả lập Dịch vụ Email**| Mailpit Image | `v1.33.1` | Máy chủ giả lập SMTP và giao diện web đọc email thử nghiệm | [https://hub.docker.com/r/axllent/mailpit/tags?name=v1.33.1](https://hub.docker.com/r/axllent/mailpit/tags?name=v1.33.1) |
