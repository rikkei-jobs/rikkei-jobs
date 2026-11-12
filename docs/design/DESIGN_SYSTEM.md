<!-- cspell:ignore glassmorphism monoline keyline keylines DTCG WAAPI UPM rgba Segoe Menlo Consolas Typekit tnum SVGSVG transitionend Uncurated Tokotype Rahayu -->

# Rikkei Jobs Design System & Anti-AI Standard

Tài liệu Đặc tả Thiết kế Hệ thống Giao diện & Tiêu chuẩn Chống Rập khuôn AI (Authoritative Specification & Anti-AI Standard).  
**Dự án**: Rikkei Jobs  
**Mã Nhiệm vụ**: T022DB0 (Milestone 1 - Design, Motion & Iconography System)  
**Tiêu chuẩn Tham chiếu**: W3C WCAG 2.2 AA / AAA, Apple Human Interface Guidelines, Google Material Design 3, W3C Design Tokens Community Group (DTCG).  
**Phiên bản**: 2.0.0-PROD (Enterprise Quality & Anti-AI Certified)

---

## 1. Executive Summary & Brand Identity

### 1.1. Sứ mệnh Sản phẩm (Product Mission)

Rikkei Jobs là nền tảng công nghệ cao kết nối chuỗi giá trị toàn diện từ **đào tạo thực chiến công nghệ thông tin** (Rikkei Academy) đến **tuyển dụng nhân sự CNTT chất lượng cao** (hệ sinh thái Rikkei và các đối tác công nghệ chiến lược tại Việt Nam, Nhật Bản và toàn cầu).

Hệ thống phục vụ 5 nhóm đối tượng mục tiêu với các nhu cầu tương tác chuyên biệt:

1. **Học viên & Ứng viên (Candidates / Students)**: Tìm kiếm việc làm, theo dõi lộ trình phỏng vấn, đánh giá mức độ tương thích kỹ năng (Skill Match Rate), tra cứu học bổng và chứng chỉ thực tập. Giao diện ưu tiên phong cách Thoáng đãng (Airy Mode), truyền cảm hứng, giảm áp lực tâm lý.
2. **Doanh nghiệp & Nhà tuyển dụng (Employers / Recruiters)**: Đăng tải vị trí tuyển dụng, lọc hồ sơ ứng viên theo tech stack chuyên sâu, thiết lập lịch phỏng vấn, quản lý quy trình đánh giá ứng viên (Recruitment Pipeline).
3. **Giảng viên & Chuyên gia Đánh giá (Mentors / Evaluators)**: Chấm điểm bài lab thực hành, đánh giá năng lực lập trình, cấp chứng chỉ kỹ năng (Skill Verification Badge).
4. **Cán bộ Vận hành & Tuyển trạch (Staff / Operations)**: Rà soát hàng trăm hồ sơ mỗi ngày, điều phối phỏng vấn, theo dõi báo cáo tuyển dụng.
5. **Quản trị viên Hệ thống (Admins)**: Quản lý cấu hình, phân quyền, kiểm soát luồng dữ liệu lớn với bảng dữ liệu mật độ cao (Dense Mode), tối đa hóa diện tích hiển thị above-the-fold.

### 1.2. Tính cách Thiết kế (Design Persona)

Ngôn ngữ thiết kế của Rikkei Jobs được xây dựng trên 4 trụ cột tính cách thương hiệu:

- **Chuyên nghiệp & Chuẩn mực (Professional & Authoritative)**: Thể hiện tính kỷ luật công nghệ của một tập đoàn IT hàng đầu theo chuẩn Nhật Bản. Mỗi thành phần giao diện đều có chủ đích, loại bỏ hoàn toàn các yếu tố trang trí rỗng tuếch.
- **Biên tập & Có chiều sâu (Editorial Product-grade)**: Cấu trúc thông tin có phân tầng rõ rệt, kết hợp kiểu chữ có bản sắc và tỷ lệ bố cục bất đối xứng 65/35 tinh tế, tạo cảm giác như một ấn bản số công nghệ cao cấp (tương tự phong cách của Stripe, Bloomberg Professional, The Verge).
- **Hiệu năng & Tối ưu Năng suất (High Efficiency & Data-focused)**: Tối đa hóa khả năng rà soát dữ liệu cho nhân sự quản trị, đồng thời mang lại trải nghiệm thư thái, truyền cảm hứng cho ứng viên qua kiến trúc mật độ kép (Dual-Density).
- **Tuyệt đối Chống Giao diện Rập khuôn AI (Anti-AI Cliché)**: Kiên quyết nói không với các mẫu template AI phổ biến (gradient tím - xanh, kính mờ bừa bãi, card 3 cột vô hồn, emoji cẩu thả).

### 1.3. Quy trình Thiết kế Hệ thống `ui-ux-pro-max` (6 Bước)

Hệ thống thiết kế Rikkei Jobs được xây dựng qua quy trình 6 bước khép kín từ nghiên cứu nghiệp vụ đến đóng gói kỹ thuật:

```text
[1. Product Type Analysis] (Đào tạo CNTT thực chiến + Tuyển dụng công nghệ cao)
       │
       ▼
[2. User Roles & Context Mapping] (5 nhóm người dùng: Candidate, Recruiter, Mentor, Staff, Admin)
       │
       ▼
[3. Visual Tone & Bespoke Color Space] (Bảng màu độc quyền, không dùng thang mặc định Tailwind)
       │
       ▼
[4. Vietnamese Typography Engineering] (Plus Jakarta Sans + Be Vietnam Pro + JetBrains Mono)
       │
       ▼
[5. Layout Asymmetry & Dual-Density] (Lưới 12 cột 65/35, Airy 56px vs Dense 36px, 4 States, 4 Signatures)
       │
       ▼
[6. Mechanical Verification & Anti-AI Rubric] (Toán học WCAG 2.2, zero emoji, proof screenshots)
```

---

## 2. Anti-AI Design Philosophy & Strict Prohibitions

### 2.1. Triết lý Thiết kế Chống Rập khuôn AI (Anti-AI Philosophy)

Trong kỷ nguyên của các mô hình sinh mã tự động (LLM & Coding Agents), một vấn nạn lớn là sự ra đời của hàng loạt giao diện "AI Look" giống hệt nhau: hào nhoáng bề ngoài nhưng yếu ớt về công năng, tương phản màu sắc kém cỏi, bố cục đều chằn chặn thiếu nhịp điệu thị giác và hoàn toàn vô cảm trước đặc thù văn hóa/ngôn ngữ bản địa.

Rikkei Jobs thiết lập một hệ thống ranh giới kỹ thuật bất khả xâm phạm. Bất kỳ đoạn mã giao diện nào vi phạm các ranh giới này đều bị hệ thống kiểm định tự động hoặc chuyên gia từ chối hợp nhất (Hard Veto).

### 2.2. Bảng Danh mục 8 Mẫu Cấm Tuyệt đối (Strict Prohibitions)

| Mã Cấm | Tên Mẫu Vi phạm | Biểu hiện Nhận diện Cụ thể (AI Clichés) | Giải pháp Kỹ thuật Thay thế Bắt buộc |
|---|---|---|---|
| **P-AI-01** | **Emoji trong Giao diện Người dùng** | Dùng emoji (ví dụ: biểu tượng tên lửa, ngôi sao, ngọn lửa, cặp xách, bóng đèn, ghim bấm) trong nhãn, button, placeholder, badge, error message hoặc test ID. | 100% biểu tượng dùng qua component `<Icon name="..." size={24} />` trên lưới chuẩn 24px, 2px stroke monoline. Tuyệt đối ZERO emoji trong toàn bộ giao diện và tài liệu. |
| **P-AI-02** | **Hero Gradient Tím - Xanh Rập khuôn** | Dải màu gradient phổ thông dạng `linear-gradient(to right, #6366f1, #3b82f6)` ở hero banner. | Nền màu phẳng vững chãi (`--rj-color-surface-page`), phân mảng kiến trúc bất đối xứng 65/35 hoặc thẻ số liệu neo thị giác. |
| **P-AI-03** | **Hiệu ứng Kính mờ (Glassmorphism bừa bãi)** | Lạm dụng `backdrop-filter: blur(...)` với nền bán trong suốt `bg-white/20` trên các thẻ nội dung quan trọng. | Sử dụng các tầng nâng bề mặt chuẩn (`--rj-primitive-elevation-1` đến `4`), nền mờ chỉ giới hạn cho header ghim và backdrop modal. |
| **P-AI-04** | **Lưới 3 Cột Thẻ Bo góc Đối xứng Vô hồn** | Hero căn giữa kèm theo bên dưới là 3 thẻ tính năng giống hệt nhau (`grid-cols-3 rounded-2xl`). | Bố cục nhịp điệu biên tập (editorial rhythm), phân tách trọng số cột theo tỷ lệ bất đối xứng 65/35 (8 cột nội dung / 4 cột tiện ích neo cố định). |
| **P-AI-05** | **Typography Phẳng lì / Lạm dụng Inter Mặc định** | Sử dụng font Inter thuần túy không tinh chỉnh phân cấp, chữ xám mờ nhạt (`#94A3B8`) trên nền trắng gây mỏi mắt, xén ngọn dấu tiếng Việt. | Bộ font phối hợp có chủ đích: Plus Jakarta Sans (Display) + Be Vietnam Pro (Body) + JetBrains Mono (Code/Tabular). Line-height >= 1.5, độ tương phản văn bản luôn $\ge 4.5:1$. |
| **P-AI-06** | **Icon Stock Thô Nhập Trực tiếp** | Nhập tự do từ thư viện ngoài (`lucide-react`, `@heroicons/react`, `react-icons`) với nét stroke lộn xộn (1.5px lẫn 2px). | Chỉ sử dụng kho icon độc quyền đã qua giám tuyển, đồng nhất nét 2px round/round, căn trọng tâm quang học tại `(12, 12)`. |
| **P-AI-07** | **Chuyển động Nhảm nhí & Rẻ tiền** | Hiệu ứng nảy (bounce), lắc (wiggle), fade-up hàng loạt khi cuộn trang, animation chặn thao tác người dùng. | Chuyển động lò xo vật lý (`snappy`, `gentle`, `stiff`), chỉ animate `transform` và `opacity`, tôn trọng `prefers-reduced-motion` với 100ms cross-fade và thời lượng 0.001ms. |
| **P-AI-08** | **Copy Rỗng tuếch, Lorem Ipsum & Rò rỉ Tài liệu** | Chữ mẫu "Lorem ipsum", tên giả "John Doe", khẩu hiệu sáo rỗng "Welcome to Rikkei Jobs", rò rỉ test ID ra UI. | Nội dung song ngữ nghiệp vụ thực tế ngành CNTT (matching score, lộ trình thực tập, lương VNĐ, tech stack, công nghệ tuyển dụng). |

---

## 3. Three-Tier Design Token Architecture

### 3.1. Nguyên lý Kiến trúc Phân tầng Token (W3C DTCG Standard)

Hệ thống token của Rikkei Jobs được xây dựng theo tiêu chuẩn của nhóm cộng đồng W3C Design Tokens Community Group (DTCG), phân tách rành mạch thành 3 tầng kiến trúc độc lập:

```text
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1: PRIMITIVE TOKENS (Giá trị vật lý thô, bất biến)         │
│ Ví dụ: --rj-primitive-brand-600: #132F52;                       │
│        --rj-primitive-space-4: 16px;                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Tham chiếu (Aliasing)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 2: SEMANTIC TOKENS (Ý nghĩa nghiệp vụ & Đa chủ đề Theme)   │
│ Ví dụ: Light: --rj-color-action-primary-bg: var(--...brand-600);│
│        Dark:  --rj-color-action-primary-bg: var(--...electric); │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Áp dụng (Application)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 3: COMPONENT TOKENS (Gắn liền Thành phần & Mật độ Role)    │
│ Ví dụ: --rj-btn-primary-bg: var(--rj-color-action-primary-bg);  │
│        --rj-table-cell-py: var(--rj-density-table-cell-py);     │
└─────────────────────────────────────────────────────────────────┘
```

