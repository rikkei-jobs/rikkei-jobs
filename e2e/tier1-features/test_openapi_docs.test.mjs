// Tier 1: Feature Coverage — OpenAPI /api/docs, Swagger UI Assets & Legacy Routes
// Verifies /api/docs redirect and HTML rendering, Swagger UI CSS/JS/PNG/config assets on :8080 and :3000,
// full OpenAPI 45-path / 48-operation contract, @Hidden exclusion of TestErrorController, and hr1 allow-list

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  BACKEND_BASE_URL,
  FRONTEND_BASE_URL,
  isReachable,
} from "../config.mjs";
import { http } from "../helpers/http-client.mjs";
import {
  DEV_SEED_PASSWORD,
  authHeaders,
  loginUser,
  assertNoSniffHeader,
  assertUnifiedErrorResponse,
} from "../helpers/company-fixtures.mjs";

const EXPECTED_OPERATIONS = new Map([
  ["/api/v1/admin/ai-config", ["get", "put"]],
  ["/api/v1/admin/ai-logs", ["get"]],
  ["/api/v1/admin/ai-usage/summary", ["get"]],
  ["/api/v1/auth/sso", ["post"]],
  ["/api/v1/auth/login", ["post"]],
  ["/api/v1/auth/change-password", ["post"]],
  ["/api/v1/auth/forgot-password", ["post"]],
  ["/api/v1/auth/reset-password", ["post"]],
  ["/api/v1/auth/me", ["get"]],
  ["/api/v1/health", ["get"]],
  ["/api/v1/staff/companies", ["post"]],
  ["/api/v1/staff/companies/{id}/hr-accounts", ["post"]],
  ["/api/v1/companies/me", ["get", "put"]],
  ["/api/v1/companies/me/logo", ["post"]],
  ["/api/v1/companies/{id}", ["get"]],
  ["/api/v1/jobs/{jobId}", ["get"]],
  ["/api/v1/evaluations", ["post"]],
  ["/api/v1/evaluations/{id}", ["put", "get"]],
  ["/api/v1/evaluations/{id}/submit", ["post"]],
  ["/api/v1/evaluation-templates", ["get"]],
  ["/api/v1/profiles/{userId}/evaluations", ["get"]],
  ["/api/v1/profiles/me/skills", ["get"]],
  ["/api/v1/profiles/me/skills/recompute", ["post"]],
  ["/api/v1/profiles/{userId}/skills", ["get"]],
  ["/api/v1/target-positions", ["get"]],
  ["/api/v1/me/target", ["get", "put"]],
  ["/api/v1/me/gap-analysis", ["get"]],
  ["/api/v1/me/job-recommendations", ["get"]],
  ["/api/v1/profiles/me/internships", ["get"]],
  ["/api/v1/profiles/{userId}/internships", ["get"]],
  ["/api/v1/jobs/{id}/apply", ["post"]],
  ["/api/v1/me/applications", ["get"]],
  ["/api/v1/me/applications/{id}", ["get"]],
  ["/api/v1/me/applications/{id}/withdraw", ["post"]],
  ["/api/v1/me/applications/{id}/cv-snapshot", ["get"]],
  ["/api/v1/mentor/evaluation-tasks", ["get"]],
  ["/api/v1/hr/jobs/{jobId}/applications", ["get"]],
  ["/api/v1/hr/jobs/{jobId}/applications/{applicationId}", ["get"]],
  ["/api/v1/hr/jobs/{jobId}/applications/{applicationId}/cv-snapshot", ["get"]],
  ["/api/v1/hr/jobs", ["get"]],
  ["/api/v1/applications/{id}", ["get"]],
  ["/api/v1/applications/{id}/cv-snapshot", ["get"]],
  ["/api/v1/applications/{id}/transition", ["post"]],
  ["/api/v1/applications/{id}/rounds", ["post"]],
  ["/api/v1/applications/{id}/rounds/{roundId}", ["put"]],
  ["/api/v1/staff/applications", ["get"]],
]);

const PUBLIC_OPERATIONS = new Set([
  "post /api/v1/auth/sso",
  "post /api/v1/auth/login",
  "post /api/v1/auth/forgot-password",
  "post /api/v1/auth/reset-password",
  "get /api/v1/health",
]);

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

const REQUIRED_CSP_DIRECTIVES = [
  "script-src",
  "style-src",
  "img-src",
  "connect-src",
];
const OPTIONAL_ELEM_CSP_DIRECTIVES = ["script-src-elem", "style-src-elem"];

