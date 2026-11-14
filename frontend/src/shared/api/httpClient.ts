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

export const setAuthSessionHandlers = (handlers: Partial<AuthSessionHandlers>): void => {
  if (Object.keys(handlers).length === 0) {
    sessionHandlers = {};
    return;
  }

  const prev = sessionHandlers;
  const next: AuthSessionHandlers = { ...prev };

  if (handlers.onUnauthorized) {
    const newUnauthorized = handlers.onUnauthorized;
    const prevUnauthorized = prev.onUnauthorized;
    if (prevUnauthorized && prevUnauthorized !== newUnauthorized) {
      next.onUnauthorized = () => {
        try {
          prevUnauthorized();
        } catch {
          // Handlers should not interrupt error propagation
        }
        try {
          newUnauthorized();
        } catch {
          // Handlers should not interrupt error propagation
        }
      };
    } else {
      next.onUnauthorized = newUnauthorized;
    }
  }

  if (handlers.onMustChangePassword) {
    const newMustChange = handlers.onMustChangePassword;
    const prevMustChange = prev.onMustChangePassword;
    if (prevMustChange && prevMustChange !== newMustChange) {
      next.onMustChangePassword = () => {
        try {
          prevMustChange();
        } catch {
          // Handlers should not interrupt error propagation
        }
        try {
          newMustChange();
        } catch {
          // Handlers should not interrupt error propagation
        }
      };
    } else {
      next.onMustChangePassword = newMustChange;
    }
  }

  sessionHandlers = next;
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

/**
 * Centralized HTTP request client with in-memory Bearer token injection,
 * unified error response handling, debounced 401 session clearance,
 * and 403 MUST_CHANGE_PASSWORD interceptor.
 */
export async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${baseUrl}${endpoint}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Set Content-Type only if request has a JSON string body and no content-type is provided
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Automatically attach Bearer token if present and not explicitly skipped
  const token = getAuthToken();
  if (token && !options.skipAuth && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = `Yêu cầu thất bại với mã trạng thái ${response.status}`;

    try {
      const errorJson = (await response.json()) as ErrorResponseBody;
      if (errorJson && typeof errorJson === 'object') {
        if (errorJson.code) errorCode = errorJson.code;
        if (errorJson.message) errorMessage = errorJson.message;
      }
    } catch {
      // Non-JSON response body, fallback to default status message
    }

    // Centralized 401 Unauthorized handling: clear session and redirect once (debounced)
    // Only triggers session clearance and redirection for authenticated requests (!options.skipAuth)
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

    // Centralized 403 MUST_CHANGE_PASSWORD handling
    // Only triggers redirection if request is not flagged with skipAuth
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

  if (response.status === 204) {
    return {} as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export const httpClient = {
  request,
  setAuthToken,
  getAuthToken,
  getAuthSessionHandlers,
  setAuthSessionHandlers,
  resetAuthSessionState,
};

export default httpClient;
