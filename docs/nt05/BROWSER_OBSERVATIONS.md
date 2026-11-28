# `[NT-05]` Live Browser Verification Observations (`T022C02`)

**Task Code**: `T022C02` (`NT-05` — External Data Sync & Confirmed HS-01 Fixes `H1`, `H2`, `H3`)
**Status**: **PASS** — Verified via Antigravity `/browser` on a fresh Docker Compose stack at `http://localhost:3000` (`5/5` containers healthy, zero script injection per Base Rules R2, timestamp `2026-11-26T21:41:14Z`).
**Global Telemetry**: `0` console errors; `0` unexpected HTTP `>= 400` responses (only intentional `503` with mock stopped, `504` with backend stopped, and `404` during target role tests).

---

## 1. `/staff/data-sync` (`staff1@rikkeijobs.test`, Hoàng Thu Hà)

- **Navigation & Initial State**:
  - Sidebar menu `"Đồng bộ dữ liệu"` (`href="/staff/data-sync"`) navigated via SPA to `http://localhost:3000/staff/data-sync`.
  - Initial runs summary: `"Tổng cộng 0 lần chạy"` (`"Chưa có lần chạy đồng bộ nào được ghi nhận."`).
- **Debounced Candidate Search (`0` crash, `0` HTTP `500`)**:
  - Query `"khongtontai999"` -> `GET /api/v1/staff/sync/candidates?q=khongtontai999&page=1&size=20` returned `200 OK` -> rendered `"Không tìm thấy ứng viên phù hợp."`.
  - Query `"%_"` -> `GET /api/v1/staff/sync/candidates?q=%25_&page=1&size=20` returned `200 OK` -> rendered `"Không tìm thấy ứng viên phù hợp."` (SQL LIKE wildcards escaped).
  - Input `"a".repeat(120)` -> input length capped at `100` chars, `200 OK`, zero crash.
  - Query `"candidate1"` -> selected `Nguyễn Văn An` (`candidate1@rikkeijobs.test`, `LMS: lms-sv-001`) -> loaded `8 bản ghi` (`EX-JAVA-2026-10`, `SPRING01`, `SQL01`, `JAVA01` current `8.5`/`85`, `GIT01`, `WEB01`, `JAVA01` previous `6`/`60`, `PM IOC-JB-2026-09` `8.5`/`85`). All `8` `"Sửa tay"` buttons were enabled on fresh seed (no `#h` PM row in V4 seed).
- **First Sync & Runs Table Filters**:
  - Clicked `"Đồng bộ lại"` -> `POST /api/v1/staff/sync/1` returned `200 OK`; success banner displayed `"Đã đồng bộ dữ liệu cho ứng viên Nguyễn Văn An."`.
  - Runs table (`"Tổng cộng 1 lần chạy"`): `04:14:14 27/11/2026` | `Thủ công` | `<svg check> Thành công` | `Nguyễn Văn An` | `7 bản ghi / LMS 5 / Bài thi 1 / PM 1` | `—`.
  - Status filter (`Thành công` = `1` row, `Thất bại` = `0` rows -> `"Không có lần chạy nào phù hợp bộ lọc hiện tại."`, reset) and Candidate filter (`Nguyễn Văn An` = `1` row, reset) functioned cleanly.
  - Screenshot: `docs/nt05/pr-screenshots/nt05_staff_data_sync_1440_light.png` (`142,833` bytes).
- **Criterion 1 (Mock Score Change via OS Temp Copy + `docker compose cp` + `POST /mock/reload`)**:
  - Copied `mock/data.json` to OS temp `$env:TEMP\mock_browser_c1.json` and updated `lmsResults["lms-sv-001"][0].score` (`JAVA01`) `8.5 -> 10.0` (`git diff -- mock/data.json` remained empty).
  - Clicked `"Đồng bộ lại"` -> button immediately disabled (`afterClickDisabled: true`) -> `POST /api/v1/staff/sync/1` returned `200 OK`.
  - `LMS · JAVA01` (`Lập trình Java`) updated to `Điểm LMS (0–10): 10`, `Điểm quy đổi: 100`, synced `04:17:01 27/11/2026`; previous historical `LMS · JAVA01` kept `6` / `60`. Runs count incremented to `"Tổng cộng 2 lần chạy"`.
  - Screenshot: `docs/nt05/pr-screenshots/nt05_staff_sync_c1_updated.png` (`143,882` bytes).
  - Restored original `mock/data.json` into container (`POST /mock/reload` returned `{"ok":true}`, `JAVA01 = 8.5`), deleted temp file (`TEMP_EXISTS=False`), and verified `git diff -- mock/data.json` empty.
