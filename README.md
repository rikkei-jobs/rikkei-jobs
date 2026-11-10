# Mini API Tuyển Dụng (Spring Boot 3 + Gradle)

Dự án RESTful API quản lý tuyển dụng ứng viên theo yêu cầu thực hành:
- **Công nghệ**: Java 17, Spring Boot 3.3.5, Gradle, Spring Data JPA, MySQL / PostgreSQL, Lombok, JUnit 5, Mockito.
- **Kiến trúc**: Layered Architecture (Controller - Service - Repository - Entity/DTO).

---

## 1. Cấu trúc dự án

```text
recruitment-api/
├── build.gradle
├── settings.gradle
├── README.md
├── src/
│   ├── main/
│   │   ├── java/com/example/recruitment/
│   │   │   ├── RecruitmentApiApplication.java
│   │   │   ├── controller/
│   │   │   │   ├── CompanyController.java
│   │   │   │   └── JobController.java
│   │   │   ├── dto/
│   │   │   │   ├── request/
│   │   │   │   │   ├── CompanyRequest.java
│   │   │   │   │   ├── JobRequest.java
│   │   │   │   │   └── ApplicationRequest.java
│   │   │   │   └── response/
│   │   │   │       ├── CompanyResponse.java
│   │   │   │       ├── JobResponse.java
│   │   │   │       ├── ApplicationResponse.java
│   │   │   │       ├── ErrorResponse.java
│   │   │   │       └── PageResponse.java
│   │   │   ├── entity/
│   │   │   │   ├── Company.java
│   │   │   │   ├── Job.java
│   │   │   │   ├── Application.java
│   │   │   │   └── JobStatus.java
│   │   │   ├── exception/
│   │   │   │   ├── BadRequestException.java
│   │   │   │   ├── DuplicateResourceException.java
│   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   └── GlobalExceptionHandler.java
│   │   │   ├── repository/
│   │   │   │   ├── CompanyRepository.java
│   │   │   │   ├── JobRepository.java
│   │   │   │   ├── ApplicationRepository.java
│   │   │   │   └── specification/
│   │   │   │       └── JobSpecification.java
│   │   │   └── service/
│   │   │       ├── CompanyService.java
│   │   │       ├── JobService.java
│   │   │       ├── ApplicationService.java
│   │   │       └── impl/
│   │   │           ├── CompanyServiceImpl.java
│   │   │           ├── JobServiceImpl.java
│   │   │           └── ApplicationServiceImpl.java
│   │   └── resources/
│   │       ├── application.yml
│   │       └── schema.sql
│   └── test/java/com/example/recruitment/service/
│       ├── ApplicationServiceImplTest.java
│       └── JobServiceImplTest.java
```

---

## 2. Thiết kế bảng cơ sở dữ liệu (`schema.sql`)

Dự án hỗ trợ MySQL hoặc PostgreSQL. Script chi tiết có trong file `src/main/resources/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS companies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    salary_min DECIMAL(15, 2),
    salary_max DECIMAL(15, 2),
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    company_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_jobs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cv_url VARCHAR(500) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT uq_job_email UNIQUE (job_id, email)
);

CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_applications_job_id ON applications(job_id);
```

---

## 3. Cách chạy ứng dụng

### 3.1. Cấu hình cơ sở dữ liệu
Chỉnh sửa thông số kết nối trong `src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/recruitment_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
    username: root
    password: password
```

### 3.2. Khởi chạy với Gradle
```bash
# Trên Windows
./gradlew bootRun

# Trên Linux / macOS
./gradlew bootRun
```

### 3.3. Chạy Unit Test
```bash
./gradlew test
```

---

## 4. Tài liệu và ví dụ Request API

### 4.1. Quản lý Company (CRUD)
- **Tạo công ty**: `POST /companies`
  ```json
  // Request Body
  {
    "name": "Rikkeisoft",
    "address": "Toa nha Handico, Me Tri, Ha Noi",
    "website": "https://rikkeisoft.com"
  }
  ```
- **Lấy danh sách**: `GET /companies`
- **Lấy chi tiết**: `GET /companies/1`
- **Cập nhật**: `PUT /companies/1`
- **Xóa**: `DELETE /companies/1`

