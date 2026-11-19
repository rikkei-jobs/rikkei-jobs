# Nhật Ký Đo Đạc & Quan Sát Trình Duyệt Thực Tế (`BROWSER_OBSERVATIONS.md` — Round `` `[DN-01-polish2]` ``)

**Dự án**: Rikkei Jobs — Task `T0231B5` (Round `` `[DN-01]` `` / `` `[DN-01-fix]` `` / `` `[DN-01-cloud]` `` / `` `[DN-01-polish]` `` / `` `[DN-01-polish2]` ``)  
**Nguồn sự thật (tách bạch 3 nhóm bằng chứng)**:

1. `` `[/browser]` ``: Số liệu đo trực tiếp `boundingBox()`, `getAttribute()`, `innerText()`, `keyboard.press()`, và ảnh chụp từ Antigravity `/browser` (`a0e8a7ce` trên bundle `index-N261Tiub.css`, cùng `5dbb289a`, `8cebc05c`, `41d81ef1`). Lưu ý kỹ thuật: sandbox `webview_browser` chặn `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, và `page.emulateMedia`, nên mọi số liệu `a0e8a7ce` đều thu bằng Playwright native locators.
2. `` `[Team Lead, own browser]` ``: Gồm hai lượt đo lịch sử vòng `DN-01-polish` của Team Lead (`` `[Team Lead, own browser — pre-D1..D7 fix]` `` từ `D:\GitHub\Rikkei\.agents\MEASUREMENTS_TEAM_LEAD_DN01_POLISH.md` và `` `[Team Lead, own browser — post-M4b re-run]` `` xác minh D1, D2, D3, D7 trước khi `Select` chuyển sang custom WAI-ARIA combobox/listbox ở `DN-01-polish2`).
3. `` `[Static CSS file:line + Vitest]` ``: Giá trị từ mã nguồn CSS/token/TSX thực tế, kết quả Vitest (`28` files / `242` tests, gồm 2 regression test Finding A & B trong `Select.test.tsx`), `compute-contrast.mjs` (`88/88` cặp Light & Dark), và `validate-agent-config.mjs` Check 9 (`0` raw colors).

---

## 1. Thông Số Host Trình Duyệt Verbatim (`BROWSER_HOST_FACTS`)

### 1.1. Baseline #1 (`41d81ef1` — trước khi sửa DN-01-polish) `` `[/browser]` ``

- **Origin**: `http://127.0.0.1:3000`
- **OS**: Windows (`Windows NT 10.0; Win64; x64`, `sec-ch-ua-platform: "Windows"`)
- **User-Agent (verbatim từ HTTP request headers)**:
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.167 Safari/537.36 Antigravity/2.33.0`
- **Viewports**: `1440x900` và `375x812`
- **`devicePixelRatio`**: Không đọc được qua `/browser` (`page.evaluate` / `locator.evaluate` / `$eval` không khả dụng trong `webview_browser`).

### 1.2. Post-Fix #2 (`8cebc05c` — sau tạo `Select`, `color-scheme`, thống nhất chữ tải logo) `` `[/browser]` ``

- **Origin**: `http://127.0.0.1:3000`
- **User-Agent (verbatim từ `networkRequests` document request header)**:
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.167 Safari/537.36 Antigravity/2.33.0`
- **Viewports**: `1440x900` và `375x812`
- **Số ảnh chụp sandbox**: `61` PNGs (bao phủ toàn bộ `13` tuyến, hover/focus-visible/aria-invalid/filled, `/` logged-in, `/candidate/jobs/1`, và tràn ngang `.jobs-grid` ở `375px`).

### 1.3. Post-Fix #3 (`5dbb289a` — sau sửa mũi tên kép `Select`, tab `/login` `375px` 1 dòng, link `Quên mật khẩu?` `24px`, và `setViewportSize` tường minh) `` `[/browser]` ``

- **Origin**: `http://127.0.0.1:3000`
- **User-Agent (verbatim từ `networkRequests` `requestHeaders['user-agent']`)**:
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.167 Safari/537.36 Antigravity/2.33.0`
- **CSS Bundle thực tế (`networkRequests`)**: `http://127.0.0.1:3000/assets/index-BD-_Z-VO.css` (`200 OK`, chụp `20` PNGs) và lượt tái đo hậu-M4b Steps 72–74 `http://127.0.0.1:3000/assets/index-CD2hyvGG.css` (`200 OK`).
- **Viewports**: `1440x900` và `375x812` (`page.setViewportSize(...)` gọi tường minh đầu mỗi bước)
- **Số ảnh chụp sandbox**: `20` PNGs (Select một mũi tên ở Sáng/Tối khi đóng & mở, `/login` `375x812` tab 1 dòng `44px` & `.rj-link` `24px`, `/hr/company` đủ trạng thái, `/candidate/gap-analysis` Sáng/Tối đóng & mở); Steps 72–74 hậu-M4b đo bổ sung `/hr/company` (`.rj-theme-toggle` `134.96 x 44`, `.rj-nav-logout` `137.10 x 44`, `a.cp-back-link` `218.66 x 44`, `select#company-size` `272.54 x 44`, `button.cp-submit-btn` `160 x 44`, `button.cp-logo-drop-zone` `259.73 x 115.1`, `.rj-role-badge` `63.67 x 29.1`), `/candidate/skills` (`.sp-btn` `"Tính lại từ LMS, Exam, PM"` đạt `249.78 x 44` ở `1440x900` và `262.45 x 44` ở `375x812`), và `/candidate/evaluations` (`.ce-btn-quiet` `148.74 x 44`).

### 1.4. Round `DN-01-polish2` (`a0e8a7ce` — R1 `enumLabels.ts` & R2 Custom WAI-ARIA APG `Select`) `` `[/browser]` ``

- **Origin**: `visited_origins: http://127.0.0.1:3000`, `blocked_origins: none`
- **User-Agent (verbatim từ `/browser` host)**:
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.167 Safari/537.36 Antigravity/2.33.0`
- **CSS Bundle thực tế**: `http://127.0.0.1:3000/assets/index-N261Tiub.css`
- **Khả năng sandbox & phương pháp đo**: `webview_browser` chặn `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, và `page.emulateMedia`; toàn bộ số liệu được đo qua Playwright native locators (`boundingBox()`, `getAttribute()`, `innerText()`, `isVisible()`, `isDisabled()`, `keyboard.press()`, `networkRequests()`).
- **Số ảnh chụp mới (`31` PNGs -> tổng `42` PNGs trên đĩa `01-`..`35-`, `37-`..`43-`)**: Thay thế `23` ảnh (`07-`..`29-`, gồm `25-candidate-skills` hậu-M4b) và bổ sung `8` ảnh mới (`35-`, `37-`..`43-` cho mobile Light `375px` flip-up, `/candidate/gap-analysis` `375px` L/D, keyboard-selected, `/staff`, `/mentor`, `/admin`). Ảnh `36-` (trạng thái `disabled` của `Select` khi `isSaving=true`) không tồn tại vì `webview_browser` không giữ chậm request API; hành vi `disabled` được chứng minh qua Vitest + CSS tĩnh.
- **Kết quả đo trực tiếp `V1`–`V3`**:
  - **V1 Vai trò & Trạng thái (`1440x900` Light/Dark)**: `/hr` (`"HR"`, `"Doanh nghiệp (HR)"`, `"Đang hoạt động"`, `hasRawActive: false`); `/candidate` (`"Ứng viên"`, `"Đang hoạt động"`, `hasRawActive: false`, `hasRawCandidate: false`); `/staff` (header `"Nhân viên"`, thẻ `"Cán bộ tuyển sinh"`, bảng `"Nhân viên"` & `"Đang hoạt động"`); `/mentor` (header & bảng `"Mentor"`, thẻ `"Giảng viên / Mentor"`, bảng `"Đang hoạt động"`); `/admin` (`"Quản trị viên"` & `"Đang hoạt động"`); `/hr/company` `` `[data-testid="company-status-badge"]` ``: `"Đang hoạt động"`.
  - **V2 & V3 Custom `Select` `/hr/company` (`#company-size`)**:
    - `1440x900`: `input#company-name` `561.06 x 44`; `button#company-size` (`` `[role="combobox"].rj-select` ``) `272.54 x 44` (khớp `44px`); Closed: `aria-expanded="false"`, `aria-controls=null`, `aria-labelledby="company-size-label"`; Open: `aria-expanded="true"`, `aria-controls="company-size-listbox"`, `aria-activedescendant="company-size-option-3"`; `.rj-select-listbox` `{ x: 557.73, y: 520.9, width: 272.54, height: 229.6 }`; cả 5 `.rj-select-option` cao `44px`, mục đang chọn `"201 - 1.000 nhân viên"` có `aria-selected="true"` và `svgCount: 1` (`<Icon name="check" />`); `ArrowDown`/`Home`/`End`/`ArrowUp`/`Escape` cập nhật `aria-activedescendant` và đóng chuẩn.
    - `375x812` (Light & Dark): `html`/`body` `360 x 2092.7` (`x: 0`, 0 tràn ngang); `button#company-size` `294.4 x 44` (`x: 32.8, y: 642.9`); `.rj-select-listbox` tự lật lên trên (`data-placement="top"`) tại `{ x: 32.8, y: 409.31, width: 294.4, height: 229.6 }` (`x >= 0`, `x + width = 327.2 <= 375`), cả 5 option cao `44px`.
  - **V2 & V3 Custom `Select` `/candidate/gap-analysis` (`#target-position-select`)**:
    - `1440x900`: `button#target-position-select` `256 x 44`; `.rj-select-listbox` `256 x 229.6` (`y: 205.2`); cả 5 option cao `44px`.
    - `375x812` (Light & Dark): `html`/`body` `375.2 x 812` (0 tràn ngang); `button#target-position-select` `197.13 x 44`; `.rj-select-listbox` `{ x: 32.8, y: 386.9, width: 197.12, height: 263.6 }` (`<= 375`); 2 option dài xuống dòng cao `61px`, 3 option còn lại `44px` — tất cả `>= 44px`.
  - **2 Phát hiện thực tế trên Chromium (Finding A & Finding B) đã sửa & có regression test**: (A) Nhấn `Enter`/`Space` trên `<button type="button" role="combobox">` phát synthetic `onClick` sau `onKeyDown` làm double-toggle `isOpen`; (B) React 19 `restoreControlledState` khôi phục `hiddenSelectRef.current.value` về `""` khi `dispatchEvent(new Event('change'))` chạy đồng bộ. Cả hai đã được sửa triệt để ở `Select.tsx` kèm 2 regression test trong `Select.test.tsx`.