- **Criterion 3 (`"Sửa tay"` Dialog, A11y, D9 Validation & Override Survival)**:
  - Opened `"Sửa tay"` on `JAVA01`: confirmed `html[data-scroll-locked="true"]`.
  - `<Select>` options verified: `["Điểm LMS", "Tỷ lệ chuyên cần", "Tỷ lệ bài tập", "R-Point", "Tên môn học"]`.
  - `Escape` key layering: first `Escape` while listbox was open closed only the listbox (`count=0`) and kept `[role="dialog"]` open (`visible=true`); second `Escape` closed the dialog (`count=0`), cleared `html[data-scroll-locked]` (`null`), and restored focus to the `"Sửa tay"` trigger button.
  - Focus trap: `Tab` x6 + `Shift+Tab` x3 -> `[role="dialog"] :focus` count remained `1` on every step (`[1,1,1,1,1,1,1,1,1]`).
  - D9 validation (`aria-invalid="true"` + inline error messages):
    - Blank reason -> `"Vui lòng nhập lý do sửa tay."`
    - `score = 11` -> `"Điểm LMS phải nằm trong khoảng từ 0 đến 10."`
    - `score = 8.123` -> `"Điểm LMS chỉ được phép tối đa 2 chữ số thập phân."` (captured in `docs/nt05/pr-screenshots/nt05_staff_override_dialog_select.png`, `113,544` bytes)
    - `rpoint = -1` -> `"R-Point phải là số nguyên không âm."`
    - `subjectName = ""` -> `"Tên môn học không được để trống."`
  - Saved `Điểm LMS = 9.5`, reason `"Xác minh bảng điểm gốc khóa Java"` -> `200 OK`: badge `"Đã sửa tay"`, `9.5`, `Điểm quy đổi: 95`, override history `"Điểm LMS → 9.5 / Hoàng Thu Hà • 04:19:47 27/11/2026 • Lý do: Xác minh bảng điểm gốc khóa Java"`.
  - Re-synced (`POST /api/v1/staff/sync/1` returned `200 OK`, `"Tổng cộng 3 lần chạy"`, `sync_runs` id=3 `lms: {updated: 0, unchanged: 5}`): `JAVA01` remained `9.5` / `95` (not overwritten by mock `8.5`).
  - Screenshot: `docs/nt05/pr-screenshots/nt05_staff_sync_c3_override_survived.png` (`115,349` bytes).
- **Criterion 2 (`docker compose stop mock` -> `503` + `role="alert"` + `FAILED` Run + DB Preserved)**:
  - Stopped `rikkei-mock`, clicked `"Đồng bộ lại"` -> `POST /api/v1/staff/sync/1` returned `503`.
  - Rendered `[role="alert"]`: `"Không thể đồng bộ dữ liệu từ hệ thống ngoài: Không thể kết nối tới hệ thống ngoài sau 3 lần thử"`.
  - All `8 bản ghi` remained intact (`JAVA01` kept `9.5` / `95` and its override history).
  - Runs table refreshed to `"Tổng cộng 4 lần chạy"`: latest row `04:24:09 27/11/2026 | Thủ công | Thất bại | Nguyễn Văn An | — | Không thể kết nối tới hệ thống ngoài sau 3 lần thử`; filtering `"Thất bại"` showed `1` row.
  - Screenshot: `docs/nt05/pr-screenshots/nt05_staff_sync_c2_mock_down_alert.png` (`144,393` bytes).
  - Restarted `mock` (`MOCK_STATUS=healthy`); `psql` confirmed `sync_runs` id=4 (`MANUAL`, `FAILED`) and `external_records` count for `user_id = 1` equaled `8`.
  - Full `page.reload()` on `/staff/data-sync` redirected cleanly to `/login` (`0` console errors).

---

## 2. H3 on `SkillProfilePage` (`/candidate/skills`, `candidate1@rikkeijobs.test`)

- **Initial Load**: `"Tóm tắt"` (`Tổng số kỹ năng 13`, `Đã xác thực 11`, `Chỉ tự khai 2`), `role="meter"` count = `13`, `JAVA` score `82.33` (reflecting the `JAVA01 = 9.5` override from Criterion 3).
- **Recompute Failure (`docker compose stop backend` -> click `"Tính lại từ dữ liệu học tập"` -> `POST /me/skills/recompute` `504`)**:
  - `role="meter"` count remained **`13`**; `"Tóm tắt"` and `JAVA` `82.33` stayed intact.
  - Inline `[role="alert"]`: `"Không tính lại được hồ sơ kỹ năng (Không thể xử lý yêu cầu (mã lỗi 504). Vui lòng thử lại.)"` with inline `"Thử lại"` button.
  - Focus measurement: `body:focus count = 0`, `button:focus count = 1`, `focusedButtonText = "Thử lại"`; `0` console errors.
  - Screenshot: `docs/nt05/pr-screenshots/nt05_candidate_h3_recompute_error_kept.png` (`138,221` bytes).
- **Retry Recovery (`docker compose start backend` -> healthy -> click `"Thử lại"`)**:
  - `POST /me/skills/recompute` returned `200 OK`; `[role="alert"]` cleared (`count = 0`); `13` skills remained intact; focus restored to `"Tính lại từ dữ liệu học tập"` (`body:focus = 0`).
- **First-Load Error Preservation (`docker compose stop backend` before navigating to `/candidate/skills` from `/candidate`)**:
  - `GET /me/skills` returned `504` -> full-card `[role="alert"]` `"Không tải được hồ sơ kỹ năng..."`, `role="meter" = 0`, `0` console errors.
  - Restarted `backend` (`BACKEND_STATUS=healthy`).

---

## 3. Responsive Viewports (`375/768/1024/1440` x Light/Dark), Interactions & Role Guards

