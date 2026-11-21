# UI/UX Motion & Craft Research Synthesis — Rikkei Jobs

**Document Path**: `docs/uiux/RESEARCH.md`  
**Round**: `UIUX-polish` (Milestone M2 — Deep Multi-Source Research & Motion Language Specification)  
**Date Read & Synthesized / Ngày đọc và tổng hợp**: `2026-11-19`  
**Languages / Ngôn ngữ**: English & Tiếng Việt (Bilingual / Song ngữ)  
**Zero Emoji Compliance**: Verified (`0` emoji characters)

---

## Executive Summary (English)

This document synthesizes multi-source research conducted on `2026-11-19` across six authoritative pillars — WAI-ARIA Authoring Practices & WCAG 2.2, MDN/web.dev/Chrome platform engineering, Can I Use/Baseline browser support, Apple HIG & Material Design 3 Motion, Nielsen Norman Group perceived-performance studies, and practitioner craft & anti-AI-template guidelines — to establish the Motion Language, M1 control specifications, and visual elevation refinements for Rikkei Jobs.

Key engineering outcomes applied directly in Round `UIUX-polish`:

1. **M1 Accessible Controls**: Grounded the icon-only sidebar disclosure toggle (`aria-expanded`, `aria-controls`, dynamic Vietnamese `aria-label`, `transform` flip instead of icon swapping, WCAG 1.4.13 Escape-dismissible hover/focus tooltip `<= 200ms`) and the theme `role="switch"` control (static `aria-label="Chế độ tối"`, `aria-checked`, Space/Enter support, `>= 3:1` track/thumb boundary contrast).
2. **Rule-09-Compliant Motion Language**: Calibrated a 7-step duration scale (`0ms` to `550ms`), `cubic-bezier` baselines with `@supports (animation-timing-function: linear(0, 1))` spring upgrades (`snappy`, `stiff`, `gentle`), a strict **Spatial vs. Effects** split (springs only on `transform`, clean deceleration on `opacity`/color), a bounded stagger formula (`min(calc(...), 220ms)` keeping total reveal `<= 400ms`), and dense admin dampening (`<= 150ms` under `[data-density="dense"]`).
3. **Reduced-Motion & CSS Bug Fixes**: Eliminated the blanket `*, *::before, *::after { transition-duration: 0.001ms !important; }` collision in `frontend/src/shared/styles/design-tokens.css` so `prefers-reduced-motion: reduce` delivers genuine `100ms` opacity cross-fades while keeping `0.001ms` duration tokens for WebKit `transitionend` reliability and zeroing spatial offsets (`0px`).
4. **Cool Cobalt Shadow Alignment**: Replaced warm-black shadows (`rgba(26, 22, 21, ...)`) with cool navy shadows (`rgba(11, 26, 44, ...)` matching `--rj-primitive-neutral-900: #0B1A2C`) paired with `1px` borders to eliminate muddy tinting on Confident Royal Cobalt and Iron Obsidian surfaces.

---

## Tóm Tắt Điều Hành (Tiếng Việt)

Tài liệu này tổng hợp kết quả nghiên cứu chuyên sâu từ nhiều nguồn uy tín vào ngày `2026-11-19` trên sáu trụ cột kỹ thuật — chuẩn trợ năng WAI-ARIA APG & WCAG 2.2, tài liệu nền tảng web từ MDN/web.dev/Chrome, ma trận hỗ trợ trình duyệt Baseline/Can I Use, hệ thống hướng dẫn chuyển động Apple HIG & Material Design 3, nghiên cứu hiệu năng cảm nhận của Nielsen Norman Group, và kinh nghiệm thực chiến chống giao diện rập khuôn AI — nhằm chuẩn hóa Ngôn ngữ Chuyển động (Motion Language), đặc tả hai điều khiển M1 và thang bóng đổ cho Rikkei Jobs.

Các kết quả kỹ thuật cốt lõi được áp dụng trực tiếp trong vòng `UIUX-polish`:

1. **Chuẩn hóa hai điều khiển M1**: Thiết kế nút thu gọn thanh điều hướng chỉ dùng biểu tượng (`aria-expanded`, `aria-controls`, `aria-label` tiếng Việt theo trạng thái, hiệu ứng lật `transform` thay cho tráo đổi biểu tượng, tooltip `<= 200ms` xuất hiện khi di chuột lẫn focus bàn phím và đóng bằng `Escape` theo WCAG 1.4.13) cùng công tắc giao diện sáng/tối (`role="switch"`, `aria-label="Chế độ tối"` giữ nguyên không đổi khi bật/tắt, `aria-checked`, hỗ trợ `Space`/`Enter`, tương phản viền `>= 3:1`).
2. **Ngôn ngữ Chuyển động tuân thủ Rule 09**: Hiệu chỉnh thang thời lượng 7 bậc (`0ms` đến `550ms`), đường cong `cubic-bezier` cơ sở kết hợp nâng cấp lò xo `linear()` bên trong `@supports (animation-timing-function: linear(0, 1))`, tách bạch **Không gian và Hiệu ứng (Spatial vs. Effects)** (lò xo chỉ áp dụng cho `transform`, `opacity` và màu dùng đường cong giảm tốc mượt), công thức trễ tuần tự có chặn trên (`min(calc(...), 220ms)` giữ tổng thời gian xuất hiện `<= 400ms`), và giảm chấn giao diện quản trị (`<= 150ms` trong `[data-density="dense"]`).
3. **Khắc phục xung đột `prefers-reduced-motion`**: Gỡ bỏ khai báo bao trùm `*, *::before, *::after { transition-duration: 0.001ms !important; }` trong `frontend/src/shared/styles/design-tokens.css` để chế độ giảm chuyển động thực sự phát được hiệu ứng chuyển mờ `100ms` (`opacity`), đồng thời giữ giá trị token `0.001ms` bảo toàn sự kiện `transitionend` trên WebKit và đưa mọi khoảng dịch chuyển về `0px`.
4. **Đồng bộ bóng đổ xanh navy lạnh**: Chuyển các biến `--rj-shadow-1..4` từ đen ấm (`rgba(26, 22, 21, ...)`) sang xanh navy lạnh (`rgba(11, 26, 44, ...)` đồng bộ với `--rj-primitive-neutral-900: #0B1A2C`) kết hợp viền `1px` sắc nét để phù hợp với bảng màu Confident Royal Cobalt và Iron Obsidian.

