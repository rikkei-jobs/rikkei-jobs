# Rikkei Jobs - Mock External Systems & Testing Tools

Dịch vụ giả lập các hệ thống bên ngoài phục vụ phát triển và kiểm thử tích hợp cho dự án **Rikkei Jobs** (Sprint 1 - Task T022DB0).

Dịch vụ này chạy độc lập trên **Node.js + Express** ở cổng `9000`, độc lập hoàn toàn với Backend Spring Boot (nhằm phục vụ kịch bản mentor tắt mock để kiểm tra khả năng chịu lỗi và fallback 503 `EXTERNAL_UNAVAILABLE` của backend).

---

## 1. Giới Thiệu Các Hệ Thống Được Giả Lập

Mock Service giả lập 5 hệ thống ngoài:

1. **LMS Core**: Xác thực SSO Ticket, hồ sơ sinh viên, điểm quá trình học tập, danh mục khóa học đào tạo bổ sung và ghi danh khóa học.
2. **Exam System (Khảo thí)**: Điểm thi các môn và chứng chỉ chuyên môn.
3. **LMS Project Management (lms-pm)**: Quản lý đợt thực tập tốt nghiệp IOC, danh sách sinh viên, điểm đánh giá dự án và nghiệm thu task.
4. **Rikkei Meet**: Giả lập API tạo phòng phỏng vấn trực tuyến.
5. **Cloudinary Upload & Delivery (`/cloudinary/*`)**: Giả lập API tải lên có chữ ký SHA-1, phân phối ảnh trực tiếp cho trình duyệt theo `Content-Type` và xóa ảnh.

### Đặc Điểm Kiến Trúc Cốt Lõi

- **Không sử dụng Cơ sở dữ liệu (Database)**: Dữ liệu cố định được đọc từ `data.json` khi khởi động.
- **Trạng thái lưu hoàn toàn trên RAM (In-Memory State)**: Vé SSO, danh sách ghi danh khóa học, danh sách thành viên đợt thực tập, log request, ảnh logo Cloudinary đã tải lên và cờ giả lập lỗi được lưu trong bộ nhớ tạm thời (`Map`, `Array`). Khi tắt tiến trình mock, dữ liệu runtime này sẽ tự động biến mất.
- **Bảo mật dịch vụ**: Mọi request tới 11 route nghiệp vụ (`/lms/*`, `/exam/*`, `/pm/*`, `/meet/*`) bắt buộc phải có header `X-Service-Key: dev-key`. Các route công cụ kiểm thử `/mock/*` và router `/cloudinary/*` không yêu cầu `X-Service-Key` (riêng `/cloudinary/*` xác thực bằng `api_key` và chữ ký SHA-1 cho upload/destroy, đồng thời không ghi log vào `/mock/requests`).
- **Frontend Isolation**: Mã nguồn Frontend không bao giờ được phép gọi các route cần `X-Service-Key` và Nginx của Frontend tuyệt đối không proxy `/mock` hay `/cloudinary`. Trình duyệt chỉ tải ảnh logo qua URL công khai `secure_url` do backend lưu từ phản hồi Cloudinary mock (`http://127.0.0.1:9000/cloudinary/...`).

---

## 2. Hướng Dẫn Khởi Chạy

### Yêu Cầu Môi Trường

- **Node.js**: Phiên bản 18+ (khuyến nghị phiên bản 24 LTS).
- **npm**: Đi kèm với Node.js.

### Lệnh Chạy Trên Máy Host

```bash
# 1. Di chuyển vào thư mục mock
cd mock

# 2. Cài đặt các thư viện phụ thuộc (chỉ có Express 5.3.0)
npm install

# 3. Khởi chạy Mock Service
npm start
```

Khi khởi chạy thành công, console sẽ in ra chính xác:

```text
Mock chạy ở http://localhost:9000
```

### Chạy Với Docker Container

```bash
# Build image
docker build -t rikkei-jobs-mock .

# Run container
docker run -d -p 9000:9000 --name rikkei-jobs-mock rikkei-jobs-mock
```

---

## 3. Cấu Hình Biến Môi Trường

| Biến Môi Trường | Mặc Định | Mô Tả |
|---|---|---|
| `PORT` | `9000` | Cổng HTTP mà Mock server lắng nghe |
| `SERVICE_KEY` | `dev-key` | Khóa xác thực bắt buộc truyền qua header `X-Service-Key` cho 11 endpoint nghiệp vụ |
| `PUBLIC_BASE_URL` | `http://127.0.0.1:9000` | URL công khai trình duyệt truy cập được, ghép vào `secure_url` trả về từ `/cloudinary/*` (khớp `CLOUDINARY_DELIVERY_BASE_URL`) |
| `CLOUDINARY_API_KEY` | `dev-key` | API key giả lập dùng khi xác thực request Cloudinary mock |
| `CLOUDINARY_API_SECRET` | `dev-secret` | API secret giả lập dùng để kiểm chứng chữ ký SHA-1 Cloudinary mock |