- **Quy tắc Đặt tên Namespace**: Mọi biến CSS bắt buộc bắt đầu bằng tiền tố `--rj-` (Rikkei Jobs) theo định dạng kebab-case.
- **Ngăn cấm Tuyệt đối**: Không bao giờ nhúng trực tiếp giá trị Primitive Token hoặc mã màu hex vào class component mà không thông qua tầng Semantic Token.

### 3.2. Đặc tả Chi tiết Tier 1: Primitive Tokens (Bespoke Palette)

Thay thế hoàn toàn thang mặc định của Tailwind CSS và Material Design bằng Bảng màu Độc quyền Rikkei Jobs (Bespoke Palette):

```css
:root {
  /* ===================================================================
     1. PRIMITIVE COLOR SCALES (Bespoke Palette)
     =================================================================== */

  /* Neutral Palette: Technical Iron Charcoal (Thay thế thang Slate)
     Sắc xám ấm pha ánh xanh than kỹ thuật, chống mỏi mắt khi làm việc kéo dài */
  --rj-primitive-neutral-50:  #F7F9FC; /* Nền canvas trang Light Mode */
  --rj-primitive-neutral-100: #EEF2F6; /* Nền thẻ phụ, table subtle header */
  --rj-primitive-neutral-200: #E2E7ED; /* Đường phân cách subtle */
  --rj-primitive-neutral-300: #C5D0DC; /* Viền thẻ, divider rõ */
  --rj-primitive-neutral-400: #9AA8B9; /* Placeholder, icon inactive */
  --rj-primitive-neutral-500: #6F8094; /* Viền tương tác Light Mode (CR 4.05:1 on #FFFFFF) */
  --rj-primitive-neutral-600: #5B7083; /* Text muted Light Mode / Viền tương tác Dark Mode (CR 3.33:1 on #111C2E) */
  --rj-primitive-neutral-700: #334E68; /* Text secondary Light Mode (CR 8.64:1 on #FFFFFF) */
  --rj-primitive-neutral-800: #1A2C3F; /* Nền thẻ elevated Dark Mode, dropdown surface */
  --rj-primitive-neutral-900: #0C1A30; /* Text primary Light Mode (CR 17.41:1 on #FFFFFF) */
  --rj-primitive-neutral-950: #0A111E; /* Nền canvas trang Dark Mode */
  --rj-primitive-white:       #FFFFFF;

  /* Brand Anchor: Technical Iron Cobalt (Thay thế #0B57D0 Material Blue)
     Sắc xanh Cobalt Thép trầm tĩnh, kỷ luật công nghệ chuẩn Nhật Bản */
  --rj-primitive-brand-50:             #EBF3FA;
  --rj-primitive-brand-100:            #D4E5F5;
  --rj-primitive-brand-200:            #AACCEB;
  --rj-primitive-brand-500:            #246EB9;
  --rj-primitive-brand-600:            #132F52; /* Brand Primary Light — nút bấm chính, link */
  --rj-primitive-brand-700:            #0A2540; /* Brand Hover / Focus Ring Light Mode */
  --rj-primitive-brand-800:            #081E33; /* Brand Active state */
  --rj-primitive-brand-electric:       #4C85DE; /* Brand Primary Dark Mode (CR 4.65:1 on #111C2E) */
  --rj-primitive-brand-electric-hover: #6BA0F2; /* Brand Hover Dark Mode (CR 7.14:1 on #111C2E) */

  /* Accent: Cyber Persimmon / Terracotta
     Sắc cam đất nung công nghệ cao, thể hiện nhiệt huyết đào tạo và cơ hội nghề nghiệp */
  --rj-primitive-accent-50:  #FEF2ED;
  --rj-primitive-accent-100: #FDE2D6;
  --rj-primitive-accent-500: #F08C65; /* Accent Dark Mode (CR 7.03:1 on #111C2E) */
  --rj-primitive-accent-600: #D9480F; /* Accent Light Mode — CTA, Badge điểm năng lực (CR 4.30:1 on #FFFFFF) */
  --rj-primitive-accent-700: #BF3A0A; /* Accent Hover */

  /* Functional Status: Deep Pine Green (Success) */
  --rj-primitive-success-50:   #E8F8F5; /* Nền alert Light Mode */
  --rj-primitive-success-200:  #A2D9CE; /* Viền alert Light Mode */
  --rj-primitive-success-600:  #196F3D; /* Viền alert Dark Mode */
  --rj-primitive-success-700:  #0E6251; /* Text/Solid Badge Light Mode (CR 6.65:1 on #E8F8F5, 7.28:1 on #FFFFFF) */
  --rj-primitive-success-light:#48C78E; /* Text Dark Mode (CR 7.40:1 on #06281E) */
  --rj-primitive-success-950:  #06281E; /* Nền alert Dark Mode */

  /* Functional Status: Dark Honey Amber (Warning) */
  --rj-primitive-warning-50:   #FEF9E7; /* Nền alert Light Mode */
  --rj-primitive-warning-200:  #F9E79F; /* Viền alert Light Mode */
  --rj-primitive-warning-600:  #935116; /* Viền alert Dark Mode */
  --rj-primitive-warning-700:  #7A4305; /* Text/Solid Badge Light Mode (CR 7.57:1 on #FEF9E7, 7.98:1 on #FFFFFF) */
  --rj-primitive-warning-light:#F5B041; /* Text Dark Mode (CR 9.14:1 on #2C1600) */
  --rj-primitive-warning-950:  #2C1600; /* Nền alert Dark Mode */

  /* Functional Status: Crimson Brick (Error / Danger) */
  --rj-primitive-danger-50:    #FDF2F4; /* Nền alert Light Mode */
  --rj-primitive-danger-200:   #F5B7B1; /* Viền alert Light Mode */
  --rj-primitive-danger-600:   #943126; /* Viền alert Dark Mode */
  --rj-primitive-danger-700:   #9B1C2A; /* Text/Solid Badge Light Mode (CR 7.40:1 on #FDF2F4, 8.10:1 on #FFFFFF) */
  --rj-primitive-danger-light: #F1707A; /* Text Dark Mode (CR 6.32:1 on #2D0A0E) */
  --rj-primitive-danger-950:   #2D0A0E; /* Nền alert Dark Mode */

  /* Functional Status: Cerulean Blue (Info) */
  --rj-primitive-info-50:      #EBF5FB; /* Nền alert Light Mode */
  --rj-primitive-info-200:     #A9CCE3; /* Viền alert Light Mode */
  --rj-primitive-info-600:     #1F618D; /* Viền alert Dark Mode */
  --rj-primitive-info-700:     #134B5E; /* Text/Solid Badge Light Mode (CR 8.65:1 on #EBF5FB, 9.56:1 on #FFFFFF) */
  --rj-primitive-info-light:   #5DADE2; /* Text Dark Mode (CR 6.97:1 on #071E28) */
  --rj-primitive-info-950:     #071E28; /* Nền alert Dark Mode */

  /* Categorical Data Visualization Set (6 Colors - Toàn bộ đạt CR >= 3.0:1) */
  /* Light Mode (trên nền trắng #FFFFFF) */
  --rj-dataviz-1: #1B4F72; /* Tech Navy — CR 8.72:1 */
  --rj-dataviz-2: #B03A2E; /* Rust Red — CR 6.02:1 */
  --rj-dataviz-3: #117864; /* Pine Green — CR 5.39:1 */
  --rj-dataviz-4: #9C7D08; /* Dark Ochre (đã hiệu chỉnh từ #B7950B) — CR 3.92:1 */
  --rj-dataviz-5: #6C3483; /* Royal Plum — CR 8.55:1 */
  --rj-dataviz-6: #B9770E; /* Tawny Bronze — CR 3.68:1 */

  /* Dark Mode (trên nền thẻ tối #111C2E) */
  --rj-dataviz-dark-1: #5DADE2; /* Sky Cobalt — CR 6.95:1 */
  --rj-dataviz-dark-2: #EC7063; /* Coral Red — CR 5.75:1 */
  --rj-dataviz-dark-3: #48C78E; /* Mint Emerald — CR 8.00:1 */
  --rj-dataviz-dark-4: #F5B041; /* Bright Amber — CR 9.08:1 */
  --rj-dataviz-dark-5: #AF7AC5; /* Orchid Lavender — CR 5.22:1 */
  --rj-dataviz-dark-6: #EB984E; /* Golden Bronze — CR 7.43:1 */

  /* ===================================================================
     2. PRIMITIVE SPACING SCALE (4px / 8px Grid Base)
     =================================================================== */
  --rj-primitive-space-0:  0px;
  --rj-primitive-space-1:  4px;    /* Micro spacing, gap icon */
  --rj-primitive-space-2:  8px;    /* Compact padding, cell gap */
  --rj-primitive-space-3:  12px;   /* Form field gap, small tags */
  --rj-primitive-space-4:  16px;   /* Default card padding, container gutter */
  --rj-primitive-space-5:  20px;   /* Group spacing, roomy table cell */
  --rj-primitive-space-6:  24px;   /* Large card padding, candidate view */
  --rj-primitive-space-8:  32px;   /* Section gap mobile, modal padding */
  --rj-primitive-space-10: 40px;   /* Component block separation */
  --rj-primitive-space-12: 48px;   /* Section gap desktop */
  --rj-primitive-space-16: 64px;   /* Major layout division */

  /* ===================================================================
     3. PRIMITIVE RADII & ELEVATIONS
     =================================================================== */
  --rj-primitive-radius-none: 0px;
  --rj-primitive-radius-sm:   4px;
  --rj-primitive-radius-md:   6px;
  --rj-primitive-radius-lg:   8px;
  --rj-primitive-radius-xl:   12px;
  --rj-primitive-radius-2xl:  16px;
  --rj-primitive-radius-full: 9999px;

  --rj-primitive-elevation-0: none;
  --rj-primitive-elevation-1: 0 1px 3px 0 rgba(12, 26, 48, 0.08), 0 1px 2px -1px rgba(12, 26, 48, 0.05);
  --rj-primitive-elevation-2: 0 4px 6px -1px rgba(12, 26, 48, 0.10), 0 2px 4px -2px rgba(12, 26, 48, 0.06);
  --rj-primitive-elevation-3: 0 10px 15px -3px rgba(12, 26, 48, 0.12), 0 4px 6px -4px rgba(12, 26, 48, 0.08);
  --rj-primitive-elevation-4: 0 20px 25px -5px rgba(12, 26, 48, 0.15), 0 8px 10px -6px rgba(12, 26, 48, 0.10);

  /* Z-Index Hierarchy */
  --rj-primitive-z-hide:     -1;
  --rj-primitive-z-base:     0;
  --rj-primitive-z-dropdown: 1000;
  --rj-primitive-z-sticky:   1100;
  --rj-primitive-z-fixed:    1200;
  --rj-primitive-z-backdrop: 1300;
  --rj-primitive-z-modal:    1400;
  --rj-primitive-z-popover:  1500;
  --rj-primitive-z-toast:    1600;
}
```

### 3.3. Đặc tả Chi tiết Tier 2: Semantic Tokens (Light & Dark Mode)