---

## 1. Repository Spec vs. Codebase Audit / Đối Soát Đặc Tả và Mã Nguồn Hiện Tại

Before synthesizing external sources, an audit of `frontend/src/shared/styles/design-tokens.css`, `frontend/src/shared/utils/motion.ts`, `docs/design/DESIGN_SYSTEM.md`, `agent-config/skills/frontend-motion-design/`, and `frontend/src/features/identity/components/SharedAppLayout.tsx` identified seven concrete discrepancies:

Trước khi đối chiếu nguồn ngoài, quá trình rà soát mã nguồn và tài liệu thiết kế hiện có ghi nhận bảy điểm lệch cụ thể:

| # | Area / Hạng mục | Current Observation / Hiện trạng | Required Remediation / Hướng xử lý |
|---|---|---|---|
| 1 | Motion tokens in `design-tokens.css` | Only 3 durations (`150/250/400ms`) and 3 `cubic-bezier()` curves were present; `--rj-ease-spring-snappy` used `cubic-bezier(0.16, 1, 0.3, 1)` with no `linear()` springs, distances, or stagger tokens. | Add the full calibrated 7-duration scale, distance scale, stagger steps, `cubic-bezier` fallbacks, and `@supports (animation-timing-function: linear(0, 1))` spring upgrades while preserving existing `--rj-duration-{fast,base,slow}` aliases. |
| 2 | Spring budgets vs. Rule 09 | Skill reference `spring-presets.md` documented `gentle` at `~400ms` and `bouncy-subtle` at `~440ms` (`~8.9%` overshoot), exceeding Rule 09 (`dialogs/drawers <= 300ms`, `micro/toggles <= 150ms`). | Calibrate `snappy` (`~1%` overshoot, `150–180ms`), `stiff` (`~0.3%` overshoot, `150–180ms`), and `gentle` (`0%` overshoot, `280ms`), keeping all durations strictly inside Rule 09. |
| 3 | Reduced-motion `!important` collision | Blanket `*, *::before, *::after { transition-duration: 0.001ms !important; }` overrode `--rj-transition-hover: opacity 100ms ease`, killing subtle opacity cross-fades. | Remove the blanket `transition-duration: 0.001ms !important;` rule; set `--rj-duration-*` tokens to `0.001ms`, `--rj-motion-dist-*` to `0px`, and `--rj-transition-*` to `opacity 100ms ease`. |
| 4 | Skill CSS reference bugs | `recipes.md` contained invalid CSS `max-delay: 400ms;` and set `.rj-timeline-item { opacity: 0; }` outside `@supports (animation-timeline: view())`. | Use valid CSS `min(calc(var(--stagger-index, 0) * var(--rj-motion-stagger-normal)), var(--rj-motion-stagger-cap))` and gate scroll-driven initial `opacity: 0` inside `@supports` + `prefers-reduced-motion: no-preference`. |
| 5 | Elevation shadow tint mismatch | `design-tokens.css` used warm-black `rgba(26, 22, 21, ...)` while `DESIGN_SYSTEM.md` specified cool navy `rgba(12, 26, 48, ...)`. | Align `--rj-shadow-1..4` to cool navy `rgba(11, 26, 44, ...)` (`#0B1A2C`) across both `design-tokens.css` and `DESIGN_SYSTEM.md`. |
| 6 | M1a sidebar toggle | `SharedAppLayout.tsx` rendered visible text `<span className="rj-sidebar-toggle-text">`, swapped SVG icon names, and lacked an Escape-dismissible hover/focus tooltip. | Render icon-only `<button type="button">` with `aria-expanded`, `aria-controls`, dynamic Vietnamese `aria-label`, `>= 44px` hit target, CSS `transform` flip, and hover/focus tooltip `<= 200ms`. |
| 7 | M1b theme switch | `SharedAppLayout.tsx` rendered `<button aria-pressed={isDark}>` with visible text (`Chế độ sáng` / `Chế độ tối`) and a changing `aria-label`. | Replace with `<button type="button" role="switch" aria-checked={isDark} aria-label="Chế độ tối">` (static label), sun/moon `<Icon />` inside track/thumb, `150ms` spring thumb slide, and `>= 3:1` boundary contrast. |

---

## 2. Six-Pillar Research Findings / Tổng Hợp Nghiên Cứu Theo 6 Trụ Cột

Every source below was read and synthesized on `2026-11-19`. Takeaways are summarized in our own words and mapped directly to Rikkei Jobs decisions.

Mỗi tài liệu dưới đây được đọc và tổng hợp vào ngày `2026-11-19`, tóm lược lại các điểm cốt lõi và ánh xạ trực tiếp vào giải pháp kỹ thuật cho Rikkei Jobs.

### Pillar A: WAI-ARIA Authoring Practices (APG) & WCAG 2.2 / Trụ Cột A: Chuẩn WAI-ARIA APG & WCAG 2.2

#### A1. WAI-ARIA APG — Switch Pattern

- **Date Read / Ngày đọc**: `2026-11-19`
- **URL**: `https://www.w3.org/WAI/ARIA/apg/patterns/switch/`
- **Key Takeaways (EN)**:
  1. A switch represents an unambiguous binary on/off state using `role="switch"` and `aria-checked="true"` or `"false"` (`mixed` is invalid).
  2. Keyboard operation requires `Space` to toggle, while `Enter` is natively supported and recommended when built on `<button type="button" role="switch">`.
  3. The accessible name (`aria-label`) must stay **constant** regardless of state; mutating the label on toggle causes screen readers to announce confusing inverse phrases, while decorative ON/OFF labels inside the control must use `aria-hidden="true"`.
