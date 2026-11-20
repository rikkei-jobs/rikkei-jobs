# Nhật Ký Đo Đạc & Quan Sát Trình Duyệt Thực Tế (`BROWSER_OBSERVATIONS.md` — Round `` `[NT-02-fix]` ``)

**Dự án**: Rikkei Jobs — Task `T022BB1` (Round `` `[NT-02]` `` & `` `[NT-02-fix]` `` — Phân quyền 5 vai trò, Sửa lỗi điều hướng sau đăng xuất F1, Sidebar trái thu gọn/mở rộng thống nhất F4, Trang `403` trong layout, OpenAPI `/api/docs`)  
**Nguồn sự thật (tách bạch rõ 2 nguồn bằng chứng)**:

1. `` `[/browser]` ``: Số liệu đo trực tiếp trên stack Docker Compose mới dựng (`http://127.0.0.1:3000`, bundles `/assets/index-bvlZtaHC.js` & `/assets/index-7APS4y1C.css`) từ phiên Antigravity `/browser` **`4f13d835-58c2-4809-bb98-81bee2586afb`** (`31` ảnh `04-`..`34-`), kết hợp `3` ảnh OpenAPI & redirect ẩn danh `01-`..`03-` từ phiên **`d7ae3948-fc02-4719-80cf-2a9035171442`** (`http://127.0.0.1:8080` & `http://127.0.0.1:3000`). Thu thập bằng Playwright native locators (`boundingBox()`, `getAttribute()`, `innerText()`, `isVisible()`, `hover()`, `focus()`, `keyboard.press()`, `goBack()`, `goForward()`, `page.reload()`, `networkRequests()`).
2. `` `[Static CSS / Vitest / compute-contrast]` ``: Thông số token/CSS/TSX tĩnh trong mã nguồn, kết quả Vitest (`32` tệp / `342` kiểm thử, gồm `postLoginRedirect.test.tsx`, `SharedAppLayout.test.tsx`, `ForbiddenPage.test.tsx`, `RoleHomes.test.tsx`, `guards.test.tsx`, `roleUtils.test.ts`, `App.test.tsx`, `httpClient.test.ts`, `Icon.test.tsx`, `CompanyProfileAccessibility.test.tsx`, `accessibility_wcag.test.tsx`), E2E (`26` suite / `323` ca / `1939` assertion), `compute-contrast.mjs` (`120 / 120` cặp Light & Dark), và `validate-agent-config.mjs` Check 9 (`0` raw colors).

---

## 1. Thông Số Host Trình Duyệt & Giới Hạn Sandbox (`BROWSER_HOST_FACTS`)

### 1.1. Phiên `/browser` (`4f13d835-58c2-4809-bb98-81bee2586afb` & `d7ae3948`) `` `[/browser]` ``

- **`visited_origins`**: `http://127.0.0.1:3000` (phiên `4f13d835-58c2-4809-bb98-81bee2586afb`), cùng `http://127.0.0.1:8080, http://127.0.0.1:3000` (phiên OpenAPI `d7ae3948` giữ ảnh `01-`..`03-`).
- **`blocked_origins`**: `none`.
- **Bundles phục vụ thực tế (`networkRequests()`)**: `http://127.0.0.1:3000/assets/index-bvlZtaHC.js`, `http://127.0.0.1:3000/assets/index-7APS4y1C.css` (`0` lỗi HTTP `5xx`).
- **Viewports kiểm thử**: `1440x900`, `1024x768`, `768x1024`, `375x812` (cả Light & Dark mode).
- **Tổng ảnh chụp PR**: `34` tệp PNG (`01-openapi-8080-1440px-light.png` đến `34-sidebar-focus-visible-1440px-light.png`) khớp `1:1` với `docs/nt02/pr-screenshots/ORDER.txt` (xem bảng chỉ mục đầy đủ `34 / 34` tại Mục 6).

### 1.2. Giới Hạn Sandbox `webview_browser` (Báo Cáo Trung Thực)

