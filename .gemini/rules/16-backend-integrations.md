# 16 — Backend Integrations

Govern third-party dependencies, mock server integration, background processing, and API documentation.

## 1. Local Email Testing with Mailpit

Use Mailpit for all email delivery and testing in local and development environments:

- Configure Spring Mail in `backend/src/main/resources/application.yml` [EXISTS]:

```yaml
spring:
  mail:
    host: ${SPRING_MAIL_HOST:localhost}
    port: ${SPRING_MAIL_PORT:1025}
```

- Mailpit runs inside `docker-compose.yml` using pinned image `axllent/mailpit:v1.33.1` [EXISTS].
- Bound to loopback interfaces [EXISTS]: SMTP server on `127.0.0.1:1025` and web UI on `127.0.0.1:8025`.
- Never send real outbound emails to external SMTP relays during testing or development [EXISTS].
- Inspect delivered emails during automated testing via Mailpit REST API at `http://127.0.0.1:8025/api/v1/messages` [TARGET].

## 2. Background and Scheduled Tasks

Execute asynchronous and recurring operations using managed thread pools:

- Annotate scheduling configurations with `@EnableScheduling` and `@EnableAsync` [TARGET].
- Define dedicated `ThreadPoolTaskExecutor` beans with explicit capacity constraints [TARGET]:
  - Set core pool size, maximum pool size, and queue capacity based on workload analysis.
  - Set thread name prefix (e.g., `rikkei-async-`, `rikkei-scheduler-`) for trace identification.
  - Configure rejection execution handler (e.g., `CallerRunsPolicy` or custom discard with warning log).
- Never use unmanaged executors or unmanaged threads (`new Thread()`) [TARGET].
- Guard recurring tasks against multi-instance concurrent execution when running clustered instances [TARGET].

## 3. OpenAPI 3 Documentation Policy

Manage API documentation contracts through SpringDoc OpenAPI 3:

- Version is pinned to `3.2.0` via `<springdoc.version>3.2.0</springdoc.version>` in `backend/pom.xml` [EXISTS].
- In development (`application-dev.yml`), enable Swagger UI at `/swagger-ui.html` and OpenAPI spec at `/api-docs` [EXISTS].
- In production (`application-prod.yml`), strictly disable Swagger UI and API docs [EXISTS]:

```yaml
springdoc:
  swagger-ui:
    enabled: false
  api-docs:
    enabled: false
```

- Annotate all REST controllers with `@Tag` and endpoints with `@Operation` describing HTTP response codes [EXISTS] (see `HealthController.java`).
- Do not expose administrative or test endpoints in public OpenAPI schemas [TARGET].

## 4. External System Integration via ExternalApiClient

Route all external HTTP interactions through `com.rikkei.jobs.common.client.ExternalApiClient` [EXISTS]:

- Direct HTTP calls via raw `HttpClient` or `RestTemplate` in business modules are strictly forbidden [EXISTS].
- Inject `X-Service-Key` header on all outbound requests to external mock services [EXISTS].
- Configure timeout and retry properties in `application.yml` [EXISTS]:

```yaml
external:
  api:
    base-url: ${EXTERNAL_BASE_URL:http://localhost:9000}
    service-key: ${EXTERNAL_SERVICE_KEY:dev-key}
    timeout-seconds: ${EXTERNAL_API_TIMEOUT:5}
    max-retries: 2
```

- Translate external HTTP status codes into domain exceptions [EXISTS]:
  - 404 to `ExternalResourceNotFoundException`
  - 401 to `InvalidServiceKeyException`
  - 409 to `ConflictException`
  - 400 to `ValidationException`
  - Connection drop or timeout to `ExternalUnavailableException` (HTTP 503)
- Verify mock communication contracts using integration tests:

```bash
# Verify mock client communication and error handling [EXISTS]
./mvnw test -D "test=ExternalApiClientIntegrationTest"
```

- Target mock server listening on port 9000 (`mock/server.js`) implementing the 11 business endpoints documented in `docs/mock-contract.md` [EXISTS].

## 5. Third-Party Dependency Governance

Enforce strict controls before introducing any new dependency:

- User approval requirement [EXISTS]: Never add dependencies to `backend/pom.xml`, `frontend/package.json`, or `mock/package.json` without explicit approval.
- Pin exact versions in `<properties>` section of `pom.xml` [EXISTS]. Never use version ranges or dynamic versions.
- Security audit [TARGET]: Run vulnerability scans (`./mvnw dependency:tree`, GitHub Dependabot, or Snyk) before proposing dependencies.
- Permissive license policy [EXISTS]: Permit only permissive open-source licenses (Apache 2.0, MIT, BSD 2/3-Clause). Prohibit copyleft licenses (GPL, AGPL, LGPL) in backend runtime dependencies.