- **Điểm rút ra (VI)**:
  1. Công tắc chỉ mang hai trạng thái nhị phân rõ ràng qua `role="switch"` và `aria-checked="true"|"false"` (không dùng `mixed`).
  2. Thao tác bàn phím bắt buộc hỗ trợ `Space` (và `Enter` tự nhiên khi đặt trên thẻ `<button type="button">`).
  3. Nhãn tiếp cận (`aria-label`) phải **cố định** khi chuyển trạng thái; thay đổi nhãn theo trạng thái sẽ khiến trình đọc màn hình đọc sai ngữ nghĩa đảo ngược, còn biểu tượng mặt trời/mặt trăng bên trong cần gắn `aria-hidden="true"`.
- **Application to Rikkei Jobs**: M1b theme switch uses `<button type="button" role="switch" aria-checked={isDark} aria-label="Chế độ tối">` with sun/moon `<Icon />` elements marked `aria-hidden="true"`.

#### A2. WAI-ARIA APG — Disclosure Pattern

- **Date Read / Ngày đọc**: `2026-11-19`
- **URL**: `https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/`
- **Key Takeaways (EN)**:
  1. A disclosure control uses a native `<button type="button">` with `aria-expanded="true"` or `"false"` reflecting the controlled container's state.
  2. `aria-controls` links the button directly to the controlled landmark or panel `id`.
  3. Native `<button>` elements automatically provide `Enter` and `Space` activation without custom key handlers.
- **Điểm rút ra (VI)**:
  1. Nút đóng/mở vùng nội dung sử dụng `<button type="button">` kèm `aria-expanded="true"|"false"` phản ánh đúng trạng thái hiện tại.
  2. Thuộc tính `aria-controls` liên kết nút bấm tới `id` của thanh điều hướng được điều khiển.
  3. Thẻ `<button>` chuẩn tự hỗ trợ kích hoạt bằng `Enter` và `Space` mà không cần viết thêm bộ lắng nghe phím thủ công.
- **Application to Rikkei Jobs**: M1a sidebar toggle keeps `<button type="button" aria-expanded={!isCollapsedRail} aria-controls={sidebarId}>`, dynamic Vietnamese `aria-label` (`"Thu gọn thanh điều hướng"` / `"Mở rộng thanh điều hướng"`), icon-only visual presentation, and CSS `transform` flip instead of swapping SVG icon names.

#### A3. WAI-ARIA APG Tooltip Pattern, Accessible Names/Descriptions & WCAG 2.2 SC 1.4.13

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/`
  - `https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/`
  - `https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html`
- **Key Takeaways (EN)**:
  1. Tooltips carry `role="tooltip"`, stay non-focusable, open on both pointer hover and keyboard focus, and close on `Escape`, blur, or pointer exit.
  2. WCAG 2.2 SC 1.4.13 requires hover/focus content to be **Dismissible** (`Escape` hides without moving focus), **Hoverable** (pointer can cross onto the tooltip), and **Persistent** (stays open until dismissed or focus/hover leaves).
  3. `aria-label` supplies the primary accessible name, while `aria-describedby` provides supplementary detail; linking `aria-describedby` to a tooltip that repeats `aria-label` verbatim creates redundant double speech in screen readers.
- **Điểm rút ra (VI)**:
  1. Tooltip mang `role="tooltip"`, không nhận focus, hiển thị khi cả di chuột lẫn focus bàn phím và đóng khi nhấn `Escape` hoặc rời focus/hover.
  2. WCAG 2.2 SC 1.4.13 yêu cầu ba điều kiện: **Có thể đóng** (`Escape` ẩn ngay mà không dời focus), **Có thể rê chuột qua** (không biến mất khi con trỏ đi vào vùng tooltip), và **Bền vững** (giữ nguyên tới khi rời focus/hover hoặc nhấn `Escape`).
  3. `aria-label` là tên chính, còn `aria-describedby` chỉ nên dùng cho mô tả bổ sung; trỏ `aria-describedby` vào tooltip lặp lại y nguyên `aria-label` sẽ khiến trình đọc màn hình đọc trùng hai lần.
- **Application to Rikkei Jobs**: Both the M1a sidebar toggle tooltip and collapsed-rail nav tooltips reveal within `180ms` (`<= 200ms`), support hover bridging and `Escape` dismissal across both expanded and collapsed sidebar states, and avoid duplicate speech on the toggle button.

---

### Pillar B: MDN Web Docs, web.dev & Chrome for Developers / Trụ Cột B: Tài Liệu Nền Tảng Web

#### B1. CSS `linear()` Easing Function

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear`
  - `https://developer.chrome.com/docs/css-ui/css-linear-easing-function`
- **Key Takeaways (EN)**:
  1. `linear()` defines piecewise linear interpolation points that can exceed `1` or dip below `0`, producing genuine damped-spring motion in pure CSS with zero JS runtime cost.
  2. Percentages can pinpoint spring inflection vertices while evenly spacing intermediate stops.
  3. **Custom property fallback trap**: Writing `--ease: cubic-bezier(...); --ease: linear(...);` does not fall back at `var(--ease)` usage time on older browsers because custom properties accept arbitrary syntax until substitution; fallback `cubic-bezier()` tokens must live on `:root` and be overridden inside `@supports (animation-timing-function: linear(0, 1))`.
- **Điểm rút ra (VI)**:
  1. Hàm `linear()` nội suy từng đoạn tuyến tính cho phép giá trị vượt nhẹ `1`, tái tạo chuyển động lò xo giảm chấn hoàn toàn bằng CSS mà không tốn JS.
  2. Chỉ định phần trăm tại các điểm uốn giúp mô phỏng chính xác đường cong lò xo với số lượng điểm gọn.
  3. **Bẫy fallback với biến CSS**: Ghi đè `--ease` trực tiếp trên `:root` không tự quay lui về `cubic-bezier` ở trình duyệt cũ; cần khai báo `cubic-bezier()` trên `:root` và nâng cấp biến bên trong `@supports (animation-timing-function: linear(0, 1))`.
- **Application to Rikkei Jobs**: `--rj-ease-spring-snappy`, `--rj-ease-spring-stiff`, and `--rj-ease-spring-gentle` define `cubic-bezier()` baselines on `:root` and upgrade to calibrated `linear()` springs inside `@supports`.