### 1.5. Team Lead Measurement Runs (`pre-D1..D7 fix` & `post-M4b re-run`, lịch sử `DN-01-polish`) `` `[Team Lead, own browser]` ``

- **Origin**: `http://127.0.0.1:3000`
- **Phạm vi**: `13 / 13` tuyến x `2` theme (`light`, `dark`) x `2` viewport (`1440x900`, `375x812`), định dạng `height | radius | border | font-size | weight | family`.
- **Phương pháp**: Điều hướng SPA bằng `history.pushState` + `popstate` (giữ JWT trong RAM, không reload); chuyển theme bằng `document.documentElement.setAttribute('data-theme', 'light' | 'dark')`; tắt transition ở lượt đo màu (`*{transition:none!important}`) để tránh nhiễu cửa sổ nền và đọc `transitionDuration` riêng ở lượt `auto`.
- **Lượt xác minh hậu-M4b (`[Team Lead, own browser — post-M4b re-run]`)**: Xác nhận D1, D2, D3 đã được khắc phục hoàn toàn — mọi `<button>` và `<a class="rj-btn">` trên các tuyến HR, login, forgot/reset/change-password và candidate đều trả về `Be Vietnam Pro`, `15px` (`14px` trên `.rj-tab-btn` ở `375px`), weight `600` (`700` active tab), `border-radius: 6px`, `transition: 0.15s`; `.ce-btn` và `.sp-btn` khớp 1:1 thông số `.rj-btn` với viền phụ `rgb(111,128,148)` (Light) / `rgb(51,70,92)` (Dark).

### 1.6. Ghi Chú Bối Cảnh DN-01-cloud Trước Đó (Pass A & B) `` `[/browser]` ``

- Trong Round DN-01-cloud, phiên `/browser` qua Parent ghi nhận `BROWSER_HOST_FACTS`: `step 26, step 101, step 137, step 156`, `visited_origins: http://localhost:3000`, `blocked_origins: none`, đã kiểm chứng tải `valid-logo.png`/`valid-logo.jpg`, ép `POST /mock/cloudinary/fail-next` (`502 LOGO_STORAGE_UNAVAILABLE`) + bấm `"Thử lại"` (`200 OK`) và hiển thị `<img src={logoUrl} referrerPolicy="no-referrer">` trực tiếp từ CDN/mock (`naturalWidth > 0`).
- **Quyết định loại bỏ dữ liệu cũ**: Endpoint `GET /api/v1/companies/me/logo` (`blob:`) và ảnh cũ `06-company-profile-conflict-409-1440px-light.png` đã được gỡ bỏ khỏi tài liệu; ảnh PR hiện tại trong `docs/dn01/pr-screenshots/` gồm **`42` PNG sạch** (`01-`..`35-`, `37-`..`43-`: `31` PNG mới từ `a0e8a7ce` + `11` PNG giữ nguyên từ `8cebc05c`/`5dbb289a`; không có `36-`) khớp `1:1` với `docs/dn01/pr-screenshots/ORDER.txt`.

---

## 2. Đối Chiếu Lỗi U1–U3 & Phát Hiện Mới D1–D7

### 2.1. U1–U3: Baseline (`41d81ef1`) vs Post-Fix (`8cebc05c` & `5dbb289a`) `` `[/browser]` ``

| Hạng mục | Thực đo Baseline (`41d81ef1`) `` `[/browser]` `` | Thực đo Post-Fix (`8cebc05c` / `5dbb289a`) `` `[/browser]` `` | Trạng thái & Bằng chứng |
|---|---|---|---|
| **U1. Select `/hr/company` (`#company-size`) & `/candidate/gap-analysis` (`#target-position-select`)** | Hai `<select>` dùng lớp riêng (`.cp-select`, `.gap-select`) + `.candidate-select` thừa; `appearance: auto`; **popup mở trong Dark Mode có nền trắng, chữ đen** (`41d81ef1` `step_20_shot_4`, `step_26_shot_6`). | Ở `DN-01-polish` (`5dbb289a`): hợp nhất `<Select>` với `color-scheme`. Ở `DN-01-polish2` (`a0e8a7ce`): thay thế hoàn toàn popup gốc hệ điều hành bằng **custom WAI-ARIA APG combobox/listbox** (`` `<button role="combobox" class="rj-select">` `` + Portal `` `<ul role="listbox" class="rj-select-listbox">` `` + `<Icon name="check" />` + `>= 44px` option height + flip-up `` `[data-placement="top"]` `` ở `375px` + sửa Finding A/B); `#company-size` `272.54 x 44px` (`1440`) / `294.40 x 44px` (`375`), `#target-position-select` `256 x 44px` (`1440`) / `197.13 x 44px` (`375`), danh sách DOM mở đồng nhất Light & Dark theo token (`>= 4.5:1`). | **Đã sửa & xác minh** (`09-`..`22-`, `26-`..`29-`, `35-`, `37-`..`39-`, `88/88` `compute-contrast.mjs`, `22/22` `Select.test.tsx`). |
| **U2. Chữ trạng thái tải logo trên `/hr/company`** | Panel hiển thị hai câu khác nhau trong cùng một khung (`"Đang lưu logo..."` vs `"Đang tải logo..."`). | `CompanyLogoPanel.tsx:175,218` thống nhất một cụm từ duy nhất `"Đang tải lên logo..."` cho cả huy hiệu khung ảnh và nút kéo-thả. | **Đã sửa & xác minh** (`CompanyProfilePage.test.tsx:890` khẳng định `getAllByText('Đang tải lên logo...')` có độ dài `2`). |
| **U3. Đồng nhất chiều cao & trạng thái trên các màn hình sở hữu / dùng chung** | `/` (`1440`/`375`): `.rj-btn-primary` `49.6px` / `73.6px`, `.refresh-btn` `33.6px`; `/login` `375x812`: `.rj-tab-btn` `150 x 51.2px` (rớt 2 dòng); `/login` `.rj-link` `19.6px`; `/forgot-password` & `/reset-password` `.rj-link` `21px`. | `8cebc05c` + `5dbb289a`: `/` `1440` `.rj-btn-primary` `444.18 x 44px`, `.refresh-btn` `110.66 x 44px` (`1440` & `375`); `/login` `375x812`: `#tab-lms` & `#tab-enterprise` `150 x 44px` (**1 dòng**); `/login` `.rj-link` `112.99 x 24px`; `/forgot-password` & `/reset-password` `.rj-link` `156.44 x 24px`. | **Đã sửa & xác minh** (`01-`..`06-`, `33-`). |

### 2.2. RESULT 1–3 & D1–D7 Từ Team Lead (`MEASUREMENTS_TEAM_LEAD_DN01_POLISH.md`) & Khắc Phục M4b

- **RESULT 1 (Nhất quán — giữ nguyên)** `` `[Team Lead, own browser — pre-D1..D7 fix]` ``:
  - `.rj-input` trên mọi màn hình (`/login`, `/forgot-password`, `/reset-password/*`, `/change-password`, `/hr/company`): Light `44 / 6px / 0.8px rgb(111,128,148) / 15px / 400 / Be Vietnam Pro / bg rgb(248,250,253)`; Dark `44 / 6px / 0.8px rgb(51,70,92) / 15px / 400 / Be Vietnam Pro / bg rgb(13,20,32)`.
  - `textarea` (`/hr/company`): `130.1 / 6px / cùng border / 15px / 400 / Be Vietnam Pro`.
  - `.rj-select` (`#company-size` & `#target-position-select`, lịch sử `DN-01-polish` trước khi thay sang custom WAI-ARIA listbox): đồng nhất `100%` với `.rj-input` (`44 / 6px / 0.8px / 15px / 400 / Be Vietnam Pro`), `transition: 0.15s ease-out` trên `border-color, box-shadow, background-color`, `aria-invalid` (`border rgb(241,112,122)`, halo `3px`), `:root` `color-scheme` `light`/`dark`. (Ở `DN-01-polish2`, popup native `option` đã được thay bằng custom Portal `.rj-select-listbox` token-only.)
- **RESULT 3 (3 mục KHÔNG phải lỗi — không chỉnh sửa)** `` `[Team Lead, own browser]` ``:
  1. **Dark inputs đúng chuẩn** (`bg rgb(13,20,32)`, `text rgb(237,242,247)` ở cả `data-theme='dark'` lẫn OS-dark `auto`). Kết quả `"white input"` ở lần chạy đầu là nhiễu do cửa sổ trình duyệt chạy nền không bước tiến CSS transition.
  2. **Viewport `375px` sạch tràn ngang trên `10/12` tuyến** (`/login`, `/forgot-password`, `/reset-password/*`, `/change-password`, `/hr`, `/hr/company`, `/candidate`, `/candidate/gap-analysis`, `/candidate/evaluations`, `/candidate/jobs/1`: `innerWidth = 375`, `scrollWidth = 375`). Hai tuyến tràn ngang thực tế là `/` đã đăng nhập (`409px`, PR `#6`) và `/candidate/skills` (`411px`, `HS-01`) — xem D4, D5.
  3. **Focus halo**: Cả `input` và `select` đều hiện viền `1.6px solid rgb(80,140,238)` khi focus; halo `3px` chạy animation `150ms` nên cửa sổ nền có thể đọc giữa chừng (`select` đo `2.28px`). Cần kiểm tra halo và `:focus-visible` bằng ảnh chụp (`10-`, `16-`) thay vì chỉ nhìn `boxShadow` giữa animation.
- **RESULT 2 (`D1`–`D7` — thực đo & xử lý ở M4b)**:

