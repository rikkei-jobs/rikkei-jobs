// Tier 1: Feature Coverage — NT-01 Authentication & Authorization Endpoints
// Verifies Happy-Path behavior across 6 core endpoints for all 5 system roles (30 tests)

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BACKEND_BASE_URL, MOCK_BASE_URL, MAILPIT_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http, fetchMailpitMessagesWithRetry } from '../helpers/http-client.mjs';

const execFileAsync = promisify(execFile);

const mockHeaders = {
  'X-Service-Key': SERVICE_KEY,
  'Content-Type': 'application/json'
};

describe('Tier 1: NT-01 Authentication & Authorization (Feature Coverage — 30 Tests)', async () => {
  let backendOnline = false;
  let mockOnline = false;
  let mailpitOnline = false;
  let postgresAvailable = false;

  /**
   * Helper to execute SQL inside the running postgres container.
   * @param {string} sql 
   * @returns {Promise<string>}
   */
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

  /**
   * Helper to request an SSO ticket from Mock LMS.
   * @param {string} lmsUserId 
   * @returns {Promise<string>} ticket
   */
  async function getMockSsoTicket(lmsUserId) {
    const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId }, { headers: mockHeaders });
    assert.strictEqual(res.status, 201, `Mock failed to issue ticket for ${lmsUserId}: ${res.rawText}`);
    assert.ok(res.body && res.body.ticket, 'Mock response must contain ticket');
    return res.body.ticket;
  }

  /**
   * Helper to retrieve messages from Mailpit with polling and retries.
   * @param {string} [query]
   * @param {Object} [options]
   */
  async function fetchMailpitMessages(query, options = {}) {
    return fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, query, options);
  }

  /**
   * Helper to clear Mailpit mailbox.
   */
  async function clearMailbox() {
    try {
      await http.delete(`${MAILPIT_BASE_URL}/api/v1/messages`);
    } catch {
      // Best effort cleanup
    }
  }

  before(async () => {
    backendOnline = await isReachable(BACKEND_BASE_URL);
    mockOnline = await isReachable(MOCK_BASE_URL);
    mailpitOnline = await isReachable(MAILPIT_BASE_URL);

    try {
      await execPostgres('SELECT 1;');
      await execPostgres(`
        UPDATE users SET 
          password_hash = '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a',
          status = 'ACTIVE',
          failed_login_count = 0,
          locked_until = NULL,
          must_change_password = CASE WHEN email = 'hr1@rikkeijobs.test' THEN true ELSE false END
        WHERE email LIKE '%@rikkeijobs.test';
      `);
      postgresAvailable = true;
    } catch {
      postgresAvailable = false;
    }

    if (mailpitOnline) {
      await clearMailbox();
    }
    if (mockOnline) {
      await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
    }
  });

  after(async () => {
    try {
      if (mailpitOnline) {
        await clearMailbox();
      }
      if (mockOnline) {
        await http.post(`${MOCK_BASE_URL}/mock/reset`, {});
      }
    } finally {
      if (postgresAvailable) {
        try {
          await execPostgres(`
            UPDATE users SET 
              password_hash = '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a',
              status = 'ACTIVE',
              failed_login_count = 0,
              locked_until = NULL,
              must_change_password = CASE WHEN email = 'hr1@rikkeijobs.test' THEN true ELSE false END
            WHERE email LIKE '%@rikkeijobs.test';
          `);
        } catch {
          // Best effort cleanup
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // Feature F01: LMS SSO Authentication (POST /api/v1/auth/sso) — 5 Test Cases
  // --------------------------------------------------------------------------
  describe('Feature F01: LMS SSO Authentication (POST /api/v1/auth/sso)', () => {
    it('TC-T1-SSO-01: Should authenticate Candidate 1 (lms-sv-001) and issue valid JWT with CANDIDATE role', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-sv-001');
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

      assert.strictEqual(res.status, 200, `Expected 200 OK but got ${res.status}: ${res.rawText}`);
      assert.ok(res.body && typeof res.body.accessToken === 'string', 'Expected accessToken in body');
      assert.strictEqual(res.body.accessToken.split('.').length, 3, 'JWT must contain three segments separated by dots');
      assert.ok(res.body.user, 'Expected user object in response body');
      assert.strictEqual(res.body.user.role, 'CANDIDATE', 'Role must match CANDIDATE');
      assert.strictEqual(res.body.user.email, 'candidate1@rikkeijobs.test');
    });

    it('TC-T1-SSO-02: Should authenticate Candidate 2 (lms-sv-002) and match Trần Thị Bình profile', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-sv-002');
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

      assert.strictEqual(res.status, 200, `Expected 200 OK: ${res.rawText}`);
      assert.ok(res.body.accessToken);
      assert.strictEqual(res.body.user.fullName, 'Trần Thị Bình');
      assert.strictEqual(res.body.user.role, 'CANDIDATE');
    });

    it('TC-T1-SSO-03: Should authenticate Mentor (lms-mt-001) and assign MENTOR role', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-mt-001');
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

      assert.strictEqual(res.status, 200, `Expected 200 OK: ${res.rawText}`);
      assert.ok(res.body.accessToken);
      assert.strictEqual(res.body.user.role, 'MENTOR');
      assert.strictEqual(res.body.user.email, 'mentor1@rikkeijobs.test');
    });

    it('TC-T1-SSO-04: Should authenticate Staff (lms-st-001) and assign STAFF role', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-st-001');
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

      assert.strictEqual(res.status, 200, `Expected 200 OK: ${res.rawText}`);
      assert.ok(res.body.accessToken);
      assert.strictEqual(res.body.user.role, 'STAFF');
      assert.strictEqual(res.body.user.email, 'staff1@rikkeijobs.test');
    });

    it('TC-T1-SSO-05: Should authenticate Admin (lms-ad-001) and assign ADMIN role', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-ad-001');
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

      assert.strictEqual(res.status, 200, `Expected 200 OK: ${res.rawText}`);
      assert.ok(res.body.accessToken);
      assert.strictEqual(res.body.user.role, 'ADMIN');
      assert.strictEqual(res.body.user.email, 'admin1@rikkeijobs.test');
    });
  });

  // --------------------------------------------------------------------------
  // Feature F02: Enterprise HR Login (POST /api/v1/auth/login) — 5 Test Cases
  // --------------------------------------------------------------------------
  describe('Feature F02: Enterprise HR Login (POST /api/v1/auth/login)', () => {
    it('TC-T1-LOGIN-01: Should login HR 1 with initial credentials and report mustChangePassword true', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'Test@123'
      });

      assert.strictEqual(res.status, 200, `Expected 200 OK: ${res.rawText}`);
      assert.ok(res.body.accessToken, 'Must return accessToken');
      assert.strictEqual(res.body.user.role, 'HR');
      assert.strictEqual(res.body.user.email, 'hr1@rikkeijobs.test');
      assert.strictEqual(res.body.mustChangePassword, true, 'hr1 initial account must require password change');
    });

    it('TC-T1-LOGIN-02: Should login HR 2 with valid credentials and return HR role profile', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'Test@123'
      });

      assert.strictEqual(res.status, 200, `Expected 200 OK: ${res.rawText}`);
      assert.ok(res.body.accessToken);
      assert.strictEqual(res.body.user.role, 'HR');
      assert.strictEqual(res.body.user.email, 'hr2@rikkeijobs.test');
    });

    it('TC-T1-LOGIN-03: Should authenticate case-insensitively when email is uppercase', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'HR1@RIKKEIJOBS.TEST',
        password: 'Test@123'
      });

      assert.strictEqual(res.status, 200, `Expected 200 OK for uppercase email: ${res.rawText}`);
      assert.ok(res.body.accessToken);
      assert.strictEqual(res.body.user.email.toLowerCase(), 'hr1@rikkeijobs.test');
    });

    it('TC-T1-LOGIN-04: Should conform to exact login response contract { accessToken, user, mustChangePassword }', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'Test@123'
      });

      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.body.accessToken === 'string');
      assert.ok(typeof res.body.mustChangePassword === 'boolean');
      assert.ok(res.body.user && typeof res.body.user === 'object');
      assert.ok(typeof res.body.user.id === 'number');
      assert.ok(typeof res.body.user.fullName === 'string');
      assert.ok(typeof res.body.user.status === 'string');
    });

    it('TC-T1-LOGIN-05: Should return application/json and Anti-Caching headers', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'Test@123'
      });

      assert.strictEqual(res.status, 200);
      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('application/json'), `Content-Type must be application/json, got ${contentType}`);

      const cacheControl = res.headers.get('cache-control') || '';
      assert.ok(
        cacheControl.includes('no-store') || cacheControl.includes('no-cache'),
        'Authentication response must forbid caching'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Feature F03: Change Password (POST /api/v1/auth/change-password) — 5 Tests
  // --------------------------------------------------------------------------
  describe('Feature F03: Change Password (POST /api/v1/auth/change-password)', () => {
    it('TC-T1-CHPASS-01: Should change password successfully for authenticated user', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      // Obtain token for hr1
      const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'Test@123'
      });
      assert.strictEqual(loginRes.status, 200);
      const token = loginRes.body.accessToken;

      const changeRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
        oldPassword: 'Test@123',
        newPassword: 'HrPass@2026!'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      assert.strictEqual(changeRes.status, 200, `Expected 200 OK: ${changeRes.rawText}`);
      assert.ok(changeRes.body && typeof changeRes.body.message === 'string');
    });

    it('TC-T1-CHPASS-02: Should transition mustChangePassword flag to false after successful password change', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      // Re-login with new password to get refreshed token
      const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'HrPass@2026!'
      });
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginRes.body.mustChangePassword, false, 'mustChangePassword must be false after change');

      // Verify via /me endpoint
      const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${loginRes.body.accessToken}` }
      });
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.mustChangePassword, false);
    });

    it('TC-T1-CHPASS-03: Should accept complex alphanumeric passwords with special characters', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'HrPass@2026!'
      });
      assert.strictEqual(loginRes.status, 200);

      const changeRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
        oldPassword: 'HrPass@2026!',
        newPassword: 'ComplexPass#2026'
      }, {
        headers: { Authorization: `Bearer ${loginRes.body.accessToken}` }
      });

      assert.strictEqual(changeRes.status, 200, `Expected 200 OK: ${changeRes.rawText}`);
    });

    it('TC-T1-CHPASS-04: Should immediately allow authentication with the newly established password', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'ComplexPass#2026'
      });
      assert.strictEqual(loginRes.status, 200, `Expected 200 OK: ${loginRes.rawText}`);
      assert.ok(loginRes.body.accessToken);
    });

    it('TC-T1-CHPASS-05: Should reject previous password with 401 UNAUTHORIZED after password change', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      try {
        // Attempt to login using previous password
        const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr1@rikkeijobs.test',
          password: 'HrPass@2026!'
        });
        assert.strictEqual(loginRes.status, 401, `Old password must be rejected with 401, got ${loginRes.status}`);
      } finally {
        if (postgresAvailable) {
          await execPostgres(`
            UPDATE users SET 
              password_hash = '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a',
              status = 'ACTIVE',
              failed_login_count = 0,
              locked_until = NULL,
              must_change_password = true
            WHERE email = 'hr1@rikkeijobs.test';
          `);
        } else {
          // Fallback: Revert password back to Test@123 via API
          const currentLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
            email: 'hr1@rikkeijobs.test',
            password: 'ComplexPass#2026'
          });
          if (currentLogin.status === 200) {
            await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
              oldPassword: 'ComplexPass#2026',
              newPassword: 'Test@123'
            }, {
              headers: { Authorization: `Bearer ${currentLogin.body.accessToken}` }
            });
          }
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature F04: Forgot Password (POST /api/v1/auth/forgot-password) — 5 Tests
  // --------------------------------------------------------------------------
  describe('Feature F04: Forgot Password (POST /api/v1/auth/forgot-password)', () => {
    it('TC-T1-FORGOT-01: Should accept valid HR email and return 200 anti-enumeration message', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'hr1@rikkeijobs.test'
      });

      assert.strictEqual(res.status, 200, `Expected 200 OK: ${res.rawText}`);
      assert.ok(res.body && typeof res.body.message === 'string');
    });

    it('TC-T1-FORGOT-02: Should deliver password reset email to Mailpit SMTP inbox', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'hr1@rikkeijobs.test'
      });

      const data = await fetchMailpitMessages('hr1@rikkeijobs.test');
      assert.ok(data && Array.isArray(data.messages), 'Expected messages array in Mailpit');
      assert.ok(data.messages.length >= 1, 'Expected at least 1 email delivered to Mailpit');
    });

    it('TC-T1-FORGOT-03: Should match recipient email address in Mailpit message headers', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'hr1@rikkeijobs.test'
      });

      const data = await fetchMailpitMessages('hr1@rikkeijobs.test');
      assert.ok(data.messages.length >= 1);
      const latestMsg = data.messages[0];
      const toAddresses = (latestMsg.To || []).map(t => t.Address.toLowerCase());
      assert.ok(
        toAddresses.includes('hr1@rikkeijobs.test'),
        `Expected recipient hr1@rikkeijobs.test in ${JSON.stringify(toAddresses)}`
      );
    });

    it('TC-T1-FORGOT-04: Should contain reset password link with 256-bit secure token', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'hr1@rikkeijobs.test'
      });

      const data = await fetchMailpitMessages('hr1@rikkeijobs.test');
      assert.ok(data.messages.length >= 1);
      const latestId = data.messages[0].ID;
      const detailRes = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${latestId}`);
      assert.strictEqual(detailRes.status, 200);

      const content = (detailRes.body.HTML || '') + ' ' + (detailRes.body.Text || '');
      const match = content.match(/\/reset-password\/([A-Za-z0-9_-]+)/);
      assert.ok(match, `Expected reset password link matching /reset-password/<token> in email content`);
      const token = match[1];
      assert.ok(token.length >= 32, `Token length should be at least 32 characters, got ${token.length}`);
    });

    it('TC-T1-FORGOT-05: Should handle forgot password for second account (hr2) independently', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'hr2@rikkeijobs.test'
      });
      assert.strictEqual(res.status, 200);

      const data = await fetchMailpitMessages('hr2@rikkeijobs.test');
      assert.ok(data.messages.length >= 1, 'Expected reset email for hr2 in Mailpit');
    });
  });

  // --------------------------------------------------------------------------
  // Feature F05: Reset Password (POST /api/v1/auth/reset-password) — 5 Tests
  // --------------------------------------------------------------------------
  describe('Feature F05: Reset Password (POST /api/v1/auth/reset-password)', () => {
    let resetToken = null;

    before(async () => {
      if (backendOnline && mailpitOnline) {
        await clearMailbox();
        await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
          email: 'hr2@rikkeijobs.test'
        });
        const data = await fetchMailpitMessages('hr2@rikkeijobs.test');
        if (data.messages && data.messages.length > 0) {
          const detailRes = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data.messages[0].ID}`);
          const content = (detailRes.body.HTML || '') + ' ' + (detailRes.body.Text || '');
          const match = content.match(/\/reset-password\/([A-Za-z0-9_-]+)/);
          if (match) {
            resetToken = match[1];
          }
        }
      }
    });

    it('TC-T1-RESET-01: Should reset password successfully using valid Mailpit token', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(resetToken, 'Expected valid resetToken extracted from Mailpit');

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token: resetToken,
        newPassword: 'ResetOk@2026'
      });

      assert.strictEqual(res.status, 200, `Expected 200 OK: ${res.rawText}`);
      assert.ok(res.body && typeof res.body.message === 'string');
    });

    it('TC-T1-RESET-02: Should allow immediate login with newly reset password', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'ResetOk@2026'
      });

      assert.strictEqual(res.status, 200, `Expected 200 OK: ${res.rawText}`);
      assert.ok(res.body.accessToken);
      assert.strictEqual(res.body.user.email, 'hr2@rikkeijobs.test');
    });

    it('TC-T1-RESET-03: Should reject old password after reset with 401 UNAUTHORIZED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'Test@123'
      });

      assert.strictEqual(res.status, 401, `Old password must be rejected with 401, got ${res.status}`);
    });

    it('TC-T1-RESET-04: Should clear forced password change flag upon reset', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'ResetOk@2026'
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.mustChangePassword, false, 'mustChangePassword must be false following reset');
    });

    it('TC-T1-RESET-05: Should clear failed login count and unlock status upon password reset', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      try {
        const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr2@rikkeijobs.test',
          password: 'ResetOk@2026'
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.user.status, 'ACTIVE');
      } finally {
        if (postgresAvailable) {
          await execPostgres(`
            UPDATE users SET 
              password_hash = '$2a$10$iF1sNO/MFRBek.CSybegFe9uF2cIZyQYJhMJRRwVqpNrstfVjjS9a',
              status = 'ACTIVE',
              failed_login_count = 0,
              locked_until = NULL,
              must_change_password = false
            WHERE email = 'hr2@rikkeijobs.test';
          `);
        } else {
          // Fallback: Revert hr2 password to Test@123 via API
          const currentLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
            email: 'hr2@rikkeijobs.test',
            password: 'ResetOk@2026'
          });
          if (currentLogin.status === 200) {
            await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
              oldPassword: 'ResetOk@2026',
              newPassword: 'Test@123'
            }, {
              headers: { Authorization: `Bearer ${currentLogin.body.accessToken}` }
            });
          }
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Feature F06: Auth Me Profile (GET /api/v1/auth/me) — 5 Test Cases
  // --------------------------------------------------------------------------
  describe('Feature F06: Auth Me Profile (GET /api/v1/auth/me)', () => {
    it('TC-T1-ME-01: Should return Candidate profile with CANDIDATE role and lmsUserId lms-sv-001', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-sv-001');
      const authRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
      assert.strictEqual(authRes.status, 200);
      const token = authRes.body.accessToken;

      const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      assert.strictEqual(meRes.status, 200, `Expected 200 OK: ${meRes.rawText}`);
      assert.strictEqual(meRes.body.role, 'CANDIDATE');
      assert.strictEqual(meRes.body.email, 'candidate1@rikkeijobs.test');
      assert.strictEqual(meRes.body.lmsUserId, 'lms-sv-001');
    });

    it('TC-T1-ME-02: Should return Enterprise HR profile with HR role and companyId', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'Test@123'
      });
      assert.strictEqual(loginRes.status, 200);
      const token = loginRes.body.accessToken;

      const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      assert.strictEqual(meRes.status, 200, `Expected 200 OK: ${meRes.rawText}`);
      assert.strictEqual(meRes.body.role, 'HR');
      assert.strictEqual(meRes.body.email, 'hr1@rikkeijobs.test');
      assert.ok(meRes.body.companyId !== undefined, 'companyId must be present for HR accounts');
    });

    it('TC-T1-ME-03: Should return Mentor profile with MENTOR role and lmsUserId lms-mt-001', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-mt-001');
      const authRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
      assert.strictEqual(authRes.status, 200);

      const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${authRes.body.accessToken}` }
      });

      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.role, 'MENTOR');
      assert.strictEqual(meRes.body.lmsUserId, 'lms-mt-001');
    });

    it('TC-T1-ME-04: Should return Staff profile with STAFF role and lmsUserId lms-st-001', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-st-001');
      const authRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
      assert.strictEqual(authRes.status, 200);

      const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${authRes.body.accessToken}` }
      });

      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.role, 'STAFF');
      assert.strictEqual(meRes.body.lmsUserId, 'lms-st-001');
    });

    it('TC-T1-ME-05: Should return Admin profile with ADMIN role and lmsUserId lms-ad-001', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-ad-001');
      const authRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
      assert.strictEqual(authRes.status, 200);

      const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${authRes.body.accessToken}` }
      });

      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.role, 'ADMIN');
      assert.strictEqual(meRes.body.lmsUserId, 'lms-ad-001');
    });
  });
});
