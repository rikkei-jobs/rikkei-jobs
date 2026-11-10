// Config module for Rikkei Jobs E2E Test Suite
// Reads runtime URLs and keys from environment variables with safe defaults

export const MOCK_BASE_URL = (process.env.MOCK_URL || 'http://127.0.0.1:9000').replace(/\/+$/, '');
export const BACKEND_BASE_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
export const FRONTEND_BASE_URL = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
export const MAILPIT_BASE_URL = (process.env.MAILPIT_URL || 'http://127.0.0.1:8025').replace(/\/+$/, '');
export const SERVICE_KEY = process.env.SERVICE_KEY || 'dev-key';

export const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '4000', 10);

/**
 * Checks whether a given base URL is currently reachable.
 * @param {string} url 
 * @param {number} timeoutMs 
 * @returns {Promise<boolean>}
 */
export async function isReachable(url, timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, method: 'GET' });
    clearTimeout(timer);
    return res.status >= 200 && res.status < 600;
  } catch {
    clearTimeout(timer);
    return false;
  }
}
