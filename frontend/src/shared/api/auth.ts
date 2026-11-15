/**
 * Unified API Error for Rikkei Jobs HTTP communication.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly statusText?: string;

  constructor(status: number, message: string, code = 'API_ERROR', statusText?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.statusText = statusText;
  }
}
