// Native HTTP Client for Rikkei Jobs Opaque-Box E2E Testing Suite
// Uses Node.js native fetch and AbortController (Zero third-party dependencies)

import { REQUEST_TIMEOUT_MS } from '../config.mjs';

/**
 * @typedef {Object} HttpResponse
 * @property {number} status - HTTP status code
 * @property {boolean} ok - True if status is 200-299
 * @property {Headers} headers - Response headers map
 * @property {any} body - Parsed JSON or string content
 * @property {string} rawText - Raw body text
 * @property {number} durationMs - Round-trip time in milliseconds
 */

/**
 * Sends an HTTP request with built-in timeout and body parsing.
 * @param {string} url - Target URL
 * @param {Object} options - Request options
 * @param {string} [options.method='GET']
 * @param {Object} [options.headers={}]
 * @param {any} [options.body]
 * @param {number} [options.timeoutMs=REQUEST_TIMEOUT_MS]
 * @returns {Promise<HttpResponse>}
 */
export async function sendRequest(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;

  let requestBody = undefined;
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === 'object' && !(options.body instanceof Buffer)) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      requestBody = JSON.stringify(options.body);
    } else {
      requestBody = options.body;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: controller.signal
    });
    const durationMs = Date.now() - startTime;
    clearTimeout(timer);

    const rawText = await res.text();
    let parsedBody = rawText;
    try {
      if (rawText && rawText.trim().length > 0) {
        parsedBody = JSON.parse(rawText);
      } else {
        parsedBody = null;
      }
    } catch {
      // Kept as rawText
    }

    return {
      status: res.status,
      ok: res.ok,
      headers: res.headers,
      body: parsedBody,
      rawText,
      durationMs
    };
  } catch (err) {
    clearTimeout(timer);
    const durationMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${method} ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

/**
 * Convenience methods for HTTP verbs
 */
export const http = {
  get: (url, options = {}) => sendRequest(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) => sendRequest(url, { ...options, method: 'POST', body }),
  patch: (url, body, options = {}) => sendRequest(url, { ...options, method: 'PATCH', body }),
  put: (url, body, options = {}) => sendRequest(url, { ...options, method: 'PUT', body }),
  delete: (url, options = {}) => sendRequest(url, { ...options, method: 'DELETE' }),
};
