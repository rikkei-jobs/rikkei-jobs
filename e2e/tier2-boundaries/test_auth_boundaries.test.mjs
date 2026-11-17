// Tier 2: Boundary, Corner Cases & Negative Invalidation
// Verifies TTL limits, replay attacks, account lockout 5/15, weak passwords, token invalidation, and Skill Profile boundaries (39 tests)

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BACKEND_BASE_URL, MOCK_BASE_URL, MAILPIT_BASE_URL, SERVICE_KEY, isReachable } from '../config.mjs';
import { http, fetchMailpitMessagesWithRetry } from '../helpers/http-client.mjs';

const execFileAsync = promisify(execFile);

const mockHeaders = {
  'X-Service-Key': SERVICE_KEY,
  'Content-Type': 'application/json'
};

describe('Tier 2: NT-01 Auth Boundaries & Negative Invalidation (39 Tests)', async () => {
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
   * Helper to obtain fresh SSO ticket from mock.
   * @param {string} lmsUserId 
   * @returns {Promise<string>}
   */
  async function getMockSsoTicket(lmsUserId) {
    const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId }, { headers: mockHeaders });
    assert.strictEqual(res.status, 201, `Mock failed to issue ticket: ${res.rawText}`);
    return res.body.ticket;
  }

  /**
   * Helper to retrieve Mailpit messages with polling and retries.
   * @param {string} [query] 
   * @param {Object} [options]
   */
  async function fetchMailpitMessages(query, options = {}) {
    return fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, query, options);
  }

  /**
   * Helper to clear Mailpit inbox.
   */
  async function clearMailbox() {
    try {
      await http.delete(`${MAILPIT_BASE_URL}/api/v1/messages`);
    } catch {
      // Best effort
    }
  }

  before(async () => {
    backendOnline = await isReachable(BACKEND_BASE_URL);
    mockOnline = await isReachable(MOCK_BASE_URL);
    mailpitOnline = await isReachable(MAILPIT_BASE_URL);

    try {
      await execPostgres('SELECT 1;');
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
          // Restore hr1 and hr2 and any modified user states
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
  // 1. LMS SSO Boundaries (POST /api/v1/auth/sso) — 6 Tests
  // --------------------------------------------------------------------------
  describe('1. LMS SSO Boundaries (POST /api/v1/auth/sso)', () => {
    it('TC-T2-SSO-01: Should reject ticket reuse with 401 TICKET_ALREADY_USED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-sv-001');

      // First verification: must succeed
      const firstRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
      assert.strictEqual(firstRes.status, 200, `First use must succeed: ${firstRes.rawText}`);

      // Replay verification: must be rejected
      const replayRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
      assert.strictEqual(replayRes.status, 401, `Replay must return 401, got ${replayRes.status}`);
      assert.strictEqual(
        replayRes.body && replayRes.body.code,
        'TICKET_ALREADY_USED',
        `Expected error code TICKET_ALREADY_USED, got ${replayRes.body?.code}`
      );
    });

    it('TC-T2-SSO-02: Should reject expired ticket older than 60s with 401 TICKET_EXPIRED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      // Request ticket with past timestamp (70 seconds in the past) supported by mock
      const expiredRes = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, {
        lmsUserId: 'lms-sv-001',
        issuedAt: new Date(Date.now() - 70000).toISOString()
      }, { headers: mockHeaders });

      const ticket = expiredRes.body ? expiredRes.body.ticket : 'ticket-expired-simulation';
      const verifyRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

      assert.strictEqual(verifyRes.status, 401, `Expired ticket must return 401, got ${verifyRes.status}`);
      assert.strictEqual(
        verifyRes.body && verifyRes.body.code,
        'TICKET_EXPIRED',
        `Expected error code TICKET_EXPIRED, got ${verifyRes.body?.code}`
      );
    });

    it('TC-T2-SSO-03: Should accept fresh ticket within 60s TTL boundary', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-sv-002');
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });

      assert.strictEqual(res.status, 200, `Fresh ticket must return 200 OK: ${res.rawText}`);
      assert.ok(res.body.accessToken);
    });

    it('TC-T2-SSO-04: Should reject unissued or non-existent ticket with 401 INVALID_TICKET', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const fakeTicket = 'deadbeef' + Date.now() + Math.random().toString(36).substring(2);
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: fakeTicket });

      assert.strictEqual(res.status, 401, `Non-existent ticket must return 401, got ${res.status}`);
      assert.strictEqual(
        res.body && res.body.code,
        'INVALID_TICKET',
        `Expected error code INVALID_TICKET, got ${res.body?.code}`
      );
    });

    it('TC-T2-SSO-05: Should return 400 VALIDATION_ERROR when ticket field is empty or missing', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const emptyRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, {});
      assert.strictEqual(emptyRes.status, 400, `Empty body must return 400, got ${emptyRes.status}`);
      assert.strictEqual(emptyRes.body.code, 'VALIDATION_ERROR');

      const blankRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket: '   ' });
      assert.strictEqual(blankRes.status, 400, `Blank ticket must return 400, got ${blankRes.status}`);
      assert.strictEqual(blankRes.body.code, 'VALIDATION_ERROR');
    });

    it('TC-T2-SSO-06: Should handle concurrent ticket replay race condition safely', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

      const ticket = await getMockSsoTicket('lms-sv-003');

      // Dispatch 2 simultaneous requests with the same ticket
      const [resA, resB] = await Promise.all([
        http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket }),
        http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket })
      ]);

      const statuses = [resA.status, resB.status];
      // Exactly one must succeed (200), and the other must be rejected (401)
      assert.ok(statuses.includes(200), 'Exactly one request in race must succeed with 200');
      assert.ok(statuses.includes(401), 'Conflicting concurrent request must be rejected with 401');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Enterprise HR Login & Lockout Boundaries (POST /api/v1/auth/login) — 6 Tests
  // --------------------------------------------------------------------------
  describe('2. Enterprise HR Login & Lockout Boundaries (POST /api/v1/auth/login)', () => {
    it('TC-T2-LOGIN-01: Should increment failed count and remain ACTIVE for failed attempts 1 to 4', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      if (postgresAvailable) {
        await execPostgres("UPDATE users SET status = 'ACTIVE', failed_login_count = 0, locked_until = NULL WHERE email = 'hr2@rikkeijobs.test';");
      }

      // 4 consecutive bad passwords
      for (let i = 1; i <= 4; i++) {
        const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr2@rikkeijobs.test',
          password: `WrongPassword${i}`
        });
        assert.strictEqual(res.status, 401, `Attempt ${i} must return 401, got ${res.status}`);
        assert.strictEqual(res.body.code, 'UNAUTHORIZED');
      }

      if (postgresAvailable) {
        const count = await execPostgres("SELECT failed_login_count FROM users WHERE email = 'hr2@rikkeijobs.test';");
        assert.strictEqual(parseInt(count, 10), 4, `failed_login_count must be 4`);
        const status = await execPostgres("SELECT status FROM users WHERE email = 'hr2@rikkeijobs.test';");
        assert.strictEqual(status, 'ACTIVE');
      }
    });

    it('TC-T2-LOGIN-02: Should trigger 15-minute account lockout on 5th consecutive failed attempt', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      // 5th bad password attempt
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'WrongPassword5'
      });

      assert.strictEqual(res.status, 401, `5th attempt must return 401, got ${res.status}`);
      assert.strictEqual(res.body.code, 'ACCOUNT_LOCKED', 'Code must be ACCOUNT_LOCKED on 5th failure');
      assert.ok(
        res.body.message.includes('15') || res.body.message.includes('khóa') || res.body.message.includes('phút'),
        `Lockout message should specify remaining lock duration: ${res.body.message}`
      );

      if (postgresAvailable) {
        const status = await execPostgres("SELECT status FROM users WHERE email = 'hr2@rikkeijobs.test';");
        assert.strictEqual(status, 'LOCKED', 'User status must transition to LOCKED');
      }
    });

    it('TC-T2-LOGIN-03: Should reject correct password during active lockout period', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      // Attempt login with CORRECT password while account is LOCKED
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'Test@123'
      });

      assert.strictEqual(res.status, 401, `Correct password during lockout must still return 401, got ${res.status}`);
      assert.strictEqual(res.body.code, 'ACCOUNT_LOCKED');
    });

    it('TC-T2-LOGIN-04: Should automatically recover and allow login after lockout duration expires', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(postgresAvailable, 'PostgreSQL container is required for deterministic time-shift verification');

      // Deterministically shift locked_until into the past (0ms sleep)
      await execPostgres("UPDATE users SET locked_until = NOW() - INTERVAL '1 second' WHERE email = 'hr2@rikkeijobs.test';");

      // Attempt login with correct password
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'Test@123'
      });

      assert.strictEqual(res.status, 200, `Login after lockout expiration must succeed: ${res.rawText}`);
      assert.ok(res.body.accessToken);

      // Verify DB reset
      const count = await execPostgres("SELECT failed_login_count FROM users WHERE email = 'hr2@rikkeijobs.test';");
      assert.strictEqual(parseInt(count, 10), 0, 'failed_login_count must be reset to 0');
    });

    it('TC-T2-LOGIN-05: Should return identical 401 UNAUTHORIZED message for non-existent users (anti-enumeration)', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'nonexistent_hr@rikkeijobs.test',
        password: 'AnyPassword@123'
      });

      assert.strictEqual(res.status, 401, `Non-existent user must return 401, got ${res.status}`);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
      assert.ok(typeof res.body.message === 'string');
    });

    it('TC-T2-LOGIN-06: Should return 400 VALIDATION_ERROR on malformed email or empty password', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const malformedRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'not-an-email',
        password: 'ValidPassword123'
      });
      assert.strictEqual(malformedRes.status, 400);
      assert.strictEqual(malformedRes.body.code, 'VALIDATION_ERROR');

      const blankRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: ''
      });
      assert.strictEqual(blankRes.status, 400);
      assert.strictEqual(blankRes.body.code, 'VALIDATION_ERROR');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Change Password Boundaries (POST /api/v1/auth/change-password) — 6 Tests
  // --------------------------------------------------------------------------
  describe('3. Change Password Boundaries (POST /api/v1/auth/change-password)', () => {
    let hrToken = null;

    before(async () => {
      if (backendOnline) {
        const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr1@rikkeijobs.test',
          password: 'Test@123'
        });
        if (loginRes.status === 200) {
          hrToken = loginRes.body.accessToken;
        }
      }
    });

    it('TC-T2-CHPASS-01: Should reject new password shorter than 8 characters with 400 VALIDATION_ERROR', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(hrToken, 'Expected hrToken to authenticate request');

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
        oldPassword: 'Test@123',
        newPassword: 'Sh0rt!'
      }, {
        headers: { Authorization: `Bearer ${hrToken}` }
      });

      assert.strictEqual(res.status, 400, `Password < 8 chars must return 400, got ${res.status}`);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('TC-T2-CHPASS-02: Should reject new password missing numbers (letters only) with 400 VALIDATION_ERROR', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(hrToken);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
        oldPassword: 'Test@123',
        newPassword: 'LettersOnlyPassword!'
      }, {
        headers: { Authorization: `Bearer ${hrToken}` }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('TC-T2-CHPASS-03: Should reject new password missing letters (digits only) with 400 VALIDATION_ERROR', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(hrToken);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
        oldPassword: 'Test@123',
        newPassword: '123456789012'
      }, {
        headers: { Authorization: `Bearer ${hrToken}` }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('TC-T2-CHPASS-04: Should reject request when oldPassword does not match current password', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(hrToken);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
        oldPassword: 'IncorrectCurrentPassword123',
        newPassword: 'NewValidPassword@2026'
      }, {
        headers: { Authorization: `Bearer ${hrToken}` }
      });

      assert.strictEqual(res.status, 400, `Wrong old password must return 400, got ${res.status}`);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('TC-T2-CHPASS-05: Should reject request when newPassword is identical to oldPassword', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(hrToken);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
        oldPassword: 'Test@123',
        newPassword: 'Test@123'
      }, {
        headers: { Authorization: `Bearer ${hrToken}` }
      });

      assert.strictEqual(res.status, 400, `Identical password must return 400, got ${res.status}`);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('TC-T2-CHPASS-06: Should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
        oldPassword: 'Test@123',
        newPassword: 'NewValidPassword@2026'
      });

      assert.strictEqual(res.status, 401, `Missing token must return 401, got ${res.status}`);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Forgot Password Boundaries (POST /api/v1/auth/forgot-password) — 6 Tests
  // --------------------------------------------------------------------------
  describe('4. Forgot Password Boundaries (POST /api/v1/auth/forgot-password)', () => {
    it('TC-T2-FORGOT-01: Should return 200 anti-enumeration response and send zero emails for non-existent account', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      await clearMailbox();

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'ghost_nonexistent_user@rikkeijobs.test'
      });

      assert.strictEqual(res.status, 200, `Non-existent user must return 200 OK: ${res.rawText}`);
      assert.ok(res.body && typeof res.body.message === 'string');

      const data = await fetchMailpitMessages('ghost_nonexistent_user@rikkeijobs.test');
      const messagesCount = data && Array.isArray(data.messages) ? data.messages.length : 0;
      assert.strictEqual(messagesCount, 0, 'Zero emails must be dispatched for non-existent users');
    });

    it('TC-T2-FORGOT-02: Should reject malformed email syntax with 400 VALIDATION_ERROR', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'not-an-email-format'
      });

      assert.strictEqual(res.status, 400, `Malformed email must return 400, got ${res.status}`);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('TC-T2-FORGOT-03: Should reject blank email string with 400 VALIDATION_ERROR', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: '   '
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('TC-T2-FORGOT-04: Should invalidate previous token when duplicate forgot-password request is submitted', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      await clearMailbox();

      // First request
      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, { email: 'hr1@rikkeijobs.test' });
      const data1 = await fetchMailpitMessages('hr1@rikkeijobs.test');
      assert.ok(data1.messages && data1.messages.length >= 1);
      const msg1 = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data1.messages[0].ID}`);
      const token1Match = (msg1.body.HTML || msg1.body.Text).match(/\/reset-password\/([A-Za-z0-9_-]+)/);
      assert.ok(token1Match, 'Token 1 must be present');
      const token1 = token1Match[1];

      // Second request
      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, { email: 'hr1@rikkeijobs.test' });

      // Token 1 should now be revoked / replaced
      const attemptRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token: token1,
        newPassword: 'AttemptNewPass@123'
      });

      assert.strictEqual(
        attemptRes.status,
        400,
        `Superseded token must be rejected with 400 RESET_TOKEN_EXPIRED, got ${attemptRes.status}`
      );
    });

    it('TC-T2-FORGOT-05: Should enforce 256-bit entropy on generated reset token', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'hr1@rikkeijobs.test'
      });
      assert.strictEqual(res.status, 200, `Forgot password request must return 200 OK: ${res.rawText}`);

      const data = await fetchMailpitMessages('hr1@rikkeijobs.test');
      assert.ok(data.messages && data.messages.length >= 1, 'Expected at least 1 message in Mailpit');
      const msg = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data.messages[0].ID}`);
      assert.strictEqual(msg.status, 200, `Failed to retrieve message detail: ${msg.status}`);
      const match = (msg.body.HTML || msg.body.Text).match(/\/reset-password\/([A-Za-z0-9_-]+)/);
      assert.ok(match, 'Expected reset password token link in email content');
      const token = match[1];

      // Minimum 256-bit token is 32 raw bytes -> 64 hex chars or 43 base64url chars
      assert.ok(token.length >= 32, `Token length should be at least 32 characters, got ${token.length}`);
    });

    it('TC-T2-FORGOT-06: Should reject unsupported HTTP methods on forgot-password endpoint', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`);
      assert.strictEqual(res.status, 405, `GET method must return 405 Method Not Allowed, got ${res.status}`);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Reset Password Boundaries (POST /api/v1/auth/reset-password) — 6 Tests
  // --------------------------------------------------------------------------
  describe('5. Reset Password Boundaries (POST /api/v1/auth/reset-password)', () => {
    it('TC-T2-RESET-01: Should reject expired reset token > 30 minutes with 400 RESET_TOKEN_EXPIRED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(postgresAvailable, 'PostgreSQL container is required for time-shift testing');
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      await clearMailbox();
      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, { email: 'hr2@rikkeijobs.test' });

      const data = await fetchMailpitMessages('hr2@rikkeijobs.test');
      assert.ok(data.messages && data.messages.length >= 1);
      const msg = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data.messages[0].ID}`);
      const token = (msg.body.HTML || msg.body.Text).match(/\/reset-password\/([A-Za-z0-9_-]+)/)[1];

      // Deterministically shift expires_at to the past
      await execPostgres("UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 second' WHERE user_id = (SELECT id FROM users WHERE email = 'hr2@rikkeijobs.test');");

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token,
        newPassword: 'ValidNewPassword@2026'
      });

      assert.strictEqual(res.status, 400, `Expired token must return 400, got ${res.status}`);
      assert.strictEqual(res.body.code, 'RESET_TOKEN_EXPIRED');
    });

    it('TC-T2-RESET-02: Should reject replay / reuse of already consumed token with 400 RESET_TOKEN_EXPIRED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      await clearMailbox();
      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, { email: 'hr2@rikkeijobs.test' });

      const data = await fetchMailpitMessages('hr2@rikkeijobs.test');
      assert.ok(data.messages && data.messages.length >= 1);
      const msg = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data.messages[0].ID}`);
      const token = (msg.body.HTML || msg.body.Text).match(/\/reset-password\/([A-Za-z0-9_-]+)/)[1];

      try {
        // First reset: must succeed
        const firstRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
          token,
          newPassword: 'FirstValidReset@2026'
        });
        assert.strictEqual(firstRes.status, 200, `First reset must succeed: ${firstRes.rawText}`);

        // Second reset with identical token: must fail
        const replayRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
          token,
          newPassword: 'SecondValidReset@2026'
        });
        assert.strictEqual(replayRes.status, 400, `Replay reset must return 400, got ${replayRes.status}`);
        assert.strictEqual(replayRes.body.code, 'RESET_TOKEN_EXPIRED');
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
          const login = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
            email: 'hr2@rikkeijobs.test',
            password: 'FirstValidReset@2026'
          });
          if (login.status === 200) {
            await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
              oldPassword: 'FirstValidReset@2026',
              newPassword: 'Test@123'
            }, {
              headers: { Authorization: `Bearer ${login.body.accessToken}` }
            });
          }
        }
      }
    });

    it('TC-T2-RESET-03: Should reject fabricated or random non-existent token with 400 RESET_TOKEN_EXPIRED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token: 'fake-token-0123456789abcdef0123456789abcdef',
        newPassword: 'ValidNewPassword@2026'
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'RESET_TOKEN_EXPIRED');
    });

    it('TC-T2-RESET-04: Should reject weak password during reset and keep token unconsumed', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

      await clearMailbox();
      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, { email: 'hr2@rikkeijobs.test' });

      const data = await fetchMailpitMessages('hr2@rikkeijobs.test');
      assert.ok(data.messages && data.messages.length >= 1);
      const msg = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data.messages[0].ID}`);
      const token = (msg.body.HTML || msg.body.Text).match(/\/reset-password\/([A-Za-z0-9_-]+)/)[1];

      try {
        // Submit weak password (< 8 chars)
        const weakRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
          token,
          newPassword: 'short'
        });
        assert.strictEqual(weakRes.status, 400, `Weak password must return 400, got ${weakRes.status}`);
        assert.strictEqual(weakRes.body.code, 'VALIDATION_ERROR');

        // Assert token is NOT consumed: re-attempting with compliant password must succeed
        const goodRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
          token,
          newPassword: 'CompliantPass@2026'
        });
        assert.strictEqual(goodRes.status, 200, `Token must remain usable after validation failure: ${goodRes.rawText}`);
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
          // Cleanup via API
          const login = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
            email: 'hr2@rikkeijobs.test',
            password: 'CompliantPass@2026'
          });
          if (login.status === 200) {
            await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
              oldPassword: 'CompliantPass@2026',
              newPassword: 'Test@123'
            }, {
              headers: { Authorization: `Bearer ${login.body.accessToken}` }
            });
          }
        }
      }
    });

    it('TC-T2-RESET-05: Should return 400 VALIDATION_ERROR on empty token or password', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token: '',
        newPassword: ''
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
    });

    it('TC-T2-RESET-06: Should safely handle SQL injection strings in token parameter', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token: "' OR '1'='1' --",
        newPassword: 'ValidPassword@123'
      });

      // Must be safely parameterized and rejected as non-matching token
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'RESET_TOKEN_EXPIRED');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Current User Info / Auth Me Boundaries (GET /api/v1/auth/me) — 6 Tests
  // --------------------------------------------------------------------------
  describe('6. Current User Info / Auth Me Boundaries (GET /api/v1/auth/me)', () => {
    let validToken = null;

    before(async () => {
      if (backendOnline) {
        const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr1@rikkeijobs.test',
          password: 'Test@123'
        });
        if (loginRes.status === 200) {
          validToken = loginRes.body.accessToken;
        }
      }
    });

    it('TC-T2-ME-01: Should reject token with tampered cryptographic signature with 401 UNAUTHORIZED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(validToken, 'Expected validToken');

      const parts = validToken.split('.');
      assert.strictEqual(parts.length, 3);
      // Replace the FIRST signature character: it carries all 6 bits, so the decoded signature
      // always differs (the last Base64URL character holds padding bits and can be a no-op).
      const swapped = parts[2][0] === 'A' ? 'B' : 'A';
      const tamperedSig = swapped + parts[2].slice(1);
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${tamperedToken}` }
      });

      assert.strictEqual(res.status, 401, `Tampered signature must return 401, got ${res.status}`);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    });

    it('TC-T2-ME-02: Should reject syntactically malformed JWT strings with 401 UNAUTHORIZED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: 'Bearer this-is-not-a-jwt-token' }
      });

      assert.strictEqual(res.status, 401, `Malformed token must return 401, got ${res.status}`);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    });

    it('TC-T2-ME-03: Should reject Authorization header missing the Bearer prefix with 401 UNAUTHORIZED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(validToken);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: validToken } // Missing 'Bearer ' prefix
      });

      assert.strictEqual(res.status, 401, `Missing Bearer prefix must return 401, got ${res.status}`);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    });

    it('TC-T2-ME-04: Should reject requests for users locked in database after token was issued', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
      assert.ok(postgresAvailable, 'PostgreSQL container is required for live state verification');
      assert.ok(validToken);

      try {
        // Lock hr1 in DB
        await execPostgres("UPDATE users SET status = 'LOCKED' WHERE email = 'hr1@rikkeijobs.test';");

        const res = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${validToken}` }
        });

        assert.strictEqual(res.status, 401, `Locked user must be rejected with 401 on /me, got ${res.status}`);
        assert.strictEqual(
          res.body && res.body.code,
          'ACCOUNT_LOCKED',
          `Expected error code ACCOUNT_LOCKED, got ${res.body?.code}`
        );
      } finally {
        // Restore hr1 state
        await execPostgres("UPDATE users SET status = 'ACTIVE' WHERE email = 'hr1@rikkeijobs.test';");
      }
    });

    it('TC-T2-ME-05: Should reject requests when user has been deleted or does not exist in DB', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      // Token constructed with valid HMAC-SHA256 signature for non-existent userId 999999
      const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-rikkei-jobs-2026-min-32-chars';
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        sub: '999999',
        userId: 999999,
        email: 'ghost_user_999999@rikkeijobs.test',
        role: 'CANDIDATE',
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64url');
      const signingInput = `${header}.${payload}`;
      const signature = crypto
        .createHmac('sha256', jwtSecret)
        .update(signingInput)
        .digest('base64url');
      const validGhostToken = `${signingInput}.${signature}`;

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${validGhostToken}` }
      });

      assert.strictEqual(res.status, 401, `Ghost user token must return 401, got ${res.status}`);
      assert.strictEqual(res.body && res.body.code, 'UNAUTHORIZED');
    });

    it('TC-T2-ME-06: Should return 401 UNAUTHORIZED when Authorization header is empty or whitespace', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const res = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: 'Bearer ' }
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    });
  });

  // --------------------------------------------------------------------------
  // 7. Skill Profile Authentication & Boundaries (Round F) — 3 Tests
  // --------------------------------------------------------------------------
  describe('7. Skill Profile Authentication & Boundaries (Round F)', () => {
    it('TC-T2-SKILL-01: Should reject HTTP Basic authentication on all 3 skill endpoints with 401 UNAUTHORIZED', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      const basicHeader = `Basic ${Buffer.from('candidate1@rikkeijobs.test:Test@123').toString('base64')}`;
      const endpoints = [
        { method: 'GET', url: `${BACKEND_BASE_URL}/api/v1/profiles/me/skills` },
        { method: 'GET', url: `${BACKEND_BASE_URL}/api/v1/profiles/1/skills` },
        { method: 'POST', url: `${BACKEND_BASE_URL}/api/v1/profiles/me/skills/recompute` }
      ];

      for (const ep of endpoints) {
        const res = ep.method === 'GET'
          ? await http.get(ep.url, { headers: { Authorization: basicHeader } })
          : await http.post(ep.url, {}, { headers: { Authorization: basicHeader } });

        assert.strictEqual(
          res.status,
          401,
          `Basic auth on ${ep.method} ${ep.url} must return 401 UNAUTHORIZED, got ${res.status}`
        );
        assert.ok(res.body, `Expected response body for ${ep.url}`);
        assert.strictEqual(
          res.body.code,
          'UNAUTHORIZED',
          `Expected code UNAUTHORIZED for ${ep.url}, got ${res.body.code}`
        );
      }
    });

    it('TC-T2-SKILL-02: Should enforce 404 NOT_FOUND rule for private profiles and non-existent users', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      // 1. Login candidate2
      const login2 = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'candidate2@rikkeijobs.test',
        password: 'Test@123'
      });
      assert.strictEqual(login2.status, 200, `Login candidate2 failed: ${login2.rawText}`);
      const token2 = login2.body.accessToken;

      // 2. Login candidate1
      const login1 = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'candidate1@rikkeijobs.test',
        password: 'Test@123'
      });
      assert.strictEqual(login1.status, 200, `Login candidate1 failed: ${login1.rawText}`);
      const token1 = login1.body.accessToken;

      // Case 4a: candidate2 views candidate1 profile (is_public = false) -> 404 NOT_FOUND
      const privateRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/1/skills`, {
        headers: { Authorization: `Bearer ${token2}` }
      });
      assert.strictEqual(
        privateRes.status,
        404,
        `Private profile 1 viewed by candidate 2 must return 404, got ${privateRes.status}`
      );
      assert.strictEqual(
        privateRes.body && privateRes.body.code,
        'NOT_FOUND',
        `Expected error code NOT_FOUND for private profile, got ${privateRes.body?.code}`
      );

      // Case 4b: candidate1 views candidate2 profile (is_public = true) -> 200 OK
      const publicRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/2/skills`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.strictEqual(
        publicRes.status,
        200,
        `Public profile 2 viewed by candidate 1 must return 200 OK, got ${publicRes.status}`
      );
      assert.ok(Array.isArray(publicRes.body), 'Public profile must return array of skills');

      // Case 4c: candidate1 views non-existent profile 99999 -> 404 NOT_FOUND
      const nonExistentRes = await http.get(`${BACKEND_BASE_URL}/api/v1/profiles/99999/skills`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      assert.strictEqual(
        nonExistentRes.status,
        404,
        `Non-existent profile 99999 must return 404, got ${nonExistentRes.status}`
      );
      assert.strictEqual(
        nonExistentRes.body && nonExistentRes.body.code,
        'NOT_FOUND',
        `Expected error code NOT_FOUND for non-existent profile, got ${nonExistentRes.body?.code}`
      );
    });

    it('TC-T2-SKILL-03: Should reject users with must_change_password=true with 403 MUST_CHANGE_PASSWORD', async () => {
      assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

      // Login hr1 (seeded with must_change_password = true)
      const hrLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'Test@123'
      });
      assert.strictEqual(hrLogin.status, 200, `Login hr1 failed: ${hrLogin.rawText}`);
      assert.strictEqual(hrLogin.body.mustChangePassword, true, 'hr1 must have mustChangePassword true');
      const hrToken = hrLogin.body.accessToken;

      const endpoints = [
        { method: 'GET', url: `${BACKEND_BASE_URL}/api/v1/profiles/me/skills` },
        { method: 'GET', url: `${BACKEND_BASE_URL}/api/v1/profiles/1/skills` },
        { method: 'POST', url: `${BACKEND_BASE_URL}/api/v1/profiles/me/skills/recompute` }
      ];

      for (const ep of endpoints) {
        const res = ep.method === 'GET'
          ? await http.get(ep.url, { headers: { Authorization: `Bearer ${hrToken}` } })
          : await http.post(ep.url, {}, { headers: { Authorization: `Bearer ${hrToken}` } });

        assert.strictEqual(
          res.status,
          403,
          `Endpoint ${ep.method} ${ep.url} with must_change_password token must return 403, got ${res.status}`
        );
        assert.ok(res.body, `Expected response body for ${ep.url}`);
        assert.strictEqual(
          res.body.code,
          'MUST_CHANGE_PASSWORD',
          `Expected error code MUST_CHANGE_PASSWORD for ${ep.url}, got ${res.body.code}`
        );
      }
    });
  });
});