```css
/* =====================================================================
   LIGHT MODE SEMANTIC THEME (Default)
   ===================================================================== */
:root, [data-theme="light"] {
  /* Surface Tokens */
  --rj-color-surface-page:       var(--rj-primitive-neutral-50);  /* #F7F9FC - Canvas */
  --rj-color-surface-card:       var(--rj-primitive-white);       /* #FFFFFF - Card Surface */
  --rj-color-surface-subtle:     var(--rj-primitive-neutral-100); /* #EEF2F6 - Table Header */
  --rj-color-surface-elevated:   var(--rj-primitive-white);       /* #FFFFFF - Modal/Popover */
  --rj-color-surface-overlay:    rgba(12, 26, 48, 0.55);

  /* Text & Foreground Tokens */
  --rj-color-text-primary:       var(--rj-primitive-neutral-900); /* #0C1A30 - CR 17.41:1 */
  --rj-color-text-secondary:     var(--rj-primitive-neutral-700); /* #334E68 - CR 8.64:1 */
  --rj-color-text-muted:         var(--rj-primitive-neutral-600); /* #5B7083 - CR 5.13:1 */
  --rj-color-text-inverse:       var(--rj-primitive-white);       /* #FFFFFF */
  --rj-color-text-disabled:      var(--rj-primitive-neutral-400); /* #9AA8B9 */

  /* Border & Outline Tokens (WCAG 1.4.11 Non-text Contrast >= 3.0:1) */
  --rj-color-border-subtle:      var(--rj-primitive-neutral-200); /* #E2E7ED - Dividers */
  --rj-color-border-interactive: var(--rj-primitive-neutral-500); /* #6F8094 - CR 4.05:1 on #FFFFFF */
  --rj-color-border-hover:       var(--rj-primitive-neutral-700); /* #334E68 - CR 8.64:1 */
  --rj-color-border-focus:       var(--rj-primitive-brand-700);   /* #0A2540 */

  /* Action & Interactive State Tokens */
  --rj-color-action-primary-bg:        var(--rj-primitive-brand-600);   /* #132F52 */
  --rj-color-action-primary-fg:        var(--rj-primitive-white);       /* #FFFFFF - CR 13.49:1 */
  --rj-color-action-primary-hover-bg:  var(--rj-primitive-brand-700);   /* #0A2540 */
  --rj-color-action-primary-hover-fg:  var(--rj-primitive-white);       /* #FFFFFF - CR 15.54:1 */
  --rj-color-action-primary-active-bg: var(--rj-primitive-brand-800);   /* #081E33 */
  --rj-color-action-link:              var(--rj-primitive-brand-600);   /* #132F52 - CR 13.49:1 */
  --rj-color-action-secondary-bg:      var(--rj-primitive-neutral-100); /* #EEF2F6 */
  --rj-color-action-secondary-fg:      var(--rj-primitive-neutral-900); /* #0C1A30 - CR 15.48:1 */
  --rj-color-action-secondary-hover-bg:var(--rj-primitive-neutral-200); /* #E2E7ED */

  /* Accent Tokens (Cyber Persimmon / Terracotta) */
  --rj-color-accent:              var(--rj-primitive-accent-600); /* #D9480F - CR 4.30:1 (UI/Large) */
  --rj-color-accent-hover:        var(--rj-primitive-accent-700); /* #BF3A0A */
  --rj-color-accent-subtle:       var(--rj-primitive-accent-50);  /* #FEF2ED */

  /* Status Indicators (Subtle Background + Solid High-Contrast Text) */
  --rj-color-status-success-bg:      var(--rj-primitive-success-50);  /* #E8F8F5 */
  --rj-color-status-success-text:    var(--rj-primitive-success-700); /* #0E6251 - CR 6.65:1 */
  --rj-color-status-success-border:  var(--rj-primitive-success-200); /* #A2D9CE */
  --rj-color-status-success-solid:   var(--rj-primitive-success-700); /* #0E6251 - CR 7.28:1 */

  --rj-color-status-warning-bg:      var(--rj-primitive-warning-50);  /* #FEF9E7 */
  --rj-color-status-warning-text:    var(--rj-primitive-warning-700); /* #7A4305 - CR 7.57:1 */
  --rj-color-status-warning-border:  var(--rj-primitive-warning-200); /* #F9E79F */
  --rj-color-status-warning-solid:   var(--rj-primitive-warning-700); /* #7A4305 - CR 7.98:1 */

  --rj-color-status-error-bg:        var(--rj-primitive-danger-50);   /* #FDF2F4 */
  --rj-color-status-error-text:      var(--rj-primitive-danger-700);  /* #9B1C2A - CR 7.40:1 */
  --rj-color-status-error-border:    var(--rj-primitive-danger-200);  /* #F5B7B1 */
  --rj-color-status-error-solid:     var(--rj-primitive-danger-700);  /* #9B1C2A - CR 8.10:1 */

  --rj-color-status-info-bg:         var(--rj-primitive-info-50);     /* #EBF5FB */
  --rj-color-status-info-text:       var(--rj-primitive-info-700);    /* #134B5E - CR 8.65:1 */
  --rj-color-status-info-border:     var(--rj-primitive-info-200);    /* #A9CCE3 */
  --rj-color-status-info-solid:      var(--rj-primitive-info-700);    /* #134B5E - CR 9.56:1 */

  /* Focus Indicator Ring (WCAG 2.2 Criterion 2.4.7 & 2.4.11) */
  --rj-color-focus-ring:         var(--rj-primitive-brand-700);   /* #0A2540 - CR 15.54:1 on #FFFFFF */
  --rj-focus-ring-width:         2px;
  --rj-focus-ring-offset:        2px;
}

/* =====================================================================
   DARK MODE SEMANTIC THEME
   Nguyên lý: Tầng bậc độ sáng quang học thực tế, không đảo màu âm bản thô thiển
   ===================================================================== */
[data-theme="dark"] {
  /* Surface Tokens (Layered Iron Charcoal Elevation) */
  --rj-color-surface-page:       var(--rj-primitive-neutral-950); /* #0A111E - Canvas Dark */
  --rj-color-surface-card:       #111C2E;                         /* #111C2E - Thẻ Card Dark */
  --rj-color-surface-subtle:     var(--rj-primitive-neutral-950); /* #0A111E */
  --rj-color-surface-elevated:   var(--rj-primitive-neutral-800); /* #1A2C3F - Modal/Popover */
  --rj-color-surface-overlay:    rgba(10, 17, 30, 0.80);

  /* Text & Foreground Tokens */
  --rj-color-text-primary:       #EDF2F7;                         /* #EDF2F7 - CR 15.17:1 on #111C2E */
  --rj-color-text-secondary:     #CBD5E1;                         /* #CBD5E1 - CR 11.51:1 on #111C2E */
  --rj-color-text-muted:         #94A3B8;                         /* #94A3B8 - CR 6.66:1 on #111C2E */
  --rj-color-text-inverse:       var(--rj-primitive-neutral-950); /* #0A111E */
  --rj-color-text-disabled:      #4A5568;

  /* Border & Outline Tokens (Hiệu chỉnh toán học để đạt CR >= 3.0:1 trên #111C2E) */
  --rj-color-border-subtle:      #1E2C3F;
  --rj-color-border-interactive: var(--rj-primitive-neutral-600); /* #5B7083 - CR 3.33:1 on #111C2E >= 3.0:1 */
  --rj-color-border-elevated:    #94A3B8;                         /* #94A3B8 - CR 4.04:1 on #1A2C3F */
  --rj-color-border-hover:       #94A3B8;                         /* #94A3B8 - CR 6.66:1 */
  --rj-color-border-focus:       #38BDF8;                         /* #38BDF8 - Focus Ring Dark */

  /* Action & Interactive State Tokens */
  --rj-color-action-primary-bg:        var(--rj-primitive-brand-electric);       /* #4C85DE - CR 4.65:1 on #111C2E */
  --rj-color-action-primary-fg:        var(--rj-primitive-neutral-950);          /* #0A111E - CR 5.14:1 */
  --rj-color-action-primary-hover-bg:  var(--rj-primitive-brand-electric-hover); /* #6BA0F2 */
  --rj-color-action-primary-hover-fg:  var(--rj-primitive-neutral-950);          /* #0A111E - CR 7.14:1 */
  --rj-color-action-primary-active-bg: var(--rj-primitive-brand-500);            /* #246EB9 */
  --rj-color-action-link:              var(--rj-primitive-brand-electric);       /* #4C85DE */
  --rj-color-action-secondary-bg:      var(--rj-primitive-neutral-800);          /* #1A2C3F */
  --rj-color-action-secondary-fg:      #EDF2F7;                                  /* #EDF2F7 - CR 12.63:1 */
  --rj-color-action-secondary-hover-bg:#223852;

  /* Accent Tokens (Cyber Persimmon Dark) */
  --rj-color-accent:              var(--rj-primitive-accent-500); /* #F08C65 - CR 7.03:1 on #111C2E */
  --rj-color-accent-hover:        #FA9D78;
  --rj-color-accent-subtle:       #2A160F;

  /* Status Indicators Dark Mode */
  --rj-color-status-success-bg:      var(--rj-primitive-success-950);   /* #06281E */
  --rj-color-status-success-text:    var(--rj-primitive-success-light); /* #48C78E - CR 7.40:1 */
  --rj-color-status-success-border:  var(--rj-primitive-success-600);   /* #196F3D */
  --rj-color-status-success-solid:   #196F3D;

  --rj-color-status-warning-bg:      var(--rj-primitive-warning-950);   /* #2C1600 */
  --rj-color-status-warning-text:    var(--rj-primitive-warning-light); /* #F5B041 - CR 9.14:1 */
  --rj-color-status-warning-border:  var(--rj-primitive-warning-600);   /* #935116 */
  --rj-color-status-warning-solid:   #935116;

  --rj-color-status-error-bg:        var(--rj-primitive-danger-950);    /* #2D0A0E */
  --rj-color-status-error-text:      var(--rj-primitive-danger-light);  /* #F1707A - CR 6.32:1 */
  --rj-color-status-error-border:    var(--rj-primitive-danger-600);    /* #943126 */
  --rj-color-status-error-solid:     #943126;

  --rj-color-status-info-bg:         var(--rj-primitive-info-950);      /* #071E28 */
  --rj-color-status-info-text:       var(--rj-primitive-info-light);    /* #5DADE2 - CR 6.97:1 */
  --rj-color-status-info-border:     var(--rj-primitive-info-600);      /* #1F618D */
  --rj-color-status-info-solid:      #1F618D;

  /* Focus Indicator Ring Dark Mode */
  --rj-color-focus-ring:         #38BDF8; /* #38BDF8 - CR 7.97:1 on #111C2E */
  --rj-focus-ring-width:         2px;
  --rj-focus-ring-offset:        2px;
}
```

### 3.4. Đặc tả Chi tiết Tier 3: Component Tokens

```css
/* Component Token: Primary Button */
.rj-btn-primary {
  background-color: var(--rj-color-action-primary-bg);
  color: var(--rj-color-action-primary-fg);
  border: 1px solid transparent;
  border-radius: var(--rj-primitive-radius-md);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--rj-primitive-space-2);
  cursor: pointer;
  transition: var(--rj-transition-hover);
}

.rj-btn-primary:hover {
  background-color: var(--rj-color-action-primary-hover-bg);
  color: var(--rj-color-action-primary-hover-fg);
}

.rj-btn-primary:active {
  background-color: var(--rj-color-action-primary-active-bg);
  transform: translateY(var(--rj-motion-dist-2xs));
}

.rj-btn-primary:focus-visible {
  outline: var(--rj-focus-ring-width) solid var(--rj-color-focus-ring);
  outline-offset: var(--rj-focus-ring-offset);
}

/* Component Token: Form Input */
.rj-input {
  background-color: var(--rj-color-surface-card);
  color: var(--rj-color-text-primary);
  border: 1px solid var(--rj-color-border-interactive);
  border-radius: var(--rj-primitive-radius-md);
  outline: none;
  transition: var(--rj-transition-hover);
}

.rj-input:hover {
  border-color: var(--rj-color-border-hover);
}

.rj-input:focus {
  border-color: var(--rj-color-border-focus);
  box-shadow: 0 0 0 var(--rj-focus-ring-width) var(--rj-color-focus-ring);
}

.rj-modal .rj-input,
.rj-drawer .rj-input,
.rj-input--elevated {
  border-color: var(--rj-color-border-elevated, var(--rj-color-border-interactive));
}

/* Component Token: Data Table Header */
.rj-table-header {
  background-color: var(--rj-color-surface-subtle);
  color: var(--rj-color-text-primary);
  border-bottom: 2px solid var(--rj-color-border-subtle);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

## 4. Color Palette & Mathematically Computed Contrast (WCAG 2.2 AA)

### 4.1. Cơ sở Toán học & Công thức Tính toán WCAG 2.2 sRGB

Độ tương phản quang học giữa hai màu sắc trong không gian sRGB được tính toán nghiêm ngặt theo khuyến nghị chính thức của tổ chức W3C:

#### 1. Bước 1: Khử nén Gamma chuyển sang Độ chói tuyến tính (Gamma Expansion)

Với mỗi kênh màu 8-bit $C_{\text{8bit}} \in \{R, G, B\} \subset [0, 255]$, chuẩn hóa giá trị về đoạn $[0, 1]$:

$$c = \frac{C_{\text{8bit}}}{255}$$

Giá trị độ chói tuyến tính $C_{\text{linear}}$ được xác định bởi:

$$C_{\text{linear}} = \begin{cases} \dfrac{c}{12.92} & \text{khi } c \le 0.04045 \\[10pt] \left(\dfrac{c + 0.055}{1.055}\right)^{2.4} & \text{khi } c > 0.04045 \end{cases}$$

#### 2. Bước 2: Tính toán Độ chói Tương đối (Relative Luminance $L$)

Hàm độ chói dựa trên trọng số quang phổ CIE 1931:

$$L = 0.2126 \times R_{\text{linear}} + 0.7152 \times G_{\text{linear}} + 0.0722 \times B_{\text{linear}}$$

Khoảng giá trị: $L \in [0.0, 1.0]$. Trong đó $L = 0.0$ cho màu đen hoàn toàn (`#000000`) và $L = 1.0$ cho màu trắng tuyệt đối (`#FFFFFF`).

