/**
 * 接口调用封装层。
 *
 * 这是前端与后端之间唯一的通道。所有模块都必须通过这里访问后端，
 * 不允许任何模块自己写 fetch —— 这样「接口地址、超时、错误归一化」
 * 只有一处实现，改起来只需改这个文件。
 *
 * 这一层做三件重要的事：
 *   1. 超时控制：用 AbortController 给每个请求加超时，避免后端无响应时界面一直等；
 *   2. 错误归一化：把「网络断了」「超时了」「HTTP 4xx」「业务失败」统一成 ApiError，
 *      上层只需要处理一种错误类型；
 *   3. 统一解包：后端约定响应体带 success 字段，这里据它判断成败。
 */

import { config } from './config.js';

/** 统一的接口错误类型。 */
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
 * 发起一次请求。
 * @param {string} path 以 / 开头的接口路径（不含 /api 前缀）
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.body] 会被 JSON 序列化
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
    // fetch 只有在网络层失败（断网、跨域被拦、后端没启动）时才会 reject，
    // HTTP 4xx/5xx 不会 reject，因此这里处理的是真正的「连不上」。
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

  // 先读文本再尝试解析 JSON：某些错误响应（如 nginx 的 502 页面）不是 JSON，
  // 直接 response.json() 会抛出一个与真实原因无关的解析异常，掩盖问题。
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

/** 组装查询字符串，自动跳过空值。 */
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
 * 后端接口清单。
 * 每个方法与后端 routes/index.js 里的一条路由一一对应。
 */
export const api = {
  /** 健康检查 */
  health: () => request('/health'),

  // ---- 计算 ----
  /**
   * 计算表达式。
   * 注意参数名是 expression：前端只发送表达式本身，
   * **绝不把算好的结果发给后端**，这是作业的核心要求。
   */
  calculate: (expression) => request('/calculate', { method: 'POST', body: { expression } }),

  // ---- 历史记录 ----
  listHistory: (params = {}) => request(`/history${buildQuery(params)}`),
  statistics: () => request('/history/stats'),
  deleteHistory: (id) => request(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clearHistory: () => request('/history', { method: 'DELETE' }),
  setFavorite: (id, isFavorite) =>
    request(`/history/${encodeURIComponent(id)}/favorite`, {
      method: 'PATCH',
      body: { isFavorite },
    }),

  // ---- 换算 ----
  listUnits: () => request('/convert/units'),
  convertBase: (payload) => request('/convert/base', { method: 'POST', body: payload }),
  convertUnit: (payload) => request('/convert/unit', { method: 'POST', body: payload }),
};

export default api;