| Mã | Hiện tượng thực đo `` `[Team Lead, own browser — pre-D1..D7 fix]` `` | Phạm vi & Cách xử lý ở M4b `` `[Static CSS file:line + Vitest]` `` | Trạng thái xác minh hậu-M4b |
|---|---|---|---|
| **D1** | `<button>` thiếu `font: inherit` nên render **Arial** trên `/login`, `/forgot-password`, `/reset-password/*`, `/change-password`, `/hr`, `/hr/company`, `/candidate*`, `/candidate/jobs/1`; riêng `a.rj-btn` trên `/` dùng `Be Vietnam Pro`; `.cp-logo-drop-zone` `13.3333px / 400`; `.rj-input-toggle` `44 / 4px / 13.3333px / 400 / Arial / padding 1px 6px`. | `frontend/src/index.css:21-23` thêm `button { font: inherit; }`; `identity.css` thêm `font-family: var(--rj-font-body)` cho `.rj-btn`, `.rj-tab-btn`, `.rj-input-toggle`, `.rj-ticket-chip`; `.rj-input-toggle` (`identity.css:661-682`) đặt `border-radius: var(--rj-radius-md)` (`6px`), `padding: 0`, `0.9375rem / 600`, `transition: 150ms ease-out`; `.rj-ticket-chip` (`identity.css:1084-1101`) đặt `radius 6px` + `transition 150ms`; `companyProfile.css:333-336` đặt `font-size: 0.9375rem; font-weight: 600;` cho `.cp-logo-drop-zone`. | **Đã sửa & xác minh** `` `[Team Lead, own browser — post-M4b re-run]` ``: mọi `<button>` và `<a class="rj-btn">` trên HR, login, forgot/reset/change-password và candidate đều trả `Be Vietnam Pro`, `15px` (`14px` `.rj-tab-btn` ở `375px`), weight `600` (`700` active tab), `border-radius: 6px`, `transition: 0.15s`. |
| **D2** | Nút header (`.rj-theme-toggle`, `.rj-nav-logout`) là `14px` (`0.875rem`) trong khi nút nội dung `.rj-btn` là `15px` (`0.9375rem`). | `identity.css:1161-1166`: gỡ `font-size: 0.875rem;` khỏi `.rj-theme-toggle, .rj-nav-logout` để mọi `.rj-btn` (header + content) thống nhất `15px / 600 / 44px / 6px / 150ms`. | **Đã sửa & xác minh** `` `[Team Lead, own browser — post-M4b re-run]` `` & `` `[/browser 5dbb289a Steps 72–74]` ``: `.rj-theme-toggle` `134.96 x 44`, `.rj-nav-logout` `137.10 x 44`, `15px / 600 / Be Vietnam Pro / 6px / 0.15s`. |
| **D3** | 4 hệ nút ở Candidate: `rj-btn` (`44 / 6px / 15px 600 / border rgb(111,128,148)`), `ce-btn` (`44 / 6px / 14px 600 / border rgb(186,202,217)`), `sp-btn` (`68.8` ở `1440`, `44` ở `375`, `16px 600`), `sp-skill-head` (`16px 400 / radius 0`). | Diff CSS tối thiểu (giữ nguyên TSX/HTML, công khai ở `PR_DESCRIPTION.md`): `candidateEvaluations.css:169-211` & `skillProfile.css:313-348` căn `.ce-btn`/`.sp-btn` về `min-height: var(--rj-density-button-height)` (`44px`), `padding: 8px 16px`, `radius: 6px`, `font-family: var(--rj-font-body)`, `0.9375rem` (`15px`) / `600`, `transition: 150ms`, `:focus-visible` `2px solid var(--rj-color-focus-ring)`, và `.ce-btn-quiet`/`.sp-btn-quiet` dùng `--rj-color-surface-card` + `--rj-color-border-interactive` (`rgb(111,128,148)` Light / `rgb(51,70,92)` Dark). `.sp-skill-head` giữ nguyên là accordion row `56px / radius 0`. | **Đã sửa & xác minh** `` `[Team Lead, own browser — post-M4b re-run]` `` & `` `[/browser 5dbb289a Steps 72–74]` ``: `.ce-btn` và `.sp-btn` khớp `.rj-btn` (`15px / 600 / Be Vietnam Pro / 6px / 0.15s`, viền phụ `rgb(111,128,148)` Light / `rgb(51,70,92)` Dark); `.sp-btn` đạt **`249.78 x 44`** ở `1440x900` & **`262.45 x 44`** ở `375x812` (1 dòng `44px` trên cả hai); `.ce-btn-quiet` `148.74 x 44`. |
| **D4** | `/` (`HomeSkeleton` + `jobRecommendations.css` từ `PR #6`): `-apple-system`, `.job-card` (`10px`), `.apply-button` (`38.6px` Arial `14px` border trắng), `.refresh-button` (`36px` `8px` `14.4px` Arial), `.details-button` (`38.6px` `-apple-system`); tại `requestedWidth = 375` layout viewport phình **`409px`** (`scrollWidth / innerWidth > requestedWidth`), `rj-btn` cao `62.6px`. | **Chỉ báo cáo, KHÔNG sửa** (mã nguồn teammate `PR #6`, giữ nguyên `.app-container` và `jobRecommendations.css`; riêng `a.rj-btn` trên `/` được thừa hưởng `font-family: var(--rj-font-body)` từ `.rj-btn`). | Giữ nguyên (out-of-scope teammate; tràn ngang `409px` so với `requestedWidth = 375`). |
| **D5** | `/candidate/skills` tại `requestedWidth = 375` (`HS-01`): layout viewport phình thành **`411px`** (tràn ngang khi kiểm tra theo `requestedWidth = 375`, không phải `window.innerWidth`). Sửa lại ghi chú sai `"0 overflow"` trước đây thành danh sách trung thực `10/12` tuyến sạch vs `2` tuyến tràn (`409px` tại `/` `PR #6`, `411px` tại `/candidate/skills` `HS-01`). | **Chỉ báo cáo, KHÔNG sửa** (`HS-01` `skillProfile.css` mobile layout); cập nhật snippet Mục 7.2 so với **`requestedWidth`** (`375`) thay vì `window.innerWidth` để không bao giờ che lỗi phình layout viewport. | Giữ nguyên tràn ngang `411px` tại `requestedWidth = 375` (out-of-scope `HS-01`); riêng `.sp-btn` đã đạt `44px` 1 dòng ở cả `1440x900` (`249.78 x 44`) & `375x812` (`262.45 x 44`) sau M4b. |
| **D6** | `.rj-auth-card` (`12px` / `32px 24px`) vs `.cp-main-card`/`.cp-aside-card` (`8px` / `20px`), `.ce-card` (`8px`), `.job-card` (`10px`). | Chuẩn hóa thành 2 tier có chủ đích trong `docs/design/DESIGN_SYSTEM.md` Mục 13.2: **HR Dense workspace** (`8px / 20px` cho `.cp-main-card`, `.cp-aside-card` & dense `.ce-card` `8px / 20px`, `.sp-card` `8px / 16px 20px`) vs **Auth / Candidate Airy focal** (`12px / 24–32px`: `.rj-auth-card` `12px / 32px 24px`, `.gap-section` `12px / 24px`, `.jd-card` `12px / 24px`); `.job-card` (`10px`) thuộc `PR #6`. | **Đã chuẩn hóa kiến trúc** (`DESIGN_SYSTEM.md` Mục 13.2 — phân tầng có chủ đích). |
| **D7** | Phân biệt `.ce-tag` (`4px`, `13px / 600`) vs `.rj-role-badge` (`9999px`, `13px / 700`) và kiểm tra tương phản 5 màu role badge Light Mode. | (1) Ghi rõ taxonomy ở `DESIGN_SYSTEM.md` Mục 13.3: **Pill Badges** (`9999px / 700`) vs **Inline Tags** (`4px / 600`); (2) Phát hiện 4/5 role badge Light Mode dưới `4.5:1` (`design-tokens.css:297-315`) -> cập nhật `--rj-color-role-candidate-text: #0369a1` (`4.98:1`), `--rj-color-role-mentor-text: #7e22ce` (`5.71:1`), `--rj-color-role-staff-text: #92400e` (`6.00:1`), `--rj-color-role-admin-text: #be123c` (`5.12:1`), giữ HR `#047857` (`4.63:1`). | **Đã sửa & xác minh** (`[/browser 5dbb289a Steps 72–74]` `.rj-role-badge` `63.67 x 29.1`; Light Mode tokens đạt `4.63:1 – 6.00:1`). |

---

## 3. Bảng Đo Đạc Theo Từng Loại Điều Khiển (13 Tuyến HR & CANDIDATE, `1440x900` & `375x812`, Light & Dark)

Quy ước gắn nhãn nguồn (tách bạch 3 nguồn):

- `` `[/browser]` ``: Số liệu đo trực tiếp `boundingBox()`, `getAttribute()`, `innerText()` và ảnh chụp từ `a0e8a7ce` (`index-N261Tiub.css`), `5dbb289a` (`index-CD2hyvGG.css`), và `8cebc05c`.
- `` `[Team Lead, own browser]` ``: Số liệu `getComputedStyle` từ `D:\GitHub\Rikkei\.agents\MEASUREMENTS_TEAM_LEAD_DN01_POLISH.md` (`[Team Lead, own browser — pre-D1..D7 fix]`) và xác minh hậu-M4b (`[Team Lead, own browser — post-M4b re-run]`) ở vòng `DN-01-polish`.
- `` `[Static CSS file:line + Vitest]` ``: Giá trị từ mã nguồn CSS/token/TSX thực tế + kiểm thử tự động (`28` files / `242` tests, `88/88` contrast).

### 3.1. Select (`.rj-select` — Custom WAI-ARIA APG Combobox / Listbox trong `Select.tsx`)