- **`/staff/data-sync` (`8/8` PASS, `0` horizontal overflow)**:
  - Light theme: `1440x900` (`1424.8px`), `1024x768` (`1008.8px`), `768x1024` (`752.8px`), `375x812` (`360px`, `.ds-table-scroll` `278.4px <= 375`, buttons `44px`, modal `328px <= 375`).
  - Dark theme (`html[data-theme="dark"]`): `1440x900` (`1424.8px`), `1024x768` (`1008.8px`), `768x1024` (`752.8px`), `375x812` (`360px`, `.ds-table-scroll` `278.4px <= 375`).
  - Screenshots: `docs/nt05/pr-screenshots/nt05_staff_data_sync_1440_dark.png` (`139,837` bytes), `docs/nt05/pr-screenshots/nt05_staff_data_sync_375_dark.png` (`67,874` bytes).
- **`/candidate/skills` (`8/8` PASS, `0` horizontal overflow)**:
  - Light & Dark themes across `1440x900` (`1424.8px`), `1024x768` (`1008.8px`), `768x1024` (`752.8px`), `375x812` (`360px`).
- **Real User Interactions on `/staff/data-sync`**:
  - `mouse.wheel` scroll up/down, right-click, double-click, keyboard `Tab` / `Shift+Tab` / `Escape`, `goBack()` -> `/staff`, `goForward()` -> `/staff/data-sync`, and `reload()` -> `/login` all passed with `0` console errors.
- **Unauthenticated & Non-STAFF Role Guards (`CANDIDATE`, `HR`, `MENTOR`, `ADMIN`)**:
  - Unauthenticated navigation to `/staff/data-sync` redirected to `/login` (`<h1>` `"Đăng nhập"`).
  - Logging in as `candidate1` / `hr2` / `mentor1` / `admin1` from `/staff/data-sync` triggered `resolvePostLoginPath` redirect to role home (`/candidate`, `/hr`, `/mentor`, `/admin`) with `0` requests to `/api/v1/staff/*`.
  - Authenticated SPA navigation (`goBack()`) to `/staff/data-sync` across all 4 non-STAFF roles (`HR`, `CANDIDATE`, `MENTOR`, `ADMIN`) triggered the Role Guard to render an inline 403 Forbidden screen at URL `/staff/data-sync` (`<h1>` `"Bạn không có quyền truy cập trang này"`, `"Vai trò hiện tại: ..."`) without changing the URL to `/403`, issuing `0` requests to `/api/v1/staff/*`, and producing `0` console errors.
  - Screenshot: `docs/nt05/pr-screenshots/nt05_non_staff_redirect_403.png` (`64,119` bytes).

---

## 4. PR Screenshots Inventory (`docs/nt05/pr-screenshots/`, gitignored)

1. `docs/nt05/pr-screenshots/nt05_candidate_h3_recompute_error_kept.png` — `138,221` bytes
2. `docs/nt05/pr-screenshots/nt05_non_staff_redirect_403.png` — `64,119` bytes
3. `docs/nt05/pr-screenshots/nt05_staff_data_sync_1440_dark.png` — `139,837` bytes
4. `docs/nt05/pr-screenshots/nt05_staff_data_sync_1440_light.png` — `142,833` bytes
5. `docs/nt05/pr-screenshots/nt05_staff_data_sync_375_dark.png` — `67,874` bytes
6. `docs/nt05/pr-screenshots/nt05_staff_override_dialog_select.png` — `113,544` bytes
7. `docs/nt05/pr-screenshots/nt05_staff_sync_c1_updated.png` — `143,882` bytes
8. `docs/nt05/pr-screenshots/nt05_staff_sync_c2_mock_down_alert.png` — `144,393` bytes
9. `docs/nt05/pr-screenshots/nt05_staff_sync_c3_override_survived.png` — `115,349` bytes

---

## 5. `webview_browser` Sandbox Notes

- The Antigravity `webview_browser` sandbox blocks arbitrary JS evaluation (`page.evaluate` / `locator.evaluate`) and redacts `"code"` inside `responseBodyPreview`.
- Responsive viewport geometry was measured directly via Playwright `boundingBox()` (`1440`, `1024`, `768`, `375` Light & Dark), and database / HTTP persistence outcomes were corroborated via direct `psql` queries and Docker container status checks.

---

## NT-05-fix — /browser Verification (2026-11-27)

- **Target URL & Account**: `http://localhost:3000/staff/data-sync` (`staff1@rikkeijobs.test`), fresh Docker Compose stack (`25` initial `sync_runs`: `24 SUCCESS`, `1 FAILED` `#25`; `26` after F3 sync).
- **Global Telemetry**: `0` console errors; `0` unexpected network errors (only intentional `502` from Nginx during `docker stop rikkei-backend` fault tests).
- **`webview_browser` `evaluate` Limitation Note**: The Antigravity `webview_browser` sandbox blocks arbitrary script evaluation (`page.evaluate` / `locator.evaluate`). Element geometry and wrapping bounds across `375`/`768`/`1024`/`1440` px (Light & Dark) were measured via Playwright `boundingBox()`.

### 1. F6 — Section Headings (`1440x900` Light)

- `h2[0]`: `"Tra cứu ứng viên và bản ghi đồng bộ"` (`class="ds-section-title"`, `boundingBox {x:304, y:244.8, width:876, height:24.3}`).
- `h2[1]`: `"Lịch sử các lần chạy đồng bộ"` (`class="ds-section-title"`, `boundingBox {x:328.8, y:920.8, width:407.2, height:24.3}`).
- `.rj-section-title` count = `0`; `.ds-section-title` count = `2`.
- Screenshot: `docs/nt05/pr-screenshots/nt05_fix_f6_headings_1440_light.png` (`134,007` bytes).

