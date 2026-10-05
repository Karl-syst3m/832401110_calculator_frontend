/**
 * Statistics panel view (extension feature).
 *
 * All metrics are aggregated by the backend with SQL and returned (GET /api/history/stats),
 * and the frontend is responsible only for laying the numbers out as cards. If operations such as averages and distinct counts were performed in the frontend,
 * the entire history would first have to be pulled into the browser, which would stutter as soon as the data volume grew,
 * and it would again become "the frontend doing the calculating".
 */

import { api } from './api.js';
import { describeError } from './errorMessages.js';
import { $, createElement, hide, show } from './dom.js';

export function createStatisticsView() {
  const gridElement = $('#statistics-grid');
  const errorElement = $('#statistics-error');
  const refreshButton = $('#statistics-refresh');

  /** Arrange the statistics into a list of cards. [label, value, whether to accent it] */
  function buildCards(stats) {
    const formatNumber = (value, digits = 2) =>
      value === null || value === undefined ? '—' : Number(value).toFixed(digits);

    return [
      ['Total records', String(stats.total), true],
      ['Calculations today', String(stats.today), false],
      ['Favorites', String(stats.favorites), false],
      ['Distinct expressions', String(stats.distinctExpressions), false],
      ['Average result', stats.averageResult === null ? '—' : formatNumber(stats.averageResult, 4), false],
      [
        'Most frequent',
        stats.mostFrequentExpression === null
          ? '—'
          : `${stats.mostFrequentExpression} (${stats.mostFrequentCount} times)`,
        false,
      ],
      ['First calculation', stats.firstAt === null ? '—' : stats.firstAt.replace('T', ' ').slice(0, 19), false],
      ['Latest calculation', stats.latestAt === null ? '—' : stats.latestAt.replace('T', ' ').slice(0, 19), false],
      ['Statistics time zone', stats.timezone ?? 'UTC', false],
    ];
  }

  function render(stats) {
    gridElement.replaceChildren();
    for (const [label, value, accent] of buildCards(stats)) {
      const card = createElement('div', { className: 'stat-card' });
      card.append(createElement('div', { className: 'stat-card__label', text: label }));
      card.append(
        createElement('div', {
          className: `stat-card__value${accent ? ' stat-card__value--accent' : ''}`,
          text: value,
        }),
      );
      gridElement.append(card);
    }
  }

  async function load() {
    hide(errorElement);
    refreshButton.disabled = true;
    try {
      const response = await api.statistics();
      render(response.stats);
    } catch (error) {
      gridElement.replaceChildren();
      errorElement.textContent = `Failed to load statistics: ${describeError(error)}`;
      show(errorElement);
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton?.addEventListener('click', load);

  return { load };
}

export default createStatisticsView;