#### 3. Bước 3: Tính toán Tỷ lệ Tương phản (Contrast Ratio $CR$)

Với $L_1 = \max(L_a, L_b)$ và $L_2 = \min(L_a, L_b)$:

$$CR = \frac{L_1 + 0.05}{L_2 + 0.05}$$

Khoảng giá trị: $CR \in [1.0, 21.0]$.

- **Ngưỡng Chuẩn WCAG 2.2 Cấp AA**:
  - Văn bản thường (Normal Text, $< 18\text{pt}$ / $24\text{px}$ regular hoặc $< 14\text{pt}$ / $18.66\text{px}$ bold): **$CR \ge 4.5:1$**.
  - Văn bản lớn (Large Text, $\ge 18\text{pt}$ hoặc $\ge 14\text{pt}$ bold): **$CR \ge 3.0:1$**.
  - Thành phần Giao diện & Đồ họa (UI Components, viền input, focus ring): **$CR \ge 3.0:1$** (Tiêu chí 1.4.11).

### 4.2. Ma trận Chứng minh Tương phản Toán học — Light Mode (Zero Emoji)

Toàn bộ 26 cặp màu thực tế trong hệ thống Rikkei Jobs ở chế độ Sáng (Light Mode) được kiểm chứng qua giải thuật toán học thực nghiệm, tuyệt đối không dùng emoji, chỉ sử dụng văn bản thuần PASS:

| STT | Thành phần Giao diện (Role) | Token Màu Chữ / FG | Hex FG | Token Màu Nền / BG | Hex BG | $L_{\text{FG}}$ | $L_{\text{BG}}$ | Tỷ lệ $CR$ | Ngưỡng Chuẩn | Kết luận |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Văn bản chính trên Thẻ Card | `--rj-color-text-primary` | `#0C1A30` | `--rj-color-surface-card` | `#FFFFFF` | 0.0103 | 1.0000 | **17.41:1** | $\ge 4.5:1$ | PASS (AAA) |
| 2 | Văn bản chính trên Nền Trang | `--rj-color-text-primary` | `#0C1A30` | `--rj-color-surface-page` | `#F7F9FC` | 0.0103 | 0.9455 | **16.51:1** | $\ge 4.5:1$ | PASS (AAA) |
| 3 | Văn bản chính trên Bảng Header | `--rj-color-text-primary` | `#0C1A30` | `--rj-color-surface-subtle` | `#EEF2F6` | 0.0103 | 0.8834 | **15.48:1** | $\ge 4.5:1$ | PASS (AAA) |
| 4 | Văn bản phụ trên Thẻ Card | `--rj-color-text-secondary` | `#334E68` | `--rj-color-surface-card` | `#FFFFFF` | 0.0715 | 1.0000 | **8.64:1** | $\ge 4.5:1$ | PASS (AAA) |
| 5 | Văn bản phụ trên Nền Trang | `--rj-color-text-secondary` | `#334E68` | `--rj-color-surface-page` | `#F7F9FC` | 0.0715 | 0.9455 | **8.19:1** | $\ge 4.5:1$ | PASS (AAA) |
| 6 | Văn bản phụ trên Bảng Header | `--rj-color-text-secondary` | `#334E68` | `--rj-color-surface-subtle` | `#EEF2F6` | 0.0715 | 0.8834 | **7.68:1** | $\ge 4.5:1$ | PASS (AAA) |
| 7 | Chữ ghi chú mờ trên Thẻ Card | `--rj-color-text-muted` | `#5B7083` | `--rj-color-surface-card` | `#FFFFFF` | 0.1545 | 1.0000 | **5.13:1** | $\ge 4.5:1$ | PASS (AA) |
| 8 | Chữ ghi chú mờ trên Nền Trang | `--rj-color-text-muted` | `#5B7083` | `--rj-color-surface-page` | `#F7F9FC` | 0.1545 | 0.9455 | **4.87:1** | $\ge 4.5:1$ | PASS (AA) |
| 9 | Chữ Nút Chính trên Nền Nút | `--rj-color-action-primary-fg` | `#FFFFFF` | `--rj-color-action-primary-bg` | `#132F52` | 1.0000 | 0.0278 | **13.49:1** | $\ge 4.5:1$ | PASS (AAA) |
| 10 | Chữ Nút Hover trên Nền Hover | `--rj-color-action-primary-hover-fg` | `#FFFFFF` | `--rj-color-action-primary-hover-bg` | `#0A2540` | 1.0000 | 0.0176 | **15.54:1** | $\ge 4.5:1$ | PASS (AAA) |
| 11 | Link Hành động trên Nền Trắng | `--rj-color-action-link` | `#132F52` | `--rj-color-surface-card` | `#FFFFFF` | 0.0278 | 1.0000 | **13.49:1** | $\ge 4.5:1$ | PASS (AAA) |
| 12 | Link Hành động trên Nền Trang | `--rj-color-action-link` | `#132F52` | `--rj-color-surface-page` | `#F7F9FC` | 0.0278 | 0.9455 | **12.80:1** | $\ge 4.5:1$ | PASS (AAA) |
| 13 | Chữ Nút Phụ trên Nền Phụ | `--rj-color-action-secondary-fg` | `#0C1A30` | `--rj-color-action-secondary-bg` | `#EEF2F6` | 0.0103 | 0.8834 | **15.48:1** | $\ge 4.5:1$ | PASS (AAA) |
| 14 | Accent Terracotta (UI / Large text) | `--rj-primitive-accent-600` | `#D9480F` | `--rj-color-surface-card` | `#FFFFFF` | 0.1942 | 1.0000 | **4.30:1** | $\ge 3.0:1$ | PASS (AA Large/UI) |
| 15 | Chữ Thành công trên Nền Alert | `--rj-color-status-success-text` | `#0E6251` | `--rj-color-status-success-bg` | `#E8F8F5` | 0.0942 | 0.9088 | **6.65:1** | $\ge 4.5:1$ | PASS (AA) |
| 16 | Chữ Cảnh báo trên Nền Alert | `--rj-color-status-warning-text` | `#7A4305` | `--rj-color-status-warning-bg` | `#FEF9E7` | 0.0816 | 0.9459 | **7.57:1** | $\ge 4.5:1$ | PASS (AAA) |
| 17 | Chữ Báo lỗi trên Nền Alert | `--rj-color-status-error-text` | `#9B1C2A` | `--rj-color-status-error-bg` | `#FDF2F4` | 0.0797 | 0.9092 | **7.40:1** | $\ge 4.5:1$ | PASS (AAA) |
| 18 | Chữ Thông tin trên Nền Alert | `--rj-color-status-info-text` | `#134B5E` | `--rj-color-status-info-bg` | `#EBF5FB` | 0.0598 | 0.8993 | **8.65:1** | $\ge 4.5:1$ | PASS (AAA) |
| 19 | Chữ Trắng trên Badge Solid Xanh | `--rj-primitive-white` | `#FFFFFF` | `--rj-color-status-success-solid` | `#0E6251` | 1.0000 | 0.0942 | **7.28:1** | $\ge 4.5:1$ | PASS (AAA) |
| 20 | Chữ Trắng trên Badge Solid Cam | `--rj-primitive-white` | `#FFFFFF` | `--rj-color-status-warning-solid` | `#7A4305` | 1.0000 | 0.0816 | **7.98:1** | $\ge 4.5:1$ | PASS (AAA) |
| 21 | Chữ Trắng trên Badge Solid Đỏ | `--rj-primitive-white` | `#FFFFFF` | `--rj-color-status-error-solid` | `#9B1C2A` | 1.0000 | 0.0797 | **8.10:1** | $\ge 4.5:1$ | PASS (AAA) |
| 22 | Chữ Trắng trên Badge Solid Lam | `--rj-primitive-white` | `#FFFFFF` | `--rj-color-status-info-solid` | `#134B5E` | 1.0000 | 0.0598 | **9.56:1** | $\ge 4.5:1$ | PASS (AAA) |
| 23 | Viền Khung Input trên Thẻ Card | `--rj-color-border-interactive` | `#6F8094` | `--rj-color-surface-card` | `#FFFFFF` | 0.2096 | 1.0000 | **4.05:1** | $\ge 3.0:1$ | PASS (UI) |
| 24 | Viền Input Hover trên Thẻ Card | `--rj-color-border-hover` | `#334E68` | `--rj-color-surface-card` | `#FFFFFF` | 0.0715 | 1.0000 | **8.64:1** | $\ge 3.0:1$ | PASS (UI) |
| 25 | Vòng Focus Ring trên Nền Trắng | `--rj-color-focus-ring` | `#0A2540` | `--rj-color-surface-card` | `#FFFFFF` | 0.0176 | 1.0000 | **15.54:1** | $\ge 3.0:1$ | PASS (UI) |
| 26 | Vòng Focus Ring trên Nền Trang | `--rj-color-focus-ring` | `#0A2540` | `--rj-color-surface-page` | `#F7F9FC` | 0.0176 | 0.9455 | **14.73:1** | $\ge 3.0:1$ | PASS (UI) |

### 4.3. Ma trận Chứng minh Tương phản Toán học — Dark Mode (Zero Emoji)

Toàn bộ 22 cặp màu thực tế trong hệ thống Rikkei Jobs ở chế độ Tối (Dark Mode) được kiểm chứng qua giải thuật toán học thực nghiệm, tuyệt đối không dùng emoji, chỉ sử dụng văn bản thuần PASS:

| STT | Thành phần Giao diện (Role) | Token Màu Chữ / FG | Hex FG | Token Màu Nền / BG | Hex BG | $L_{\text{FG}}$ | $L_{\text{BG}}$ | Tỷ lệ $CR$ | Ngưỡng Chuẩn | Kết luận |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Văn bản chính trên Thẻ Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-color-surface-card` | `#111C2E` | 0.8822 | 0.0115 | **15.17:1** | $\ge 4.5:1$ | PASS (AAA) |
| 2 | Văn bản chính trên Nền Trang Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-color-surface-page` | `#0A111E` | 0.8822 | 0.0056 | **16.77:1** | $\ge 4.5:1$ | PASS (AAA) |
| 3 | Văn bản chính trên Khối Nổi Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-color-surface-elevated` | `#1A2C3F` | 0.8822 | 0.0238 | **12.63:1** | $\ge 4.5:1$ | PASS (AAA) |
| 4 | Văn bản phụ trên Thẻ Tối | `--rj-color-text-secondary` | `#CBD5E1` | `--rj-color-surface-card` | `#111C2E` | 0.6572 | 0.0115 | **11.51:1** | $\ge 4.5:1$ | PASS (AAA) |
| 5 | Văn bản phụ trên Nền Trang Tối | `--rj-color-text-secondary` | `#CBD5E1` | `--rj-color-surface-page` | `#0A111E` | 0.6572 | 0.0056 | **12.72:1** | $\ge 4.5:1$ | PASS (AAA) |
| 6 | Chữ mờ trên Thẻ Tối | `--rj-color-text-muted` | `#94A3B8` | `--rj-color-surface-card` | `#111C2E` | 0.3595 | 0.0115 | **6.66:1** | $\ge 4.5:1$ | PASS (AA) |
| 7 | Chữ mờ trên Nền Trang Tối | `--rj-color-text-muted` | `#94A3B8` | `--rj-color-surface-page` | `#0A111E` | 0.3595 | 0.0056 | **7.37:1** | $\ge 4.5:1$ | PASS (AA) |
| 8 | Chữ Nút Chính trên Nền Nút Tối | `--rj-color-action-primary-fg` | `#0A111E` | `--rj-color-action-primary-bg` | `#4C85DE` | 0.0056 | 0.2359 | **5.14:1** | $\ge 4.5:1$ | PASS (AA) |
| 9 | Chữ Nút Hover trên Nền Hover Tối | `--rj-color-action-primary-hover-fg` | `#0A111E` | `--rj-color-action-primary-hover-bg` | `#6BA0F2` | 0.0056 | 0.3468 | **7.14:1** | $\ge 4.5:1$ | PASS (AAA) |
| 10 | Link Hành động trên Thẻ Tối | `--rj-color-action-link` | `#4C85DE` | `--rj-color-surface-card` | `#111C2E` | 0.2359 | 0.0115 | **4.65:1** | $\ge 4.5:1$ | PASS (AA) |
| 11 | Link Hành động trên Nền Trang Tối | `--rj-color-action-link` | `#4C85DE` | `--rj-color-surface-page` | `#0A111E` | 0.2359 | 0.0056 | **5.14:1** | $\ge 4.5:1$ | PASS (AA) |
| 12 | Chữ Nút Phụ trên Nền Phụ Tối | `--rj-color-action-secondary-fg` | `#EDF2F7` | `--rj-color-action-secondary-bg` | `#1A2C3F` | 0.8822 | 0.0238 | **12.63:1** | $\ge 4.5:1$ | PASS (AAA) |
| 13 | Chữ Thành công trên Alert Tối | `--rj-color-status-success-text` | `#48C78E` | `--rj-color-status-success-bg` | `#06281E` | 0.4418 | 0.0165 | **7.40:1** | $\ge 4.5:1$ | PASS (AAA) |
| 14 | Chữ Cảnh báo trên Alert Tối | `--rj-color-status-warning-text` | `#F5B041` | `--rj-color-status-warning-bg` | `#2C1600` | 0.5084 | 0.0111 | **9.14:1** | $\ge 4.5:1$ | PASS (AAA) |
| 15 | Chữ Báo lỗi trên Alert Tối | `--rj-color-status-error-text` | `#F1707A` | `--rj-color-status-error-bg` | `#2D0A0E` | 0.3169 | 0.0081 | **6.32:1** | $\ge 4.5:1$ | PASS (AAA) |
| 16 | Chữ Thông tin trên Alert Tối | `--rj-color-status-info-text` | `#5DADE2` | `--rj-color-status-info-bg` | `#071E28` | 0.3771 | 0.0113 | **6.97:1** | $\ge 4.5:1$ | PASS (AAA) |
| 17 | Viền Khung Input trên Thẻ Tối | `--rj-color-border-interactive` | `#5B7083` | `--rj-color-surface-card` | `#111C2E` | 0.1545 | 0.0115 | **3.33:1** | $\ge 3.0:1$ | PASS (UI) |
| 18 | Viền Khung Input trên Nền Trang | `--rj-color-border-interactive` | `#5B7083` | `--rj-color-surface-page` | `#0A111E` | 0.1545 | 0.0056 | **3.68:1** | $\ge 3.0:1$ | PASS (UI) |
| 19 | Viền Input Hover trên Thẻ Tối | `--rj-color-border-hover` | `#94A3B8` | `--rj-color-surface-card` | `#111C2E` | 0.3595 | 0.0115 | **6.66:1** | $\ge 3.0:1$ | PASS (UI) |
| 20 | Vòng Focus Ring trên Thẻ Tối | `--rj-color-focus-ring` | `#38BDF8` | `--rj-color-surface-card` | `#111C2E` | 0.4401 | 0.0115 | **7.97:1** | $\ge 3.0:1$ | PASS (UI) |
| 21 | Vòng Focus Ring trên Nền Trang | `--rj-color-focus-ring` | `#38BDF8` | `--rj-color-surface-page` | `#0A111E` | 0.4401 | 0.0056 | **8.82:1** | $\ge 3.0:1$ | PASS (UI) |
| 22 | Accent Terracotta trên Thẻ Tối (UI/Large) | `--rj-primitive-accent-500` | `#F08C65` | `--rj-color-surface-card` | `#111C2E` | 0.3822 | 0.0115 | **7.03:1** | $\ge 3.0:1$ | PASS (AA Large/UI) |

> **Phát hiện Toán học Sâu sắc**:  
> Trong giao diện AI generic thông thường, màu viền tối `#475569` trên thẻ `#111C2E` chỉ đạt **2.25:1**, vi phạm nghiêm trọng Tiêu chuẩn WCAG 2.2 AA 1.4.11 (yêu cầu $\ge 3.0:1$). Rikkei Jobs đã hiệu chỉnh token viền tương tác `--rj-color-border-interactive` ở Dark Mode thành `#5B7083` đạt **3.33:1** (và trên nền trang đạt **3.68:1**), hoàn toàn vượt ngưỡng kiểm định.

---

## 5. Typography System & Vietnamese Linguistic Engineering

### 5.1. Bộ Phối Hợp Font Chuyên Biệt (Deliberate Font Pairing)

Rikkei Jobs xây dựng một bộ ba font có chủ đích rõ rệt, kết hợp giữa tính công nghệ hiện đại, khả năng hiển thị tiếng Việt bản địa hoàn hảo và độ chính xác dữ liệu bảng biểu:

```css
:root {
  /* Display / Headings: Plus Jakarta Sans (Góc cạnh công nghệ, nhịp điệu mở) */
  --rj-font-display: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;

  /* Body / UI Text: Be Vietnam Pro (Tối ưu hóa dấu tiếng Việt bản địa) */
  --rj-font-body: 'Be Vietnam Pro', system-ui, -apple-system, sans-serif;

  /* Code / Tabular Numerals: JetBrains Mono (Đồng độ rộng chữ số hoàn hảo) */
  --rj-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

#### Giấy phép Bản quyền (Licensing)

Cả 3 font đều được cấp phép theo tiêu chuẩn nguồn mở **SIL Open Font License (OFL) 1.1**:

- **Plus Jakarta Sans**: Tác giả Tokotype (Gumpita Rahayu). Miễn phí sử dụng thương mại, không bản quyền thương mại.
- **Be Vietnam Pro**: Tác giả Adaptive Type (Lam Bao). Thiết kế chuyên biệt cho hệ ký tự Quốc ngữ Việt Nam.
- **JetBrains Mono**: Tác giả JetBrains. Tối ưu cho môi trường đọc mã nguồn và số liệu bảng biểu.

### 5.2. Giải phẫu Bounding Box Dấu Tiếng Việt Xếp Chồng (Stacked Diacritics)

Chữ Quốc ngữ tiếng Việt có cấu trúc thanh điệu phức tạp, đặc biệt là hiện tượng **dấu thanh kép xếp chồng (Stacked Diacritics)**:

- Dấu trăng + thanh: `ắ`, `ằ`, `ẳ`, `ẵ`, `ặ`.
- Dấu mũ + thanh: `ấ`, `ầ`, `ẩ`, `ẫ`, `ậ`; `ế`, `ề`, `ể`, `ễ`, `ệ`; `ố`, `ồ`, `ổ`, `ỗ`, `ộ`.
- Dấu móc + thanh: `ứ`, `ừ`, `ử`, `ữ`, `ự`.

Trong ma trận phông chữ kỹ thuật số (Font Metric - 1000 UPM), ký tự tiếng Anh thông thường có đỉnh Cap Height tại $+700$ units. Tuy nhiên, khi các dấu thanh tiếng Việt xếp chồng lên nhau (như `ể`, `ẵ`, `ộ`, `ự`), đỉnh của glyph vươn cao tới **$+1050$ units**:

```text
  +1050 ── ̉  (Dấu hỏi / ngã)     ▲
   +850 ── ^  (Dấu mũ)           │ Bounding Box tiếng Việt vươn cao
   +700 ── ─── Cap Height ───    │ (+1050 units)
          │ e │                  ▼
      0 ── ─── Baseline ─────
   -250 ── ─── Descender ────   (g, y, p)