### 2. F2 — Retained Rows, Mounted Controls, Focus Preservation & Candidate Isolation

- **25 Runs Paging (Keyboard `Tab` + `Enter`)**: Page `1 / 2` (`20` rows) -> Page `2 / 2` (`5` rows); `<nav aria-label="Phân trang lịch sử đồng bộ">` stayed mounted (`count=1`), `"Trang sau"` became disabled, `body:focus=0`, and focus moved to `"Trang trước"`. Pressing `Enter` on `"Trang trước"` returned to Page `1 / 2` and moved focus back to `"Trang sau"`.
- **Filter Reset (Keyboard `Shift+Tab` + `Enter`)**: Filtered `"Thất bại"` -> `Shift+Tab` -> `Enter` on `"Đặt lại bộ lọc"` -> restored `25` runs (`Trang 1 / 2`), `body:focus=0`, and moved focus to the `"Tất cả trạng thái"` combobox.
- **Candidate Switching Without Record Bleed or Flash**: Switched `Nguyễn Văn An` (`8` records) -> `Trần Thị Bình` (`5` records) -> `Lê Minh Châu` (`4` records) -> `Nguyễn Văn An` (`8` records); `empty-state count = 0` at every transition with zero record bleed.
- **Backend Stop Fault (`docker stop rikkei-backend`) & Retry Recovery**:
  - Clicked `"Làm mới"` on runs (`GET /sync-runs -> 502`) and searched `"binh"` (`GET /candidates?q=binh -> 502`): `20` run rows and `3` candidates remained rendered with `...(Đang giữ dữ liệu trang 1)`, `<nav>` and filter comboboxes stayed mounted, `role="alert"` + `"Thử lại"` rendered next to kept rows, and `body:focus=0`.
  - After `docker start rikkei-backend`, clicking `"Thử lại"` recovered (`200 OK`, alerts cleared).
  - Screenshot: `docs/nt05/pr-screenshots/nt05_fix_f2_runs_paging_and_backend_stop_kept_rows.png` (`128,923` bytes).

### 3. F3 — Per-Candidate Sync Busy Isolation

- **`docker pause rikkei-mock`**: Syncing `Nguyễn Văn An` kept his button showing `"Đang đồng bộ..."` with `isDisabled()=true`. Switching to `Trần Thị Bình` while An remained in flight showed Bình's `5 bản ghi` and enabled `"Đồng bộ lại"` (`isDisabled()=false`).
- Screenshot: `docs/nt05/pr-screenshots/nt05_fix_f3_per_candidate_sync_busy_isolated.png` (`158,166` bytes).
- **`docker unpause rikkei-mock`**: An's sync completed with `role="alert"` naming `"Nguyễn Văn An"`, Bình's `5 bản ghi` remained untouched, and the runs table refreshed to `"Tổng cộng 26 lần chạy"` (`#26`).

### 4. F4 — Override Dialog Error Focus & Alert Accessibility

- **Pre-Error Dialog Keyboard (`LMS · JAVA01`)**: `Tab` x4 + `Shift+Tab` x2 kept `[role="dialog"] :focus` (`7/7`); `Escape` closed the dialog and restored focus to `"Sửa tay"`.
- **Server Error Inside Open Dialog (`docker stop rikkei-backend` -> `502`)**: Submitted override `score=9.2`, `reason="Kiểm thử lỗi mạng F4"`: dialog stayed open, `[role="dialog"] [role="alert"]` became visible and focused (`body:focus=0`, `[role="dialog"] :focus` count=`1`), `Tab` x3 + `Shift+Tab` x2 remained inside the dialog (`5/5`), and `Escape` closed the dialog restoring focus to `"Sửa tay"`.
- Screenshot: `docs/nt05/pr-screenshots/nt05_fix_f4_override_dialog_error_focus_inside.png` (`115,952` bytes).

### 5. F5 — Long Spaceless Text Wrapping & `375/768/1024/1440` Light/Dark Bounds

- Saved valid override on `Trần Thị Bình` (`LMS · REACT01`) with a `200`-character spaceless `subjectName` (`"MonHocKhongKhoangTrang_" + "A".repeat(177)`) and a `480`-character spaceless `reason` (`"LyDoKhongKhoangTrang_" + "B".repeat(459)`) -> `200 OK`; reopened dialog subtitle stayed within bounds (`1440x900` Light `560px`, `375x812` Dark `328px <= 375px`).
- **8 Viewport x Theme `boundingBox` Measurements (`0` page overflow)**:
  - Light `1440x900`: `html=1424.8, body=1424.8, card=668.28`.
  - Light `1024x768`: `html=1008.8, body=1008.8, card=331.20` (`docs/nt05/pr-screenshots/nt05_fix_f5_responsive_1024_light.png`, `177,304` bytes).
  - Light `768x1024`: `html=752.8, body=752.8, card=391.20`.
  - Light `375x812`: `html=360, body=360, card=278.40`.
  - Dark `1440x900`: `html=1424.8, body=1424.8, card=668.28`.
  - Dark `1024x768`: `html=1008.8, body=1008.8, card=331.20`.
  - Dark `768x1024`: `html=752.8, body=752.8, card=391.20` (`docs/nt05/pr-screenshots/nt05_fix_f5_responsive_768_dark.png`, `233,698` bytes).
  - Dark `375x812`: `html=360, body=360, card=278.40` (`docs/nt05/pr-screenshots/nt05_fix_f5_long_text_wrap_375_dark.png`, `58,161` bytes).