- `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request`, và `page.route` **không được hỗ trợ** trong sandbox `webview_browser`, và `networkRequests()` che `headers: {}`.
- Vì vậy:
  - Toàn bộ hình học (`boundingBox()`), thuộc tính ARIA (`aria-expanded`, `aria-controls`, `aria-current="page"`, `aria-disabled`, `tabindex`), văn bản (`innerText()`), hiển thị tooltip, trạng thái hover/focus/Escape/reload được đo trực tiếp bằng Playwright native locators trong `` `[/browser]` ``.
  - Các thông số CSS tính toán (`border-radius`, `font-family`, `transition-duration`, `@media (prefers-reduced-motion: reduce)`) và tỷ lệ tương phản (`120 / 120` cặp qua `compute-contrast.mjs`) được tách minh bạch vào nguồn `` `[Static CSS / Vitest / compute-contrast]` ``.
  - Do `page.emulateMedia` và `page.evaluate` bị chặn trong `webview_browser`, tiêu chí chuyển động giảm (`C5`) được giữ trung thực ở mức **`1 / 2`** (tổng điểm Rule 09 **`11 / 12`**, không tự chấm `12 / 12`).
- Điều hướng trực tiếp tới `GET /api/docs` (`302 -> /api/swagger-ui/index.html`) gây `net::ERR_ABORTED` trong `webview_browser`: bù lại bằng E2E `test_openapi_docs.test.mjs` (`TC-T1-DOCS-01`, `302 -> 200` trên cả `:8080` và `:3000`) và `` `[/browser]` `` mở trực tiếp `/api/swagger-ui/index.html` (`200 OK`, `12` tags, `27` operations trên `25` paths, `hasTest8080: false`, `hasTest3000: false`, `Authorize` + `GET /api/v1/auth/me` -> `200 OK`, ảnh `01-`, `02-`).

---

## 2. Kết Quả Kiểm Chứng F1 — Sửa Lỗi Điều Hướng Sau Đăng Xuất / Đăng Nhập Lại `` `[/browser]` ``

### 2.1. Tái Hiện Đủ 3 Ca Của Team Lead Qua LMS SSO Thật & Đăng Nhập Enterprise

| Ca tái hiện (F1) | Thao tác thực tế `` `[/browser]` `` | Đường dẫn, `h1`, Badge vai trò & Sidebar đo được | Ảnh |
|---|---|---|---|
| **Ca 1 (`staff1 -> hr2`)** | Đăng nhập `staff1` qua LMS SSO thật (`POST /api/v1/auth/sso` `200 OK`, ticket `lms-st-001`) -> `/staff` (`"Nhân viên"`) -> click `button.rj-nav-logout` (`"Đăng Xuất"`) -> `/login` -> đăng nhập `hr2@rikkeijobs.test` | Vào thẳng **`http://127.0.0.1:3000/hr`**, `h1`: `"Chào mừng, Đại diện Doanh nghiệp B!"`, badge `"HR"`, `aside.rj-sidebar` `280px` | `05-` |
| **Ca 2 (`hr2 -> admin1`)** | Từ `/hr` mở `/hr/company` -> click `"Đăng Xuất"` -> `/login` -> đăng nhập `admin1@rikkeijobs.test` | Vào thẳng **`http://127.0.0.1:3000/admin`**, `h1`: `"Chào mừng, Đỗ Thanh Hải!"`, badge `"Quản trị viên"` | `06-` |
| **Ca 3 (`admin1 -> candidate1` SSO)** | Từ `/admin` click `"Đăng Xuất"` -> `/login` -> nhập ticket LMS SSO 60s `lms-sv-001` tại `#tab-lms` -> qua `/sso-callback` (`POST /api/v1/auth/sso` trả **`200 OK`**) | Vào thẳng **`http://127.0.0.1:3000/candidate`**, `h1`: `"Chào mừng, Nguyễn Văn An!"`, nhãn vai trò `"Ứng viên"`, `aside.rj-sidebar` `280 x 844` | `07-` |

### 2.2. Các Hành Vi Bảo Toàn & Bảo Mật Xác Thực Liên Quan `` `[/browser]` ``

- **Cùng một người dùng hết phiên (`page.reload()` tương đương mất JWT trong RAM -> `/login`)**: Đăng nhập `candidate1`, mở `/candidate/skills`, chạy `page.reload()` -> chuyển hướng về `/login` với `0` nháy nội dung được bảo vệ -> đăng nhập lại `candidate1` -> quay đúng về `/candidate/skills`.
- **Truy cập URL trái vai trò trước khi đăng nhập (`state.from` không được phép)**: Mở `/admin` khi đã đăng xuất -> chuyển về `/login` -> đăng nhập `candidate1` -> `resolvePostLoginPath` đối chiếu `PROTECTED_ROUTE_POLICIES`, loại bỏ `/admin` và đưa về `/candidate`.
- **Đăng xuất từ `/403`**: `admin1` đang ở `/403` -> click `"Đăng Xuất"` -> đăng nhập `hr2` -> vào thẳng `/hr` (không giữ lại `/403`).
- **`hr1` bắt buộc đổi mật khẩu**: Đăng nhập `hr1@rikkeijobs.test` -> ép chuyển hướng `/change-password` với **`0` sidebar** (`04-`).
- **Chưa đăng nhập truy cập tuyến bảo vệ**: `/candidate/skills`, `/hr/company`, `/admin` chuyển hướng tức thì về `/login` với `0` nháy nội dung (`03-`).