### 4.2. Quản lý Job (CRUD, Lọc & Phân trang)
- **Tạo Job**: `POST /jobs`
  ```json
  // Request Body
  {
    "title": "Backend Java Developer",
    "description": "Thành thạo Spring Boot, JPA, MySQL",
    "salaryMin": 1000,
    "salaryMax": 2000,
    "location": "Ha Noi",
    "status": "OPEN",
    "companyId": 1
  }
  ```
- **Lấy danh sách Job có lọc, tìm kiếm, phân trang và sắp xếp**:
  - Endpoint: `GET /jobs?keyword=java&location=Ha Noi&status=OPEN&page=0&size=10&sortBy=id&sortDir=desc`
  - Response (200 OK):
  ```json
  {
    "content": [
      {
        "id": 1,
        "title": "Backend Java Developer",
        "description": "Thành thạo Spring Boot, JPA, MySQL",
        "salaryMin": 1000.00,
        "salaryMax": 2000.00,
        "location": "Ha Noi",
        "status": "OPEN",
        "companyId": 1,
        "companyName": "Rikkeisoft"
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  }
  ```

### 4.3. Nộp hồ sơ ứng tuyển (Application)
- **Nộp đơn**: `POST /jobs/1/applications`
  ```json
  // Request Body
  {
    "fullName": "Nguyen Van Binh",
    "email": "binh.nv@example.com",
    "cvUrl": "https://mycv.site/binhnv.pdf"
  }
  ```
  - Response thành công (**201 Created**):
  ```json
  {
    "id": 1,
    "jobId": 1,
    "jobTitle": "Backend Java Developer",
    "fullName": "Nguyen Van Binh",
    "email": "binh.nv@example.com",
    "cvUrl": "https://mycv.site/binhnv.pdf",
    "appliedAt": "2026-11-05T10:00:00"
  }
  ```

---

## 5. Định dạng lỗi thống nhất (Unified JSON Error Response)

Tất cả các lỗi đều được xử lý qua `@RestControllerAdvice` trả về JSON đồng nhất:

1. **Lỗi 400 Bad Request (Validation hoặc Job CLOSED)**:
   - Khi Job `CLOSED`:
     ```json
     {
       "timestamp": "2026-11-05T10:00:00",
       "status": 400,
       "error": "Bad Request",
       "message": "Công việc hiện đã đóng (CLOSED), không nhận thêm hồ sơ ứng tuyển"
     }
     ```
   - Khi thiếu hoặc sai định dạng dữ liệu đầu vào:
     ```json
     {
       "timestamp": "2026-11-05T10:00:00",
       "status": 400,
       "error": "Bad Request",
       "message": "Dữ liệu đầu vào không hợp lệ",
       "details": {
         "email": "Email không đúng định dạng",
         "fullName": "Họ tên ứng viên không được để trống"
       }
     }
     ```

2. **Lỗi 404 Not Found (Không tìm thấy Job hoặc Company)**:
   ```json
   {
     "timestamp": "2026-11-05T10:00:00",
     "status": 404,
     "error": "Not Found",
     "message": "Không tìm thấy công việc với ID: 999"
   }
   ```

3. **Lỗi 409 Conflict (Trùng email trong cùng một Job)**:
   ```json
   {
     "timestamp": "2026-11-05T10:00:00",
     "status": 409,
     "error": "Conflict",
     "message": "Email 'binh.nv@example.com' đã ứng tuyển vào công việc này trước đó"
   }
   ```

---

## 6. Gợi ý lịch sử Commit Git

Để đạt điểm tối đa cho tiêu chí "Git commit nhỏ, message rõ", bạn có thể commit theo các bước sau:
1. `chore: initialize Spring Boot 3 Gradle project with dependencies`
2. `feat: add Company, Job, Application entities and schema.sql`
3. `feat: add custom exceptions and GlobalExceptionHandler with unified error format`
4. `feat: implement Company CRUD service and controller`
5. `feat: implement Job search, filter by location & status, pagination and sort`
6. `feat: implement apply job API with closed status check and duplicate email validation`
7. `test: add 7 unit tests for ApplicationService and JobService`
8. `docs: add comprehensive README with API examples and setup instructions`
