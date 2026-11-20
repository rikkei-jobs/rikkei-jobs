# Nhật Ký Quan Sát & Đo Đạc Trình Duyệt Thực Tế (`BROWSER_OBSERVATIONS.md` — `UIUX-polish` & `UIUX-radar`)

**Dự án**: Rikkei Jobs — Vòng `UIUX-polish` (M1–M8) & Vòng bổ sung `UIUX-radar` (`/login` `CompetencyRadarVisual` tự chuyển có giới hạn, gỡ nút tạm dừng hiển thị, vòng nền 1-shot `<= 5s`, cân đối bố cục màn hình rộng)  
**Nhánh**: `feature/uiux-motion-polish`  
**Ảnh chụp màn hình**: `docs/uiux/pr-screenshots/` (`89` tệp PNG git-ignored: `15` M4 + `24` M4b + `28` M7 + `21` `UIUX-radar` + `1` ảnh báo lỗi gốc từ Owner, đối chiếu 1:1 với `docs/uiux/pr-screenshots/ORDER.txt`)

## 1. Phân Tách Nguồn Bằng Chứng & Giới Hạn Sandbox `webview_browser`

Mọi số liệu trong tài liệu này được gắn nhãn trung thực theo đúng công cụ thực thi:

1. `` `[/browser]` ``: Thực thi trên Antigravity `/browser` (`webview_browser`) đối chiếu trực tiếp stack Docker Compose (`http://127.0.0.1:3000`) qua các lượt **M4 Pilot** (`15` ảnh `m4-01`..`m4-15`), **M4b Pilot Rework** (`24` ảnh `m4b-seq-*` và `m4b-01`..`m4b-12`), **M7 Pass 1 & Pass 2** (phát hiện BUG 1–4), **M7 Targeted Re-Verification** (`28` ảnh `m7-01`..`m7-28`), và **UIUX-radar** (`21` ảnh `radar-01`..`radar-09`, `radar-11`..`radar-22`, phiên `70a37ec7-1ad5-481e-828d-cf6b0eb8e75f`, asset `index-wGCI4iLJ.js` & `index-BANbuE8W.css`).
2. `` `[Chromium PerformanceObserver / CDP]` ``: Đo đạc tự động qua probe Playwright Chromium (`UIUX-polish` Wave 10: `CLS`, `rawAll`, `getAnimations()`, `MutationObserver` chuyển cảnh đăng xuất, giả lập API trễ `650ms`) và probe Chrome headless CDP phụ trợ (`UIUX-radar`: đo trước/sau `scrollWidth === innerWidth` và `boundingBox()` trên `1280/1440/1600/1660/1662/1920/375px` — tách biệt hoàn toàn với bằng chứng `` `[/browser]` ``).
3. `` `[Static CSS / Vitest / compute-contrast]` ``: Số liệu mã nguồn CSS/TSX, kết quả `35/35` tệp Vitest (`410/410` tests gồm `14` test fake-timer mới của `CompetencyRadarVisual.test.tsx`, `0` `act()`), `node scripts/compute-contrast.mjs` (`120/120` cặp màu Light & Dark), và `node scripts/validate-agent-config.mjs` (`10/10`, `168` mirror files).

### 1.1. Báo Cáo Trung Thực Giới Hạn Sandbox `webview_browser`

- **Các API bị chặn trong `webview_browser`**: `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, `page.emulateMedia`, `page.request`, và `page.route` đều bị chặn; đồng thời `networkRequests()` che `headers: {}`.
- **Hệ quả đo đạc và biện pháp bù đắp**:
  - Thông số hình học (`locator.boundingBox()`, `page.viewportSize()`), tương tác chuột (left-click, right-click, double-click, hover), điều hướng bàn phím (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`, mũi tên `ArrowLeft`/`ArrowRight`/`Home`/`End`), nhập liệu, `goBack()`/`goForward()`/`reload()`, kiểm tra thuộc tính DOM/ARIA (`aria-pressed`, `aria-live`, text chi tiết), và chụp ảnh chuỗi khung hình động (`m4b-seq-*`, `radar-01`..`09`) được thực hiện trực tiếp bằng Playwright native locators trong `` `[/browser]` ``.
  - Vì `page.emulateMedia({ reducedMotion: 'reduce' })` bị chặn trong `webview_browser`, **`radar-10-reduced-motion.png` không được chụp** (`0` tệp giả). Hành vi `prefers-reduced-motion: reduce` của radar (không tạo bất kỳ timer nào, tĩnh hoàn toàn, chỉ thao tác thủ công) và `.rj-story-ambient` (`animation-duration: 0.001ms !important`) được chứng minh bằng bộ unit test fake-timer `CompetencyRadarVisual.test.tsx` kết hợp CSS `@media (prefers-reduced-motion: reduce)` trong `` `[Static CSS / Vitest]` ``.
  - Vì `page.evaluate` bị chặn trong `webview_browser`, chỉ số `scrollWidth` / `CLS` / `getAnimations()` không đọc trực tiếp bằng JS trong `webview_browser`; trong `` `[/browser]` ``, độ vừa khung hình được kiểm chứng qua `page.viewportSize()`, `locator.boundingBox()` (`html`, `.rj-auth-story-panel`, `.rj-story-content-wrapper`, `.rj-brand-lockup`, `.rj-radar-detail-box`, `.rj-story-footer`, `.rj-auth-card`), không xuất hiện thanh cuộn ngang/dọc, và kiểm tra trực quan `21` ảnh `radar-*`; đối chiếu thêm bằng số đo trước/sau ở mục 2.4 (`[CDP]` phụ trợ).