---

## 3. Kết Quả Kiểm Chứng F4 — Sidebar Trái Thu Gọn/Mở Rộng Thống Nhất & Trang 403 Trong Layout

### 3.1. Tất Cả 5 Vai Trò Ở Chế Độ Mở Rộng (`1440x900`, `aside.rj-sidebar` = `280 x 844`) `` `[/browser]` ``

- **Header & Toggle (`1440x900`)**: `header.rj-dashboard-nav` cao `56.8px`; nút thu gọn `button.rj-sidebar-toggle` kích thước `255.2 x 44px`, `aria-expanded="true"`, `aria-label="Thu gọn thanh điều hướng"`.
- **Kiểm tra trực quan không cắt chữ (`...` / ellipsis truncation)**: Rà soát các ảnh `08-`, `09-`, `15-`, `19-`, `21-`, `30-`, `31-`, `32-`, `34-` — **0 lỗi cắt chữ (`...`)** trên `"Thu gọn thanh điều hướng"`, `"Ứng tuyển"`, `"Tuyển dụng"`, `"Thực tập sinh"`, `"Duyệt hồ sơ"`, `"Doanh nghiệp"`, `"Ghép thực tập"`, `"Cần đánh giá"`, và pill `"Sắp ra mắt"` ở cả Desktop `280px` lẫn Mobile Drawer `375px` (`280px`).
- **Skip Link (`08-`)**: Focus `a.rj-nav-brand-link` rồi nhấn `Shift+Tab` hiển thị `a.rj-skip-link[href="#main-content"]` `"Bỏ qua tới nội dung chính"` tại `(8, 8)`, kích thước **`224.54 x 44px`**.

| Vai trò | Mật độ | Số mục & Nhãn menu đo được `` `[/browser]` `` | Chiều cao mục đo được | Trạng thái Active / Disabled | Ảnh |
|---|---|---|---:|---|---|
| **`CANDIDATE`** | `airy` | `6` mục: `Trang chủ`, `Hồ sơ`, `Việc làm`, `Ứng tuyển`, `Lộ trình`, `Trợ lý AI` | **`44px`** | `/candidate/skills` -> `Hồ sơ` (`aria-current="page"`); `/candidate/jobs` -> `Việc làm` (`aria-current="page"`); `Ứng tuyển`, `Trợ lý AI` có `aria-disabled="true"`, `tabindex="-1"`, click giữ nguyên URL | `09-`..`14-` |
| **`HR`** | `dense` | `5` mục: `Trang chủ`, `Công ty`, `JD`, `Tuyển dụng`, `Thực tập sinh` | **`36px`** | `/hr/company` -> `Công ty` (`aria-current="page"`); 3 mục sau disabled `"Sắp ra mắt"` | `15-`..`17-` |
| **`MENTOR`** | `dense` | `2` mục: `Trang chủ`, `Cần đánh giá` | **`36px`** | `Trang chủ` (`aria-current="page"`); `Cần đánh giá` disabled `"Sắp ra mắt"` | `18-` |
| **`STAFF`** | `dense` | `6` mục: `Trang chủ`, `Duyệt hồ sơ`, `Duyệt JD`, `Doanh nghiệp`, `Ghép thực tập`, `Báo cáo` | **`36px`** | `Trang chủ` (`aria-current="page"`); 5 mục sau disabled `"Sắp ra mắt"`, 0 cắt chữ | `19-` |
| **`ADMIN`** | `dense` | `2` mục: `Trang chủ`, `Quản trị` | **`36px`** | `Trang chủ` (`aria-current="page"`); `Quản trị` disabled `"Sắp ra mắt"` | `20-` |

### 3.2. Trạng Thái Thu Gọn (`72px`), Tooltip, Lưu `localStorage` & Trang `403` Trong Layout `` `[/browser]` ``

