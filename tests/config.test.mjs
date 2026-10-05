/**
 * 接口地址推断逻辑的测试。
 *
 * 这组测试的由来：
 * 最初的 `resolveApiBaseUrl` 只根据**端口号**判断「是否处于本地开发环境」。
 * 当站点被部署到公网 IP 的 :8080 端口时（8080 在开发端口列表里），
 * 前端会误以为自己跑在本地开发环境，转而去请求 http://<公网IP>:5000/api，
 * 结果是跨域请求失败，并且迫使后端端口必须对外开放。
 *
 * 修复方式是把判断条件改为「主机名是本机」**且**「端口是开发端口」，两者缺一不可。
 * 下面每个用例都对应一种真实的访问场景。
 *
 * 运行：npm test
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/** 构造一个模拟的 window.location，并计算对应的 origin。 */
function makeLocation({ protocol, hostname, port }) {
  const origin =
    protocol === 'file:' ? 'null' : `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  return { protocol, hostname, port, origin, search: '' };
}

/**
 * 在指定位置下加载 config 模块并返回解析出的接口地址。
 *
 * config.js 在模块顶层读取 window.location，因此必须在 import 之前
 * 把 globalThis.window 替换掉。
 * 同时用查询字符串让每次 import 都是新的模块实例，
 * 否则第二次会命中模块缓存，拿到的还是第一次的结果。
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

describe('接口地址推断：本地开发', () => {
  test('本机 5500 端口 -> 指向本机 5000 的后端', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '127.0.0.1', port: '5500' }));
    assert.equal(actual, 'http://127.0.0.1:5000/api');
  });

  test('localhost 8080 端口 -> 指向本机 5000 的后端', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: 'localhost', port: '8080' }));
    assert.equal(actual, 'http://localhost:5000/api');
  });

  test('本机 5173 端口 -> 指向本机 5000 的后端', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '127.0.0.1', port: '5173' }));
    assert.equal(actual, 'http://127.0.0.1:5000/api');
  });
});

describe('接口地址推断：公网部署（回归测试）', () => {
  test('公网 IP 的 8080 端口 -> 同源 /api，而不是本机 5000', async () => {
    // 这是修复的那个缺陷：8080 同时在开发端口列表里，
    // 只判断端口会得到错误的 http://103.236.57.2:5000/api
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '103.236.57.2', port: '8080' }));
    assert.equal(actual, 'http://103.236.57.2:8080/api');
  });

  test('公网 IP 的 8000 端口 -> 同源 /api', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '103.236.57.2', port: '8000' }));
    assert.equal(actual, 'http://103.236.57.2:8000/api');
  });

  test('HTTPS 域名 -> 同源 /api', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'https:', hostname: 'calc.example.com', port: '' }));
    assert.equal(actual, 'https://calc.example.com/api');
  });

  test('HTTP 域名（80 端口，port 为空字符串）-> 同源 /api', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: 'calc.example.com', port: '' }));
    assert.equal(actual, 'http://calc.example.com/api');
  });

  test('非开发端口的公网 IP -> 同源 /api', async () => {
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'http:', hostname: '103.236.57.2', port: '9000' }));
    assert.equal(actual, 'http://103.236.57.2:9000/api');
  });
});

describe('接口地址推断：file:// 直开', () => {
  test('file:// 协议 -> 回落到本机 5000', async () => {
    // 注意：ES Module 在 file:// 下会被浏览器拦截，这条规则只为给出可读的兜底地址
    const actual = await resolveApiBaseUrl(makeLocation({ protocol: 'file:', hostname: '', port: '' }));
    assert.equal(actual, 'http://127.0.0.1:5000/api');
  });
});

describe('接口地址覆盖', () => {
  test('查询参数 ?api= 优先级最高', async () => {
    const location = makeLocation({ protocol: 'https:', hostname: 'calc.example.com', port: '' });
    const actual = await resolveApiBaseUrl(location, {
      query: '?api=http://192.168.1.100:6000/api',
      globalConfig: { apiBaseUrl: 'https://ignored.example.com/api' },
    });
    assert.equal(actual, 'http://192.168.1.100:6000/api');
  });

  test('查询参数末尾斜杠会被去掉', async () => {
    const location = makeLocation({ protocol: 'https:', hostname: 'calc.example.com', port: '' });
    const actual = await resolveApiBaseUrl(location, { query: '?api=http://example.com/api/' });
    assert.equal(actual, 'http://example.com/api');
  });

  test('全局变量覆盖优先于自动推断', async () => {
    const location = makeLocation({ protocol: 'http:', hostname: '103.236.57.2', port: '8080' });
    const actual = await resolveApiBaseUrl(location, {
      globalConfig: { apiBaseUrl: 'https://api.example.com/api' },
    });
    assert.equal(actual, 'https://api.example.com/api');
  });

  test('空的查询参数会被忽略，回落到自动推断', async () => {
    const location = makeLocation({ protocol: 'https:', hostname: 'calc.example.com', port: '' });
    const actual = await resolveApiBaseUrl(location, { query: '?api=' });
    assert.equal(actual, 'https://calc.example.com/api');
  });
});
