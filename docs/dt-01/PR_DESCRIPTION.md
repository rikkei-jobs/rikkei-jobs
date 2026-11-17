# Pull Request: Phân Tích Khoảng Thiếu Hụt Năng Lực Theo JD Và Vị Trí Mục Tiêu (DT-01 / T023D16)

## 1. Tổng Quan

Task DT-01 bổ sung luồng so sánh năng lực ứng viên với mức yêu cầu của một vị trí mục tiêu hoặc
một JD, trả về danh sách kỹ năng còn thiếu, mức ưu tiên và tỷ lệ sẵn sàng.

Phạm vi đã triển khai đầy đủ ba lớp:

- DB: bốn bảng mới `target_positions`, `position_skills`, `candidate_targets`, `gap_results`;
  seed 4 vị trí mục tiêu.
- BE: API chọn mục tiêu, API phân tích gap, API danh sách vị trí, API chi tiết JD; OpenAPI cập nhật.
- FE: màn chọn vị trí mục tiêu, bảng kỹ năng thiếu bản cơ bản, nút "Phân tích so với JD này" trong
  trang chi tiết JD.

Nguồn điểm hiện tại là `skill_scores.verified_score` của HS-01 (không dùng bảng snapshot
`candidate_skills` của module AI). Kỹ năng chưa có điểm xác thực được tính là 0.

## 2. Thiết Kế Cơ Sở Dữ Liệu

Migration schema: `backend/src/main/resources/db/migration/V13__target_positions_gap_analysis.sql`.
Migration seed dev: `backend/src/main/resources/db/migration-dev/V14__dev_gap_analysis_seed.sql`.

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `target_positions` | `id`, `code`, `name`, `description` | 4 vị trí seed: Java Backend Fresher, Frontend ReactJS Fresher, Tester, Fullstack |
| `position_skills` | `position_id`, `skill_id`, `min_score` | Unique theo cặp position/skill; mọi kỹ năng của vị trí được xem là bắt buộc |
| `candidate_targets` | `user_id` PK, `position_id`, `job_id`, `chosen_at` | CHECK bắt buộc đúng một trong hai cột position/job |
| `gap_results` | `user_id`, `target_type`, `target_id`, `skill_id`, `required`, `current`, `gap`, `computed_at` | Composite PK; chỉ lưu các kỹ năng thiếu (gap > 0) |

Quy ước được giữ nguyên: không có khóa ngoại xuyên module, mọi tham chiếu `user_id`, `skill_id`,
`position_id`, `job_id` là scalar; DDL idempotent với `IF NOT EXISTS`; seed dev dùng
`ON CONFLICT DO NOTHING` và `setval`.

## 3. API Mới

Tất cả endpoint đều yêu cầu JWT Bearer và đi qua `MustChangePasswordFilter` như các API hiện có.

| Method | Path | Mô tả | Mã thành công | Mã lỗi |
| --- | --- | --- | --- | --- |
| PUT | `/api/v1/me/target` | Chọn vị trí hoặc JD mục tiêu | 200 | 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 403 MUST_CHANGE_PASSWORD, 404 NOT_FOUND |
| GET | `/api/v1/me/target` | Mục tiêu hiện tại | 200 | 401, 403, 404 NOT_FOUND |
| GET | `/api/v1/me/gap-analysis?jobId=` | Phân tích gap theo mục tiêu đã lưu hoặc theo JD truyền vào | 200 | 400 VALIDATION_ERROR, 401, 403, 404 NOT_FOUND |
| GET | `/api/v1/target-positions` | Danh sách vị trí mục tiêu | 200 | 401, 403 |
| GET | `/api/v1/jobs/{jobId}` | Chi tiết JD đang tuyển dụng và kỹ năng yêu cầu | 200 | 401, 403, 404 NOT_FOUND |

Quy tắc tính:

- `required`: `position_skills.min_score` hoặc `job_skills.required_level`.
- `current`: `skill_scores.verified_score`; thiếu bản ghi hoặc điểm null thì bằng 0.
- `gap = required - current`; chỉ trả các dòng có gap > 0, sắp giảm dần theo gap rồi theo mã kỹ năng.
- `priority`: HIGH khi kỹ năng bắt buộc và gap > 20; MEDIUM khi gap > 10; còn lại LOW.
- `readiness`: phần trăm kỹ năng đạt yêu cầu trên tổng số kỹ năng của mục tiêu, làm tròn số nguyên.
- `GET /me/gap-analysis?jobId=` không thay đổi mục tiêu đã lưu; nút trong trang JD dùng
  `PUT /me/target` rồi `GET /me/gap-analysis` để mục tiêu chuyển sang JD đó.

Ví dụ thực tế với candidate1 và vị trí Java Backend Fresher:

```json
{
  "target": {
    "type": "POSITION",
    "id": 1,
    "code": "JAVA_BACKEND_FRESHER",
    "name": "Java Backend Fresher"
  },
  "readiness": 71,
  "items": [
    {
      "skillCode": "CLEAN_CODE",
      "required": 60.00,
      "current": 0.00,
      "gap": 60.00,
      "priority": "HIGH"
    },
    {
      "skillCode": "DOCKER",
      "required": 60.00,
      "current": 0.00,
      "gap": 60.00,
      "priority": "HIGH"
    }
  ]
}
```

## 4. Dữ Liệu Mẫu Và Kết Quả Mong Đợi

Điểm verified của candidate1 được tính từ seed HS-01: JAVA 79.07, SPRING_BOOT 78.00, SQL 80.00,
REST_API 75.00, GIT 90.00; DOCKER và CLEAN_CODE chưa có bằng chứng nên bằng 0.

| Kịch bản | Mục tiêu | Readiness | Kỹ năng thiếu |
| --- | --- | --- | --- |
| Vị trí Java Backend Fresher | `positionId=1` | 71% | CLEAN_CODE 60 HIGH, DOCKER 60 HIGH |
| Đổi sang Frontend ReactJS Fresher | `positionId=2` | 60% | REACTJS 70 HIGH, JAVASCRIPT 5 LOW |
| JD 1 - Java Backend Junior/Middle | `jobId=1` | 80% | DOCKER 60 MEDIUM (kỹ năng không bắt buộc) |
| JD 3 - Backend Engineer Spring Boot | `jobId=3` | 75% | JAVA 0.93 LOW (min_score 80 của JD) |
| JD 8 - Software QA/QC | `jobId=8` | 50% | TESTING 75 HIGH, COMMUNICATION 65 MEDIUM |

Các kỹ năng đã đạt như JAVA, SPRING_BOOT, SQL, REST_API, GIT không xuất hiện trong `items`.

## 5. Hướng Dẫn Chạy

### 5.1. Chạy toàn bộ bằng Docker Compose

```bash
cp .env.example .env
docker compose up -d --build --wait
```

Truy cập:

- Frontend: `http://127.0.0.1:3000`
- Swagger UI: `http://127.0.0.1:8080/swagger-ui.html`
- OpenAPI JSON: `http://127.0.0.1:8080/api-docs`

Đăng nhập bằng tài khoản seed `candidate1@rikkeijobs.test` / `Test@123` (tab Doanh Nghiệp), sau đó
mở:

- `http://127.0.0.1:3000/candidate/gap-analysis`
- `http://127.0.0.1:3000/candidate/jobs/1`

### 5.2. Chạy từng thành phần

```bash
# Backend (profile dev, Flyway tự chạy V1-V8 và V11-V14)
cd backend
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run

# Frontend
cd frontend
npm ci
npm run dev
```

Lưu ý khi dùng lại database dev cũ: nếu database đã từng chạy bản trước khi merge develop (bản có
`V11__jobs_and_recommendations.sql`), cần tạo lại database/volume để Flyway không báo lệch checksum.
Database mới chỉ cần chạy tới V14.

### 5.3. Gọi API bằng cURL

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"candidate1@rikkeijobs.test","password":"Test@123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

curl -s -X PUT http://127.0.0.1:8080/api/v1/me/target \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"positionId":1}'

curl -s http://127.0.0.1:8080/api/v1/me/gap-analysis -H "Authorization: Bearer $TOKEN"
curl -s "http://127.0.0.1:8080/api/v1/me/gap-analysis?jobId=1" -H "Authorization: Bearer $TOKEN"
curl -s http://127.0.0.1:8080/api/v1/jobs/1 -H "Authorization: Bearer $TOKEN"
```

## 6. OpenAPI

Spec được sinh bởi springdoc từ annotation trên controller, không có file OpenAPI tĩnh trong repo.
Các endpoint mới được gắn `@Tag`, `@Operation`, `@ApiResponse` cho từng mã trạng thái, mô tả chứa
đúng token lỗi (`VALIDATION_ERROR`, `UNAUTHORIZED`, `MUST_CHANGE_PASSWORD`, `NOT_FOUND`) và
`@SecurityRequirement(name = "bearerAuth")`.

Test `AuthControllerIntegrationTest.testOpenApiDocumentationCompleteness` đã được mở rộng để assert
các path mới xuất hiện trong `/api-docs` cùng đầy đủ mã 200/400/401/403/404.

## 7. Kiểm Thử Và Bằng Chứng

### 7.1. Lệnh đã chạy

```bash
cd frontend
npm run typecheck
npm run lint
npm test
npm run build

cd ../backend
./mvnw spotless:check
./mvnw spotbugs:check
DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock \
TESTCONTAINERS_RYUK_DISABLED=true ./mvnw test

