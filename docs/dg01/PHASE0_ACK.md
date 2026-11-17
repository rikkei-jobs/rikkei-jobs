# Ghi nhận và Tuân thủ Quy tắc Phase 0 (Phase 0 ACK & Rule Audit)

## Round DG-01-fix: Phiếu đánh giá của mentor theo khung kỹ năng (Task T023B91, PR #3)

---

### 1. Danh sách các tài liệu và quy tắc đã đọc trọn vẹn

Chúng tôi xác nhận đã đọc trọn vẹn, hiểu rõ và tuân thủ tuyệt đối từng chữ trong toàn bộ các tài liệu nền tảng, quy tắc ràng buộc và kỹ năng chuyên môn trước khi thực hiện bất kỳ chỉnh sửa nào đối với mã nguồn dự án:

1. **Văn bản chỉ đạo đặc thù**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_DG01FIX_EN.txt` (120 dòng): Đặc tả kỹ thuật chi tiết cho Vòng DG-01-fix, bao gồm hiện trạng nhánh PR #3, các lỗi do đồng đội để lại, và các cổng chất lượng G1 đến G8.
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (45 dòng): Quy tắc ràng buộc cơ sở R0, R1, R2 áp dụng cho mọi vòng phát triển của dự án Rikkei Jobs.
2. **Quy định của agent và dự án**:
   - `CLAUDE.md`: Hướng dẫn môi trường, quy chuẩn kiểm thử và các quy tắc kiểm tra chất lượng.
   - `GEMINI.md`: Định nghĩa kiến trúc hệ thống, vai trò trách nhiệm và các ràng buộc kỹ thuật.
   - `AGENTS.md`: Chỉ dẫn chung cho agent vận hành trong dự án Rikkei Jobs.
3. **Trọn bộ 16 Quy tắc cốt lõi (.claude/rules/)**:
   - `01-project-context.md`: Bối cảnh dự án, 5 roles, 20 kỹ năng chuẩn, phiên bản công nghệ đã ghim.
   - `02-git-and-delivery.md`: Chế độ Git READ-ONLY, không commit/push, quy ước prefix commit `T023B91:`.
   - `03-safety-and-secrets.md`: An toàn bảo mật, cấm chạm secret/pem/.env, xóa file tạm sau kiểm thử.
   - `04-honest-verification.md`: Kiểm chứng trung thực bằng lệnh thực tế, nghiêm cấm làm sai lệch dữ liệu.
   - `05-backend-java.md`: Chuẩn Backend Java 25, DTOs là immutable record, cấm Lombok & MapStruct.
   - `06-database-flyway.md`: Quản lý schema qua Flyway, migrations V7 và V8 mới, không sửa migration cũ.
   - `07-security-rbac.md`: Bảo mật Spring Security deny-by-default, RBAC phân quyền và chống Insecure Direct Object Reference 404.
   - `08-frontend-engineering.md`: React 19, TypeScript strict mode, feature slice, dùng duy nhất httpClient.
   - `09-frontend-design-bar.md`: Thanh chất lượng thiết kế UI, tuyệt đối cấm emoji, dùng token màu chuẩn.
   - `10-testing-strategy.md`: Chiến lược kiểm thử TDD red-then-green, hermetic tests trên Testcontainers.
   - `11-docs-and-bilingual.md`: Tài liệu song ngữ Anh - Việt đầy đủ dấu, CSpell 0 lỗi, markdownlint chuẩn.
   - `12-ci-and-quality-gates.md`: Đồng bộ 26 quality gates, cấm chạy scripts/run-ci-in-docker.*.
   - `13-backend-data-access-performance.md`: Hiệu năng truy cập dữ liệu, chống N+1 queries, optimistic locking.
   - `14-backend-module-boundaries.md`: Phân lập ranh giới module, cấm import entity/repo liên module.
   - `15-backend-observability-ops.md`: Giám sát vận hành, log SLF4J không lộ PII/secret, inject Clock bean.
   - `16-backend-integrations.md`: Tích hợp hệ thống, OpenAPI 3 đầy đủ 5 endpoints, cấm dependency lạ.
4. **Trọn bộ 28 Kỹ năng chuyên sâu (.claude/skills/)**:
   - `using-rikkei-skills`, `test-driven-development`, `systematic-debugging`, `brainstorming-before-building`, `writing-implementation-plans`, `executing-plans`, `dispatching-parallel-agents`, `backend-module-feature`, `backend-module-boundaries`, `backend-persistence-performance`, `flyway-migration-authoring`, `spring-security-rbac-endpoint`, `api-contract-and-errors`, `external-system-integration-and-mock`, `security-review-checklist`, `frontend-feature-slice`, `frontend-visual-design`, `frontend-motion-design`, `frontend-iconography`, `frontend-accessibility-audit`, `ci-local-and-debug`, `docs-bilingual-update`, `requesting-code-review`, `receiving-code-review`, `verification-before-completion`, `handoff-to-team-lead`, `module-domain-knowledge`, `writing-skills`.

---

### 2. Bảng 16 Quy tắc cốt lõi (.claude/rules/)

| STT | Mã quy tắc | Ràng buộc cụ thể cho DG-01 | Phương án kiểm chứng độc lập |
|---|---|---|---|
| 1 | `01-project-context` | Áp dụng đúng mã task `T023B91`, 5 roles hệ thống, 20 kỹ năng chuẩn với thang điểm 0-100; giữ nguyên phiên bản công nghệ đã ghim. | Chạy `node scripts/check-version-drift.mjs` đạt exit code 0. |
| 2 | `02-git-and-delivery` | Git tuyệt đối READ-ONLY: không commit, push, reset hay đổi nhánh; để toàn bộ thay đổi uncommitted; đề xuất commit có prefix `T023B91:`. | `git status` xác nhận không có commit mới và working tree phản ánh đúng diff. |
| 3 | `03-safety-and-secrets` | Không đọc/chạm vào `first-key.pem`, `.env`, `*.pem`; không in secret; file tạm chỉ để trong `$env:TEMP` và xóa ngay; không sửa `.agents/` hay `Tai lieu du an`. | Rà soát working tree và lệnh shell, đảm bảo thư mục ngoài phạm vi không bị ghi. |
| 4 | `04-honest-verification` | Chỉ ghi PASS khi lệnh thực tế chạy exit code 0 kèm raw output; không bịa số liệu; logic thời gian phải inject `java.time.Clock`. | So chiếu raw stdout/stderr trong terminal và báo cáo. |
| 5 | `05-backend-java` | Java 25, DTOs là immutable `record`, cấm Lombok & MapStruct; compiler `-Xlint:all -Werror`, code format Google Java Format AOSP qua Spotless, SpotBugs clean. | Chạy `./mvnw spotless:check`, `./mvnw spotbugs:check`, `./mvnw clean test-compile` pass. |
| 6 | `06-database-flyway` | Schema qua Flyway: V7 (prod DDL) và V8 (dev seed DML); không sửa migration cũ của develop; khóa chính BIGINT, `TIMESTAMPTZ DEFAULT NOW()`, snake_case, không FK cross-module. | `./mvnw test -D "test=FlywayMigrationIntegrationTest"` và `ProfileSeparationIntegrationTest`. |
| 7 | `07-security-rbac` | Deny-by-default, không permitAll cho bất kỳ endpoint nào của DG-01; MENTOR tạo/sửa/submit; CANDIDATE/HR xem profile; Insecure Direct Object Reference trả về 404 không lộ tài nguyên. | Suite test bảo mật Spring Security với Testcontainers pass toàn bộ role matrix. |
| 8 | `08-frontend-engineering` | React 19, TypeScript strict mode (không `any`, không `@ts-ignore`), cấu trúc feature slice trong `features/candidate/`, dùng duy nhất `shared/api/httpClient.ts`. | `npm run lint --prefix frontend`, `npm run typecheck --prefix frontend`, `npm run test --prefix frontend`. |
| 9 | `09-frontend-design-bar` | TUYỆT ĐỐI KHÔNG DÙNG EMOJI trong UI; icon 24px `<Icon name=... />`; 100% màu qua CSS token; typography không bị cắt dấu tiếng Việt; motion budget có prefers-reduced-motion. | Script `compute-contrast` pass, gate Check 9 green, rubric Anti-AI >= 11/12 điểm. |
| 10 | `10-testing-strategy` | Tuân thủ TDD red-then-green; test hermetic trên Testcontainers không cố định port, không `Thread.sleep`; pass 346 tests baseline + test mới. | `./mvnw clean test` và Vitest frontend pass hoàn toàn. |
| 11 | `11-docs-and-bilingual` | Báo cáo tiếng Việt đầy đủ dấu; tài liệu `docs/dg01/README.md` & `PR_DESCRIPTION.md` song ngữ Anh-Việt; CSpell 0 lỗi, không inline ignore bừa bãi. | `npx markdownlint-cli2 "**/*.md"`, `npx cspell "**/*.md"`, `check-version-drift.mjs`. |
| 12 | `12-ci-and-quality-gates` | Đảm bảo 26 gates giữa `check.sh`, `check.ps1` và CI đồng bộ; TUYỆT ĐỐI KHÔNG CHẠY `scripts/run-ci-in-docker.*`. | `node scripts/check-gate-sync.mjs` và chạy pass `./check.sh` / `.\check.ps1`. |
| 13 | `13-backend-data-access-performance` | `open-in-view: false`, `ddl-auto: none`, chống N+1 queries khi đọc evaluation cho profile (fetch join/graph); `@Transactional(readOnly=true)` cho query; optimistic locking `@Version`. | Test đếm SQL statement count = 1 câu và test concurrent double submit pass. |
| 14 | `14-backend-module-boundaries` | Phân lập module: `assessment` không import entity/repo của `identity` hay `candidate`; tham chiếu qua scalar ID (`BIGINT`); giao tiếp qua public service interface trả về record. | Kiểm tra import statement và kiến trúc package không có dependency vi phạm. |
| 15 | `15-backend-observability-ops` | Log có cấu trúc SLF4J, không log PII, secret, password; Actuator `show-details: never`; inject `Clock` kiểm soát thời gian. | `ActuatorHealthTest` và `AdversarialLogSanitizationStressTest` pass. |
| 16 | `16-backend-integrations` | Không thêm dependency mới (cấm Lombok, MapStruct); SpringDoc OpenAPI 3 mô tả đủ 5 endpoints, tắt Swagger UI ở prod profile. | Kiểm tra `backend/pom.xml`, Swagger UI dev mở được và prod bị chặn. |

---

### 3. Bảng 28 Kỹ năng (Skills)

| STT | Tên Skill | Ràng buộc cụ thể cho DG-01 | Phương án kiểm chứng độc lập |
|---|---|---|---|
| 1 | `using-rikkei-skills` | Đọc và tuân thủ các skill áp dụng trước khi thực thi từng bước trong round. | Kiểm tra nhật ký thực hiện và ghi nhận trong `PHASE0_ACK.md`. |
| 2 | `test-driven-development` | Viết test red trước cho từng yêu cầu (submit thiếu điểm, Insecure Direct Object Reference, N+1...), sau đó viết code green. | Ghi nhận bằng chứng red-then-green trong báo cáo kiểm thử. |
| 3 | `systematic-debugging` | Phân tích lỗi 33 test failing trên develop dựa trên root cause migration V3/V5, không đoán mò. | Khôi phục develop migrations và chứng minh 33 test pass. |
| 4 | `brainstorming-before-building` | Phân tích phương án chống concurrent double submit (optimistic locking vs row lock) và chống N+1. | Ghi nhận cơ sở giải pháp trong báo cáo kỹ thuật. |
| 5 | `writing-implementation-plans` | Lập kế hoạch chi tiết từng Gate G1-G8 với các tiêu chí nghiệm thu có thể kiểm chứng. | Kế hoạch được rà soát và ghi vào phase 0. |
| 6 | `executing-plans` | Thực thi tuần tự từng gate, kiểm tra gate trước khi chuyển sang gate tiếp theo. | Raw command output xác nhận sau mỗi gate. |
| 7 | `dispatching-parallel-agents` | Giữ ranh giới phân công rõ ràng, giao tiếp qua file handoff và message, không sửa đè file. | Báo cáo handoff tự chứa, không gây mâu thuẫn. |
| 8 | `backend-module-feature` | Phát triển tính năng trong module `assessment` đầy đủ controller, service, repository, model. | Build và test module assessment hoạt động trơn tru. |
| 9 | `backend-module-boundaries` | Cô lập mã nguồn `assessment`: cấm import entity/repo của `candidate` và `identity`. | Grep import chéo trả về 0 kết quả. |
| 10 | `backend-persistence-performance` | Đánh chỉ mục đúng cột lookup (`user_id`, `mentor_id`, `status`), truy vấn không N+1, inject `Clock`. | Test kiểm tra statement count <= 1 câu query. |
| 11 | `flyway-migration-authoring` | Viết V7 (DDL prod) và V8 (DML dev seed) idempotent, snake_case, timestamptz DEFAULT NOW(). | Chạy test migration áp dụng từ rỗng và trên nền develop cũ pass. |
| 12 | `spring-security-rbac-endpoint` | Cấu hình phân quyền chặt chẽ cho 5 endpoints, chặn Insecure Direct Object Reference trả về 404 thay vì 403. | Test integration cho ma trận phân quyền pass. |
| 13 | `api-contract-and-errors` | DTO request/response dạng immutable record, whitelist chặt chẽ, mã lỗi domain tiếng Việt. | Test các mã lỗi 400, 403, 404, 409 trả về ErrorResponse chuẩn. |
| 14 | `external-system-integration-and-mock` | Không can thiệp mock server, giữ nguyên hợp đồng `X-Service-Key` của common client. | `ExternalApiClientIntegrationTest` pass. |
| 15 | `security-review-checklist` | Rà soát lỗi OWASP: Mass assignment, Insecure Direct Object Reference, Injection, PII leakage trong log, hardcoded secret. | `AdversarialSecurityIntegrationTest` pass. |
| 16 | `frontend-feature-slice` | Tổ chức mã nguồn trong `features/candidate/`, public API qua `index.ts`. | Cấu trúc thư mục chuẩn và TypeScript typecheck pass. |
| 17 | `frontend-visual-design` | Dùng token màu Confident Royal Cobalt & Iron Obsidian, không dùng linear-gradient tím-xanh. | Linter Check 9 green và visual review rubric pass. |
| 18 | `frontend-motion-design` | Motion budgets: micro-interaction <= 150ms, detail <= 300ms, hỗ trợ `prefers-reduced-motion`. | Kiểm tra CSS stylesheet và kiểm thử tương tác trên browser. |
| 19 | `frontend-iconography` | Sử dụng thống nhất component `<Icon name=... />` 24px grid, TUYỆT ĐỐI KHÔNG DÙNG EMOJI. | Grep kiểm tra không có emoji trong mã nguồn frontend. |
| 20 | `frontend-accessibility-audit` | WCAG 2.2 AA: Contrast >= 4.5:1 text, touch target >= 24px, nhãn ARIA `aria-expanded`, bàn phím. | Script `compute-contrast` và Vitest a11y test pass. |
| 21 | `ci-local-and-debug` | Chạy `./check.sh` hoặc `.\check.ps1` cục bộ kiểm tra đủ 26 gates, không tăng giảm gate. | Terminal output pass 26/26 gates. |
| 22 | `docs-bilingual-update` | Soạn thảo `docs/dg01/README.md` và `PR_DESCRIPTION.md` song ngữ Anh - Việt chuẩn mực. | `npx markdownlint-cli2` và `cspell` kiểm tra tài liệu sạch lỗi. |
| 23 | `requesting-code-review` | Chuẩn bị PR description đầy đủ bối cảnh, cách chạy, dữ liệu mẫu, checklist. | File `docs/dg01/PR_DESCRIPTION.md` hoàn chỉnh. |
| 24 | `receiving-code-review` | Phân tích nguyên nhân gốc rễ và xử lý triệt để tất cả điểm Team Lead đã rà soát trên PR #3. | Toàn bộ 9 điểm Team Lead nêu ra được xử lý sạch sẽ. |
| 25 | `verification-before-completion` | Build clean (`./mvnw clean test`, Vitest, e2e), dọn dẹp Docker stack (`down -v`), xóa sạch file tạm. | `git status` sạch sẽ, không còn container/volume sót lại. |
| 26 | `handoff-to-team-lead` | Báo cáo bàn giao bằng tiếng Việt có cấu trúc 5 thành phần kèm bằng chứng thô và đề xuất commit. | File `handoff.md` đáp ứng đầy đủ quy chuẩn handoff. |
| 27 | `module-domain-knowledge` | Nắm vững nghiệp vụ đánh giá mentor theo khung kỹ năng, tạo evidence xác thực, tính lại chỉ số HS-01. | Logic tính toán và liên kết nghiệp vụ phản ánh đúng trong code và test. |
| 28 | `writing-skills` | Tuân thủ định dạng frontmatter và cấu trúc skill chuẩn của dự án nếu cần cập nhật kỹ năng. | Rà soát cấu trúc skill không có lỗi cú pháp. |

---

### 4. Tuyên bố tuân thủ các ràng buộc cốt lõi (R0, R1, R2)

1. **Ràng buộc trạng thái Git và Nhánh làm việc (R0 & R1)**:
   - Làm việc trực tiếp trên nhánh `feature/t023b91-phieu-danh-gia` đã được Team Lead checkout sẵn cho PR #3.
   - TUYỆT ĐỐI KHÔNG tạo, chuyển, đổi tên, reset, rebase, hay xóa nhánh.
   - TUYỆT ĐỐI KHÔNG chạy bất kỳ lệnh Git làm thay đổi trạng thái nào (không `git commit`, `git push`, `git checkout`, `git restore`, `git stash`, `git reset`).
   - Toàn bộ thay đổi mã nguồn và tài liệu sẽ được giữ nguyên ở trạng thái uncommitted trong working tree để Team Lead thực hiện rà soát và commit.
   - Đề xuất các commit message chuẩn mực có tiền tố bắt buộc: `T023B91:`.
2. **Thu hẹp phạm vi và cô lập Pull Request (R0 & R1)**:
   - Phạm vi xử lý giới hạn duy nhất trong task DG-01 (mã task `T023B91`) trên PR #3.
   - TUYỆT ĐỐI KHÔNG đụng chạm hoặc can thiệp vào các pull request khác đang mở: PR #13 (ứng tuyển ứng viên), PR #6 (gợi ý việc làm AI), hay PR #14 (phân tích khoảng cách kỹ năng).
   - Chỉ liệt kê và lập báo cáo chi tiết về xung đột số thứ tự version migration giữa các PR để Team Lead điều phối.
3. **An toàn bảo mật và Thư mục nhạy cảm (R1)**:
   - TUYỆT ĐỐI KHÔNG đọc, in ra màn hình hoặc chỉnh sửa các file secret: `.env`, `first-key.pem`, hoặc bất kỳ file `*.pem` nào.
   - TUYỆT ĐỐI KHÔNG chỉnh sửa các thư mục hệ thống: `agent-config/`, `.claude/`, `.gemini/`, `.agents/teamwork/` (ngoài thư mục state riêng của agent), và thư mục `Tai lieu du an`.
   - Nếu có bất kỳ sự thật nào trong tài liệu hoặc rule trở nên lỗi thời do yêu cầu của DG-01, chúng tôi chỉ liệt kê trong báo cáo cuối mà không sửa trực tiếp vào file quy tắc.
   - Mọi file tạm phục vụ kiểm thử chỉ được ghi vào thư mục tạm của hệ điều hành (`$env:TEMP`) và phải được xóa dọn dẹp ngay sau khi hoàn thành.
4. **Quy định kiểm thử và Vận hành CI (R1)**:
   - TUYỆT ĐỐI KHÔNG chạy `scripts/run-ci-in-docker.*` để tránh làm mất dữ liệu và stack Docker cục bộ của lập trình viên.
   - Kiểm thử toàn diện thông qua `./check.sh` hoặc `.\check.ps1` cục bộ với 26 quality gates đồng bộ.
   - Sau khi kết thúc kiểm thử end-to-end trên Docker Compose stack sạch, bắt buộc chạy `docker compose down -v` và kiểm chứng dọn dẹp sạch sẽ không còn container, volume hay network nào sót lại.
5. **Kiểm soát phụ thuộc và Quality Gates (R1)**:
   - TUYỆT ĐỐI KHÔNG thêm bất kỳ thư viện phụ thuộc (dependency) mới nào vào `backend/pom.xml` hoặc `frontend/package.json`.
   - Loại bỏ hoàn toàn Lombok và MapStruct; sử dụng Java records cho DTO và mapper viết tay.
   - TUYỆT ĐỐI KHÔNG thêm hoặc bớt bất kỳ quality gate nào trong hệ thống kiểm tra 26 gates.
6. **Thanh chất lượng Giao diện và Kiểm thử trình duyệt (R2)**:
   - Mọi kiểm thử giao diện khối "Đánh giá từ mentor" trong hồ sơ ứng viên bắt buộc thực hiện qua Antigravity built-in browser (`/browser`) theo đúng Browser Test Protocol.
   - TUYỆT ĐỐI KHÔNG dùng emoji trong giao diện UI; sử dụng icon hệ thống 24px `<Icon name=... />`.
   - Sử dụng 100% token CSS cho màu sắc; kiểm tra độ tương phản WCAG 2.2 AA (>= 4.5:1 cho text).
   - Đảm bảo responsive hoàn hảo trên 4 kích thước: 375px, 768px, 1024px, 1440px ở cả 2 chế độ Light và Dark mode.
7. **Phương pháp làm việc bắt buộc (Mandatory Working Method)**:
   > "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."

---
*Tài liệu được khởi tạo và xác nhận bởi Teamwork Agent M0 trước khi tiến hành chỉnh sửa mã nguồn cho Milestone M1.*

---

## Round DG-01-e2e: Bổ sung dev mentor thứ hai và bộ kiểm thử E2E cho DG-01 (Task T023B91, PR #3)

### 1. Tài liệu, quy tắc và kỹ năng đã đọc trọn vẹn

Trước khi chỉnh sửa bất kỳ tệp nào trong vòng `Round DG-01-e2e`, toàn bộ các văn bản chỉ đạo, cấu hình agent, 16 quy tắc và các kỹ năng áp dụng đã được đọc đầy đủ:

1. **Văn bản chỉ đạo**:
   - `D:\GitHub\Rikkei\.agents\PROMPT_DG01E2E_EN.txt` (44 dòng): Yêu cầu chi tiết cho vòng `DG-01-e2e` (mã `T023B91`, PR #3), gồm hạng mục E1 (`mentor2` trong `V8`), E2 (bộ kiểm thử E2E 6 nhóm kịch bản), và yêu cầu kiểm chứng trên Docker stack sạch.
   - `D:\GitHub\Rikkei\.agents\PROMPT_BASE_RULES_EN.txt` (45 dòng): Quy tắc nền tảng R0, R1, R2 áp dụng nguyên văn cho mọi vòng làm việc.
2. **Tài liệu định hướng dự án**:
   - `CLAUDE.md` (47 dòng), `GEMINI.md` (61 dòng), `AGENTS.md` (44 dòng).
3. **Trọn bộ 16 Quy tắc cốt lõi (`.claude/rules/`)**:
   - `01-project-context.md`, `02-git-and-delivery.md`, `03-safety-and-secrets.md`, `04-honest-verification.md`, `05-backend-java.md`, `06-database-flyway.md`, `07-security-rbac.md`, `08-frontend-engineering.md`, `09-frontend-design-bar.md`, `10-testing-strategy.md`, `11-docs-and-bilingual.md`, `12-ci-and-quality-gates.md`, `13-backend-data-access-performance.md`, `14-backend-module-boundaries.md`, `15-backend-observability-ops.md`, `16-backend-integrations.md`.
4. **Các Kỹ năng áp dụng (`.claude/skills/`)**:
   - `using-rikkei-skills`, `test-driven-development`, `spring-security-rbac-endpoint`, `api-contract-and-errors`, `flyway-migration-authoring`, `security-review-checklist`, `verification-before-completion`, `docs-bilingual-update`, `handoff-to-team-lead`, `ci-local-and-debug`.

### 2. Ràng buộc cụ thể áp dụng cho Round DG-01-e2e và lý do

| Nhóm | Quy tắc / Kỹ năng | Ràng buộc cụ thể và lý do áp dụng |
|---|---|---|
| Rule 01 | `01-project-context` | Dùng đúng 5 role (`CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`), 20 mã kỹ năng chuẩn và thang 0-100; giữ nguyên phiên bản công nghệ để `check-version-drift.mjs` không báo lỗi. |
| Rule 02 | `02-git-and-delivery` | Git tuyệt đối READ-ONLY (không `git add`, `commit`, `checkout`, `restore`, `reset`, `stash`), để toàn bộ thay đổi uncommitted trên nhánh `feature/t023b91-phieu-danh-gia`, dùng tiền tố `T023B91:` cho đề xuất commit. |
| Rule 03 | `03-safety-and-secrets` | Không đọc hoặc in `.env` hay `*.pem`; chỉ ghi trong `rikkei-jobs` (file tạm chỉ đặt tại OS temp rồi xóa ngay); không nhúng đường dẫn máy cá nhân vào mã nguồn hay tài liệu. |
| Rule 04 | `04-honest-verification` | Chỉ ghi PASS khi chạy lệnh thực tế trong phiên hiện tại với exit code 0 và có raw output; chứng minh ít nhất một assertion có thể fail bằng bản sao tạm ở OS temp và đối chiếu SHA-256 tệp gốc không đổi. |
| Rule 05 | `05-backend-java` | Mã nguồn sản phẩm Java thuộc Scope OUT (không sửa); chỉ sửa 2 test tích hợp migration bị ảnh hưởng bởi số lượng seed user và phải tuân thủ định dạng Spotless AOSP. |
| Rule 06 | `06-database-flyway` | Giữ `V2__dev_seed.sql` và `V6__dev_seed_nt01.sql` khớp từng byte với `develop`; chỉ thêm `mentor2@rikkeijobs.test` một cách idempotent vào `V8__dev_evaluation_seed.sql` và đồng bộ `users_id_seq`. |
| Rule 07 | `07-security-rbac` | Kiểm thử đủ 401 `UNAUTHORIZED` (anonymous), 403 `FORBIDDEN` (sai role), 404 `NOT_FOUND` (che giấu IDOR của `mentor2`, `candidate2`, `hr2` trên hồ sơ private) qua HTTP thực tế. |
| Rule 08 | `08-frontend-engineering` | Giao diện frontend thuộc Scope OUT trong vòng này nên giữ nguyên không chỉnh sửa; vẫn chạy toàn bộ gate frontend để bảo đảm không có hồi quy. |
| Rule 09 | `09-frontend-design-bar` | Không sử dụng emoji trong bất kỳ tệp mới hoặc sửa đổi nào thuộc `e2e/` và `docs/dg01/`. |
| Rule 10 | `10-testing-strategy` | Bộ E2E phải hermetic, lặp lại được nhiều lần liên tiếp trên cùng một Docker stack mà không phụ thuộc thứ tự chạy, không dùng `Thread.sleep` hay `setTimeout` tĩnh. |
| Rule 11 | `11-docs-and-bilingual` | Cập nhật `docs/dg01/README.md` và `docs/dg01/PR_DESCRIPTION.md` song ngữ Anh - Việt đầy đủ dấu; chạy `markdownlint-cli2` và `cspell` đạt 0 lỗi, tuyệt đối không dùng inline `cspell:` directive. |
| Rule 12 | `12-ci-and-quality-gates` | Không thêm/bớt quality gate; không chạy `scripts/run-ci-in-docker.*`; chạy cả `./check.sh` và `.\check.ps1` đạt 26/26 gates, không đặt biến ghi đè chuyển đổi đường dẫn trên Git Bash. |
| Rule 13 | `13-backend-data-access-performance` | Kiểm chứng khóa lạc quan `@Version` qua 2 yêu cầu `POST /submit` đồng thời ở mức HTTP trả về một `200` và một `409` mà không nhân đôi evidence. |
| Rule 14 | `14-backend-module-boundaries` | Ghi nhận ranh giới module `assessment`, `candidate`, `identity` trong tài liệu; không sửa mã nguồn module trong vòng này. |
| Rule 15 | `15-backend-observability-ops` | Không in mật khẩu seed hay Bearer token ra stdout/stderr trong bất kỳ kịch bản E2E nào; kiểm tra trạng thái sức khỏe `/api/v1/health` trước khi chạy. |
| Rule 16 | `16-backend-integrations` | Kiểm chứng 5 endpoint DG-01 xuất hiện đầy đủ trong tài liệu OpenAPI `/api-docs` của profile `dev`; không thêm phụ thuộc mới vào `package.json` hay `pom.xml`. |
| Skill 01 | `using-rikkei-skills` | Nạp và tuân thủ các skill liên quan theo thứ tự ưu tiên Rules trước Skills trước khi bắt đầu chỉnh sửa. |
| Skill 02 | `test-driven-development` | Bảo đảm bộ E2E có khả năng phát hiện sai lệch thật (chứng minh qua deliberate break trên bản sao OS temp) và không viết assertion luôn đúng. |
| Skill 03 | `spring-security-rbac-endpoint` | Dùng `hr2@rikkeijobs.test` (`must_change_password = false`) để kiểm chứng HR xem hồ sơ public `candidate2` (`200`) và bị chặn `404` ở hồ sơ private `candidate1`/`candidate3`. |
| Skill 04 | `api-contract-and-errors` | Kiểm chứng phản hồi lỗi hợp nhất `{code, message}` cho 400 (`VALIDATION_ERROR`), 401 (`UNAUTHORIZED`), 403 (`FORBIDDEN`), 404 (`NOT_FOUND`), 409 (`CONFLICT`). |
| Skill 05 | `flyway-migration-authoring` | Dùng `ON CONFLICT DO NOTHING` và `SELECT setval('users_id_seq', ...)` khi thêm user id `9` vào `V8__dev_evaluation_seed.sql`. |
| Skill 06 | `security-review-checklist` | Kiểm tra quét secret sạch sẽ và xác minh không rò rỉ dữ liệu giữa mentor/candidate/HR qua kiểm thử IDOR trên stack thật. |
| Skill 07 | `verification-before-completion` | Chỉ xác nhận hoàn tất sau khi đã chạy đủ `node e2e/run-all.mjs` 2 lần liên tiếp, `.\mvnw.cmd clean test`, `./check.sh`, `.\check.ps1`, `markdownlint` và `cspell`. |
| Skill 08 | `docs-bilingual-update` | Chuẩn hóa thuật ngữ Anh - Việt đầy đủ dấu trong `docs/dg01/README.md`, `docs/dg01/PR_DESCRIPTION.md` và `e2e/README.md`. |
| Skill 09 | `handoff-to-team-lead` | Giữ nguyên thay đổi uncommitted, báo cáo đầy đủ bằng chứng thô bằng tiếng Việt và đề xuất chuỗi commit tiếng Anh với tiền tố `T023B91:`. |
| Skill 10 | `ci-local-and-debug` | Sử dụng `./check.sh` và `.\check.ps1` làm chuẩn kiểm chứng cục bộ đồng bộ 26 gates, không tự sửa `.github/workflows/ci.yml` (thuộc Scope OUT) mà chỉ báo cáo lưu ý cho Team Lead. |

### 3. Ma trận phương án kiểm chứng từng hạng mục (E1, E2 và Verification)

| Hạng mục | Yêu cầu cần chứng minh | Phương án kiểm chứng |
|---|---|---|
| E1 | `V2` và `V6` khớp từng byte với `origin/develop` | Chạy `git diff origin/develop` trên `V2`, `V6` và đối chiếu SHA-256. |
| E1 | `mentor2@rikkeijobs.test` idempotent trong `V8` (`id = 9`, `MENTOR`, không `company_id`) | Kiểm tra nội dung `V8`, chạy `.\mvnw.cmd clean test` (JDK 25, 389 tests xanh gồm `FlywayMigrationIntegrationTest` và `ProfileSeparationIntegrationTest`). |
| E2 (Mục 1) | Templates: tên chính xác 2 mẫu, 5 tiêu chí và 5 mã kỹ năng mẫu 1, lọc context, 400/401/403 | Chạy HTTP tới `GET /api/v1/evaluation-templates` và đối chiếu `skillId` qua `GET /api/v1/profiles/me/skills`. |
| E2 (Mục 2) | Happy path: tạo `DRAFT`, `PUT`, `submit` -> `200`, bằng chứng `MENTOR` `verified = true` và `verifiedScore` đổi | Đọc `GET /api/v1/profiles/me/skills` trước và sau submit với điểm mục tiêu động theo giá trị hiện tại. |
| E2 (Mục 3) | Lỗi nghiệp vụ: thiếu điểm 400 không đổi trạng thái/evidence, 101/-1 -> 400, sửa/submit lại 409, `mentor2` 404, `candidate2` 404, candidate POST 403, anonymous 401 | Kiểm tra từng status code, `{code, message}`, số lượng `MENTOR` evidence và danh sách evaluation trước/sau. |
| E2 (Mục 4) | Visibility: chỉ trả `SUBMITTED` mới nhất trước, đủ thông tin mentor/context/ngày/điểm/nhận xét, không lộ `DRAFT`; `hr2` đọc `candidate2` (`200`) vs `candidate1`/`candidate3` (`404`) | Tạo 1 `DRAFT` + 1 `SUBMITTED` có tag UUID riêng, kiểm tra thứ tự `submittedAt` giảm dần và kiểm tra quyền HR theo `V4`. |
| E2 (Mục 5) | Concurrency HTTP: 2 request submit đồng thời -> 1x `200` + 1x `409`, evidence chỉ tạo 1 lần | Dùng `Promise.all` gửi 2 `POST /submit` song song và kiểm tra `MENTOR` evidence chỉ tăng đúng 5. |
| E2 (Mục 6) | 5 endpoint DG-01 xuất hiện trong OpenAPI `/api-docs` | Kiểm tra `GET /api-docs` `paths` có đủ 5 route DG-01 và đúng HTTP method. |
| Verification | Stack Docker tươi, E2E 2 lần liên tiếp, deliberate break, gates 26/26, clean teardown | `docker compose up -d --build --wait`, `node e2e/run-all.mjs` x2, test bản sao OS temp lỗi + SHA-256 không đổi, `./check.sh`, `.\check.ps1`, `markdownlint`, `cspell`, secret scan. |

### 4. Ghi chú phương pháp làm việc bắt buộc (Mandatory Working Method)

Mandatory working method: "Hay check that ky tim hieu va nghien cuu that ky chuyen sau nhat tung buoc roi search, nghien cuu ky google chuyen sau nhat song song nhieu huong cung luc kieu nhu GitHub uy tin hoac dien dan IT uy tin, bai bao nghien cuu uy tin truoc khi tim giai phap tot nhat de hoan thien hoan chinh va chinh chu nhat giup toi. Sau khi sua xong dong thoi phai test luon ket qua thuc te tho trung thuc thay vi dua vao li thuyet. Neu van chua dat duoc thi quay lai workflow tren."
