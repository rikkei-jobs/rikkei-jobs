---
name: spring-security-rbac-endpoint
description: Use when securing backend REST endpoints, configuring role-based access control (RBAC), or implementing authentication policies.
---

# Spring Security & Role-Based Access Control (RBAC)

## 1. Overview

This skill defines the security architecture, endpoint authorization standards, and authentication governance for the Rikkei Jobs backend running on Spring Boot 4.1.2 and Spring Security.

The platform enforces:

- A strict Deny-by-Default security posture across all REST routes.
- Role-Based Access Control (RBAC) supporting 5 canonical roles: `CANDIDATE`, `HR`, `MENTOR`, `STAFF`, and `ADMIN`.
- Sole backend enforcement for single-use and 60-second TTL validation on SSO tickets (Task NT-01).
- Personal Identifiable Information (PII) masking and privacy-by-default candidate profile protection.
- Strict production CORS validation prohibiting wildcards.

## 2. When to use / When NOT to use

### When to use

- Securing new REST endpoints with method-level authorization (`@PreAuthorize`).
- Configuring role-based access control policies or public endpoint whitelists.
- Implementing authentication flows, token parsing, or SSO ticket verification (Task NT-01).
- Enforcing candidate privacy controls or masking PII attributes in API responses.
- Configuring CORS policies and security filter chain handlers.

### When NOT to use

- Implementing domain business logic unrelated to access control (use `backend-module-feature`).
- Modeling database schema or Flyway migrations for user tables (use `flyway-migration-authoring`).
- Integrating with external mock endpoints for non-authentication operations (use `external-system-integration-and-mock`).

## 3. Step-by-step Process

### Step 1: Consult the 5-Role Access Control Matrix

Identify the required role permissions for the target endpoint:

- `CANDIDATE`: Access personal profile, submit job applications, view personal skill gap analysis, view own assessment reports.
- `HR`: Manage company profile, post and manage job descriptions (JDs), search public candidate profiles (PII masked), issue job offers.
- `MENTOR`: Submit assessment rubrics, evaluate candidate technical interviews, review internship project tasks.
- `STAFF`: Audit and verify candidate profile evidence, approve company JDs, unlock candidate contact details for employers, manage IOC internship batches.
- `ADMIN`: System configuration, manage 20-skills catalogue, inspect immutable audit logs, assign administrative permissions.

### Step 2: Apply Method-Level Security

1. Annotate controller methods or service interfaces with `@PreAuthorize`:
   - Single role: `@PreAuthorize("hasRole('HR')")`
   - Multiple roles: `@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")`
2. Ensure Spring Security authority mapping handles the `ROLE_` prefix uniformly via `SimpleGrantedAuthority`.
3. Never implement manual role string checking within controller method bodies.

### Step 3: Maintain the Deny-by-Default Filter Chain

1. Review `com.rikkei.jobs.common.security.SecurityConfig`.
2. All endpoints under `/api/v1/**` must require authentication (`anyRequest().authenticated()`).
3. Only explicit whitelisted routes may be declared with `permitAll()`:
   - `GET /api/v1/health` (Service health check)
   - `/v3/api-docs/**` and `/swagger-ui/**` (Enabled only in `dev` profile)
4. Handle authentication failures via `CustomAuthenticationEntryPoint`:
   - Return HTTP 401 with body:

     ```json
     {
       "code": "UNAUTHORIZED",
       "message": "Yêu cầu xác thực tài khoản"
     }
     ```

5. Handle authorization failures via `CustomAccessDeniedHandler`:
   - Return HTTP 403 with body:

     ```json
     {
       "code": "FORBIDDEN",
       "message": "Bạn không có quyền thực hiện thao tác này"
     }
     ```

### Step 4: Implement Single-Use 60s SSO Ticket Verification (Task NT-01)

1. Architectural Boundary: The external mock service deliberately DOES NOT invalidate used tickets and DOES NOT enforce expiration. The Rikkei Jobs backend is 100% responsible for ticket validity.
2. In the SSO authentication service:
   a. Check if the ticket string exists in the `used_sso_tickets` database table. If present, immediately reject:
      - HTTP 401: `{"code": "UNAUTHORIZED", "message": "Vé SSO đã được sử dụng"}`.
   b. Call `ExternalApiClient.verifySsoTicket(ticket)` to retrieve the ticket payload (`lmsUserId`, `issuedAt`, `role`).
   c. Verify elapsed time: `Duration.between(issuedAt, Instant.now()).getSeconds() > 60`. If expired, reject:
      - HTTP 401: `{"code": "UNAUTHORIZED", "message": "Vé SSO đã hết hạn"}`.
   d. Insert the ticket into `used_sso_tickets` with the current timestamp.
   e. Issue the application JWT session token.

