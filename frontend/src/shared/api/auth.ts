/**
 * Interim HTTP Basic credentials kept in memory only (never persisted). Replaced by the SSO
 * ticket login of NT-01; callers only depend on the opaque Authorization header value.
 */
export const buildBasicAuthHeader = (email: string, password: string): string => {
  const bytes = new TextEncoder().encode(`${email}:${password}`);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `Basic ${btoa(binary)}`;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

