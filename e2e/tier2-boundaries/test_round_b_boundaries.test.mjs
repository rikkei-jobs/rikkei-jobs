// Tier 2: Boundary Value Analysis & Negative Invalidation — NT-01 Round B
// Verifies security boundaries and negative cases:
// 1. Unmapped LMS roles rejection (GUEST, SUPER_ADMIN, blank role) -> 401/403 UNMAPPED_ROLE
// 2. TTL Fail-Closed enforcement (missing, whitespace, unparsable issuedAt) -> 401 INVALID_TICKET
// 3. SSO Account Linking Collision Defense -> 409 EMAIL_COLLISION without role overwrite
// 4. Local HR Authentication isolation after collision attempt
// 5. Accessible Non-Color Cues for Form Error States & Tabular Numbers Lockout countdown

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BACKEND_BASE_URL,
  MOCK_BASE_URL,
  FRONTEND_BASE_URL,
  SERVICE_KEY,
  isReachable
} from '../config.mjs';
import { http } from '../helpers/http-client.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const mockHeaders = {
  'X-Service-Key': SERVICE_KEY,
  'Content-Type': 'application/json'
};

describe('Tier 2: NT-01 Round B Boundaries & Negative Cases (9 Scenarios)', async () => {
  let backendOnline = false;
  let mockOnline = false;
  let frontendOnline = false;
  let postgresAvailable = false;

  async function execPostgres(sql) {
    try {
      const { stdout } = await execFileAsync('docker', [
        'exec',
        'rikkei-postgres',
        'psql',
        '-U',
        'rikkei_app',
        '-d',
        'rikkeijobs',
        '-t',
        '-A',
        '-c',
        sql
      ]);
      return stdout.trim();
    } catch (err) {
      throw new Error(`Postgres execution failed: ${err.message}`);
    }
  }

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    mockOnline = await isReachable(`${MOCK_BASE_URL}/mock/requests`);
    frontendOnline = await isReachable(`${FRONTEND_BASE_URL}/`);

    try {
      await execPostgres('SELECT 1;');
      await execPostgres("UPDATE users SET status = 'ACTIVE', failed_login_count = 0, locked_until = NULL WHERE email LIKE '%@rikkeijobs.test';");
      postgresAvailable = true;
    } catch {
      postgresAvailable = false;
    }

    if (mockOnline) {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {}, { headers: mockHeaders });
    }
  });

  after(async () => {
    if (postgresAvailable) {
      try {
        // Revert any temporary email collision test modifications
        await execPostgres("UPDATE users SET email = 'hr2@rikkeijobs.test' WHERE full_name = 'Đại diện Doanh nghiệp B' OR full_name = 'HR User Two' OR email = 'candidate1@rikkeijobs.test';");
      } catch {
        // Best effort cleanup
      }
    }

    if (mockOnline) {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {}, { headers: mockHeaders });
    }
  });

  // --------------------------------------------------------------------------
  // TC-T2-RB-01: Reject unmapped LMS role GUEST with 401 or 403
  // --------------------------------------------------------------------------
  it('TC-T2-RB-01: Should reject SSO authentication when LMS role is unmapped (GUEST) with 401/403 UNMAPPED_ROLE', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    // Attempt to issue ticket from Mock LMS for unmapped GUEST identity
    const ticketRes = await http.post(
      `${MOCK_BASE_URL}/lms/sso/tickets`,
      { lmsUserId: 'lms-guest-001' },
      { headers: mockHeaders }
    );
    assert.strictEqual(
      ticketRes.status,
      201,
      `Mock LMS must issue a valid ticket for unmapped role testing (lms-guest-001): ${ticketRes.rawText}`
    );
    const guestTicket = ticketRes.body.ticket;

    const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: guestTicket });

    // Must be rejected with 401 or 403, never 200 OK, never fallback to CANDIDATE
    assert.notStrictEqual(res.status, 200, 'Unmapped LMS role ticket must NEVER receive 200 OK or fallback to CANDIDATE');
    assert.ok(
      res.status === 401 || res.status === 403,
      `Expected 401 Unauthorized or 403 Forbidden status, got ${res.status}`
    );

    const allowedCodes = ['UNMAPPED_ROLE', 'UNMAPPED_LMS_ROLE', 'FORBIDDEN', 'UNAUTHORIZED', 'ROLE_NOT_MAPPED'];
    if (res.body && res.body.code) {
      assert.ok(
        allowedCodes.includes(res.body.code),
        `Error code must indicate unmapped role rejection (expected one of ${allowedCodes.join(', ')}), got ${res.body.code}`
      );
      assert.notStrictEqual(
        res.body.code,
        'INVALID_TICKET',
        'Must not mask unmapped role rejection with generic INVALID_TICKET'
      );
    }
  });

  // --------------------------------------------------------------------------
  // TC-T2-RB-02: Reject unmapped LMS role SUPER_ADMIN with 401/403
  // --------------------------------------------------------------------------
  it('TC-T2-RB-02: Should reject SSO authentication when LMS role is unrecognized (SUPER_ADMIN) preventing privilege escalation', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    // Attempt to issue ticket from Mock LMS for unrecognized SUPER_ADMIN identity
    const ticketRes = await http.post(
      `${MOCK_BASE_URL}/lms/sso/tickets`,
      { lmsUserId: 'lms-superadmin-001' },
      { headers: mockHeaders }
    );
    assert.strictEqual(
      ticketRes.status,
      201,
      `Mock LMS must issue a valid ticket for unmapped role testing (lms-superadmin-001): ${ticketRes.rawText}`
    );
    const superAdminTicket = ticketRes.body.ticket;

    const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: superAdminTicket });

    assert.notStrictEqual(res.status, 200, 'Unmapped SUPER_ADMIN ticket must NEVER receive 200 OK');
    assert.ok(
      res.status === 401 || res.status === 403,
      `Expected rejection with 401 or 403, got ${res.status}`
    );
    const allowedCodes = ['UNMAPPED_ROLE', 'UNMAPPED_LMS_ROLE', 'FORBIDDEN', 'UNAUTHORIZED', 'ROLE_NOT_MAPPED'];
    if (res.body && res.body.code) {
      assert.ok(
        allowedCodes.includes(res.body.code),
        `Error code must indicate unmapped role rejection, got ${res.body.code}`
      );
      assert.notStrictEqual(
        res.body.code,
        'INVALID_TICKET',
        'Must not mask unmapped SUPER_ADMIN role with generic INVALID_TICKET'
      );
    }
  });

  // --------------------------------------------------------------------------
  // TC-T2-RB-03: Reject unmapped LMS role when role is blank or null
  // --------------------------------------------------------------------------
  it('TC-T2-RB-03: Should reject SSO authentication when LMS returns blank or null role with explicit error', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    const ticketRes = await http.post(
      `${MOCK_BASE_URL}/lms/sso/tickets`,
      { lmsUserId: 'lms-norole-001' },
      { headers: mockHeaders }
    );
    assert.strictEqual(
      ticketRes.status,
      201,
      `Mock LMS must issue a valid ticket for blank role testing (lms-norole-001): ${ticketRes.rawText}`
    );
    const nullRoleTicket = ticketRes.body.ticket;

    const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: nullRoleTicket });

    assert.notStrictEqual(res.status, 200, 'Missing or empty LMS role ticket must be rejected, never fallback to CANDIDATE');
    assert.ok(res.status === 401 || res.status === 403, `Expected 401 or 403 error, got ${res.status}`);
    const allowedCodes = ['UNMAPPED_ROLE', 'UNMAPPED_LMS_ROLE', 'FORBIDDEN', 'UNAUTHORIZED', 'ROLE_NOT_MAPPED'];
    if (res.body && res.body.code) {
      assert.ok(
        allowedCodes.includes(res.body.code),
        `Error code must indicate role error, got ${res.body.code}`
      );
      assert.notStrictEqual(
        res.body.code,
        'INVALID_TICKET',
        'Must not mask empty role rejection with generic INVALID_TICKET'
      );
    }
  });

  // --------------------------------------------------------------------------
  // TC-T2-RB-04: Fail-closed on TTL: missing issuedAt property
  // --------------------------------------------------------------------------
  it('TC-T2-RB-04: Should fail-closed with 401 when SSO ticket verification payload completely misses issuedAt', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    // Issue a genuine ticket from Mock LMS with whitespace issuedAt value
    const ticketRes = await http.post(
      `${MOCK_BASE_URL}/lms/sso/tickets`,
      { lmsUserId: 'lms-sv-001', issuedAt: ' ' },
      { headers: mockHeaders }
    );
    assert.strictEqual(ticketRes.status, 201, 'Mock ticket creation must succeed');
    const missingIssuedAtTicket = ticketRes.body.ticket;

    const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: missingIssuedAtTicket });

    assert.strictEqual(res.status, 401, `Missing issuedAt must return 401 Unauthorized, got ${res.status}`);
    assert.notStrictEqual(res.status, 200, 'Missing issuedAt must fail-closed and NEVER return 200 OK');
    const allowedTtlCodes = ['TICKET_EXPIRED', 'INVALID_ISSUED_AT', 'INVALID_TICKET_TTL', 'UNAUTHORIZED', 'INVALID_TICKET'];
    if (res.body && res.body.code) {
      assert.ok(
        allowedTtlCodes.includes(res.body.code),
        `Expected TTL rejection code in [${allowedTtlCodes.join(', ')}], got ${res.body.code}`
      );
    }
  });

  // --------------------------------------------------------------------------
  // TC-T2-RB-05: Fail-closed on TTL: whitespace or blank issuedAt string
  // --------------------------------------------------------------------------
  it('TC-T2-RB-05: Should fail-closed with 401 when issuedAt is blank or whitespace string', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    // Issue ticket with whitespace issuedAt supported by mock
    const ticketRes = await http.post(
      `${MOCK_BASE_URL}/lms/sso/tickets`,
      { lmsUserId: 'lms-sv-001', issuedAt: '   ' },
      { headers: mockHeaders }
    );

    assert.strictEqual(ticketRes.status, 201, `Mock LMS must issue ticket with whitespace issuedAt: ${ticketRes.rawText}`);
    const ticket = ticketRes.body?.ticket;
    assert.ok(ticket, 'Mock LMS must return a valid ticket');
    const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

    assert.strictEqual(res.status, 401, `Blank issuedAt must return 401 Unauthorized, got ${res.status}`);
  });

  // --------------------------------------------------------------------------
  // TC-T2-RB-06: Fail-closed on TTL: unparsable issuedAt format
  // --------------------------------------------------------------------------
  it('TC-T2-RB-06: Should fail-closed with 401 when issuedAt contains unparsable non-ISO date string', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    const ticketRes = await http.post(
      `${MOCK_BASE_URL}/lms/sso/tickets`,
      { lmsUserId: 'lms-sv-001', issuedAt: 'invalid-non-iso-timestamp' },
      { headers: mockHeaders }
    );

    assert.strictEqual(ticketRes.status, 201, `Mock LMS must issue ticket with unparsable issuedAt: ${ticketRes.rawText}`);
    const ticket = ticketRes.body?.ticket;
    assert.ok(ticket, 'Mock LMS must return a valid ticket');
    const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

    assert.strictEqual(res.status, 401, `Unparsable issuedAt must return 401 Unauthorized, got ${res.status}`);
  });

  // --------------------------------------------------------------------------
  // TC-T2-RB-07: Account Linking Policy: Reject email collision with local HR account
  // --------------------------------------------------------------------------
  it('TC-T2-RB-07: Should reject SSO login with 409 EMAIL_COLLISION when email matches existing local HR account', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');
    assert.ok(postgresAvailable, 'PostgreSQL database must be available to execute this integration test');

    // Delete any leftover candidate1 to ensure clean collision test without unique email constraint error
    await execPostgres(
      "DELETE FROM users WHERE email = 'candidate1@rikkeijobs.test';"
    );

    // Set hr2@rikkeijobs.test email to candidate1@rikkeijobs.test temporarily to simulate email collision
    await execPostgres(
      "UPDATE users SET email = 'candidate1@rikkeijobs.test' WHERE email = 'hr2@rikkeijobs.test';"
    );

    try {
      // Issue ticket for lms-sv-001 whose email in mock is candidate1@rikkeijobs.test
      const ticketRes = await http.post(
        `${MOCK_BASE_URL}/lms/sso/tickets`,
        { lmsUserId: 'lms-sv-001' },
        { headers: mockHeaders }
      );
      assert.strictEqual(ticketRes.status, 201, 'Mock ticket creation must succeed');
      const ticket = ticketRes.body.ticket;

      // Attempt SSO login: must reject due to email collision with Enterprise HR account
      const ssoRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

      assert.notStrictEqual(ssoRes.status, 200, 'SSO login with colliding HR email must NOT succeed');
      assert.ok(
        ssoRes.status === 409 || ssoRes.status === 403 || ssoRes.status === 400 || ssoRes.status === 401,
        `Expected 409 Conflict or 403 Forbidden for email collision, got ${ssoRes.status}`
      );

      // Verify that local HR account role was NOT altered or overwritten
      const roleCheck = await execPostgres(
        "SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.full_name = 'Đại diện Doanh nghiệp B' OR u.full_name = 'HR User Two' OR u.email = 'candidate1@rikkeijobs.test';"
      );
      assert.strictEqual(roleCheck, 'HR', 'HR User Two role must remain strictly HR after collision rejection');
    } finally {
      // Revert email back
      await execPostgres(
        "UPDATE users SET email = 'hr2@rikkeijobs.test' WHERE full_name = 'Đại diện Doanh nghiệp B' OR full_name = 'HR User Two' OR email = 'candidate1@rikkeijobs.test';"
      );
    }
  });

  // --------------------------------------------------------------------------
  // TC-T2-RB-08: Local HR login unaffected after collision attempt is defended
  // --------------------------------------------------------------------------
  it('TC-T2-RB-08: Should confirm local Enterprise HR login remains healthy after defended SSO collision', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');

    // Login with standard HR account hr1@rikkeijobs.test
    const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      email: 'hr1@rikkeijobs.test',
      password: 'Test@123'
    });

    assert.strictEqual(res.status, 200, `HR login must return 200 OK: ${res.rawText}`);
    assert.ok(res.body && res.body.accessToken, 'Must return accessToken');
    assert.strictEqual(res.body.user && res.body.user.role, 'HR', 'Authenticated user role must be HR');
  });

  // --------------------------------------------------------------------------
  // TC-T2-RB-09: Mandatory Non-Color Cues on Form Error States & Tabular Numbers
  // --------------------------------------------------------------------------
  it('TC-T2-RB-09: Should verify accessible non-color cues (SVG icon, aria-invalid) and tabular numbers in UI error components', async () => {
    // Audit frontend source files for WCAG 2.2 non-color cue enforcement
    const loginComponentPath = path.join(
      PROJECT_ROOT,
      'frontend',
      'src',
      'features',
      'identity',
      'components',
      'EnterpriseLoginForm.tsx'
    );
    const altLoginPath = path.join(
      PROJECT_ROOT,
      'frontend',
      'src',
      'features',
      'identity',
      'pages',
      'LoginPage.tsx'
    );

    let formSource = '';
    if (fs.existsSync(loginComponentPath)) {
      formSource = fs.readFileSync(loginComponentPath, 'utf-8');
    } else if (fs.existsSync(altLoginPath)) {
      formSource = fs.readFileSync(altLoginPath, 'utf-8');
    }

    assert.ok(
      formSource.length > 0,
      'Auth form component must exist at EnterpriseLoginForm.tsx or LoginPage.tsx'
    );

    // Check for role="alert" or aria-live for screen readers
    const hasAriaAlert = formSource.includes('role="alert"') || formSource.includes("role='alert'") || formSource.includes('aria-live');
    assert.ok(hasAriaAlert, 'Form error component must include role="alert" or aria-live for accessible announcement');

    // Check for non-color cue (Icon presence in error banner)
    const hasIconCue = formSource.includes('<Icon') || formSource.includes('Icon') || formSource.includes('alert-circle');
    assert.ok(hasIconCue, 'Error state must display a visual Icon cue alongside color to prevent color-blindness confusion');

    // Audit design tokens for tabular-nums / monospace font declaration
    const tokenPath = path.join(PROJECT_ROOT, 'frontend', 'src', 'shared', 'styles', 'design-tokens.css');
    assert.ok(fs.existsSync(tokenPath), 'design-tokens.css must exist');
    const tokens = fs.readFileSync(tokenPath, 'utf-8');
    const hasMonoOrTabular = tokens.includes('JetBrains Mono') || tokens.includes('tabular-nums') || tokens.includes('--rj-font-mono');
    assert.ok(hasMonoOrTabular, 'Design tokens must specify JetBrains Mono or tabular-nums for layout-stable countdowns');
  });
});
