// Tier 3: Pairwise Combinations & Auth Lifecycles
// Verifies multi-step feature interactions, forced password change transitions, and lockout recovery flows (8 tests)

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

describe('Tier 3: NT-01 Pairwise Lifecycles & State Transitions (8 Tests)', async () => {
  let backendOnline = false;
  let mockOnline = false;
  let mailpitOnline = false;
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

  async function getMockSsoTicket(lmsUserId) {
    const res = await http.post(`${MOCK_BASE_URL}/lms/sso/tickets`, { lmsUserId }, { headers: mockHeaders });
    assert.strictEqual(res.status, 201, `Mock failed to issue ticket: ${res.rawText}`);
    return res.body.ticket;
  }

  async function fetchMailpitMessages(query, options = {}) {
    return fetchMailpitMessagesWithRetry(MAILPIT_BASE_URL, query, options);
  }

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
          // Restore default seed state with hr1 must_change_password=true and hr2 must_change_password=false
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
  // C01: SSO Verification to Profile Correlation Flow
  // --------------------------------------------------------------------------
  it('C01: SSO Verification to Profile Correlation Flow', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

    // 1. Issue ticket for candidate 1 from mock
    const ticket = await getMockSsoTicket('lms-sv-001');

    // 2. Exchange ticket with backend auth service
    const authRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
    assert.strictEqual(authRes.status, 200, `SSO authentication failed: ${authRes.rawText}`);
    const { accessToken, user } = authRes.body;
    assert.ok(accessToken);
    assert.strictEqual(user.role, 'CANDIDATE');

    // 3. Query authenticated profile via /me
    const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert.strictEqual(meRes.status, 200, `/me query failed: ${meRes.rawText}`);
    assert.strictEqual(meRes.body.email, 'candidate1@rikkeijobs.test');
    assert.strictEqual(meRes.body.fullName, 'Nguyễn Văn An');
    assert.strictEqual(meRes.body.role, 'CANDIDATE');
    assert.strictEqual(meRes.body.lmsUserId, 'lms-sv-001');
  });

  // --------------------------------------------------------------------------
  // C02: First-Time HR Login Forced Password Change Restriction Flow
  // --------------------------------------------------------------------------
  it('C02: First-Time HR Login Forced Password Change Restriction Flow', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(postgresAvailable, 'PostgreSQL container is required for state setup');

    await execPostgres("UPDATE users SET must_change_password = true WHERE email = 'hr1@rikkeijobs.test';");

    // 1. Login with initial hr1 account
    const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      email: 'hr1@rikkeijobs.test',
      password: 'Test@123'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.mustChangePassword, true);
    const token = loginRes.body.accessToken;

    // 2. Attempt calling protected business API while must_change_password is true
    const protectedRes = await http.get(`${BACKEND_BASE_URL}/api/v1/candidate/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Must be blocked with 403 MUST_CHANGE_PASSWORD
    assert.strictEqual(protectedRes.status, 403, `Protected API must return 403, got ${protectedRes.status}`);
    assert.strictEqual(
      protectedRes.body && protectedRes.body.code,
      'MUST_CHANGE_PASSWORD',
      `Expected error code MUST_CHANGE_PASSWORD, got ${protectedRes.body?.code}`
    );
  });

  // --------------------------------------------------------------------------
  // C03: Forced Password Change Allow-List Exemption Flow
  // --------------------------------------------------------------------------
  it('C03: Forced Password Change Allow-List Exemption Flow', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(postgresAvailable, 'PostgreSQL container is required for state setup');

    await execPostgres("UPDATE users SET must_change_password = true WHERE email = 'hr1@rikkeijobs.test';");

    const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      email: 'hr1@rikkeijobs.test',
      password: 'Test@123'
    });
    assert.strictEqual(loginRes.status, 200);
    const token = loginRes.body.accessToken;

    // Exemption 1: /api/v1/auth/me is allowed so UI can display user profile
    const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(meRes.status, 200, `/auth/me must be exempt from 403 block: ${meRes.rawText}`);
    assert.strictEqual(meRes.body.mustChangePassword, true);

    // Exemption 2: /api/v1/health is allowed
    const healthRes = await http.get(`${BACKEND_BASE_URL}/api/v1/health`);
    assert.strictEqual(healthRes.status, 200);
  });

  // --------------------------------------------------------------------------
  // C04: Password Change Unlocks Full System Operations
  // --------------------------------------------------------------------------
  it('C04: Password Change Unlocks Full System Operations', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

    const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      email: 'hr1@rikkeijobs.test',
      password: 'Test@123'
    });
    assert.strictEqual(loginRes.status, 200);
    const initialToken = loginRes.body.accessToken;

    // 1. Perform password change to clear must_change_password flag
    const changeRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
      oldPassword: 'Test@123',
      newPassword: 'HrUnlockedPass@2026'
    }, {
      headers: { Authorization: `Bearer ${initialToken}` }
    });
    assert.strictEqual(changeRes.status, 200, `Change password failed: ${changeRes.rawText}`);

    // 2. Re-login to get updated token without must_change_password flag
    const freshLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      email: 'hr1@rikkeijobs.test',
      password: 'HrUnlockedPass@2026'
    });
    assert.strictEqual(freshLogin.status, 200);
    assert.strictEqual(freshLogin.body.mustChangePassword, false);
    const freshToken = freshLogin.body.accessToken;

    // 3. Subsequent business API call is no longer blocked with 403 MUST_CHANGE_PASSWORD
    const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${freshToken}` }
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.mustChangePassword, false);
  });

  // --------------------------------------------------------------------------
  // C05: Password Change Immediate Invalidation & Re-Authentication
  // --------------------------------------------------------------------------
  it('C05: Password Change Immediate Invalidation & Re-Authentication', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);

    try {
      // 1. Verify old password is strictly rejected
      const oldLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'Test@123'
      });
      assert.strictEqual(oldLogin.status, 401, `Old password must be rejected after password change, got ${oldLogin.status}`);

      // 2. Verify new password authenticates cleanly
      const newLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'HrUnlockedPass@2026'
      });
      assert.strictEqual(newLogin.status, 200, `New password must authenticate cleanly: ${newLogin.rawText}`);
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
        // Fallback revert via API
        const newLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr1@rikkeijobs.test',
          password: 'HrUnlockedPass@2026'
        });
        if (newLogin.status === 200) {
          await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
            oldPassword: 'HrUnlockedPass@2026',
            newPassword: 'Test@123'
          }, {
            headers: { Authorization: `Bearer ${newLogin.body.accessToken}` }
          });
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // C06: Account Lockout Recovery via Self-Service Password Reset
  // --------------------------------------------------------------------------
  it('C06: Account Lockout Recovery via Self-Service Password Reset', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);
    assert.ok(postgresAvailable, 'PostgreSQL container is required for state setup');

    await execPostgres("UPDATE users SET status = 'ACTIVE', failed_login_count = 0, locked_until = NULL WHERE email = 'hr2@rikkeijobs.test';");

    try {
      // 1. Trigger 5 consecutive failed logins to lock hr2 account
      for (let i = 1; i <= 5; i++) {
        await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr2@rikkeijobs.test',
          password: `LockoutBadPass${i}`
        });
      }

      // Confirm account is locked
      const lockedRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'Test@123'
      });
      assert.strictEqual(lockedRes.status, 401);
      assert.strictEqual(lockedRes.body.code, 'ACCOUNT_LOCKED');

      // 2. User recovers via forgot-password flow
      await clearMailbox();
      const forgotRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'hr2@rikkeijobs.test'
      });
      assert.strictEqual(forgotRes.status, 200);

      // 3. Extract reset token from Mailpit
      const data = await fetchMailpitMessages('hr2@rikkeijobs.test');
      assert.ok(data.messages && data.messages.length >= 1, 'Expected reset email in Mailpit');
      const msg = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data.messages[0].ID}`);
      const token = (msg.body.HTML || msg.body.Text).match(/\/reset-password\/([A-Za-z0-9_-]+)/)[1];

      // 4. Reset password
      const resetRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token,
        newPassword: 'RecoveredPass@2026'
      });
      assert.strictEqual(resetRes.status, 200, `Reset password must succeed: ${resetRes.rawText}`);

      // 5. Account is automatically unlocked: login with new password succeeds immediately!
      const recoveredLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'RecoveredPass@2026'
      });
      assert.strictEqual(recoveredLogin.status, 200, `Recovered account must login successfully: ${recoveredLogin.rawText}`);
      assert.strictEqual(recoveredLogin.body.user.status, 'ACTIVE');
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
        const recoveredLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr2@rikkeijobs.test',
          password: 'RecoveredPass@2026'
        });
        if (recoveredLogin.status === 200) {
          await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
            oldPassword: 'RecoveredPass@2026',
            newPassword: 'Test@123'
          }, {
            headers: { Authorization: `Bearer ${recoveredLogin.body.accessToken}` }
          });
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // C07: Password Reset Automatically Clears Forced Change Status
  // --------------------------------------------------------------------------
  it('C07: Password Reset Automatically Clears Forced Change Status', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);
    assert.ok(postgresAvailable, 'PostgreSQL container is required for state setup');

    await execPostgres("UPDATE users SET must_change_password = true WHERE email = 'hr2@rikkeijobs.test';");

    try {
      await clearMailbox();
      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'hr2@rikkeijobs.test'
      });

      const data = await fetchMailpitMessages('hr2@rikkeijobs.test');
      assert.ok(data.messages && data.messages.length >= 1);
      const msg = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data.messages[0].ID}`);
      const token = (msg.body.HTML || msg.body.Text).match(/\/reset-password\/([A-Za-z0-9_-]+)/)[1];

      const resetRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token,
        newPassword: 'SelfServiceReset@2026'
      });
      assert.strictEqual(resetRes.status, 200);

      // Login with new password: mustChangePassword must be false
      const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'SelfServiceReset@2026'
      });
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginRes.body.mustChangePassword, false, 'Password reset must clear mustChangePassword flag');
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
        const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr2@rikkeijobs.test',
          password: 'SelfServiceReset@2026'
        });
        if (loginRes.status === 200) {
          await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
            oldPassword: 'SelfServiceReset@2026',
            newPassword: 'Test@123'
          }, {
            headers: { Authorization: `Bearer ${loginRes.body.accessToken}` }
          });
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // C08: Multi-Token Invalidation on Repeated Forgot Password Flow
  // --------------------------------------------------------------------------
  it('C08: Multi-Token Invalidation on Repeated Forgot Password Flow', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

    await clearMailbox();

    try {
      // Trigger request 1
      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, { email: 'hr1@rikkeijobs.test' });
      const data1 = await fetchMailpitMessages('hr1@rikkeijobs.test');
      assert.ok(data1.messages && data1.messages.length >= 1);
      const msg1 = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data1.messages[0].ID}`);
      const token1 = (msg1.body.HTML || msg1.body.Text).match(/\/reset-password\/([A-Za-z0-9_-]+)/)[1];

      // Trigger request 2
      await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, { email: 'hr1@rikkeijobs.test' });
      const data2 = await fetchMailpitMessages('hr1@rikkeijobs.test');
      assert.ok(data2.messages && data2.messages.length >= 2);
      const msg2 = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data2.messages[0].ID}`);
      const token2 = (msg2.body.HTML || msg2.body.Text).match(/\/reset-password\/([A-Za-z0-9_-]+)/)[1];

      // Token 1 must fail
      const res1 = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token: token1,
        newPassword: 'AttemptToken1@2026'
      });
      assert.strictEqual(res1.status, 400, `First token must be revoked, got ${res1.status}`);
      assert.strictEqual(res1.body.code, 'RESET_TOKEN_EXPIRED');

      // Token 2 must succeed
      const res2 = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token: token2,
        newPassword: 'AttemptToken2@2026'
      });
      assert.strictEqual(res2.status, 200, `Second token must succeed: ${res2.rawText}`);
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
        const login = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr1@rikkeijobs.test',
          password: 'AttemptToken2@2026'
        });
        if (login.status === 200) {
          await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
            oldPassword: 'AttemptToken2@2026',
            newPassword: 'Test@123'
          }, {
            headers: { Authorization: `Bearer ${login.body.accessToken}` }
          });
        }
      }
    }
  });
});
