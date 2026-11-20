import { isPathAllowedForRole } from '../config/routePolicies';

export interface RedirectFromLocation {
  readonly pathname?: string;
  readonly search?: string;
  readonly hash?: string;
}

export interface RedirectLocationState {
  readonly from?: RedirectFromLocation | string;
}

export const getRoleHomePath = (role?: string): string => {
  switch (role) {
    case 'CANDIDATE':
      return '/candidate';
    case 'HR':
      return '/hr';
    case 'MENTOR':
      return '/mentor';
    case 'STAFF':
      return '/staff';
    case 'ADMIN':
      return '/admin';
    default:
      return '/login';
  }
};

const EXCLUDED_POST_LOGIN_PATHS: ReadonlySet<string> = new Set([
  '/',
  '/login',
  '/sso-callback',
  '/forgot-password',
  '/reset-password',
  '/change-password',
]);

export const isExcludedPostLoginPath = (pathname: string): boolean => {
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  const trimmed = collapsed === '/' ? '/' : collapsed.replace(/\/+$/, '');
  const normalized = (trimmed || '/').toLowerCase();
  return (
    EXCLUDED_POST_LOGIN_PATHS.has(normalized) ||
    normalized.startsWith('/reset-password/')
  );
};

const hasControlCharacter = (value: string): boolean => {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
};

const DOT_SEGMENT_PATTERN = /^(?:\.|%2e){1,2}$/i;

const hasDotSegment = (pathname: string): boolean =>
  pathname.split('/').some((segment) => DOT_SEGMENT_PATTERN.test(segment));

const extractRawPathname = (value: string): string => {
  const queryIndex = value.indexOf('?');
  const hashIndex = value.indexOf('#');
  let endIndex = value.length;
  if (queryIndex !== -1) {
    endIndex = Math.min(endIndex, queryIndex);
  }
  if (hashIndex !== -1) {
    endIndex = Math.min(endIndex, hashIndex);
  }
  return value.slice(0, endIndex);
};

export const extractFromPathname = (state: unknown): string | undefined => {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return undefined;
  }
  const { from } = state;
  if (typeof from === 'string') {
    return from;
  }
  if (typeof from === 'object' && from !== null && 'pathname' in from) {
    if (typeof from.pathname !== 'string') {
      return undefined;
    }
    const search = 'search' in from && typeof from.search === 'string' ? from.search : '';
    const hash = 'hash' in from && typeof from.hash === 'string' ? from.hash : '';
    return `${from.pathname}${search}${hash}`;
  }
  return undefined;
};

export const resolvePostLoginPath = (
  fromPathname: unknown,
  userRole?: string | null,
  defaultHomePath: string = getRoleHomePath(userRole ?? undefined),
): string => {
  if (typeof fromPathname !== 'string' || fromPathname.length === 0) {
    return defaultHomePath;
  }

  if (fromPathname !== fromPathname.trim() || hasControlCharacter(fromPathname)) {
    return defaultHomePath;
  }

  if (
    !fromPathname.startsWith('/') ||
    fromPathname.includes('//') ||
    fromPathname.includes('\\') ||
    /^\/%(?:2f|5c)/i.test(fromPathname)
  ) {
    return defaultHomePath;
  }

  const rawPathname = extractRawPathname(fromPathname);
  // Reject raw and single-decoded dot segments, slashes, backslashes, and control chars before WHATWG URL normalizes %2e%2e.
  if (hasDotSegment(rawPathname)) {
    return defaultHomePath;
  }

  let decodedRawPathname: string;
  try {
    decodedRawPathname = decodeURIComponent(rawPathname);
  } catch {
    return defaultHomePath;
  }

  if (
    hasControlCharacter(decodedRawPathname) ||
    decodedRawPathname.includes('\\') ||
    decodedRawPathname.includes('//') ||
    hasDotSegment(decodedRawPathname)
  ) {
    return defaultHomePath;
  }

  let parsed: URL;
  try {
    parsed = new URL(fromPathname, 'https://app.invalid');
  } catch {
    return defaultHomePath;
  }

  if (
    parsed.origin !== 'https://app.invalid' ||
    parsed.pathname.includes('//') ||
    hasDotSegment(parsed.pathname)
  ) {
    return defaultHomePath;
  }

  // React Router decodes percent-encoded segments before matching routes; reject malformed sequences and re-validate after decoding.
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(parsed.pathname);
  } catch {
    return defaultHomePath;
  }

  if (
    hasControlCharacter(decodedPathname) ||
    decodedPathname.includes('\\') ||
    decodedPathname.includes('//') ||
    hasDotSegment(decodedPathname)
  ) {
    return defaultHomePath;
  }

  let reParsed: URL;
  try {
    reParsed = new URL(decodedPathname, 'https://app.invalid');
  } catch {
    return defaultHomePath;
  }

  if (
    reParsed.origin !== 'https://app.invalid' ||
    reParsed.pathname.includes('//') ||
    hasDotSegment(reParsed.pathname)
  ) {
    return defaultHomePath;
  }

  if (
    isExcludedPostLoginPath(parsed.pathname) ||
    isExcludedPostLoginPath(decodedPathname) ||
    isExcludedPostLoginPath(reParsed.pathname)
  ) {
    return defaultHomePath;
  }

  if (
    !isPathAllowedForRole(parsed.pathname, userRole) ||
    !isPathAllowedForRole(reParsed.pathname, userRole)
  ) {
    return defaultHomePath;
  }

  return fromPathname;
};