#### B2. Entry & Exit Animations (`@starting-style` and `transition-behavior: allow-discrete`)

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style`
  - `https://developer.chrome.com/blog/entry-exit-animations`
- **Key Takeaways (EN)**:
  1. `@starting-style` supplies initial before-paint styles so elements transitioning from `display: none` or newly inserted DOM nodes animate cleanly without `requestAnimationFrame` workarounds.
  2. `transition-behavior: allow-discrete` defers flipping `display: none` until exit transitions complete.
  3. Because both features are Baseline Newly Available (Aug 2024), putting final visible rules outside `@starting-style` provides automatic zero-breakage progressive enhancement.
- **Điểm rút ra (VI)**:
  1. `@starting-style` xác định trạng thái khởi đầu trước lần vẽ đầu tiên để các phần tử chuyển từ `display: none` hoặc mới gắn vào DOM mở mượt mà không cần mẹo `requestAnimationFrame`.
  2. `transition-behavior: allow-discrete` giữ phần tử hiển thị tới khi chuyển động đóng kết thúc rồi mới chuyển `display: none`.
  3. Đặt trạng thái cuối ngoài `@starting-style` bảo đảm các trình duyệt cũ vẫn hiển thị ngay lập tức mà không lỗi bố cục.
- **Application to Rikkei Jobs**: Applied as progressive enhancement on `<Select />` listbox portals, tooltips, dialogs, and toast alerts.

#### B3. Same-Document View Transitions API

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API`
  - `https://developer.chrome.com/docs/web-platform/view-transitions`
- **Key Takeaways (EN)**:
  1. `document.startViewTransition(updateDOM)` captures old and new DOM snapshots and composites `::view-transition-old(root)` and `::view-transition-new(root)` smoothly on the GPU.
  2. Single-page React apps use same-document `document.startViewTransition()`, whereas `@view-transition { navigation: auto; }` targets multi-page document navigation.
  3. Feature detection (`typeof document.startViewTransition === 'function'`) plus `prefers-reduced-motion` guarding preserves instant navigation where unsupported.
- **Điểm rút ra (VI)**:
  1. `document.startViewTransition(updateDOM)` chụp trạng thái DOM cũ và mới rồi tổng hợp hoạt ảnh chuyển cảnh mượt trên GPU qua `::view-transition-old(root)` và `::view-transition-new(root)`.
  2. Ứng dụng React SPA dùng API cùng tài liệu `document.startViewTransition()`, khác với quy tắc `@view-transition` của MPA.
  3. Kiểm tra tồn tại hàm và điều kiện `prefers-reduced-motion` giúp fallback tức thì an toàn ở mọi môi trường.
- **Application to Rikkei Jobs**: `navigateWithTransition` in `frontend/src/shared/utils/motion.ts` stays intact and `design-tokens.css` calibrates `::view-transition-old(root)` (`140ms`) and `::view-transition-new(root)` (`280ms`, `<= 400ms` Rule 09).

#### B4. Web Animations API (WAAPI) & `document.getAnimations()`

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API`
  - `https://developer.mozilla.org/en-US/docs/Web/API/Document/getAnimations`
- **Key Takeaways (EN)**:
  1. `Element.animate()` executes compositor-friendly keyframe animations off the main thread, supports `linear()` easing strings, and exposes `.finished` promises plus `.cancel()`/`.reverse()`.
  2. WAAPI solves imperative FLIP list-reordering animations (`getBoundingClientRect()` delta inversion) without third-party animation libraries.
  3. `document.getAnimations()` exposes live CSS transitions, CSS animations, and WAAPI animations for objective measurement in browser verification.
- **Điểm rút ra (VI)**:
  1. `Element.animate()` chạy hoạt ảnh keyframe trên compositor thread, hỗ trợ chuỗi easing `linear()`, trả về Promise `.finished` và cho phép hủy hoặc đảo ngược mượt.
  2. WAAPI giúp triển khai hoạt ảnh sắp xếp lại danh sách kiểu FLIP hoàn toàn không cần thư viện ngoài.
  3. `document.getAnimations()` liệt kê toàn bộ hoạt ảnh và transition đang chạy để đo đạc khách quan trong bước kiểm chứng trình duyệt.
- **Application to Rikkei Jobs**: Added tiny zero-dependency `prefersReducedMotion()`, `getStaggerStyle()`, `animateFlip()`, and `animateElement()` helpers to `frontend/src/shared/utils/motion.ts`.

#### B5. CSS Scroll-Driven Animations

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline`
  - `https://developer.chrome.com/docs/css-ui/scroll-driven-animations`
- **Key Takeaways (EN)**:
  1. `animation-timeline: scroll()` and `view()` drive progress indicators and section reveals on the compositor without JS scroll listeners.
  2. Browser adoption only reached Baseline Newly Available in Oct 2026 (`Safari 26.0+`, `Firefox 159+`), so older browsers remain common in enterprise settings.
  3. Initial hidden states (`opacity: 0`) must NEVER sit outside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`, otherwise content becomes permanently invisible on unsupported or reduced-motion browsers.
- **Điểm rút ra (VI)**:
  1. `animation-timeline: scroll()` và `view()` đồng bộ hoạt ảnh theo cuộn trang ngay trên compositor mà không cần bộ lắng nghe `scroll` bằng JS.
  2. Do mức phủ trình duyệt mới đạt chuẩn gần đây, nhiều trình duyệt doanh nghiệp chưa hỗ trợ đầy đủ.
  3. Trạng thái ẩn ban đầu (`opacity: 0`) bắt buộc phải đặt bên trong `@supports (animation-timeline: view())` và `prefers-reduced-motion: no-preference` để nội dung luôn hiển thị mặc định ở mọi trình duyệt.
- **Application to Rikkei Jobs**: Restrict scroll-driven rules strictly to subtle non-blocking indicators on candidate/public pages inside `@supports` + `no-preference`, never hiding content by default and never on dense HR/Admin tables.

#### B6. `interpolate-size` & `calc-size()`

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://developer.chrome.com/docs/css-ui/animate-to-height-auto`
  - `https://web.dev/articles/animate-to-height-auto`