- **Collapsed Rail (`72px`) & Tooltip (`11-`, `12-`)**:
  - `aside.rj-sidebar.is-collapsed` rộng **`72px`**; `button.rj-sidebar-toggle` kích thước `47.2 x 44px`, `aria-expanded="false"`, `aria-label="Mở rộng thanh điều hướng"`.
  - Hover `"Hồ sơ"` (Light, `11-`) và focus bàn phím `"Việc làm"` (Dark, `12-`) hiển thị `span[role="tooltip"].rj-sidebar-tooltip`; nhấn `Escape` -> `tooltipCount === 0` (đóng ngay, không bẫy focus).
  - Khóa `rj_sidebar_collapsed` trong `localStorage` (chỉ lưu tùy chọn giao diện, bọc `try/catch`) giữ nguyên trạng thái thu gọn `72px` sau `page.reload()` + đăng nhập lại.
- **Trang `403` bên trong `SharedAppLayout` cho cả 5 vai trò (`21-`..`26-`, `33-`)**:
  - Sau khi điều hướng tới `/403` và đăng nhập, `ForbiddenPage` render bên trong `SharedAppLayout` với `aside.rj-sidebar` (`280px` desktop) giữ đúng menu của vai trò hiện tại, `h1 = "Bạn không có quyền truy cập trang này"`, nhãn vai trò từ `enumLabels.ts` (`"Ứng viên"`, `"HR"`, `"Mentor"`, `"Nhân viên"`, `"Quản trị viên"`), nút `"Quay lại trang chủ"` trỏ về `homePath` tương ứng.
  - Tại `375x812` (`33-`): `htmlW/bodyW = 375.2px` (`0` tràn ngang), nút mở drawer `44x44px`.
- **Các trang công khai / ép đổi mật khẩu không có sidebar**: `/`, `/login`, `/forgot-password`, `/reset-password` tại `375/768/1024/1440` và `/change-password` (`04-`): `aside.rj-sidebar` count = **`0`**.

### 3.3. Đo Đạc Responsive (`375` / `768` / `1024` / `1440` px, Light & Dark) & Tràn Ngang `` `[/browser]` ``

| Viewport | Chế độ | Kích thước sidebar / container đo được `` `[/browser]` `` | Mục & Toggle `` `[/browser]` `` | Tràn ngang (`scrollWidth` vs viewport) | Ảnh |
|---|---|---|---|---|---|
| `1440x900` | Light & Dark | `aside.rj-sidebar` `280 x 844` (mở) / `72px` (thu gọn) | `CANDIDATE` `44px`; `HR`/`MENTOR`/`STAFF`/`ADMIN` `36px`; toggle `>= 44px` | `0` tràn ngang (`<= 1440`) | `09-`..`26-`, `34-` |
| `1024x768` | Light | Mặc định thu gọn **`72px`**, `html`/`body` rộng **`1008.8px`** | Mục `44px` / `36px` | `0` tràn ngang (`1008.8 <= 1024`) | `27-` |
| `768x1024` | Light & Dark | Mặc định thu gọn **`72px`**, mở rộng **`280px`**, `html`/`body` rộng **`752.8px`** | Mục `44px` / `36px` | `0` tràn ngang (`752.8 <= 768`) | `28-`, `29-` |
| `375x812` | Light & Dark | Drawer `aside.rj-sidebar[role="dialog"][aria-modal="true"]` **`280 x 812`**; `/candidate`, `/hr`, `/hr/company`, `/403`, `/candidate/gap-analysis`, `/login`, `/forgot-password`: `360px` / `375.2px` | `button.rj-mobile-menu-toggle` **`44x44`**, `button.rj-sidebar-drawer-close` **`44x44`**, toàn bộ mục nav của cả `CANDIDATE` và `HR` nâng lên **`44px`**, `Escape` đóng & trả focus (`Enter` mở lại ngay), tự đóng khi click điều hướng | `0` tràn ngang mới do sidebar; **lỗi tràn ngang `375px` sẵn có** trên `/` & `/candidate/jobs` (`PR #6`, `400.8px > 375px`) và `/candidate/skills` (`HS-01`, `411px > 375px`) được giữ nguyên báo cáo, không sửa | `30-`..`33-` |

### 3.4. Thông Số CSS Tĩnh, Tương Tác R2 & Tương Phản `[Static CSS / Vitest / compute-contrast]` + `` `[/browser]` ``