node scripts/validate-agent-config.mjs
npx --yes --package cspell@10.4.1 --package @cspell/dict-vi-vn@3.0.7 \
  cspell "**/*.{md,java,ts,tsx,js,mjs,sql,yml,json,jsonc}"
npx --yes markdownlint-cli2@0.24.0 "**/*.md" \
  "#**/node_modules/**" "#**/target/**" "#**/dist/**" "#**/.agents/**"
docker run --rm -v "$PWD:/repo" -w /repo sqlfluff/sqlfluff:4.5.0 \
  lint backend/src/main/resources/db/migration

# Toàn bộ gate (môi trường local dùng podman rootless thay cho Docker daemon)
DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock \
TESTCONTAINERS_RYUK_DISABLED=true ./check.sh
```

### 7.2. Kết quả thực tế

```text
Frontend: typecheck PASS, ESLint PASS, build PASS, 121/121 Vitest tests PASS
Backend: Spotless PASS, SpotBugs 0 bug, 376/376 tests PASS (BUILD SUCCESS)
OpenAPI completeness test: PASS
Agent config validation: PASS 9/9 checks, E2-1 zero raw color literals
CSpell: 399 files checked, 0 issues
Markdownlint: 190 files linted, 0 issues
SQLFluff: All Finished
./check.sh: 24/26 gate PASS
```

Hai gate Hadolint và Actionlint báo đỏ trong `check.sh` do container runtime podman rootless trên máy
local không spawn được thread cho GHC/Go runtime (`Hadolint: internal error: Ticker: Failed to spawn
thread`, Actionlint panic trong Go runtime). Chạy lại bằng binary native cùng phiên bản đều đạt:

```text
hadolint 2.15.1 backend/Dockerfile frontend/Dockerfile mock/Dockerfile -> exit 0
actionlint 1.7.12 .github/workflows/ci.yml                         -> exit 0
```

CI dùng Docker daemon tiêu chuẩn nên hai gate này chạy bình thường; phần còn lại của `check.sh` đã
PASS đầy đủ, gồm backend 376 test, frontend 121 test, SQLFluff, CSpell, markdownlint, version drift,
contrast, gate sync và agent config.

Integration test mới `GapAnalysisIntegrationTest` có 15 test phủ các kịch bản: danh sách vị trí,
chọn và đổi mục tiêu, kỹ năng thiếu đúng, readiness, priority HIGH/MEDIUM/LOW, JD dùng đúng
`min_score`, JD draft/hết hạn trả 404, validate request, 401/403 và lưu `gap_results`.

## 8. Ảnh Màn Hình

Ảnh minh họa được đính trực tiếp vào mô tả Pull Request thay vì commit vào repository: trang ứng
viên có lối vào phân tích khoảng thiếu, màn chọn vị trí mục tiêu, chi tiết JD và kết quả phân tích
theo JD.

## 9. Đối Chiếu Tiêu Chí Nghiệm Thu

| Tiêu chí | Cách đáp ứng |
| --- | --- |
| Seed ứng viên có điểm biết trước, kết quả thiếu đúng từng kỹ năng | `V14__dev_gap_analysis_seed.sql` + HS-01 recompute; test `positionGapAnalysis` |
| Đổi mục tiêu thì kết quả đổi theo | `switchingTargetChangesResult`; UI `GapAnalysisSection` gọi PUT rồi GET |
| Kỹ năng đã đạt không nằm trong danh sách thiếu | Calculator bỏ qua gap <= 0; test assert JAVA/SPRING_BOOT/SQL không có trong items |
| Phân tích theo JD dùng đúng min_score của JD | `jdAnalysisUsesJobSkillRequirements`, `jdMinScoreComesFromTheSelectedJob` |
| PR có cách chạy, dữ liệu mẫu, ảnh màn hình, OpenAPI | Các mục 4, 5, 6, 8 trong tài liệu này |
| Review nội bộ và mentor duyệt | Chờ reviewer trong nhóm và mentor duyệt trên GitHub PR |

## 10. Danh Mục Kiểm Tra Của Reviewer

- [ ] Migration V13/V14 chạy sạch trên database trống ở profile dev.
- [ ] `PUT /me/target` từ chối cả hai hoặc không có `positionId`/`jobId`.
- [ ] `GET /me/gap-analysis` chỉ trả kỹ năng thiếu và sắp theo gap giảm dần.
- [ ] Đổi từ vị trí sang JD làm thay đổi kết quả như bảng dữ liệu mẫu.
- [ ] Nút "Phân tích so với JD này" hoạt động với JD APPROVED còn hạn.
- [ ] OpenAPI tại `/api-docs` có 5 path mới và đủ mã lỗi.
- [ ] Không có màu hardcode trong frontend (Check 9 / E2-1).