- **Key Takeaways (EN)**:
  1. `interpolate-size: allow-keywords` and `calc-size()` allow native interpolation toward `height: auto`.
  2. Support remains Chromium-only (Limited Availability as of Nov 2026; absent in Firefox and Safari).
  3. Animating `height` still recalculates layout every frame, hurting frame pacing on complex cards.
- **Điểm rút ra (VI)**:
  1. `interpolate-size: allow-keywords` và `calc-size()` cho phép nội suy trực tiếp tới `height: auto`.
  2. Hiện mới chỉ hỗ trợ trên nhân Chromium (chưa có trên Firefox và Safari).
  3. Hoạt ảnh thay đổi `height` vẫn kích hoạt tính toán lại bố cục mỗi khung hình.
- **Application to Rikkei Jobs**: Avoid `interpolate-size`/`calc-size()` for core accordions or sidebars; prefer `transform`/`opacity` or Baseline `grid-template-rows: 0fr -> 1fr` + opacity fade (`<= 300ms`) for collapsible helper panels.

#### B7. Compositor-Only Properties, CLS = 0 & `prefers-reduced-motion`

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://web.dev/articles/animations-guide`
  - `https://web.dev/articles/cls`
  - `https://web.dev/articles/prefers-reduced-motion`
- **Key Takeaways (EN)**:
  1. Animating `transform` and `opacity` stays on the GPU compositor, avoiding costly Layout and Paint stages.
  2. Reserving explicit dimensions for async skeletons and images prevents unexpected layout shifts (`CLS = 0`), while shifts within `500ms` of discrete user clicks are excluded by the Layout Instability API.
  3. `prefers-reduced-motion: reduce` means **reducing** vestibular spatial motion (translation, scale zooms) and replacing it with calm opacity cross-fades (`~100ms`), not removing all state feedback.
- **Điểm rút ra (VI)**:
  1. Giới hạn hoạt ảnh ở `transform` và `opacity` giúp chạy trực tiếp trên GPU compositor, tránh tái tính toán Layout và Paint.
  2. Dự trữ đúng kích thước khung cho skeleton và ảnh giúp giữ `CLS = 0` khi tải trang, trong khi thay đổi bố cục do người dùng bấm trực tiếp (trong cửa sổ `500ms`) không bị tính vào CLS.
  3. `prefers-reduced-motion: reduce` có nghĩa là **giảm** chuyển động dịch chuyển không gian và thay bằng chuyển mờ `opacity` dịu nhẹ (`~100ms`), không phải xóa sạch mọi phản hồi trạng thái.
- **Application to Rikkei Jobs**: Fixed `design-tokens.css` reduced-motion media query so transitions fall back to `opacity 100ms ease`, spatial distances reset to `0px`, and duration tokens reset to `0.001ms` (preserving WebKit `transitionend`).

---

### Pillar C: Browser Support Matrix & Progressive Enhancement / Trụ Cột C: Ma Trận Trình Duyệt & Nâng Cấp Lũy Tiến

| Feature / Tính năng | Chrome / Edge | Firefox | Safari | Baseline Status (`2026-11`) | Progressive Enhancement Strategy / Chiến lược Fallback |
|---|---|---|---|---|---|
| `linear()` CSS easing | `113+` | `112+` | `17.2+` | Widely Available | Define `cubic-bezier()` on `:root`; upgrade `--rj-ease-spring-*` inside `@supports (animation-timing-function: linear(0, 1))`. |
| `@starting-style` + `allow-discrete` | `117+` | `129+` | `17.5+` | Newly Available | Keep steady-state open/closed CSS outside `@starting-style`; unsupported browsers show/hide cleanly without broken state. |
| Same-document `document.startViewTransition` | `111+` | `144+` | `18.0+` | Newly Available | Runtime check in `motion.ts` (`typeof document.startViewTransition === 'function'` and `!prefersReducedMotion()`); degrades to direct DOM update. |
| Cross-document `@view-transition` | `126+` | Pending | `18.2+` | Limited (MPA only) | Not used; Rikkei Jobs is a React SPA using same-document transitions. |
| Scroll-driven animations (`scroll()` / `view()`) | `115+` | `159+` | `26.0+` | Newly Available | Gate 100% inside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`; default remains `opacity: 1`. |
| `interpolate-size` & `calc-size()` | `129+` | Unsupported | Unsupported | Limited Availability | Not used for core UI; use `transform`/`opacity` or `grid-template-rows: 0fr -> 1fr`. |

---

### Pillar D: Apple HIG & Material Design 3 Motion / Trụ Cột D: Chuẩn Chuyển Động Apple HIG & Material Design 3

#### D1. Apple Human Interface Guidelines — Motion & Accessibility

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://developer.apple.com/design/human-interface-guidelines/motion`
  - `https://developer.apple.com/design/human-interface-guidelines/accessibility`
- **Key Takeaways (EN)**:
  1. Motion must clarify spatial relationships, maintain continuity, and confirm user input briefly without ever blocking interaction.
  2. Critically or lightly damped springs give physical tactility and immediate responsiveness to controls.
  3. Under Reduce Motion, remove z-axis scaling, multi-axis travel, and oscillation, substituting gentle cross-fades.
- **Điểm rút ra (VI)**:
  1. Chuyển động cần làm rõ quan hệ không gian, duy trì mạch liên tục và phản hồi thao tác ngắn gọn, không cản trở người dùng.
  2. Chuyển động lò xo giảm chấn nhẹ tạo cảm giác chân thực và phản hồi tức thì cho các điều khiển tương tác.
  3. Khi bật Giảm chuyển động, cần bỏ phóng đại trục z, dịch chuyển nhiều trục và dao động bật nảy, thay bằng hiệu ứng chuyển mờ nhẹ.
- **Application to Rikkei Jobs**: M1b theme switch thumb uses a low-overshoot (`~1%`) `150ms` spring; M1a sidebar toggle rotates/flips smoothly over `150ms` and collapses cleanly under reduced motion.

