/**
 * API call wrapper layer.
 *
 * This is the only channel between the frontend and the backend. Every module must access the backend through here,
 * and no module is allowed to write its own fetch — that way "API base URL, timeout and error normalization"
 * are implemented in exactly one place, so a change means editing only this file.
 *
 * This layer does three important things:
 *   1. Timeout control: attach a timeout to every request with AbortController, so the UI does not keep waiting when the backend does not respond;
 *   2. Error normalization: turn "the network is down", "it timed out", "HTTP 4xx" and "the business call failed" into a single ApiError,
 *      so the layer above only has to handle one error type;
 *   3. Uniform unwrapping: the backend agrees that the response body carries a success field, and success or failure is decided from it here.
 */

import { config } from './config.js';

/** The unified API error type. */
export class ApiError extends Error {
  constructor({ code, message, status = 0, detail = {} }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Make one request.
 * @param {string} path API path starting with / (without the /api prefix)
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.body] will be JSON-serialized
 */
async function request(path, options = {}) {
  const { method = 'GET', body } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  let response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    // fetch rejects only when the network layer fails (no connectivity, a blocked cross-origin request, the backend not started),
    // HTTP 4xx/5xx does not reject, so what is handled here is a genuine "cannot connect".
    if (error.name === 'AbortError') {
      throw new ApiError({
        code: 'TIMEOUT',
        message: `Request timed out after ${config.requestTimeoutMs}ms.`,
      });
    }
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: `Failed to reach the backend at ${config.apiBaseUrl}.`,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  // Read the text first and only then try to parse JSON: some error responses (such as an nginx 502 page) are not JSON,
  // and calling response.json() directly would throw a parse error unrelated to the real cause, hiding the problem.
  const rawText = await response.text();
  let payload = null;
  if (rawText !== '') {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  const failed = !response.ok || payload?.success === false;
  if (failed) {
    throw new ApiError({
      code: payload?.code ?? `HTTP_${response.status}`,
      message: payload?.message ?? `Request failed with status ${response.status}.`,
      status: response.status,
      detail: payload?.detail ?? {},
    });
  }

  return payload;
}

/** Build a query string, skipping empty values automatically. */
function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text === '' ? '' : `?${text}`;
}

/**
 * The list of backend endpoints.
 * Each method corresponds one-to-one to a route in the backend routes/index.js.
 */
export const api = {
  /** Health check */
  health: () => request('/health'),

  // ---- Calculation ----
  /**
   * Calculate an expression.
   * Note that the parameter name is expression: the frontend sends only the expression itself,
   * and **never sends the computed result to the backend**; this is the core requirement of the assignment.
   */
  calculate: (expression) => request('/calculate', { method: 'POST', body: { expression } }),

  // ---- History ----
  listHistory: (params = {}) => request(`/history${buildQuery(params)}`),
  statistics: () => request('/history/stats'),
  deleteHistory: (id) => request(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clearHistory: () => request('/history', { method: 'DELETE' }),
  setFavorite: (id, isFavorite) =>
    request(`/history/${encodeURIComponent(id)}/favorite`, {
      method: 'PATCH',
      body: { isFavorite },
    }),

  // ---- Conversion ----
  listUnits: () => request('/convert/units'),
  convertBase: (payload) => request('/convert/base', { method: 'POST', body: payload }),
  convertUnit: (payload) => request('/convert/unit', { method: 'POST', body: payload }),
};

export default api;
