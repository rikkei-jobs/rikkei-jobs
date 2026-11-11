# Pull Request Template

## 📌 Task Reference

- **Task ID**: `[e.g., T022DB0]`
- **Related Issue/Story**: `[Link or description]`

---

## 🎯 Purpose & Scope of Changes

<!-- A clear, concise summary of what changes are introduced and why. -->
- Summary of changes

---

## 🌿 Branch & Target Verification

- [ ] Targeted branch is strictly `develop` (Feature branches MUST NEVER merge directly into `main`).
- [ ] Source branch follows convention: `feature/<task-code>-<short-description>`.
- [ ] PR Title starts with Task ID in uppercase format: `[TASK_ID]: [Concise Title]` (e.g., `T022DB0: implement external systems mock`).

---

## 📋 Definition of Done (DoD) Checklist

- [ ] **Compilation & Build**: Backend `./mvnw compile` passes with `-Xlint:all -Werror` (zero warnings), Frontend `npm run build` passes cleanly.
- [ ] **Automated Tests**: Unit and integration tests pass cleanly with real assertions (no facade/substitute tests).
- [ ] **Linting & Formatting**:
  - Backend: Spotless format applied (`./mvnw spotless:check` passes).
  - Frontend: ESLint & Prettier passing with zero warnings (`npm run lint`).
  - Repository scripts & markdown: `markdownlint` and repository gates pass.
- [ ] **Clean Code & Security**:
  - No hardcoded secrets, API keys, or credentials committed.
  - Zero developer-specific machine paths or personal home directories.
  - No leftover `TODO`, `FIXME`, or temporary debug statements.
- [ ] **Architecture Boundaries**:
  - Modular monolith boundaries respected (module table ownership, no cross-module SQL joins or FKs).
  - Communication between modules restricted to interfaces/DTOs or Spring application events.
- [ ] **Documentation**:
  - Shared conventions (`docs/conventions.md`) updated if API/data contracts changed.
  - Numbered bilingual documents updated if architecture or environment changed.

---

## 🧪 Verification & Evidence

<!-- Paste raw command outputs demonstrating that the changes operate correctly. -->

```bash
# Paste verification command and raw output here
```

---

## 🔍 Notes for Reviewers

<!-- Any specific edge cases, assumptions, or areas needing close scrutiny. -->
- None