#### D2. Material Design 3 (M3) Motion — Tokens & Expressive Physics

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://m3.material.io/styles/motion/overview`
  - `https://m3.material.io/styles/motion/easing-and-duration/tokens-specs`
- **Key Takeaways (EN)**:
  1. M3 separates **Standard** (utilitarian, quick micro-interactions) from **Emphasized** (expressive reveals) curves, with fast-out/slow-in deceleration on entrance and crisp acceleration on exit.
  2. **Spatial vs. Effects separation**: Spatial attributes (position, scale, rotation) may use damped springs with subtle settle, whereas **Effects** (`opacity`, color, background) must NEVER overshoot — they use smooth non-overshooting easing.
  3. Coordinated container transforms animate outer bounds first while inner content cross-fades cleanly without competing layers.
- **Điểm rút ra (VI)**:
  1. M3 phân tách rõ nhóm đường cong **Standard** (vi tương tác nhanh) và **Emphasized** (xuất hiện có điểm nhấn), đồng thời vào giảm tốc, ra tăng tốc gọn.
  2. **Tách bạch Không gian và Hiệu ứng**: Thuộc tính không gian (`transform`) dùng được đường cong lò xo, còn thuộc tính hiệu ứng (`opacity`, màu nền) tuyệt đối không vọt lố (`overshoot`) mà dùng đường cong giảm tốc thuần.
  3. Phối hợp lớp vỏ chứa di chuyển định vị trước rồi nội dung bên trong chuyển mờ tiếp nối, tránh nhiều lớp tranh chấp sự chú ý.
- **Application to Rikkei Jobs**: Enforced the **Spatial vs. Effects** split in `design-tokens.css` (`--rj-transition-hover`, `--rj-transition-entrance`, `--rj-transition-dialog` bind `--rj-ease-spring-*` to `transform` and `--rj-ease-hover`/`--rj-ease-entrance` to `opacity`/color).

---

### Pillar E: Nielsen Norman Group (NN/g) — Perceived Performance / Trụ Cột E: Nghiên Cứu Trải Nghiệm NN/g

#### E1. Response Times: The 3 Important Limits

- **Date Read / Ngày đọc**: `2026-11-19`
- **URL**: `https://www.nngroup.com/articles/response-times-3-important-limits/`
- **Key Takeaways (EN)**:
  1. `0.1s` (`100ms`) is the perceptual threshold where an interface feels directly manipulated by the user's hand.
  2. `1.0s` is the upper bound for maintaining uninterrupted mental flow without needing progress feedback.
  3. Beyond `10s`, attention wanders and explicit progress or cancellation becomes mandatory.
- **Điểm rút ra (VI)**:
  1. Ngưỡng `0.1 giây` (`100ms`) giúp người dùng cảm nhận giao diện phản hồi trực tiếp như chạm tay thật.
  2. Ngưỡng `1.0 giây` là giới hạn giữ mạch suy nghĩ liền mạch trước khi cần chỉ báo đang xử lý.
  3. Vượt quá `10 giây`, sự tập trung suy giảm mạnh nếu thiếu phản hồi tiến trình rõ ràng.
- **Application to Rikkei Jobs**: Active button press (`--rj-duration-micro: 100ms`), focus halos, and dense table row hover (`<= 150ms`) keep manipulation instantaneous.

#### E2. Executing UX Animations: Duration and Motion Characteristics

- **Date Read / Ngày đọc**: `2026-11-19`
- **URL**: `https://www.nngroup.com/articles/ux-animations-duration/`
- **Key Takeaways (EN)**:
  1. `100ms` works best for instantaneous micro-feedback (toggles, checkboxes, press states).
  2. `200ms–300ms` fits larger spatial transitions (drawers, dialogs, menus) so eye tracking stays comfortable.
  3. Animations exceeding `400ms–500ms` feel sluggish; exits should run noticeably faster than entrances.
- **Điểm rút ra (VI)**:
  1. `100ms` phù hợp cho vi tương tác tức thời (nút bấm, công tắc, ô chọn).
  2. `200ms–300ms` phù hợp cho chuyển vị diện rộng (ngăn kéo, hộp thoại, bảng chọn) để mắt theo dõi tự nhiên.
  3. Chuyển động kéo dài quá `400ms–500ms` gây cảm giác ì ạch; thời lượng đóng/thoát phải luôn nhanh hơn lúc mở/vào.
- **Application to Rikkei Jobs**: Asymmetric durations — tooltips/popovers `180ms` enter / `150ms` exit; dialogs/drawers `280ms` enter / `150ms` exit; route transitions `140ms` old-out / `280ms` new-in.

#### E3. Skeleton Screens 101

- **Date Read / Ngày đọc**: `2026-11-19`
- **URL**: `https://www.nngroup.com/articles/skeleton-screens/`
- **Key Takeaways (EN)**:
  1. Skeleton screens belong on full-page or multi-card data fetches, not short sub-300ms updates or single buttons.
  2. Matching the real layout silhouette reduces perceived wait time by setting accurate visual expectations.
  3. Replacing skeletons with resolved data via a brief `~150ms` opacity cross-fade avoids jarring snaps while preserving `CLS = 0`.
- **Điểm rút ra (VI)**:
  1. Skeleton chỉ nên dùng cho tải trang hoặc danh sách nhiều thẻ, không dùng cho nút nhỏ hay thao tác quá nhanh.
  2. Khung skeleton khớp hình dáng thật của thẻ/bảng giúp giảm cảm giác chờ đợi và giữ ổn định thị giác.
  3. Chuyển tiếp từ skeleton sang dữ liệu thật bằng hiệu ứng mờ `~150ms` giúp êm mắt và giữ `CLS = 0`.
- **Application to Rikkei Jobs**: Shared skeletons match exact `56px` airy / `38px` dense geometry with a WCAG 2.3.1-safe pulse (`>= 1.6s`) and `150ms` resolution cross-fade.

---

### Pillar F: Practitioner Craft & Anti-"AI Look" / Trụ Cột F: Kỹ Nghệ Thiết Kế & Chống Rập Khuôn AI

#### F1. Emil Kowalski — *Great Animations* & *Why Animations Matter*

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://emilkowal.ski/ui/great-animations`
  - `https://emilkowal.ski/ui/why-animations-matter`
