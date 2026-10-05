/**
 * 应用入口：把各个视图装配起来。
 *
 * 各视图模块彼此不直接引用，由这里负责协调：
 *   - 计算成功后 -> 刷新历史列表（让新记录立刻出现）
 *   - 点击历史记录的「复用」-> 切回计算面板并填入表达式
 *   - 切换标签页 -> 按需懒加载该面板的数据，避免一进页面就打四个接口
 */

import { config } from './config.js';
import { $, $$ } from './dom.js';
import { initTheme, toggleTheme } from './theme.js';
import { createCalculatorView } from './calculatorView.js';
import { createHistoryView } from './historyView.js';
import { createConversionView } from './conversionView.js';
import { createStatisticsView } from './statisticsView.js';
import { createHealthIndicator } from './health.js';

/** 标签页切换。 */
function setupTabs(onTabActivated) {
  const tabButtons = $$('.tabs__item');
  const panels = $$('.panel');

  function activate(tabName) {
    for (const button of tabButtons) {
      const isActive = button.dataset.tab === tabName;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    }
    for (const panel of panels) {
      panel.classList.toggle('is-active', panel.id === `panel-${tabName}`);
    }
    onTabActivated?.(tabName);
  }

  for (const button of tabButtons) {
    button.addEventListener('click', () => activate(button.dataset.tab));
  }

  return { activate };
}

async function main() {
  // ---- 主题 ----
  initTheme();
  $('#theme-toggle')?.addEventListener('click', () => toggleTheme());

  // ---- 后端状态 ----
  const health = createHealthIndicator();
  health.start();

  // ---- 视图 ----
  const conversionView = createConversionView();
  const statisticsView = createStatisticsView();

  const calculatorView = createCalculatorView({
    onCalculationSaved: () => {
      // 计算成功 -> 让历史面板回到第一页重新拉取，新记录会出现在最上面。
      historyView.reloadFromStart();
    },
  });

  const historyView = createHistoryView({
    onReuseExpression: (expression) => {
      tabs.activate('calculator');
      calculatorView.setExpression(expression);
    },
    onHistoryChanged: () => {
      // 历史被删改后，健康指示器上的记录数也该跟着更新。
      health.check();
    },
  });

  const tabs = setupTabs((tabName) => {
    // 懒加载：只有真正切到该面板时才去请求数据。
    if (tabName === 'history') historyView.load();
    if (tabName === 'statistics') statisticsView.load();
    if (tabName === 'calculator') calculatorView.focus();
  });

  // ---- 页脚接口地址 ----
  const apiDocsLink = $('#api-docs-link');
  if (apiDocsLink) {
    apiDocsLink.href = `${config.apiBaseUrl}/health`;
    apiDocsLink.textContent = `${config.apiBaseUrl}/health`;
  }

  // ---- 首次加载 ----
  await conversionView.init();
  await historyView.load();
  await statisticsView.load();
  calculatorView.focus();

  // 暴露到全局，便于在浏览器控制台里手动调试（例如 __calculator.history.load()）。
  window.__calculator = { config, calculatorView, historyView, conversionView, statisticsView, health };
}

main().catch((error) => {
  console.error('前端初始化失败：', error);
});
