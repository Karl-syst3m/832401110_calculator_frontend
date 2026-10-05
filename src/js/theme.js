/**
 * 主题切换（扩展功能）。
 *
 * 用 localStorage 记住用户选择是合理的：主题偏好属于「界面设置」，
 * 与作业要求「计算历史必须存后端数据库」并不冲突——
 * 历史记录一条都没有放在前端存储里。
 */

const STORAGE_KEY = 'calculator.theme';
const THEMES = ['light', 'dark'];

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : null;
  } catch {
    // 隐私模式下 localStorage 可能不可用，降级为「跟随系统」即可，不应报错。
    return null;
  }
}

function storeTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* 忽略写入失败 */
  }
}

function detectPreferredTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

let currentTheme = 'light';

export function getTheme() {
  return currentTheme;
}

export function setTheme(theme) {
  currentTheme = THEMES.includes(theme) ? theme : 'light';
  applyTheme(currentTheme);
  storeTheme(currentTheme);
}

export function toggleTheme() {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  return currentTheme;
}

/**
 * 初始化主题。
 * 优先级：用户显式选择 > 系统偏好。
 */
export function initTheme() {
  setTheme(readStoredTheme() ?? detectPreferredTheme());
  return currentTheme;
}

export default { initTheme, setTheme, toggleTheme, getTheme };
