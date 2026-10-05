/**
 * Application entry point: wire the individual views together.
 *
 * The view modules do not reference each other directly; coordination is handled here:
 *   - after a successful calculation -> refresh the history list (so the new record appears immediately)
 *   - clicking "reuse" on a history record -> switch back to the calculator panel and fill in the expression
 *   - switching tabs -> lazy-load that panel's data on demand, instead of hitting four endpoints as soon as the page opens
 */

import { config } from './config.js';
import { $, $$ } from './dom.js';
import { initTheme, toggleTheme } from './theme.js';
import { createCalculatorView } from './calculatorView.js';
import { createHistoryView } from './historyView.js';
import { createConversionView } from './conversionView.js';
import { createStatisticsView } from './statisticsView.js';
import { createHealthIndicator } from './health.js';

/** Tab switching. */
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
  // ---- Theme ----
  initTheme();
  $('#theme-toggle')?.addEventListener('click', () => toggleTheme());

  // ---- Backend status ----
  const health = createHealthIndicator();
  health.start();

  // ---- Views ----
  const conversionView = createConversionView();
  const statisticsView = createStatisticsView();

  const calculatorView = createCalculatorView({
    onCalculationSaved: () => {
      // On a successful calculation -> send the history panel back to the first page to refetch, so the new record appears at the top.
      historyView.reloadFromStart();
    },
  });

  const historyView = createHistoryView({
    onReuseExpression: (expression) => {
      tabs.activate('calculator');
      calculatorView.setExpression(expression);
    },
    onHistoryChanged: () => {
      // After history is deleted or modified, the record count on the health indicator should update along with it.
      health.check();
    },
  });

  const tabs = setupTabs((tabName) => {
    // Lazy loading: data is requested only when that panel is actually switched to.
    if (tabName === 'history') historyView.load();
    if (tabName === 'statistics') statisticsView.load();
    if (tabName === 'calculator') calculatorView.focus();
  });

  // ---- Footer API address ----
  const apiDocsLink = $('#api-docs-link');
  if (apiDocsLink) {
    apiDocsLink.href = `${config.apiBaseUrl}/health`;
    apiDocsLink.textContent = `${config.apiBaseUrl}/health`;
  }

  // ---- First load ----
  await conversionView.init();
  await historyView.load();
  await statisticsView.load();
  calculatorView.focus();

  // Expose to the global scope for manual debugging in the browser console (for example __calculator.history.load()).
  window.__calculator = { config, calculatorView, historyView, conversionView, statisticsView, health };
}

main().catch((error) => {
  console.error('Frontend initialization failed:', error);
});