### 6. F7 — Run Error Disclosure via Keyboard & Touch

- **`1440x900` Light (Keyboard)**: Collapsed `#25` `FAILED` main row height `38px`, `"Chi tiết"` (`aria-expanded="false"`). Pressing `Tab` + `Enter` expanded to `aria-expanded="true"`, label `"Thu gọn"`, region `"Chi tiết lỗi lần chạy #25"` (`width=571.21px, height=37.1px`), while the main row stayed `38px`; `Space` toggled cleanly. Screenshot: `docs/nt05/pr-screenshots/nt05_fix_f7_run_error_expanded_keyboard.png` (`112,973` bytes).
- **`375x812` Dark (Touch/Click)**: Filtered `"Thất bại"`, clicked `"Chi tiết"` on `#26` -> `aria-expanded="true"`, page width `html=360px` (zero page overflow; `.ds-table-scroll` `278.40px` scrolled the internal `571.21px` detail box).

### 7. Minor UI Observations

- At `1440x900`, the right-edge filter buttons (`"Đặt lại bộ lọc"`, `"Làm mới"`) and `"Chi tiết"` column sit snug against the container edge with zero page horizontal overflow (`1424.8 <= 1440`).

### 8. `NT-05-fix` Screenshots Inventory (`docs/nt05/pr-screenshots/`, gitignored)

1. `docs/nt05/pr-screenshots/nt05_fix_f2_runs_paging_and_backend_stop_kept_rows.png` — `128,923` bytes
2. `docs/nt05/pr-screenshots/nt05_fix_f3_per_candidate_sync_busy_isolated.png` — `158,166` bytes
3. `docs/nt05/pr-screenshots/nt05_fix_f4_override_dialog_error_focus_inside.png` — `115,952` bytes
4. `docs/nt05/pr-screenshots/nt05_fix_f5_long_text_wrap_375_dark.png` — `58,161` bytes
5. `docs/nt05/pr-screenshots/nt05_fix_f5_responsive_1024_light.png` — `177,304` bytes
6. `docs/nt05/pr-screenshots/nt05_fix_f5_responsive_768_dark.png` — `233,698` bytes
7. `docs/nt05/pr-screenshots/nt05_fix_f6_headings_1440_light.png` — `134,007` bytes
8. `docs/nt05/pr-screenshots/nt05_fix_f7_run_error_expanded_keyboard.png` — `112,973` bytes

---

## NT-05-fix2 Live /browser Verification (`2026-11-27`)

- **Target URL & Account**: `http://127.0.0.1:3000/staff/data-sync` (`staff1@rikkeijobs.test`), fresh Docker Compose stack (`28` initial `sync_runs`: `18 SUCCESS`, `10 FAILED`, expanding to `30` after G5 live syncs).
- **Global Telemetry**: `0` console errors; `0` unexpected network errors (only intentional `502` from Nginx while `rikkei-backend` was stopped during G5/G6 fault tests). All `18` captured PNGs in `docs/nt05/pr-screenshots/` were visually opened and inspected by Parent (`18/18` PASS: all buttons `44px` single-line inside card, zero clipped, squeezed, or off-screen controls).

### 1. Explicit Correction to Earlier `"no overflow"` / `"0 page overflow"` Claims (`G8`)

- Earlier `NT-05` and `NT-05-fix` observations reported `"0 horizontal overflow"` / `"0 page overflow"` based solely on top-level `document.documentElement` widths, overlooking two inner container regressions reproduced in Team Lead review (`G1` and `G4`):
  1. **G1 (Runs Filter Bar Regression from `NT-05-fix`)**: `.ds-runs-header > div { min-width: 0; flex: 1 1 220px; }` also matched `.ds-runs-filters`, squeezing `"Đặt lại bộ lọc"` and `"Làm mới"` into tall multi-line boxes ending past the card at `1440` and `1920` px, overflowing the viewport at `1024` px, leaving a tall empty gap above the heading, and truncating default select labels at `768` px.
  2. **G4 (375 px Run Error Box Off-Screen Overflow)**: At `375x812`, tapping `"Chi tiết"` rendered `.ds-run-error-detail-box` `571` px wide at `x = -654` outside the visible `294` px `.ds-table-scroll` viewport so the user saw an empty band until scrolling horizontally.
- Both defects are resolved in `NT-05-fix2` and re-verified across all required viewports below.

### 2. G1 — Runs Filter Bar (`12/12` PASS: `6` Widths x Sidebar Expanded/Collapsed x Light/Dark)

All filter controls (`"Tất cả trạng thái"`, `"Tất cả ứng viên"`, `"Đặt lại bộ lọc"`, `"Làm mới"`) stay strictly inside the card boundary, button labels remain single-line (`44px` height), default select values are fully readable without truncation, and zero empty header block appears:

- **`1920x1080` Expanded Light**: `card [516.4..1668.4]`, controls `right <= 1643.60`, `html=1904.8 <= 1920` (`nt05_fix2_g1_runs_1920_expanded_light.png`).
- **`1920x1080` Collapsed Dark**: `card [412.4..1564.4]`, controls `right <= 1539.60`, `html=1904.8 <= 1920`.
- **`1440x900` Expanded Light**: `card [304.0..1400.8]`, controls `right <= 1376.00`, `html=1424.8 <= 1440` (`nt05_fix2_g1_runs_1440_expanded_light.png`).
- **`1440x900` Collapsed Dark**: `card [172.4..1324.4]`, controls `right <= 1299.60`, `html=1424.8 <= 1440` (`nt05_fix2_g1_runs_1440_collapsed_dark.png`).
- **`1280x800` Expanded Light**: `card [304.0..1240.8]`, controls `right <= 1216.00`, `html=1264.8 <= 1280` (`nt05_fix2_g1_runs_1280_expanded_light.png`).
- **`1280x800` Collapsed Dark**: `card [96.0..1240.8]`, controls `right <= 1216.00`, `html=1264.8 <= 1280`.
- **`1024x768` Expanded Light**: `card [304.0..984.8]`, controls `right <= 960.00`, `html=1008.8 <= 1024` (`nt05_fix2_g1_runs_1024_expanded_light.png`).
- **`1024x768` Collapsed Dark**: `card [96.0..984.8]`, controls `right <= 960.00`, `html=1008.8 <= 1024` (`nt05_fix2_g1_runs_1024_collapsed_dark.png`).
- **`768x1024` Expanded Light**: `card [296.0..736.8]`, controls `right <= 712.00`, `html=752.8 <= 768` (`nt05_fix2_g1_runs_768_expanded_light.png`).
- **`768x1024` Collapsed Dark**: `card [88.0..736.8]`, controls `right <= 712.00`, `html=752.8 <= 768` (`nt05_fix2_g1_runs_768_collapsed_dark.png`).
- **`375x812` Light & Dark (drawer closed)**: `card [16.0..344.0]`, controls `right <= 319.20`, `html=360.0 <= 375` (`nt05_fix2_g1_runs_375_light.png`).

### 3. G4 — Expanded Run Error Box (`3/3` PASS at `1024`, `768`, `375` px)

Measured via `boundingBox()` after scrolling to `"Chi tiết"` and expanding the failed run error row via touch/keyboard:

- **`1024x768` Expanded Light**: `scrollBox [328.80..960.00] (w=631.20)`, `detailBox [340.80..912.01] (w=571.21, h=37.10)` (`nt05_fix2_g4_error_box_1024.png`).
- **`768x1024` Expanded Light**: `scrollBox [320.80..712.00] (w=391.20)`, `detailBox [332.80..699.99] (w=367.19, h=37.10)` (`nt05_fix2_g4_error_box_768.png`).
- **`375x812` Light**: `scrollBox [40.80..319.20] (w=278.40)`, `detailBox [52.80..307.19] (w=254.39, h=56.60)` — fully visible inside the table viewport with zero horizontal scrolling required (`nt05_fix2_g4_error_box_375.png`).

### 4. G5 — Keyboard Focus Preservation & No Focus Stealing

- **`"Đồng bộ lại"` (`docker pause rikkei-mock`)**: Pressing `Enter` on `"Đồng bộ lại"` kept focus anchored on `<h3>Nguyễn Văn An</h3>` (`body:focus=0`) while busy; pressing `Tab` moved focus to `"Sửa tay"` and unpausing `rikkei-mock` to complete the sync did **not** steal focus away from `"Sửa tay"`. A healthy sync without moving focus restored focus cleanly to `"Đồng bộ lại"` (`nt05_fix2_g5_sync_focus_preserved.png`).
- **`"Thử lại"` (`docker stop rikkei-backend` -> `docker start rikkei-backend`)**: Pressing `Enter` on runs `"Thử lại"` kept focus on `"Thử lại"` on `502` failure; after `docker start rikkei-backend`, pressing `Enter` anchored on the section heading while loading and moved cleanly to `"Làm mới"` (runs) / `"Tìm kiếm ứng viên"` (candidates) with `body:focus=0` (`nt05_fix2_g5_retry_focus_preserved.png`).

### 5. G6 — Explicit Stale Filter / Query Messaging & Totals/Pager

- **Runs Filter (`"Thất bại"` while `rikkei-backend` stopped)**: Kept rows belonging to `"Tất cả trạng thái • Tất cả ứng viên"` (`30 lần chạy`), explicitly displaying the kept filter vs requested filter across the status alert, section heading (`Đang giữ kết quả bộ lọc trước (Tất cả trạng thái • Tất cả ứng viên): 30 lần chạy`), and pager (`Trang 1 / 2 (bộ lọc trước: Tất cả trạng thái • Tất cả ứng viên)`) (`nt05_fix2_g6_runs_stale_filter_message.png`).
- **Candidate Search (`"binh"` while `rikkei-backend` stopped)**: Kept `3` rows with `"tất cả ứng viên"` explicitly named in the alert (`nt05_fix2_g6_candidates_stale_query_message.png`).

### 6. G7 — Override `1e-100000` Blocked, Real `Enter` Multiline Reason & Navigation