| Tuyến & ID | `1440x900` (`w x h`) `` `[/browser]` `` | `375x812` (`w x h`) `` `[/browser]` `` | Light / Dark & Listbox `` `[/browser]` `` | Metrics Tĩnh `` `[Static CSS file:line + Vitest]` `` | Computed Lịch Sử `DN-01-polish` `` `[Team Lead, own browser — pre-D1..D7 fix]` `` |
|---|---|---|---|---|---|
| `/hr/company` (`#company-size`) | Trigger `` `[role="combobox"]` ``: `272.54 x 44`; Listbox `` `[role="listbox"]` ``: `272.54 x 229.6`; 5 options x `44px` (`a0e8a7ce`) | Trigger: `294.40 x 44`; Listbox flip-up (`` `[data-placement="top"]` ``): `294.40 x 229.6` tại `y: 409.31` (`<= 375`, 0 tràn ngang); 5 options x `44px` (`a0e8a7ce`) | Light & Dark: **custom DOM `.rj-select-listbox`** qua Portal, icon `<Icon name="check" />` (`svgCount: 1`) ở mục chọn, `aria-expanded`, `aria-controls`, `aria-activedescendant` đúng chuẩn (`09-`..`22-`, `35-`, `37-`) | Trigger `min-height: 44px`, `radius: 6px`, `0.9375rem / 400`, `150ms ease-out`, `:focus` `3px` halo, `:focus-visible` `2px` outline, panel token `--rj-color-select-*` đạt `>= 4.5:1` (`88/88` contrast), `>= 44px` option height, Finding A/B fixes + `color-scheme` toàn cục giữ cho input gốc (`Select.css:12-303`, `design-tokens.css:352-377,503-528`); `Select.test.tsx` `22/22` | *(Mốc `DN-01-polish` trước R2 custom listbox)*: Light `44 / 6px / 0.8px rgb(111,128,148) / 15px / 400 / Be Vietnam Pro`; Dark `44 / 6px / 0.8px rgb(51,70,92) / 15px / 400 / Be Vietnam Pro / bg rgb(13,20,32)`. Nay trigger giữ nguyên hình học và danh sách chuyển sang custom DOM `.rj-select-listbox`. |
| `/candidate/gap-analysis` (`#target-position-select`) | Trigger: `256.00 x 44`; Listbox: `256.00 x 229.6`; 5 options x `44px` (`a0e8a7ce`) | Trigger: `197.13 x 44`; Listbox: `197.12 x 263.6` (`x: 32.8`, `<= 375`); 2 option dài `61px` + 3 option `44px` (`a0e8a7ce`) | Light & Dark: custom DOM `.rj-select-listbox` mở chuẩn ở cả `1440` & `375` (`26-`..`29-`, `38-`, `39-`) | Dùng chung `<Select>` (`GapAnalysisSection.tsx:112-126`, `gapAnalysis.css:48-50`); `GapAnalysisSection.test.tsx` `5/5` | Đồng nhất 100% với `#company-size` trên cả Light & Dark, `1440` & `375`. |

### 3.2. Text / URL / Email / Password Inputs (`.rj-input`)

| Tuyến & ID | `1440x900` (`w x h`) `` `[/browser]` `` | `375x812` (`w x h`) `` `[/browser]` `` | Light / Dark `` `[/browser]` `` | Metrics Tĩnh `` `[Static CSS file:line + Vitest]` `` | Computed Thực Đo `` `[Team Lead, own browser — pre-D1..D7 fix]` `` |
|---|---|---|---|---|---|
| `/login` LMS (`#sso-ticket`) | `390.4 x 44` (`8cebc05c`) | `309.6 x 44` (`8cebc05c`) | Light (Dark qua `data-theme`) | `.rj-input.has-left-icon` (`identity.css:604-658`); `LoginPage.test.tsx` `2/2` | Light: `44 / 6px / 0.8px rgb(111,128,148) / 15px / 400 / Be Vietnam Pro / bg rgb(248,250,253)`. Dark: `44 / 6px / 0.8px rgb(51,70,92) / 15px / 400 / Be Vietnam Pro / bg rgb(13,20,32)` (`0.15s ease-out`). |
| `/login` Enterprise (`#enterprise-email`, `#enterprise-password`) | `390.4 x 44` (`8cebc05c`) | `309.6 x 44` (`8cebc05c`) | Light (Dark qua `data-theme`) | `.rj-input.has-left-icon` / `.has-right-icon` (`identity.css:604-658`); `EnterpriseLoginForm.test.tsx` `3/3` | Đồng nhất 100% với `.rj-input` ở cả Light & Dark (`RESULT 1`). |
| `/forgot-password` (`#forgot-email`) | `390.4 x 44` (`8cebc05c`) | `309.6 x 44` (`8cebc05c`) | Light (Dark qua `data-theme`) | `.rj-input.has-left-icon` (`identity.css:604-658`); `ForgotPasswordPage.test.tsx` `1/1` | Đồng nhất 100% với `.rj-input` ở cả Light & Dark (`RESULT 1`). |
| `/reset-password/test-token` (`#reset-token`, `#reset-new-password`, `#reset-confirm-password`) | `390.4 x 44` (`8cebc05c`) | `294.4 x 44` (`8cebc05c`) | Light (Dark qua `data-theme`) | `.rj-input` (`identity.css:604-658`), `#reset-token` thêm `.rj-tabular-nums`; `ResetPasswordPage.test.tsx` `1/1` | Đồng nhất 100% với `.rj-input` ở cả Light & Dark (`RESULT 1`). |
| `/change-password` (`#current-password`, `#new-password`, `#confirm-password`) | `390.4 x 44` (`8cebc05c`) | `294.4 x 44` (`8cebc05c`) | Light (Dark qua `data-theme`) | `.rj-input.has-left-icon.has-right-icon` (`identity.css:604-658`); `ChangePasswordPage.test.tsx` `2/2` | Đồng nhất 100% với `.rj-input` ở cả Light & Dark (`RESULT 1`). |
| `/hr/company` (`#company-name`, `#company-website`, `#company-industry`, `#company-address`, `#company-city`) | `561.06 x 44` (`name`, `website`); `272.52–272.54 x 44` (`industry`, `address`, `city`) (`8cebc05c`) | `294.4 x 44` cả 5 ô (`8cebc05c`) | Light & Dark (`09-`..`22-`) | `.rj-input` (`identity.css:604-658`), khớp 100% `.rj-select`; `CompanyProfilePage.test.tsx` `25/25` | Đồng nhất 100% với `.rj-input` ở cả Light & Dark; Dark `auto` confirmed `bg rgb(13,20,32)` / `text rgb(237,242,247)` (`RESULT 1`, `RESULT 3`). |
| `/hr`, `/candidate`, `/candidate/skills`, `/candidate/gap-analysis`, `/candidate/evaluations`, `/candidate/jobs/1`, `/` | Không có `<input type="text">` | Không có | — | Xác nhận từ TSX tương ứng | — |

### 3.3. Textarea (`.rj-input.cp-textarea`)

| Tuyến & ID | `1440x900` (`w x h`) `` `[/browser]` `` | `375x812` (`w x h`) `` `[/browser]` `` | Light / Dark `` `[/browser]` `` | Metrics Tĩnh `` `[Static CSS file:line + Vitest]` `` | Computed Thực Đo `` `[Team Lead, own browser — pre-D1..D7 fix]` `` |
|---|---|---|---|---|---|
| `/hr/company` (`#company-description`) | `561.06 x 130.1` (`8cebc05c`) | `294.4 x 130.1` (`8cebc05c`) | Light & Dark (`09-`..`22-`) | `.rj-input` + `.cp-textarea` (`companyProfile.css:106-112`), `spellCheck={false}`; `CompanyProfileAccessibility.test.tsx` `8/8` | **Light & Dark**: `130.1 / 6px / cùng border (0.8px rgb(111,128,148) L, rgb(51,70,92) D) / 15px / 400 / Be Vietnam Pro` (`RESULT 1`). |
| 12 tuyến còn lại | Không có `<textarea>` | Không có | — | Xác nhận từ TSX tương ứng | — |

### 3.4. Buttons (Primary / Secondary / Ghost / Quiet / Refresh / Input Toggle)

