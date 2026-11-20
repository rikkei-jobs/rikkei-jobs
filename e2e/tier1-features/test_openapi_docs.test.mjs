// Tier 1: Feature Coverage — OpenAPI /api/docs, Swagger UI Assets & Legacy Routes
// Verifies /api/docs redirect and HTML rendering, Swagger UI CSS/JS/PNG/config assets on :8080 and :3000,
// full OpenAPI 25-path / 27-operation contract, @Hidden exclusion of TestErrorController, and hr1 allow-list

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
  ["/api/v1/evaluations/{id}", ["put"]],
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

  it("TC-T1-DOCS-03: Should expose identical OpenAPI 3 contract with bearerAuth and all 25 paths / 27 operations across :8080 and :3000", async () => {
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
      "OpenAPI paths must match all 25 merged module endpoints",
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
        }
      }
    }

    assert.strictEqual(
      totalOperations,
      29,
      `Expected 29 OpenAPI operations, got ${totalOperations}`,
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