function parseCspDirectives(policy) {
  const directives = new Map();
  for (const rawDirective of policy.split(";")) {
    const trimmed = rawDirective.trim();
    if (!trimmed) continue;
    const parts = trimmed.toLowerCase().split(/\s+/);
    const name = parts[0];
    // Per W3C CSP spec, the first occurrence of a duplicate directive wins
    if (!directives.has(name)) {
      directives.set(name, parts.slice(1));
    }
  }
  return directives;
}

function assertEffectiveCspAllowsSelf(
  effectiveTokens,
  directiveName,
  contextLabel,
  csp,
) {
  if (!effectiveTokens) return;
  assert.ok(
    !effectiveTokens.includes("'none'"),
    `${contextLabel} CSP must not block ${directiveName} with 'none': ${csp}`,
  );
  if (directiveName === "script-src" || directiveName === "script-src-elem") {
    assert.ok(
      !effectiveTokens.includes("'strict-dynamic'"),
      `${contextLabel} CSP must not use 'strict-dynamic' on ${directiveName} without nonces: ${csp}`,
    );
  }
  const allowsSelf =
    effectiveTokens.includes("'self'") || effectiveTokens.includes("*");
  assert.ok(
    allowsSelf,
    `${contextLabel} CSP ${directiveName} must allow 'self' or '*': ${csp}`,
  );
}

function assertNoBlockingCsp(headers, contextLabel) {
  const csp = headers.get("content-security-policy");
  if (!csp || !csp.trim()) return;

  // Fetch Headers.get joins multiple CSP headers with commas; every policy must permit Swagger UI
  const policies = csp
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const policy of policies) {
    const directives = parseCspDirectives(policy);
    const defaultTokens = directives.get("default-src");

    for (const directive of REQUIRED_CSP_DIRECTIVES) {
      const effectiveTokens = directives.get(directive) ?? defaultTokens;
      assertEffectiveCspAllowsSelf(
        effectiveTokens,
        directive,
        contextLabel,
        csp,
      );
    }

    for (const elemDirective of OPTIONAL_ELEM_CSP_DIRECTIVES) {
      if (directives.has(elemDirective)) {
        assertEffectiveCspAllowsSelf(
          directives.get(elemDirective),
          elemDirective,
          contextLabel,
          csp,
        );
      }
    }
  }
}

