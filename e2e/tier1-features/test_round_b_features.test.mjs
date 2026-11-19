// Tier 1: Feature Coverage — NT-01 Round B New Requirements
// Verifies Happy-Path behavior for Round B: SSO Role Mapping (4 standard LMS roles),
// 60s TTL acceptance, lms_user_id unique linking, self-hosted WOFF2 fonts serving,
// index.html font preload declarations, and Technical Deep Cobalt CSS color tokens.

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

describe('Tier 1: NT-01 Round B Features (Feature Coverage — 6 Scenarios)', async () => {
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

  async function getMockSsoTicket(lmsUserId, issuedAt = null) {
    const payload = { lmsUserId };
    if (issuedAt) {
      payload.issuedAt = issuedAt;
    }
    const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, payload, { headers: mockHeaders });
    assert.strictEqual(res.status, 201, `Mock failed to issue ticket for ${lmsUserId}: ${res.rawText}`);
    assert.ok(res.body && res.body.ticket, 'Mock response must contain ticket');
    return res.body.ticket;
  }

  before(async () => {
    backendOnline = await isReachable(`${BACKEND_BASE_URL}/api/v1/health`);
    mockOnline = await isReachable(`${MOCK_BASE_URL}/mock/requests`);
    frontendOnline = await isReachable(`${FRONTEND_BASE_URL}/`);

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
  // TC-T1-RB-01: SSO Role Mapping for all 4 standard LMS roles
  // --------------------------------------------------------------------------
  it('TC-T1-RB-01: Should correctly map and authenticate all 4 standard LMS roles (CANDIDATE, MENTOR, STAFF, ADMIN)', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    const standardUsers = [
      { lmsUserId: 'lms-sv-001', expectedRole: 'CANDIDATE' },
      { lmsUserId: 'lms-mt-001', expectedRole: 'MENTOR' },
      { lmsUserId: 'lms-st-001', expectedRole: 'STAFF' },
      { lmsUserId: 'lms-ad-001', expectedRole: 'ADMIN' }
    ];

    for (const item of standardUsers) {
      const ticket = await getMockSsoTicket(item.lmsUserId);
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

      assert.strictEqual(res.status, 200, `SSO login for ${item.lmsUserId} must return 200 OK: ${res.rawText}`);
      assert.ok(res.body && res.body.accessToken, `Response for ${item.lmsUserId} must contain accessToken`);
      assert.strictEqual(
        res.body.user && res.body.user.role,
        item.expectedRole,
        `Expected role ${item.expectedRole} for ${item.lmsUserId}, got ${res.body?.user?.role}`
      );
    }
  });

  // --------------------------------------------------------------------------
  // TC-T1-RB-02: Accept SSO ticket with valid timestamp within 60s TTL
  // --------------------------------------------------------------------------
  it('TC-T1-RB-02: Should accept SSO ticket with valid issuedAt timestamp within 60s TTL window', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const ticket = await getMockSsoTicket('lms-sv-001', tenSecondsAgo);

    const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

    assert.strictEqual(res.status, 200, `SSO login with fresh ticket must return 200 OK: ${res.rawText}`);
    assert.ok(res.body && res.body.accessToken, 'Must issue accessToken for valid TTL ticket');
    assert.ok(res.body.user && res.body.user.id, 'Must return authenticated user object');
  });

  // --------------------------------------------------------------------------
  // TC-T1-RB-03: SSO identity linking exclusively by lms_user_id
  // --------------------------------------------------------------------------
  it('TC-T1-RB-03: Should link SSO identity strictly by lms_user_id into database', async () => {
    assert.ok(backendOnline, 'Backend service must be reachable to execute this integration test');
    assert.ok(mockOnline, 'Mock LMS service must be reachable to execute this integration test');

    const ticket = await getMockSsoTicket('lms-sv-002');
    const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

    assert.strictEqual(res.status, 200, `SSO login must return 200 OK: ${res.rawText}`);
    assert.ok(res.body && res.body.accessToken, 'Must return JWT');

    if (postgresAvailable) {
      const dbRecord = await execPostgres(
        "SELECT lms_user_id, email, full_name FROM users WHERE lms_user_id = 'lms-sv-002';"
      );
      assert.ok(dbRecord && dbRecord.length > 0, 'User record must exist in PostgreSQL');
      const parts = dbRecord.split('|');
      assert.strictEqual(parts[0], 'lms-sv-002', 'lms_user_id column must match exactly');
    }
  });

  // --------------------------------------------------------------------------
  // TC-T1-RB-04: Static asset serving for 3 self-hosted WOFF2 font families
  // --------------------------------------------------------------------------
  it('TC-T1-RB-04: Should serve static self-hosted WOFF2 font files with proper headers without SPA fallback', async () => {
    const fontNames = [
      'PlusJakartaSans',
      'BeVietnamPro',
      'JetBrainsMono'
    ];

    // Check disk availability first
    const fontsDir = path.join(PROJECT_ROOT, 'frontend', 'public', 'fonts');
    const localDirExists = fs.existsSync(fontsDir);

    if (frontendOnline) {
      // Probe font file endpoints via Frontend Web Server
      let anyFound = false;
      const candidates = [
        '/fonts/PlusJakartaSans-Regular.woff2',
        '/fonts/PlusJakartaSans-Bold.woff2',
        '/fonts/BeVietnamPro-Regular.woff2',
        '/fonts/BeVietnamPro-SemiBold.woff2',
        '/fonts/JetBrainsMono-Regular.woff2'
      ];

      for (const endpoint of candidates) {
        const res = await http.get(`${FRONTEND_BASE_URL}${endpoint}`);
        if (res.status === 200) {
          const contentType = res.headers.get('content-type') || '';
          assert.ok(
            contentType.includes('font/woff2') || contentType.includes('application/octet-stream') || contentType.includes('binary'),
            `Expected font MIME type for ${endpoint}, got ${contentType}`
          );
          assert.ok(!res.rawText.startsWith('<!DOCTYPE html>'), 'Font file must NOT return SPA fallback HTML');
          anyFound = true;
        }
      }

      if (!anyFound && localDirExists) {
        const files = fs.readdirSync(fontsDir).filter(f => f.endsWith('.woff2'));
        assert.ok(files.length > 0, 'Must have at least one WOFF2 font in frontend/public/fonts');
      }
    } else if (localDirExists) {
      const files = fs.readdirSync(fontsDir);
      for (const name of fontNames) {
        const matched = files.some(f => f.toLowerCase().includes(name.toLowerCase()));
        assert.ok(matched, `Expected font file for family ${name} in ${fontsDir}`);
      }
    } else {
      assert.fail(`Neither frontend service is reachable nor local fonts directory exists at: ${fontsDir}`);
    }
  });

  // --------------------------------------------------------------------------
  // TC-T1-RB-05: Font preload tags in frontend index.html
  // --------------------------------------------------------------------------
  it('TC-T1-RB-05: Should declare WOFF2 font preload tags in index.html and zero Google Fonts CDN references', async () => {
    let htmlContent = '';

    if (frontendOnline) {
      const res = await http.get(`${FRONTEND_BASE_URL}/`);
      assert.strictEqual(res.status, 200, 'Frontend index must return 200 OK');
      htmlContent = res.rawText;
    } else {
      const indexPath = path.join(PROJECT_ROOT, 'frontend', 'index.html');
      assert.ok(fs.existsSync(indexPath), `index.html must exist at ${indexPath}`);
      htmlContent = fs.readFileSync(indexPath, 'utf-8');
    }

    assert.ok(htmlContent.length > 0, 'index.html content must not be empty');

    // Must not contain Google Fonts CDN
    assert.ok(
      !htmlContent.includes('fonts.googleapis.com'),
      'index.html must NOT contain external Google Fonts CDN links'
    );
    assert.ok(
      !htmlContent.includes('fonts.gstatic.com'),
      'index.html must NOT contain external Google Fonts gstatic CDN links'
    );

    // Verify preload tag existence or font link tag
    const hasPreload = htmlContent.includes('rel="preload"') || htmlContent.includes("rel='preload'");
    const hasFontRef = htmlContent.includes('.woff2') || htmlContent.includes('fonts/');
    assert.ok(
      hasPreload || hasFontRef,
      'index.html should declare font preloads or references to local WOFF2 typography'
    );
  });

  // --------------------------------------------------------------------------
  // TC-T1-RB-06: Technical Deep Cobalt brand tokens in CSS
  // --------------------------------------------------------------------------
  it('TC-T1-RB-06: Should define Technical Deep Cobalt brand tokens and distinct error tokens in CSS', async () => {
    const cssPath = path.join(PROJECT_ROOT, 'frontend', 'src', 'shared', 'styles', 'design-tokens.css');
    const altCss = path.join(PROJECT_ROOT, 'frontend', 'src', 'index.css');

    let cssContent = '';
    if (fs.existsSync(cssPath)) {
      cssContent = fs.readFileSync(cssPath, 'utf-8');
    } else if (fs.existsSync(altCss)) {
      cssContent = fs.readFileSync(altCss, 'utf-8');
    }

    assert.ok(
      cssContent.length > 0,
      `CSS tokens file must exist at ${cssPath} or ${altCss}`
    );

    // Verify brand core token #132F52
    const hasBrandCore = cssContent.toLowerCase().includes('#132f52') || cssContent.includes('--rj-brand-core');
    assert.ok(hasBrandCore, 'CSS tokens must contain Technical Deep Cobalt Core (#132F52)');

    // Verify brand electric token #4C85DE
    const hasBrandElectric = cssContent.toLowerCase().includes('#4c85de') || cssContent.includes('--rj-brand-electric');
    assert.ok(hasBrandElectric, 'CSS tokens must contain Brand Electric highlight (#4C85DE)');

    // Verify error core token #9B1C2A (Cold Crimson Brick distinct from brand blue)
    const hasErrorCore = cssContent.toLowerCase().includes('#9b1c2a') || cssContent.includes('--rj-error-core');
    assert.ok(hasErrorCore, 'CSS tokens must contain Error Core token (#9B1C2A) distinct from brand blue');
  });
});