- **Điều hướng trực tiếp `/403` và tuyến lạ (`404` fallback) khi chưa có phiên JWT**:
  - Do JWT lưu hoàn toàn trong RAM (`AuthContext`, không dùng `localStorage`/`cookie`), gọi thẳng `page.goto('/403')` hoặc `page.goto('/unknown-route')` trên tab mới sẽ chuyển sạch về `/login` (`0` nháy nội dung bảo vệ). Luồng `/403` bên trong `SharedAppLayout` và chuyển hướng `*` (`404` fallback) được kiểm chứng qua điều hướng SPA sau khi đăng nhập cùng bộ unit test `ForbiddenPage.test.tsx`, `guards.test.tsx`, và `App.test.tsx`.
- **Giới hạn cảm nhận chuyển động trên ảnh tĩnh**: Ảnh chụp màn hình tĩnh không thể chứng minh trực tiếp độ mượt 60fps của đường cong lò xo `linear()`; nhóm phát triển chỉ báo cáo những thông số đã đo trực tiếp (`0/100/200/400/800ms` và `t=0/4s/8s/+9s/~85s` sequence captures, `CLS`, durations/tokens) và để Team Lead / Product Owner thẩm định cảm giác thực tế trên stack sống.

---

## 2. Kết Quả Kiểm Chứng Theo Các Mốc (`M4` -> `M4b` -> `M7` -> `UIUX-radar`)

### 2.1. M4 Pilot & M1 Controls (`/login`, `/candidate`, `/hr/company`, `15` ảnh `m4-*`) `` `[/browser]` ``

- **M1a — Nút thu gọn / mở rộng sidebar (`button.rj-sidebar-toggle`)**:
  - Nút `<button type="button">` chỉ dùng biểu tượng (không có chữ hiển thị), vùng chạm đo được **`47.2 x 44px` (`>= 44px`)**, `aria-controls` trỏ đúng `aside.rj-sidebar`, `aria-expanded` đổi `"true" <-> "false"`, `aria-label` đổi động `"Thu gọn thanh điều hướng"` <-> `"Mở rộng thanh điều hướng"`.
  - Biểu tượng `<Icon />` lật mượt bằng CSS `transform` thay vì tráo đổi SVG; hover và focus bàn phím hiển thị tooltip `role="tooltip"` trùng văn bản trong `180ms` (`<= 200ms`), nhấn `Escape` ẩn ngay tooltip mà không dời focus. Trạng thái thu gọn `280px <-> 72px` lưu vào `localStorage` (`rj_sidebar_collapsed`).
- **M1b — Công tắc chế độ sáng / tối (`ThemeSwitch.tsx`)**:
  - Toàn bộ nút chữ `"Chế độ sáng"` / `"Chế độ tối"` đã được thay bằng `<button type="button" role="switch" aria-checked={isDark} aria-label="Chế độ tối">` (nhãn tiếp cận cố định), vùng chạm **`60 x 44px` (`>= 44px`)**, bên trong dùng `<Icon />` mặt trời/mặt trăng (`aria-hidden="true"`).
  - Hỗ trợ `Space`, `Enter` và click chuột; tooltip `"Chế độ tối"` căn tại `x = 16px` trên mobile `375px` (`0` cắt mép trái, ảnh `m4-10`, `m4-15`); ranh giới và trạng thái đạt `>= 3.0:1` ở cả Light & Dark Mode; giữ nguyên `data-theme` trên `<html>` và fallback theo `prefers-color-scheme`.
- **Tương tác R2 trên `/login`, `/candidate`, `/hr/company`**:
  - Tablist `/login` hỗ trợ `ArrowRight`/`ArrowLeft`/`Home`/`End` với roving `tabIndex`; `/hr/company` custom `Select` mở danh sách 5 lựa chọn quy mô nhân sự bằng bàn phím và chuột ở cả Light & Dark Mode (`m4-14`); mobile drawer `280 x 812` đóng bằng `Escape`, nút X và backdrop (`m4-11`).

### 2.2. M4b Showcase Motion Rework (`24` ảnh `m4b-*`) `` `[/browser]` ``

- **Chuỗi khung hình theo thời gian thực (`m4b-seq-*`)**:
  - **Mở màn `/login`** (`5` lượt `domcontentloaded` độc lập): `m4b-seq-login-t000-84ms.png` (header hiện, headline/radar đang masked) -> `t100-223ms` (chữ hiện từng dòng qua clip-mask) -> `t200-444ms` (trục radar vẽ và đa giác nở ra) -> `t400-560ms` (thẻ giải thích nhóm kỹ năng lộ diện) -> `t800-939ms` (hoàn tất choreography `<= 800ms`).
  - **Hiệu ứng đổi theme hình tròn (`ThemeSwitch`)**: `m4b-seq-theme-01-525ms-clippath.png` ghi nhận trực tiếp sóng tối `clip-path: circle(...)` lan tỏa từ tâm công tắc (View Transitions API `<= 500ms <= 600ms`), ổn định ở `747ms` / `1023ms` / `1436ms`.
  - **Thu gọn sidebar (`280px -> 72px`)**: `m4b-seq-sidebar-01-455ms.png`..`03-1048ms.png` xác nhận thanh rail `72px` ổn định và chỉ báo mục chọn trượt bằng FLIP.