```

#### Chuỗi Ký Tự Kiểm Chứng Bắt Buộc (Verification Test String)

```text
Học viên Rikkei Academy sẵn sàng ứng tuyển: kỹ sư phần mềm, kiểm thử tự động, trí tuệ nhân tạo. ệ ổ ự ữ ặ ề ế ỗ ỡ ỷ ỹ ắ ằ ẵ đ
```

#### Quy tắc Bắt buộc Triệt tiêu Hiện tượng Xén Dấu

1. **Chiều cao Dòng Thân Văn bản (Body Text Line-Height)**:
   - **Bắt buộc**: `line-height >= 1.5` (tương đương 24px cho font 16px; 21px cho font 14px).
   - **CẤM TUYỆT ĐỐI**: Dùng các class Tailwind dạng `leading-none` (`line-height: 1`), `leading-tight` (`line-height: 1.25`) cho đoạn văn tiếng Việt vì sẽ làm đỉnh dấu hỏi/ngã của dòng dưới đè vào chân chữ `g`, `y`, `p` của dòng trên.
2. **Tiêu đề (Headings Line-Height)**:
   - Tiêu đề lớn (H1, 30px–36px): `line-height` trong khoảng `1.25 - 1.30`.
   - Tiêu đề vừa (H2, H3, 20px–24px): `line-height` trong khoảng `1.33 - 1.40`.
3. **Đệm An Toàn Chiều Dọc cho Buttons & Badges (Vertical Padding Buffer)**:
   - Mọi container có khai báo `overflow: hidden` (như Button, Badge, Pill, Tab) bắt buộc phải có đệm trên/dưới tối thiểu $\ge 8\text{px}$ để bảo vệ dấu thanh kép không bị cắt cụt ngọn.

### 5.3. Số liệu Dạng Bảng (Tabular Numerals)

Trong nền tảng Rikkei Jobs, các con số biến động liên tục: mức lương (`15.000.000 VNĐ - 30.000.000 VNĐ`), điểm đánh giá năng lực (`8.75 / 10.00`), thời gian phỏng vấn (`2026-11-15 14:30:00`), số lượng ứng viên (`1.248 hồ sơ`).

Mặc định, chữ số tỷ lệ (Proportional Numerals) có chiều rộng khác nhau (chữ số `1` hẹp hơn chữ số `8`). Điều này khiến các cột số liệu trong bảng bị thụt thò, xô lệch theo chiều dọc, tạo cảm giác thiếu chuyên nghiệp.

Rikkei Jobs bắt buộc áp dụng tính năng OpenType Font Feature:

```css
/* Áp dụng bắt buộc cho toàn bộ bảng biểu, điểm số, lương và thời gian */
.rj-tabular-nums,
table td.numeric,
.rj-salary-range,
.rj-metric-value,
.rj-score-badge {
  font-variant-numeric: tabular-nums;
  -webkit-font-feature-settings: "tnum" 1;
  font-feature-settings: "tnum" 1;
}
```

### 5.4. Thang Đo 9 Cấp Độ Typography Chuẩn (9-Level Type Scale)

| Token Typography | Cỡ Chữ (px / rem) | Chiều Cao Dòng (px / ratio) | Trọng Lượng (Weight) | Khoảng Cách Chữ | Ứng Dụng Nghiệp Vụ Cụ Thể |
|---|---|---|---|---|---|
| `--rj-font-display` | `36px` / `2.25rem` | `44px` / `1.22` | Bold (700) | `-0.025em` | Số liệu thống kê trang chủ, Hero banner chính |
| `--rj-font-h1` | `30px` / `1.875rem` | `38px` / `1.27` | Bold (700) | `-0.02em` | Tiêu đề màn hình chính (Page Title) |
| `--rj-font-h2` | `24px` / `1.5rem` | `32px` / `1.33` | SemiBold (600) | `-0.015em` | Tiêu đề Section lớn, Header modal dialog |
| `--rj-font-h3` | `20px` / `1.25rem` | `28px` / `1.40` | SemiBold (600) | `-0.01em` | Tiêu đề Thẻ Card chính, Panel Header |
| `--rj-font-lead` | `18px` / `1.125rem` | `28px` / `1.55` | Regular (400) | `0em` | Đoạn dẫn nhập mô tả công việc, trích dẫn |
| `--rj-font-body` | `16px` / `1.0rem` | `24px` / `1.50` | Regular (400) | `0em` | Thân văn bản ứng viên, nội dung yêu cầu tuyển dụng |
| `--rj-font-body-sm` | `14px` / `0.875rem` | `21px` / `1.50` | Regular / Medium | `0em` | Dữ liệu bảng Admin, nhãn form, metadata ứng viên |
| `--rj-font-caption` | `12px` / `0.75rem` | `18px` / `1.50` | Medium (500) | `0.02em` | Nhãn trạng thái (Badge status), helper text, tooltip |
| `--rj-font-code` | `13px` / `0.8125rem` | `18px` / `1.38` | Regular (400) | `0em` | Mã định danh hồ sơ (`JOB-1024`), log hệ thống, snippet |

### 5.5. Chiến Lược Self-Hosted @font-face (Không Gọi CDN Runtime)

Ứng dụng tuân thủ nguyên tắc bảo mật và hiệu năng: không gọi CDN runtime từ Google Fonts hoặc bên thứ ba. Toàn bộ font được định hướng self-hosted định dạng **WOFF2** với cơ chế nén tối ưu:

```css
/* Self-Hosted @font-face Specifications (Định hướng triển khai asset cho vòng sau) */
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 600 700;
  font-display: swap;
  src: url('/fonts/plus-jakarta-sans-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, 
                 U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, 
                 U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'Be Vietnam Pro';
  font-style: normal;
  font-weight: 400 500 600;
  font-display: swap;
  src: url('/fonts/be-vietnam-pro-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, 
                 U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, 
                 U+1EA0-1EF9, U+20AB;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400 500;
  font-display: swap;
  src: url('/fonts/jetbrains-mono-tabular.woff2') format('woff2');
  unicode-range: U+0030-0039, U+0024, U+00A5, U+20AB, U+0025, U+002C, U+002E;
}
```

*Lưu ý Ràng buộc R0*: Trong vòng này, không tự ý tải hoặc lưu file font nhị phân (binary) vào thư mục `frontend/`. Toàn bộ thông số trên đóng vai trò đặc tả kỹ thuật hoàn chỉnh để tích hợp trong vòng triển khai frontend được phê duyệt.

---

## 6. Layout Craft, Asymmetric Grid & Role-Based Density

### 6.1. Lưới 12 Cột Bất Đối Xứng (Editorial Asymmetric Grid — Tỷ lệ 65/35)

Thay thế hoàn toàn cấu trúc đối xứng chia 3 card vô hồn của các mẫu AI generic, Rikkei Jobs áp dụng lưới 12 cột bất đối xứng mang phong cách ấn bản số công nghệ cao (Editorial Tech Layout):

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 12-COLUMN EDITORIAL ASYMMETRIC GRID (Desktop: 1024px / 1440px)              │
├─────────────────────────────────────────────────┬───────────────────────────┤
│ PRIMARY FLOW (8 Columns / ~65% Width)           │ STICKY SIDEBAR (4 C / 35%)│
│ - Danh sách tin tuyển dụng CNTT theo luồng      │ - Thẻ Skill Match Radar   │
│ - Chi tiết mô tả công việc, tech stack yêu cầu   │ - Tóm tắt hồ sơ ứng viên  │
│ - Lộ trình thực tập & đào tạo của học viện      │ - Xác thực kỹ năng Rikkei │
│ - Bảng dữ liệu quản trị viên Dense Matrix       │ - Quick-action CTA Panel  │
└─────────────────────────────────────────────────┴───────────────────────────┘
```

- **Cột Nội dung Chính (Primary Flow - 8 cột / ~65%)**: Tập trung luồng đọc thị giác chính của người dùng, tạo không gian thoáng đãng cho việc đọc thông tin kỹ thuật sâu.
- **Cột Tiện ích Neo Cố định (Sticky Sidebar - 4 cột / ~35%)**: Luôn hiển thị trong tầm mắt khi cuộn trang, cung cấp thông tin đối chiếu tức thời (Matching Radar) và các nút hành động cốt lõi.

### 6.2. Bốn Điểm Ngắt Màn Hình Chuẩn (4 Responsive Breakpoints)

Hệ thống layout đáp ứng đầy đủ từ thiết bị di động cá nhân đến màn hình làm việc siêu rộng:

| Điểm Ngắt (Breakpoint) | Độ Rộng Viewport | Mục Tiêu Thiết Bị | Quy Tắc Bố Cục Bắt Buộc |
|---|---|---|---|
| **Mobile (`sm`)** | **`375px`** | iPhone SE, smartphone tiêu chuẩn | Bố cục 1 cột cuộn dọc, **Horizontal Scroll = 0 tuyệt đối** (`scrollWidth <= clientWidth`), touch target $\ge 44\text{px}$, padding lề `16px`. |
| **Tablet (`md`)** | **`768px`** | iPad mini, máy tính bảng dọc | Lưới 2 cột linh hoạt, bảng biểu có thanh cuộn ngang độc lập trong khung card với chỉ báo thị giác (fade cue), padding lề `24px`. |
| **Desktop (`lg`)** | **`1024px`** | Laptop văn phòng 13"-14" | Kích hoạt lưới 12 cột bất đối xứng (65/35). Thanh điều hướng bên cạnh (Sidebar Nav 240px) ghim cố định. |
| **Wide Desktop (`xl`)** | **`1440px`** | Màn hình ngoài 24"-27" | Max container width giới hạn ở `1360px` căn giữa. Mở rộng chế độ đa bảng cho admin, hiển thị đầy đủ thông tin chi tiết. |

### 6.3. Kiến Trúc Mật Độ Kép Theo Vai Trò (Dual-Density Architecture)

Rikkei Jobs phục vụ các nhóm người dùng với kỳ vọng trái ngược nhau:

```text
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ DENSE MODE (ADMIN / STAFF / HR)      │     │ AIRY MODE (CANDIDATE / MENTOR)       │
│ - Chiều cao hàng bảng: 36px - 38px   │     │ - Chiều cao hàng bảng: 56px          │
│ - Cell padding dọc: 6px - 8px        │     │ - Padding thẻ card: 24px             │
│ - Cỡ chữ dữ liệu: 13px - 14px        │     │ - Cỡ chữ thân bài: 16px              │
│ - Input / Button: 34px               │     │ - Input / Button: 44px - 48px        │
│ - Mục tiêu: 18-22 hàng above-the-fold│     │ - Mục tiêu: Truyền cảm hứng, thư thái│
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

#### Bảng Ma trận So sánh Chi tiết Mật độ

| Thông số Thiết kế | Chế độ Dày đặc (Dense Mode) — Admin / HR | Chế độ Thoáng đãng (Airy Mode) — Candidate / Mentor |
|---|---|---|
| **Bộ chọn Kích hoạt** | `[data-density="dense"]`, `.role-admin`, `.role-staff` | `[data-density="airy"]`, `:root` mặc định |
| **Chiều cao Hàng Bảng (Row Height)** | `36px - 38px` | `56px` |
| **Đệm Ô Bảng Dọc (Cell Padding Y)** | `6px - 8px` | `16px` |
| **Đệm Ô Bảng Ngang (Cell Padding X)** | `12px` | `20px` |
| **Cỡ Chữ Thân Văn bản (Body Font Size)** | `13px - 14px` (`0.8125rem - 0.875rem`) | `16px` (`1.0rem`) |
| **Chiều cao Ô Nhập liệu (Input Height)** | `34px` | `44px` (Touch Target) |
| **Chiều cao Nút Bấm (Button Height)** | `34px` | `44px` (Touch Target) |
| **Khoảng cách Giữa các Khối (Grid Gap)** | `8px - 12px` | `20px - 24px` |
| **Đệm Thẻ Card (Card Padding)** | `12px - 16px` | `24px` |
| **Bán kính Bo góc (Border Radius)** | `4px - 6px` | `12px` |
| **Số hàng hiển thị trên 1 màn hình** | **18 - 22 hàng** (Tối đa hóa năng suất) | 6 - 8 hàng (Thư thái, dễ đọc) |

#### Mã Hiện Thực CSS Density Tokens

```css
/* Mật độ Mặc định: Airy Mode (Dành cho Candidate & Mentor) */
:root, [data-density="airy"] {
  --rj-density-space-xs: var(--rj-primitive-space-2);  /* 8px */
  --rj-density-space-sm: var(--rj-primitive-space-3);  /* 12px */
  --rj-density-space-md: var(--rj-primitive-space-5);  /* 20px */
  --rj-density-space-lg: var(--rj-primitive-space-8);  /* 32px */
  --rj-density-space-xl: var(--rj-primitive-space-12); /* 48px */

  --rj-density-table-row-height: 56px;
  --rj-density-table-cell-py:    16px;
  --rj-density-table-cell-px:    20px;

  --rj-density-input-height:     44px;
  --rj-density-input-font-size:  16px;
  --rj-density-btn-height:       44px;
  --rj-density-btn-padding-x:    20px;

  --rj-density-card-padding:     var(--rj-primitive-space-6);   /* 24px */
  --rj-density-card-radius:      var(--rj-primitive-radius-xl); /* 12px */
}

/* Mật độ Nâng cao: Dense Mode (Dành cho Admin, Staff, HR) */
[data-density="dense"], 
body.role-admin, 
body.role-staff, 
body.role-employer {
  --rj-density-space-xs: var(--rj-primitive-space-1);  /* 4px */
  --rj-density-space-sm: var(--rj-primitive-space-2);  /* 8px */
  --rj-density-space-md: var(--rj-primitive-space-3);  /* 12px */
  --rj-density-space-lg: var(--rj-primitive-space-4);  /* 16px */
  --rj-density-space-xl: var(--rj-primitive-space-6);  /* 24px */

  --rj-density-table-row-height: 38px;
  --rj-density-table-cell-py:    6px;
  --rj-density-table-cell-px:    12px;

  --rj-density-input-height:     34px;
  --rj-density-input-font-size:  14px;
  --rj-density-btn-height:       34px;
  --rj-density-btn-padding-x:    12px;

  --rj-density-card-padding:     var(--rj-primitive-space-3);   /* 12px */
  --rj-density-card-radius:      var(--rj-primitive-radius-md); /* 6px */
}
```

### 6.4. Bốn Trạng Thái Hệ Thống Chuẩn (4 System States)

1. **Loading / Skeleton State**:
   - Sử dụng khối chữ nhật nền trung tính nhẹ (`--rj-primitive-neutral-200` sang `--rj-primitive-neutral-100`).
   - Chu kỳ xung nhịp $\ge 1.5$ giây, tuân thủ nghiêm ngặt WCAG 2.3.1 (không chớp giật > 3Hz).
   - Bảo toàn chính xác kích thước hình học của phần tử đích, triệt tiêu hoàn toàn giật layout (**Cumulative Layout Shift CLS = 0**).
   - Chuyển tiếp sang dữ liệu thật qua hiệu ứng cross-fade 200ms.
2. **Empty State**:
   - Biểu tượng `<Icon />` 48px nét 2px round monoline tuyển chọn riêng theo ngữ cảnh nghiệp vụ.
   - Tiêu đề ngắn gọn + diễn giải nguyên nhân và hướng giải quyết cụ thể.
   - Nút hành động chính (Primary CTA) rõ ràng ("Tạo tin tuyển dụng mới", "Tìm khóa học phù hợp").
   - Tuyệt đối không dùng tranh minh họa stock rẻ tiền hoặc emoji.
3. **Error State**:
   - Khung cảnh báo với màu chữ đỏ thẫm `--rj-color-status-error-text` (`#9B1C2A`) trên nền nhạt `#FDF2F4`.
   - Mã lỗi kỹ thuật rõ ràng (`ERR_RESUME_PARSER_TIMEOUT`, `ERR_MATCH_CALC_FAILED`).
   - Nút "Thử lại" (Retry Action) có thể kích hoạt bằng bàn phím.
4. **Success / Done State**:
   - Huy hiệu / biểu ngữ màu xanh rêu Deep Pine (`#0E6251` trên nền `#E8F8F5`).
   - Phản hồi lò xo vi tương tác (`snappy` preset).
   - Tóm tắt hành động đã hoàn tất và dự báo bước tiếp theo cho ứng viên.

### 6.5. Bốn Thành Phần Nhận Diện Đặc Trưng (Signature Elements)

1. **Asymmetric Split Hero with Skill Match Radar**:
   - Bên trái (65%): Tiêu đề biên tập sắc sảo, ô tìm kiếm tech stack tuyển dụng, thống kê lương thời gian thực dạng tabular nums.
   - Bên phải (35%): Widget Radar trực quan thể hiện mức độ tương thích kỹ năng thực tế của ứng viên so với yêu cầu công việc.
2. **Hexagonal Verified Skill Badge**:
   - Huy hiệu hình lục giác với đường viền thép đĩnh đạc (`#132F52`), số điểm đánh giá kỹ năng thực chiến (0-100) căn chỉnh dạng bảng, kèm micro-icon chứng nhận.
3. **Admin Dense Data Matrix**:
   - Bảng quản trị siêu mật độ với các status pill tương phản cao, thanh Bulk-Action bar ghim nổi ở chân trang khi chọn nhiều bản ghi (`z-index: 1100`).
4. **Dual-Density Switcher**:
   - Điều khiển phân đoạn (segmented control) trên thanh công cụ cho phép chuyển đổi ngay lập tức giữa chế độ Thoáng đãng (Airy) và Dày đặc (Dense) thông qua thuộc tính `data-density`.

---

## 7. Curated Iconography System

### 7.1. Tiêu Chuẩn Hình Học Lưới 24px (24px Grid Standards)

Hệ thống biểu tượng của Rikkei Jobs được xây dựng trên một quy chuẩn hình học duy nhất:

```text
+---------------------------------------------------+
|                  24px ViewBox                     |
|    +-----------------------------------------+    |
|    |           20px Live Draw Area           |    |
|    |    +-------------------------------+    |    |
|    |    |  Keyline Shapes:              |    |    |
|    |    |  - Vòng tròn: D = 20px        |    |    |
|    |    |  - Hình vuông: 18x18px (R=2)  |    |    |
|    |    |  - Chữ nhật ngang: 20x16px    |    |    |
|    |    |  - Chữ nhật đứng: 16x20px     |    |    |
|    |    +-------------------------------+    |    |
|    +-----------------------------------------+    |
|              Padding viền an toàn: 2px            |
+---------------------------------------------------+
```

1. **Hệ tọa độ ViewBox**: Cố định chính xác `viewBox="0 0 24 24"`.
2. **Vùng vẽ an toàn (Live Draw Area)**: Kích thước `20x20px` (tọa độ từ `(2, 2)` đến `(22, 22)`).
3. **Padding an toàn**: `2px` xung quanh 4 cạnh, bảo vệ các nét bo tròn không bị xén mép.
4. **Độ dày nét vẽ (Stroke Width)**: Duy nhất `stroke-width="2"` (tương đương tỷ lệ nét 8.33%).
5. **Đầu mút & Góc nối**: `stroke-linecap="round"` và `stroke-linejoin="round"`.
6. **Trọng tâm quang học (Optical Centering)**: Căn trọng tâm thị giác của biểu tượng vào tâm tọa độ `(12, 12)`, không căn theo hộp bao toán học.
7. **Kế thừa màu sắc**: `fill="none"`, `stroke="currentColor"`. Biểu tượng tự động kế thừa màu chữ của phần tử cha.

### 7.2. Đặc Tả Thành Phần `<Icon />` Hợp Nhất (Strictly Typed Component)

Toàn bộ biểu tượng trong mã nguồn frontend bắt buộc phải đi qua component hợp nhất:

```tsx
// frontend/src/shared/components/Icon.tsx
import React from 'react';

export type IconName =
  | 'search'
  | 'briefcase'
  | 'user'
  | 'building'
  | 'badge-check'
  | 'calendar'
  | 'bell'
  | 'upload'
  | 'check'
  | 'alert-circle'
  | 'arrow-right'
  | 'filter'
  | 'menu'
  | 'x';

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  /** Tên định danh của biểu tượng đã được giám tuyển trong kho */
  name: IconName;
  /** Kích thước hiển thị chuẩn (mặc định: 24) */
  size?: 16 | 20 | 24 | 32;
  /** ClassName bổ sung tùy biến màu sắc, căn chỉnh */
  className?: string;
  /** Trợ năng: ẩn khỏi máy đọc màn hình khi mang tính trang trí */
  'aria-hidden'?: boolean | 'true' | 'false';
  /** Nhãn mô tả khi icon là nút bấm hành động độc lập */
  'aria-label'?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  className = '',
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
  ...restProps
}) => {
  // Tự động suy luận a11y: Nếu không có aria-label, mặc định coi là icon trang trí
  const isDecorative = ariaHidden !== undefined ? ariaHidden : !ariaLabel;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`rj-icon rj-icon-${name} ${className}`.trim()}
      aria-hidden={isDecorative ? 'true' : undefined}
      aria-label={!isDecorative ? ariaLabel : undefined}
      role={ariaLabel ? 'img' : undefined}
      focusable="false"
      {...restProps}
    >
      <use href={`#rj-icon-${name}`} />
    </svg>
  );
};
```

---

## 8. Purposeful Motion & Animation Token System

### 8.1. Cơ Sở Vật Lý Lò Xo (Spring Physics Formulation)

Chuyển động trong Rikkei Jobs mô phỏng phương trình vi phân dao động điều hòa có cản (Damped Harmonic Oscillator):

$$m \frac{d^2 x}{dt^2} + c \frac{dx}{dt} + k x = 0$$

- $m$ (**Mass**): Khối lượng đối tượng (chuẩn hóa $m = 1.0$).
- $k$ (**Stiffness**): Độ cứng lò xo, quyết định gia tốc trở về trạng thái cân bằng.
- $c$ (**Damping**): Hệ số cản ma sát, kiểm soát mức độ triệt tiêu dao động.
- $\zeta$ (**Damping Ratio**): Tỉ số cản $\zeta = \dfrac{c}{2 \sqrt{k \cdot m}}$.

### 8.2. Bốn Preset Vật Lý Lò Xo Với CSS `linear()` Easing Hiện Đại

Hệ thống cung cấp 4 preset lò xo được tính toán chính xác và nhúng trực tiếp qua hàm `linear()` của CSS Easing Level 2 (zero runtime dependency):

```css
:root {
  /* Preset: snappy (m:1, k:400, c:30, zeta:0.75, settling ~260ms, overshoot ~2.8%) */
  /* Ứng dụng: Dropdown menu, toggle switch, tab indicator, button press */
  --rj-ease-spring-snappy: linear(
    0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 24.4%, 
    0.852 30.2%, 0.941 37%, 0.985 44.5%, 1.006 52.8%, 1.011 59.8%, 
    1 76.5%, 1
  );

  /* Preset: gentle (m:1, k:170, c:26, zeta:0.997, critically damped, 0% overshoot) */
  /* Ứng dụng: Modal dialog enter, slide-over drawer, card mở rộng */
  --rj-ease-spring-gentle: linear(
    0, 0.003, 0.012 2.1%, 0.05 4.6%, 0.287 14.8%, 0.548 24.4%, 
    0.738 34.1%, 0.865 44.2%, 0.938 54.7%, 0.976 65.6%, 0.993 77.2%, 
    1
  );

  /* Preset: stiff (m:1, k:380, c:32, zeta:0.821, settling ~250ms, tactile feedback) */
  /* Ứng dụng: Tooltip pop-in, badge counter nảy nhẹ, focus ring xuất hiện */
  --rj-ease-spring-stiff: linear(
    0, 0.009, 0.038 2.5%, 0.156 5.8%, 0.652 16.5%, 0.835 21.8%, 
    0.938 27.2%, 0.987 33.5%, 1.007 41.2%, 1.008 48.5%, 1 65%, 1
  );

  /* Preset: bouncy-subtle (m:1, k:220, c:18, zeta:0.607, settling ~440ms, overshoot ~8.9%) */
  /* Ứng dụng: Icon checkmark hoàn thành đánh giá, bookmark lưu việc làm */
  --rj-ease-spring-bouncy: linear(
    0, 0.005, 0.021 2.3%, 0.084 5.1%, 0.462 16.2%, 0.655 21.3%, 
    0.814 27%, 0.929 33.3%, 0.998 40.5%, 1.034 48.2%, 1.042 55.6%, 
    1.03 63.8%, 1.009 73.1%, 0.998 83.2%, 1
  );
}
```

### 8.3. Thang Thời Lượng & Ngân Sách Theo Mục Đích (Purpose-Based Budgets)

```css
:root {
  /* Cubic-Bezier Curves */
  --rj-ease-entrance: cubic-bezier(0.16, 1, 0.3, 1);  /* Decelerate mạnh khi xuất hiện */
  --rj-ease-exit:     cubic-bezier(0.7, 0, 0.84, 0);   /* Accelerate nhanh khi biến mất */
  --rj-ease-hover:    cubic-bezier(0.2, 0, 0, 1);      /* Phản hồi tức thời với con trỏ */
  --rj-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);    /* Cân bằng chuyển vị nội bộ */

  /* Duration Scale (Purpose-Based Budgets) */
  --rj-duration-instant:    0ms;
  --rj-duration-micro:      100ms;  /* Micro button depression, badge count bump */
  --rj-duration-fast:       150ms;  /* Tooltip reveal, hover lift, admin transitions (Budget: <=150ms) */
  --rj-duration-normal:     200ms;  /* Dropdown expand, tab slider, popover (Budget: <=200ms) */
  --rj-duration-moderate:   300ms;  /* Modal dialog enter, slide drawer (Budget: <=300ms) */
  --rj-duration-slow:       400ms;  /* Route view transition, hero reveal (Budget: <=400ms) */
  --rj-duration-deliberate: 600ms;  /* SVG stroke draw-in, chart reveal */

  /* Distance Scale */
  --rj-motion-dist-2xs: 2px;
  --rj-motion-dist-xs:  4px;
  --rj-motion-dist-sm:  8px;
  --rj-motion-dist-md:  16px;
  --rj-motion-dist-lg:  24px;

  /* Composite Shortcuts */
  --rj-transition-hover:    transform var(--rj-duration-fast) var(--rj-ease-hover), 
                            opacity var(--rj-duration-fast) var(--rj-ease-hover);
  --rj-transition-entrance: transform var(--rj-duration-moderate) var(--rj-ease-entrance), 
                            opacity var(--rj-duration-moderate) var(--rj-ease-entrance);
  --rj-transition-exit:     transform var(--rj-duration-fast) var(--rj-ease-exit), 
                            opacity var(--rj-duration-fast) var(--rj-ease-exit);
}
```

### 8.4. Quy Tắc Hiệu Năng GPU & Rào Cản Trợ Năng

#### Quy Tắc Hiệu Năng 60fps & 0 Layout Thrashing

- **CHỈ ĐƯỢC PHÉP ANIMATE HAI THUỘC TÍNH**: `transform` và `opacity`.
  - Hai thuộc tính này được xử lý độc quyền trên **Compositor Thread** và tăng tốc phần cứng thông qua GPU, hoàn toàn không kích hoạt lại giai đoạn Layout (Reflow) và Paint của trình duyệt.
  - Chỉ số bắt buộc: **Cumulative Layout Shift (CLS) = 0**.
- **CẤM TUYỆT ĐỐI**: Animate các thuộc tính hình học (`width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`).

#### Trợ Năng Chuyển Động (`prefers-reduced-motion` & WCAG 2.2.2 / 2.3.1)

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --rj-duration-instant:    0.001ms;
    --rj-duration-micro:      0.001ms;
    --rj-duration-fast:       0.001ms;
    --rj-duration-normal:     0.001ms;
    --rj-duration-moderate:   0.001ms;
    --rj-duration-slow:       0.001ms;
    --rj-duration-deliberate: 0.001ms;

    --rj-motion-dist-2xs: 0px;
    --rj-motion-dist-xs:  0px;
    --rj-motion-dist-sm:  0px;
    --rj-motion-dist-md:  0px;
    --rj-motion-dist-lg:  0px;

    /* Giải pháp thay thế có ý nghĩa: 100ms Opacity Cross-fade */
    --rj-transition-hover:    opacity 100ms ease;
    --rj-transition-entrance: opacity 100ms ease;
    --rj-transition-exit:     opacity 100ms ease;
  }

  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

- **Giải pháp `0.001ms`**: Thay vì đặt `0s` (làm tê liệt sự kiện `transitionend` trên WebKit/Safari), sử dụng `0.001ms` để hoàn thành ngay tức khắc nhưng vẫn kích hoạt đầy đủ event loop của trình duyệt.
- **Tuân thủ WCAG 2.2.2**: Cung cấp nút tạm dừng/dừng cho bất kỳ hoạt ảnh tự động lặp lại nào kéo dài quá 5 giây.
- **Tuân thủ WCAG 2.3.1**: Tuyệt đối không có hiệu ứng chớp tắt quá 3 lần trong một giây (> 3Hz). Hiệu ứng Skeleton Loading Pulse phải có chu kỳ $\ge 1.5$ giây.

---

## 9. Pre-Delivery Checklist & Visual Review Protocol

### 9.1. Danh Mục 8 Tiêu Chuẩn Kiểm Định Trước Khi Bàn Giao

Mọi kỹ sư hoặc tác nhân lập trình AI bắt buộc phải đối soát 8 tiêu chuẩn cơ học trước khi mở Pull Request:

| # | Hạng Mục Kiểm Định | Tiêu Chuẩn Kỹ Thuật Bắt Buộc | Phương Pháp Kiểm Chứng Cơ Học | Kết Quả Tối Thiểu |
|---|---|---|---|---|
| **1** | **Tương phản Màu sắc (Contrast)** | Văn bản thường $\ge 4.5:1$, văn bản lớn & UI component $\ge 3.0:1$ trên cả Light Mode & Dark Mode. | Chạy script tính toán tương phản sRGB hoặc Chrome Lighthouse/axe audit. | **PASS 100%**, không có bất kỳ ngoại lệ nào. |
| **2** | **Trạng thái Tương tác (States)** | Đầy đủ 5 trạng thái: Default, Hover, Focus-visible, Active, Disabled. | Dùng phím Tab duyệt qua toàn bộ controls, kiểm tra vòng focus ring 2px. | Focus ring luôn rõ nét, không dùng `outline: none` trần. |
| **3** | **Kiểu chữ & Tiếng Việt (Typography)** | Plus Jakarta Sans + Be Vietnam Pro + JetBrains Mono, `line-height >= 1.5` cho body, không cắt ngọn dấu, `tabular-nums` trên bảng số liệu. | Soi các từ có dấu kép: `tuyển dụng`, `nguyện vọng`, `phỏng vấn`, `kết quả`, `ệ ổ ự ữ ặ`. | Dấu tiếng Việt thanh thoát, số liệu căn thẳng hàng dọc. |
| **4** | **Mật độ Thông tin (Density)** | Admin/HR: Dense mode (row 36-38px, padding 6-8px). Candidate: Airy mode (row 56px, padding 24px). | Kiểm tra class `[data-density="dense"]` trên trang quản trị so với trang ứng viên. | Hiển thị đúng ngữ cảm và tối ưu hóa năng suất theo vai trò. |
| **5** | **Hiệu năng Chuyển động (Motion)** | CHỈ animate `transform` và `opacity`. CLS = 0. Tuân thủ purpose budgets. Hỗ trợ `prefers-reduced-motion` 100ms cross-fade & 0.001ms. | Chrome DevTools Rendering: Paint Flashing tắt, Layout Shift Regions sạch. | 60fps mượt mà, không giật màn hình khi bật reduced motion. |
| **6** | **Hệ thống Icon & Triệt tiêu Emoji** | 100% icon qua `<Icon name=... />` lưới 24px nét 2px round. **ZERO EMOJI** trong toàn bộ UI và tài liệu. Đủ nhãn a11y. | Quét regex ký tự emoji (`[\u{1F300}-\u{1F9FF}]`); quét cấm import raw stock icons. | Không phát hiện bất kỳ emoji nào trong mã nguồn UI. |
| **7** | **Độ phản hồi 4 Điểm ngắt (Responsive)** | Hoạt động trơn tru tại: 375px (Mobile), 768px (Tablet), 1024px (Desktop), 1440px (Wide). | Playwright viewport screenshot test hoặc co giãn cửa sổ trình duyệt. | **Horizontal Scroll = 0** ở mọi điểm ngắt, không vỡ khối. |
| **8** | **Vùng chạm Cảm ứng (Target Size)** | Diện tích chạm thực tế của button, link icon trên mobile/tablet tối thiểu **$44 \times 44\text{px}$**. | Đo đạc bounding box của thẻ click bằng Chrome DevTools Inspector. | Đạt chuẩn WCAG 2.5.5 / 2.5.8 Target Size. |

---

## 10. Scored Anti-AI Review Rubric & Compliance Gate

### 10.1. Cấu Trúc Rubric Đánh Giá 6 Tiêu Chí (0 - 2 Điểm)

Mọi bản thiết kế và Pull Request giao diện được định lượng cơ học qua 6 tiêu chí độc lập:

$$\text{Tổng Điểm} = \sum_{i=1}^{6} C_i \quad (0 \le \text{Tổng Điểm} \le 12)$$

- **Ngưỡng Thông Qua (PASS Gate)**: **Tổng Điểm $\ge 11 / 12$** VÀ **Không có bất kỳ tiêu chí nào bị 0 điểm**.
- **Nguyên Tắc Phủ Quyết Tuyệt Đối (Hard Veto Rule)**: **BẤT KỲ TIÊU CHÍ NÀO BỊ 0 ĐIỂM SẼ BỊ ĐÁNH TRƯỢT NGAY LẬP TỨC (FAIL / REJECT)**, bất kể tổng điểm các tiêu chí khác là bao nhiêu. Pull Request bị khóa và yêu cầu lập trình viên chỉnh sửa triệt để.

### 10.2. Ma Trận Chi Tiết Định Nghĩa Thang Điểm (0 - 1 - 2)

| # | Tiêu Chí Đánh Giá | Điểm 0 (Failed / AI Look) | Điểm 1 (Borderline / Basic) | Điểm 2 (Enterprise Quality) |
|---|---|---|---|---|
| **C1** | **Typography & Hierarchy** | Dùng font Inter mặc định; dấu tiếng Việt bị cắt ngọn hoặc đè dòng (`line-height < 1.4`); số liệu bảng biểu giật layout; tải font ngoài qua CDN. | Font hệ thống cơ bản; tiếng Việt hiển thị đủ dấu (`line-height 1.4 - 1.45`); có phân cấp tiêu đề; nhưng một số bảng quên khai báo `tabular-nums`. | Phối hợp Plus Jakarta Sans + Be Vietnam Pro + JetBrains Mono; tiếng Việt chuẩn xác với `line-height >= 1.5`; 100% số liệu dùng `tabular-nums`; thang 9 cấp typography modular scale hoàn hảo. |
| **C2** | **Spacing, Layout & Density** | Hero căn giữa + lưới 3 cột thẻ bo góc giống hệt nhau (`grid-cols-3`); padding đều chằn chặn `p-4`; không phân hóa mật độ vai trò; cuộn ngang ở 375px. | Bố cục responsive ổn định trên 4 breakpoints; không cuộn ngang; có phân cấp khoảng cách nhưng cấu trúc còn mang tính template rập khuôn. | Bố cục nhịp điệu biên tập bất đối xứng 65/35 (8 cột chính / 4 cột tiện ích); phân hóa hoàn hảo: Dense Mode (row 36-38px) cho Admin/HR vs Airy Mode (row 56px, padding 24px) cho Candidate. |
| **C3** | **Color Palette & Contrast** | Hero gradient tím - xanh; kính mờ glassmorphism bừa bãi; chữ xám mờ nhạt không đủ tương phản ($CR < 4.5:1$); Dark mode đảo màu âm bản; hardcode hex tùy tiện. | Không dùng gradient tím hay glassmorphism; văn bản đạt tương phản tối thiểu 4.5:1; Dark mode cơ bản nhưng thiếu tầng nâng bề mặt (surface elevations). | 100% kế thừa từ Bespoke Palette (Iron Charcoal, Iron Cobalt, Cyber Persimmon); tương phản được chứng minh bằng công thức toán học W3C sRGB; Dark mode thiết kế riêng theo thang sáng; viền input $\ge 3.0:1$, focus ring $\ge 3.0:1$. |
| **C4** | **Iconography & Visual Assets** | Xuất hiện emoji trong UI (ví dụ: rocket, sparkles...); nhập raw stock icons từ thư viện ngoài với nét cọc cạch; thiếu thuộc tính trợ năng `aria-hidden` hoặc `aria-label`. | Không có emoji; sử dụng một họ icon thống nhất; có nhãn trợ năng cơ bản nhưng icon gọi trực tiếp từ thư viện ngoài, chưa bọc qua component chuẩn. | Hệ thống icon độc quyền tuyển chọn trên **lưới 24px, nét 2px round/round**; gọi duy nhất qua component `<Icon name=... />`; triệt tiêu 100% emoji; đầy đủ nhãn a11y. |
| **C5** | **Purposeful Motion** | Hiệu ứng nảy (bounce), lắc (wiggle); fade-up cơ học hàng loạt; chuyển động chậm (> 400ms); animate kích hoạt layout (`width`, `height`); không hỗ trợ reduced motion. | Không có nảy/lắc khó chịu; chuyển trạng thái tương đối mượt; có tắt animation khi bật reduced motion nhưng chưa có dàn dựng thứ tự xuất hiện tinh tế. | Preset vật lý lò xo chuẩn (`snappy`, `gentle`, `stiff`) và cubic-bezier chuyên biệt; 60fps tuyệt đối (CHỈ animate `transform`/`opacity`, CLS = 0); hỗ trợ toàn diện `prefers-reduced-motion` 100ms cross-fade và 0.001ms duration. |
| **C6** | **AI-Tell Avoidance** | Xuất hiện từ 2 dấu hiệu nhận diện AI trở lên (gradient tím - xanh, kính mờ, 3 card rập khuôn, copy sáo rỗng "Welcome to...", lorem ipsum, rò rỉ test ID). | Không có lỗi AI thô thiển; có nội dung thực tế về Rikkei Jobs nhưng tổng thể vẫn mang cảm giác "starter template", thiếu cá tính công nghệ chuyên sâu. | Hoàn toàn sạch bóng dấu hiệu AI; thiết kế mang bản sắc CNTT thực chiến đẳng cấp; nội dung song ngữ chuẩn mực; thẻ dữ liệu phong phú theo ngữ cảnh nghiệp vụ; sở hữu 4 Signature Elements riêng biệt. |

### 10.3. Mẫu Bảng Tự Đánh Giá Pull Request (PR Review Scorecard Template)

Mọi Pull Request giao diện bắt buộc phải đính kèm bảng tự đánh giá dưới đây trong phần mô tả:

```markdown
### Anti-AI Look Review Scorecard (Task T022DB0)

