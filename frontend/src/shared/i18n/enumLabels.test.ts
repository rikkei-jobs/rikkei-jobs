import { describe, it, expect } from 'vitest';
import {
  ACCOUNT_STATUS_LABELS,
  COMPANY_STATUS_LABELS,
  ROLE_LABELS,
  UNKNOWN_LABEL,
  formatDisplayValue,
  formatRoleList,
  getAccountStatusLabel,
  getCompanyStatusLabel,
  getRoleLabel,
} from './enumLabels';

describe('enumLabels', () => {
  it('exposes canonical Vietnamese UNKNOWN_LABEL', () => {
    expect(UNKNOWN_LABEL).toBe('Không xác định');
  });

  describe('ROLE_LABELS & getRoleLabel', () => {
    it('maps all 5 standard roles honoring HR and Mentor override', () => {
      expect(ROLE_LABELS).toEqual({
        CANDIDATE: 'Ứng viên',
        HR: 'HR',
        MENTOR: 'Mentor',
        STAFF: 'Nhân viên',
        ADMIN: 'Quản trị viên',
      });

      expect(getRoleLabel('CANDIDATE')).toBe('Ứng viên');
      expect(getRoleLabel('HR')).toBe('HR');
      expect(getRoleLabel('MENTOR')).toBe('Mentor');
      expect(getRoleLabel('STAFF')).toBe('Nhân viên');
      expect(getRoleLabel('ADMIN')).toBe('Quản trị viên');
    });

    it('normalizes whitespace and casing for role keys', () => {
      expect(getRoleLabel('candidate')).toBe('Ứng viên');
      expect(getRoleLabel(' hr ')).toBe('HR');
      expect(getRoleLabel('Mentor')).toBe('Mentor');
      expect(getRoleLabel(' staff ')).toBe('Nhân viên');
      expect(getRoleLabel('admin')).toBe('Quản trị viên');
    });

    it('falls back to UNKNOWN_LABEL for unknown or empty roles', () => {
      expect(getRoleLabel(null)).toBe(UNKNOWN_LABEL);
      expect(getRoleLabel(undefined)).toBe(UNKNOWN_LABEL);
      expect(getRoleLabel('')).toBe(UNKNOWN_LABEL);
      expect(getRoleLabel('   ')).toBe(UNKNOWN_LABEL);
      expect(getRoleLabel('SUPER_ADMIN')).toBe(UNKNOWN_LABEL);
      expect(getRoleLabel('UNKNOWN_ROLE')).toBe(UNKNOWN_LABEL);
    });
  });

  describe('ACCOUNT_STATUS_LABELS & getAccountStatusLabel', () => {
    it('maps ACTIVE, LOCKED, and MUST_CHANGE_PASSWORD', () => {
      expect(ACCOUNT_STATUS_LABELS).toEqual({
        ACTIVE: 'Đang hoạt động',
        LOCKED: 'Đã khóa',
        MUST_CHANGE_PASSWORD: 'Yêu cầu đổi mật khẩu',
      });

      expect(getAccountStatusLabel('ACTIVE')).toBe('Đang hoạt động');
      expect(getAccountStatusLabel('LOCKED')).toBe('Đã khóa');
      expect(getAccountStatusLabel('MUST_CHANGE_PASSWORD')).toBe('Yêu cầu đổi mật khẩu');
    });

    it('normalizes whitespace and casing', () => {
      expect(getAccountStatusLabel(' active ')).toBe('Đang hoạt động');
      expect(getAccountStatusLabel('locked')).toBe('Đã khóa');
      expect(getAccountStatusLabel('must_change_password')).toBe('Yêu cầu đổi mật khẩu');
    });

    it('prioritizes LOCKED over mustChangePassword, and mustChangePassword over ACTIVE', () => {
      expect(getAccountStatusLabel('LOCKED', true)).toBe('Đã khóa');
      expect(getAccountStatusLabel('ACTIVE', true)).toBe('Yêu cầu đổi mật khẩu');
      expect(getAccountStatusLabel('ACTIVE', false)).toBe('Đang hoạt động');
      expect(getAccountStatusLabel(undefined, true)).toBe('Yêu cầu đổi mật khẩu');
    });

    it('falls back to UNKNOWN_LABEL for unknown or empty account statuses', () => {
      expect(getAccountStatusLabel(null)).toBe(UNKNOWN_LABEL);
      expect(getAccountStatusLabel(undefined)).toBe(UNKNOWN_LABEL);
      expect(getAccountStatusLabel('')).toBe(UNKNOWN_LABEL);
      expect(getAccountStatusLabel('   ')).toBe(UNKNOWN_LABEL);
      expect(getAccountStatusLabel('PENDING')).toBe(UNKNOWN_LABEL);
      expect(getAccountStatusLabel('PENDING', false)).toBe(UNKNOWN_LABEL);
    });
  });

  describe('COMPANY_STATUS_LABELS & getCompanyStatusLabel', () => {
    it('maps ACTIVE and LOCKED company statuses', () => {
      expect(COMPANY_STATUS_LABELS).toEqual({
        ACTIVE: 'Đang hoạt động',
        LOCKED: 'Đã khóa',
      });

      expect(getCompanyStatusLabel('ACTIVE')).toBe('Đang hoạt động');
      expect(getCompanyStatusLabel('LOCKED')).toBe('Đã khóa');
      expect(getCompanyStatusLabel(' active ')).toBe('Đang hoạt động');
      expect(getCompanyStatusLabel(' locked ')).toBe('Đã khóa');
    });

    it('falls back to UNKNOWN_LABEL for unknown or empty company statuses', () => {
      expect(getCompanyStatusLabel(null)).toBe(UNKNOWN_LABEL);
      expect(getCompanyStatusLabel(undefined)).toBe(UNKNOWN_LABEL);
      expect(getCompanyStatusLabel('')).toBe(UNKNOWN_LABEL);
      expect(getCompanyStatusLabel('SUSPENDED')).toBe(UNKNOWN_LABEL);
    });
  });

  describe('formatDisplayValue', () => {
    it('formats valid strings and finite numbers including zero', () => {
      expect(formatDisplayValue('Nguyễn Văn A')).toBe('Nguyễn Văn A');
      expect(formatDisplayValue('  Rikkei Jobs  ')).toBe('Rikkei Jobs');
      expect(formatDisplayValue(0)).toBe('0');
      expect(formatDisplayValue(42)).toBe('42');
      expect(formatDisplayValue(-1)).toBe('-1');
    });

    it('falls back to UNKNOWN_LABEL for null, undefined, NaN, Infinity, or blank strings', () => {
      expect(formatDisplayValue(null)).toBe(UNKNOWN_LABEL);
      expect(formatDisplayValue(undefined)).toBe(UNKNOWN_LABEL);
      expect(formatDisplayValue('')).toBe(UNKNOWN_LABEL);
      expect(formatDisplayValue('   ')).toBe(UNKNOWN_LABEL);
      expect(formatDisplayValue(Number.NaN)).toBe(UNKNOWN_LABEL);
      expect(formatDisplayValue(Number.POSITIVE_INFINITY)).toBe(UNKNOWN_LABEL);
      expect(formatDisplayValue(Number.NEGATIVE_INFINITY)).toBe(UNKNOWN_LABEL);
    });
  });

  describe('formatRoleList', () => {
    it('formats arrays and CSV strings of roles into localized comma-separated labels', () => {
      expect(formatRoleList(['CANDIDATE', 'HR'])).toBe('Ứng viên, HR');
      expect(formatRoleList(['MENTOR', 'CANDIDATE', 'ADMIN'])).toBe(
        'Mentor, Ứng viên, Quản trị viên',
      );
      expect(formatRoleList('CANDIDATE, HR, STAFF')).toBe('Ứng viên, HR, Nhân viên');
    });

    it('handles empty inputs and unknown entries cleanly', () => {
      expect(formatRoleList([])).toBe(UNKNOWN_LABEL);
      expect(formatRoleList('')).toBe(UNKNOWN_LABEL);
      expect(formatRoleList('   ')).toBe(UNKNOWN_LABEL);
      expect(formatRoleList(['CANDIDATE', 'GUEST'])).toBe('Ứng viên, Không xác định');
    });
  });
});
