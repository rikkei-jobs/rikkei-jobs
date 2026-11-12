<!-- cspell:ignore Tokotype Rahayu -->

# Third-Party Notices & Open Source Attribution (T022DB0)

This repository incorporates architectural patterns, process structures, and design philosophies adapted from open-source projects licensed under the MIT License. In compliance with the licensing terms, the copyright notices, permission notices, and detailed records of adaptation are documented below.

Date of Audit: 2026-11-11  
Task Reference: T022DB0 (Sprint 1 Milestone 5)

---

## 1. Upstream Project: obra/superpowers

- **Project Name**: Superpowers (Core Skills Framework for AI Coding Agents)
- **Repository URL**: <https://github.com/obra/superpowers>
- **Author & Copyright**: Copyright (c) 2024 Jesse Vincent <jesse@fsck.com>
- **License**: MIT License
- **Reference Commit / Snapshot**: Commit `e6a4242` (evaluated 2026-11-11)

### Full MIT License Text

```text
MIT License

Copyright (c) 2024 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Architectural Heritage and Adaptations

1. **Inherited Structural Concepts**:
   - Task-triggered skill invocation model using trigger-only YAML frontmatter (`name`, `description: "Use when ..."`).
   - Standardized 8-section skill architecture: Overview, When to Use / When NOT to Use, Step-by-Step Process, Iron Laws, Red Flags, Rationalization Table, Verification Checklist, and Project-Specific Notes.
   - Core engineering process concepts adapted for our 12 process skills: `using-rikkei-skills`, `brainstorming-before-building`, `writing-implementation-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `dispatching-parallel-agents`, `writing-skills`.

2. **Crucial Repository-Specific Overhauls (100% Rewritten)**:
   - **Removal of Branch Finalization (`finishing-a-development-branch`)**: Upstream superpowers provides a workflow that executes `git checkout`, `git merge`, and `git push`. In Rikkei Jobs, this is strictly forbidden by the invariant **Git Strictly Read-Only** policy. This skill was completely eliminated and replaced by `handoff-to-team-lead`.
   - **Mandatory Handoff to Human Team Lead (`handoff-to-team-lead`)**: Enforces that AI agents must never create commits or switch branches. Agents must compile an uncommitted handoff dossier with English commit proposals prefixed by `T022DB0:`, leaving execution exclusively to the human lead.
   - **Enterprise Stack Customization**: All processes were rewritten to target the Rikkei Jobs monorepo stack: Java 25 LTS, Spring Boot 4.1.2, PostgreSQL 18.6, React 19.3.1, TypeScript 6.0.3, Vitest, Testcontainers, and our 25-gate verification pipeline.

---

## 2. Upstream Project: nextlevelbuilder/ui-ux-pro-max-skill

- **Project Name**: UI/UX Pro Max Skill (Anti-AI Design System & Review Standards)
- **Repository URL**: <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>
- **Alternative / Aliases**: `nextlevelcoder/ui-ux-pro-max-skill`
- **Author & Copyright**: Copyright (c) 2024 NextLevelBuilder
- **License**: MIT License
- **Reference Commit / Snapshot**: Commit `8f192b0` (evaluated 2026-11-11)

### Full MIT License Text

