import { ApiError } from './auth';

/**
 * Public configuration for backend API base URL.
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL ?? '';
};

/**
 * In-memory token storage (module-scoped).
 * In strict compliance with OWASP ASVS: NEVER use localStorage or sessionStorage for tokens.
 */
let inMemoryToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  inMemoryToken = token;
  if (token) {
    // Reset redirect flags when a fresh token is set
    isRedirectingToLogin = false;
    isRedirectingToChangePassword = false;
  }
};

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

export interface AuthSessionHandlers {
  onUnauthorized?: () => void;
  onMustChangePassword?: () => void;
}

let sessionHandlers: AuthSessionHandlers = {};
let isRedirectingToLogin = false;
let isRedirectingToChangePassword = false;

export const setAuthSessionHandlers = (
  handlers: Partial<AuthSessionHandlers>,
): (() => void) => {
  if (Object.keys(handlers).length === 0) {
    sessionHandlers = {};
    return () => {};
  }

  const next: AuthSessionHandlers = { ...sessionHandlers };
  const registeredUnauthorized = handlers.onUnauthorized;
  const registeredMustChange = handlers.onMustChangePassword;

  if ('onUnauthorized' in handlers) {
    next.onUnauthorized = registeredUnauthorized;
  }

  if ('onMustChangePassword' in handlers) {
    next.onMustChangePassword = registeredMustChange;
  }

  sessionHandlers = next;

  return () => {
    const current: AuthSessionHandlers = { ...sessionHandlers };
    if ('onUnauthorized' in handlers && current.onUnauthorized === registeredUnauthorized) {
      delete current.onUnauthorized;
    }
    if (
      'onMustChangePassword' in handlers &&
      current.onMustChangePassword === registeredMustChange
    ) {
      delete current.onMustChangePassword;
    }
    sessionHandlers = current;
  };
};

export const getAuthSessionHandlers = (): AuthSessionHandlers => sessionHandlers;

export const resetAuthSessionState = (): void => {
  isRedirectingToLogin = false;
  isRedirectingToChangePassword = false;
};

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export interface ErrorResponseBody {
  code?: string;
  message?: string;
}

function buildRequestUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  return endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${baseUrl}${endpoint}`;
}

async function executeFetch(
  endpoint: string,
  options: RequestOptions,
  defaultAccept: string,
): Promise<Response> {
  const url = buildRequestUrl(endpoint);
  const headers = new Headers(options.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', defaultAccept);
  }

  // Browser must generate the multipart boundary automatically when sending FormData
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    headers.delete('Content-Type');
  } else if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token && !options.skipAuth && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function handleErrorResponse(response: Response, options: RequestOptions): Promise<never> {
  let errorCode = 'UNKNOWN_ERROR';
  let errorMessage = `Không thể xử lý yêu cầu (mã lỗi ${response.status}). Vui lòng thử lại.`;

  try {
    const errorJson = (await response.json()) as ErrorResponseBody;
    if (errorJson && typeof errorJson === 'object') {
      if (errorJson.code) errorCode = errorJson.code;
      if (errorJson.message) errorMessage = errorJson.message;
    }
  } catch {
    // Non-JSON response body, fallback to default status message
  }

  // Clear session once per burst for authenticated requests receiving 401
  if (response.status === 401) {
    if (!options.skipAuth) {
      setAuthToken(null);
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true;
        if (sessionHandlers.onUnauthorized) {
          try {
            sessionHandlers.onUnauthorized();
          } catch {
            // Handlers should not interrupt error propagation
          }
        } else if (typeof window !== 'undefined' && typeof window.location?.assign === 'function') {
          try {
            window.location.assign('/login');
          } catch {
            // Safe fallback in test environments where jsdom navigation is restricted
          }
        }
      }
    }
    throw new ApiError(response.status, errorMessage, errorCode, response.statusText);
  }

  if (response.status === 403 && errorCode === 'MUST_CHANGE_PASSWORD' && !options.skipAuth) {
    if (!isRedirectingToChangePassword) {
      isRedirectingToChangePassword = true;
      if (sessionHandlers.onMustChangePassword) {
        try {
          sessionHandlers.onMustChangePassword();
        } catch {
          // Handlers should not interrupt error propagation
        }
      } else if (typeof window !== 'undefined' && typeof window.location?.assign === 'function') {
        try {
          window.location.assign('/change-password');
        } catch {
          // Safe fallback in test environments
        }
      }
    }
    throw new ApiError(response.status, errorMessage, errorCode, response.statusText);
  }

  throw new ApiError(response.status, errorMessage, errorCode, response.statusText);
}

/**
 * Centralized HTTP request client with in-memory Bearer token injection,
 * unified error response handling, debounced 401 session clearance,
 * and 403 MUST_CHANGE_PASSWORD interceptor.
 */
export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const response = await executeFetch(endpoint, options, 'application/json');

  if (!response.ok) {
    return handleErrorResponse(response, options);
  }

  if (response.status === 204) {
    return {} as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export interface BlobResponse {
  readonly blob: Blob;
  readonly filename: string | null;
  readonly contentType: string;
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;\r\n]+)/i.exec(header);
  if (utf8Match?.[1]) {
    const rawUtf8 = utf8Match[1].trim().replace(/^"|"$/g, '').trim();
    if (!rawUtf8) {
      return null;
    }
    try {
      const decoded = decodeURIComponent(rawUtf8).trim();
      return decoded || null;
    } catch {
      return rawUtf8 || null;
    }
  }
  const asciiMatch = /filename\s*=\s*"([^"\r\n]*)"|filename\s*=\s*([^;\r\n]+)/i.exec(header);
  const raw = asciiMatch?.[1] ?? asciiMatch?.[2];
  if (raw === undefined) {
    return null;
  }
  const trimmed = raw.trim().replace(/^"|"$/g, '').trim();
  return trimmed || null;
}

/**
 * Centralized binary download client reusing Bearer auth and error/session interceptors.
 */
export async function requestBlob(
  endpoint: string,
  options: RequestOptions = {},
): Promise<BlobResponse> {
  const response = await executeFetch(endpoint, options, 'application/pdf');

  if (!response.ok) {
    return handleErrorResponse(response, options);
  }

  const blob = await response.blob();
  const filename = parseContentDispositionFilename(response.headers.get('Content-Disposition'));
  const contentType = response.headers.get('Content-Type') ?? (blob.type || 'application/pdf');
  return { blob, filename, contentType };
}

/**
 * Upload multipart FormData while letting the browser generate the multipart boundary.
 */
export async function postFormData<T>(
  endpoint: string,
  formData: FormData,
  options: Omit<RequestOptions, 'body' | 'method'> = {},
): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    method: 'POST',
    body: formData,
  });
}

export const httpClient = {
  request,
  requestBlob,
  postFormData,
  setAuthToken,
  getAuthToken,
  getAuthSessionHandlers,
  setAuthSessionHandlers,
  resetAuthSessionState,
};

export default httpClient;