---

## 4. Bảng Hợp Đồng 11 Endpoint Nghiệp Vụ

Tất cả các endpoint này **bắt buộc** phải có header `X-Service-Key: dev-key`. Nếu thiếu hoặc sai, Mock trả về HTTP `401 Unauthorized`:

```json
{
  "code": "INVALID_SERVICE_KEY",
  "message": "Thiếu hoặc sai X-Service-Key"
}
```

| STT | Phương Thức | Đường Dẫn | Tham Số / Body | Status Code Phản Hồi | Ý Nghĩa Nghiệp Vụ |
|---|---|---|---|---|---|
| 1 | `POST` | `/lms/sso/tickets` | Body: `{"lmsUserId": "lms-sv-001"}` | `201 Created` / `404 NOT_FOUND` | Cấp vé SSO ngẫu nhiên 32 hex |
| 2 | `POST` | `/lms/sso/verify` | Body: `{"ticket": "..."}` | `200 OK` / `404 NOT_FOUND` | Xác thực vé SSO (*Lưu ý: Mock không chặn vé cũ/quá hạn*) |
| 3 | `GET` | `/lms/students/:lmsUserId` | Path: `lmsUserId` | `200 OK` / `404 NOT_FOUND` | Lấy hồ sơ học viên (chỉ CANDIDATE) |
| 4 | `GET` | `/lms/students/:lmsUserId/results` | Path: `lmsUserId` | `200 OK` (hoặc `[]`) | Điểm quá trình các môn học tại LMS |
| 5 | `GET` | `/lms/courses` | Query: `?skill=JAVA` (tùy chọn) | `200 OK` (hoặc `[]`) | Danh sách khóa học mở rộng (hỗ trợ lọc theo skill) |
| 6 | `POST` | `/lms/enrollments` | Body: `{"lmsUserId", "courseId"}` | `201 Created` / `404` / `409 ALREADY_ENROLLED` | Ghi danh sinh viên vào khóa học LMS |
| 7 | `GET` | `/lms/enrollments/:lmsUserId` | Path: `lmsUserId` | `200 OK` (hoặc `[]`) | Danh sách các khóa học sinh viên đã ghi danh |
| 8 | `GET` | `/exam/students/:lmsUserId/results` | Path: `lmsUserId` | `200 OK` (hoặc `[]`) | Điểm thi khảo thí của sinh viên |
| 9 | `GET` | `/pm/students/:lmsUserId/internships` | Path: `lmsUserId` | `200 OK` (hoặc `[]`) | Lịch sử thực tập dự án IOC và các task |
| 10 | `POST` | `/pm/batches/:batchId/members` | Path: `batchId`, Body: `{"lmsUserId"}` | `201 Created` / `404` / `409 ALREADY_MEMBER` | Thêm sinh viên vào đợt thực tập |
| 11 | `POST` | `/meet/rooms` | Body: `{"title", "startAt", "endAt"}` | `201 Created` / `400 VALIDATION_ERROR` | Giả lập tạo phòng phỏng vấn trực tuyến |

> **LƯU Ý QUAN TRỌNG VỀ SSO TICKET (NT-01)**:
> Endpoint `POST /lms/sso/verify` trong Mock **cố tình không thu hồi vé và không kiểm tra vé quá hạn 60 giây**. Nếu gọi liên tiếp 2 lần cùng một vé hợp lệ, Mock đều trả về `HTTP 200 OK`.
> Việc kiểm tra vé cũ (chống Replay Attack bằng bảng `used_sso_tickets`) và kiểm tra vé hết hạn (> 60s dựa vào `issuedAt`) **thuộc về trách nhiệm bảo mật của Backend Rikkei Jobs** ở task NT-01.

---

## 5. Không Gian Tên Cloudinary Mock (`/cloudinary/*`)

Router `/cloudinary/*` tách biệt với 11 endpoint nghiệp vụ, không yêu cầu `X-Service-Key` và không ghi vào `requestLog`:

| Phương Thức | Đường Dẫn | Nội Dung | Phản Hồi |
|---|---|---|---|
| `POST` | `/cloudinary/v1_1/:cloud/image/upload` | Form `application/x-www-form-urlencoded` (tối đa `5mb`): `api_key`, `timestamp`, `public_id`, `overwrite`, `invalidate`, `unique_filename`, `file` (data URI `png`/`jpeg`), `signature` SHA-1 | `200` JSON `{ public_id, secure_url, version, format, bytes }`, `401` nếu sai key/signature, `400` nếu sai data URI/`public_id`, `503` (hoặc mã cấu hình) nếu bật `fail-next` |
| `GET` | `/cloudinary/:cloud/image/upload/*` | Đường dẫn phân phối ảnh (ví dụ `v1763437800/rikkei-jobs/company-logos/company-1.png`) | `200` byte ảnh gốc + `Content-Type` (`image/png` hoặc `image/jpeg`) + `Cache-Control: no-store`, hoặc `404` |
| `POST` | `/cloudinary/v1_1/:cloud/image/destroy` | Form `application/x-www-form-urlencoded`: `api_key`, `timestamp`, `public_id`, `signature` | `200` `{ result: "ok" \| "not found" }`, `401` nếu sai key/signature |

---

## 6. Bảng 5 Công Cụ Kiểm Thử Cho Mentor (`/mock/*`)

Các công cụ này:

- Nằm dưới tiền tố `/mock/*`.
- **Không yêu cầu header `X-Service-Key`**.
- **Không bị ghi log** vào nhật ký `requestLog`.

| STT | Phương Thức | Đường Dẫn | Body | Ý Nghĩa / Mục Đích Kiểm Thử |
|---|---|---|---|---|
| 1 | `POST` | `/mock/reload` | Trống hoặc `{}` | Nạp lại file `data.json` vào RAM tức thì mà không cần khởi động lại tiến trình (phục vụ test NT-05, TT-01 khi sửa điểm) |
| 2 | `GET` | `/mock/requests` | Không có | Lấy danh sách 100 request gần nhất Backend đã gửi tới 11 endpoint nghiệp vụ (loại trừ `/mock/*` và `/cloudinary/*`) |
| 3 | `PATCH` | `/mock/enrollments` | `{lmsUserId, courseId, progress, score, status}` | Cập nhật tiến độ/điểm/trạng thái khóa học ghi danh trong RAM (phục vụ test DT-02, DT-03 chuyển COMPLETED) |
| 4 | `POST` | `/mock/reset` | Trống hoặc `{}` | Xóa sạch vé SSO, lượt ghi danh, thành viên đợt, log request, ảnh Cloudinary đã lưu và cờ `fail-next` (đưa mock về trạng thái sạch ban đầu) |
| 5 | `POST` | `/mock/cloudinary/fail-next` | `{status?, message?}` (tùy chọn, mặc định `503`) | Ép lần gọi upload Cloudinary kế tiếp thất bại một lần (single-shot) để kiểm thử xử lý lỗi `502 LOGO_STORAGE_UNAVAILABLE` |

---

## 7. Hướng Dẫn Sử Dụng Script `send-evaluation-links.js`

Script này giả lập hệ thống lms-pm gọi sang Rikkei Jobs để lấy đường link phiếu đánh giá cho mentor (dùng cho kịch bản kiểm thử tác vụ TT-04).

### Cú Pháp Lệnh

```bash
node mock/send-evaluation-links.js <batchId>
```

### Ví Dụ Thực Tế

```bash
# Gửi yêu cầu link đánh giá cho đợt thực tập IOC-JB-2026-09
node mock/send-evaluation-links.js IOC-JB-2026-09
```

### Xử Lý An Toàn Trong Sprint 1

Trong Sprint 1, Backend chưa triển khai endpoint `/api/v1/integrations/pm/evaluation-links` (tính năng sẽ hoàn thành ở TT-04). Do đó, script được tích hợp khối `try-catch` an toàn:

- Nếu Backend chưa chạy hoặc trả về 404/503: Script in thông báo cảnh báo rõ ràng ra console và kết thúc êm thấm mà không crash.

---

## 8. Kiểm Thử API Bằng Bộ Test Có Sẵn

Dự án cung cấp bộ kiểm thử tự động `mock/test-runner.js` (`node mock/test-runner.js` hoặc `npm test --prefix mock`) kiểm tra cả 11 endpoint nghiệp vụ, 5 công cụ `/mock/*` và không gian tên `/cloudinary/*`, cùng file `mock/api-test.http`.

Bạn có thể chạy trực tiếp bằng tiện ích mở rộng **REST Client** trên VS Code hoặc dùng lệnh `curl`:

```bash
# Kiểm tra cấp vé SSO
curl -X POST http://localhost:9000/lms/sso/tickets \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: dev-key" \
  -d "{\"lmsUserId\": \"lms-sv-001\"}"

# Kiểm tra thiếu X-Service-Key (kỳ vọng HTTP 401)
curl -i -X GET http://localhost:9000/lms/courses

# Xem danh sách request log của mock
curl -X GET http://localhost:9000/mock/requests
```
