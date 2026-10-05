/**
 * 统计面板视图（扩展功能）。
 *
 * 所有指标都由后端用 SQL 聚合后返回（GET /api/history/stats），
 * 前端只负责把数字摆放成卡片。平均值、去重计数这类运算若放在前端做，
 * 就必须先把全部历史记录拉到浏览器里，数据量一大就会卡，
 * 而且又变成了「前端在算」。
 */

import { api } from './api.js';
import { describeError } from './errorMessages.js';
import { $, createElement, hide, show } from './dom.js';

export function createStatisticsView() {
  const gridElement = $('#statistics-grid');
  const errorElement = $('#statistics-error');
  const refreshButton = $('#statistics-refresh');

  /** 把统计结果整理成卡片列表。[标签, 数值, 是否强调] */
  function buildCards(stats) {
    const formatNumber = (value, digits = 2) =>
      value === null || value === undefined ? '—' : Number(value).toFixed(digits);

    return [
      ['总记录数', String(stats.total), true],
      ['今日计算', String(stats.today), false],
      ['收藏数量', String(stats.favorites), false],
      ['不同表达式', String(stats.distinctExpressions), false],
      ['结果平均值', stats.averageResult === null ? '—' : formatNumber(stats.averageResult, 4), false],
      [
        '最常计算',
        stats.mostFrequentExpression === null
          ? '—'
          : `${stats.mostFrequentExpression}（${stats.mostFrequentCount} 次）`,
        false,
      ],
      ['首次计算', stats.firstAt === null ? '—' : stats.firstAt.replace('T', ' ').slice(0, 19), false],
      ['最近计算', stats.latestAt === null ? '—' : stats.latestAt.replace('T', ' ').slice(0, 19), false],
      ['统计时区', stats.timezone ?? 'UTC', false],
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
      errorElement.textContent = `统计加载失败：${describeError(error)}`;
      show(errorElement);
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton?.addEventListener('click', load);

  return { load };
}

export default createStatisticsView;
