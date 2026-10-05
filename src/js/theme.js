/**
 * Theme switching (extension feature).
 *
 * Remembering the user's choice in localStorage is reasonable: a theme preference is a "UI setting",
 * and it does not conflict with the assignment requirement that "calculation history must be stored in the backend database" —
 * not a single history record is kept in frontend storage.
 */

const STORAGE_KEY = 'calculator.theme';
const THEMES = ['light', 'dark'];

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : null;
  } catch {
    // In private mode localStorage may be unavailable; falling back to "follow the system" is enough and must not raise an error.
    return null;
  }
}

function storeTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* Ignore a failed write */
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
 * Initialize the theme.
 * Priority: an explicit user choice > the system preference.
 */
export function initTheme() {
  setTheme(readStoredTheme() ?? detectPreferredTheme());
  return currentTheme;
}

export default { initTheme, setTheme, toggleTheme, getTheme };
