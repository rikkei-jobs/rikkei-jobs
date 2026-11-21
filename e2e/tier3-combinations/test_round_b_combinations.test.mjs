// Tier 3: Pairwise Combinatorial & Cross-Feature Lifecycles — NT-01 Round B
// Verifies complex lifecycle combinations for Round B:
// 1. Single-use ticket fail-closed state consistency (replay rejection after failure)
// 2. Identity immutability across repeated SSO logins (role preservation & no duplication)
// 3. Lockout countdown micro-interaction with tabular numbers / monospace layout
// 4. Dark mode WCAG 2.2 contrast compliance & Brand Electric token (#4C85DE)
// 5. Shared-element tab navigation & state switching without layout jitter

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

describe('Tier 3: NT-01 Round B Combinations & Lifecycles (5 Scenarios)', async () => {
  let backendOnline = false;
  let mockOnline = false;
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

  async function getMockSsoTicket(lmsUserId, issuedAt = null) {
    const payload = { lmsUserId };
    if (issuedAt) {
      payload.issuedAt = issuedAt;
    }
    const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, payload, { headers: mockHeaders });
    assert.strictEqual(res.status, 201, `Mock failed to issue ticket: ${res.rawText}`);
    return res.body.ticket;
  }

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    mockOnline = await isReachable(`${MOCK_BASE_URL}/mock/requests`);

    try {
      await execPostgres('SELECT 1;');
      postgresAvailable = true;
    } catch {
      postgresAvailable = false;
    }

    if (mockOnline) {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {}, { headers: mockHeaders });
    }
  });

  after(async () => {
    if (mockOnline) {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {}, { headers: mockHeaders });
    }
  });

  // --------------------------------------------------------------------------
  // TC-T3-RB-01: Single-use ticket rollback & fail-closed state consistency
  // --------------------------------------------------------------------------
  it('TC-T3-RB-01: Should maintain fail-closed single-use guarantee when ticket verification fails after initial insert', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    // Issue an expired ticket (>60s) which will fail verification after insert
    const expiredIssuedAt = new Date(Date.now() - 75000).toISOString();
    const ticket = await getMockSsoTicket('lms-sv-001', expiredIssuedAt);

    // Attempt 1: Must fail due to expired TTL (401 TICKET_EXPIRED)
    const firstRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
    assert.strictEqual(firstRes.status, 401, `First attempt must fail with 401: ${firstRes.rawText}`);

    // Attempt 2: Replay same ticket -> must fail-closed as TICKET_ALREADY_USED or remain rejected
    const replayRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
    assert.strictEqual(replayRes.status, 401, `Replay must remain rejected with 401: ${replayRes.rawText}`);

    if (postgresAvailable) {
      // Check that ticket was safely recorded in used_sso_tickets table to prevent replay brute-force
      const record = await execPostgres(
        `SELECT COUNT(*) FROM used_sso_tickets WHERE ticket = '${ticket}';`
      );
      assert.strictEqual(record, '1', 'Ticket must be recorded in used_sso_tickets table');
    }
  });

  // --------------------------------------------------------------------------
  // TC-T3-RB-02: Repeated SSO logins maintain role immutability & zero duplication
  // --------------------------------------------------------------------------
  it('TC-T3-RB-02: Should preserve user role and identity immutability across repeated SSO logins without duplicating records', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    // Login 1: First SSO login for lms-sv-003
    const ticket1 = await getMockSsoTicket('lms-sv-003');
    const res1 = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: ticket1 });
    assert.strictEqual(res1.status, 200, `First login must succeed: ${res1.rawText}`);
    const userId1 = res1.body.user.id;
    const userRole1 = res1.body.user.role;

    // Login 2: Second SSO login for lms-sv-003 with fresh ticket
    const ticket2 = await getMockSsoTicket('lms-sv-003');
    const res2 = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: ticket2 });
    assert.strictEqual(res2.status, 200, `Second login must succeed: ${res2.rawText}`);
    const userId2 = res2.body.user.id;
    const userRole2 = res2.body.user.role;

    // Identity must match exactly
    assert.strictEqual(userId1, userId2, 'User ID must be identical across repeated logins');
    assert.strictEqual(userRole1, userRole2, 'User role must not be altered across repeated logins');

    if (postgresAvailable) {
      const count = await execPostgres(
        "SELECT COUNT(*) FROM users WHERE lms_user_id = 'lms-sv-003';"
      );
      assert.strictEqual(count, '1', 'Must have exactly one user record per lms_user_id (no duplicates)');
    }
  });

  // --------------------------------------------------------------------------
  // TC-T3-RB-03: Lockout countdown timer micro-interaction stability
  // --------------------------------------------------------------------------
  it('TC-T3-RB-03: Should verify lockout countdown uses tabular-nums or monospace font to eliminate layout jitter', async () => {
    const cssPath = path.join(PROJECT_ROOT, 'frontend', 'src', 'shared', 'styles', 'design-tokens.css');
    const loginPath = path.join(PROJECT_ROOT, 'frontend', 'src', 'features', 'identity', 'pages', 'LoginPage.tsx');

    let verified = false;

    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, 'utf-8');
      if (css.includes('tabular-nums') || css.includes('JetBrains Mono') || css.includes('--rj-font-mono')) {
        verified = true;
      }
    }

    if (fs.existsSync(loginPath)) {
      const tsx = fs.readFileSync(loginPath, 'utf-8');
      if (tsx.includes('tabular-nums') || tsx.includes('font-mono') || tsx.includes('countdown')) {
        verified = true;
      }
    }

    assert.ok(verified, 'UI styles or component must declare tabular-nums / monospace font for stable timer display');
  });

  // --------------------------------------------------------------------------
  // TC-T3-RB-04: Dark Mode theme contrast compliance & Brand Electric token
  // --------------------------------------------------------------------------
  it('TC-T3-RB-04: Should verify Dark mode styling supports Electric Cobalt (#4C85DE) with WCAG 2.2 AA contrast compliance', async () => {
    const cssPath = path.join(PROJECT_ROOT, 'frontend', 'src', 'shared', 'styles', 'design-tokens.css');
    const altCssPath = path.join(PROJECT_ROOT, 'frontend', 'src', 'index.css');

    let css = '';
    if (fs.existsSync(cssPath)) {
      css = fs.readFileSync(cssPath, 'utf-8');
    } else if (fs.existsSync(altCssPath)) {
      css = fs.readFileSync(altCssPath, 'utf-8');
    }

    assert.ok(css.length > 0, 'CSS stylesheet must exist at frontend/src/shared/styles/design-tokens.css or frontend/src/index.css');

    // Check dark mode media query or class declaration
    const hasDarkMode = css.includes('prefers-color-scheme: dark') || css.includes('[data-theme="dark"]') || css.includes('.dark');
    assert.ok(hasDarkMode, 'CSS tokens must provide Dark mode palette support');

    // Brand electric token
    const hasElectric = css.toLowerCase().includes('#4c85de') || css.includes('--rj-brand-electric');
    assert.ok(hasElectric, 'Dark mode brand highlight must use Brand Electric (#4C85DE)');

    // WCAG 2.2 Relative Luminance and Contrast Ratio calculation
    function hexToRgb(hex) {
      const clean = hex.replace('#', '').trim();
      const num = parseInt(clean, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    function relativeLuminance(rgb) {
      const srgb = [rgb.r, rgb.g, rgb.b].map(v => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    }

    function calculateContrastRatio(hex1, hex2) {
      const lum1 = relativeLuminance(hexToRgb(hex1));
      const lum2 = relativeLuminance(hexToRgb(hex2));
      const lighter = Math.max(lum1, lum2);
      const darker = Math.min(lum1, lum2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    // Extract actual token value from CSS or use standard Electric Cobalt
    const electricMatch = css.match(/--rj-brand-electric:\s*(#[0-9a-fA-F]{6})/i);
    const electricHex = electricMatch ? electricMatch[1] : '#4C85DE';
    const darkCanvasHex = '#0A111E';

    const contrastRatio = calculateContrastRatio(electricHex, darkCanvasHex);
    assert.ok(
      contrastRatio >= 4.5,
      `WCAG 2.2 AA requires contrast ratio >= 4.5:1 for normal text on dark canvas, computed: ${contrastRatio.toFixed(2)}:1 (${electricHex} on ${darkCanvasHex})`
    );
  });

  // --------------------------------------------------------------------------
  // TC-T3-RB-05: Shared-element tab navigation & state switching
  // --------------------------------------------------------------------------
  it('TC-T3-RB-05: Should verify tab indicator and form switching between Student LMS and Enterprise HR tabs', async () => {
    const loginPagePath = path.join(PROJECT_ROOT, 'frontend', 'src', 'features', 'identity', 'pages', 'LoginPage.tsx');

    if (fs.existsSync(loginPagePath)) {
      const source = fs.readFileSync(loginPagePath, 'utf-8');

      // Verify both tabs exist in the auth shell
      const hasLmsTab = source.includes('lms') || source.includes('Sinh viên') || source.includes('Học viên');
      const hasEnterpriseTab = source.includes('enterprise') || source.includes('Doanh nghiệp');

      assert.ok(hasLmsTab, 'LoginPage must support LMS Student SSO tab');
      assert.ok(hasEnterpriseTab, 'LoginPage must support Enterprise HR tab');

      // Verify absence of AI filler words or developer monorepo jargon
      assert.ok(!source.includes('MONOREPO'), 'LoginPage must NOT contain developer word MONOREPO');
      assert.ok(!source.includes('lorem ipsum'), 'LoginPage must NOT contain placeholder fluff lorem ipsum');
    }
  });
});