function extractRelativeSwaggerAssets(indexHtml) {
  const refs = new Set();
  const attrRegex = /(?:href|src)=["'](\.\/[^"']+)["']/gi;
  for (const match of indexHtml.matchAll(attrRegex)) {
    const cleanRef = match[1].replace(/^\.\//, "");
    refs.add(`/api/swagger-ui/${cleanRef}`);
  }
  return [...refs];
}

describe("Tier 1: OpenAPI /api/docs & Swagger UI Verification", () => {
  let backendOnline = false;
  let frontendOnline = false;

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    frontendOnline = await isReachable(FRONTEND_BASE_URL);
  });

  it("TC-T1-DOCS-01: Should redirect /api/docs -> /api/swagger-ui/index.html and render Swagger UI on :8080 and :3000 without CSP block", async () => {
    assert.ok(backendOnline, "Backend service must be reachable");
    assert.ok(frontendOnline, "Frontend Nginx proxy must be reachable");

    for (const [label, baseUrl] of [
      ["backend :8080", BACKEND_BASE_URL],
      ["frontend :3000", FRONTEND_BASE_URL],
    ]) {
      const redirectRes = await http.get(`${baseUrl}/api/docs`, {
        redirect: "manual",
      });
      assert.strictEqual(
        redirectRes.status,
        302,
        `${label} GET /api/docs must return 302, got ${redirectRes.status}`,
      );
      const location = redirectRes.headers.get("location") || "";
      assert.ok(
        location.endsWith("/api/swagger-ui/index.html"),
        `${label} Location must end with /api/swagger-ui/index.html, got "${location}"`,
      );

      const pageRes = await http.get(`${baseUrl}/api/docs`);
      assert.strictEqual(
        pageRes.status,
        200,
        `${label} followed /api/docs must return 200, got ${pageRes.status}`,
      );
      const contentType = (
        pageRes.headers.get("content-type") || ""
      ).toLowerCase();
      assert.ok(
        contentType.includes("text/html"),
        `${label} expected text/html, got "${contentType}"`,
      );
      assert.ok(
        pageRes.rawText.includes('id="swagger-ui"'),
        `${label} HTML must contain #swagger-ui root`,
      );
      assert.ok(
        pageRes.rawText.includes("<title>Swagger UI</title>"),
        `${label} HTML must contain Swagger UI title`,
      );
      assertNoBlockingCsp(pageRes.headers, label);
      assertNoSniffHeader(pageRes.headers);
    }
  });

  it("TC-T1-DOCS-02: Should serve all Swagger UI CSS/JS/PNG assets and swagger-config cleanly on :8080 and :3000", async () => {
    assert.ok(backendOnline, "Backend service must be reachable");
    assert.ok(frontendOnline, "Frontend Nginx proxy must be reachable");

    const expectedAssets = [
      { path: "/api/swagger-ui/swagger-ui.css", mimeFragment: "text/css" },
      { path: "/api/swagger-ui/index.css", mimeFragment: "text/css" },
      {
        path: "/api/swagger-ui/swagger-ui-bundle.js",
        mimeFragment: "javascript",
      },
      {
        path: "/api/swagger-ui/swagger-ui-standalone-preset.js",
        mimeFragment: "javascript",
      },
      {
        path: "/api/swagger-ui/swagger-initializer.js",
        mimeFragment: "javascript",
      },
      { path: "/api/swagger-ui/favicon-32x32.png", mimeFragment: "image/png" },
      { path: "/api/swagger-ui/favicon-16x16.png", mimeFragment: "image/png" },
    ];

    for (const [label, baseUrl] of [
      ["backend :8080", BACKEND_BASE_URL],
      ["frontend :3000", FRONTEND_BASE_URL],
    ]) {
      const indexRes = await http.get(`${baseUrl}/api/swagger-ui/index.html`);
      assert.strictEqual(indexRes.status, 200, `${label} index.html failed`);
      const discoveredPaths = extractRelativeSwaggerAssets(indexRes.rawText);
      assert.ok(
        discoveredPaths.length >= 4,
        `${label} expected discovered asset links from index.html`,
      );

      for (const asset of expectedAssets) {
        const res = await http.getBuffer(`${baseUrl}${asset.path}`, {
          timeoutMs: 8000,
        });
        assert.strictEqual(
          res.status,
          200,
          `${label} ${asset.path} must return 200, got ${res.status}`,
        );
        const contentType = (
          res.headers.get("content-type") || ""
        ).toLowerCase();
        assert.ok(
          contentType.includes(asset.mimeFragment),
          `${label} ${asset.path} expected Content-Type containing "${asset.mimeFragment}", got "${contentType}"`,
        );
        assert.ok(
          res.rawBuffer.byteLength > 0,
          `${label} ${asset.path} must not be empty`,
        );
        assertNoBlockingCsp(res.headers, `${label} ${asset.path}`);
        assertNoSniffHeader(res.headers);

        if (asset.path.endsWith("swagger-initializer.js")) {
          assert.ok(
            res.rawText.includes("/api/api-docs/swagger-config"),
            `${label} swagger-initializer.js must reference /api/api-docs/swagger-config`,
          );
        }
      }

      for (const discoveredPath of discoveredPaths) {
        const res = await http.getBuffer(`${baseUrl}${discoveredPath}`, {
          timeoutMs: 8000,
        });
        assert.strictEqual(
          res.status,
          200,
          `${label} discovered asset ${discoveredPath} must return 200, got ${res.status}`,
        );
        assert.ok(
          res.rawBuffer.byteLength > 0,
          `${label} discovered asset ${discoveredPath} must not be empty`,
        );
      }

      const configRes = await http.get(
        `${baseUrl}/api/api-docs/swagger-config`,
      );
      assert.strictEqual(
        configRes.status,
        200,
        `${label} swagger-config must return 200, got ${configRes.status}`,
      );
      assert.strictEqual(
        configRes.body?.url,
        "/api/api-docs",
        `${label} swagger-config url must be /api/api-docs`,
      );
    }
  });

  it("TC-T1-DOCS-03: Should expose identical OpenAPI 3 contract with bearerAuth and all 45 paths / 48 operations across :8080 and :3000", async () => {
    assert.ok(backendOnline, "Backend service must be reachable");
    assert.ok(frontendOnline, "Frontend Nginx proxy must be reachable");

    const [backendApiRes, backendLegacyRes, frontendProxyRes] =
      await Promise.all([
        http.get(`${BACKEND_BASE_URL}/api/api-docs`, { timeoutMs: 8000 }),
        http.get(`${BACKEND_BASE_URL}/api-docs`, { timeoutMs: 8000 }),
        http.get(`${FRONTEND_BASE_URL}/api/api-docs`, { timeoutMs: 8000 }),
      ]);

    for (const [label, res] of [
      [":8080/api/api-docs", backendApiRes],
      [":8080/api-docs", backendLegacyRes],
      [":3000/api/api-docs", frontendProxyRes],
    ]) {
      assert.strictEqual(
        res.status,
        200,
        `${label} must return 200, got ${res.status}`,
      );
      assert.ok(
        (res.headers.get("content-type") || "")
          .toLowerCase()
          .includes("application/json"),
        `${label} must return JSON`,
      );
      assert.strictEqual(
        res.body?.servers?.[0]?.url,
        "/",
        `${label} servers[0].url must be '/'`,
      );
      const bearer = res.body?.components?.securitySchemes?.bearerAuth;
      assert.ok(bearer, `${label} must define bearerAuth`);
      assert.strictEqual(bearer.type, "http");
      assert.strictEqual(bearer.scheme, "bearer");
      assert.strictEqual(bearer.bearerFormat, "JWT");
    }

    assert.deepStrictEqual(
      backendApiRes.body.paths,
      backendLegacyRes.body.paths,
      "/api/api-docs and /api-docs paths must match",
    );
    assert.deepStrictEqual(
      backendApiRes.body.paths,
      frontendProxyRes.body.paths,
      ":8080 and :3000 OpenAPI paths must match",
    );

    const paths = backendApiRes.body.paths || {};
    const actualPathKeys = Object.keys(paths).sort();
    const expectedPathKeys = [...EXPECTED_OPERATIONS.keys()].sort();
    assert.deepStrictEqual(
      actualPathKeys,
      expectedPathKeys,
      "OpenAPI paths must match all 45 merged module endpoints",
    );

    let totalOperations = 0;
    const rootSecurity = backendApiRes.body.security || [];
    const hasRootBearer = rootSecurity.some((item) =>
      Object.prototype.hasOwnProperty.call(item, "bearerAuth"),
    );

    for (const [pathKey, expectedMethods] of EXPECTED_OPERATIONS.entries()) {
      const pathItem = paths[pathKey] || {};
      const actualMethods = Object.keys(pathItem)
        .filter((m) => HTTP_METHODS.includes(m))
        .sort();
      assert.deepStrictEqual(
        actualMethods,
        [...expectedMethods].sort(),
        `Methods mismatch for ${pathKey}`,
      );
      totalOperations += actualMethods.length;

      for (const method of actualMethods) {
        const op = pathItem[method];
        const opKey = `${method} ${pathKey}`;
        if (!PUBLIC_OPERATIONS.has(opKey)) {
          const opSecurity = op.security || [];
          const hasOpBearer =
            hasRootBearer ||
            opSecurity.some((item) =>
              Object.prototype.hasOwnProperty.call(item, "bearerAuth"),
            );
          assert.ok(
            hasOpBearer,
            `Protected operation ${opKey} must declare bearerAuth security`,
          );
          assert.ok(
            op.responses?.["401"],
            `Protected operation ${opKey} must document 401 response`,
          );
          if (pathKey.startsWith("/api/v1/admin/ai-")) {
            assert.ok(
              op.responses?.["403"],
              `ADMIN operation ${opKey} must document 403 response`,
            );
          }
        }
      }
    }

    assert.strictEqual(
      totalOperations,
      48,
      `Expected 48 OpenAPI operations, got ${totalOperations}`,
    );

    const getCompanyByIdOp = paths["/api/v1/companies/{id}"]?.get;
    assert.ok(
      getCompanyByIdOp,
      "GET /api/v1/companies/{id} must exist in OpenAPI",
    );
    for (const statusCode of ["200", "400", "401", "403", "404"]) {
      assert.ok(
        getCompanyByIdOp.responses?.[statusCode],
        `GET /api/v1/companies/{id} must document ${statusCode}`,
      );
    }

    const healthOp = paths["/api/v1/health"]?.get;
    assert.ok(
      healthOp?.responses?.["200"] && healthOp?.responses?.["503"],
      "GET /api/v1/health must document 200 and 503",
    );

    const myInternshipsGet = paths["/api/v1/profiles/me/internships"]?.get;
    assert.ok(
      myInternshipsGet,
      "GET /api/v1/profiles/me/internships must exist in OpenAPI",
    );
    const myInternships200 =
      myInternshipsGet.responses?.["200"]?.content?.["application/json"] ??
      myInternshipsGet.responses?.["200"]?.content?.["*/*"];
    assert.strictEqual(
      myInternships200?.schema?.type,
      "array",
      "GET /api/v1/profiles/me/internships 200 must return an array",
    );
    assert.strictEqual(
      myInternships200?.schema?.items?.$ref,
      "#/components/schemas/InternshipResponse",
    );
    for (const statusCode of ["401", "403", "503"]) {
      const resp = myInternshipsGet.responses?.[statusCode];
      assert.ok(
        resp,
        `GET /api/v1/profiles/me/internships must document ${statusCode}`,
      );
      const errContent =
        resp.content?.["application/json"] ?? resp.content?.["*/*"];
      assert.strictEqual(
        errContent?.schema?.$ref,
        "#/components/schemas/ErrorResponse",
      );
    }

    const userInternshipsGet =
      paths["/api/v1/profiles/{userId}/internships"]?.get;
    assert.ok(
      userInternshipsGet,
      "GET /api/v1/profiles/{userId}/internships must exist in OpenAPI",
    );
    const userInternships200 =
      userInternshipsGet.responses?.["200"]?.content?.["application/json"] ??
      userInternshipsGet.responses?.["200"]?.content?.["*/*"];
    assert.strictEqual(
      userInternships200?.schema?.type,
      "array",
      "GET /api/v1/profiles/{userId}/internships 200 must return an array",
    );
    assert.strictEqual(
      userInternships200?.schema?.items?.$ref,
      "#/components/schemas/InternshipResponse",
    );
    for (const statusCode of ["400", "401", "403", "404"]) {
      const resp = userInternshipsGet.responses?.[statusCode];
      assert.ok(
        resp,
        `GET /api/v1/profiles/{userId}/internships must document ${statusCode}`,
      );
      const errContent =
        resp.content?.["application/json"] ?? resp.content?.["*/*"];
      assert.strictEqual(
        errContent?.schema?.$ref,
        "#/components/schemas/ErrorResponse",
      );
    }

    const assertErrorResponsesAnd403 = (
      operation,
      opLabel,
      expectedRole,
      errorCodes,
    ) => {
      assert.ok(operation, `${opLabel} must exist in OpenAPI`);
      for (const code of errorCodes) {
        const resp = operation.responses?.[code];
        assert.ok(resp, `${opLabel} must document ${code}`);
        const errContent =
          resp.content?.["application/json"] ?? resp.content?.["*/*"];
        assert.strictEqual(
          errContent?.schema?.$ref,
          "#/components/schemas/ErrorResponse",
          `${opLabel} ${code} must reference ErrorResponse`,
        );
      }
      const desc403 = operation.responses?.["403"]?.description || "";
      assert.ok(
        desc403.includes(expectedRole),
        `${opLabel} 403 description must mention ${expectedRole}`,
      );
      assert.ok(
        desc403.includes("MUST_CHANGE_PASSWORD"),
        `${opLabel} 403 description must mention MUST_CHANGE_PASSWORD`,
      );
    };

    const applyPost = paths["/api/v1/jobs/{id}/apply"]?.post;
    assertErrorResponsesAnd403(
      applyPost,
      "POST /api/v1/jobs/{id}/apply",
      "CANDIDATE",
      ["400", "401", "403", "404", "409", "503"],
    );
    assert.ok(
      applyPost.responses?.["201"],
      "POST /api/v1/jobs/{id}/apply must document 201",
    );
    const apply201Content =
      applyPost.responses["201"].content?.["application/json"] ??
      applyPost.responses["201"].content?.["*/*"];
    assert.strictEqual(
      apply201Content?.schema?.$ref,
      "#/components/schemas/ApplicationDetailResponse",
    );

    const myAppsGet = paths["/api/v1/me/applications"]?.get;
    assertErrorResponsesAnd403(
      myAppsGet,
      "GET /api/v1/me/applications",
      "CANDIDATE",
      ["400", "401", "403"],
    );
    assert.ok(
      myAppsGet.responses?.["200"],
      "GET /api/v1/me/applications must document 200",
    );

    const myAppDetailGet = paths["/api/v1/me/applications/{id}"]?.get;
    assertErrorResponsesAnd403(
      myAppDetailGet,
      "GET /api/v1/me/applications/{id}",
      "CANDIDATE",
      ["400", "401", "403", "404"],
    );
    const myAppDetail200 =
      myAppDetailGet.responses?.["200"]?.content?.["application/json"] ??
      myAppDetailGet.responses?.["200"]?.content?.["*/*"];
    assert.strictEqual(
      myAppDetail200?.schema?.$ref,
      "#/components/schemas/ApplicationDetailResponse",
    );

    const withdrawPost = paths["/api/v1/me/applications/{id}/withdraw"]?.post;
    assertErrorResponsesAnd403(
      withdrawPost,
      "POST /api/v1/me/applications/{id}/withdraw",
      "CANDIDATE",
      ["400", "401", "403", "404", "409"],
    );
    const withdraw200 =
      withdrawPost.responses?.["200"]?.content?.["application/json"] ??
      withdrawPost.responses?.["200"]?.content?.["*/*"];
    assert.strictEqual(
      withdraw200?.schema?.$ref,
      "#/components/schemas/ApplicationDetailResponse",
    );

    const mySnapshotGet =
      paths["/api/v1/me/applications/{id}/cv-snapshot"]?.get;
    assertErrorResponsesAnd403(
      mySnapshotGet,
      "GET /api/v1/me/applications/{id}/cv-snapshot",
      "CANDIDATE",
      ["400", "401", "403", "404"],
    );
    assert.ok(
      mySnapshotGet.responses?.["200"]?.content?.["application/pdf"],
      "GET /api/v1/me/applications/{id}/cv-snapshot must document application/pdf",
    );

    const hrAppsGet = paths["/api/v1/hr/jobs/{jobId}/applications"]?.get;
    assertErrorResponsesAnd403(
      hrAppsGet,
      "GET /api/v1/hr/jobs/{jobId}/applications",
      "HR",
      ["400", "401", "403", "404"],
    );
    assert.ok(
      hrAppsGet.responses?.["200"],
      "GET /api/v1/hr/jobs/{jobId}/applications must document 200",
    );

    const hrAppDetailGet =
      paths["/api/v1/hr/jobs/{jobId}/applications/{applicationId}"]?.get;
    assertErrorResponsesAnd403(
      hrAppDetailGet,
      "GET /api/v1/hr/jobs/{jobId}/applications/{applicationId}",
      "HR",
      ["400", "401", "403", "404"],
    );
    const hrAppDetail200 =
      hrAppDetailGet.responses?.["200"]?.content?.["application/json"] ??
      hrAppDetailGet.responses?.["200"]?.content?.["*/*"];
    assert.strictEqual(
      hrAppDetail200?.schema?.$ref,
      "#/components/schemas/ApplicationDetailResponse",
    );

    const hrSnapshotGet =
      paths["/api/v1/hr/jobs/{jobId}/applications/{applicationId}/cv-snapshot"]
        ?.get;
    assertErrorResponsesAnd403(
      hrSnapshotGet,
      "GET /api/v1/hr/jobs/{jobId}/applications/{applicationId}/cv-snapshot",
      "HR",
      ["400", "401", "403", "404"],
    );
    assert.ok(
      hrSnapshotGet.responses?.["200"]?.content?.["application/pdf"],
      "GET /api/v1/hr/jobs/{jobId}/applications/{applicationId}/cv-snapshot must document application/pdf",
    );

    const schemas = backendApiRes.body?.components?.schemas || {};
    for (const schemaName of [
      "ApplicationDetailResponse",
      "ApplicationSummaryResponse",
      "HrApplicationSummaryResponse",
      "ApplicationStatusHistoryResponse",
      "ApplyJobRequest",
      "WithdrawApplicationRequest",
    ]) {
      assert.ok(
        schemas[schemaName],
        `OpenAPI components.schemas must include ${schemaName}`,
      );
    }
    assert.strictEqual(
      schemas.ApplicationDetailResponse?.properties?.cvSnapshotUrl?.example,
      "/api/v1/me/applications/1/cv-snapshot",
      "ApplicationDetailResponse.cvSnapshotUrl.example must match /api/v1/me/applications/1/cv-snapshot",
    );

    const hrJobsGet = paths["/api/v1/hr/jobs"]?.get;
    assertErrorResponsesAnd403(hrJobsGet, "GET /api/v1/hr/jobs", "HR", [
      "400",
      "401",
      "403",
      "404",
    ]);
    assert.ok(
      hrJobsGet.responses?.["200"],
      "GET /api/v1/hr/jobs must document 200",
    );
    assert.ok(
      (hrJobsGet.description || "").includes("DN-04"),
      "GET /api/v1/hr/jobs description must note DN-04 expansion",
    );

    const appDetailGet = paths["/api/v1/applications/{id}"]?.get;
    assertErrorResponsesAnd403(
      appDetailGet,
      "GET /api/v1/applications/{id}",
      "HR",
      ["400", "401", "403", "404"],
    );
    assert.ok(
      (appDetailGet.responses?.["403"]?.description || "").includes("STAFF"),
      "GET /api/v1/applications/{id} 403 description must mention STAFF",
    );
    const appDetail200 =
      appDetailGet.responses?.["200"]?.content?.["application/json"] ??
      appDetailGet.responses?.["200"]?.content?.["*/*"];
    assert.strictEqual(
      appDetail200?.schema?.$ref,
      "#/components/schemas/ApplicationProcessDetailResponse",
    );

    const appSnapshotGet = paths["/api/v1/applications/{id}/cv-snapshot"]?.get;
    assertErrorResponsesAnd403(
      appSnapshotGet,
      "GET /api/v1/applications/{id}/cv-snapshot",
      "HR",
      ["400", "401", "403", "404"],
    );
    assert.ok(
      (appSnapshotGet.responses?.["403"]?.description || "").includes("STAFF"),
      "GET /api/v1/applications/{id}/cv-snapshot 403 description must mention STAFF",
    );
    assert.ok(
      appSnapshotGet.responses?.["200"]?.content?.["application/pdf"],
      "GET /api/v1/applications/{id}/cv-snapshot must document application/pdf",
    );

    const transitionPost = paths["/api/v1/applications/{id}/transition"]?.post;
    assertErrorResponsesAnd403(
      transitionPost,
      "POST /api/v1/applications/{id}/transition",
      "HR",
      ["400", "401", "403", "404", "409"],
    );
    const transition200 =
      transitionPost.responses?.["200"]?.content?.["application/json"] ??
      transitionPost.responses?.["200"]?.content?.["*/*"];
    assert.strictEqual(
      transition200?.schema?.$ref,
      "#/components/schemas/ApplicationProcessDetailResponse",
    );

    const addRoundPost = paths["/api/v1/applications/{id}/rounds"]?.post;
    assertErrorResponsesAnd403(
      addRoundPost,
      "POST /api/v1/applications/{id}/rounds",
      "HR",
      ["400", "401", "403", "404", "409"],
    );
    const addRound201 =
      addRoundPost.responses?.["201"]?.content?.["application/json"] ??
      addRoundPost.responses?.["201"]?.content?.["*/*"];
    assert.strictEqual(
      addRound201?.schema?.$ref,
      "#/components/schemas/InterviewRoundResponse",
    );

    const updateRoundPut =
      paths["/api/v1/applications/{id}/rounds/{roundId}"]?.put;
    assertErrorResponsesAnd403(
      updateRoundPut,
      "PUT /api/v1/applications/{id}/rounds/{roundId}",
      "HR",
      ["400", "401", "403", "404", "409"],
    );
    const updateRound200 =
      updateRoundPut.responses?.["200"]?.content?.["application/json"] ??
      updateRoundPut.responses?.["200"]?.content?.["*/*"];
    assert.strictEqual(
      updateRound200?.schema?.$ref,
      "#/components/schemas/InterviewRoundResponse",
    );

    const staffAppsGet = paths["/api/v1/staff/applications"]?.get;
    assertErrorResponsesAnd403(
      staffAppsGet,
      "GET /api/v1/staff/applications",
      "STAFF",
      ["400", "401", "403"],
    );
    assert.ok(
      staffAppsGet.responses?.["200"],
      "GET /api/v1/staff/applications must document 200",
    );

    for (const ut02SchemaName of [
      "HrJobSummaryDto",
      "ApplicationProcessDetailResponse",
      "InterviewRoundResponse",
      "StaffApplicationSummaryResponse",
      "TransitionApplicationRequest",
      "CreateInterviewRoundRequest",
      "UpdateInterviewRoundRequest",
    ]) {
      assert.ok(
        schemas[ut02SchemaName],
        `OpenAPI components.schemas must include ${ut02SchemaName}`,
      );
    }
    assert.ok(
      schemas.HrJobSummaryDto?.properties?.expired,
      "OpenAPI HrJobSummaryDto schema must expose expired boolean",
    );
    assert.ok(
      Array.isArray(schemas.UpdateInterviewRoundRequest?.required) &&
        schemas.UpdateInterviewRoundRequest.required.includes("version"),
      "OpenAPI UpdateInterviewRoundRequest schema must require version",
    );

    // Legacy UT-02 PATCH status, unprefixed/stray routes, and out-of-scope HS-04 paths must stay absent
    assert.strictEqual(
      paths["/api/v1/hr/jobs/{jobId}/applications/{applicationId}/status"],
      undefined,
      "Legacy UT-02 PATCH status endpoint must not be exposed",
    );
    assert.strictEqual(
      paths["/api/v1/hr/applications"],
      undefined,
      "Stray /api/v1/hr/applications endpoint must not be exposed",
    );
    assert.strictEqual(
      paths["/applications/{id}"],
      undefined,
      "Unprefixed /applications/{id} endpoint must not be exposed",
    );
    assert.strictEqual(
      paths["/api/v1/me/cvs"],
      undefined,
      "HS-04 /api/v1/me/cvs endpoint must not be exposed before HS-04",
    );
  });

  it("TC-T1-DOCS-04: Should exclude @Hidden TestErrorController (/api/v1/test/*) and legacy controllers from OpenAPI spec", async () => {
    assert.ok(backendOnline, "Backend service must be reachable");

    const specRes = await http.get(`${BACKEND_BASE_URL}/api/api-docs`, {
      timeoutMs: 8000,
    });
    assert.strictEqual(specRes.status, 200);
    const pathKeys = Object.keys(specRes.body?.paths || {});

    const testPaths = pathKeys.filter((p) => p.startsWith("/api/v1/test"));
    assert.deepStrictEqual(
      testPaths,
      [],
      `TestErrorController paths must be hidden from OpenAPI: ${testPaths.join(", ")}`,
    );

    for (const legacyPath of [
      "/api-docs",
      "/api-docs.yaml",
      "/api-docs/swagger-config",
      "/swagger-ui.html",
      "/swagger-ui/index.html",
    ]) {
      assert.strictEqual(
        specRes.body.paths?.[legacyPath],
        undefined,
        `Legacy hidden path ${legacyPath} must not appear in OpenAPI paths`,
      );
    }
  });

  it("TC-T1-DOCS-05: Should preserve legacy :8080 OpenAPI/Swagger routes and serve YAML specs", async () => {
    assert.ok(backendOnline, "Backend service must be reachable");
    assert.ok(frontendOnline, "Frontend Nginx proxy must be reachable");

    const legacyUiRedirect = await http.get(
      `${BACKEND_BASE_URL}/swagger-ui.html`,
      { redirect: "manual" },
    );
    assert.strictEqual(legacyUiRedirect.status, 302);
    assert.ok(
      (legacyUiRedirect.headers.get("location") || "").endsWith("/api/docs"),
    );

    const legacyUiFollowed = await http.get(
      `${BACKEND_BASE_URL}/swagger-ui.html`,
    );
    assert.strictEqual(legacyUiFollowed.status, 200);
    assert.ok(legacyUiFollowed.rawText.includes('id="swagger-ui"'));

    const legacyIndexRedirect = await http.get(
      `${BACKEND_BASE_URL}/swagger-ui/index.html`,
      { redirect: "manual" },
    );
    assert.strictEqual(legacyIndexRedirect.status, 302);
    assert.ok(
      (legacyIndexRedirect.headers.get("location") || "").endsWith(
        "/api/swagger-ui/index.html",
      ),
    );

    const legacyIndexFollowed = await http.get(
      `${BACKEND_BASE_URL}/swagger-ui/index.html`,
    );
    assert.strictEqual(legacyIndexFollowed.status, 200);
    assert.ok(legacyIndexFollowed.rawText.includes('id="swagger-ui"'));

    const legacyConfig = await http.get(
      `${BACKEND_BASE_URL}/api-docs/swagger-config`,
    );
    assert.strictEqual(legacyConfig.status, 200);
    assert.strictEqual(legacyConfig.body?.url, "/api/api-docs");

    for (const yamlUrl of [
      `${BACKEND_BASE_URL}/api-docs.yaml`,
      `${BACKEND_BASE_URL}/api/api-docs.yaml`,
      `${FRONTEND_BASE_URL}/api/api-docs.yaml`,
    ]) {
      const yamlRes = await http.get(yamlUrl, { timeoutMs: 8000 });
      assert.strictEqual(
        yamlRes.status,
        200,
        `Expected 200 for ${yamlUrl}, got ${yamlRes.status}`,
      );
      assert.ok(
        yamlRes.rawText.includes("openapi:"),
        `Expected OpenAPI YAML content at ${yamlUrl}`,
      );
    }
  });

  it("TC-T1-DOCS-06: Should allow hr1 with mustChangePassword=true to access /api/docs & /api/api-docs while blocking /api/v1/companies/me with 403 MUST_CHANGE_PASSWORD", async () => {
    assert.ok(backendOnline, "Backend service must be reachable");
    assert.ok(frontendOnline, "Frontend Nginx proxy must be reachable");

    // Never change hr1's password so subsequent DN-01 suites keep hr1 must_change_password=true
    const hr1Login = await loginUser(
      BACKEND_BASE_URL,
      "hr1@rikkeijobs.test",
      DEV_SEED_PASSWORD,
    );
    assert.strictEqual(
      hr1Login.mustChangePassword,
      true,
      "hr1 must have mustChangePassword=true",
    );
    const hr1Headers = authHeaders(hr1Login.token);

    for (const allowedUrl of [
      `${BACKEND_BASE_URL}/api/docs`,
      `${FRONTEND_BASE_URL}/api/docs`,
      `${BACKEND_BASE_URL}/api/api-docs`,
      `${FRONTEND_BASE_URL}/api/api-docs`,
      `${BACKEND_BASE_URL}/api-docs`,
    ]) {
      const res = await http.get(allowedUrl, {
        headers: hr1Headers,
        timeoutMs: 8000,
      });
      assert.strictEqual(
        res.status,
        200,
        `hr1 must be allowed on ${allowedUrl}, got ${res.status}`,
      );
    }

    const blockedMe = await http.get(
      `${BACKEND_BASE_URL}/api/v1/companies/me`,
      { headers: hr1Headers },
    );
    assert.strictEqual(blockedMe.status, 403);
    assertUnifiedErrorResponse(blockedMe);
    assert.strictEqual(blockedMe.body.code, "MUST_CHANGE_PASSWORD");
  });
});