### Step 5: Enforce Candidate PII Protection

1. Candidate Skill Profiles are private by default (`skill_profiles.status = 'PRIVATE'`).
2. When an HR user queries candidate profiles:
   - Mask email and telephone numbers (e.g., `***@***.***`, `090****123`).
   - Unmask contact details ONLY IF:
     - The candidate has submitted an active application to a JD owned by that HR's company, OR
     - A Staff member has explicitly recorded an approved unlock record for that company.

### Step 6: Configure Strict CORS

1. Bind allowed origins from the environment variable `CORS_ALLOWED_ORIGINS`.
2. In production profiles, `ProdEnvironmentValidator` mechanically validates that the origin list is non-empty and contains no wildcard `*`.
3. Disallow credentials if any wildcard origin is present.

### Step 7: Author Security Tests

1. Author slice tests using `@WebMvcTest` combined with `@WithMockUser`:
   - Verify unauthenticated requests return HTTP 401.
   - Verify role-mismatched requests return HTTP 403.
   - Verify authorized roles receive HTTP 200/201.
2. Author integration tests for SSO ticket replay and expiration.

## 4. Iron Laws

1. DENY BY DEFAULT: Every endpoint requires authentication unless explicitly whitelisted in `SecurityConfig`.
2. BACKEND SSO TICKET ENFORCEMENT: Never trust external mock responses for expiration or single-use state; backend must verify against `used_sso_tickets` within the 60s window.
3. NO WILDCARD CORS IN PRODUCTION: Production environments must never allow `CORS_ALLOWED_ORIGINS=*`.
4. CANDIDATE PII MASKING: Never expose candidate email or phone number to HR users without an active application or Staff approval.
5. NO CREDENTIAL LOGGING: Never log passwords, tokens, API keys, or raw tickets.

## 5. Red Flags

- Endpoints lacking `@PreAuthorize` outside the public whitelist.
- Trusting external mock verification without recording into `used_sso_tickets`.
- Extracting user roles via manual string parsing from headers rather than `SecurityContextHolder`.
- Hardcoding `corsConfiguration.addAllowedOrigin("*")` in production code.
- Returning unmasked candidate contact details in general search endpoints.

## 6. Rationalization Table

| Excuse | Reality |
|---|---|
| "The external mock returned 200 OK, so the ticket must be valid." | The mock server deliberately does not track ticket reuse or 60s expiration; backend must enforce NT-01 via `used_sso_tickets`. |
| "PermitAll is convenient for frontend testing during development." | Temporary bypasses frequently slip into production, exposing unprotected APIs. |
| "Wildcard CORS makes local and staging integration easier." | Fails `ProdEnvironmentValidator` on startup and exposes user sessions to cross-site request forgery risks. |
| "HR needs candidate contact info to recruit effectively." | Exposing unmasked PII violates Document 5 privacy policy and applicable data privacy regulations. |

## 7. Verification Checklist

- [ ] Endpoint has explicit `@PreAuthorize` with authorized role.
- [ ] Unauthenticated requests return HTTP 401 with standard error JSON.
- [ ] Unauthorized requests return HTTP 403 with standard error JSON.
- [ ] SSO ticket flow checks `used_sso_tickets` and enforces 60s maximum lifetime.
- [ ] Candidate PII is masked for HR searches without explicit entitlement.
- [ ] CORS configuration contains no wildcards in production profiles.
- [ ] Security test cases pass with `@WithMockUser`.

## 8. Rikkei Jobs Specifics

- System Roles: `CANDIDATE`, `HR`, `MENTOR`, `STAFF`, `ADMIN`.
- Configuration Class: `com.rikkei.jobs.common.security.SecurityConfig`.
- Entry Points: `CustomAuthenticationEntryPoint`, `CustomAccessDeniedHandler`.
- Production Validator: `com.rikkei.jobs.common.config.ProdEnvironmentValidator`.
- Key Security Task: NT-01 (Single-use 60s SSO ticket enforcement).
- Audit Policy: Immutable audit logging for manual overrides and security state changes.