- **Khắc phục phản hồi M4 (trạng thái trước vòng `UIUX-radar`)**:
  - Radar trên `/login` hiển thị đúng `6` nhóm kỹ năng thật (`Lập trình nền tảng`, `Backend và dữ liệu`, `Frontend`, `Công cụ và vận hành`, `Chất lượng và bảo mật`, `Kỹ năng mềm`) kèm chú thích minh họa rõ ràng (`m4b-01`).
  - Tại M4b từng đặt nút `"Tạm dừng nền"` tại chân hero (`m4b-02`), sau đó **đã được gỡ bỏ theo quyết định của Owner tại vòng `UIUX-radar`** (xem mục 2.4).
  - Loại bỏ hàng 3 thẻ đối xứng và khối `"Thông tin tài khoản"` cỡ lớn ở đầu `/candidate`; dẫn dắt bằng bước tiếp theo từ dữ liệu thật của `lms-sv-001` (`11` kỹ năng đã xác thực, `79/78/70/90/Chưa có/86`, `m4b-05`, `m4b-06`).

### 2.3. M7 Full-App Pass 1 & Pass 2 -> Sửa 4 Lỗi -> Wave 10 & Re-Verification (`28` ảnh `m7-*`)

Trong lượt `/browser` M7 đầu tiên (Pass 1 & Pass 2) qua toàn bộ 5 vai trò và các tuyến công khai/xác thực, kiểm thử phát hiện **4 lỗi thực tế**, sau đó đã được sửa dứt điểm và xác minh lại qua cả `` `[Chromium PerformanceObserver]` `` (Wave 10) lẫn `` `[/browser]` `` M7 Targeted Re-Verification (`28` ảnh `m7-01`..`m7-28`):

| Mã lỗi | Mức độ | Hiện tượng phát hiện ở Pass 1/2 | Nguyên nhân gốc & Bản sửa | Kết quả tái kiểm chứng Wave 10 & M7 Re-Verification |
|---|---|---|---|---|
| **BUG 1** | Critical | `/mentor` hiển thị trọng số tiêu chí `(3000%)`..`(1500%)` | `evaluationTemplates.ts` / `MentorHomePage.tsx` nhân thừa `100` trên giá trị trọng số vốn đã ở thang phần trăm `0–100` | Hiển thị đúng `(30%)..(15%)` và `(20%)..(25%)` (`m7-22-mentor-1440-light.png`); `10/10` lượt `ready`/`empty`/`error` `CLS === 0`. |
| **BUG 2** | Major | Liên kết `a[href="/change-password"]` lỗi luồng cho tài khoản LMS SSO + `/admin` lặp 3 nút `"Đổi mật khẩu"` | LMS SSO không có mật khẩu nội bộ nhưng `RoleHomeLayout` vẫn render nút đổi mật khẩu; `/admin` đặt thêm nút điều hướng trùng | Bổ sung `RequireChangePasswordAccess.tsx` chặn LMS SSO không có `mustChangePassword`; `RoleHomeLayout.tsx` ẩn nút đổi mật khẩu khi `Boolean(user.lmsUserId)`; `/admin` chỉ còn `3` nút tách biệt (`m7-26`, `m7-27`). |
| **BUG 3** | Major | Nháy khung `PersistentShell` (~300ms) đè lên `/login` khi bấm `Đăng xuất` | `startViewTransition` vẫn chạy qua lần chuyển sang `/login` khi phiên bị xóa | `SharedAppLayout.tsx` và `App.tsx` gọi `cancelRouteTransition()` đồng bộ trước khi điều hướng đăng xuất/`401` (`0` shell nodes, `0` flash frames trên `8/8` kịch bản 5 vai trò + `8/8` rapid nav/logout). |
| **BUG 4** | Minor | Trên `375px`, placeholder trang `/change-password` quá dài nên bị cắt cụt ở cuối ô nhập (`m7-07`) | Placeholder quá dài so với chiều rộng nội dung input ở `375px` | Rút gọn placeholder rõ ràng trong `ChangePasswordPage.tsx`; kiểm tra `22/22` lượt `375x812` Light & Dark trên `11` tuyến/trạng thái: `0` cắt placeholder, `scrollWidth === 375` (`m7-07`). |

### 2.4. Vòng `UIUX-radar` — Tự Chuyển Radar Có Giới Hạn, Bỏ Nút Pause & Cân Đối `/login` (`21` ảnh `radar-*`) `` `[/browser]` ``

Thực thi trên `/login` (`http://127.0.0.1:3000`, `index-wGCI4iLJ.js` & `index-BANbuE8W.css` HTTP `200`, `0` lỗi console, `0` lỗi HTTP `>= 400`) qua phiên `/browser` `70a37ec7-1ad5-481e-828d-cf6b0eb8e75f`:

#### Kịch bản A — Hành vi Radar, Vòng nền 1-Shot, Bàn phím & Chuột thực (`1440x900` Light)