| Tiêu Chí Đánh Giá | Điểm Số (0 - 2) | Dẫn Chứng Mã Nguồn & Bằng Chứng Kiểm Định |
|---|:---:|---|
| C1. Typography & Hierarchy | [0 / 1 / 2] | Plus Jakarta Sans + Be Vietnam Pro + JetBrains Mono, line-height >= 1.5, tabular-nums |
| C2. Spacing, Layout & Density | [0 / 1 / 2] | Lưới 65/35, Dense Mode (row 38px) cho Admin / Airy Mode cho Candidate |
| C3. Color Palette & Contrast | [0 / 1 / 2] | Bespoke Palette, CR primary text 17.41:1 (Light) & 15.17:1 (Dark), viền input >= 3.0:1 |
| C4. Iconography & Visual Assets | [0 / 1 / 2] | Component <Icon name=... />, 0 emoji, nét 2px round trên lưới 24px |
| C5. Purposeful Motion | [0 / 1 / 2] | Chỉ animate transform/opacity, hỗ trợ reduced-motion 100ms cross-fade & 0.001ms, preset snappy |
| C6. AI-Tell Avoidance | [0 / 1 / 2] | Không glassmorphism, không 3 thẻ đối xứng rập khuôn, 4 signature elements, copy thực tế CNTT |
| **TỔNG ĐIỂM** | **[X / 12]** | **Trạng thái: [PASS (>= 11/12, không điểm 0) / REJECT]** |
```
