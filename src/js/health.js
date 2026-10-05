/**
 * 后端健康状态指示器。
 *
 * 这个小组件承担一个明确的证明作用：
 * 它周期性调用 GET /api/health，把后端是否可用直接显示在界面上。
 *
 * 在做「停掉后端服务」这项验收时，这个指示灯会立刻变红，
 * 同时计算面板给出「无法连接后端服务」的明确提示——
 * 这正好直观地证明了「结果确实来自后端，前端自己算不出来」。
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
      setStatus('ok', `后端正常 · ${historyCount} 条记录`);
    } catch (error) {
      if (error.code === 'TIMEOUT') {
        setStatus('down', '后端超时');
      } else {
        setStatus('down', '后端未连接');
      }
    }
  }

  return {
    start() {
      check();
      // setInterval 在页面被切到后台时仍会运行，对一个 30 秒一次的健康检查来说
      // 开销可以忽略，因此不额外做可见性判断。
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
