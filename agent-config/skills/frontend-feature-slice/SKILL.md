---
name: frontend-feature-slice
description: Use when creating, refactoring, or extending a frontend feature slice under frontend/src/features/ or designing feature-level state, components, and async states.
---

# Frontend Feature Slice Architecture

## 1. Overview

The Rikkei Jobs frontend architecture organizes application code around vertical business domain slices rather than traditional horizontal technical layers. Running on React 19.3.1, TypeScript 6.0.3 strict mode, and Vite 8.3.7, each feature slice under `frontend/src/features/<module>/` represents an autonomous, highly cohesive, and loosely coupled unit.

Core architectural foundations:

- Strict separation between Server State (asynchronous remote data queried from Spring Boot REST endpoints `/api/v1/...`) and UI State (ephemeral client presentation state, active modals, form field interactions).
- Mandatory enforcement of the Four Async States across every data-fetching view: Loading (structural layout skeletons), Error (machine-readable RFC 7807 ProblemDetail presentation with retry action), Empty (contextual zero-data illustration with actionable CTA), and Data (successful tabular or card grid rendering).
- Distinct separation of concerns between Presentational (Dumb) Components and Container/Hook (Smart) Logic.
- Behavior-first automated component and hook unit testing using Vitest 5.1.0 and React Testing Library within a jsdom 31.0.0 simulation environment.

## 2. When to Use / When NOT to Use

### When to Use

- Implementing new business domain screens or extending existing slices across the 7 modules: `candidate`, `company`, `internship`, `assessment`, `learning`, `recruitment`, and `ai`.
- Constructing or refactoring API client fetch functions, DTO type transformations, or mutation hooks within a feature.
- Handling asynchronous remote states and ensuring comprehensive 4-state visual coverage.
- Writing behavior-driven unit and integration tests using Vitest and React Testing Library for feature components.

### When NOT to Use

- Developing global application chrome or agnostic UI primitives without specific domain semantics (e.g., global Header, HealthBadge, generic Modal shell, Icon) -> Place under `frontend/src/shared/components/`.
- Modifying build toolchain or global environment configurations (`vite.config.ts`, `tsconfig.json`, `setupTests.ts`, `eslint.config.js`).
- Executing cross-service end-to-end integration test suites over live Docker Compose services -> Use `node e2e/run-all.mjs`.

## 3. Step-by-Step Process

### Step 1: Verify Domain Boundary & DTO Contracts

1. Inspect `docs/01-architecture-overview.md` and `docs/conventions.md` to identify the owning module among the 7 business domains.
2. Confirm the RESTful resource path `/api/v1/<resource>` and the corresponding backend Java Record DTO definitions.
3. Validate pagination requirements: list endpoints must consume 1-based pagination parameters (`page >= 1`, `size <= 100`).

### Step 2: Establish Feature Slice Directory Scaffold

Create or inspect the standard structure within `frontend/src/features/<module>/`:

```text
frontend/src/features/<module>/
├── api/          # Network fetch clients and mutation functions
├── components/   # Internal presentational and container components
├── hooks/        # Custom React hooks managing server state and local state
├── types/        # Strict TypeScript interfaces, enums, and DTO contracts
└── index.ts      # Public barrel file exposing slice capabilities
```

### Step 3: Define Strict TypeScript Contracts

Define request, response, and error structures in `types/<feature>.types.ts`. Never use `any` or loose untyped objects:

```typescript
export interface ProblemDetailResponse {
  code: string;
  message: string;
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: ProblemDetailResponse | null;
}
```

### Step 4: Implement Resilient API Fetch Clients

1. Implement client functions in `api/<feature>Api.ts` accepting an `AbortSignal` parameter for request cancellation on component unmount.
2. Handle non-2xx HTTP responses by parsing standard ProblemDetail JSON bodies and throwing structured errors.
3. Keep network fetch clients pure and independent of React hook lifecycles.

### Step 5: Encapsulate State via Custom Hooks

1. Create dedicated hooks in `hooks/use<Feature>.ts` encapsulating network lifecycle and state management.
2. Isolate Server State from UI State: do not mirror server data into global stores unless cross-slice synchronization is explicitly required.
3. Expose explicit refresh and retry functions alongside current state properties.

### Step 6: Render All Four Async States Comprehensively