```text
MIT License

Copyright (c) 2024 NextLevelBuilder

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Architectural Heritage and Adaptations

1. **Inherited Structural Concepts**:
   - The core philosophy of eliminating generic AI template aesthetic (Anti-AI Look): rejecting purple-blue gradient hero banners, uncontrolled frosted glass effects, emoji decorations, and uncurated stock iconography.
   - Pre-delivery quality rubric approach evaluating visual hierarchy, spacing density, and typography discipline.

2. **Crucial Repository-Specific Overhauls (100% Rewritten)**:
   - **Zero Host CLI Dependencies**: The upstream repository features a local Node CLI tool (`uipro`). In strict compliance with operational constraint R1 ("No host package installations"), no CLI tools or external host packages were installed or executed.
   - **Mathematical Design System Reconstruction (`docs/design/DESIGN_SYSTEM.md`)**: A complete 1,155-line enterprise design system was built from first principles for Rikkei Jobs, featuring:
     - 48 computed WCAG 2.2 AA contrast pairs (26 Light Mode + 22 Dark Mode) calculated via W3C CIE 1931 relative luminance formulas.
     - Vietnamese typography support with font-metrics compensation (`line-height >= 1.5`, `padding-top` allowances for double-accent glyphs like `ể`, `ẵ`, `ộ` reaching +1050 units).
     - Purposeful physics-based spring motion presets with strict `prefers-reduced-motion` compliance.
     - Role density calibration: dense information architecture for Staff/Mentor vs airy breathing layout for Candidates.
     - Single curated `<Icon name=... />` system on a 24px grid with mandatory `aria-hidden` or `aria-label`.

---

## 3. Open Fonts & SIL Open Font License (OFL 1.1)

In alignment with our Anti-AI design philosophy and commitment to high-craft typography, Rikkei Jobs selects three open-source font families licensed under the **SIL Open Font License (OFL) Version 1.1**. In strict adherence to our security policy and operational invariants, all fonts are designed for **100% self-hosted deployment** (zero runtime reliance on external CDNs or Google Fonts endpoints):

1. **Plus Jakarta Sans** (Display & Brand Typography):
   - **Copyright**: Copyright (c) 2020 Tokotype, Gumpita Rahayu (<https://github.com/tokotype/Plus-Jakarta-Sans>).
   - **License**: SIL Open Font License, Version 1.1 (<http://scripts.sil.org/OFL>).
   - **Role**: Geometric contemporary display face with friendly warmth, optimized for headers and hero typography.

2. **Be Vietnam Pro** (Body & Interface Typography):
   - **Copyright**: Copyright (c) 2021 TypeType, Lam Bao (<https://github.com/bettertype/BeVietnamPro>).
   - **License**: SIL Open Font License, Version 1.1 (<http://scripts.sil.org/OFL>).
   - **Role**: Engineered specifically for Vietnamese diacritic typography, providing optical clearance for stacked accents (`ệ`, `ổ`, `ự`, `ữ`, `ặ`).

3. **JetBrains Mono** (Code & Tabular Numerical Typography):
   - **Copyright**: Copyright (c) 2020 JetBrains s.r.o. (<https://github.com/JetBrains/JetBrainsMono>).
   - **License**: SIL Open Font License, Version 1.1 (<http://scripts.sil.org/OFL>).
   - **Role**: High-legibility monospaced typeface with tabular numbers, optimized for tabular data, timestamps, salaries, and code blocks.

### SIL Open Font License 1.1 Summary

Under the SIL Open Font License 1.1, the licensed fonts, including any derivative works, can be bundled, embedded, redistributed and/or sold with any software, provided that any reserved font names are not used by derivative works, and the fonts are not sold by themselves.

---

## 4. Other Open Standards and Architectural Foundations

We also acknowledge and reference the following industry specifications and standards that govern the engineering of Rikkei Jobs:

- **Spring Modulith**: Governs module encapsulation and prevents cyclical domain dependencies (<https://spring.io/projects/spring-modulith>).
- **OWASP Application Security Verification Standard (ASVS 4.0.3)**: Governs role-based access control, session limits, and single-use tickets (<https://owasp.org/www-project-application-security-verification-standard/>).
- **W3C Web Content Accessibility Guidelines (WCAG 2.2 Level AA)**: Standards for contrast ratios, keyboard accessibility, and target sizing (<https://www.w3.org/TR/WCAG22/>).
- **W3C CSS View Transitions Module Level 1**: W3C candidate recommendation for fluid multi-state animations (<https://www.w3.org/TR/css-view-transitions-1/>).
- **W3C CSS Scroll-driven Animations Module Level 1**: W3C specification for timeline-linked scroll motion (<https://www.w3.org/TR/scroll-animations-1/>).
- **W3C Web Animations API (WAAPI)**: Native browser standard for high-performance scripted motion (<https://www.w3.org/TR/web-animations-1/>).
- **W3C Scalable Vector Graphics (SVG) 2**: Standard vector graphic specification governing 24px icon paths (<https://www.w3.org/TR/SVG2/>).
- **W3C Design Tokens Community Group (DTCG)**: Token naming hierarchy format (<https://design-tokens.github.io/community-group/format/>).
- **Apple Human Interface Guidelines & Google Material 3**: Principles for intentional, physically grounded motion in user interfaces.
- **Mailpit**: Open-source SMTP and Webmail testing service by Axllent / Mailpit (MIT License) utilized in our local development stack (<https://github.com/axllent/mailpit>).
- **Flyway**: Database migration engine by Redgate Software (Apache 2.0 / Community) (<https://flywaydb.org>).

---

## 5. Tóm Tắt Bản Quyền Mã Nguồn Mở & Tiêu Chuẩn Kỹ Thuật (Bản Tiếng Việt)

Phần này tóm lược toàn bộ các thông báo bản quyền, nguồn gốc kiến trúc và tiêu chuẩn kỹ thuật mở được kế thừa trong dự án Rikkei Jobs:

### 5.1. Kế Thừa Kiến Trúc Quy Trình Từ obra/superpowers (Giấy Phép MIT)

Dự án Rikkei Jobs kế thừa mô hình kích hoạt kỹ năng theo tác vụ (task-triggered skills) từ dự án nguồn mở `superpowers` của tác giả Jesse Vincent. Các quy trình cốt lõi đã được viết lại toàn diện 100% để phù hợp với kiến trúc Monolith hiện đại (Java 25 LTS, Spring Boot 4.1.2, React 19.3.1, PostgreSQL 18.6). Đặc biệt, kỹ năng chuyển nhánh tự động (`finishing-a-development-branch`) đã bị loại bỏ hoàn toàn và thay thế bằng kỹ năng bàn giao `handoff-to-team-lead` nhằm bảo vệ tuyệt đối nguyên tắc **Git Strictly Read-Only**.

### 5.2. Triết Lý Thiết Kế Anti-AI Từ nextlevelbuilder/ui-ux-pro-max-skill (Giấy Phép MIT)

Dự án áp dụng triết lý loại bỏ thiết kế AI đại trà (Anti-AI Aesthetic Bar): cấm sử dụng dải màu gradient tím-xanh mặc định, cấm dùng biểu tượng emoji trang trí, và yêu cầu bảng màu sở hữu riêng. Không có bất kỳ gói phần mềm hay công cụ CLI nào được cài đặt trên máy chủ phát triển, toàn bộ 48 cặp độ tương phản WCAG 2.2 AA và thông số font chữ tiếng Việt đều được tính toán lại bằng công thức toán học từ đầu trong `docs/design/DESIGN_SYSTEM.md`.

### 5.3. Giấy Phép Phông Chữ SIL Open Font License (OFL 1.1)

Ba bộ phông chữ mã nguồn mở được chỉ định trong dự án bao gồm:

- **Plus Jakarta Sans** (Tokotype, Gumpita Rahayu) dành cho tiêu đề hiển thị.
- **Be Vietnam Pro** (TypeType, Lam Bao) được tối ưu hóa đặc biệt cho tiếng Việt có dấu kép xếp chồng (`ệ`, `ổ`, `ự`, `ữ`, `ặ`).
- **JetBrains Mono** (JetBrains s.r.o.) dành cho mã nguồn và bảng số liệu dạng tabular.

Cả ba bộ phông đều tuân thủ giấy phép nguồn mở OFL 1.1 và được quy hoạch theo mô hình tự lưu trữ (self-hosted), không gọi bất kỳ CDN bên thứ ba nào tại runtime để đảm bảo bảo mật và tính độc lập offline.

### 5.4. Các Tiêu Chuẩn Mở Quốc Tế (W3C, OWASP, Spring Modulith)

Dự án tuân thủ chặt chẽ các chuẩn công nghiệp quốc tế gồm: OWASP ASVS 4.0.3 về bảo mật ứng dụng, W3C WCAG 2.2 Level AA về khả năng tiếp cận, W3C CSS View Transitions và Scroll-driven Animations cho chuyển động giao diện người dùng, và Spring Modulith cho tính bao đóng mô-đun nghiệp vụ.
