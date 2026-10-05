/**
 * 极简 DOM 辅助函数。
 *
 * 前端一共有十几个模块需要取元素，每个模块各写一遍
 * document.querySelector 既啰嗦又容易拼错选择器。
 * 这里只封装最常用的四个操作，刻意不做「类 jQuery」的链式封装：
 * 原生 DOM API 已经足够用，再加一层抽象只会让人多学一套规则。
 */

/** 取单个元素。 */
export function $(selector, root = document) {
  return root.querySelector(selector);
}

/** 取多个元素，返回真正的数组（NodeList 没有 map/filter 的部分方法）。 */
export function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/** 显示元素（配合 HTML 的 hidden 属性使用）。 */
export function show(element) {
  if (element) element.hidden = false;
}

/** 隐藏元素。 */
export function hide(element) {
  if (element) element.hidden = true;
}

/**
 * 创建一个元素。
 * @param {string} tagName 标签名
 * @param {object} [options]
 * @param {string} [options.className]
 * @param {string} [options.text] 文本内容（走 textContent，天然防注入）
 * @param {object} [options.attrs] 其他属性
 * @param {Array<Node>} [options.children] 子节点
 */
export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value !== undefined && value !== null) element.setAttribute(key, String(value));
    }
  }
  if (options.children) {
    for (const child of options.children) element.append(child);
  }
  return element;
}

/** 把一个函数延迟到「连续调用停止一段时间之后」才真正执行。 */
export function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };
}

/**
 * 把 ISO 8601 时间字符串格式化成「YYYY-MM-DD HH:mm:ss」本地时间。
 *
 * 注意：这只是时区与显示格式的转换，不是计算。
 * 后端统一以 UTC 存储时间，由前端按用户所在时区呈现，这是标准做法。
 */
export function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}
