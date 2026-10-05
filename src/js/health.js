/**
 * Backend health status indicator.
 *
 * This small component serves one clear demonstrative purpose:
 * it periodically calls GET /api/health and displays whether the backend is available directly in the UI.
 *
 * During the "stop the backend service" acceptance check, this indicator turns red immediately,
 * and the calculator panel then gives the explicit message "cannot connect to the backend service" —
 * which is exactly the intuitive proof that "the result really comes from the backend, and the frontend cannot compute it on its own".
 */

import { api } from './api.js';
import { config } from './config.js';
import { $ } from './dom.js';

export function createHealthIndicator() {
  const statusElement = $('#backend-status');
  const statusTextElement = $('#backend-status-text');

  let timerId = null;

  function setStatus(kind, text) {
    statusElement.classList.remove('status--unknown', 'status--ok', 'status--down');
    statusElement.classList.add(`status--${kind}`);
    statusTextElement.textContent = text;
  }

  async function check() {
    try {
      const response = await api.health();
      const historyCount = response.historyCount ?? 0;
      setStatus('ok', `Backend OK · ${historyCount} records`);
    } catch (error) {
      if (error.code === 'TIMEOUT') {
        setStatus('down', 'Backend timed out');
      } else {
        setStatus('down', 'Backend not connected');
      }
    }
  }

  return {
    start() {
      check();
      // setInterval keeps running even when the page is moved to the background, and for a health check that runs once every 30 seconds
      // the cost is negligible, so no extra visibility check is made.
      timerId = window.setInterval(check, config.healthCheckIntervalMs);
    },
    stop() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    },
    check,
  };
}

export default createHealthIndicator;
