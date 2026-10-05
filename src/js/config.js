/**
 * 前端配置。
 *
 * 唯一需要按部署环境改动的地方就在这个文件里。
 *
 * 接口地址的解析规则（按优先级从高到低）：
 *   1. URL 查询参数 ?api=http://example.com/api  —— 便于临时指向另一台后端做测试；
 *   2. 全局变量 window.__CALCULATOR_CONFIG__.apiBaseUrl —— 便于在 index.html 里写死；
 *   3. 自动推断：
 *        - 页面通过 file:// 打开                        -> 本地后端 http://127.0.0.1:5000/api
 *        - 页面跑在本机（localhost / 127.0.0.1）的开发端口 -> 同主机的 5000 端口
 *        - 其余情况（含 nginx 同源部署、用公网 IP 访问）  -> 同源 /api
 *
 * 为什么默认走「同源 /api」？
 * 生产部署时 nginx 会把 /api/ 反向代理到后端，前端与接口同源，
 * 浏览器根本不会发起跨域请求，因此既不需要配 CORS，也不会因为
 * 写死了 IP 导致换域名后前端全部报错。
 *
 * 注意第 3 条里的「本机」这个限定条件，它很关键：
 * 判断开发环境必须同时看**主机名**与端口，不能只看端口。
 * 曾经只判断端口，结果是当站点部署在 :8080 上时，
 * 前端误以为自己跑在开发环境，转而请求 http://<公网IP>:5000/api，
 * 既造成跨域失败，又迫使后端端口必须对外开放。
 */

/** 这些端口视为「本地开发用的静态服务端口」。 */
const DEVELOPMENT_PORTS = new Set(['5500', '8080', '5173', '3000', '8000']);

/** 本地开发时后端监听的地址。 */
const LOCAL_BACKEND = 'http://127.0.0.1:5000/api';

/** 判断页面是否运行在本机。只有本机才需要「开发端口 -> 后端 5000」这条兜底规则。 */
function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

function stripTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveApiBaseUrl() {
  // 1. 查询参数覆盖
  const fromQuery = new URLSearchParams(window.location.search).get('api');
  if (typeof fromQuery === 'string' && fromQuery.trim() !== '') {
    return stripTrailingSlash(fromQuery.trim());
  }

  // 2. 全局配置覆盖
  const fromGlobal = window.__CALCULATOR_CONFIG__?.apiBaseUrl;
  if (typeof fromGlobal === 'string' && fromGlobal.trim() !== '') {
    return stripTrailingSlash(fromGlobal.trim());
  }

  // 3. 自动推断
  const { protocol, hostname, port } = window.location;
  if (protocol === 'file:') {
    return LOCAL_BACKEND;
  }
  // 只有「确实跑在本机」且「端口是开发端口」时，才认为后端在 5000。
  // 两者必须同时满足：公网 IP 上的 :8080 是同源部署，不是本地开发。
  if (isLocalHostname(hostname) && DEVELOPMENT_PORTS.has(port)) {
    return `${protocol}//${hostname}:5000/api`;
  }
  return `${window.location.origin}/api`;
}

export const config = {
  /** 后端接口根地址 */
  apiBaseUrl: resolveApiBaseUrl(),

  /** 单次请求超时时间（毫秒）。后端无响应时不能让界面一直转圈。 */
  requestTimeoutMs: 10000,

  /** 后端健康检查轮询间隔（毫秒） */
  healthCheckIntervalMs: 30000,

  /** 历史记录搜索的防抖延迟（毫秒） */
  searchDebounceMs: 300,
};

export default config;
