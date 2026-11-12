# 08 — Frontend Engineering Standards and Architecture

## 1. Core Principles

Build modular, type-safe, and accessible user interfaces adhering to modern React and TypeScript best practices.
Organize code strictly around business domain feature slices.
Ensure complete compliance with WCAG 2.2 AA accessibility requirements.

## 2. Pinned Frontend Technology Stack

Adhere strictly to the pinned dependencies declared in frontend/package.json and docs/03-version-table.md:

- Core Libraries: React 19.3.1, React DOM 19.3.1.
- Build Tool: Vite 8.3.7 with @vitejs/plugin-react 6.3.0.
- Language Runtime: TypeScript 6.0.3 strictly pinned due to typescript-eslint 8.72.2 peer range (>=4.8.4 <6.1.0).
- Testing Framework: Vitest 5.1.0 with jsdom 31.0.0 and @testing-library/react 16.3.3.
- Code Quality: ESLint 10.14.0, Prettier 3.9.10.

## 3. Strict TypeScript Discipline

Enforce compiler constraints defined in frontend/tsconfig.app.json:

- Enable strict mode: strict: true, noUnusedLocals: true, noUnusedParameters: true, noFallthroughCasesInSwitch: true.
- Prohibit any: Never use any, unknown as specific type without validation, or @ts-ignore.
- Component Contracts: Declare explicit TypeScript interfaces for all component props, state objects, and API response models.
- Immutable Data: Prefer readonly properties for props and state to prevent accidental state mutations.

## 4. Feature-Slice Architecture

Organize frontend source code strictly under frontend/src/features/:

- Directory Structure:
  - features/candidate/: MOD-01 Candidate Skill Profile, evidence, CV, and portfolio management.
  - features/company/: MOD-02 Company profile, HR management, and job descriptions (JDs).
  - features/internship/: MOD-03 IOC internship batches, member allocation, and task tracking.
  - features/assessment/: MOD-04 Mentor evaluations, 20 skills catalogue, and competency badges.
  - features/learning/: MOD-05 Skill gap analysis and LMS course recommendations.
  - features/recruitment/: MOD-06 Job applications, Rikkei Meet interview coordination, and offer management.
  - features/ai/: MOD-07 AI Career Assistant interactions and feedback generation.
- Isolation Rules:
  - Keep internal feature logic, local components, and feature-specific hooks private to their slice.
  - Expose external capabilities exclusively through the feature's public barrel file (index.ts).
  - Centralize module registry in frontend/src/features/index.ts via BUSINESS_MODULES.
  - Place cross-cutting UI components, base API clients, and utilities in frontend/src/shared/.

## 5. Web Accessibility Standards (WCAG 2.2 AA)

Enforce WCAG 2.2 Level AA accessibility criteria across all components:

- Color Contrast: Ensure a minimum contrast ratio of 4.5:1 for standard text (< 18.5px regular) and 3:1 for large text and UI controls.
- Semantic HTML: Use native HTML elements (<header>, <main>, <nav>, <section>, <button type="button">). Never attach click handlers to unadorned div elements.
- ARIA Semantics: Supply aria-label for icon buttons, aria-live="polite" for dynamic status updates (as in HealthBadge.tsx), and aria-describedby for form errors.
- Keyboard Navigation: Ensure every interactive element is focusable via Tab, provides visible :focus-visible outlines, and handles Enter and Space keys.

## 6. Verification Commands

Verify frontend code cleanliness and correctness locally:

```bash
# Run static lint checks
npm run lint --prefix frontend

# Execute TypeScript strict type checking
npm run typecheck --prefix frontend

# Execute component unit tests with Vitest
npm run test --prefix frontend

# Verify production build compilation
npm run build --prefix frontend
```
