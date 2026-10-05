/**
 * Tests for the API base URL inference logic.
 *
 * Where this set of tests came from:
 * The original `resolveApiBaseUrl` decided "am I in a local development environment" from the **port number** alone.
 * When the site was deployed on port :8080 of a public IP (8080 is in the development port list),
 * the frontend wrongly believed it was running in a local development environment and requested http://<public IP>:5000/api instead,
 * with the result that the cross-origin request failed and the backend port had to be exposed to the outside.
 *
 * The fix was to change the condition to "the hostname is this machine" **and** "the port is a development port", neither of which may be missing.
 * Each case below corresponds to a real access scenario.
 *
 * Run: npm test
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/** Build a mock window.location and compute the corresponding origin. */
function makeLocation({ protocol, hostname, port }) {
  const origin =
    protocol === 'file:' ? 'null' : `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  return { protocol, hostname, port, origin, search: '' };
}

/**
 * Load the config module at the given location and return the resolved API base URL.
 *
 * config.js reads window.location at module top level, so globalThis.window must be
 * replaced before the import happens.
 * A query string is also used so that every import is a fresh module instance,
 * otherwise the second one would hit the module cache and still get the result from the first.
 */
async function resolveApiBaseUrl(location, { query = '', globalConfig } = {}) {
  globalThis.window = {
    location: { ...location, search: query },
    __CALCULATOR_CONFIG__: globalConfig,
  };
  const moduleUrl = new URL('../src/js/config.js', import.meta.url).href;
  const cacheKey = `${query}|${globalConfig?.apiBaseUrl ?? ''}|${location.hostname}:${location.port}|${location.protocol}`;
  const { config } = await import(`${moduleUrl}?case=${encodeURIComponent(cacheKey)}`);
  return config.apiBaseUrl;
}

describe('API base URL inference: local development', () => {
  test('this machine, port 5500 -> points at the backend on port 5000 of this machine', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '127.0.0.1', port: '5500' }));
    assert.equal(actual, 'http://127.0.0.1:5000/api');
  });

  test('localhost, port 8080 -> points at the backend on port 5000 of this machine', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: 'localhost', port: '8080' }));
    assert.equal(actual, 'http://localhost:5000/api');
  });

  test('this machine, port 5173 -> points at the backend on port 5000 of this machine', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '127.0.0.1', port: '5173' }));
    assert.equal(actual, 'http://127.0.0.1:5000/api');
  });
});

describe('API base URL inference: public deployment (regression tests)', () => {
  test('port 8080 on a public IP -> same-origin /api, not port 5000 on this machine', async () => {
    // This is the defect that was fixed: 8080 is also in the development port list, so
    // checking the port alone yields the wrong http://103.236.57.2:5000/api
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '103.236.57.2', port: '8080' }));
    assert.equal(actual, 'http://103.236.57.2:8080/api');
  });

  test('port 8000 on a public IP -> same-origin /api', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '103.236.57.2', port: '8000' }));
    assert.equal(actual, 'http://103.236.57.2:8000/api');
  });

  test('HTTPS domain -> same-origin /api', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'https:', hostname: 'calc.example.com', port: '' }));
    assert.equal(actual, 'https://calc.example.com/api');
  });

  test('HTTP domain (port 80, port is an empty string) -> same-origin /api', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: 'calc.example.com', port: '' }));
    assert.equal(actual, 'http://calc.example.com/api');
  });

  test('public IP on a non-development port -> same-origin /api', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '103.236.57.2', port: '9000' }));
    assert.equal(actual, 'http://103.236.57.2:9000/api');
  });
});

describe('API base URL inference: opening directly over file://', () => {
  test('file:// protocol -> falls back to port 5000 on this machine', async () => {
    // Note: ES Modules are blocked by the browser under file://; this rule exists only to give a readable fallback address
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'file:', hostname: '', port: '' }));
    assert.equal(actual, 'http://127.0.0.1:5000/api');
  });
});

describe('API base URL overrides', () => {
  test('the ?api= query parameter has the highest priority', async () => {
    const location = makeLocation({ protocol: 'https:', hostname: 'calc.example.com', port: '' });
    const actual = await resolveApiBaseUrl(location, {
      query: '?api=http://192.168.1.100:6000/api',
      globalConfig: { apiBaseUrl: 'https://ignored.example.com/api' },
    });
    assert.equal(actual, 'http://192.168.1.100:6000/api');
  });

  test('a trailing slash in the query parameter is stripped', async () => {
    const location = makeLocation({ protocol: 'https:', hostname: 'calc.example.com', port: '' });
    const actual = await resolveApiBaseUrl(location, { query: '?api=http://example.com/api/' });
    assert.equal(actual, 'http://example.com/api');
  });

  test('the global variable override takes precedence over automatic inference', async () => {
    const location = makeLocation({ protocol: 'http:', hostname: '103.236.57.2', port: '8080' });
    const actual = await resolveApiBaseUrl(location, {
      globalConfig: { apiBaseUrl: 'https://api.example.com/api' },
    });
    assert.equal(actual, 'https://api.example.com/api');
  });

  test('an empty query parameter is ignored and automatic inference is used instead', async () => {
    const location = makeLocation({ protocol: 'https:', hostname: 'calc.example.com', port: '' });
    const actual = await resolveApiBaseUrl(location, { query: '?api=' });
    assert.equal(actual, 'https://calc.example.com/api');
  });
});
