# 07 — Security Architecture and Role-Based Access Control (RBAC)

## 1. Core Principles

Enforce security at all architectural boundaries using a deny-by-default posture.
Execute authorization checks at both the HTTP endpoint layer and the service method layer.
Never trust client inputs, external parameters, or unverified claims.

## 2. Five Standard System Roles

Support exactly five authenticated system roles defined in `backend/src/main/java/com/rikkei/jobs/identity/model/Role.java` `EXISTS`:

- CANDIDATE `EXISTS`: Students, alumni, and IOC interns. Manages personal skill profile, target positions, skill gap analysis, and AI job recommendations `EXISTS`; manages CVs and applications `TARGET`.
- HR `EXISTS`: Enterprise recruitment representatives. Manages own company profile and logo `EXISTS`, job descriptions (JDs), candidate searches, and interview scheduling `TARGET`.
- MENTOR `EXISTS`: Instructors and internship supervisors. Evaluates candidates across the 20 standardized skills `EXISTS` and records interview scores `TARGET`.
- STAFF `EXISTS`: Rikkei Education operational staff. Creates companies and provisions HR accounts `EXISTS`; moderates candidate profiles, approves enterprise JDs, and coordinates IOC internship batches `TARGET`.
- ADMIN `EXISTS`: System administrators. Full administrative authority over skills catalog, weighting configurations, and immutable audit logs `TARGET`.

Note: The 5 roles exist in `Role.java` and dev seed migration `V2__dev_seed.sql` `EXISTS`. Company profile, HR provisioning, mentor evaluation, AI job recommendations, and candidate gap analysis workflows are active `EXISTS`; JD authoring/approval and remaining recruitment workflows remain planned target capabilities `TARGET`.

## 3. Deny-by-Default Security Filter Chain

Configure Spring Security in `backend/src/main/java/com/rikkei/jobs/common/security/SecurityConfig.java` `EXISTS`:

- Stateless Session `EXISTS`: Enforce `SessionCreationPolicy.STATELESS` for all requests.
- Disable CSRF `EXISTS`: Disable CSRF protection exclusively because the application relies on stateless authorization tokens.
- Public Whitelist `EXISTS`: Restrict public access strictly to `/api/v1/health`, `/actuator/health`, `/swagger-ui.html`, `/swagger-ui/**`, `/api-docs/**`, and `/v3/api-docs/**`.
- Dev Endpoint Guard `EXISTS`: Allow `/api/v1/test/**` endpoints exclusively when the dev profile is active. Block them with 401 in all other profiles.
- Explicit Deny `EXISTS`: Require authentication for all other requests via `auth.anyRequest().authenticated()`.
- Role-Scoped Routes `EXISTS`: Enforce `GET /api/v1/me/job-recommendations` (`CANDIDATE`), `/api/v1/evaluations/**` and `/api/v1/evaluation-templates/**` (`MENTOR`), `GET /api/v1/profiles/*/evaluations` (`CANDIDATE`, `HR`), `/api/v1/staff/**` (`STAFF`), and `/api/v1/companies/me` & `/api/v1/companies/me/**` (`HR`), plus `MustChangePasswordFilter` (`403 MUST_CHANGE_PASSWORD`).
- Standard Error Responses `EXISTS`: Handled via `CustomAuthenticationEntryPoint` and `CustomAccessDeniedHandler`:
  - Unauthenticated requests: Return HTTP 401 with body `{"code":"UNAUTHORIZED","message":"Yêu cầu xác thực tài khoản"}`.
  - Unauthorized requests: Return HTTP 403 with body `{"code":"FORBIDDEN","message":"Bạn không có quyền thực hiện thao tác này"}`.

## 4. Fail-Fast Production Environment Validation

Validate critical security properties before application context initialization via `ProdEnvironmentValidator` `EXISTS`:

