# 15 — Backend Observability and Operations

Enforce production observability standards, structured logging, secure actuator exposure, and environment configuration.

## 1. Structured Logging with Elastic Common Schema (ECS)

Format production logs as structured JSON conforming to Elastic Common Schema:

- In `backend/src/main/resources/application-prod.yml`, maintain `logging.structured.format.console: ecs` [EXISTS]. Never regress this configuration to plain text.
- Set production logging levels appropriately [EXISTS]: `com.rikkei.jobs: INFO` and `org.springframework: WARN`.
- In development (`application-dev.yml`), human-readable formatted logs with `DEBUG` level for `com.rikkei.jobs` are permitted [EXISTS].
- Use SLF4J parameterized logging: `log.info("Processing application id: {}", applicationId);` [EXISTS]. Never use string concatenation in log statements.

## 2. Correlation and Request Tracing

Propagate correlation identifiers across all inbound and outbound operations:

- Extract `X-Request-ID` or `X-Correlation-ID` from incoming HTTP request headers in a servlet filter [TARGET].
- Generate a new UUID if the incoming request lacks a correlation identifier [TARGET].
- Store the correlation identifier in SLF4J MDC (Mapped Diagnostic Context) using key `trace.id` or `correlation_id` [TARGET].
- Ensure outgoing requests via `ExternalApiClient` propagate the correlation identifier header [TARGET].
- Clear MDC in a `finally` block at the completion of each request to prevent thread pool context leakage [TARGET].

## 3. Secret and PII Data Sanitization

Prevent sensitive data leakage into application logs:

- Never log passwords, password hashes, `X-Service-Key`, JWT tokens, or authorization headers [EXISTS].
- Never log Personally Identifiable Information (PII), including candidate national IDs, phone numbers, email addresses, and home addresses [EXISTS].
- Mask or truncate identifiers when logging business events: `log.info("User authenticated: userId={}", user.getId());` [TARGET].
- Configure log sanitization filters to scrub credit card patterns, tokens, and secret parameters from request bodies and query parameters [TARGET].

## 4. Minimal Actuator Exposure and Hardening

Expose only essential management endpoints:

- In `backend/src/main/resources/application.yml`, restrict web exposure: `management.endpoints.web.exposure.include: health,info` [EXISTS].
- Maintain `management.endpoint.health.show-details: never` across both base and production profiles [EXISTS].
- Never expose sensitive actuator endpoints (`env`, `beans`, `mappings`, `heapdump`, thread dumps, `configprops`) to HTTP [EXISTS].
- Verify actuator health endpoint security via integration test:

```bash
# Verify actuator health endpoint security and leakage prevention [EXISTS]
./mvnw test -D "test=ActuatorHealthTest"
```

- Ensure `/actuator/health` returns only `{"status":"UP"}` without revealing internal database hosts, disk paths, or component versions [EXISTS].

## 5. Health Check Semantics and Verification

Maintain dual health check endpoints with clear operational semantics:

- Standard Actuator health endpoint [EXISTS]: `/actuator/health` for container orchestrator readiness and liveness probes.
- Business health check endpoint [EXISTS]: `GET /api/v1/health` implemented in `com.rikkei.jobs.common.health.HealthController`.
  - Executes a direct JDBC query verifying database connectivity and migration execution (`SELECT COUNT(*) FROM flyway_schema_history WHERE success = true`) [EXISTS].
  - Returns HTTP 200 `{"status":"UP"}` when database is healthy and migrations exist [EXISTS].
  - Returns HTTP 503 `{"status":"DOWN"}` when database is unreachable or unmigrated [EXISTS].
- Validate health check functionality:

```bash
# Verify business health check endpoint and database check logic [EXISTS]
./mvnw test -D "test=HealthCheckIntegrationTest"
```

## 6. Metric Naming and Micrometer Standards

Follow consistent metric naming conventions:

- Use dot-separated lowercase metric names prefixed with `rikkeijobs`: `rikkeijobs.http.requests`, `rikkeijobs.auth.failures` [TARGET].
- Use low-cardinality tags: `module`, `endpoint`, `status`, `outcome` [TARGET].
- Never use user IDs, email addresses, or high-cardinality parameters as metric tag values [TARGET].

## 7. Strict Environment-Based Configuration

Inject all infrastructure parameters through environment variables:

- Read database credentials from `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` [EXISTS].
- Read external API configuration from `EXTERNAL_BASE_URL` and `EXTERNAL_SERVICE_KEY` [EXISTS].
- Fail fast on application startup if required production environment variables are missing or insecure, enforced by `ProdEnvironmentValidator.java` [EXISTS].
- Prohibit wildcard CORS in production: `CORS_ALLOWED_ORIGINS` must be explicitly defined and cannot contain `*` [EXISTS].