1. **Gỡ nút tạm dừng & chú thích WCAG tiếng Việt**: Không tồn tại nút `"Tạm dừng nền"` / `"Phát nền"` trong `.rj-story-footer`. Chú thích dưới radar hiển thị nguyên văn: `"Hình minh họa 6 nhóm kỹ năng: di chuột hoặc dùng Tab để tạm dừng, chọn để giữ 8 giây, nhấn Escape để tiếp tục."`
2. **Chuỗi tự chuyển 4 giây theo thời gian thực (`--rj-radar-cycle: 4000ms`)**:
   - `radar-01-seq-step1-t0.png` (`t = 900ms`): nhóm 1 `"Lập trình nền tảng"`, hộp chi tiết đặt `aria-live="off"`.
   - `radar-02-seq-step2-t4s.png` (`t = 5.1s`): tự động chuyển sang nhóm 2 `"Backend và dữ liệu"`, `aria-live="off"`.
   - `radar-03-seq-step3-t8s.png` (`t = 9.4s`): tự động chuyển sang nhóm 3 `"Frontend"`, `aria-live="off"`.
3. **Vòng nền trang trí 1-shot (`<= 5s`)**: `radar-04-ambient-static-5s.png` (`t = 6.6s`) xác nhận `.rj-story-ambient` (`4500ms`/`4800ms` `1 forwards`) đã dừng tĩnh sau `<= 5s`.
4. **Tạm dừng khi Hover**: `radar-05-hover-hold.png` — di chuột vào `.rj-radar-detail-box` và giữ `4.6s`: radar đứng yên trên `"Frontend"`, không tự chuyển bước.
5. **Giữ 8 giây khi Click & Tự chạy tiếp / Click lại để bỏ chọn**:
   - `radar-06-click-hold.png`: click nhóm `"Chất lượng và bảo mật"` đặt `aria-pressed="true"` và `aria-live="polite"`.
   - `radar-07-click-resume-8s.png`: đưa chuột ra ngoài và click khoảng trống để bỏ focus -> tại `+4.5s` vẫn giữ `"Chất lượng và bảo mật"`, đến `+9.0s > 8s` tự chuyển sang nhóm kế `"Kỹ năng mềm"` (`aria-pressed="false"`, `aria-live="off"`). Click lại vào nhóm đang chọn (`Frontend`) chuyển ngay `aria-pressed` từ `"true"` về `"false"` và tiếp tục chạy.
6. **Bàn phím (`Tab`/`Enter`/`Space`/`Escape`) không cướp focus**:
   - `radar-08-keyboard-escape.png`: `Tab` vào trục `"Lập trình nền tảng"` tạm dừng & hiển thị chi tiết; `Enter`/`Space` chuyển `aria-pressed`; nhấn `Escape` giữ nguyên focus trên phần tử đang focus (không `.blur()`), xóa `aria-pressed="false"`, `aria-live="off"`, và sau `4.3s` tự chuyển sang `"Backend và dữ liệu"`.
7. **Tự dừng sau 3 vòng (18 bước ~72s) về trạng thái tổng quan**:
   - `radar-09-3round-autostop-overview.png`: chờ liên tục `~85s > 72s` không tương tác -> radar tự dừng về thông điệp tổng quan `"Di chuột hoặc dùng phím Tab vào từng nhóm trên biểu đồ để xem chi tiết kỹ năng."`, `aria-live="off"`.
8. **Tương tác người dùng thực & phạm vi `/login` duy nhất**:
   - Chuột phải lên tiêu đề, double-click `"Đăng nhập"`, cuộn `(0, 400)` / `(0, -400)`, `goBack()` / `goForward()` / `reload()` (`/login <-> /forgot-password`) đều hoạt động sạch (`0` lỗi).
   - Xác minh không tự chuyển trên màn hình khác: `/forgot-password` (chờ `4.5s`: `0` auto-cycle) và `/candidate` (đăng nhập bằng vé LMS SSO `lms-sv-001` -> `POST /api/v1/auth/sso` HTTP `200`, chờ `4.6s`: `0` auto-cycle).
9. **Giới hạn reduced-motion trong `webview_browser`**: `page.emulateMedia` bị chặn nên không chụp `radar-10-reduced-motion.png`; hành vi `0` timer khi `prefers-reduced-motion: reduce` được kiểm chứng bởi `CompetencyRadarVisual.test.tsx`.

#### Kịch bản B — Điều tra lỗi cắt trái `owner-report-login-left-clipped.png` & Bảng đo Bounding Box Trước/Sau (R4)

- **Kết luận nguyên nhân gốc**: Ảnh `owner-report-login-left-clipped.png` (`1662x862`, bản M4b cũ còn nút `"Tạm dừng nền"`) là ảnh chụp crop/dịch trái ~`88px` từ màn hình `1920px` trên máy cá nhân của Owner — **không tái hiện** cắt mép trái trên trình duyệt sống tại `1280/1440/1600/1660/1662/1920px` (`lockup.x >= 40px`). Tuy nhiên ở khung `1600–1920px`, vùng story kéo dãn từ `x = 40px` gây khoảng trống lớn bên trái thẻ đăng nhập, và ở `1280x800` cột story cao `806.9px` gây tràn dọc `6.9px` (sinh thanh cuộn `15px`).
- **Bản sửa tối thiểu**: Thêm `overflow-x: clip` trên `html, body` và `.rj-auth-editorial-layout`; `min-width: 0` trên hai panel; giảm padding dọc story panel & footer để `1280x800` đạt `story.h = 800px` (`0` tràn dọc); giới hạn `.rj-story-content-wrapper` / `.rj-story-footer` (`max-width: 680px`), `.rj-radar-detail-box` (`max-width: 560px`), `.rj-radar-caption` (`max-width: 54ch`); và ở `@media (min-width: 1536px)` cân tỷ lệ `minmax(0, 1.28fr) minmax(480px, 1fr)` đưa nội dung story và thẻ đăng nhập cân đối quanh đường chia giữa (`48px` bên card, `56px` bên story) trong khi nền hai cột giữ full-bleed. Mobile `375px` giữ nguyên.