- **Key Takeaways (EN)**:
  1. Restraint defines craft: keep UI transitions crisp (`< 300ms`) and animate only purposeful state changes.
  2. Origin-aware motion anchors popovers and dropdowns to their trigger (`transform-origin` + `4px–8px` offset + `scale(0.97 -> 1)`) instead of floating from nowhere.
  3. High-frequency interactions (table rows, nav links, dropdown triggers) must prioritize speed and immediate interruption over theatrical weight.
- **Điểm rút ra (VI)**:
  1. Sự tiết chế tạo nên đẳng cấp: giữ chuyển động gọn dưới `300ms` và chỉ tạo hoạt ảnh cho thay đổi trạng thái có chủ đích.
  2. Chuyển động bám gốc kích hoạt (`transform-origin` theo vị trí nút mở + dịch nhẹ `4px–8px` + `scale(0.97 -> 1)`) giúp menu và tooltip có neo không gian rõ ràng.
  3. Thao tác lặp tần suất cao (rê hàng bảng, mở menu) phải ưu tiên phản hồi nhanh và ngắt quãng mượt thay vì nặng nề phô trương.
- **Application to Rikkei Jobs**: Origin-aware tooltip and `<Select />` reveals (`180ms` `<= 200ms`); zero vertical shift on dense admin tables (`<= 150ms`).

#### F2. Josh W. Comeau — *CSS Transitions* & *Springs in Native CSS (`linear()`)*

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://www.joshwcomeau.com/animation/css-transitions/`
  - `https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/`
  - `https://www.joshwcomeau.com/css/linear-timing-function/`
- **Key Takeaways (EN)**:
  1. Symmetric `ease-in-out` feels sluggish at the start of an interaction; `ease-out` and spring curves react immediately at `t = 0`.
  2. `linear()` brings physical damped springs to CSS without JS runtime loops.
  3. Because CSS `linear()` runs on fixed duration and cannot preserve mid-flight velocity during rapid reversals, keeping spring durations short (`150ms–280ms`) and overshoot minimal (`<= 1.0%`) prevents abrupt snaps.
- **Điểm rút ra (VI)**:
  1. Đường cong `ease-in-out` đối xứng tạo cảm giác trễ khi bắt đầu; `ease-out` hoặc lò xo phản hồi ngay từ khoảnh khắc `t = 0`.
  2. `linear()` mang vật lý lò xo giảm chấn vào CSS thuần mà không tốn vòng lặp JS.
  3. Vì `linear()` chạy theo thời lượng cố định và không giữ vận tốc khi đảo chiều đột ngột, giữ thời lượng ngắn (`150ms–280ms`) và độ vọt lố nhỏ (`<= 1.0%`) giúp thao tác liên tục vẫn tự nhiên.
- **Application to Rikkei Jobs**: Calibrated `--rj-ease-spring-snappy` (`~1.0%` overshoot), `--rj-ease-spring-stiff` (`~0.3%` overshoot), and `--rj-ease-spring-gentle` (`0%` overshoot).

#### F3. Rauno Freiberg & Vercel Labs — *Web Interface Guidelines* & *Devouring Details*

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://interfaces.rauno.me/`
  - `https://github.com/vercel-labs/web-design-guidelines`
  - `https://devouringdetails.com/`
- **Key Takeaways (EN)**:
  1. Tactile micro-feedback (`scale(0.98)` or `2px` active press), expanded `>= 44x44px` hit areas around compact icons, and `tabular-nums` prevent jitter and improve perceived precision.
  2. Guard pointer-hover lifts behind `@media (hover: hover)` so touch taps on mobile (`375px`) do not leave sticky hover states.
  3. Avoid blanket `will-change` declarations; reserve GPU hints only for verified active transitions.
- **Điểm rút ra (VI)**:
  1. Phản hồi nhấn xúc giác (`2px` hoặc `scale(0.98)`), mở rộng vùng chạm tối thiểu `44x44px` quanh biểu tượng nhỏ và dùng `tabular-nums` giúp giao diện chắc tay và không nhảy số.
  2. Bọc hiệu ứng hover trong `@media (hover: hover)` để thao tác chạm trên di động (`375px`) không bị kẹt trạng thái hover.
  3. Tránh đặt `will-change` tràn lan; chỉ dùng có đo đạc khi thực sự cần thiết.
- **Application to Rikkei Jobs**: Both M1a sidebar toggle and M1b theme switch guarantee `>= 44x44px` hit areas inside a `56px` header without visual bloat; pointer hover refinements use `@media (hover: hover)`.

#### F4. Linear & Stripe Design Engineering + Anti-"AI Slop" Guidelines

- **Date Read / Ngày đọc**: `2026-11-19`
- **URLs**:
  - `https://linear.app/now/how-we-redesigned-the-linear-ui`
  - `https://stripe.com/blog/connect-front-end-experience`
  - `https://github.com/vercel-labs/web-design-guidelines`
- **Key Takeaways (EN)**:
  1. **Calmer Visual Hierarchy**: Crisp `1px` borders, subtle tonal surface stepping (`#EEF2F8 -> #FFFFFF` light; `#0B1019 -> #101724 -> #162030 -> #1E2C42` dark), and a single confident brand accent (`#0D55B8` / `#508CEE`) replace heavy blurry shadows.
  2. **Cool Shadow Harmony**: Shadows should be tinted from the palette's own dark slate/navy hue (`rgba(11, 26, 44, ...)`), never warm-brown black or neon glow, so elevated cards look grounded and clean.
  3. **Anti-"AI Slop" Discipline**: Reject purple-blue gradients, frosted glass cards, symmetrical 3-column feature grids, emojis, bouncing animations, unbounded fade-up cascades, and self-congratulatory technical buzzwords on user screens.