- Execution Phase `EXISTS`: Listen to `ApplicationPreparedEvent` to validate environment variables prior to DataSource initialization.
- Wildcard CORS Prohibition `EXISTS`: Under the prod profile, `CORS_ALLOWED_ORIGINS` must be set, non-blank, and strictly contain no wildcard (*).
- Insecure Secret Rejection `EXISTS`: Reject default passwords (e.g. postgres, dev-key, change-me, rikkei_secret) with `IllegalStateException`.
- Cloudinary Prod Validation `EXISTS`: Reject blank, dummy (`dev-cloud`, `dev-secret`, `dummy`, `your-cloud-name`, `your-api-key`, `your-api-secret`), non-`https://`, or loopback/mock URLs for `CLOUDINARY_*` variables under `prod` (`backend/src/main/java/com/rikkei/jobs/common/config/ProdEnvironmentValidator.java`).

## 5. Single-Use and 60-Second SSO Ticket Enforcement (Task NT-01)

Adhere to the authentication boundaries established in `docs/mock-contract.md` and `backend/src/main/java/com/rikkei/jobs/identity/package-info.java` `EXISTS`:

- Mock Server Exemption `EXISTS`: The external mock server (`mock/server.js`) intentionally does not enforce single-use or 60-second expiration.
- Backend Responsibility `EXISTS`: The Rikkei Jobs backend strictly enforces ticket security during user login:
  - Single-Use Check `EXISTS`: Validate ticket identifiers against the `used_sso_tickets` table in `backend/src/main/resources/db/migration/V5__auth_identity_evolution.sql` via `backend/src/main/java/com/rikkei/jobs/identity/model/UsedSsoTicket.java` `EXISTS`. Reject duplicate submissions with HTTP 401 UNAUTHORIZED.
  - Expiration Check `EXISTS`: Reject tickets older than 60 seconds (TTL) via `backend/src/main/java/com/rikkei/jobs/identity/service/SsoTicketService.java` `EXISTS` with HTTP 401 UNAUTHORIZED.
  - Stateless JWT Authentication `EXISTS`: Implemented in `backend/src/main/java/com/rikkei/jobs/identity/security/JwtAuthFilter.java` and `backend/src/main/java/com/rikkei/jobs/identity/security/JwtService.java` `EXISTS`.
  - Password Reset Flow `EXISTS`: Handled via `backend/src/main/java/com/rikkei/jobs/identity/model/PasswordResetToken.java` and `backend/src/main/resources/db/migration/V5__auth_identity_evolution.sql` `EXISTS`.

## 6. OWASP Application Security Verification Standard Mapping

Align security hardening with OWASP Application Security Verification Standard (Version 4.0):

- V2 Authentication: Store passwords with `BCryptPasswordEncoder` (strength 10) `EXISTS`. Enforce SSO ticket single-use and 60s TTL `EXISTS`. Validate stateless JWT via `JwtAuthFilter` `EXISTS`.
- V3 Session Management `EXISTS`: Stateless tokens without server-side HTTP session storage.
- V4 Access Control `EXISTS`: Enable `@EnableMethodSecurity` and restrict endpoint access using `@PreAuthorize("hasRole('...')")` `EXISTS`. Validate horizontal entity ownership `EXISTS`.
- V5 Input Validation `EXISTS`: Validate all request payloads using Jakarta Validation annotations (`@Valid`, `@NotNull`, `@Size`) `EXISTS`.
- V14 Configuration `EXISTS`: Hide Actuator health details (`management.endpoint.health.show-details: never`) `EXISTS`.

## 7. Verification Commands

Verify security hardening, CORS, and environment validation:

```bash
# Verify security hardening, profile isolation, and actuator leakage protection `EXISTS`
./mvnw test -D "test=SecurityHardeningIntegrationTest"

# Verify CORS configuration, preflight handling, and origin restrictions `EXISTS`
./mvnw test -D "test=SecurityCorsIntegrationTest"

# Verify fail-fast production environment validation `EXISTS`
./mvnw test -D "test=ProdEnvironmentValidatorTest"
```
