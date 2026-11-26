import { describe, it, expect } from 'vitest';
import {
  PROTECTED_ROUTE_POLICIES,
  getAllowedRolesForPathname,
  isPathAllowedForRole,
} from '../config/routePolicies';
import {
  extractFromPathname,
  getRoleHomePath,
  isExcludedPostLoginPath,
  resolvePostLoginPath,
} from '../utils/roleUtils';

describe('roleUtils', () => {
  describe('getRoleHomePath', () => {
    it('returns the Vietnamese role home path for all 5 roles and /login fallback', () => {
      expect(getRoleHomePath('CANDIDATE')).toBe('/candidate');
      expect(getRoleHomePath('HR')).toBe('/hr');
      expect(getRoleHomePath('MENTOR')).toBe('/mentor');
      expect(getRoleHomePath('STAFF')).toBe('/staff');
      expect(getRoleHomePath('ADMIN')).toBe('/admin');
      expect(getRoleHomePath('UNKNOWN')).toBe('/login');
      expect(getRoleHomePath(undefined)).toBe('/login');
    });
  });

  describe('extractFromPathname', () => {
    it('extracts pathname with search and hash from location state objects and string from values', () => {
      expect(extractFromPathname({ from: { pathname: '/hr/company', search: '?a=1' } })).toBe(
        '/hr/company?a=1',
      );
      expect(
        extractFromPathname({
          from: { pathname: '/candidate/jobs/42', search: '?tab=details', hash: '#skills' },
        }),
      ).toBe('/candidate/jobs/42?tab=details#skills');
      expect(
        extractFromPathname({
          from: { pathname: '/hr/company', search: 123, hash: null },
        }),
      ).toBe('/hr/company');
      expect(extractFromPathname({ from: '/candidate/skills' })).toBe('/candidate/skills');
    });

    it('returns undefined for missing, primitive, null, or malformed state', () => {
      expect(extractFromPathname(undefined)).toBeUndefined();
      expect(extractFromPathname(null)).toBeUndefined();
      expect(extractFromPathname('string')).toBeUndefined();
      expect(extractFromPathname(123)).toBeUndefined();
      expect(extractFromPathname({})).toBeUndefined();
      expect(extractFromPathname({ from: null })).toBeUndefined();
      expect(extractFromPathname({ from: {} })).toBeUndefined();
      expect(extractFromPathname({ from: { pathname: 42 } })).toBeUndefined();
    });
  });

  describe('routePolicies (SSOT)', () => {
    it('covers all 17 protected routes (including /403) with exact allowedRoles', () => {
      const policies = Object.values(PROTECTED_ROUTE_POLICIES);
      expect(policies).toHaveLength(17);
      expect(policies.map((p) => [p.path, [...p.allowedRoles]])).toEqual([
        ['/candidate', ['CANDIDATE']],
        ['/candidate/skills', ['CANDIDATE']],
        ['/candidate/jobs', ['CANDIDATE']],
        ['/candidate/jobs/:jobId', ['CANDIDATE']],
        ['/candidate/gap-analysis', ['CANDIDATE']],
        ['/candidate/evaluations', ['CANDIDATE']],
        ['/candidate/internships', ['CANDIDATE']],
        ['/candidate/applications', ['CANDIDATE']],
        ['/candidate/applications/:id', ['CANDIDATE']],
        ['/hr', ['HR']],
        ['/hr/company', ['HR']],
        ['/mentor', ['MENTOR']],
        ['/staff', ['STAFF']],
        ['/admin', ['ADMIN']],
        ['/admin/ai-config', ['ADMIN']],
        ['/admin/ai-logs', ['ADMIN']],
        ['/403', ['CANDIDATE', 'HR', 'MENTOR', 'STAFF', 'ADMIN']],
      ]);
    });

    it('matches static and dynamic :jobId / :id routes and rejects nested extra or unknown routes', () => {
      expect(getAllowedRolesForPathname('/candidate/internships')).toEqual(['CANDIDATE']);
      expect(getAllowedRolesForPathname('/candidate/applications')).toEqual(['CANDIDATE']);
      expect(getAllowedRolesForPathname('/candidate/applications/42')).toEqual(['CANDIDATE']);
      expect(getAllowedRolesForPathname('/candidate/applications/42/extra')).toBeNull();
      expect(getAllowedRolesForPathname('/candidate/jobs/42')).toEqual(['CANDIDATE']);
      expect(getAllowedRolesForPathname('/candidate/jobs/intern%20react')).toEqual(['CANDIDATE']);
      expect(getAllowedRolesForPathname('/candidate/jobs/42/extra')).toBeNull();
      expect(getAllowedRolesForPathname('/unknown-route')).toBeNull();
      expect(getAllowedRolesForPathname('/candidate/unknown')).toBeNull();
      expect(getAllowedRolesForPathname('/403')).toEqual([
        'CANDIDATE',
        'HR',
        'MENTOR',
        'STAFF',
        'ADMIN',
      ]);
    });

    it('enforces exact role matching in isPathAllowedForRole and fails closed on missing/unknown roles', () => {
      expect(isPathAllowedForRole('/candidate/internships', 'CANDIDATE')).toBe(true);
      expect(isPathAllowedForRole('/candidate/internships', 'HR')).toBe(false);
      expect(isPathAllowedForRole('/candidate/applications', 'CANDIDATE')).toBe(true);
      expect(isPathAllowedForRole('/candidate/applications/42', 'CANDIDATE')).toBe(true);
      expect(isPathAllowedForRole('/candidate/applications', 'HR')).toBe(false);
      expect(isPathAllowedForRole('/candidate/applications/42', 'STAFF')).toBe(false);
      expect(isPathAllowedForRole('/hr/company', 'HR')).toBe(true);
      expect(isPathAllowedForRole('/hr/company', 'CANDIDATE')).toBe(false);
      expect(isPathAllowedForRole('/hr/company', 'hr')).toBe(false);
      expect(isPathAllowedForRole('/hr/company', 'UNKNOWN')).toBe(false);
      expect(isPathAllowedForRole('/hr/company', '')).toBe(false);
      expect(isPathAllowedForRole('/hr/company', null)).toBe(false);
      expect(isPathAllowedForRole('/hr/company', undefined)).toBe(false);
      expect(isPathAllowedForRole('/candidate/jobs/42', 'CANDIDATE')).toBe(true);
      expect(isPathAllowedForRole('/candidate/jobs/42', 'HR')).toBe(false);
      expect(isPathAllowedForRole('/403', 'CANDIDATE')).toBe(true);
      expect(isPathAllowedForRole('/403', 'HR')).toBe(true);
      expect(isPathAllowedForRole('/403', 'MENTOR')).toBe(true);
      expect(isPathAllowedForRole('/403', 'STAFF')).toBe(true);
      expect(isPathAllowedForRole('/403', 'ADMIN')).toBe(true);
      expect(isPathAllowedForRole('/403', 'UNKNOWN')).toBe(false);
      expect(isPathAllowedForRole('/403', null)).toBe(false);
    });

    it('identifies excluded public/auth post-login paths while keeping /403 reachable', () => {
      expect(isExcludedPostLoginPath('/')).toBe(true);
      expect(isExcludedPostLoginPath('/login')).toBe(true);
      expect(isExcludedPostLoginPath('/sso-callback')).toBe(true);
      expect(isExcludedPostLoginPath('/forgot-password')).toBe(true);
      expect(isExcludedPostLoginPath('/reset-password')).toBe(true);
      expect(isExcludedPostLoginPath('/reset-password/token-123')).toBe(true);
      expect(isExcludedPostLoginPath('/change-password')).toBe(true);
      expect(isExcludedPostLoginPath('/403')).toBe(false);
      expect(isExcludedPostLoginPath('/403/')).toBe(false);
      expect(isExcludedPostLoginPath('/hr/company')).toBe(false);
      expect(isExcludedPostLoginPath('/candidate/jobs/42')).toBe(false);
    });
  });

  describe('resolvePostLoginPath', () => {
    it('preserves valid protected route pathnames including /403 when allowed for the authenticated role', () => {
      expect(resolvePostLoginPath('/hr/company', 'HR')).toBe('/hr/company');
      expect(resolvePostLoginPath('/hr/company/', 'HR')).toBe('/hr/company/');
      expect(resolvePostLoginPath('/HR/Company', 'HR')).toBe('/HR/Company');
      expect(resolvePostLoginPath('/hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate', 'CANDIDATE')).toBe('/candidate');
      expect(resolvePostLoginPath('/candidate/skills', 'CANDIDATE')).toBe('/candidate/skills');
      expect(resolvePostLoginPath('/candidate/jobs', 'CANDIDATE')).toBe('/candidate/jobs');
      expect(resolvePostLoginPath('/candidate/jobs/42', 'CANDIDATE')).toBe('/candidate/jobs/42');
      expect(resolvePostLoginPath('/candidate/jobs/42?tab=skills#info', 'CANDIDATE')).toBe(
        '/candidate/jobs/42?tab=skills#info',
      );
      expect(resolvePostLoginPath('/candidate/jobs/intern%20react', 'CANDIDATE')).toBe(
        '/candidate/jobs/intern%20react',
      );
      expect(resolvePostLoginPath('/candidate/gap-analysis', 'CANDIDATE')).toBe(
        '/candidate/gap-analysis',
      );
      expect(resolvePostLoginPath('/candidate/evaluations', 'CANDIDATE')).toBe(
        '/candidate/evaluations',
      );
      expect(resolvePostLoginPath('/candidate/internships', 'CANDIDATE')).toBe(
        '/candidate/internships',
      );
      expect(resolvePostLoginPath('/mentor', 'MENTOR')).toBe('/mentor');
      expect(resolvePostLoginPath('/staff', 'STAFF')).toBe('/staff');
      expect(resolvePostLoginPath('/admin', 'ADMIN')).toBe('/admin');
      expect(resolvePostLoginPath('/403', 'CANDIDATE')).toBe('/403');
      expect(resolvePostLoginPath('/403', 'HR')).toBe('/403');
      expect(resolvePostLoginPath('/403', 'MENTOR')).toBe('/403');
      expect(resolvePostLoginPath('/403', 'STAFF')).toBe('/403');
      expect(resolvePostLoginPath('/403', 'ADMIN')).toBe('/403');
      expect(resolvePostLoginPath('/403/', 'CANDIDATE')).toBe('/403/');
    });

    it('ignores cross-role and unknown routes and falls back to the user role home path', () => {
      expect(resolvePostLoginPath('/candidate/internships', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/staff', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/company', 'CANDIDATE')).toBe('/candidate');
      expect(resolvePostLoginPath('/admin', 'STAFF')).toBe('/staff');
      expect(resolvePostLoginPath('/candidate/skills', 'ADMIN')).toBe('/admin');
      expect(resolvePostLoginPath('/candidate/jobs/42?tab=1', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr', 'MENTOR')).toBe('/mentor');
      expect(resolvePostLoginPath('/candidate/jobs/42/extra', 'CANDIDATE')).toBe('/candidate');
      expect(resolvePostLoginPath('/unknown-route', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/unknown', 'CANDIDATE')).toBe('/candidate');
      expect(resolvePostLoginPath('/hr/company', undefined)).toBe('/login');
      expect(resolvePostLoginPath('/hr/company', null)).toBe('/login');
      expect(resolvePostLoginPath('/hr/company', 'UNKNOWN')).toBe('/login');
      expect(resolvePostLoginPath('/hr/company', 'hr')).toBe('/login');
      expect(resolvePostLoginPath('/403', undefined)).toBe('/login');
      expect(resolvePostLoginPath('/403', null)).toBe('/login');
      expect(resolvePostLoginPath('/403', 'UNKNOWN')).toBe('/login');
    });

    it('rejects empty, nullish, non-string, and whitespace-padded inputs', () => {
      expect(resolvePostLoginPath(undefined, 'HR')).toBe('/hr');
      expect(resolvePostLoginPath(null, 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('   ', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath(' /hr/company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/company ', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath(123, 'HR')).toBe('/hr');
      expect(resolvePostLoginPath({}, 'HR')).toBe('/hr');
    });

    it('rejects open-redirect payloads, external URLs, backslashes, encoded slashes, and control characters', () => {
      expect(resolvePostLoginPath('//evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('///evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('https://evil.com/hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('http://evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('javascript:alert(1)', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('hr/company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/\\evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('\\/evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%2f/evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%2Fevil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%5c/evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%5Cevil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr\n/company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr\t/company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr\x00/company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr\x7f/company', 'HR')).toBe('/hr');
    });

    it('rejects root, auth routes, double-slash, and dot-segment traversal (even when target matches role)', () => {
      expect(resolvePostLoginPath('/', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/?mockRole=HR', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/login', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/login/', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/LOGIN', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/login?tab=enterprise', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/sso-callback', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/sso-callback?ticket=abc', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/forgot-password', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/reset-password', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/reset-password/', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/reset-password/abc-token', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/RESET-PASSWORD/abc', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/change-password', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/change-password/', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/../login', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/../hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/./company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr//company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/company//', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/jobs//42', 'CANDIDATE')).toBe('/candidate');
      expect(resolvePostLoginPath('/candidate/jobs/%2f42', 'CANDIDATE')).toBe('/candidate');
      expect(resolvePostLoginPath('/hr/%2f/company', 'HR')).toBe('/hr');
    });

    it('rejects post-dot-segment protocol-relative and auth-route double-slash bypasses', () => {
      expect(resolvePostLoginPath('/..//login', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/..//login', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/..//sso-callback?ticket=abc', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/..//change-password', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/..//reset-password/abc', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/..//forgot-password', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/..//evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/.//evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/a/../../..//evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%2e/..//evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/reset-password//abc', 'HR')).toBe('/hr');
    });

    it('rejects percent-encoded auth-route/traversal bypasses and malformed percent sequences', () => {
      expect(resolvePostLoginPath('/%6cogin', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%73so-callback', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%66orgot-password', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%63hange-password', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%72eset-password/abc', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%ZZ', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/%2f..%2flogin', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/%2e%2e/login', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/%2e%2e/hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/%2e%2e/hr/company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/%2e%2e/candidate/skills', 'CANDIDATE')).toBe(
        '/candidate',
      );
      expect(resolvePostLoginPath('/candidate/jobs/%2e%2e', 'CANDIDATE')).toBe('/candidate');
      expect(resolvePostLoginPath('/candidate/jobs/%2e', 'CANDIDATE')).toBe('/candidate');
      expect(resolvePostLoginPath('/hr/%2e%2e/%2f/evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/%2e%2e%2f%2e%2e%2f%2f/evil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/%5cevil.com', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/%0aevil', 'HR')).toBe('/hr');
    });

    it('rejects double-encoded and multi-encoded dot-segment traversal while keeping valid encoded slugs', () => {
      expect(resolvePostLoginPath('/candidate/%252e%252e/hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/%252E%252E/hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/%252e/company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/%252e%252e/hr/company', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/company/%252e%252e', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/company/%252e', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/%252e%252e/candidate/skills', 'CANDIDATE')).toBe(
        '/candidate',
      );
      expect(resolvePostLoginPath('/%252e/hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/.%252e/hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/hr/%252e./hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/jobs/%252e%252e', 'CANDIDATE')).toBe('/candidate');
      expect(resolvePostLoginPath('/candidate/%25252e%25252e/hr', 'HR')).toBe('/hr');
      expect(resolvePostLoginPath('/candidate/jobs/intern%20react', 'CANDIDATE')).toBe(
        '/candidate/jobs/intern%20react',
      );
      expect(resolvePostLoginPath('/candidate/jobs/v1.2', 'CANDIDATE')).toBe(
        '/candidate/jobs/v1.2',
      );
    });
  });
});
