/**
 * Minimal DOM helper functions.
 *
 * A dozen or so modules in the frontend need to fetch elements, and writing
 * document.querySelector once per module is both verbose and easy to get the selector wrong in.
 * Only the four most common operations are wrapped here, and a "jQuery-like" chained wrapper is deliberately avoided:
 * the native DOM API is already enough, and another layer of abstraction would only make people learn one more set of rules.
 */

/** Get a single element. */
export function $(selector, root = document) {
  return root.querySelector(selector);
}

/** Get multiple elements and return a real array (a NodeList lacks part of the map/filter methods). */
export function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/** Show an element (used together with the HTML hidden attribute). */
export function show(element) {
  if (element) element.hidden = false;
}

/** Hide an element. */
export function hide(element) {
  if (element) element.hidden = true;
}

/**
 * Create an element.
 * @param {string} tagName tag name
 * @param {object} [options]
 * @param {string} [options.className]
 * @param {string} [options.text] text content (goes through textContent, which prevents injection by nature)
 * @param {object} [options.attrs] other attributes
 * @param {Array<Node>} [options.children] child nodes
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

/** Delay a function until "a run of consecutive calls has stopped for a period of time". */
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
 * Format an ISO 8601 time string as local time in "YYYY-MM-DD HH:mm:ss".
 *
 * Note: this is only a conversion of time zone and display format, not a calculation.
 * The backend stores times uniformly in UTC and the frontend presents them in the user's time zone, which is standard practice.
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