- **Điểm rút ra (VI)**:
  1. **Phân cấp thị giác trầm tĩnh**: Viền mảnh `1px` sắc nét, bậc bề mặt chuyển tông tinh tế và một sắc xanh thương hiệu tự tin (`#0D55B8` / `#508CEE`) thay thế cho bóng đổ mờ nặng nề.
  2. **Hài hòa sắc độ bóng đổ**: Bóng đổ cần pha từ chính sắc xanh đen lạnh của bảng màu (`rgba(11, 26, 44, ...)`) thay vì đen ấm hoặc ánh neon phát sáng, giúp thẻ nổi sạch sẽ trên nền xám thép lạnh.
  3. **Kỷ luật chống giao diện AI**: Loại bỏ gradient tím-xanh, kính mờ trên thẻ nội dung, lưới 3 cột đối xứng rập khuôn, emoji, hoạt ảnh bật nảy và khẩu hiệu khoe công nghệ trên màn hình người dùng.
- **Application to Rikkei Jobs**: Aligned `--rj-shadow-1..4` in `design-tokens.css` from warm-black `rgba(26, 22, 21, ...)` to cool navy `rgba(11, 26, 44, ...)`, documented in `DESIGN_SYSTEM.md`.

---

## 3. Calibrated Motion Language Specification / Đặc Tả Ngôn Ngữ Chuyển Động

### 3.1. Rule 09 Budget Compliance Matrix / Ma Trận Tuân Thủ Ngân Sách Rule 09

| Interaction Category / Nhóm tương tác | Rule 09 Budget | Token(s) | Calibrated Value | Permitted Easing (Spatial vs. Effects) | Animated Properties |
|---|---|---|---|---|---|
| Micro-interactions (hover, press, switch, focus) | `<= 150ms` | `--rj-duration-micro`, `--rj-duration-fast` | `100ms` / `150ms` | Spatial: `--rj-ease-spring-snappy` (`transform`); Effects: `--rj-ease-hover` (`opacity`, color) | `transform`, `opacity`, crisp `background-color`/`border-color` |
| Tooltips & Popovers (menus, `<Select />` listbox) | `<= 200ms` | `--rj-duration-normal` | `180ms` enter / `150ms` exit | Spatial: `--rj-ease-spring-stiff`; Effects: `--rj-ease-entrance` / `--rj-ease-exit` | `transform` (`translateY`/`scale`), `opacity` |
| Dialogs, Drawers & Accordions | `<= 300ms` | `--rj-duration-base` (alias), `--rj-duration-moderate` | `280ms` enter / `150ms` exit (`250ms` drawer alias) | Spatial: `--rj-ease-spring-gentle` (`0%` overshoot); Effects: `--rj-ease-entrance` / `--rj-ease-exit` | `transform`, `opacity` |
| Route View Transitions & Hero Reveals | `<= 400ms` | `--rj-duration-slow` | `140ms` old-out / `280ms` new-in / `360ms` hero cap | `--rj-ease-entrance`, `--rj-ease-exit` | `opacity`, subtle `transform` (`translateY`/`scale`) |
| SVG Stroke Draw & Data-Viz Reveals | `<= 600ms` | `--rj-duration-deliberate` | `550ms` | `--rj-ease-entrance` | `stroke-dashoffset`, `transform`, `opacity` |
| Admin Data-Dense Surfaces (`[data-density="dense"]`) | `<= 150ms` | Dense overrides (`--rj-duration-normal: 120ms`, `--rj-duration-moderate: 150ms`) | `<= 150ms` | `--rj-ease-hover`, `--rj-ease-standard` | `opacity`, `background-color` (zero vertical row lift) |
| Reduced Motion (`prefers-reduced-motion: reduce`) | `0.001ms` + `100ms` cross-fade | All `--rj-duration-*` = `0.001ms`; `--rj-transition-*` = `opacity 100ms ease` | `0.001ms` / `100ms` | `ease` (opacity only, `0px` distance) | `opacity` cross-fade only |

### 3.2. Spatial vs. Effects Split, Stagger Formula & Layout Exception

1. **Spatial vs. Effects Split**: `linear()` springs (`--rj-ease-spring-snappy`, `--rj-ease-spring-stiff`, `--rj-ease-spring-gentle`) are restricted strictly to `transform` (`translate`, `scale`, `rotate`). `opacity` and color tokens always use non-overshooting `--rj-ease-entrance`, `--rj-ease-exit`, or `--rj-ease-hover`.
2. **Bounded Stagger Formula**:

   ```css
   animation-delay: min(
     calc(var(--stagger-index, 0) * var(--rj-motion-stagger-normal)),
     var(--rj-motion-stagger-cap)
   );
   ```

   With `--rj-motion-stagger-normal: 35ms`, `--rj-motion-stagger-cap: 220ms`, and `--rj-duration-normal: 180ms`, total choreography completes in `<= 400ms` (`220ms + 180ms = 400ms`), strictly obeying Rule 09.
3. **Documented Width Exception (Desktop Sidebar `280px <-> 72px`)**:
   - At page load, initial sidebar state is resolved synchronously in a `useState` lazy initializer reading `rj_sidebar_collapsed`, keeping **page-load `CLS = 0`**.
   - On explicit user click, desktop/tablet rail width transitions over `150ms` (`--rj-sidebar-transition-width`) so `<main>` (`flex: 1 1 0%; min-width: 0;`) reclaims `208px` smoothly; the W3C Layout Instability API excludes user-initiated shifts within `500ms` of click (`hadRecentInput = true`), keeping measured `CLS = 0`.
   - Mobile drawer (`< 768px`) animates purely via compositor `transform: translateX()` and backdrop `opacity`.

### 3.3. Shadow Elevation Alignment Rationale

Previously, `frontend/src/shared/styles/design-tokens.css` defined `--rj-shadow-1..4` using warm-black `rgba(26, 22, 21, ...)` (`#1A1615`), contrasting subtly against the cool steel canvas (`#EEF2F8`) and Royal Cobalt surfaces (`#0D55B8` / `#FFFFFF`). Aligning `--rj-shadow-1..4` to cool navy `rgba(11, 26, 44, ...)` (matching `--rj-primitive-neutral-900: #0B1A2C`) harmonizes elevation depth with both Light Mode steel surfaces and Dark Mode Iron Obsidian (`#0B1019`–`#1E2C42`) when paired with `1px` crisp borders.