| Viewport (Light & Dark cùng tọa độ) | Trước sửa (`[CDP]` baseline) | Sau sửa (`[/browser]` `webview_browser` `locator.boundingBox()`, `radar-11`..`22`) |
|---|---|---|
| `1280x800` (`radar-11`, `radar-12`) | `docScrollW=1265`, `story.h=806.9` (tràn dọc `6.9px`, scrollbar `15px`), `lockup.x=40`, `card=786.8..1226.8` | `html=0,0,1280,800`, `story-panel=0,0,757.55,800` (**hết tràn dọc**), `lockup.x=40`, `content=40..716.75`, `detail.w=560`, `footer=40..716.75`, `auth-card=798.78..1238.78` (`w=440`) |
| `1440x900` (`radar-13`, `radar-14`) | `docScrollW=1440`, `story=0..852.2`, `lockup.x=40`, `detail.w=772.2`, `card=926.1..1366.1` | `html=0,0,1440,900`, `story-panel=0,0,852.24,900`, `lockup.x=85.71`, `content.w=680`, `detail.w=560`, `auth-card=926.11..1366.11` |
| `1600x900` (`radar-15`, `radar-16`) | `docScrollW=1600`, `story=0..946.9`, `lockup.x=40`, `detail.w=866.9`, `card=1053.5..1493.5` (cách divider `106.6px`) | `html=0,0,1600,900`, `story-panel=0,0,898.24,900`, `lockup.x=161.44`, `content.w=680`, `detail.w=560`, `auth-card=946.24..1386.24` (`48px` cách divider) |
| `1660x862` (`radar-17`, `radar-18`) | `docScrollW=1660`, `story=0..982.4`, `lockup.x=40`, `detail.w=901.4`, `card=1101.2..1541.2` (cách divider `118.8px`) | `html=0,0,1660,862.4`, `story-panel=0,0,931.92,862.4`, `lockup.x=195.13`, `content.w=680`, `detail.w=560`, `auth-card=979.92..1419.92` (`48px` cách divider) |
| `1920x1080` (`radar-19`, `radar-20`) | `docScrollW=1920`, `story=0..1136.3`, `lockup.x=40`, `detail.w=1055.3`, `card=1308.2..1748.2` (cách divider `171.9px`) | `html=0,0,1920,1080`, `story-panel=0,0,1077.89,1080`, `lockup.x=341.09`, `content.w=680`, `detail.w=560`, `auth-card=1125.89..1565.89` (`48px` cách divider, lề trái `341.09px` / lề phải `354.11px`) |
| `375x812` (`radar-21`, `radar-22`) | `docScrollW=375`, `story=0..375 (h=150.3)`, `lockup.x=16`, `card=16..359 (w=343)` | `html=0,0,375.2,812`, `story-panel=0,0,375.2,149.7`, `lockup.x=16`, `content.w=343.2`, `auth-card=16,173.7,343.2,415.1` (mobile giữ nguyên) |

*(Ghi chú: Số đo `[CDP]` phụ trợ của Worker 1 trên cùng bản build cho thấy `docScrollW === innerWidth` tại mọi kích thước `1280/1440/1600/1660/1662/1920/375` với `docScrollH === innerHeight`).*

---

## 3. Ma Trận Đo Đạc Toàn Bộ Tuyến Đường (`19` Route Entries + `*` Fallback)

Toàn bộ kết quả bên dưới tổng hợp từ `` `[/browser]` `` (`m4-*`, `m4b-*`, `m7-01`..`m7-28`, `radar-*`) và `` `[Chromium PerformanceObserver]` `` Wave 10 trên `375x812`..`1920x1080` (Light & Dark):