- **Tương tác R2 thực tế `` `[/browser]` `` (`34-`)**: Left-click, right-click, double-click, scroll, `goBack()`/`goForward()`/`page.reload()`, và vòng focus `:focus-visible` (`2px solid var(--rj-color-focus-ring)`) trên thanh điều hướng trái đều hoạt động ổn định, không phát sinh lỗi giao diện hay kẹt drawer.
- **Font, Bo góc & Chuyển động `[Static CSS / Vitest / compute-contrast]`**:
  - Font tự host: `Be Vietnam Pro`, `Plus Jakarta Sans`, `JetBrains Mono` (`design-tokens.css:16-88,238-248`), `0` raw color literals ngoài `design-tokens.css` (Check 9 PASS).
  - Bo góc: `border-radius: var(--rj-radius-md)` (`6px`) cho `.rj-nav-brand-link`, `.rj-sidebar-toggle`, `.rj-role-nav-link`, `.rj-sidebar-tooltip`, `.rj-btn`; pill `"Sắp ra mắt"` dùng `var(--rj-radius-full)` (`9999px`).
  - Chuyển động: đổi rộng sidebar `--rj-sidebar-transition-width` (`150ms` `ease-out`, `<= 150ms`), tooltip `--rj-tooltip-transition` (`150ms <= 200ms`), drawer mobile `--rj-drawer-transition` (`250ms <= 300ms` qua `transform` + `opacity`), hỗ trợ `@media (prefers-reduced-motion: reduce)` (`0.001ms` / `100ms` fade), `CLS = 0` khi tải trang (xác định đồng bộ kích thước từ `rj_sidebar_collapsed` + breakpoint trước render đầu tiên).
- **Tương phản (`compute-contrast.mjs`)**: **`120 / 120`** cặp màu (`61` Light + `59` Dark) đạt chuẩn WCAG 2.2 AA (`>= 4.5:1` văn bản, `>= 3.0:1` viền/UI), cộng **`9`** surface invariants (CIELAB $\Delta L^*$) và **`10`** UI boundary border invariants, `0` sai lệch.

---

## 4. Lỗi Đã Sửa vs Lỗi Sẵn Có Ngoài Phạm Vi (Báo Cáo Trung Thực, Không Sửa)

1. **Đã sửa trong NT-02 & NT-02-fix**:
   - **F1 (Điều hướng sau đăng xuất / đăng nhập lại)**: (a) Đăng xuất chủ động đặt `isExplicitLogout` và xóa `state: null` (ngăn `RequireAuth` / `RequireRole` ghi lại `from` trong lúc chuyển hướng); (b) `resolvePostLoginPath(from, role)` dùng chung `PROTECTED_ROUTE_POLICIES` (`routePolicies.ts`) với `App.tsx`, chỉ giữ `from` khi vai trò mới được phép truy cập tuyến đó (loại trừ `/403` và tuyến công khai), giữ nguyên chống open-redirect, ký tự điều khiển, `//`, backslash, dot-segment traversal, luồng `mustChangePassword`, và trường hợp cùng một người dùng hết phiên `401` quay lại trang hợp lệ trước đó.
   - **F4 (Sidebar trái thu gọn/mở rộng thống nhất cho 5 vai trò & 403 trong layout)**: Thay thanh menu ngang dưới header bằng `SharedAppLayout` với sidebar trái (`280px` mở rộng / `72px` thu gọn / ngăn kéo `< 768px`), mục đầu `"Trang chủ"` + `roleMenuConfig.ts`, nút thu gọn tiếng Việt, tooltip khi thu gọn, khóa `localStorage` `rj_sidebar_collapsed` (`try/catch`), skip link `"Bỏ qua tới nội dung chính"`, mật độ `44px` (`CANDIDATE`) vs `36px` (`HR`/`MENTOR`/`STAFF`/`ADMIN` từ `>= 768px`, `44px` trong drawer), và `ForbiddenPage` (`403`) hiển thị bên trong `SharedAppLayout`.
   - **F3 (Đồng bộ thông điệp Rule 07 `403`)**: Cập nhật `agent-config/rules/07-security-rbac.md:33`, `agent-config/skills/spring-security-rbac-endpoint/SKILL.md:79`, `docs/conventions.md:45` thành `{"code":"FORBIDDEN","message":"Không có quyền truy cập"}` khớp `CustomAccessDeniedHandler.java` và `GlobalExceptionHandler.java`.