- **Client Underflow Guard**: Entering `1e-100000` in `"Tỷ lệ chuyên cần"` was blocked client-side (`0` `PUT` requests sent, `aria-invalid="true"`).
- **Multiline `reason` via Real `Enter`**: Entered `"Xác minh bảng điểm danh kỳ 1"`, pressed real keyboard `Enter`, and typed `"Đã đối chiếu sổ điểm giảng viên"` -> `200 OK`; multiline history rendered line breaks cleanly at `1440px` (`nt05_fix2_g7_multiline_reason_saved_history.png`) and wrapped cleanly at `375x812` (`html=360px`, card `278.4px`, history `244.8px`, `nt05_fix2_g7_multiline_history_375_wrap.png`).
- **Navigation & Telemetry**: `goBack()` -> `/staff`, `goForward()` -> `/staff/data-sync`, `reload()` -> `/login`, `0` console errors throughout.

### 7. `NT-05-fix2` Screenshots Inventory (`18` PNGs in `docs/nt05/pr-screenshots/`, gitignored)

1. `docs/nt05/pr-screenshots/nt05_fix2_g1_runs_1920_expanded_light.png` — `142,885` bytes
2. `docs/nt05/pr-screenshots/nt05_fix2_g1_runs_1440_expanded_light.png` — `192,486` bytes
3. `docs/nt05/pr-screenshots/nt05_fix2_g1_runs_1440_collapsed_dark.png` — `152,510` bytes
4. `docs/nt05/pr-screenshots/nt05_fix2_g1_runs_1280_expanded_light.png` — `187,647` bytes
5. `docs/nt05/pr-screenshots/nt05_fix2_g1_runs_1024_expanded_light.png` — `199,256` bytes
6. `docs/nt05/pr-screenshots/nt05_fix2_g1_runs_1024_collapsed_dark.png` — `124,898` bytes
7. `docs/nt05/pr-screenshots/nt05_fix2_g1_runs_768_expanded_light.png` — `163,095` bytes
8. `docs/nt05/pr-screenshots/nt05_fix2_g1_runs_768_collapsed_dark.png` — `193,670` bytes
9. `docs/nt05/pr-screenshots/nt05_fix2_g1_runs_375_light.png` — `67,784` bytes
10. `docs/nt05/pr-screenshots/nt05_fix2_g4_error_box_1024.png` — `188,586` bytes
11. `docs/nt05/pr-screenshots/nt05_fix2_g4_error_box_768.png` — `170,335` bytes
12. `docs/nt05/pr-screenshots/nt05_fix2_g4_error_box_375.png` — `59,537` bytes
13. `docs/nt05/pr-screenshots/nt05_fix2_g5_sync_focus_preserved.png` — `161,827` bytes
14. `docs/nt05/pr-screenshots/nt05_fix2_g5_retry_focus_preserved.png` — `177,391` bytes
15. `docs/nt05/pr-screenshots/nt05_fix2_g6_runs_stale_filter_message.png` — `148,126` bytes
16. `docs/nt05/pr-screenshots/nt05_fix2_g6_candidates_stale_query_message.png` — `169,525` bytes
17. `docs/nt05/pr-screenshots/nt05_fix2_g7_multiline_reason_saved_history.png` — `130,290` bytes
18. `docs/nt05/pr-screenshots/nt05_fix2_g7_multiline_history_375_wrap.png` — `64,097` bytes

---

## NT-05-fix3 Live `/browser` Verification (`2026-11-28`)

- **Target URL & Account**: `http://127.0.0.1:3000/staff/data-sync` (`staff1@rikkeijobs.test`, Hoàng Thu Hà), fresh Docker Compose stack (`22` real `POST /api/v1/staff/sync/{1|2|3}` sync runs) plus temporary local PostgreSQL rows inserted strictly inside the ephemeral Docker dev DB for > 20 candidate and records pagination:

```sql
INSERT INTO external_records (user_id, source, source_code, title, score, recorded_at, source_key, payload, synced_at)
SELECT 1, 'LMS', 'TMP-PAGING-' || LPAD(g::text, 2, '0'),
       'Học phần kiểm thử phân trang ' || LPAD(g::text, 2, '0'),
       82.50, NOW() - (g || ' hours')::interval,
       'TMP-LMS-PAGING-' || LPAD(g::text, 2, '0'),
       jsonb_build_object('courseCode', 'TMP-' || g, 'progress', 100), NOW()
FROM generate_series(1, 15) AS g;

INSERT INTO users (email, password_hash, full_name, lms_user_id, role_id, must_change_password, status)
SELECT 'tmp-cand-' || LPAD(g::text, 2, '0') || '@rikkeijobs.test', NULL,
       'Ứng viên kiểm thử phân trang ' || LPAD(g::text, 2, '0'),
       'tmp-lms-' || LPAD(g::text, 2, '0'), 1, false, 'ACTIVE'
FROM generate_series(1, 20) AS g;
```

- **Global Telemetry**: `0` console errors; `0` unexpected network errors (only intentional HTTP `502` responses from Nginx while `rikkei-backend` was stopped during `I1`/`I2` fault tests). All `6` captured PNGs in `docs/nt05/pr-screenshots/` were visually opened and inspected with `0` visual defects.
- **Checkpoint 1 — Initial Paginated Baseline (`1440x900`)**:
  - Candidates list: `Trang 1 / 2` (`23` total candidates).
  - Selected `Nguyễn Văn An`: `23 bản ghi`, records pager `Trang 1 / 2`.
  - Runs table: `Tổng cộng 22 lần chạy`, runs pager `Trang 1 / 2`.