| Tuyến & Control | `1440x900` (`w x h`) `` `[/browser]` `` | `375x812` (`w x h`) `` `[/browser]` `` | Metrics Tĩnh Hậu-M4b `` `[Static CSS file:line + Vitest]` `` | Computed Thực Đo `` `[Team Lead, own browser — pre-D1..D7 fix]` `` vs `` `[Team Lead, own browser — post-M4b re-run]` `` |
|---|---|---|---|---|
| `/` (public) `.refresh-btn` (`Kiểm tra lại`) | `110.66 x 44` (`8cebc05c`) | `110.66 x 44` (`8cebc05c`) | `App.css:124-142`: `44px`, `6px`, `15px / 600`, `150ms`; kế thừa `-apple-system` từ `.app-container` (`D4` ngoài DN-01). | Pre-fix: `-apple-system` (`D4`, code `App.css` không đổi font `.app-container`). |
| `/` (public) `a.rj-btn.rj-btn-primary` (CTA đăng nhập) | `444.18 x 44` (`8cebc05c`) | `312 x 62.6` (nhãn dài rớt dòng) (`8cebc05c`) | `identity.css:755-795`: M4b thêm `font-family: var(--rj-font-body)` để thắng `-apple-system` của `.app-container`. | Pre-fix: `44 / 6px / 15px / 600 / Be Vietnam Pro` ở `1440`; `62.6` ở `375` (`D4`). **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` ``: `Be Vietnam Pro`, `15px`, `600`, `6px`, `0.15s`. |
| `/` (logged-in) `.refresh-button`, `.apply-button`, `.details-button` | `114.66 x 36`, `398.99 x 38.6`, `90.61 x 38.6` (`8cebc05c`) | `114.66 x 36`, `217.79 x 38.6`, `90.61 x 38.6` (`8cebc05c`) | **Giữ nguyên (mã nguồn teammate `PR #6`)**: `jobRecommendations.css:42-55,313-348`. | Pre-fix (`D4`): `apply-button` `38.6` `Arial` `14px` border trắng; `refresh-button` `36` `radius 8px` `14.4px` `Arial`; `details-button` `38.6` `-apple-system`. **Không sửa (out-of-scope teammate)**. |
| `/login`, `/forgot-password`, `/reset-password/*`, `/change-password` submit `.rj-btn`, `.rj-btn-ghost`, `.rj-input-toggle` | Submit/Ghost: `390.4 x 44`; Toggle mắt: `44 x 44` (`8cebc05c`) | Submit/Ghost: `294.4–309.6 x 44`; Toggle mắt: `44 x 44` (`8cebc05c`) | M4b sửa: `index.css:21-23` `button { font: inherit; }`; `identity.css:661-682` (`.rj-input-toggle` `44x44`, `6px`, `padding: 0`, `Be Vietnam Pro`, `15px / 600`, `150ms`); `identity.css:768` (`.rj-btn` `Be Vietnam Pro`). | Pre-fix (`D1`): `.rj-btn` & `.rj-btn-ghost` render **Arial**; `.rj-input-toggle` `44 / 4px / 0 border / 13.3333px / 400 / Arial / padding 1px 6px`. **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` ``: mọi `<button>` trả `Be Vietnam Pro`, `15px`, `600`, `6px`, `0.15s`. |
| `/hr` `.rj-theme-toggle`, `.rj-nav-logout`, `Đổi Mật Khẩu`, `Hồ sơ công ty` | `126.04–159.3 x 44` (`8cebc05c`) | `118.04–159.3 x 44` (`8cebc05c`) | M4b sửa: `button { font: inherit; }`, `.rj-btn` `Be Vietnam Pro`, gỡ `font-size: 0.875rem` ở `.rj-theme-toggle, .rj-nav-logout` (`identity.css:1161-1166`). | Pre-fix (`D1`, `D2`): header `44 / 6px / 14px / 600 / Arial`; content `44 / 6px / 15px / 600 / Arial`. **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` ``: toàn bộ `.rj-btn` đạt `44 / 6px / 15px / 600 / Be Vietnam Pro / 0.15s`. |
| `/hr/company` `.rj-theme-toggle`, `.rj-nav-logout`, `a.cp-back-link`, `.cp-submit-btn` | `134.96 x 44`, `137.10 x 44`, `218.66 x 44`, `160 x 44` (`5dbb289a Steps 72–74`) | `118.04–133.61 x 44`, `118.84 x 44`, `218.66 x 44`, `294.4 x 44` (`8cebc05c`) | M4b thống nhất toàn bộ `.rj-btn` về `Be Vietnam Pro`, `15px`, `600`, `6px`, `150ms`. | Pre-fix (`D1`, `D2`): header `14px / Arial`; `a.rj-btn` `15px / Be Vietnam Pro`; `"Lưu thay đổi"` `15px / Arial`. **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` ``: toàn bộ đạt `Be Vietnam Pro`, `15px`, `600`, `6px`, `0.15s`. |
| `/candidate` `.rj-theme-toggle`, `.rj-nav-logout`, `.rj-btn-secondary`, `.rj-btn-primary` | `126.04–237.6 x 44` (`8cebc05c`) | `118.04–237.6 x 44` (`8cebc05c`) | M4b sửa: `button { font: inherit; }`, `.rj-btn` `Be Vietnam Pro`, gỡ `14px` override ở header. | Pre-fix (`D1`, `D2`): header `14px / Arial`, content `.rj-btn` `15px / Arial`. **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` ``: toàn bộ đạt `Be Vietnam Pro`, `15px`, `600`, `6px`, `0.15s`. |
| `/candidate/skills` `.sp-btn`, `.sp-skill-head`, `.ce-btn-quiet` | `.sp-btn`: **`249.78 x 44`** (`5dbb289a Steps 72–74`; ảnh `25-` cập nhật hậu-M4b từ `a0e8a7ce`, pre-M4b `68.8`); `.sp-skill-head`: `597.33 x 60.8–86.4`; `.ce-btn-quiet`: `142.8 x 44` (`8cebc05c`) | `.sp-btn`: **`262.45 x 44`** (`5dbb289a Steps 72–74`); `.sp-skill-head`: `328 x 101.6–218.4`; `.ce-btn-quiet`: `294.4 x 44` (`8cebc05c`) | M4b diff tối thiểu (`skillProfile.css:313-348`, `candidateEvaluations.css:169-211`): `.sp-btn` & `.ce-btn` `15px / 600 / 6px / Be Vietnam Pro / 150ms`, `.ce-btn-quiet`/`.sp-btn-quiet` border `--rj-color-border-interactive`; giữ `.sp-skill-head` accordion `56px / radius 0`. | Pre-fix (`D3`): `.ce-btn` `44 / 6px / 14px 600 / Be Vietnam Pro / border rgb(186,202,217)`; `.sp-btn` `68.8 (1440) / 44 (375) / 16px 600 / filled`; `.sp-skill-head` `16px / 400 / radius 0`. **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` ``: `.ce-btn` & `.sp-btn` khớp `.rj-btn` (`15px / 600 / Be Vietnam Pro / 6px / 0.15s`, viền phụ `rgb(111,128,148)` Light / `rgb(51,70,92)` Dark) và `.sp-btn` nằm gọn `44px` 1 dòng trên cả `1440x900` lẫn `375x812`. |
| `/candidate/gap-analysis`, `/candidate/evaluations`, `/candidate/jobs/1` `.rj-btn`, `.ce-btn-quiet` | `.ce-btn-quiet`: **`148.74 x 44`** (`5dbb289a Steps 72–74`); `.rj-btn`: `126.04–229.49 x 44` (`8cebc05c`) | `118.04–309.6 x 44` (`8cebc05c`) | M4b căn `.ce-btn-quiet` khớp `.rj-btn-secondary` (`15px / 600 / Be Vietnam Pro / border rgb(111,128,148)` Light / `rgb(51,70,92)` Dark). | Pre-fix (`D1`, `D3`): header/`.rj-btn` `Arial`; `.ce-btn` `14px / border rgb(186,202,217)`. **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` ``: khớp `.rj-btn` (`Be Vietnam Pro`, `15px`, `600`, `6px`, `0.15s`, viền `rgb(111,128,148)` Light / `rgb(51,70,92)` Dark). |

### 3.5. Tabs (`.rj-tab-btn`, `.app-nav-btn`)

| Tuyến & Selector | `1440x900` (`w x h`) `` `[/browser]` `` | `375x812` (`w x h`) `` `[/browser]` `` | Ghi chú & Nguồn tĩnh `` `[Static CSS file:line + Vitest]` `` | Computed Thực Đo `` `[Team Lead, own browser — pre-D1..D7 fix]` `` vs `` `[Team Lead, own browser — post-M4b re-run]` `` |
|---|---|---|---|---|
| `/` `.app-nav-btn` (`Tổng quan`, `Hồ sơ năng lực`) | `110.43 x 44`, `141.56 x 44` (`8cebc05c`) | `110.43 x 44`, `141.56 x 44` (`8cebc05c`) | `App.css:277-287`: `min-height: 44px`, `border-bottom: 3px solid transparent` (kế thừa `.app-container` `-apple-system`, D4 ngoài DN-01). | Pre-fix (`D4`): `-apple-system`, `44px`, `border-bottom 3px`. |
| `/login` `#tab-lms`, `#tab-enterprise` (`.rj-tab-btn`) | `190.4 x 44` (`8cebc05c`) | `150.00 x 44.00` (`5dbb289a`) | M4b (`identity.css:514-541`): thêm `font-family: var(--rj-font-body);` (`15px` desktop; `14px` ở `<=480px` để giữ 1 dòng `44px` tại `375px` — variant tài liệu hóa ở `DESIGN_SYSTEM.md` Mục 13.1). | Pre-fix (`D1`): `44 / 6px / 15px 700/600 / Arial` (ở `375px` `14px`). **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` ``: `Be Vietnam Pro`, `15px` desktop (`14px` ở `375px`), weight `600` (`700` active tab), `6px`, `0.15s`. |

### 3.6. Links (`.rj-link`, `.cp-back-link`, `.jd-back`, `.details-button`)

| Tuyến & Selector | `1440x900` (`w x h`) `` `[/browser]` `` | `375x812` (`w x h`) `` `[/browser]` `` | Ghi chú >= 24px & Nguồn tĩnh `` `[Static CSS file:line + Vitest]` `` | Computed Thực Đo `` `[Team Lead, own browser — pre-D1..D7 fix]` `` |
|---|---|---|---|---|
| `/login` `.rj-link` (`Quên mật khẩu?`) | `112.99 x 24.00` (`5dbb289a`) | `112.99 x 24.00` (`5dbb289a`) | `identity.css:743-749`: `min-height: 24px; display: inline-flex; align-items: center`, ảnh `03-`. | `Be Vietnam Pro`, đạt `>= 24px` (`0` bất thường trong RESULT 2). |
| `/forgot-password` & `/reset-password/test-token` `.rj-link` (`Quay lại Đăng nhập`) | `156.44 x 24` (`8cebc05c`) | `156.44 x 24` (`8cebc05c`) | `identity.css:743-749`, ảnh `04-`, `05-`. | `Be Vietnam Pro`, đạt `>= 24px`. |
| `/hr/company` `a.cp-back-link` (`Quay lại trang chủ HR`) | `218.66 x 44` (`8cebc05c`) | `218.66 x 44` (`8cebc05c`) | `.rj-btn.rj-btn-secondary.cp-back-link` (`44px`, `companyProfile.css:18-20`). | Pre-fix (`D1` đối chiếu): `44 / 6px / 15px / 600 / Be Vietnam Pro`. |
| `/candidate/jobs/1` `a.jd-back` (`Quay lại trang ứng viên`) | `205.25 x 24` (`8cebc05c`) | `205.25 x 24` (`8cebc05c`) | `gapAnalysis.css:187-195` (`24px`, mã nguồn `DT-01` giữ nguyên). | `Be Vietnam Pro`, `24px`. |
| `/` (logged-in) `.details-button` (`Chi tiết JD`) | `90.61 x 38.6` (`8cebc05c`) | `90.61 x 38.6` (`right=388 > 375`) (`8cebc05c`) | Mã nguồn teammate `PR #6` (`jobRecommendations.css:330-348`). | Pre-fix (`D4`): `38.6px`, `-apple-system`, tràn ngang ở `375px` (`409px`). |

### 3.7. Logo Drop Zone & File Control (`/hr/company`)

