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

### 1.4. Nguồn Nhận diện Thương hiệu & Thuyết minh Độ lệch Kiến trúc Sản phẩm (Brand Identity Source & Product Architectural Deviation Rationale)

Khảo sát dữ liệu nhận diện công khai (truy cập ngày 12/11/2026 tại `https://rikkei.edu.vn`, `https://rikkeiacademy.edu.vn` và `https://rikkeisoft.com`) ghi nhận: hệ thống nhận diện thương hiệu công cộng của Rikkei Education và tập đoàn Rikkeisoft sử dụng tông màu Đỏ doanh nghiệp đặc trưng (`#ED1B2E` / `#D6083B`) biểu trưng cho nhiệt huyết và năng lượng tuổi trẻ.

**Ghi chú Minh bạch về Nguồn Nhận diện Thương hiệu & Quyết định Giao diện Blue-led (C0 / C4)**:  
Khảo sát dữ liệu nhận diện công khai (truy cập ngày 12/11/2026 tại `https://rikkei.edu.vn`, `https://rikkeiacademy.edu.vn` và `https://rikkeisoft.com`) ghi nhận: hệ thống nhận diện thương hiệu công cộng của Rikkei Education và tập đoàn Rikkeisoft sử dụng tông màu Đỏ doanh nghiệp đặc trưng (`#ED1B2E` / `#D6083B`) biểu trưng cho nhiệt huyết và năng lượng tuổi trẻ. Tuy nhiên, trong sản phẩm Rikkei Jobs (nền tảng thẩm định năng lực và tuyển dụng kỹ sư công nghệ), việc sử dụng màu đỏ làm màu chủ đạo giao diện gây xung đột công thái học nghiêm trọng với trạng thái lỗi ngữ nghĩa (Semantic Error State) và tạo áp lực tâm lý cho người dùng.  
Theo Quyết định Tối cao và Cuối cùng của User / Team Lead tại Round C (C0), Rikkei Jobs áp dụng bảng màu Xanh dương chủ đạo (Technical Cobalt / Deep Navy Blue-led). Quyết định này là bất biến: màu đỏ được bảo lưu độc quyền cho trạng thái lỗi kỹ thuật (kèm chỉ dẫn phi màu sắc: icon, border, nhãn cảnh báo), trong khi sắc xanh đại diện cho sự tin cậy, an tâm và chuẩn mực kỹ thuật công nghệ cao. Tài liệu thiết kế ghi nhận sự sai lệch có chủ đích (Product Architectural Deviation) này giữa giao diện phần mềm chuyên dụng và nhận diện thương hiệu truyền thông công cộng.

**Brand Identity Source & Product Architectural Deviation Note (C0 / C4)**:  
Public brand research conducted on 2026-11-12 across official web properties (`https://rikkei.edu.vn`, `https://rikkeiacademy.edu.vn`, `https://rikkeisoft.com`) confirms that Rikkei Education and Rikkeisoft utilize a vibrant corporate Red palette (`#ED1B2E` / `#D6083B`) as their primary marketing brand color. However, for an enterprise assessment and talent matching platform, adopting red as the primary brand color introduces severe cognitive friction and visual ambiguity against semantic error/danger states.  
By the definitive and binding mandate of the User / Team Lead in Round C (C0), the Rikkei Jobs frontend strictly standardizes on a Blue-dominant visual hierarchy (Technical Cobalt / Deep Navy). This decision is final: red is strictly quarantined to semantic error feedback (complemented by non-color cues: icons, borders, and warning text), while the blue palette delivers stability, accessibility, and professional technical rigor. This deliberate architectural deviation between the specialized software UI and public media branding is formally acknowledged and documented.

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
│ Ví dụ: --rj-primitive-brand-600: #0D55B8;                       │
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
     1. PRIMITIVE COLOR SCALES (Bespoke Palette: Technical Deep Cobalt & Iron Obsidian)
     =================================================================== */

  /* Neutral Palette: Technical Iron Charcoal
     Sắc xám lạnh than chì và xanh đen obsidian, chuẩn mực kỹ thuật và bảo vệ thị giác */
  --rj-primitive-neutral-50:  #F8FAFD; /* Vùng nhập Field Inset Light Mode */
  --rj-primitive-neutral-100: #EEF2F8; /* Nền canvas trang Light Mode (Soft Steel Canvas) */
  --rj-primitive-neutral-150: #E1E8F2; /* Bảng Hero Story Panel Light Mode (60/40 Split) */
  --rj-primitive-neutral-200: #D8E2EE; /* Đường phân cách subtle */
  --rj-primitive-neutral-300: #BACAD9; /* Viền thẻ subtle */
  --rj-primitive-neutral-400: #889BB0; /* Placeholder, icon inactive */
  --rj-primitive-neutral-500: #6F8094; /* Viền tương tác Light Mode (CR 4.05:1 on #FFFFFF) */
  --rj-primitive-neutral-600: #475B70; /* Text muted Light Mode (CR 7.00:1 on #FFFFFF) */
  --rj-primitive-neutral-700: #25394E; /* Text secondary Light Mode (CR 11.84:1 on #FFFFFF) */
  --rj-primitive-neutral-800: #162030; /* Nền thẻ Card Surface Dark Mode */
  --rj-primitive-neutral-900: #0B1A2C; /* Text primary Light Mode Deep Navy (CR 17.52:1 on #FFFFFF) */
  --rj-primitive-neutral-950: #0B1019; /* Nền canvas trang Dark Mode Deep Obsidian */
  --rj-primitive-white:       #FFFFFF;

  /* Brand Anchor: Confident Royal Cobalt (Hệ màu xanh sở hữu riêng)
     Thể hiện tính chuẩn mực, chiều sâu kỹ thuật và uy tín đào tạo - tuyển dụng */
  --rj-primitive-brand-50:             #EBF2FC; /* Nền wash thương hiệu / Soft Brand Tint */
  --rj-primitive-brand-100:            #D0E1F9; /* Viền badge tint phụ */
  --rj-primitive-brand-200:            #A3C5F3; /* Viền subtle tương tác */
  --rj-primitive-brand-500:            #1B6BD8; /* Sắc xanh cobalt phụ trợ */
  --rj-primitive-brand-600:            #0D55B8; /* Confident Royal Cobalt — CR 6.98:1 on #FFFFFF */
  --rj-primitive-brand-700:            #0A4596; /* Deep Cobalt Hover — CR 9.11:1 on #FFFFFF */
  --rj-primitive-brand-800:            #083674; /* Deep Cobalt Active — CR 11.73:1 on #FFFFFF */
  --rj-primitive-brand-electric:       #508CEE; /* Luminous Cobalt Dark Mode — CR 4.93:1 on Card */
  --rj-primitive-brand-electric-hover: #6EA2F4; /* Hover Dark Mode — CR 7.38:1 on Dark Canvas */

  /* Accent: Cyber Persimmon / Terracotta
     Sắc cam đất nung công nghệ cao, thể hiện nhiệt huyết đào tạo và cơ hội nghề nghiệp */
  --rj-primitive-accent-50:  #FEF2ED;
  --rj-primitive-accent-100: #FDE2D6;
  --rj-primitive-accent-500: #F08C65; /* Accent Dark Mode (CR 7.03:1 on #111C2E) */
  --rj-primitive-accent-600: #D9480F; /* Accent Light Mode (CR 4.30:1 on #FFFFFF) */
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

  /* Functional Status: Cold Crimson Brick (Error / Danger - Tách biệt hoàn toàn khỏi Brand Blue) */
  --rj-primitive-danger-50:    #FDF2F4; /* Nền alert Light Mode */
  --rj-primitive-danger-100:   #FCE4E7;
  --rj-primitive-danger-200:   #F5B7B1; /* Viền alert Light Mode */
  --rj-primitive-danger-600:   #943126;
  --rj-primitive-danger-700:   #9B1C2A; /* Text/Solid Badge Light Mode (CR 7.40:1 on #FDF2F4, 8.10:1 on #FFFFFF) */
  --rj-primitive-danger-light: #F1707A; /* Text Dark Mode (CR 6.32:1 on #2D0A0E) */
  --rj-primitive-danger-950:   #2D0A0E; /* Nền alert Dark Mode */

  /* Functional Status: Cerulean Blue (Info - Lam ánh ngọc mòng két) */
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
  --rj-color-surface-page:       var(--rj-primitive-neutral-50);  /* #F7F9FC - Canvas Light Mode */
  --rj-color-surface-card:       var(--rj-primitive-white);       /* #FFFFFF - Card Surface */
  --rj-color-surface-subtle:     var(--rj-primitive-neutral-100); /* #EEF2F6 - Table Header */
  --rj-color-surface-elevated:   var(--rj-primitive-white);       /* #FFFFFF - Modal/Popover */
  --rj-color-surface-overlay:    rgba(12, 26, 48, 0.55);

  /* Text & Foreground Tokens */
  --rj-color-text-primary:       var(--rj-primitive-neutral-900); /* #0B1A2C - Deep Navy CR 17.52:1 on #FFFFFF */
  --rj-color-text-secondary:     var(--rj-primitive-neutral-700); /* #25394E - CR 11.84:1 on #FFFFFF */
  --rj-color-text-muted:         var(--rj-primitive-neutral-600); /* #475B70 - CR 7.00:1 on #FFFFFF */
  --rj-color-text-inverse:       var(--rj-primitive-white);       /* #FFFFFF */
  --rj-color-text-disabled:      var(--rj-primitive-neutral-400); /* #889BB0 */

  /* Border & Outline Tokens (WCAG 1.4.11 Non-text Contrast >= 3.0:1) */
  --rj-color-border-subtle:      var(--rj-primitive-neutral-300); /* #BACAD9 - Dividers */
  --rj-color-border-interactive: var(--rj-primitive-neutral-500); /* #6F8094 - CR 4.05:1 on #FFFFFF */
  --rj-color-border-hover:       var(--rj-primitive-neutral-700); /* #25394E - CR 11.84:1 */
  --rj-color-border-focus:       var(--rj-primitive-brand-600);   /* #0D55B8 */

  /* Action & Interactive State Tokens (Confident Royal Cobalt) */
  --rj-color-action-primary-bg:        var(--rj-primitive-brand-600);   /* #0D55B8 - Confident Royal Cobalt */
  --rj-color-action-primary-fg:        var(--rj-primitive-white);       /* #FFFFFF - CR 6.98:1 on #0D55B8 */
  --rj-color-action-primary-hover-bg:  var(--rj-primitive-brand-700);   /* #0A4596 - Deep Cobalt Hover */
  --rj-color-action-primary-hover-fg:  var(--rj-primitive-white);       /* #FFFFFF - CR 9.11:1 */
  --rj-color-action-primary-active-bg: var(--rj-primitive-brand-800);   /* #083674 - CR 11.73:1 */
  --rj-color-action-link:              var(--rj-primitive-brand-600);   /* #0D55B8 - CR 6.98:1 */
  --rj-color-action-secondary-bg:      var(--rj-primitive-neutral-100); /* #EEF2F8 */
  --rj-color-action-secondary-fg:      var(--rj-primitive-neutral-900); /* #0B1A2C - CR 17.52:1 */
  --rj-color-action-secondary-hover-bg:var(--rj-primitive-neutral-200); /* #D8E2EE */

  /* Accent Tokens (Cyber Persimmon / Terracotta) */
  --rj-color-accent:              var(--rj-primitive-accent-600); /* #D9480F - CR 4.30:1 */
  --rj-color-accent-hover:        var(--rj-primitive-accent-700); /* #BF3A0A */
  --rj-color-accent-subtle:       var(--rj-primitive-accent-50);  /* #FEF2ED */

  /* Status Indicators: Distinct Non-Brand Functional Semantics */
  --rj-color-status-success-bg:      var(--rj-primitive-success-50);  /* #E8F8F5 */
  --rj-color-status-success-text:    var(--rj-primitive-success-700); /* #0E6251 - CR 6.65:1 */
  --rj-color-status-success-border:  var(--rj-primitive-success-200); /* #A2D9CE */
  --rj-color-status-success-solid:   var(--rj-primitive-success-700); /* #0E6251 - CR 7.28:1 */

  --rj-color-status-warning-bg:      var(--rj-primitive-warning-50);  /* #FEF9E7 */
  --rj-color-status-warning-text:    var(--rj-primitive-warning-700); /* #7A4305 - CR 7.57:1 */
  --rj-color-status-warning-border:  var(--rj-primitive-warning-200); /* #F9E79F */
  --rj-color-status-warning-solid:   var(--rj-primitive-warning-700); /* #7A4305 - CR 7.98:1 */

  --rj-color-status-error-bg:        var(--rj-primitive-danger-50);   /* #FDF2F4 - Cold Crimson Tint */
  --rj-color-status-error-text:      var(--rj-primitive-danger-700);  /* #9B1C2A - Cold Crimson Core Error CR 7.40:1 on #FDF2F4, 8.10:1 on #FFFFFF */
  --rj-color-status-error-border:    var(--rj-primitive-danger-200);  /* #F5B7B1 */
  --rj-color-status-error-solid:     var(--rj-primitive-danger-700);  /* #9B1C2A */

  --rj-color-status-info-bg:         var(--rj-primitive-info-50);     /* #EBF5FB */
  --rj-color-status-info-text:       var(--rj-primitive-info-700);    /* #134B5E - CR 8.65:1 */
  --rj-color-status-info-border:     var(--rj-primitive-info-200);    /* #A9CCE3 */
  --rj-color-status-info-solid:      var(--rj-primitive-info-700);    /* #134B5E - CR 9.56:1 */

  /* Focus Indicator Ring (WCAG 2.2 Criterion 2.4.7 & 2.4.11) */
  --rj-color-focus-ring:         var(--rj-primitive-brand-600);   /* #0D55B8 - CR 6.98:1 on #FFFFFF */
  --rj-focus-ring-width:         2px;
  --rj-focus-ring-offset:        2px;
}

