export type UserRole = 'CANDIDATE' | 'HR';

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  userId: number;
  fullName: string;
  role: UserRole;
}

const SESSION_KEY = 'rikkei-jobs-auth-session';

const isAuthSession = (value: unknown): value is AuthSession => {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.accessToken === 'string' &&
    typeof session.tokenType === 'string' &&
    typeof session.expiresAt === 'string' &&
    typeof session.userId === 'number' &&
    typeof session.fullName === 'string' &&
    (session.role === 'CANDIDATE' || session.role === 'HR')
  );
};

export const getAuthSession = (): AuthSession | null => {
  const rawSession = sessionStorage.getItem(SESSION_KEY);
  if (!rawSession) return null;

  try {
    const parsed: unknown = JSON.parse(rawSession);
    if (!isAuthSession(parsed) || Date.parse(parsed.expiresAt) <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const setAuthSession = (session: AuthSession): void => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearAuthSession = (): void => {
  sessionStorage.removeItem(SESSION_KEY);
};