| Control | `1440x900` (`w x h`) `` `[/browser]` `` | `375x812` (`w x h`) `` `[/browser]` `` | Light / Dark & Nguồn tĩnh `` `[Static CSS file:line + Vitest]` `` | Computed Thực Đo `` `[Team Lead, own browser — pre-D1..D7 fix]` `` vs `` `[Team Lead, own browser — post-M4b re-run]` `` |
|---|---|---|---|---|
| `.cp-logo-drop-zone` (`button[type="button"]`) | `259.73 x 115.1` (`5dbb289a Steps 72–74`) | `294.4 x 115.1` (`8cebc05c`) | `companyProfile.css:322-429`: `min-height: 76px`, `radius: 6px`, M4b thêm `font-size: 0.9375rem; font-weight: 600;`; `isDisabled() === true` khi upload (`8cebc05c`, `CompanyProfileAccessibility.test.tsx:412-415`). | Pre-fix (`D1`): `115.1 / 6px / 13.3333px / 400 / Be Vietnam Pro`. **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` ``: `Be Vietnam Pro`, `15px`, `600`, `6px`, `0.15s`. |
| `#company-logo-input` (`input[type="file"].rj-sr-only`) | Ẩn trợ năng (`tabIndex=-1`) | Ẩn trợ năng (`tabIndex=-1`) | `CompanyLogoPanel.tsx:184-195`, `accept="image/png,image/jpeg,.png,.jpg,.jpeg"`. | — |
| `.cp-logo-frame` (khung preview CDN) | `196px` cao cố định (`09-`..`20-`) | `196px` cao cố định (`21-`, `22-`) | `height: 196px` (`CLS = 0`), `radius: 6px`, `transition: 250ms` (`companyProfile.css:133-205`). | Không phải control tương tác; `CLS = 0` giữ nguyên. |

### 3.8. Alerts / Badges / Cards / Tables (13 Tuyến)

| Loại & Tuyến | Quan sát thực đo `` `[/browser]` `` | Nguồn tĩnh & Kiểm chứng `` `[Static CSS file:line + Vitest]` `` | Computed Thực Đo `` `[Team Lead, own browser — pre-D1..D7 fix]` `` vs `` `[Team Lead, own browser — post-M4b re-run]` `` |
|---|---|---|---|
| **Alerts** (`/change-password`, `/hr/company`) | `.rj-alert-warning` (`390.4 x 88.6` / `294.4 x 109.6` tại `41d81ef1`); `.rj-alert-success` (`14-`, `20-`, `22-`); `.rj-field-error` (`13-`, `19-`). | `identity.css:841-875` (`radius: 6px`, `0.875rem`), `companyProfile.css:435-448`. | Đạt chuẩn `radius 6px`, token màu `>= 4.5:1`. |
| **Badges & R1 Enum Localization** (`/hr`, `/hr/company`, `/candidate`, `/staff`, `/mentor`, `/admin`, `/candidate/evaluations`, `/`) | `a0e8a7ce` xác nhận 100% nhãn R1 tiếng Việt (và giữ `HR`/`Mentor` theo quyết định người dùng): `/hr` (`"HR"`, `"Doanh nghiệp (HR)"`, `"Đang hoạt động"`, `hasRawActive: false`); `/candidate` (`"Ứng viên"`, `"Đang hoạt động"`, `hasRawActive: false`, `hasRawCandidate: false`); `/staff` (`"Nhân viên"`, `"Cán bộ tuyển sinh"`, `"Đang hoạt động"`); `/mentor` (`"Mentor"`, `"Giảng viên / Mentor"`, `"Đang hoạt động"`); `/admin` (`"Quản trị viên"`, `"Đang hoạt động"`); `/hr/company` `` `[data-testid="company-status-badge"]` ``: `"Đang hoạt động"` (`07-`, `08-`, `23-`, `24-`, `40-`..`43-`). | `enumLabels.ts` + `RoleHomeLayout.tsx` (bỏ `text-transform: uppercase` trên `.rj-role-badge`) + `CompanyStatusBadge.tsx` + `enumLabels.test.ts` (`14/14`) + `RoleHomes.test.tsx` (`32/32`) + `CompanyStatusBadge.test.tsx` (`3/3`). `D7` phân tách Pill Badges (`9999px / 700`) vs Inline Tags (`4px / 600`) và 5 màu role badge Light Mode đạt `CR 4.63:1 – 6.00:1`. | Pre-fix (`D7`): 4/5 Light role badges `< 4.5:1`. **Hậu-M4b** `` `[Team Lead, own browser — post-M4b re-run]` `` & `` `[Static CSS file:line + Vitest]` ``: Light Mode role badges đạt `4.63:1 – 6.00:1` (`>= 4.5:1`) và R1 `DN-01-polish2` Việt hóa sạch mọi enum thô/`"N/A"` trên giao diện. |
| **Cards** (Auth, `/hr/company`, `/candidate/*`, `/`) | `.cp-main-card`/`.cp-aside-card` toàn chiều rộng lưới (`09-`..`22-`); `/` `375px` `.job-card` (`360px`) tràn ngang (`34-`). | `D6` chuẩn hóa 2 tier có chủ đích trong `DESIGN_SYSTEM.md` Mục 13.2: **HR Dense workspace** (`8px / 20px`: `.cp-main-card`, `.cp-aside-card`; plus dense `.ce-card` `8px / 20px`, `.sp-card` `8px / 16px 20px`) vs **Auth / Candidate Airy focal** (`12px / 24–32px`: `.rj-auth-card` `12px / 32px 24px`, `.gap-section` `12px / 24px`, `.jd-card` `12px / 24px`). | Pre-fix (`D6`): `.rj-auth-card` `12px / 32px 24px`, `/hr/company` & `.ce-card` `8px / 20px`, `.job-card` `10px` (`PR #6`). Phân tầng có chủ đích. |
| **Tables & Mobile Viewport Overflow** (`/hr`, `/candidate`, `/candidate/gap-analysis`, `/candidate/skills`, `/`) | `/hr` `.rj-density-dense` (`878.4 x 234.9` / `294.4 x 394.8`); `/candidate` `.rj-density-airy` (`878.4 x 345.9` / `294.4 x 373.8`); `/candidate/gap-analysis` `.gap-table` (`560px`) cuộn nội bộ trong `.gap-table-wrap`. | `identity.css:1214-1251`, `gapAnalysis.css:78-113`; `AuthRedesignM4.test.tsx:122-146`. | **RESULT 3 & D4/D5**: Kiểm tra tràn ngang so với `requestedWidth = 375` (không so với `window.innerWidth`) sạch trên `10/12` tuyến (`/login`, `/forgot-password`, `/reset-password/*`, `/change-password`, `/hr`, `/hr/company`, `/candidate`, `/candidate/gap-analysis`, `/candidate/evaluations`, `/candidate/jobs/1`); **2 tuyến tràn ngang**: `/` đã đăng nhập (`409px`, `PR #6` `D4`) và `/candidate/skills` (`411px`, `HS-01` `D5`). |

---

## 4. Khác Biệt Đã Xử Lý, Khác Biệt Giữ Nguyên (Teammate) & Thiết Kế Chủ Đích

1. **Tất cả bất đồng bộ trong mã nguồn DN-01 & shared styles đã được sửa sạch**:
   - **R1 Nhãn Vai trò & Trạng thái dùng chung (`enumLabels.ts`)**: Chuẩn hóa `HR` -> `"HR"`, `MENTOR` -> `"Mentor"`, `CANDIDATE` -> `"Ứng viên"`, `STAFF` -> `"Nhân viên"`, `ADMIN` -> `"Quản trị viên"`, `ACTIVE` -> `"Đang hoạt động"`, `LOCKED` -> `"Đã khóa"`, `MUST_CHANGE_PASSWORD` -> `"Yêu cầu đổi mật khẩu"`, fallback `"Không xác định"` (thay thế hoàn toàn mã enum thô và `"N/A"` trên giao diện, đồng thời giữ nguyên enum nội bộ ở logic, `data-testid` và API); bỏ `text-transform: uppercase` trên `.rj-role-badge` (`identity.css`).
   - **R2 Custom Accessible `Select` (`Select.tsx`, `Select.css`)**: Thay thế popup native OS bằng custom WAI-ARIA APG combobox/listbox (`` `<button role="combobox">` `` + Portal `` `<ul role="listbox">` `` + `` `<li role="option">` `` `>= 44px` với `<Icon name="check" />`, flip-up `` `[data-placement="top"]` `` ở `375px`, token-only `88/88` contrast Light & Dark, chuyển động `opacity`/`transform` `150ms` kèm `@media (prefers-reduced-motion: reduce)` `0.001ms` / `100ms`), gỡ bỏ các rule native popup chết (`select option`, `optgroup`, `appearance: none`, `::-ms-expand`, `::picker-icon`) trong khi giữ nguyên khai báo `color-scheme` toàn cục cho input/textarea/scrollbar; khắc phục thêm 2 lỗi thực tế Chromium phát hiện bởi `a0e8a7ce`: **Finding A** (`suppressNextKeyboardClickRef` triệt tiêu synthetic `click` sau `Enter`/`Space` trong `50ms`, reset khi `mousedown`) và **Finding B** (`useLayoutEffect` đồng bộ `hiddenSelectRef.current.value = currentValue` chống lệch React 19 `restoreControlledState`) kèm 2 regression test (`Select.test.tsx` `22/22`).
   - Chữ tải logo thống nhất `"Đang tải lên logo..."` (`CompanyLogoPanel.tsx:175,218`).
   - `.refresh-btn` trên `/` (`App.css:124`) nâng từ `33.6px` -> `44px`; `.rj-tab-btn` trên `/login` `375px` giữ 1 dòng `44px`; `.rj-link` nâng từ `19.6–21px` -> `24px`.
   - **Sửa gốc M4b (`D1`–`D3`, `D6`, `D7`)**: `button { font: inherit; }` trong `index.css:21-23`; `font-family: var(--rj-font-body)` trên `.rj-btn`, `.rj-tab-btn`, `.rj-input-toggle`, `.rj-ticket-chip`, `.ce-btn`, `.sp-btn`; gỡ `font-size: 0.875rem` khỏi `.rj-theme-toggle, .rj-nav-logout`; chuẩn hóa `.rj-input-toggle` (`6px`, `padding: 0`, `15px / 600`, `150ms`) và `.cp-logo-drop-zone` (`15px / 600`); căn `.ce-btn`/`.sp-btn` & `.ce-btn-quiet`/`.sp-btn-quiet` (`--rj-color-border-interactive` `rgb(111,128,148)` Light / `rgb(51,70,92)` Dark); nâng `4` màu chữ role badge Light Mode trong `design-tokens.css` đạt `CR >= 4.5:1` (`4.63:1 – 6.00:1`); bổ sung Mục 12 (`Select` + `useLayoutEffect`/keyboard click suppression) & Mục 13 song ngữ vào `docs/design/DESIGN_SYSTEM.md`.
