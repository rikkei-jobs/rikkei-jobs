# 03 — Version Table / Bảng Phiên bản Công nghệ Chính thức

---

## Part 1: English Section

### 1. Technology Verification Overview
This table details the official verified versions of all programming languages, runtimes, frameworks, libraries, database engines, and container images used in the **Rikkei Jobs** platform.

- **Verification Date**: **2026-11-10**
- **Verification Method**: Verified against official vendor registries (Maven Central, npm registry, Docker Hub, OpenJDK releases).

### 2. Official Technology & Library Version Matrix

| Category | Component / Tool | Verified Version | Purpose in Rikkei Jobs | Official Source / Registry URL |
|---|---|---|---|---|
| **Runtime & Language** | Java (OpenJDK) | `25 LTS` | Backend language runtime (Virtual Threads, Pattern Matching) | [https://openjdk.org/projects/jdk/25/](https://openjdk.org/projects/jdk/25/) |
| **Backend Framework** | Spring Boot | `4.1.2` | Core modular monolith application framework | [https://spring.io/projects/spring-boot](https://spring.io/projects/spring-boot) |
| **Database Migration** | Flyway | `13.x` (`spring-boot-starter-flyway`) | Automated database schema versioning & dev seeds | [https://flywaydb.org/](https://flywaydb.org/) |
| **API Documentation** | Springdoc OpenAPI | `3.0.x` | Dev profile Swagger UI & OpenAPI 3.1 specification | [https://springdoc.org/](https://springdoc.org/) |
| **Backend Testing** | Testcontainers | `2.0.x` | Isolated PostgreSQL container execution during tests | [https://testcontainers.com/](https://testcontainers.com/) |
| **Code Formatting** | Spotless + Google Java Format | `2.44.x` / `1.25.x` | Strict deterministic Java code style enforcement | [https://github.com/diffplug/spotless](https://github.com/diffplug/spotless) |
| **Database Engine** | PostgreSQL | `18.6` | Relational database engine with native `uuidv7()` | [https://www.postgresql.org/](https://www.postgresql.org/) |
| **Runtime & Language** | Node.js | `24 LTS` | Runtime for external mock service and frontend tooling | [https://nodejs.org/](https://nodejs.org/) |
| **Mock Web Framework** | Express.js | `4.19.2` | Lightweight HTTP server for external mock APIs | [https://expressjs.com/](https://expressjs.com/) |
| **Frontend Library** | React | `19.3.1` | Declarative UI component library | [https://react.dev/](https://react.dev/) |
| **Frontend Language** | TypeScript | `6.0.3` | Type-safe static analysis for frontend application | [https://www.typescriptlang.org/](https://www.typescriptlang.org/) |
| **Frontend Bundler** | Vite | `8.3.7` | Fast ESM build tool and development server | [https://vite.dev/](https://vite.dev/) |
| **Frontend Testing** | Vitest | `5.1.0` | High-performance unit test runner for React components | [https://vitest.dev/](https://vitest.dev/) |
| **Frontend Linter** | ESLint | `10.14.0` | Static code analysis and linting for TS/React | [https://eslint.org/](https://eslint.org/) |
| **Production Web Server**| Nginx | `1.30.6 stable` | Non-root reverse proxy container for frontend SPA | [https://nginx.org/](https://nginx.org/) |
| **Email Testing** | Mailpit | `v1.21.8` | Local fake SMTP server and webmail inspector UI | [https://github.com/axllent/mailpit](https://github.com/axllent/mailpit) |

---

## Part 2: Vietnamese Section / Bản dịch Tiếng Việt

### 1. Tổng quan Xác thực Phiên bản
Bảng dưới đây kê khai chi tiết các phiên bản chính thức đã được xác thực của toàn bộ ngôn ngữ lập trình, môi trường thực thi (runtime), framework, thư viện, hệ quản trị cơ sở dữ liệu và Docker images sử dụng trong hệ thống **Rikkei Jobs**.

- **Ngày xác thực chính thức**: **10/11/2026**
- **Phương thức xác thực**: Tra cứu và đối chiếu trực tiếp trên các kho lưu trữ chính thức (Maven Central, npm registry, Docker Hub, OpenJDK release notes).

### 2. Bảng Ma trận Phiên bản Công nghệ Chính thức

| Nhóm Công nghệ | Thành phần / Công cụ | Phiên bản Xác thực | Vai trò trong Dự án Rikkei Jobs | Đường dẫn Nguồn / Registry Chính thức |
|---|---|---|---|---|
| **Môi trường & Ngôn ngữ** | Java (OpenJDK) | `25 LTS` | Nền tảng thực thi Backend (Virtual Threads, Pattern Matching) | [https://openjdk.org/projects/jdk/25/](https://openjdk.org/projects/jdk/25/) |
| **Framework Backend** | Spring Boot | `4.1.2` | Khung ứng dụng chính cho khối Modular Monolith | [https://spring.io/projects/spring-boot](https://spring.io/projects/spring-boot) |
| **Quản lý Schema DB** | Flyway | `13.x` (`spring-boot-starter-flyway`) | Tự động hóa migration cơ sở dữ liệu và nạp seed dữ liệu dev | [https://flywaydb.org/](https://flywaydb.org/) |
| **Tài liệu hóa API** | Springdoc OpenAPI | `3.0.x` | Giao diện Swagger UI và đặc tả OpenAPI 3.1 cho profile dev | [https://springdoc.org/](https://springdoc.org/) |
| **Kiểm thử Tích hợp** | Testcontainers | `2.0.x` | Khởi tạo PostgreSQL container cô lập phục vụ kiểm thử | [https://testcontainers.com/](https://testcontainers.com/) |
| **Định dạng Mã nguồn** | Spotless + Google Java Format | `2.44.x` / `1.25.x` | Định dạng chuẩn mã nguồn Java thống nhất toàn đội ngũ | [https://github.com/diffplug/spotless](https://github.com/diffplug/spotless) |
| **Hệ quản trị CSDL** | PostgreSQL | `18.6` | CSDL quan hệ chính hỗ trợ hàm `uuidv7()` trực tiếp | [https://www.postgresql.org/](https://www.postgresql.org/) |
| **Môi trường & Ngôn ngữ** | Node.js | `24 LTS` | Môi trường chạy Mock service và công cụ build Frontend | [https://nodejs.org/](https://nodejs.org/) |
| **Framework Mock API** | Express.js | `4.19.2` | Máy chủ HTTP giả lập các API hệ thống ngoài | [https://expressjs.com/](https://expressjs.com/) |
| **Thư viện Giao diện** | React | `19.3.1` | Thư viện xây dựng giao diện người dùng đơn trang (SPA) | [https://react.dev/](https://react.dev/) |
| **Ngôn ngữ Frontend** | TypeScript | `6.0.3` | Kiểm soát kiểu dữ liệu tĩnh cho mã nguồn Frontend | [https://www.typescriptlang.org/](https://www.typescriptlang.org/) |
| **Bộ công cụ Build** | Vite | `8.3.7` | Máy chủ phát triển siêu tốc và đóng gói ứng dụng web | [https://vite.dev/](https://vite.dev/) |
| **Kiểm thử Giao diện** | Vitest | `5.1.0` | Bộ chạy kiểm thử đơn vị cho các component React | [https://vitest.dev/](https://vitest.dev/) |
| **Kiểm tra Cú pháp** | ESLint | `10.14.0` | Phân tích mã tĩnh và kiểm soát chất lượng code Frontend | [https://eslint.org/](https://eslint.org/) |
| **Máy chủ Web Nginx** | Nginx | `1.30.6 stable` | Reverse proxy container chạy quyền non-root cho Frontend | [https://nginx.org/](https://nginx.org/) |
| **Giả lập Dịch vụ Email**| Mailpit | `v1.21.8` | Máy chủ giả lập SMTP và giao diện web đọc email thử nghiệm | [https://github.com/axllent/mailpit](https://github.com/axllent/mailpit) |