| # | Tuyến (`App.tsx`) | Vai trò / Ngữ cảnh | `scrollWidth <= requestedWidth` (`375..1920px`, Light & Dark) | `CLS` & `rawAll` `` `[Chromium PerformanceObserver]` `` | Quan sát nội dung, M1 & tương tác R2 | Ảnh đại diện |
|---:|---|---|---|---:|---|---|
| 1 | `/` | Công khai (`HomeSkeleton`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` | Có `ThemeSwitch`, nội dung vai trò + lộ trình `Sắp ra mắt`, mục dev-health thu gọn trong `<details>` chỉ ở `DEV` | `m7-01`, `m7-02` |
| 2 | `/login` | Công khai (`LoginPage` 2 tab LMS & Doanh nghiệp) | Đạt (`375/1280/1440/1600/1660/1920px`, Light & Dark) | `0` | Radar `6` nhóm kỹ năng tự chuyển `4s`/bước dừng sau 3 vòng, hover/focus pause, click giữ `8s`, `Escape` không cướp focus, `.rj-story-ambient` 1-shot `<= 5s` (bỏ nút `"Tạm dừng nền"` theo ngoại lệ Owner), `ArrowLeft`/`ArrowRight`/`Home`/`End` | `radar-01`..`09`, `radar-11`..`22` |
| 3 | `/forgot-password` | Công khai (`ForgotPasswordPage`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` | Không còn `TTL 30 phút` / chống dò quét; radar tĩnh (`0` auto-cycle); form và thông báo thành công rõ ràng | `m7-03` |
| 4 | `/reset-password` & `/reset-password/:token` | Công khai (`ResetPasswordPage`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` | Không còn `ASVS`/`brute-force`/`entropy`; danh sách 4 quy tắc mật khẩu cập nhật mượt | `m7-04` |
| 5 | `/sso-callback` | Công khai (`SsoCallbackPage`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` (`loading -> success` & `loading -> error`, `420ms` & `650ms`) | Giữ nguyên DOM `.rj-sso-card` qua chuyển trạng thái; thông báo tiếng Việt thân thiện khi vé lỗi (`m7-05`) hoặc chuyển hướng thành công sang trang chủ vai trò | `m7-05` |
| 6 | `/change-password` | `hr1` bắt buộc & `hr2` tự nguyện (`RequireChangePasswordAccess`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` | Chế độ bắt buộc (`hr1`) có banner cảnh báo, không có link quay lại `/hr`, giữ nút `Đăng xuất`; chế độ tự nguyện (`hr2`) có link quay lại `/hr`; placeholder `375px` hết cắt chữ (BUG 4) | `m7-06`, `m7-07` |
| 7 | `/candidate` | `CANDIDATE` (`lms-sv-001`, Airy `44px`) | Đạt (`375 <= 375`, `768 <= 768`, `1024 <= 1024`, `1440 <= 1440`) | `0` (tải đầu `6/6` & quay lại SPA `6/6` dưới API giữ `650–750ms`) | Dẫn dắt bằng bước tiếp theo + `11` kỹ năng thật + việc làm gợi ý + khoảng thiếu hụt + đánh giá mentor + radar tĩnh (`0` auto-cycle); khối tài khoản phụ ở dưới, không có `User ID` | `m7-08`, `m7-09` |
| 8 | `/candidate/skills` | `CANDIDATE` (`SkillProfilePage` + `CandidateEvaluations`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` | Sửa dứt điểm lỗi tràn `411px > 375px` của `skillProfile.css`; accordion minh chứng mở/đóng mượt; bỏ chữ `Backend` khỏi thông báo lỗi | `m7-10`, `m7-11` |
| 9 | `/candidate/gap-analysis` | `CANDIDATE` (`GapAnalysisSection`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` | Custom `Select` chọn vị trí mục tiêu; bảng cuộn ngang nội bộ không đẩy trang `375px` | `m7-12` |
| 10 | `/candidate/evaluations` | `CANDIDATE` (`CandidateEvaluationsPage`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` | Bỏ viền/lề thừa phía trên khi mở độc lập (`.ce-page:first-child`); điểm số `tabular-nums` rõ nét | `m7-13` |
| 11 | `/candidate/jobs` | `CANDIDATE` (`CandidateJobsPage` + `JobRecommendationsSection`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` | Sửa dứt điểm tràn `400.8px > 375px`; bỏ `AI Provider` & `bộ nhớ đệm`; hiển thị `Cập nhật trong ngày`; nút `Ứng tuyển (Sắp ra mắt)` disabled đúng ngữ nghĩa | `m7-14`, `m7-15` |
| 12 | `/candidate/jobs/:jobId` | `CANDIDATE` (`CandidateJobDetailPage`) | Đạt (`375 <= 375`, `1440 <= 1440`) | `0` | Liên kết quay lại + bảng đối chiếu từng kỹ năng JD | `m7-16` |
| 13 | `/hr` | `HR` (`hr2`, Dense `36px` desktop / `44px` drawer) | Đạt (`375/768/1024/1440px`, Light & Dark) | `0` (`30/30` lượt bao gồm quay lại `/hr` từ `/change-password` & `/hr/company` với API giữ `650ms`, bấm `Tab` thật, tên `144` & `120` ký tự, lỗi `500` + `reduced-motion`) | Nhãn nút CTA `'Mở hồ sơ công ty'` bất biến + khung `.rj-hr-next-content` khóa chiều cao (`112/132/140/156/184px`) giữ nguyên tham chiếu DOM và keyboard focus qua `isLoading` | `m7-17`, `m7-18`, `m7-19` |
| 14 | `/hr/company` | `HR` (`CompanyProfilePage`, Dense) | Đạt (`375/768/1024/1440px`, Light & Dark) | `0` | Biểu mẫu thông tin pháp lý, custom `Select` quy mô, upload logo (`JPG/PNG <= 2 MB`), trạng thái loading/empty/error/ready | `m7-20`, `m7-21` |
| 15 | `/mentor` | `MENTOR` (`lms-mt-001`, Airy `44px`) | Đạt (`375/768/1024/1440px`, Light & Dark) | `0` (`10/10` lượt `ready`/`empty`/`error` giữ `650ms`) | Dữ liệu thật từ `GET /api/v1/evaluation-templates`; trọng số `(30%)..(15%)` và `(20%)..(25%)` đúng chuẩn (BUG 1); ẩn `/change-password` cho LMS SSO (BUG 2) | `m7-22`, `m7-23` |
| 16 | `/staff` | `STAFF` (`lms-st-001`, Dense `36px`) | Đạt (`375/768/1024/1440px`, Light & Dark) | `0` (`10/10` lượt `ready`/`empty`/`error` giữ `650ms`) | Dữ liệu thật từ `GET /api/v1/target-positions`; nội dung vận hành điều phối; ẩn `/change-password` | `m7-24`, `m7-25` |
| 17 | `/admin` | `ADMIN` (`lms-ad-001`, Dense `36px`) | Đạt (`375/768/1024/1440px`, Light & Dark) | `0` (`6/6` lượt) | Nội dung quản trị danh mục 20 kỹ năng/trọng số (`Sắp ra mắt`), zero technical showcase, `3` nút không trùng lặp (BUG 2) | `m7-26`, `m7-27`, `m7-28` |
| 18 | `/403` | Đã đăng nhập truy cập trái vai trò (`ForbiddenPage`) | Đạt (`375/1440px` via SPA + Vitest) | `0` (SPA) | Nằm bên trong `SharedAppLayout` giữ nguyên sidebar vai trò hiện tại; bỏ `<BrandMark />` lặp trong card `403` | Xác minh SPA + Vitest |
| 19 | `*` (`404` fallback) | Đường dẫn không khớp (`<Navigate to="/login" replace />`) | Đạt (`375/1440px`) | `0` | Điều hướng sạch về `/login` (`0` lỗi JS runtime) | Xác minh SPA + Vitest |

Ghi chú bổ sung về chuyển động có chủ đích của người dùng: khi người dùng chủ động click nút thu gọn sidebar (`280px <-> 72px`) trên `/hr` tại `1440x900`, `PerformanceObserver` ghi nhận `rawAll = 0.0781` với `hadRecentInput: true` trong khung `500ms` (do chính thao tác thu gọn cột trả lại `208px` chiều ngang cho `<main>`), còn chỉ số `CLS` chính thức vẫn bằng **`0`**.

---

## 4. Ghi Nhận Thẳng Thắn Các Điểm Lưu Ý (Caveats)

1. **Thứ bậc heading `<h2>` trên 4 trang con ứng viên (`/candidate/skills`, `/candidate/gap-analysis`, `/candidate/jobs/:jobId`, `/candidate/evaluations`)**: `CandidateJobsPage.tsx` đã bọc tiêu đề `<h1 className="rj-page-title">Việc làm gợi ý</h1>`, còn 4 wrapper còn lại dùng `RoleHomeLayout` (`hideAccountCard`) bọc trực tiếp các component do đồng đội sở hữu vốn dùng `<h2>` làm tiêu đề đầu mục. Để giữ phạm vi chỉnh sửa tối thiểu trên tệp TSX đồng đội, 4 trang này không chèn thêm `<h1>` vào component gốc và được ghi nhận minh bạch tại đây.
2. **Phản hồi `HTTP 404` nghiệp vụ của `GET /api/v1/me/target` trên tài khoản seed `lms-sv-001`**: Tài khoản `candidate1` chưa chọn vị trí mục tiêu nên API `/api/v1/me/target` trả `404`; `CandidateHomePage.tsx` xử lý thành trạng thái `targetState = 'none'` bình thường với `0` `pageerror` và `0` `unhandledrejection`.
3. **Ô nhập text dài trên `/hr/company` và tên công ty giả lập `120` ký tự liền tại `375px`**: Trên `/hr/company` `375px`, giá trị seed sẵn trong `#company-name` (`315px > 283px`) và `#company-address` (`319px > 283px`) cuộn ngang nội bộ bên trong `<input>` (còn mọi placeholder và toàn trang đều `scrollWidth === 375`). Với chuỗi giả lập nhân tạo `120` ký tự không có khoảng trắng trên `/hr`, `.rj-hr-next-content` giữ nguyên `documentElement.scrollWidth === requestedWidth` và `CLS === 0`.
4. **Bảo toàn dữ liệu seed `hr1@rikkeijobs.test`**: Các lượt kiểm thử cuối không submit biểu mẫu đổi mật khẩu cho `hr1` để giữ nguyên `must_change_password = TRUE` trong PostgreSQL phục vụ bộ E2E `26/26`.
5. **Ngoại lệ Rule 09 được Owner phê duyệt (`UIUX-radar`) & Giới hạn chụp `radar-10-reduced-motion.png`**: Việc gỡ nút `"Tạm dừng nền"` / `"Phát nền"` khỏi hero `/login` là sai lệch có chủ đích khỏi điều khoản nút tạm dừng hiển thị của Rule 09 (được Owner phê duyệt và bù đắp bằng tạm dừng qua tương tác, vòng nền 1-shot `<= 5s`, và radar tự dừng sau 3 vòng). Ngoài ra do `webview_browser` chặn `page.emulateMedia`, không có tệp `radar-10-reduced-motion.png`; hành vi `prefers-reduced-motion: reduce` được kiểm chứng qua Vitest fake timers + static CSS.

---

## 5. Bảng Chấm Điểm Rule 09 Anti-AI Rubric (Dựa Trên Bằng Chứng Thực Đo)

| Tiêu chí Rule 09 | Điểm | Bằng chứng định lượng & lý do trung thực |
|---|---:|---|
| **C1. Typography & Vietnamese Diacritics** | `2 / 2` | Font tự lưu trữ `Plus Jakarta Sans` + `Be Vietnam Pro` + `JetBrains Mono` (`font-display: optional`), `line-height >= 1.5`, `tabular-nums`, `0` cắt dấu tiếng Việt trên toàn bộ `88` ảnh chụp thực tế (`m4-*`/`m4b-*`/`m7-*`/`radar-*`). |
| **C2. Layout Asymmetry & Role Density** | `2 / 2` | Lưới `65/35` trên `/login` cân đối từ `375px` tới `1920px` (hết tràn dọc `1280x800` và hết khoảng trống rộng `1600–1920px`), phân tách mật độ Airy (`CANDIDATE`, `MENTOR` `44px`) vs Dense (`HR`, `STAFF`, `ADMIN` `36px` desktop / `44px` drawer), xóa bỏ hàng 3 thẻ đối xứng trên role homes. |
| **C3. Color Palette & Mathematical Contrast** | `2 / 2` | Bảng màu Confident Royal Cobalt & Iron Obsidian giữ nguyên, `compute-contrast.mjs` đạt **`120/120`** cặp (`0` sai lệch, `9` surface invariants, `10` UI border invariants), Check 9 `0` raw color literals, Light & Dark mode đồng nhất. |
| **C4. Curated Iconography & Visual Assets** | `2 / 2` | `100%` biểu tượng qua `<Icon name=... />` (`24x24`, `stroke-width="2"`, `currentColor`), `<BrandMark />` giữ độc quyền màu đỏ thương hiệu, `0` emoji, `0` icon stock ngoài. |
| **C5. Purposeful Motion & Restraint** | `1 / 2` | `[Static CSS / Vitest]` (`14` test fake-timer trong `CompetencyRadarVisual.test.tsx`), `[Chromium PerformanceObserver]` & `[/browser]` chứng minh `CLS === 0`, `rawAll === 0`, ngân sách Rule 09 Showcase Tier (`<= 800ms` entrance, `<= 600ms` route/theme, `.rj-story-ambient` 1-shot `<= 5s`, radar `/login` tự chuyển `4s`/bước dừng sau 3 vòng + giữ `8s` + `Escape` không cướp focus + `aria-live` động, ngoại lệ WCAG 2.2.2 được Owner duyệt), `prefers-reduced-motion` `0` timer & cross-fade `100ms`. **Giữ trung thực `1 / 2`** vì `webview_browser` sandbox chặn `page.emulateMedia` (không chụp được `radar-10-reduced-motion.png`) và chặn `page.evaluate`/`getAnimations()` nội bộ sandbox. |
| **C6. Authentic Copywriting & AI-Tell Avoidance** | `2 / 2` | 100% tiếng Việt có dấu hướng 5 vai trò theo `docs/uiux/CONTENT.md`, xóa toàn bộ `ASVS`/`RBAC`/`TTL`/`JWT`/`Modular Monolith`/`MOD-0*`/`T022DB0` khỏi UX chính, đánh dấu rõ `Sắp ra mắt`, `0` từ cấm. |
| **TỔNG ĐIỂM** | **`11 / 12`** | Đạt chuẩn `>= 11 / 12` của Rule 09 với `0` tiêu chí `0` điểm. |

---

## 6. Chỉ Mục `89` Ảnh Trong `docs/uiux/pr-screenshots/`

Toàn bộ `89` tệp PNG (`15` M4 + `24` M4b + `28` M7 + `21` `UIUX-radar` + `1` ảnh báo lỗi gốc từ Owner) được lưu trong thư mục git-ignored `docs/uiux/pr-screenshots/` và lập chỉ mục đầy đủ từng dòng trong [`docs/uiux/pr-screenshots/ORDER.txt`](pr-screenshots/ORDER.txt):

- **M4 (`15` ảnh)**: `m4-01-login-lms-1440-light.png` đến `m4-15-hr-company-375-dark-tooltip.png` (3 màn hình thí điểm ban đầu, M1a, M1b, custom `Select`, tooltip & mobile drawer `375px`).
- **M4b (`24` ảnh)**: `m4b-seq-login-t000-84ms.png`..`m4b-seq-login-t800-939ms.png` (`5` ảnh chuỗi mở màn `/login`), `m4b-seq-theme-01-525ms-clippath.png`..`04-1436ms.png` (`4` ảnh circular `clip-path` theme transition), `m4b-seq-sidebar-01-455ms.png`..`03-1048ms.png` (`3` ảnh sidebar collapse), và `m4b-01-login-radar-hover-1440-light.png`..`m4b-12-hr-company-375-dark.png` (`12` ảnh trạng thái ổn định Light/Dark/375/768/1440px).
- **M7 (`28` ảnh)**: `m7-01-landing-1440-light.png` đến `m7-28-admin-375-light.png` (toàn bộ các tuyến công khai, xác thực, 5 trang chủ vai trò, 5 trang con ứng viên, `/hr/company`, xác nhận cả 4 lỗi BUG 1–4 đã sửa).
- **UIUX-radar (`21` ảnh)**: `radar-01-seq-step1-t0.png`..`radar-09-3round-autostop-overview.png` (`9` ảnh chuỗi tự chuyển `4s`, 1-shot ambient dừng sau `<= 5s`, hover pause, click giữ `8s` & resume, `Tab`/`Enter`/`Space`/`Escape`, tự dừng sau 3 vòng về overview; không có `radar-10-reduced-motion.png` do sandbox chặn `page.emulateMedia`) và `radar-11-login-1280-light.png`..`radar-22-login-375-dark.png` (`12` ảnh Light/Dark trên `1280/1440/1600/1660/1920/375px`).
- **Tham chiếu lỗi Owner (`1` ảnh)**: `owner-report-login-left-clipped.png` (ảnh chụp crop trái `1662x862` từ màn hình `1920px` trước vòng `UIUX-radar`).
