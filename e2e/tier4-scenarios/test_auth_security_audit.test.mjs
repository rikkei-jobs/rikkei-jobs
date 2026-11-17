// Tier 4: Real-World Scenarios & Database Security Audit
// Verifies full end-to-end user workflows, lifecycle recovery, and PostgreSQL plaintext audits (5 scenarios)

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

const BCRYPT_REGEX = /^\$2[aby]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/;
const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/;

describe('Tier 4: NT-01 Real-World Scenarios & Security Audit (5 Scenarios)', async () => {
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
      throw new Error(`Postgres query failed: ${err.message}`);
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
          // Revert users to clean dev state (hr1 must_change_password=true, hr2 must_change_password=false)
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
  // Scenario 1: Candidate LMS SSO Onboarding & Single-Use Verification Journey
  // --------------------------------------------------------------------------
  it('Scenario 1: Candidate LMS SSO Onboarding & Single-Use Verification Journey', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(mockOnline, `Mock service at ${MOCK_BASE_URL} is offline`);

    // 1. Candidate clicks SSO login link, LMS issues fresh single-use ticket
    const ticket = await getMockSsoTicket('lms-sv-001');
    assert.ok(ticket && ticket.length >= 16, 'Mock must issue valid ticket with length >= 16');

    // 2. Frontend sso-callback sends ticket to Backend
    const authRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
    assert.strictEqual(authRes.status, 200, `SSO verification must succeed: ${authRes.rawText}`);
    const { accessToken, user } = authRes.body;
    assert.ok(accessToken, 'Expected JWT access token');
    assert.strictEqual(user.role, 'CANDIDATE');
    assert.strictEqual(user.fullName, 'Nguyễn Văn An');

    // 3. Authenticated session verified via /me profile endpoint
    const meRes = await http.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.email, 'candidate1@rikkeijobs.test');
    assert.strictEqual(meRes.body.role, 'CANDIDATE');

    // 4. Verification of single-use guarantee: Re-invoking callback with same ticket is strictly blocked
    const replayRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/sso`, { ticket });
    assert.strictEqual(replayRes.status, 401, `Ticket replay must be rejected with 401, got ${replayRes.status}`);
    assert.strictEqual(
      replayRes.body && replayRes.body.code,
      'TICKET_ALREADY_USED',
      `Replay must return code TICKET_ALREADY_USED, got ${replayRes.body?.code}`
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Enterprise HR First-Time Login & Mandatory Password Change Journey
  // --------------------------------------------------------------------------
  it('Scenario 2: Enterprise HR First-Time Login & Mandatory Password Change Journey', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(postgresAvailable, 'PostgreSQL container is required for state setup');

    await execPostgres("UPDATE users SET must_change_password = true WHERE email = 'hr1@rikkeijobs.test';");

    try {
      // 1. Enterprise HR logs in with seeded initial password
      const loginRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'Test@123'
      });
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginRes.body.mustChangePassword, true, 'hr1 must have mustChangePassword = true');
      const initialToken = loginRes.body.accessToken;

      // 2. User attempts to bypass change-password and call protected business API
      const bypassRes = await http.get(`${BACKEND_BASE_URL}/api/v1/candidate/profile`, {
        headers: { Authorization: `Bearer ${initialToken}` }
      });
      assert.strictEqual(bypassRes.status, 403, `Bypass attempt must be blocked with 403, got ${bypassRes.status}`);
      assert.strictEqual(
        bypassRes.body && bypassRes.body.code,
        'MUST_CHANGE_PASSWORD',
        `Bypass attempt must return code MUST_CHANGE_PASSWORD, got ${bypassRes.body?.code}`
      );

      // 3. User navigates to /change-password and completes password change
      const changeRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
        oldPassword: 'Test@123',
        newPassword: 'HrEnterprise@2026!'
      }, {
        headers: { Authorization: `Bearer ${initialToken}` }
      });
      assert.strictEqual(changeRes.status, 200, `Password change failed: ${changeRes.rawText}`);

      // 4. Old password is now unusable
      const badOldLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'Test@123'
      });
      assert.strictEqual(badOldLogin.status, 401);

      // 5. New password logs in cleanly with mustChangePassword = false
      const freshLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr1@rikkeijobs.test',
        password: 'HrEnterprise@2026!'
      });
      assert.strictEqual(freshLogin.status, 200);
      assert.strictEqual(freshLogin.body.mustChangePassword, false);
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
        const freshLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr1@rikkeijobs.test',
          password: 'HrEnterprise@2026!'
        });
        if (freshLogin.status === 200) {
          await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
            oldPassword: 'HrEnterprise@2026!',
            newPassword: 'Test@123'
          }, {
            headers: { Authorization: `Bearer ${freshLogin.body.accessToken}` }
          });
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Brute-Force Attack Mitigation & Timed Lockout Recovery Journey
  // --------------------------------------------------------------------------
  it('Scenario 3: Brute-Force Attack Mitigation & Timed Lockout Recovery Journey', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(postgresAvailable, 'PostgreSQL container is required for time-shift recovery');

    await execPostgres("UPDATE users SET status = 'ACTIVE', failed_login_count = 0, locked_until = NULL WHERE email = 'hr2@rikkeijobs.test';");

    // 1. Attacker sends 4 incorrect password attempts
    for (let i = 1; i <= 4; i++) {
      const res = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: `AttackerGuess${i}`
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    }

    // 2. Attacker sends 5th failed attempt -> Lockout triggered
    const lockRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      email: 'hr2@rikkeijobs.test',
      password: 'AttackerGuess5'
    });
    assert.strictEqual(lockRes.status, 401);
    assert.strictEqual(lockRes.body.code, 'ACCOUNT_LOCKED');
    assert.ok(
      lockRes.body.message.includes('15') || lockRes.body.message.includes('khóa') || lockRes.body.message.includes('phút')
    );

    // 3. Legitimate user submits CORRECT password during lockout period -> Still rejected
    const blockedLegit = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      email: 'hr2@rikkeijobs.test',
      password: 'Test@123'
    });
    assert.strictEqual(blockedLegit.status, 401);
    assert.strictEqual(blockedLegit.body.code, 'ACCOUNT_LOCKED');

    // 4. Deterministic time shift: 15-minute lock duration expires (0ms sleep)
    await execPostgres("UPDATE users SET locked_until = NOW() - INTERVAL '1 second' WHERE email = 'hr2@rikkeijobs.test';");

    // 5. Legitimate user logs in with correct password -> Auto-unlocks and succeeds
    const recoveredRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      email: 'hr2@rikkeijobs.test',
      password: 'Test@123'
    });
    assert.strictEqual(recoveredRes.status, 200, `Auto-unlocked login must succeed: ${recoveredRes.rawText}`);
    assert.ok(recoveredRes.body.accessToken);

    const count = await execPostgres("SELECT failed_login_count FROM users WHERE email = 'hr2@rikkeijobs.test';");
    assert.strictEqual(parseInt(count, 10), 0, 'failed_login_count must reset to 0 upon successful login');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Self-Service Forgot & Reset Password via Mailpit Journey
  // --------------------------------------------------------------------------
  it('Scenario 4: Self-Service Forgot & Reset Password via Mailpit Journey', async () => {
    assert.ok(backendOnline, `Backend service at ${BACKEND_BASE_URL} is offline`);
    assert.ok(mailpitOnline, `Mailpit at ${MAILPIT_BASE_URL} is offline`);

    try {
      await clearMailbox();

      // 1. User requests password reset link on /forgot-password
      const forgotRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/forgot-password`, {
        email: 'hr2@rikkeijobs.test'
      });
      assert.strictEqual(forgotRes.status, 200);

      // 2. Email inspected in Mailpit
      const data = await fetchMailpitMessages('hr2@rikkeijobs.test');
      assert.ok(data.messages && data.messages.length >= 1, 'Expected reset email delivered to Mailpit');
      const msg = await http.get(`${MAILPIT_BASE_URL}/api/v1/message/${data.messages[0].ID}`);

      // 3. Extract 256-bit token from reset link
      const content = (msg.body.HTML || '') + ' ' + (msg.body.Text || '');
      const match = content.match(/\/reset-password\/([A-Za-z0-9_-]+)/);
      assert.ok(match, 'Reset link matching /reset-password/<token> must be present');
      const token = match[1];

      // 4. User navigates to /reset-password/:token and submits new password
      const resetRes = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token,
        newPassword: 'SecureReset@2026!'
      });
      assert.strictEqual(resetRes.status, 200, `Password reset failed: ${resetRes.rawText}`);

      // 5. Replay attempt with same token is rejected
      const replayReset = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/reset-password`, {
        token,
        newPassword: 'AnotherPassword@2026!'
      });
      assert.strictEqual(replayReset.status, 400, 'Replayed reset token must be rejected');
      assert.strictEqual(replayReset.body.code, 'RESET_TOKEN_EXPIRED');

      // 6. Login with newly established password succeeds
      const newLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        email: 'hr2@rikkeijobs.test',
        password: 'SecureReset@2026!'
      });
      assert.strictEqual(newLogin.status, 200, `Login with reset password must succeed: ${newLogin.rawText}`);
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
        const newLogin = await http.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
          email: 'hr2@rikkeijobs.test',
          password: 'SecureReset@2026!'
        });
        if (newLogin.status === 200) {
          await http.post(`${BACKEND_BASE_URL}/api/v1/auth/change-password`, {
            oldPassword: 'SecureReset@2026!',
            newPassword: 'Test@123'
          }, {
            headers: { Authorization: `Bearer ${newLogin.body.accessToken}` }
          });
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Database Security Invariant & Plaintext Password Audit
  // --------------------------------------------------------------------------
  it('Scenario 5: Database Security Invariant & Plaintext Password Audit', async () => {
    assert.ok(postgresAvailable, 'PostgreSQL container is required for database audit');

    // 1. Query all users from PostgreSQL
    const output = await execPostgres(
      'SELECT email, password_hash FROM users WHERE password_hash IS NOT NULL;'
    );
    assert.ok(output.length > 0, 'Expected non-empty users table in PostgreSQL');

    const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
    assert.ok(lines.length >= 8, `Expected at least 8 seeded accounts, found ${lines.length}`);

    const forbiddenPlaintexts = [
      'Test@123',
      'HrPass@2026!',
      'ComplexPass#2026',
      'ResetOk@2026',
      'HrUnlockedPass@2026',
      'HrEnterprise@2026!',
      'SecureReset@2026!',
      'password',
      '12345678',
      'admin',
      'secret'
    ];

    // 2. Verify Invariant 1 (No Plaintext) & Invariant 2 (Standard BCrypt format)
    for (const line of lines) {
      const [email, hash] = line.split('|');
      assert.ok(email, 'Email must be present');
      assert.ok(hash, `Password hash must be present for user ${email}`);

      // Invariant 1: Assert NO plaintext passwords
      for (const forbidden of forbiddenPlaintexts) {
        assert.notStrictEqual(
          hash,
          forbidden,
          `SECURITY VIOLATION: User ${email} has plaintext password stored in database!`
        );
      }
      assert.ok(
        hash.length >= 60,
        `Password hash length for ${email} must be at least 60 characters, got ${hash.length}`
      );

      // Invariant 2: Assert BCrypt structure
      assert.ok(
        BCRYPT_REGEX.test(hash),
        `Password hash for ${email} does not match standard BCrypt format: ${hash}`
      );
    }

    // 3. Invariant 3: Audit used_sso_tickets table
    const ssoTicketsOutput = await execPostgres(
      'SELECT ticket, used_at FROM used_sso_tickets;'
    );
    // Even if empty or populated, verify query execution succeeds and fields match schema
    assert.ok(typeof ssoTicketsOutput === 'string');

    // 4. Invariant 4: Audit password_reset_tokens table (must only contain 64-hex SHA-256 hashes)
    const resetTokensOutput = await execPostgres(
      'SELECT token_hash FROM password_reset_tokens;'
    );
    if (resetTokensOutput.length > 0) {
      const tokenLines = resetTokensOutput.split('\n').map(l => l.trim()).filter(Boolean);
      for (const tokenHash of tokenLines) {
        assert.ok(
          SHA256_HEX_REGEX.test(tokenHash),
          `SECURITY VIOLATION: password_reset_tokens stores non-SHA256 token: ${tokenHash}`
        );
      }
    }
  });
});