2. **Lỗi tràn ngang `375px` sẵn có ngoài phạm vi (Báo cáo trung thực, KHÔNG sửa)**:
   - **`/` (`PR #6`) & `/candidate/jobs` (bọc `JobRecommendationsSection`)**: `frontend/src/features/candidate/styles/jobRecommendations.css:124-128` đặt `.jobs-grid { grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); }` khiến thẻ rộng `360px` vượt quá `375px` (`400.8px > 375px`).
   - **`/candidate/skills` (`HS-01`)**: `frontend/src/features/candidate/skillProfile.css:405-407` đặt `grid-template-columns: minmax(0, 1fr) 24px;` cho 4 phần tử con trong `SkillItem.tsx:26-73`, gây tràn `411px > 375px`.

---

## 5. Bảng Đánh Giá Bằng Chứng Thực Đo (`Rule 09` — C1..C6)

| Tiêu chí | Điểm Thực Đo | Điểm Cuối | Bằng chứng định lượng xác minh |
|---|---:|---:|---|
| **C1. Typography & Hierarchy** | `2 / 2` | `2 / 2` | `Be Vietnam Pro` + `Plus Jakarta Sans` + `JetBrains Mono` tự host (`design-tokens.css:16-88`), phân cấp rõ từ header `56.8px`, sidebar, tiêu đề trang `h1` đến bảng và `ForbiddenPage` (`04-`..`34-`). |
| **C2. Spacing, Layout & Density** | `2 / 2` | `2 / 2` | `CANDIDATE` `airy` (`44px`) vs `HR`/`MENTOR`/`STAFF`/`ADMIN` `dense` (`36px` tại `>= 768px`, `44px` trong drawer `< 768px`), sidebar `280px` / `72px`, `0` cắt chữ `...`, `0` tràn ngang mới do sidebar tại `375/768/1024/1440px`. Các lỗi tràn sẵn có ở `/` & `/candidate/jobs` (`PR #6`) và `/candidate/skills` (`HS-01`) được báo cáo tách bạch. |
| **C3. Color Palette & Contrast** | `2 / 2` | `2 / 2` | `compute-contrast.mjs` đạt **`120 / 120`** cặp (`61` Light + `59` Dark) + `9` surface invariants + `10` UI border invariants; Check 9 đạt `0` raw color literals; Light & Dark xác minh qua ảnh `09-`..`12-`, `15-`, `16-`, `21-`, `22-`, `28-`..`31-`. |
| **C4. Iconography & Visual Assets** | `2 / 2` | `2 / 2` | `100%` biểu tượng qua `<Icon name=... />` (bổ sung `'home'`, `'panel-left-close'`, `'panel-left-open'` `24x24` `strokeWidth="2"`), `0` emoji trên toàn repo, `0` thư viện icon ngoài. |
| **C5. Purposeful Motion & Restraint** | `1 / 2` | `1 / 2` | `[Static CSS / Vitest]`: `150ms` đổi rộng sidebar & tooltip, `250ms` drawer (`transform`/`opacity`), `CLS = 0` khi tải trang, `@media (prefers-reduced-motion: reduce)` (`0.001ms` / `100ms` fade). **Giữ trung thực `1 / 2`** vì sandbox `webview_browser` chặn `page.emulateMedia` và `page.evaluate`, chưa đo runtime computed `reduced-motion`. |
| **C6. Authentic Copywriting & AI-Tell Avoidance** | `2 / 2` | `2 / 2` | 100% tiếng Việt đầy đủ dấu (`"Trang chủ"`, `"Thu gọn thanh điều hướng"`, `"Mở rộng thanh điều hướng"`, `"Bỏ qua tới nội dung chính"`, `"Sắp ra mắt"`, thông điệp `403`, nhãn vai trò từ `enumLabels.ts`). |
| **TỔNG ĐIỂM** | **`11 / 12`** | **`11 / 12`** | Đạt ngưỡng `>= 11 / 12` của Rule 09 với `0` tiêu chí `0` điểm và ghi nhận trung thực giới hạn `C5` của sandbox. |

---

## 6. Chỉ Mục Đầy Đủ `34 / 34` Ảnh Chụp Màn Hình PR (Đối Chiếu 1:1 Với `docs/nt02/pr-screenshots/ORDER.txt`) `` `[/browser]` ``

Toàn bộ `34` ảnh PNG lưu trong thư mục bị git-ignore `docs/nt02/pr-screenshots/` khớp nguyên văn `1:1` với `docs/nt02/pr-screenshots/ORDER.txt` (`01-`..`03-` từ phiên `d7ae3948`, `04-`..`34-` từ phiên `4f13d835-58c2-4809-bb98-81bee2586afb`):

