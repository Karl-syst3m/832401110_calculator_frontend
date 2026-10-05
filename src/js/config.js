/**
 * Frontend configuration.
 *
 * This is the only place that has to be changed for a deployment environment, and it is this file.
 *
 * Resolution rules for the API base URL (highest priority first):
 *   1. URL query parameter ?api=http://example.com/api — handy for temporarily pointing at another backend for testing;
 *   2. global variable window.__CALCULATOR_CONFIG__.apiBaseUrl — handy for hard-coding it in index.html;
 *   3. Automatic inference:
 *        - the page was opened through file://                        -> local backend http://127.0.0.1:5000/api
 *        - the page runs on this machine (localhost / 127.0.0.1) on a development port -> port 5000 on the same host
 *        - every other case (including same-origin nginx deployment and access through a public IP)  -> same-origin /api
 *
 * Why default to the same-origin /api?
 * In production, nginx reverse-proxies /api/ to the backend, so the frontend and the API are same-origin,
 * and the browser never issues a cross-origin request at all, so there is no need to configure CORS and no risk that
 * a hard-coded IP makes the whole frontend fail after the domain changes.
 *
 * Note the "on this machine" qualifier in rule 3, which is essential:
 * detecting a development environment must look at the **hostname** and the port at the same time, not at the port alone.
 * The port alone used to be checked, and the consequence was that when the site was deployed on :8080,
 * the frontend wrongly believed it was running in a development environment and requested http://<public IP>:5000/api instead,
 * which both caused a cross-origin failure and forced the backend port to be exposed to the outside.
 */

/** These ports are treated as "static server ports used for local development". */
const DEVELOPMENT_PORTS = new Set(['5500', '8080', '5173', '3000', '8000']);

/** The address the backend listens on during local development. */
const LOCAL_BACKEND = 'http://127.0.0.1:5000/api';

/** Determine whether the page is running on this machine. The "development port -> backend on 5000" fallback rule is needed only on this machine. */
function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

function stripTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveApiBaseUrl() {
  // 1. Query parameter override
  const fromQuery = new URLSearchParams(window.location.search).get('api');
  if (typeof fromQuery === 'string' && fromQuery.trim() !== '') {
    return stripTrailingSlash(fromQuery.trim());
  }

  // 2. Global configuration override
  const fromGlobal = window.__CALCULATOR_CONFIG__?.apiBaseUrl;
  if (typeof fromGlobal === 'string' && fromGlobal.trim() !== '') {
    return stripTrailingSlash(fromGlobal.trim());
  }

  // 3. Automatic inference
  const { protocol, hostname, port } = window.location;
  if (protocol === 'file:') {
    return LOCAL_BACKEND;
  }
  // Only when the page really runs on this machine and the port is a development port is the backend assumed to be on 5000.
  // Both conditions must hold at the same time: :8080 on a public IP is a same-origin deployment, not local development.
  if (isLocalHostname(hostname) && DEVELOPMENT_PORTS.has(port)) {
    return `${protocol}//${hostname}:5000/api`;
  }
  return `${window.location.origin}/api`;
}

export const config = {
  /** Backend API root address */
  apiBaseUrl: resolveApiBaseUrl(),

  /** Timeout for a single request (milliseconds). The UI must not keep spinning when the backend does not respond. */
  requestTimeoutMs: 10000,

  /** Polling interval of the backend health check (milliseconds) */
  healthCheckIntervalMs: 30000,

  /** Debounce delay for the history search (milliseconds) */
  searchDebounceMs: 300,
};

export default config;