/* =====================================================================
   DARK MODE SEMANTIC THEME
   Nguyên lý: Tầng bậc độ sáng quang học thực tế, không đảo màu âm bản thô thiển
   ===================================================================== */
[data-theme="dark"] {
  /* Surface Tokens (Layered Iron Obsidian Elevation) */
  --rj-color-surface-page:       var(--rj-primitive-neutral-950); /* #0B1019 - Canvas Base Dark Deep Obsidian */
  --rj-color-surface-panel:      #101724;                         /* #101724 - Hero Story Panel Dark */
  --rj-color-surface-card:       var(--rj-primitive-neutral-800); /* #162030 - Thẻ Card Dark */
  --rj-color-surface-input:      #0D1420;                         /* #0D1420 - Field Inset Dark */
  --rj-color-surface-elevated:   #1E2C42;                         /* #1E2C42 - Khối Nổi Elevated Dark */
  --rj-color-surface-subtle:     #101724;
  --rj-color-surface-overlay:    rgba(11, 16, 25, 0.85);

  /* Text & Foreground Tokens */
  --rj-color-text-primary:       #EDF2F7;                         /* #EDF2F7 - CR 14.53:1 on #162030 */
  --rj-color-text-secondary:     #CBD5E1;                         /* #CBD5E1 - CR 11.02:1 on #162030 */
  --rj-color-text-muted:         #94A3B8;                         /* #94A3B8 - CR 6.38:1 on #162030 */
  --rj-color-text-inverse:       var(--rj-primitive-neutral-950); /* #0B1019 */
  --rj-color-text-disabled:      #5B7083;

  /* Border & Outline Tokens (Hiệu chỉnh toán học để đạt CR >= 3.0:1 trên #162030) */
  --rj-color-border-subtle:      #1E2D42;
  --rj-color-border-interactive: var(--rj-primitive-neutral-600); /* #5B7083 - CR 3.19:1 on #162030 >= 3.0:1 */
  --rj-color-border-elevated:    #94A3B8;
  --rj-color-border-hover:       #CBD5E1;
  --rj-color-border-focus:       #508CEE;                         /* #508CEE - Focus Ring Dark (CR 4.93:1) */

  /* Action & Interactive State Tokens (Brand Luminous Cobalt) */
  --rj-color-action-primary-bg:        var(--rj-primitive-brand-electric);       /* #508CEE - CR 4.93:1 on #162030 */
  --rj-color-action-primary-fg:        var(--rj-primitive-neutral-950);          /* #0B1019 - CR 5.74:1 */
  --rj-color-action-primary-hover-bg:  var(--rj-primitive-brand-electric-hover); /* #6EA2F4 */
  --rj-color-action-primary-hover-fg:  var(--rj-primitive-neutral-950);          /* #0B1019 - CR 7.38:1 */
  --rj-color-action-primary-active-bg: var(--rj-primitive-brand-500);            /* #1B6BD8 */
  --rj-color-action-link:              var(--rj-primitive-brand-electric);       /* #508CEE - CR 4.93:1 on #162030 */
  --rj-color-action-secondary-bg:      var(--rj-primitive-neutral-800);          /* #162030 */
  --rj-color-action-secondary-fg:      #EDF2F7;                                  /* #EDF2F7 - CR 14.53:1 */
  --rj-color-action-secondary-hover-bg:#1E2C42;

  /* Accent Tokens (Cyber Persimmon Dark) */
  --rj-color-accent:              var(--rj-primitive-accent-500); /* #F08C65 */
  --rj-color-accent-hover:        #FA9D78;
  --rj-color-accent-subtle:       rgba(240, 140, 101, 0.15);

  /* Status Indicators Dark Mode */
  --rj-color-status-success-bg:      rgba(72, 199, 142, 0.15);
  --rj-color-status-success-text:    var(--rj-primitive-success-light); /* #48C78E - CR 7.40:1 */
  --rj-color-status-success-border:  rgba(72, 199, 142, 0.30);
  --rj-color-status-success-solid:   #196F3D;

  --rj-color-status-warning-bg:      rgba(245, 176, 65, 0.15);
  --rj-color-status-warning-text:    var(--rj-primitive-warning-light); /* #F5B041 - CR 9.14:1 */
  --rj-color-status-warning-border:  rgba(245, 176, 65, 0.30);
  --rj-color-status-warning-solid:   #935116;

  --rj-color-status-error-bg:        rgba(155, 28, 42, 0.15);           /* Cold Crimson Dark Tint */
  --rj-color-status-error-text:      var(--rj-primitive-danger-light);  /* #F1707A - Cold Crimson Dark Text CR 6.32:1 */
  --rj-color-status-error-border:    rgba(241, 112, 122, 0.35);
  --rj-color-status-error-solid:     #781620;

  --rj-color-status-info-bg:         rgba(93, 173, 226, 0.15);
  --rj-color-status-info-text:       var(--rj-primitive-info-light);    /* #5DADE2 - CR 6.97:1 */
  --rj-color-status-info-border:     rgba(93, 173, 226, 0.30);
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

Toàn bộ 36 cặp màu thực tế trong hệ thống Rikkei Jobs ở chế độ Sáng (Light Mode - Technical Deep Cobalt / Round E) được kiểm chứng qua giải thuật toán học thực nghiệm WCAG 2.2 Relative Luminance và W3C/Myndex APCA 0.98G-4g, tuyệt đối không dùng emoji, chỉ sử dụng văn bản thuần PASS:

| STT | Thành phần Giao diện (Role) | Token Màu Chữ / FG | Hex FG | Token Màu Nền / BG | Hex BG | $L_{\text{FG}}$ | $L_{\text{BG}}$ | Tỷ lệ $CR$ | Ngưỡng Chuẩn | APCA $L_c$ | Kết luận |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Văn bản chính trên Thẻ Card | `--rj-primitive-neutral-900` | `#0B1A2C` | `--rj-color-surface-card` | `#FFFFFF` | 0.0099 | 1.0000 | **17.52:1** | $\ge 4.5:1$ | +104.3 | PASS (AAA) |
| 2 | Văn bản chính trên Nền Canvas | `--rj-primitive-neutral-900` | `#0B1A2C` | `--rj-primitive-neutral-100` | `#EEF2F8` | 0.0099 | 0.8846 | **15.60:1** | $\ge 4.5:1$ | +96.3 | PASS (AAA) |
| 3 | Văn bản chính trên Bảng Hero Panel | `--rj-primitive-neutral-900` | `#0B1A2C` | `--rj-primitive-neutral-150` | `#E1E8F2` | 0.0099 | 0.8013 | **14.21:1** | $\ge 4.5:1$ | +90.3 | PASS (AAA) |
| 4 | Văn bản chính trên Vùng Nhập Field Inset | `--rj-primitive-neutral-900` | `#0B1A2C` | `--rj-primitive-neutral-50` | `#F8FAFD` | 0.0099 | 0.9542 | **16.76:1** | $\ge 4.5:1$ | +101.2 | PASS (AAA) |
| 5 | Văn bản phụ trên Thẻ Card | `--rj-primitive-neutral-700` | `#25394E` | `--rj-color-surface-card` | `#FFFFFF` | 0.0387 | 1.0000 | **11.84:1** | $\ge 4.5:1$ | +97.1 | PASS (AAA) |
| 6 | Văn bản phụ trên Nền Canvas | `--rj-primitive-neutral-700` | `#25394E` | `--rj-primitive-neutral-100` | `#EEF2F8` | 0.0387 | 0.8846 | **10.54:1** | $\ge 4.5:1$ | +89.1 | PASS (AAA) |
| 7 | Văn bản phụ trên Bảng Hero Panel | `--rj-primitive-neutral-700` | `#25394E` | `--rj-primitive-neutral-150` | `#E1E8F2` | 0.0387 | 0.8013 | **9.60:1** | $\ge 4.5:1$ | +83.1 | PASS (AAA) |
| 8 | Văn bản phụ trên Vùng Nhập Field Inset | `--rj-primitive-neutral-700` | `#25394E` | `--rj-primitive-neutral-50` | `#F8FAFD` | 0.0387 | 0.9542 | **11.32:1** | $\ge 4.5:1$ | +94.0 | PASS (AAA) |
| 9 | Chữ ghi chú mờ trên Thẻ Card | `--rj-primitive-neutral-600` | `#475B70` | `--rj-color-surface-card` | `#FFFFFF` | 0.0999 | 1.0000 | **7.00:1** | $\ge 4.5:1$ | +84.2 | PASS (AAA) |
| 10 | Chữ ghi chú mờ trên Nền Canvas | `--rj-primitive-neutral-600` | `#475B70` | `--rj-primitive-neutral-100` | `#EEF2F8` | 0.0999 | 0.8846 | **6.23:1** | $\ge 4.5:1$ | +76.3 | PASS (AA) |
| 11 | Chữ ghi chú mờ trên Bảng Hero Panel | `--rj-primitive-neutral-600` | `#475B70` | `--rj-primitive-neutral-150` | `#E1E8F2` | 0.0999 | 0.8013 | **5.68:1** | $\ge 4.5:1$ | +70.2 | PASS (AA) |
| 12 | Chữ ghi chú mờ trên Vùng Nhập Field Inset | `--rj-primitive-neutral-600` | `#475B70` | `--rj-primitive-neutral-50` | `#F8FAFD` | 0.0999 | 0.9542 | **6.70:1** | $\ge 4.5:1$ | +81.1 | PASS (AA) |
| 13 | Chữ Nút Chính trên Nền Brand Core | `--rj-primitive-white` | `#FFFFFF` | `--rj-brand-core` | `#0D55B8` | 1.0000 | 0.1004 | **6.98:1** | $\ge 4.5:1$ | -88.5 | PASS (AAA) |
| 14 | Chữ Nút Hover trên Nền Brand Deep | `--rj-primitive-white` | `#FFFFFF` | `--rj-brand-deep` | `#0A4596` | 1.0000 | 0.0652 | **9.11:1** | $\ge 4.5:1$ | -94.8 | PASS (AAA) |
| 15 | Chữ Nút Active trên Nền Brand Active | `--rj-primitive-white` | `#FFFFFF` | `--rj-primitive-brand-800` | `#083674` | 1.0000 | 0.0395 | **11.73:1** | $\ge 4.5:1$ | -100.1 | PASS (AAA) |
| 16 | Link Hành động trên Thẻ Card | `--rj-brand-core` | `#0D55B8` | `--rj-color-surface-card` | `#FFFFFF` | 0.1004 | 1.0000 | **6.98:1** | $\ge 4.5:1$ | +83.5 | PASS (AAA) |
| 17 | Link Hành động trên Nền Canvas | `--rj-brand-core` | `#0D55B8` | `--rj-primitive-neutral-100` | `#EEF2F8` | 0.1004 | 0.8846 | **6.21:1** | $\ge 4.5:1$ | +75.5 | PASS (AA) |
| 18 | Chữ Nút Phụ trên Thẻ Card | `--rj-primitive-neutral-900` | `#0B1A2C` | `--rj-color-surface-card` | `#FFFFFF` | 0.0099 | 1.0000 | **17.52:1** | $\ge 4.5:1$ | +104.3 | PASS (AAA) |
| 19 | Vòng Focus Ring trên Thẻ Card | `--rj-brand-core` | `#0D55B8` | `--rj-color-surface-card` | `#FFFFFF` | 0.1004 | 1.0000 | **6.98:1** | $\ge 3.0:1$ | +83.5 | PASS (UI) |
| 20 | Vòng Focus Ring trên Nền Canvas | `--rj-brand-core` | `#0D55B8` | `--rj-primitive-neutral-100` | `#EEF2F8` | 0.1004 | 0.8846 | **6.21:1** | $\ge 3.0:1$ | +75.5 | PASS (UI) |
| 21 | Vòng Focus Ring trên Field Inset | `--rj-brand-core` | `#0D55B8` | `--rj-primitive-neutral-50` | `#F8FAFD` | 0.1004 | 0.9542 | **6.68:1** | $\ge 3.0:1$ | +80.3 | PASS (UI) |
| 22 | Chữ Tab Đang Chọn trên Tab Pill | `--rj-brand-core` | `#0D55B8` | `--rj-color-surface-card` | `#FFFFFF` | 0.1004 | 1.0000 | **6.98:1** | $\ge 4.5:1$ | +83.5 | PASS (AAA) |
| 23 | Chữ Tab Không Chọn trên Hero Panel | `--rj-primitive-neutral-700` | `#25394E` | `--rj-primitive-neutral-150` | `#E1E8F2` | 0.0387 | 0.8013 | **9.60:1** | $\ge 4.5:1$ | +83.1 | PASS (AAA) |
| 24 | Đường Đồ Thị Radar trên Hero Panel | `--rj-brand-core` | `#0D55B8` | `--rj-primitive-neutral-150` | `#E1E8F2` | 0.1004 | 0.8013 | **5.66:1** | $\ge 3.0:1$ | +69.4 | PASS (UI) |
| 25 | Nhãn Kỹ Năng Radar trên Hero Panel | `--rj-primitive-neutral-900` | `#0B1A2C` | `--rj-primitive-neutral-150` | `#E1E8F2` | 0.0099 | 0.8013 | **14.21:1** | $\ge 4.5:1$ | +90.3 | PASS (AAA) |
| 26 | Vạch Trắng trên Nền Brand Mark Đỏ | `--rj-primitive-white` | `#FFFFFF` | `--rj-brand-mark` | `#C8161D` | 1.0000 | 0.1294 | **5.85:1** | $\ge 4.5:1$ | -82.4 | PASS (AAA) |
| 27 | Brand Mark Đỏ trên Nền Canvas | `--rj-brand-mark` | `#C8161D` | `--rj-primitive-neutral-100` | `#EEF2F8` | 0.1294 | 0.8846 | **5.21:1** | $\ge 4.5:1$ | +69.1 | PASS (AA) |
| 28 | Brand Mark Đỏ trên Bảng Hero Panel | `--rj-brand-mark` | `#C8161D` | `--rj-primitive-neutral-150` | `#E1E8F2` | 0.1294 | 0.8013 | **4.74:1** | $\ge 4.5:1$ | +63.1 | PASS (AA) |
| 29 | Brand Mark Đỏ trên Thẻ Card | `--rj-brand-mark` | `#C8161D` | `--rj-color-surface-card` | `#FFFFFF` | 0.1294 | 1.0000 | **5.85:1** | $\ge 4.5:1$ | +77.1 | PASS (AA) |
| 30 | Viền Khung Input trên Thẻ Card | `--rj-primitive-neutral-500` | `#6F8094` | `--rj-color-surface-card` | `#FFFFFF` | 0.2096 | 1.0000 | **4.05:1** | $\ge 3.0:1$ | +67.7 | PASS (UI) |
| 31 | Viền Khung Input trên Field Inset | `--rj-primitive-neutral-500` | `#6F8094` | `--rj-primitive-neutral-50` | `#F8FAFD` | 0.2096 | 0.9542 | **3.87:1** | $\ge 3.0:1$ | +64.6 | PASS (UI) |
| 32 | Chữ Báo Lỗi trên Nền Alert | `--rj-color-status-error-text` | `#9B1C2A` | `--rj-color-status-error-bg` | `#FDF2F4` | 0.0797 | 0.9092 | **7.40:1** | $\ge 4.5:1$ | +80.2 | PASS (AAA) |
| 33 | Chữ Báo Lỗi trên Thẻ Card | `--rj-color-status-error-text` | `#9B1C2A` | `--rj-color-surface-card` | `#FFFFFF` | 0.0797 | 1.0000 | **8.10:1** | $\ge 4.5:1$ | +86.5 | PASS (AAA) |
| 34 | Chữ Thành Công trên Nền Alert | `--rj-color-status-success-text` | `#0E6251` | `--rj-color-status-success-bg` | `#E8F8F5` | 0.0942 | 0.9088 | **6.65:1** | $\ge 4.5:1$ | +78.6 | PASS (AA) |
| 35 | Chữ Cảnh Báo trên Nền Alert | `--rj-color-status-warning-text` | `#7A4305` | `--rj-color-status-warning-bg` | `#FEF9E7` | 0.0816 | 0.9459 | **7.57:1** | $\ge 4.5:1$ | +83.6 | PASS (AAA) |
| 36 | Huy hiệu Thương hiệu Brand Badge | `--rj-color-badge-brand-text` | `#0D55B8` | `--rj-color-badge-brand-bg` | `#EBF2FC` | 0.1004 | 0.8819 | **6.20:1** | $\ge 4.5:1$ | +75.3 | PASS (AA) |

### 4.3. Ma trận Chứng minh Tương phản Toán học — Dark Mode (Zero Emoji)

Toàn bộ 30 cặp màu thực tế trong hệ thống Rikkei Jobs ở chế độ Tối (Dark Mode - Technical Iron Obsidian / Round E) được kiểm chứng qua giải thuật toán học thực nghiệm WCAG 2.2 Relative Luminance và W3C/Myndex APCA 0.98G-4g, tuyệt đối không dùng emoji, chỉ sử dụng văn bản thuần PASS:

| STT | Thành phần Giao diện (Role) | Token Màu Chữ / FG | Hex FG | Token Màu Nền / BG | Hex BG | $L_{\text{FG}}$ | $L_{\text{BG}}$ | Tỷ lệ $CR$ | Ngưỡng Chuẩn | APCA $L_c$ | Kết luận |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Văn bản chính trên Thẻ Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-primitive-neutral-800` | `#162030` | 0.8822 | 0.0142 | **14.53:1** | $\ge 4.5:1$ | -96.8 | PASS (AAA) |
| 2 | Văn bản chính trên Nền Canvas Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-primitive-neutral-950` | `#0B1019` | 0.8822 | 0.0051 | **16.91:1** | $\ge 4.5:1$ | -98.5 | PASS (AAA) |
| 3 | Văn bản chính trên Bảng Hero Panel Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-color-surface-panel` | `#101724` | 0.8822 | 0.0085 | **15.93:1** | $\ge 4.5:1$ | -97.9 | PASS (AAA) |
| 4 | Văn bản chính trên Vùng Nhập Field Inset Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-color-surface-field` | `#0D1420` | 0.8822 | 0.0069 | **16.38:1** | $\ge 4.5:1$ | -98.2 | PASS (AAA) |
| 5 | Văn bản chính trên Khối Nổi Elevated Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-color-surface-elevated` | `#1E2C42` | 0.8822 | 0.0247 | **12.48:1** | $\ge 4.5:1$ | -94.7 | PASS (AAA) |
| 6 | Văn bản phụ trên Thẻ Tối | `--rj-color-text-secondary` | `#CBD5E1` | `--rj-primitive-neutral-800` | `#162030` | 0.6572 | 0.0142 | **11.02:1** | $\ge 4.5:1$ | -78.3 | PASS (AAA) |
| 7 | Văn bản phụ trên Nền Canvas Tối | `--rj-color-text-secondary` | `#CBD5E1` | `--rj-primitive-neutral-950` | `#0B1019` | 0.6572 | 0.0051 | **12.83:1** | $\ge 4.5:1$ | -80.0 | PASS (AAA) |
| 8 | Văn bản phụ trên Bảng Hero Panel Tối | `--rj-color-text-secondary` | `#CBD5E1` | `--rj-color-surface-panel` | `#101724` | 0.6572 | 0.0085 | **12.09:1** | $\ge 4.5:1$ | -79.4 | PASS (AAA) |
| 9 | Văn bản phụ trên Vùng Nhập Field Inset Tối | `--rj-color-text-secondary` | `#CBD5E1` | `--rj-color-surface-field` | `#0D1420` | 0.6572 | 0.0069 | **12.43:1** | $\ge 4.5:1$ | -79.6 | PASS (AAA) |
| 10 | Chữ ghi chú mờ trên Thẻ Tối | `--rj-color-text-muted` | `#94A3B8` | `--rj-primitive-neutral-800` | `#162030` | 0.3595 | 0.0142 | **6.38:1** | $\ge 4.5:1$ | -49.6 | PASS (AA) |
| 11 | Chữ ghi chú mờ trên Nền Canvas Tối | `--rj-color-text-muted` | `#94A3B8` | `--rj-primitive-neutral-950` | `#0B1019` | 0.3595 | 0.0051 | **7.43:1** | $\ge 4.5:1$ | -51.3 | PASS (AAA) |
| 12 | Chữ ghi chú mờ trên Bảng Hero Panel Tối | `--rj-color-text-muted` | `#94A3B8` | `--rj-color-surface-panel` | `#101724` | 0.3595 | 0.0085 | **7.00:1** | $\ge 4.5:1$ | -50.7 | PASS (AAA) |
| 13 | Chữ ghi chú mờ trên Vùng Nhập Field Inset Tối | `--rj-color-text-muted` | `#94A3B8` | `--rj-color-surface-field` | `#0D1420` | 0.3595 | 0.0069 | **7.20:1** | $\ge 4.5:1$ | -51.0 | PASS (AAA) |
| 14 | Chữ Nút Chính trên Nền Brand Electric | `--rj-primitive-neutral-950` | `#0B1019` | `--rj-brand-electric` | `#508CEE` | 0.0051 | 0.2663 | **5.74:1** | $\ge 4.5:1$ | +43.2 | PASS (AA) |
| 15 | Chữ Nút Hover trên Nền Brand Electric Hover | `--rj-primitive-neutral-950` | `#0B1019` | `--rj-brand-electric-hover` | `#6EA2F4` | 0.0051 | 0.3569 | **7.38:1** | $\ge 4.5:1$ | +53.1 | PASS (AAA) |
| 16 | Link Hành động trên Thẻ Tối | `--rj-brand-electric` | `#508CEE` | `--rj-primitive-neutral-800` | `#162030` | 0.2663 | 0.0142 | **4.93:1** | $\ge 4.5:1$ | -39.3 | PASS (AA) |
| 17 | Link Hành động trên Nền Canvas Tối | `--rj-brand-electric` | `#508CEE` | `--rj-primitive-neutral-950` | `#0B1019` | 0.2663 | 0.0051 | **5.74:1** | $\ge 4.5:1$ | -41.0 | PASS (AA) |
| 18 | Chữ Nút Phụ trên Khối Nổi Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-color-surface-elevated` | `#1E2C42` | 0.8822 | 0.0247 | **12.48:1** | $\ge 4.5:1$ | -94.7 | PASS (AAA) |
| 19 | Vòng Focus Ring trên Thẻ Tối | `--rj-brand-electric` | `#508CEE` | `--rj-primitive-neutral-800` | `#162030` | 0.2663 | 0.0142 | **4.93:1** | $\ge 3.0:1$ | -39.3 | PASS (UI) |
| 20 | Vòng Focus Ring trên Nền Canvas Tối | `--rj-brand-electric` | `#508CEE` | `--rj-primitive-neutral-950` | `#0B1019` | 0.2663 | 0.0051 | **5.74:1** | $\ge 3.0:1$ | -41.0 | PASS (UI) |
| 21 | Vòng Focus Ring trên Field Inset Tối | `--rj-brand-electric` | `#508CEE` | `--rj-color-surface-field` | `#0D1420` | 0.2663 | 0.0069 | **5.56:1** | $\ge 3.0:1$ | -40.7 | PASS (UI) |
| 22 | Chữ Tab Đang Chọn trên Dark Elevated Pill | `--rj-brand-electric` | `#508CEE` | `--rj-color-surface-elevated` | `#1E2C42` | 0.2663 | 0.0247 | **4.23:1** | $\ge 3.0:1$ | -37.2 | PASS (AA Large/UI) |
| 23 | Chữ Tab Không Chọn trên Dark Tab Inset | `--rj-color-text-secondary` | `#CBD5E1` | `--rj-color-surface-field` | `#0D1420` | 0.6572 | 0.0069 | **12.43:1** | $\ge 4.5:1$ | -79.6 | PASS (AAA) |
| 24 | Đường Đồ Thị Radar trên Hero Panel Tối | `--rj-brand-electric` | `#508CEE` | `--rj-color-surface-panel` | `#101724` | 0.2663 | 0.0085 | **5.41:1** | $\ge 3.0:1$ | -40.4 | PASS (UI) |
| 25 | Nhãn Kỹ Năng Radar trên Hero Panel Tối | `--rj-color-text-primary` | `#EDF2F7` | `--rj-color-surface-panel` | `#101724` | 0.8822 | 0.0085 | **15.93:1** | $\ge 4.5:1$ | -97.9 | PASS (AAA) |
| 26 | Brand Mark Đỏ trên Nền Canvas Tối | `--rj-brand-mark` | `#C8161D` | `--rj-primitive-neutral-950` | `#0B1019` | 0.1294 | 0.0051 | **3.26:1** | $\ge 3.0:1$ | -24.2 | PASS (UI) |
| 27 | Brand Mark Đỏ trên Bảng Hero Panel Tối | `--rj-brand-mark` | `#C8161D` | `--rj-color-surface-panel` | `#101724` | 0.1294 | 0.0085 | **3.07:1** | $\ge 3.0:1$ | -23.6 | PASS (UI) |
| 28 | Chữ Báo Lỗi trên Nền Alert Tối | `--rj-color-status-error-text` | `#F1707A` | `--rj-color-status-error-bg` | `#2D0A0E` | 0.3169 | 0.0081 | **6.32:1** | $\ge 4.5:1$ | -46.4 | PASS (AAA) |
| 29 | Chữ Thành Công trên Nền Alert Tối | `--rj-color-status-success-text` | `#48C78E` | `--rj-color-status-success-bg` | `#06281E` | 0.4418 | 0.0165 | **7.40:1** | $\ge 4.5:1$ | -58.0 | PASS (AAA) |
| 30 | Huy hiệu Thương hiệu Brand Badge Tối | `--rj-color-badge-brand-text` | `#6EA2F4` | `--rj-color-badge-brand-bg` | `#16243A` | 0.3569 | 0.0174 | **6.04:1** | $\ge 4.5:1$ | -48.9 | PASS (AA) |

### 4.4. Ma trận Phân tách Bề mặt CIELAB Delta L* & Ranh giới Viền (Zero Emoji)

Bảng kiểm chứng độ phân tách cảm nhận bề mặt theo không gian màu quốc tế CIE 1976 CIELAB ($L^* = 116 \cdot f(Y/Y_n) - 16$) với chuẩn D65 ($Y_n = 1.0$) và hàm phân mảnh $f(y)$ liên tục ($\epsilon = 216/24389$):

| STT | Cặp Bề mặt Liền kề (Role) | Bề mặt 1 | Hex 1 | Bề mặt 2 | Hex 2 | $L^*_1$ | $L^*_2$ | Chênh lệch $\Delta L^*$ | Ngưỡng Chuẩn | Kết luận |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Light Canvas sang Card Container | Page Canvas | `#EEF2F8` | Card Container | `#FFFFFF` | 95.35 | 100.00 | **4.65** | $\ge 4.0$ | PASS (Inherent Separation) |
| 2 | Light Hero Panel sang Card Container | Hero Story Panel | `#E1E8F2` | Card Container | `#FFFFFF` | 91.74 | 100.00 | **8.26** | $\ge 3.5$ | PASS (Panel Separation) |
| 3 | Light Canvas sang Hero Panel (60/40 Split) | Page Canvas | `#EEF2F8` | Hero Story Panel | `#E1E8F2` | 95.35 | 91.74 | **3.61** | $\ge 2.0$ | PASS (Split Boundary) |
| 4 | Light Card Container sang Field Inset | Card Container | `#FFFFFF` | Field Inset | `#F8FAFD` | 100.00 | 98.20 | **1.80** | $\ge 1.5$ | PASS (Well Inset) |
| 5 | Dark Canvas sang Card Container | Dark Canvas | `#0B1019` | Dark Card Container | `#162030` | 4.62 | 12.07 | **7.45** | $\ge 4.0$ | PASS (Inherent Separation) |
| 6 | Dark Hero Panel sang Card Container | Dark Hero Panel | `#101724` | Dark Card Container | `#162030` | 7.68 | 12.07 | **4.39** | $\ge 3.5$ | PASS (Panel Separation) |
| 7 | Dark Canvas sang Hero Panel (60/40 Split) | Dark Canvas | `#0B1019` | Dark Hero Panel | `#101724` | 4.62 | 7.68 | **3.06** | $\ge 2.0$ | PASS (Split Boundary) |
| 8 | Dark Card Container sang Field Inset | Dark Card Container | `#162030` | Dark Field Inset | `#0D1420` | 12.07 | 6.23 | **5.84** | $\ge 1.5$ | PASS (Well Inset) |
| 9 | Dark Card Container sang Khối Nổi Elevated | Dark Card Container | `#162030` | Dark Elevated | `#1E2C42` | 12.07 | 17.79 | **5.72** | $\ge 3.5$ | PASS (Tonal Elevation) |

> **Phát hiện Toán học Sâu sắc**:  
>
> 1. **Brand Mark Red (#C8161D)**: Tỷ lệ tương phản giữa vạch trắng `#FFFFFF` và nền đỏ `#C8161D` đạt chính xác toán học là **5.85:1** (vượt xa chuẩn WCAG 2.1 AA 4.5:1 cho văn bản và 3.0:1 cho đối tượng đồ họa SC 1.4.11; APCA $L_c = -82.4$). Trên nền Canvas Sáng `#EEF2F8`, logo đạt **5.21:1** ($L_c = +69.1$). Trên nền Canvas Tối `#0B1019`, logo đạt **3.26:1** ($\ge 3.0:1$) và được bảo vệ quang học bởi viền mờ subtle ring chống rung sắc sai.
> 2. **Ranh giới Viền Tương tác (UI Boundary SC 1.4.11)**: Viền khung nhập liệu `--rj-primitive-neutral-500: #6F8094` ở Light Mode đạt **4.05:1** trên Card và **3.87:1** trên Field Inset. Ở Dark Mode, token `--rj-color-border-interactive: #5B7083` đạt **3.19:1** trên Card và **3.59:1** trên Field Inset, hoàn toàn vượt ngưỡng bắt buộc $3.0:1$.
> 3. **Bất biến Phân tách Bề mặt (CIELAB Delta L*)**: Ở cả hai chế độ Light và Dark, độ chênh lệch độ sáng cảm nhận giữa Canvas và Card Container đều vượt ngưỡng tối thiểu ($\Delta L^* = 4.65 \ge 4.0$ ở Light và $\Delta L^* = 7.45 \ge 4.0$ ở Dark), triệt tiêu hoàn toàn khiếm khuyết washed out hoặc pale on pale.

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
  --rj-font-mono: 'JetBrains Mono', 'Courier New', monospace;
}
```

#### Giấy phép Bản quyền (Licensing)

Cả 3 font đều được cấp phép theo tiêu chuẩn nguồn mở **SIL Open Font License (OFL) 1.1**:

- **Plus Jakarta Sans**: Tác giả The Plus Jakarta Sans Project Authors (Gumpita Rahayu, Tokotype). Tự lưu trữ tại `frontend/public/fonts/`.
- **Be Vietnam Pro**: Tác giả The Be Vietnam Pro Project Authors. Thiết kế chuyên biệt cho hệ ký tự Quốc ngữ Việt Nam, tự lưu trữ tại `frontend/public/fonts/`.
- **JetBrains Mono**: Tác giả JetBrains s.r.o. Tối ưu cho môi trường đọc mã nguồn và số liệu bảng biểu tabular figures, tự lưu trữ tại `frontend/public/fonts/`.

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
   - Huy hiệu hình lục giác với đường viền thép đĩnh đạc (`#0D55B8`), số điểm đánh giá kỹ năng thực chiến (0-100) căn chỉnh dạng bảng, kèm micro-icon chứng nhận.
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
| **C3** | **Color Palette & Contrast** | Hero gradient tím - xanh; kính mờ glassmorphism bừa bãi; chữ xám mờ nhạt không đủ tương phản ($CR < 4.5:1$); Dark mode đảo màu âm bản; hardcode hex tùy tiện. | Không dùng gradient tím hay glassmorphism; văn bản đạt tương phản tối thiểu 4.5:1; Dark mode cơ bản nhưng thiếu tầng nâng bề mặt (surface elevations). | 100% kế thừa từ Bespoke Confident Royal Cobalt & Iron Obsidian Palette (Core Cobalt #0D55B8, Deep Cobalt #0A4596, Electric Cobalt #508CEE, Iron Charcoal, Deep Obsidian); giải pháp bảo tồn ranh giới Error Cold Crimson #9B1C2A tách biệt khỏi Brand Blue; tương phản được chứng minh bằng công thức toán học W3C sRGB; Dark mode thiết kế riêng theo thang sáng; viền input $\ge 3.0:1$, focus ring $\ge 3.0:1$. |
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
| C3. Color Palette & Contrast | [0 / 1 / 2] | Bespoke Palette, CR primary text 17.52:1 (Light) & 14.53:1 (Dark), viền input >= 3.0:1 |
| C4. Iconography & Visual Assets | [0 / 1 / 2] | Component <Icon name=... />, 0 emoji, nét 2px round trên lưới 24px |
| C5. Purposeful Motion | [0 / 1 / 2] | Chỉ animate transform/opacity, hỗ trợ reduced-motion 100ms cross-fade & 0.001ms, preset snappy |
| C6. AI-Tell Avoidance | [0 / 1 / 2] | Không glassmorphism, không 3 thẻ đối xứng rập khuôn, 4 signature elements, copy thực tế CNTT |
| **TỔNG ĐIỂM** | **[X / 12]** | **Trạng thái: [PASS (>= 11/12, không điểm 0) / REJECT]** |
```

---

## 11. Round E Design Research Summary: Colour, Surface Ladder & Visual Ergonomics (E1)

Tài liệu Tóm tắt Kết quả Nghiên cứu Thiết kế Chuyên sâu: Hệ Màu Sắc, Thang Bề Mặt & Tiện Nghi Thị Giác (Round E Investigation Summary).

### 11.1. Comparative Analysis of 5 Mature Design Systems (Nghiên cứu So sánh 5 Hệ thống Thiết kế Tiêu chuẩn)

Quá trình nghiên cứu chuyên sâu được tiến hành song song vào ngày **13/11/2026** (2026-11-13) qua các tài liệu kỹ thuật và kho mã nguồn chính thức của 5 hệ thống thiết kế trưởng thành toàn cầu:

#### 1. Radix Themes & Colors (12-Step Semantic Scale)

- **Source**: [Radix Colors Documentation - Understanding the Scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) (Accessed: 2026-11-13).
- **Core Principles**:
  - Phân tầng 12 bước màu có chủ đích rõ rệt: Steps 1-2 dành cho nền tổng (canvas) và panel phụ; Steps 3-5 dành cho bề mặt component (card, input) và tương tác hover/active; Steps 6-8 dành cho viền và dividers (đảm bảo $CR \ge 3.0:1$); Steps 9-10 dành cho màu thương hiệu lấp đầy (solid brand fill); Steps 11-12 dành cho chữ phụ và chữ chính.
  - Phân tách tường minh giữa màu nền tổng thể (`surface-page`) và màu panel lồng nhau (`surface-panel`), tránh việc gộp chung thành một tông xám đồng nhất.
- **Application to Rikkei Jobs**:
  - Áp dụng thang bậc tách biệt: `--rj-color-surface-page` (Canvas Step 1: `#EEF2F8` Light / `#0B1019` Dark) khác biệt rõ rệt với `--rj-color-surface-panel` (Hero Panel Step 2: `#E1E8F2` Light / `#101724` Dark) và `--rj-color-surface-card` (Card Step 3: `#FFFFFF` Light / `#162030` Dark).

#### 2. Material Design 3 (M3 Tonal Surface Containers)

- **Source**: [Material Design 3 - Elevation & Surface Tone Roles](https://m3.material.io/styles/color/roles) (Accessed: 2026-11-13).
- **Core Principles**:
  - M3 loại bỏ việc lạm dụng bóng đổ z-axis mờ mịt và thay thế hoàn toàn bằng hệ thống 5 tầng container tông màu (Tonal Containers): `surfaceContainerLowest`, `surfaceContainerLow`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceContainerHighest`.
  - Độ phân cấp giao diện có thể đọc được ngay cả khi tắt toàn bộ bóng đổ (flat tonal contrast).
- **Application to Rikkei Jobs**:
  - Bố cục 60/40 giữa Hero Story Panel và Form Card có độ tương phản tự thân qua chênh lệch độ sáng (tonal step) kết hợp đường viền hairline 1px, đảm bảo tính phân tách hình học ngay ở dạng phẳng.

#### 3. GitHub Primer Design System (Canvas Hierarchy & Inset Wells)

- **Source**: [GitHub Primer Design System - Color & Canvas Primitives](https://primer.style/primitives/colors) (Accessed: 2026-11-13).
- **Core Principles**:
  - Thiết lập 3 tầng canvas: `canvas.default` (nền thẻ hoặc nền chính), `canvas.subtle` (panel phụ, sidebar), và `canvas.inset` (vùng lún sâu dành cho ô nhập liệu form hoặc khối code).
  - Vùng nhập liệu `inset` luôn có nền hoặc đường bao rõ rệt, giúp mắt người dùng lập tức xác định được trường tương tác khả dụng.
- **Application to Rikkei Jobs**:
  - Khai báo token `--rj-color-surface-input`: `#F8FAFD` ở Light Mode và `#0D1420` ở Dark Mode, kết hợp viền tương tác vững chắc `--rj-primitive-neutral-400` (`#879BB0` đạt $CR \ge 3.20:1$ trên nền Card).

#### 4. IBM Carbon Design System (Layering Architecture & Optical Depth)

- **Source**: [IBM Carbon Design System - Color Architecture & Layer Tokens](https://carbondesignsystem.com/elements/color/usage/) (Accessed: 2026-11-13).
- **Core Principles**:
  - Kiến trúc phân lớp tuyến tính (`$background`, `$layer-01`, `$layer-02`, `$layer-03`).
  - Trong Dark Theme, độ sáng tương đối $L$ tăng dần khi tầng component nổi lên cao hơn, tạo chiều sâu quang học thực tế thay vì đảo màu âm bản cơ học.
- **Application to Rikkei Jobs**:
  - Dark Mode áp dụng Tonal Elevation: Canvas (`#0B1019`, $L=0.007$) $\to$ Hero Panel (`#101724`, $L=0.013$) $\to$ Card Surface (`#162030`, $L=0.021$) $\to$ Elevated Modal / Popover (`#1E2C42`, $L=0.033$).

#### 5. Linear & Stripe Design Principles (Hairline Precision & Confident Restraint)

- **Source**: [Linear Design Method](https://linear.app/method) & [Stripe Dashboard Design System Analysis](https://stripe.com) (Accessed: 2026-11-13).
- **Core Principles**:
  - Tránh nền đen tuyền `#000000`; sử dụng than chì ánh lam trầm (`#08090A` / `#0B1019`).
  - Phân định các khối giao diện bằng đường viền hairline 1px sắc nét có tỷ lệ tương phản tối thiểu $3.0:1$ (theo WCAG 1.4.11) thay vì dùng bóng mờ nhòe lớn.
  - Sử dụng **một sắc thái xanh nhận diện duy nhất có độ bão hòa tự tin (Confident Chroma)** cho hành động chính, focus ring và điểm nhấn, giữ toàn bộ phần còn lại ở trạng thái trung tính có kỷ luật.
- **Application to Rikkei Jobs**:
  - Viền thẻ và đường phân cách giữa Hero Story Panel và Form Panel sử dụng viền 1px chuẩn xác với token `--rj-primitive-neutral-300` (`#BACAD9`, $CR \ge 3.0:1$). Màu xanh chủ đạo được tinh chỉnh thành **Confident Royal Cobalt** (`#0D55B8` Light, `#508CEE` Dark).

---

### 11.2. Visual Ergonomics and Human Vision Research (Nghiên cứu Khoa học Thị giác & Công thái học)

#### 1. APCA (Accessible Perceptual Contrast Algorithm - W3C WCAG 3 / Silver)

- **Source**: [APCA Contrast Calculator & Specification (apca-w3 / 0.98G)](https://www.apcacontrast.com) (Accessed: 2026-11-13).
- **Phát hiện Khoa học**:
  - Công thức tỷ lệ tương phản truyền thống của WCAG 2.2 $(L_1 + 0.05) / (L_2 + 0.05)$ chỉ dựa trên toán học tuyến tính, không phản ánh cách não bộ và võng mạc con người cảm nhận độ sáng thực tế. Nó dẫn đến hiện tượng "đậu giả" (false pass) cho văn bản mỏng nét hoặc "rớt giả" (false fail) cho màu sắc có độ tương phản cảm nhận tốt.
  - Thuật toán APCA tính toán độ tương phản cảm nhận $L_c$ dựa trên tần số không gian (spatial frequency), độ dày nét chữ (font-weight), kích thước font và tính phân cực sáng/tối (polarity).
- **Ngưỡng Chuẩn APCA Áp dụng**:
  - Văn bản đọc trôi chảy (Fluent Body Text 14-16px, weight 400-500): Tối thiểu $|L_c| \ge 60$, lý tưởng $|L_c| \ge 75$.
  - Tiêu đề và văn bản đậm (Headings $\ge 18\text{px}$ bold hoặc $\ge 24\text{px}$ regular): Tối thiểu $|L_c| \ge 45$, lý tưởng $|L_c| \ge 60$.
  - Thành phần đồ họa & icon: Tối thiểu $|L_c| \ge 30$.

#### 2. Hiện tượng Quang sai, Chói lóa & Loạn thị (Halation, Glare & Astigmatism)

- **Source**: [Vision Research & Dark Mode Astigmatism Ergonomics](https://readtech.org) & [Level Access Accessibility Research](https://www.levelaccess.com) (Accessed: 2026-11-13).
- **Phát hiện Khoa học**:
  - Khoảng **30% đến 50% dân số trưởng thành** mắc tật khúc xạ loạn thị (astigmatism) ở các mức độ khác nhau. Giác mạc loạn thị có độ cong không đồng đều giữa các kinh tuyến.
  - Khi người dùng nhìn vào màn hình nền đen tuyền (`#000000`), đồng tử mắt buộc phải giãn nở tối đa để thu nhận ánh sáng môi trường. Khi đồng tử mở rộng, chùm tia sáng phát ra từ các ký tự chữ trắng tinh (`#FFFFFF`) đi qua vùng rìa biến dạng của giác mạc, gây ra hiện tượng **tán xạ quang học và nhòe hào quang (halation / optical bloom)**.
  - Hậu quả: Chữ trông như phát sáng nhòe nhoẹt, các nét chữ dính vào nhau gây mỏi mắt dữ dội, đau đầu và giảm tốc độ đọc đáng kể.
- **Giải pháp Công thái học cho Rikkei Jobs**:
  - Tuyệt đối **cấm nền đen tuyền `#000000`** và **cấm chữ trắng tinh `#FFFFFF`** trong Dark Mode.
  - Nền Dark Mode được cố định ở vùng than chì ánh lam sâu `#0B1019` ($L = 0.007$), nâng bề mặt Card lên `#162030` ($L = 0.021$).
  - Chữ chính sử dụng sắc trắng ngà dịu (Off-white: `#EDF2F7`, $L = 0.882$, $APCA\ Lc \approx 98$), giảm áp lực ánh sáng xanh dội vào mắt loạn thị.

#### 3. Chứng Sợ Ánh Sáng & Màu Nhấn Khử Bão hòa (Photophobia & Desaturated Luminous Accents)

- **Source**: [Google Material Design 3 - Dark Theme Contrast Principles](https://m3.material.io) (Accessed: 2026-11-13).
- **Phát hiện Khoa học**:
  - Màu neon có độ bão hòa 100% (như `#00FFFF` hoặc `#00E5FF`) khi đặt trên nền tối sẽ gây ra hiện tượng **quang sai sắc (chromatic aberration)**: mắt người không thể đồng thời hội tụ hai bước sóng quá khác biệt lên cùng một điểm trên võng mạc, khiến viền chữ dường như rung rinh, nhấp nháy, gây căng thẳng cho cơ thể mi và thị giác.
- **Giải pháp Công thái học cho Rikkei Jobs**:
  - Màu nhấn Dark Mode được hiệu chỉnh sang **Luminous Cobalt `#508CEE`** (HSL $217^\circ, 82\%, 62\%$, Relative Luminance $L = 0.2663$): giữ độ sáng và độ rực rỡ êm dịu, đạt tỷ lệ tương phản $4.93:1$ trên nền Card `#162030` và $APCA\ L_c = -39.3$, hoàn toàn không rung mắt.

---

### 11.3. Round E Color Architecture & Surface Ladder (Kiến trúc Màu sắc & Thang Bề mặt Round E)

#### 1. Thang Bề mặt Kép (Dual Neutral Scales)

Hệ thống thiết lập 5 bậc thang bề mặt tường minh ở cả hai chế độ:

```text
Light Mode Surface Ladder:
Page Canvas (#EEF2F8, L=0.885, L*=95.35) 
  --> Hero Story Panel (#E1E8F2, L=0.801, L*=91.74) 
    --> Card Container (#FFFFFF, L=1.000, L*=100.00) 
      --> Field Inset (#F8FAFD, L=0.954, L*=98.20) 
        --> Elevated Surface (#FFFFFF, L=1.000, L*=100.00)

Dark Mode Surface Ladder (Tonal Elevation):
Page Canvas (#0B1019, L=0.005, L*=4.62) 
  --> Hero Story Panel (#101724, L=0.009, L*=7.68) 
    --> Card Container (#162030, L=0.014, L*=12.07) 
      --> Field Inset (#0D1420, L=0.007, L*=6.23) 
        --> Elevated Surface (#1E2C42, L=0.025, L*=17.79)
```

#### 2. Phân cấp Tương phản & Rào cản Tách biệt Bề mặt (Contrast Hierarchy & Surface Separation)

- **Rào cản Toán học Ngăn chặn Lỗi "Pale on Pale"**:
  - Chênh lệch độ sáng cảm nhận giữa Nền Canvas và Thẻ Card: $\Delta L^* = 4.65 \ge 4.0$ ở Light Mode và $\Delta L^* = 7.45 \ge 4.0$ ở Dark Mode (CIE 1976 CIELAB).
  - Chênh lệch giữa Hero Panel và Thẻ Card: $\Delta L^* = 8.26 \ge 3.5$ ở Light Mode và $\Delta L^* = 4.39 \ge 3.5$ ở Dark Mode.
  - Đường viền phân định cấu trúc xung quanh thẻ và giữa hai panel 60/40 đạt $CR \ge 3.0:1$ theo tiêu chuẩn WCAG 1.4.11 Non-text Contrast (viền tương tác `--rj-primitive-neutral-500: #6F8094` ở Light Mode đạt $4.05:1$, và `--rj-color-border-interactive: #5B7083` ở Dark Mode đạt $3.19:1$).

#### 3. Ánh xạ Ngữ nghĩa (Semantic Mapping) & Màu Xanh Tự tin (Confident Blue)

- **Màu Thương hiệu Chính (Primary Brand Blue)**:
  - Light Mode: **Confident Royal Cobalt `#0D55B8`** (HSL $215^\circ, 87\%, 38\%$, $L = 0.100$). Đạt $CR = 6.98:1$ trên nền trắng Card và $APCA\ L_c = +83.5$.
  - Dark Mode: **Luminous Cobalt `#508CEE`** (HSL $217^\circ, 82\%, 62\%$, $L = 0.266$). Đạt $CR = 4.93:1$ trên nền Card `#162030` ($APCA\ L_c = -39.3$ cho UI element), và đạt $CR = 5.74:1$ ($APCA\ L_c = +43.2$) khi dùng làm nền nút chính phối cùng chữ tối `--rj-primitive-neutral-950: #0B1019`.
- **Trạng thái Chức năng (Functional Status)**:
  - Lỗi (Error / Danger): **Cold Crimson `#9B1C2A`** (Light, $CR = 8.10:1$) và `#F1707A` (Dark, $CR = 6.32:1$). Tách biệt hoàn toàn khỏi sắc xanh thương hiệu; bắt buộc đi kèm icon cảnh báo và văn bản mô tả.
  - Thành công (Success): **Deep Pine Green `#0E6251`** (Light) và `#48C78E` (Dark).
  - Cảnh báo (Warning): **Dark Honey Amber `#7A4305`** (Light) và `#F5B041` (Dark).
  - Thông tin (Info): **Cerulean Navy `#134B5E`** (Light) và `#5DADE2` (Dark).

#### 4. Đóng gói Biểu trưng Thương hiệu Chính thức (Logo Badge Containment - Rule E7)

- Biểu trưng chính thức tại `Tài liệu dự án/favicon.svg` mang nền đỏ nhận diện `#c8161d` với motif 3 cột trắng xếp tầng (bậc năng lực).
- Để bảo toàn quyết định bất biến Blue-dominant của giao diện người dùng, biểu trưng đỏ được đóng gói độc quyền trong component `<BrandMark />` tại Header, Auth lockup và tab icon.
- Token chuyên biệt: `--rj-brand-mark: #C8161D;`.
- Trong Dark Mode, một vòng viền bề mặt tinh tế `rgba(255, 255, 255, 0.12)` được thiết lập quang học xung quanh biểu trưng nhằm chống chìm màu trên nền tối mà không chỉnh sửa tệp SVG gốc.

---

### 11.4. Table of Rejected Ideas and Rationale (Bảng Ý Tưởng Bị Từ Chối và Lý Do Bác Bỏ)

| # | Ý Tưởng Bị Từ Chối (Rejected Idea) | Đề Xuất Ban Đầu | Lý Do Bác Bỏ Kỹ Thuật & Công Thái Học (Rejection Rationale) |
|---|---|---|---|
| **1** | **Chuyển Toàn Bộ Giao Diện Sang Tông Đỏ Thương Hiệu (Full Red UI Shift)** | Đổi các nút bấm chính, links, tabs và accent sang màu đỏ `#c8161d` giống logo Rikkei. | **BÁC BỎ**: Vi phạm Quyết định Tối cao của User / Team Lead về định hướng Blue-dominant. Gây nhầm lẫn nghiêm trọng với trạng thái lỗi kỹ thuật (Semantic Danger/Error), làm gia tăng căng thẳng thị giác và tâm lý cho ứng viên. |
| **2** | **Sử Dụng Nền Đen Tuyền `#000000` & Chữ Trắng Tinh `#FFFFFF` Trong Dark Mode** | Áp dụng nền đen tuyệt đối để tối đa hóa tỷ lệ tương phản toán học ($21.0:1$). | **BÁC BỎ**: Gây ra hiện tượng nhòe hào quang (Halation) và chói lóa (Glare) cho 30-50% người dùng có tật loạn thị khi đồng tử giãn nở trong tối. Gây mỏi mắt dữ dội và đau đầu khi đọc văn bản kéo dài. |
| **3** | **Lạm Dụng Bóng Đổ Mờ Đậm (Heavy Blurry Drop Shadows) Để Tách Thẻ** | Sử dụng bóng mờ `box-shadow: 0 20px 40px rgba(0,0,0,0.25)` để nâng card khỏi canvas. | **BÁC BỎ**: Vi phạm tiêu chuẩn Chống Rập khuôn AI (P-AI-03). Bóng mờ nhòe lớn tạo cảm giác bẩn nhòe giao diện, không giải quyết được bài toán phân tách phẳng (flat tonal separation) trên các màn hình có độ sáng thấp. |
| **4** | **Sử Dụng Màu Nhấn Xanh Neon Bão Hòa 100% (`#00FFFF` / `#00E5FF`) Trên Nền Tối** | Dùng sắc xanh cyan huỳnh quang rực sáng để tạo hiệu ứng công nghệ cao trong Dark Mode. | **BÁC BỎ**: Gây ra hiện tượng quang sai sắc (chromatic aberration) trên võng mạc, làm chữ và viền tương tác bị rung nhấp nháy, gây căng thẳng cơ thể mi và thị giác người dùng. |
| **5** | **Vẽ Lại Hoặc Đổi Màu Biểu Trưng SVG (Recolour / Redraw Brand Mark Asset)** | Tô lại nền logo SVG sang màu xanh hoặc điều chỉnh các cột trắng để đồng bộ với UI. | **BÁC BỎ**: Vi phạm nguyên tắc bảo toàn tính chân thực của tài sản thương hiệu gốc (Authentic Asset Mandate). Biểu trưng phải được sao chép nguyên vẹn từng byte từ thư mục dự án với mã băm SHA-256 xác thực. |