| # | Tên tệp PNG chính xác (`docs/nt02/pr-screenshots/`) | Tuyến / Kịch bản kiểm thử | Viewport & Chế độ | Quan sát thực đo `` `[/browser]` `` |
|---:|---|---|---|---|
| 1 | `01-openapi-8080-1440px-light.png` | OpenAPI `:8080` (`/api/swagger-ui/index.html` qua `/api/docs`) | `1440x900` Light | `12` tags, `25` paths / `27` operations, ẩn `TestErrorController` (`d7ae3948`) |
| 2 | `02-openapi-3000-authorized-me-200-1440px-light.png` | OpenAPI Nginx `:3000` (`/api/docs`) | `1440x900` Light | Sau Bearer `Authorize` + `GET /api/v1/auth/me` -> `200 OK` (`d7ae3948`) |
| 3 | `03-logged-out-redirect-login-1440px-light.png` | Ẩn danh (`/candidate/skills`, `/hr/company`, `/admin`) | `1440x900` Light | Redirect tức thì về `/login`, `0` nháy nội dung bảo vệ (`d7ae3948`) |
| 4 | `04-hr1-must-change-password-no-sidebar-1440px-light.png` | `HR` (`hr1`, `must_change_password=true`) `/change-password` | `1440x900` Light | Ép chuyển `/change-password`, `0` sidebar |
| 5 | `05-f1-case1-staff-sso-logout-hr2-home-1440px-light.png` | F1 Ca 1: `staff1` LMS SSO -> đăng xuất -> `hr2` | `1440x900` Light | Vào thẳng `/hr` (`h1` Doanh nghiệp B, badge `"HR"`, sidebar `280px`) |
| 6 | `06-f1-case2-hr2-logout-admin1-home-1440px-light.png` | F1 Ca 2: `hr2` `/hr/company` -> đăng xuất -> `admin1` | `1440x900` Light | Vào thẳng `/admin` (`h1` Đỗ Thanh Hải, badge `"Quản trị viên"`) |
| 7 | `07-f1-case3-admin1-logout-candidate1-sso-home-1440px-light.png` | F1 Ca 3: `admin1` `/admin` -> đăng xuất -> `candidate1` LMS SSO | `1440x900` Light | `POST /api/v1/auth/sso` `200 OK`, vào thẳng `/candidate` (`h1` Nguyễn Văn An, sidebar `280x844`) |
| 8 | `08-skip-link-focused-1440px-light.png` | Skip link `"Bỏ qua tới nội dung chính"` | `1440x900` Light | Hiện tại `(8, 8)`, kích thước `224.54 x 44px` trước header & sidebar |
| 9 | `09-candidate-sidebar-expanded-1440px-light.png` | `CANDIDATE` `/candidate` mở rộng | `1440x900` Light | Sidebar `280px`, `6` mục `44px`, `0` cắt chữ |
| 10 | `10-candidate-sidebar-expanded-1440px-dark.png` | `CANDIDATE` `/candidate` mở rộng | `1440x900` Dark | Sidebar `280px` Dark Mode theo token |
| 11 | `11-candidate-sidebar-collapsed-tooltip-1440px-light.png` | `CANDIDATE` `/candidate` thu gọn + hover tooltip | `1440x900` Light | Rail `72px`, `aria-expanded="false"`, tooltip `"Hồ sơ"` |
| 12 | `12-candidate-sidebar-collapsed-tooltip-1440px-dark.png` | `CANDIDATE` `/candidate` thu gọn + focus tooltip | `1440x900` Dark | Rail `72px` Dark Mode, focus tooltip `"Việc làm"` |
| 13 | `13-candidate-skills-sidebar-1440px-light.png` | `CANDIDATE` `/candidate/skills` | `1440x900` Light | Mục `"Hồ sơ"` active (`aria-current="page"`) trong `SharedAppLayout` |
| 14 | `14-candidate-jobs-sidebar-1440px-light.png` | `CANDIDATE` `/candidate/jobs` | `1440x900` Light | Mục `"Việc làm"` active (`aria-current="page"`) trong `SharedAppLayout` |
| 15 | `15-hr-sidebar-expanded-1440px-light.png` | `HR` `/hr` mở rộng | `1440x900` Light | Sidebar `280px`, `5` mục `36px` (`Trang chủ`, `Công ty`, `3` mục `"Sắp ra mắt"`) |
| 16 | `16-hr-sidebar-expanded-1440px-dark.png` | `HR` `/hr` mở rộng | `1440x900` Dark | Sidebar `280px` Dark Mode, mục `36px` |
| 17 | `17-hr-company-sidebar-1440px-light.png` | `HR` `/hr/company` | `1440x900` Light | Hồ sơ Công ty với mục `"Công ty"` active (`aria-current="page"`) |
| 18 | `18-mentor-sidebar-expanded-1440px-light.png` | `MENTOR` `/mentor` mở rộng | `1440x900` Light | Sidebar `280px`, `Trang chủ` + `Cần đánh giá` (`36px`, `"Sắp ra mắt"`) |
| 19 | `19-staff-sidebar-expanded-1440px-light.png` | `STAFF` `/staff` mở rộng | `1440x900` Light | Sidebar `280px`, `Trang chủ` + `5` mục `"Sắp ra mắt"` (`36px`, `0` cắt chữ) |
| 20 | `20-admin-sidebar-expanded-1440px-light.png` | `ADMIN` `/admin` mở rộng | `1440x900` Light | Sidebar `280px`, `Trang chủ` + `Quản trị` (`36px`, `"Sắp ra mắt"`) |
| 21 | `21-candidate-403-in-layout-1440px-light.png` | `CANDIDATE` `403` trong layout | `1440x900` Light | `ForbiddenPage` giữ nguyên sidebar `CANDIDATE` `280px`, nhãn `"Ứng viên"`, nút `/candidate` |
| 22 | `22-candidate-403-in-layout-1440px-dark.png` | `CANDIDATE` `403` trong layout | `1440x900` Dark | `ForbiddenPage` trong layout Dark Mode |
| 23 | `23-hr-403-in-layout-1440px-light.png` | `HR` `403` trong layout | `1440x900` Light | Giữ sidebar `HR` `280px`, nhãn `"HR"`, nút `/hr` |
| 24 | `24-mentor-403-in-layout-1440px-light.png` | `MENTOR` `403` trong layout | `1440x900` Light | Giữ sidebar `MENTOR` `280px`, nhãn `"Mentor"`, nút `/mentor` |
| 25 | `25-staff-403-in-layout-1440px-light.png` | `STAFF` `403` trong layout | `1440x900` Light | Giữ sidebar `STAFF` `280px`, nhãn `"Nhân viên"`, nút `/staff` |
| 26 | `26-admin-403-in-layout-1440px-light.png` | `ADMIN` `403` trong layout | `1440x900` Light | Giữ sidebar `ADMIN` `280px`, nhãn `"Quản trị viên"`, nút `/admin` |
| 27 | `27-candidate-sidebar-1024px-collapsed-light.png` | `CANDIDATE` `/candidate` tablet ngang | `1024x768` Light | Mặc định thu gọn `72px`, rộng `1008.8 <= 1024` (`0` tràn ngang) |
| 28 | `28-candidate-sidebar-768px-collapsed-light.png` | `CANDIDATE` `/candidate` tablet dọc | `768x1024` Light | Mặc định thu gọn `72px`, rộng `752.8 <= 768` (`0` tràn ngang) |
| 29 | `29-candidate-sidebar-768px-collapsed-dark.png` | `CANDIDATE` `/candidate` tablet dọc | `768x1024` Dark | Mặc định thu gọn `72px` Dark Mode (`0` tràn ngang) |
| 30 | `30-candidate-drawer-open-375px-light.png` | `CANDIDATE` `/candidate` mobile drawer | `375x812` Light | Drawer `280 x 812`, toggle & nút đóng `44x44px`, mục `44px`, `0` cắt chữ |
| 31 | `31-candidate-drawer-open-375px-dark.png` | `CANDIDATE` `/candidate` mobile drawer | `375x812` Dark | Drawer `280 x 812` Dark Mode |
| 32 | `32-hr-drawer-open-375px-light.png` | `HR` `/hr` mobile drawer | `375x812` Light | Drawer `280 x 812`, mục `HR` nâng lên `44px`, `0` cắt chữ |
| 33 | `33-candidate-403-in-layout-375px-light.png` | `CANDIDATE` `403` trong layout mobile | `375x812` Light | Toggle `44x44px`, rộng `375.2px` (`0` tràn ngang) |
| 34 | `34-sidebar-focus-visible-1440px-light.png` | Sidebar `:focus-visible` bàn phím | `1440x900` Light | Vòng focus `:focus-visible` rõ nét trên mục điều hướng sidebar |