2. **Bất đồng bộ thuộc mã nguồn teammate (KHÔNG sửa, ghi nhận trung thực)**:
   - **D4 (`/` logged-in & `HomeSkeleton`, `PR #6`)**: `.app-container` đặt `-apple-system`; `.job-card` (`10px`), `.apply-button` (`38.6px`, Arial `14px`, border trắng), `.refresh-button` (`36px`, `8px`, `14.4px`, Arial), `.details-button` (`38.6px`, `-apple-system`); tại `requestedWidth = 375`, `.jobs-grid` (`minmax(360px, 1fr)`) làm layout viewport phình lên **`409px`** (`34-home-loggedin-mobile-overflow-375px-light.png`).
   - **D5 (`/candidate/skills`, `HS-01`)**: Tại `requestedWidth = 375`, layout viewport phình thành **`411px`** (tràn ngang so với `requestedWidth = 375`, không dựa vào `innerWidth`); riêng `.sp-btn` (`"Tính lại từ LMS, Exam, PM"`) sau M4b (`25-candidate-skills-1440px-light.png` đã được `a0e8a7ce` chụp mới hậu-M4b) giữ gọn **1 dòng `44px`** trên cả `1440x900` (`249.78 x 44`) lẫn `375x812` (`262.45 x 44`).
   - `/candidate/jobs/1` (`DT-01`, `gapAnalysis.css:187-195`): `.jd-back` cao `24px` (đạt chuẩn `>= 24px`, khác kiểu button-link `44px` `.cp-back-link`).
   - `/candidate/skills`, `/candidate/gap-analysis`, `/candidate/evaluations` thiếu liên kết quay lại `/candidate` trong giao diện.
3. **Quyết định thiết kế có chủ đích & giới hạn môi trường đo (không che giấu)**:
   - `#company-size` trên `/hr/company` là trường tùy chọn (`companyValidation.ts:151-154`, `UpdateCompanyRequest.java:30-35`).
   - `disabled={isSaving}` trên form `/hr/company` hoàn tất nhanh trên Docker cục bộ nên ảnh `36-` không tồn tại trên đĩa; trạng thái `disabled` của `Select` và form inputs được chứng minh trực tiếp bằng Vitest (`Select.test.tsx`, `CompanyProfilePage.test.tsx:239`) và CSS tĩnh (`.rj-select:disabled`), còn `.cp-logo-drop-zone` `disabled={isUploadingLogo}` được quan sát `true` trực tiếp trong `/browser` (`8cebc05c`) lẫn Vitest (`CompanyProfilePage.test.tsx:889`).
   - Dark inputs hoàn toàn đúng (`RESULT 3`); `10/12` tuyến đạt `375px` không tràn ngang; focus outline `1.6px solid rgb(80,140,238)` + `3px` halo `150ms` transition xác minh bằng ảnh chụp (`10-`, `16-`).

---

## 5. Trạng Thái Tương Tác `/hr/company`, Thứ Tự Tab, Phím Tắt, Target `>= 24px` & Giảm Chuyển Động

### 5.1. Đầy đủ 6 Trạng Thái Tương Tác trên `/hr/company` `` `[/browser]` ``

- **`default` (closed)**: `09-company-profile-closed-1440px-light.png` (Light), `15-company-profile-closed-1440px-dark.png` (Dark), `21-company-profile-mobile-closed-375px-dark.png` (`375px` Dark).
- **`hover`**: `11-company-profile-hover-1440px-light.png` (Light), `17-company-profile-hover-1440px-dark.png` (Dark); nút lưu & drop-zone hover đã kiểm ở `8cebc05c`.
- **`focus-visible`**: `10-company-profile-focus-visible-1440px-light.png` (Light), `16-company-profile-focus-visible-1440px-dark.png` (Dark) — viền xanh `2px` (`--rj-color-focus-ring`) + `outline-offset: 2px`.
- **`disabled`**: `.cp-logo-drop-zone` xác thực `isDisabled() === true` khi upload (`8cebc05c`, `CompanyProfilePage.test.tsx:889`); form inputs + `.cp-submit-btn` + custom `Select` xác thực `toBeDisabled()` khi `isSaving=true` (`Select.test.tsx`, `CompanyProfilePage.test.tsx:239`); CSS `.rj-input:disabled` & `.rj-select:disabled` (`opacity: 0.72`, `cursor: not-allowed`). Ảnh `36-` không tồn tại vì `webview_browser` không làm chậm request API.
- **`aria-invalid` + thông báo lỗi**: `13-company-profile-invalid-1440px-light.png` (Light), `19-company-profile-invalid-1440px-dark.png` (Dark) — xóa trống `#company-name` và bấm Lưu tự động focus `#company-name`, đặt `aria-invalid="true"`, `aria-describedby="company-name-error"`, hiển thị `"Vui lòng nhập tên công ty."`.
- **`filled` / saved & keyboard-selected**: `14-company-profile-filled-1440px-light.png` (Light), `20-company-profile-filled-1440px-dark.png` (Dark), `35-company-profile-select-keyboard-selected-1440px-light.png` (chọn qua bàn phím `ArrowDown`/`Enter`); `12-`, `18-`, `22-`, `37-`, `27-`, `29-`, `38-`, `39-` chứng minh danh sách DOM `.rj-select-listbox` đang mở ở Light/Dark và `1440`/`375`.

### 5.2. Thứ Tự `Tab` Thực Đo trên `/hr/company` (`8cebc05c` + `a0e8a7ce` R2) `` `[/browser]` ``

1. `button.rj-theme-toggle` (`"Chế độ tối"` / `"Chế độ sáng"`)
2. `button.rj-nav-logout` (`"Đăng Xuất"`)
3. `a.cp-back-link` (`"Quay lại trang chủ HR"`)
4. `input#company-name`
5. `input#company-industry`
6. `` `button#company-size[role="combobox"]` `` (ẩn `<select class="rj-select-native-hidden" tabIndex={-1}>` nằm ngoài luồng `Tab`)
7. `input#company-website`
8. `input#company-address`
9. `input#company-city`
10. `textarea#company-description`
11. `button.cp-submit-btn` (`"Lưu thay đổi"`)
12. `button.cp-logo-drop-zone` (`` `[data-testid="company-logo-drop-zone"]` ``)

*(Hidden `<input id="company-logo-input" tabIndex={-1}>` và hidden `<select class="rj-select-native-hidden" tabIndex={-1}>` đều không nằm trong luồng Tab — `CompanyProfileAccessibility.test.tsx:418`, `Select.test.tsx:38`.)*

### 5.3. Điều Hướng Bàn Phím `Select`, Target `>= 24px` & `prefers-reduced-motion`

- **Phím tắt `Select` (`#company-size`, `a0e8a7ce` + Vitest `Select.test.tsx` `22/22`)**: Đầy đủ WAI-ARIA APG (`Enter`/`Space`/`ArrowDown`/`ArrowUp` mở; `ArrowDown`/`ArrowUp` di chuyển bỏ qua `` `[aria-disabled="true"]` ``; `Home`/`End` nhảy đầu/cuối; gõ tiền tố `~500ms` hỗ trợ tiếng Việt NFD + `đ`; `Enter`/`Space` chọn và đóng kèm focus lại trigger; `Escape` hủy và khôi phục giá trị cũ; `Tab` đóng; `mousedown` ngoài đóng). Trong `a0e8a7ce`, `ArrowDown` -> `"company-size-option-3"`, `Home` -> `"company-size-option-0"`, `End` -> `"company-size-option-4"`, `ArrowUp` -> `"company-size-option-3"`, `Escape` -> `aria-expanded="false"`, ảnh `35-` xác nhận chọn qua bàn phím. Hai lỗi trình duyệt thực tế được phát hiện trong `a0e8a7ce` (Finding A: synthetic `click` sau `Enter`/`Space`; Finding B: React 19 `restoreControlledState` làm lệch `.value` của `<select>` ẩn) đã được sửa ở `Select.tsx` kèm 2 regression test trong `Select.test.tsx`.
- **Target tối thiểu `>= 24px` (WCAG 2.5.8)**: Trên `/hr/company`, mọi điều khiển và mọi option `.rj-select-option` đều `>= 44px` chiều cao (`44px` trên `/hr/company`; `44px`–`61px` trên `/candidate/gap-analysis` `375px`); trên các tuyến DN-01 khác, `.rj-link` là `24px`, mọi input/select/tab/button đều `>= 44px`.
- **`prefers-reduced-motion`**: Chưa đo được runtime `page.emulateMedia({ reducedMotion: 'reduce' })` vì sandbox `webview_browser` chặn `page.emulateMedia` và `page.evaluate` (vì vậy điểm `C5` giữ trung thực ở **`1 / 2`**). Kiểm chứng quy tắc tĩnh `0.001ms !important` / `100ms` tại `design-tokens.css:617-631`, `Select.css:281-303`, `companyProfile.css:615-646`, `identity.css:1313-1331`, `candidateEvaluations.css:562-574`, `skillProfile.css:447-452`.

---

## 6. Bảng Đánh Giá Bằng Chứng Thực Đo (`Rule 09` — C1..C6)

*(Điểm trước khi sửa tính từ `MEASUREMENTS_TEAM_LEAD_DN01_POLISH.md`; điểm cuối cùng chốt trung thực ở **`11 / 12`** dựa trên `a0e8a7ce` `/browser` (`index-N261Tiub.css`), `compute-contrast.mjs` (`88/88`), Vitest (`28/242`), `Team Lead post-M4b re-run`, và giới hạn `webview_browser` cho `C5`.)*