1. **Loading State**: Render layout-preserving Skeleton components matching the exact proportions of expected content to prevent Cumulative Layout Shift (CLS).
2. **Error State**: Render user-friendly error banners displaying the machine-readable error code, localized human message, and an immediate "Retry" button.
3. **Empty State**: When returned collections are empty or null, display a contextual message explaining the state, accompanied by a clear Call-to-Action (CTA) button guiding next steps.
4. **Data State**: Render validated data items. Ensure responsive layout compliance across mobile (375px), tablet (768px), desktop (1024px), and wide-screen (1440px).

### Step 7: Export Public API via Slice Barrel (`index.ts`)

1. Only re-export high-level container components, primary hooks, and public types in `index.ts`.
2. Keep internal sub-components, helper utilities, and private styles encapsulated within the feature slice.

### Step 8: Author Behavior-First Vitest Suites

1. Create co-located `<Component>.test.tsx` files.
2. Mock network transport using `vi.spyOn(globalThis, 'fetch')` or Vitest mocks.
3. Verify all four states explicitly:
   - Verification of loading skeleton appearance during in-flight fetch.
   - Verification of correct DOM rendering upon 200 OK data resolution.
   - Verification of error notification and retry action dispatch upon 4xx/5xx network failure.
   - Verification of empty state visual guide when response array is empty.

## 4. Iron Laws

- **Law 1: All Four Async States Are Mandatory.** Every view fetching asynchronous remote data must explicitly implement and handle Loading, Error (with machine code and Retry action), Empty (with actionable CTA), and Data states. Silent failures or unhandled blank screens are strictly forbidden.
- **Law 2: Encapsulated Barrel Boundary.** Cross-feature imports into internal subdirectories of another feature slice are strictly forbidden. Inter-feature communication must exclusively pass through the target slice public `index.ts` or the shared module.
- **Law 3: Zero Any Type Policy.** 100% of props, state objects, function arguments, and API payloads must have explicit TypeScript types. `npm run typecheck` (`tsc --noEmit`) must exit cleanly with zero errors.

## 5. Red Flags

- Direct deep imports bypassing slice boundaries, such as: `import { CandidateItem } from '../candidate/components/internal/CandidateItem'`.
- Missing Empty state handling where an empty array renders an empty container with no user feedback.
- Omitting `AbortSignal` in fetch requests, causing memory leaks and race conditions when users switch tabs rapidly.
- Utilizing `any` casts or `as unknown as Type` assertions to circumvent TypeScript strict type checks.
- Testing implementation details (such as component internal state) instead of user-visible DOM semantics (`screen.getByRole`, `screen.getByText`).

## 6. Rationalization Table

| Excuse | Technical Reality |
|---|---|
| "This is a simple list view, a ternary `isLoading ? <Spinner /> : <List />` is sufficient." | When the API returns an empty array or throws an HTTP 503, the interface crashes or displays a blank screen. Omitted Error and Empty states cause the majority of frontend production tickets. |
| "Creating `api/`, `hooks/`, and `components/` subdirectories feels like unnecessary boilerplate for a small feature." | Autonomous modularity is mandatory for Rikkei Jobs to scale across 7 parallel business domains without team collision or merge conflicts. |
| "Writing happy-path tests is enough because backend tests already cover error payloads." | The frontend layer is uniquely responsible for handling offline status, network latency, and mapping ProblemDetail codes to recovery actions. Untested error states lead to application freezes. |

## 7. Verification Checklist

- [ ] Feature slice is properly located in `frontend/src/features/<module>/` with standard subdirectories.
- [ ] View component explicitly handles all 4 states: Loading (Skeleton), Error (with Retry), Empty (with CTA), and Data.
- [ ] Network fetch client accepts `AbortSignal` and accurately decodes RFC 7807 ProblemDetail payloads.
- [ ] `npm run typecheck` passes with zero compiler diagnostics.
- [ ] `npm run lint` passes with zero ESLint errors or warnings.
- [ ] Vitest test suite (`npm run test`) verifies all 4 async states with realistic mock data.

## 8. Rikkei Jobs Specifics

- Directory locations: `frontend/src/features/candidate/`, `company/`, `internship/`, `assessment/`, `learning/`, `recruitment/`, `ai/`.
- Module registry: `frontend/src/features/index.ts` exports `BUSINESS_MODULES` array.
- Shared components: `frontend/src/shared/components/Header.tsx`, `HealthBadge.tsx`, `ModuleCard.tsx`.
- Standard verification commands:

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```