- **Checkpoint 2 — `I1` Pagers on Backend Stop (`docker stop rikkei-backend` at `1440x900` and `375x812`)**:
  - Clicked `"Trang sau"` across candidates, records, and runs after stopping `rikkei-backend` (`502`): all three pagers cleared any loading text and rendered `Trang 1 / 2 (chưa tải được trang 2)` (`"đang tải"` absent in all 3 pagers).
  - Runs heading updated to `Tổng cộng 22 lần chạy (đang hiển thị trang 1)` and records count updated to `23 bản ghi (đang hiển thị trang 1)`.
  - At `375x812`: `html` box width `360 <= 375`, `body` box width `360 <= 375`, pagers width `278.4`, `"Thử lại"` button width `214.8`, height `44` (`right = 302.4 <= 375`).
  - Screenshots: `docs/nt05/pr-screenshots/nt05_fix3_i1_3pagers_failed_1440.png` (`173,048` bytes), `docs/nt05/pr-screenshots/nt05_fix3_i1_pagers_failed_375.png` (`66,849` bytes).
- **Checkpoint 3 — `I1` Retry Recovery (`docker start rikkei-backend` at `1440x900`)**:
  - Clicked `"Thử lại"` on all three alerts after `rikkei-backend` became healthy: all three transitioned cleanly to `Trang 2 / 2` (runs `Tổng cộng 22 lần chạy`, `2` rows on page 2, `0` alerts).
  - Screenshot: `docs/nt05/pr-screenshots/nt05_fix3_i1_3pagers_retry_page2_1440.png` (`124,045` bytes).
- **Checkpoint 4 — `I2` Previous Empty Query/Filter & Keyboard Focus (`docker stop rikkei-backend` at `1440x900`)**:
  - **Candidates (`"zzzz"` -> `"Bình"`)**: Searched `"zzzz"` (empty), stopped `rikkei-backend`, searched `"Bình"` (`502`) -> empty state retained `"Không tìm thấy ứng viên phù hợp cho truy vấn trước (từ khóa \"zzzz\")."` alongside the alert naming `"Bình"` vs `"zzzz"` (`nt05_fix3_i2_candidates_prev_empty_failed_1440.png`, `169,447` bytes).
  - **Runs (`"Thất bại"` -> keyboard `Tab` + `Enter` on `"Đặt lại bộ lọc"`)**: Filtered `"Thất bại"` (`0` runs), stopped `rikkei-backend`, navigated via `Tab` + `Enter` on `"Đặt lại bộ lọc"` inside `.rj-empty-state` (`502`): `BODY` focus count `0`, focus landed on `"Tất cả trạng thái"` (`role="combobox"`), heading showed `Đang giữ kết quả bộ lọc trước (Thất bại • Tất cả ứng viên): 0 lần chạy`, and `.rj-empty-state` showed `Không có lần chạy nào phù hợp bộ lọc trước (Thất bại • Tất cả ứng viên).` (`nt05_fix3_i2_runs_prev_empty_reset_kbd_1440.png`, `111,454` bytes).
- **Checkpoint 5 — `I2` Keyboard Reset & Records Empty State (`375x812`)**:
  - Repeated keyboard `Tab` + `Enter` on `"Đặt lại bộ lọc"` at `375x812`: `BODY` focus count `0` (focus moved to `"Tất cả trạng thái"`).
  - Selected `Ứng viên kiểm thử phân trang 01` (`0` records) and clicked `"Đồng bộ lại"` with `rikkei-backend` stopped (`POST /api/v1/staff/sync/10 -> 502`): sync alert rendered while records empty state remained `"Ứng viên chưa có bản ghi dữ liệu ngoài nào."` (truthful because `POST /sync` failed without altering the candidate or records query).
  - At `375x812`: `html` box width `360 <= 375`, `0` console errors (`nt05_fix3_i2_empty_and_records_375.png`, `67,590` bytes).
- **Cleanup**: Ephemeral Docker stack and temporary DB rows were completely destroyed afterwards via scoped `docker compose down -v`.

### `NT-05-fix3` Screenshots Inventory (`6` PNGs in `docs/nt05/pr-screenshots/`, gitignored)

1. `docs/nt05/pr-screenshots/nt05_fix3_i1_3pagers_failed_1440.png` — `173,048` bytes
2. `docs/nt05/pr-screenshots/nt05_fix3_i1_pagers_failed_375.png` — `66,849` bytes
3. `docs/nt05/pr-screenshots/nt05_fix3_i1_3pagers_retry_page2_1440.png` — `124,045` bytes
4. `docs/nt05/pr-screenshots/nt05_fix3_i2_candidates_prev_empty_failed_1440.png` — `169,447` bytes
5. `docs/nt05/pr-screenshots/nt05_fix3_i2_runs_prev_empty_reset_kbd_1440.png` — `111,454` bytes
6. `docs/nt05/pr-screenshots/nt05_fix3_i2_empty_and_records_375.png` — `67,590` bytes