| Tiêu chí | Điểm Pre-D1..D7 | Điểm Cuối (`DN-01-polish2`) | Bằng chứng định lượng xác minh (`a0e8a7ce`, `88/88` contrast, `28/242` Vitest & `post-M4b re-run`) |
|---|---|---|---|
| **C1. Typography & Hierarchy** | `1 / 2` | **`2 / 2`** | `` `[Team Lead, own browser — post-M4b re-run]` `` xác nhận D1 & D2 đã sửa sạch (`Be Vietnam Pro`, `15px` / `14px` `.rj-tab-btn` ở `375px`, weight `600`/`700`, `radius 6px`); `a0e8a7ce` xác nhận trigger custom `Select` (`button.rj-select`) khớp `44px` với `.rj-input`, danh sách option rõ ràng, và 5 vai trò hiển thị tiếng Việt chuẩn (`HR`, `Mentor`, `Ứng viên`, `Nhân viên`, `Quản trị viên`). |
| **C2. Spacing, Layout & Density** | `2 / 2` | **`2 / 2`** | Lưới 65/35 (`/hr/company`), Dense `38px` (`/hr`) vs Airy `56px` (`/candidate`), phân tầng thẻ `8px / 20px` vs `12px / 24-32px` (`D6`), custom listbox flip-up `` `[data-placement="top"]` `` tại `375x812` (`/hr/company` `width: 294.4`, `x + width = 327.2 <= 375`; `/candidate/gap-analysis` `x + width = 229.92 <= 375`), `>= 44px` option height (`44px` / `61px`), `0` tràn ngang trên `10/12` tuyến; `.sp-btn` `249.78 x 44` (`1440`) & `262.45 x 44` (`375`, ảnh `25-` cập nhật ở `a0e8a7ce`); `D4` (`409px`) & `D5` (`411px`) công khai minh bạch. |
| **C3. Color Palette & Contrast** | `1 / 2` | **`2 / 2`** | Check 9 (`0` raw colors), `compute-contrast.mjs` (**`88/88` PASS** Light & Dark gồm toàn bộ token `Select` panel/option/selected/hover/placeholder), 5/5 role badges Light Mode đạt `4.63:1 – 6.00:1` (`D7`), custom DOM `.rj-select-listbox` Light/Dark đồng nhất qua token (`12-`, `18-`, `22-`, `27-`, `29-`, `37-`..`39-`), và `color-scheme` toàn cục giữ cho input gốc. |
| **C4. Iconography & Visual Assets** | `2 / 2` | **`2 / 2`** | `100%` `<Icon />` (`24x24`, `stroke-width="2"`, `aria-hidden="true"`, gồm `chevron-down` và `check` trong `Select`), `0` emoji (`validate-agent-config.mjs` Check 3 PASS), CDN logo `referrerPolicy="no-referrer"`. |
| **C5. Purposeful Motion & Restraint** | `1 / 2` | **`1 / 2`** | `` `[Team Lead, own browser — post-M4b re-run]` `` và CSS tĩnh xác nhận `150ms` compositor-only `opacity`/`transform` trên `.rj-select-listbox`, `150ms ease-out` trên `.rj-btn`/`.rj-input`/`.rj-select`, và `CLS = 0` (`196px`), **nhưng** giữ trung thực ở **`1 / 2`** vì sandbox `webview_browser` chặn `page.emulateMedia` và `page.evaluate` nên runtime `prefers-reduced-motion: reduce` chưa thể đo trực tiếp trong trình duyệt. |
| **C6. Authentic Copywriting & AI-Tell Avoidance** | `2 / 2` | **`2 / 2`** | `0` Lorem ipsum / emoji; 100% nhãn vai trò & trạng thái chuẩn hóa qua `enumLabels.ts` (không còn mã enum thô hay `"N/A"`); thống nhất `"Đang tải lên logo..."`; công khai minh bạch `36-` không tồn tại, Finding A/B, `D4` (`409px`), `D5` (`411px`), và giới hạn `webview_browser`. |
| **TỔNG ĐIỂM** | **`9 / 12`** | **`11 / 12`** | **Đạt ngưỡng PASS (`>= 11 / 12`, không tiêu chí nào `0`)** — chấm từ bằng chứng thực tế `DN-01-polish2` (`a0e8a7ce`, `88/88` contrast, `28/242` Vitest, `42` PNGs, `post-M4b re-run`). |

---

## 7. Measurement Script (Chạy Đọc Thuần Túy Trên Stack Sống — Môi Trường Chromium Không Bị Sandbox Chặn `page.evaluate`)

> **Lưu ý khả năng thực thi**: Đoạn script bên dưới sử dụng `page.evaluate`, `getComputedStyle`, `window.matchMedia`, và `page.emulateMedia({ reducedMotion: 'reduce' })` — **chỉ chạy trên Chromium mở / Team Lead browser**. Môi trường `webview_browser` của Antigravity `/browser` sandbox chặn `page.evaluate`, `locator.evaluate`, `$eval`, `$$eval`, `waitForFunction`, và `page.emulateMedia`, nên trong `DN-01-polish2` các thông số hình học và ARIA được đo bằng Playwright native locators (`boundingBox()`, `getAttribute()`, `innerText()`).

### 7.1. Ma Trận Khóa Cứng (`13` Tuyến x `2` Theme x `2` Viewport = `52` Điểm Đo + `/staff`, `/mentor`, `/admin`) & Ghi Chú Tái Lập (Team Lead)

1. **Điều hướng SPA giữ JWT trong RAM**: Sử dụng `history.pushState` + `dispatchEvent(new PopStateEvent('popstate'))` (hoặc click điều hướng nội bộ) trên `http://127.0.0.1:3000` để không làm mất access token trong bộ nhớ giữa `13` tuyến (`/`, `/login` tab LMS & Enterprise, `/forgot-password`, `/reset-password/test-token`, `/change-password` với `hr1`, `/hr`, `/hr/company` với `hr2`, `/candidate`, `/candidate/skills`, `/candidate/gap-analysis`, `/candidate/evaluations`, `/` với `candidate1`, `/candidate/jobs/1`) và 3 trang vai trò (`/staff`, `/mentor`, `/admin`).
2. **Chuyển theme & tách 2 lượt đo transition**:
   - **Lượt đo màu (Color Pass)**: Gắn `document.documentElement.setAttribute('data-theme', 'light' | 'dark')` kèm stylesheet tạm `*{transition:none!important}` vì trình duyệt chạy nền không bước tiến CSS transition (tránh nhiễu đọc màu nền cũ khi chuyển theme).
   - **Lượt đo `transitionDuration` (`auto` Pass)**: Gỡ `*{transition:none!important}` và bỏ `data-theme` (`auto`) để đọc `getComputedStyle(el).transitionDuration` thực tế; kiểm tra thêm `prefers-reduced-motion: reduce` qua `emulateMedia({ reducedMotion: 'reduce' })` trên `/hr/company` và `/candidate/gap-analysis`.
3. **Viewports**: `1440x900` và `375x812` (`deviceScaleFactor: 1`). Khi gọi snippet ở viewport mobile, truyền chiều rộng yêu cầu (`requestedWidth = 375` hoặc `1440`) qua tham số hàm hoặc `window.__REQUESTED_WIDTH` để phát hiện tình trạng layout viewport tự phình (`window.innerWidth > requestedWidth`, như `409px` trên `/` và `411px` trên `/candidate/skills`).

### 7.2. JavaScript Snippet Đọc Thuần Túy (Cập Nhật Selector Custom `Select` R2 & `requestedWidth`)

```javascript
((requestedWidth = window.__REQUESTED_WIDTH || window.innerWidth) => {
  const rootStyle = getComputedStyle(document.documentElement);
  const selectors = [
    ['select', '[role="combobox"].rj-select'],
    ['selectListbox', '[role="listbox"].rj-select-listbox'],
    ['selectOption', '[role="option"].rj-select-option'],
    ['input', 'input:not([type="hidden"]):not([type="file"])'],
    ['textarea', 'textarea'],
    ['button', 'button:not(.rj-select), a.rj-btn, a.details-button, a.cp-back-link'],
    ['tab', '[role="tab"], .app-nav-btn'],
    ['link', 'a.rj-link, a.jd-back'],
    ['alert', '.rj-alert, .rj-field-error'],
    ['badge', '.rj-role-badge, .cp-status-badge, .ce-tag, .sp-tag, .score-badge, .skill-pill'],
    ['card', '.rj-auth-card, .cp-main-card, .cp-aside-card, .job-card, .ce-card, .sp-card'],
    ['table', 'table']
  ];

  const controls = {};
  for (const [group, sel] of selectors) {
    controls[group] = Array.from(document.querySelectorAll(sel))
      .filter((el) => el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0)
      .map((el) => {
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          role: el.getAttribute('role') || null,
          placement: el.getAttribute('data-placement') || null,
          className: typeof el.className === 'string' ? el.className : null,
          width: Number(rect.width.toFixed(2)),
          height: Number(rect.height.toFixed(2)),
          left: Number(rect.left.toFixed(2)),
          right: Number(rect.right.toFixed(2)),
          withinViewportWidth: rect.left >= 0 && rect.right <= requestedWidth + 1,
          overflowX: rect.right > requestedWidth + 1,
          borderRadius: cs.borderRadius,
          borderWidth: cs.borderWidth,
          borderColor: cs.borderColor,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily,
          padding: cs.padding,
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          transitionDuration: cs.transitionDuration,
          animationDuration: cs.animationDuration,
          focusOutline: cs.outline,
          focusBoxShadow: cs.boxShadow,
          colorScheme: cs.colorScheme
        };
      });
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reducedMotionMetrics = {
    matches: reducedMotionQuery,
    triggerTransitionDuration: controls.select?.[0]?.transitionDuration ?? null,
    listboxAnimationDuration: controls.selectListbox?.[0]?.animationDuration ?? null,
    listboxTransform: document.querySelector('[role="listbox"].rj-select-listbox')
      ? getComputedStyle(document.querySelector('[role="listbox"].rj-select-listbox')).transform
      : null
  };

  return {
    route: location.pathname + location.search,
    theme: document.documentElement.getAttribute('data-theme') || 'auto',
    requestedWidth,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    devicePixelRatio: window.devicePixelRatio,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    layoutViewportExpanded: window.innerWidth > requestedWidth,
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > requestedWidth || window.innerWidth > requestedWidth,
    reducedMotion: reducedMotionQuery,
    reducedMotionMetrics,
    colorScheme: rootStyle.colorScheme,
    controls
  };
})();
```
