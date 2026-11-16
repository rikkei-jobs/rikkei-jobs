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

/**
 * Polls Mailpit messages endpoint with retries until messages count meets threshold or timeout.
 * @param {string} mailpitBaseUrl - Base URL of Mailpit service
 * @param {string} [query] - Optional query string or recipient email
 * @param {Object} [options]
 * @param {number} [options.minCount] - Minimum message count expected (defaults to 0 for ghost queries, 1 otherwise)
 * @param {number} [options.maxRetries=10] - Maximum retry attempts
 * @param {number} [options.intervalMs=100] - Delay between retries in milliseconds
 * @returns {Promise<any>} Response body containing messages array
 */
export async function fetchMailpitMessagesWithRetry(mailpitBaseUrl, query, options = {}) {
  const isGhostQuery = query && (query.includes('ghost') || query.includes('nonexistent'));
  const minCount = options.minCount !== undefined
    ? options.minCount
    : (isGhostQuery ? 0 : 1);
  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 10;
  const intervalMs = options.intervalMs !== undefined ? options.intervalMs : 100;

  const formattedQuery = query && query.includes('@') && !query.startsWith('to:')
    ? `to:${query}`
    : query;

  const url = formattedQuery
    ? `${mailpitBaseUrl}/api/v1/messages?query=${encodeURIComponent(formattedQuery)}`
    : `${mailpitBaseUrl}/api/v1/messages`;

  let lastBody = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await http.get(url);
    lastBody = res.body;
    const count = lastBody && Array.isArray(lastBody.messages) ? lastBody.messages.length : 0;
    if (count >= minCount || minCount === 0) {
      return lastBody;
    }
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  return lastBody;
}
