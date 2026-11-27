# T023DF5 — AI-05 implementation plan

Branch: `feature/t023df5-ai-safety-controls`. Target: `develop`.

The task explicitly authorizes application changes and the task branch, superseding the
older configuration-only scope. The follow-up user instruction explicitly authorizes staging,
committing and pushing this task branch and opening a pull request into develop. Direct writes
or merging to develop/main remain reserved for the Team Lead.

## Design

Extend the existing explicit `AiService` gateway rather than introducing an AOP interceptor.
An interceptor is less invasive but obscures user identity, feature classification, and quota
errors. The gateway provides one visible boundary for all provider calls and is independently
testable. AI-01 is currently implemented; AI-02–04 have no provider call sites in this checkout.
They must call the same gateway with their feature enum when implemented.

Use short database transactions for settings, atomic quota reservation, and append-only audit
writes. Never hold a database transaction open while waiting for a model. Audit writes use
`REQUIRES_NEW` so a 429 or a caller rollback cannot erase the log. PostgreSQL conditional
upsert enforces the daily limit across processes. Preserve provider fallback on errors; never
swallow quota rejection. Check the disable switch before returning AI-01 cached explanations.

## Defaults and explicit assumptions

- One quota unit means one model invocation, including failed provider requests, excluding
  blocked/disabled requests and cache hits. AI-01 can invoke up to five models per refresh.
- Days and summary date filters use UTC; the UI labels this explicitly. This avoids dependence
  on deployment host timezone. Revisit if the team chooses a Vietnam-local business day.
- Bootstrap settings from the existing provider/model properties; default temperature 0.3,
  max tokens 150, daily limit 100, enabled true. Administrators can change these in the DB.
- API keys remain environment-only. The configuration API never accepts or returns keys.
- Mask provider output too, since a model could repeat PII in its response. Error audit text is
  generic and never copies provider exceptions or response bodies.
- Actual token counts come from provider usage metadata. Missing usage stays null and is
  counted separately; mock tokens are zero. Never estimate usage as actual tokens.
- Config updates carry a version to detect concurrent administrator changes (409).

## Steps and verification

1. Add PII parameterized tests (10+ samples); verify red then green with
   `cd backend && ./mvnw -Dtest=PiiMaskerTest test`.
2. Add immutable DTOs and V17 schema (V16 reserved for future dev seed); verify via
   `cd backend && ./mvnw -Dtest=AiGovernanceIntegrationTest test`.
3. Implement settings, bounded log queries, atomic usage, and usage aggregates in the AI module;
   verify with the same PostgreSQL integration suite, including concurrent reservations.
4. Extend provider request/result contracts and gateway; verify with
   `cd backend && ./mvnw -Dtest=AiServiceTest,AiClientTest,JobRecommendationServiceTest test`.
5. Add ADMIN controllers, route policies and OpenAPI; verify access, validation and filters in
   `AiGovernanceIntegrationTest`, plus existing RBAC/OpenAPI coverage tests.
6. Add ADMIN config/log pages using existing tokens and shared components, including an
   accessible usage chart and prompt/response detail view; verify with
   `npm --prefix frontend test -- --run src/features/ai` and frontend lint/build.
7. Run `./check.sh`, `node scripts/validate-agent-config.mjs`, and
   `node scripts/sync-agent-config.mjs --check`. Preserve actual outputs and report blockers.
8. Prepare README, sample requests and PR description headed `[AI-05]`; capture real UI
   screenshots if a browser is available. Publish the task branch and PR under the user authorization; obtain peer and mentor review.

No edits to existing migrations, agent mirrors or real secret files. For an edit requiring
rollback, copy the original to OS temp, record SHA-256, restore and compare, then immediately
remove the backup. Never use Git reset/restore/stash for rollback.
