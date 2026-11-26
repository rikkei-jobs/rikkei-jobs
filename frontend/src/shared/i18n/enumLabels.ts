/**
 * Shared localized display labels for user roles, account statuses, and company statuses.
 *
 * Design decision (Round DN-01-polish2 / T0231B5):
 * - Per explicit user decision overriding earlier wording, keep `HR` -> "HR" and
 *   `MENTOR` -> "Mentor" untranslated as standard domain terms in Vietnamese UI.
 * - Translate `CANDIDATE` -> "Ứng viên", `STAFF` -> "Nhân viên",
 *   and `ADMIN` -> "Quản trị viên".
 * - Account and company statuses use full Vietnamese diacritics (`ACTIVE` -> "Đang hoạt động",
 *   `LOCKED` -> "Đã khóa", `MUST_CHANGE_PASSWORD` -> "Yêu cầu đổi mật khẩu").
 * - Unknown, null, undefined, or blank values fall back to `UNKNOWN_LABEL` ("Không xác định"),
 *   never raw enum strings and never English "N/A".
 * - Internal enum values in logic, API payloads, routes, and `data-testid` attributes remain unchanged.
 */

export const UNKNOWN_LABEL = 'Không xác định' as const;

export const ROLE_LABELS = {
  CANDIDATE: 'Ứng viên',
  HR: 'HR',
  MENTOR: 'Mentor',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
} as const;

export const ACCOUNT_STATUS_LABELS = {
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khóa',
  MUST_CHANGE_PASSWORD: 'Yêu cầu đổi mật khẩu',
} as const;

export const COMPANY_STATUS_LABELS = {
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khóa',
} as const;

export type KnownRole = keyof typeof ROLE_LABELS;
export type KnownAccountStatus = keyof typeof ACCOUNT_STATUS_LABELS;
export type KnownCompanyStatus = keyof typeof COMPANY_STATUS_LABELS;

function normalizeEnumKey(value?: string | null): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function getRoleLabel(role?: string | null): string {
  const key = normalizeEnumKey(role);
  if (key in ROLE_LABELS) {
    return ROLE_LABELS[key as KnownRole];
  }
  return UNKNOWN_LABEL;
}

export function getAccountStatusLabel(
  status?: string | null,
  mustChangePassword?: boolean,
): string {
  const key = normalizeEnumKey(status);
  // Locked status takes precedence over forced password change so blocked accounts remain clearly marked.
  if (key === 'LOCKED') {
    return ACCOUNT_STATUS_LABELS.LOCKED;
  }
  if (mustChangePassword === true || key === 'MUST_CHANGE_PASSWORD') {
    return ACCOUNT_STATUS_LABELS.MUST_CHANGE_PASSWORD;
  }
  if (key === 'ACTIVE') {
    return ACCOUNT_STATUS_LABELS.ACTIVE;
  }
  return UNKNOWN_LABEL;
}

export function getCompanyStatusLabel(status?: string | null): string {
  const key = normalizeEnumKey(status);
  if (key in COMPANY_STATUS_LABELS) {
    return COMPANY_STATUS_LABELS[key as KnownCompanyStatus];
  }
  return UNKNOWN_LABEL;
}

export function formatDisplayValue(value?: string | number | null): string {
  if (value === null || value === undefined) {
    return UNKNOWN_LABEL;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : UNKNOWN_LABEL;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : UNKNOWN_LABEL;
}

export function formatRoleList(roles: readonly string[] | string): string {
  const items = Array.isArray(roles)
    ? roles
    : typeof roles === 'string'
      ? roles
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  if (items.length === 0) {
    return UNKNOWN_LABEL;
  }
  return items.map((role) => getRoleLabel(role)).join(', ');
}
