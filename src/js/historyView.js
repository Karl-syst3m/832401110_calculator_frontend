/**
 * 历史记录面板视图。
 *
 * 数据全部来自 GET /api/history，页面上不保留任何「本地副本作为数据源」。
 * 删除、收藏之后一律重新向后端拉取列表，而不是在前端数组里删掉那一项。
 * 这样做的原因：如果前端自己维护一份副本，一旦后端数据被别处改动
 * （比如切换到手机端删了一条），界面就会显示过期数据。
 *
 * 渲染安全性：所有用户可见文本都通过 textContent 写入，绝不使用 innerHTML。
 * 表达式是用户自由输入的字符串，若用 innerHTML 拼接，输入
 * `<img src=x onerror=alert(1)>` 就会在查看历史时触发脚本执行（XSS）。
 */

import { api } from './api.js';
import { describeError } from './errorMessages.js';
import { $, createElement, debounce, formatDateTime, hide, show } from './dom.js';
import { config } from './config.js';

export function createHistoryView({ onReuseExpression, onHistoryChanged } = {}) {
  const listElement = $('#history-list');
  const emptyElement = $('#history-empty');
  const summaryElement = $('#history-summary');

  const searchInput = $('#history-search');
  const favoriteOnlyInput = $('#history-favorite-only');
  const sortSelect = $('#history-sort');
  const pageSizeSelect = $('#history-page-size');
  const refreshButton = $('#history-refresh');
  const clearButton = $('#history-clear');
  const prevButton = $('#history-prev');
  const nextButton = $('#history-next');
  const pageInfoElement = $('#history-page-info');

  /** 当前查询状态。它与后端的查询参数一一对应。 */
  const state = {
    page: 1,
    pageSize: Number(pageSizeSelect.value) || 20,
    keyword: '',
    favoriteOnly: false,
    sortBy: 'createdAt',
    order: 'desc',
    total: 0,
    totalPages: 0,
  };

  /** 让「每页条数」在刷新后依然生效，但请求失败时不能污染界面状态。 */
  let lastRequestFailed = false;

  function renderError(error) {
    summaryElement.textContent = `加载失败：${describeError(error)}`;
    summaryElement.classList.add('is-error-text');
    lastRequestFailed = true;
  }

  function clearErrorStyle() {
    summaryElement.classList.remove('is-error-text');
    lastRequestFailed = false;
  }

  /** 渲染一条历史记录。 */
  function renderItem(item) {
    const itemElement = createElement('li', {
      className: `history-item${item.isFavorite ? ' is-favorite' : ''}`,
    });

    // ---- 左：id ----
    itemElement.append(
      createElement('span', { className: 'history-item__id', text: `#${item.id}` }),
    );

    // ---- 中：表达式与元信息 ----
    const body = createElement('div', { className: 'history-item__body' });
    body.append(
      createElement('div', {
        className: 'history-item__expression',
        text: item.expression,
      }),
    );

    const meta = createElement('div', { className: 'history-item__meta' });
    meta.append(createElement('span', { text: formatDateTime(item.createdAt) }));
    // 表达式被归一化过（例如用户输入 × 实际按 * 计算）时把归一化结果显示出来，
    // 这是排查「我明明输的是 × 为什么结果不对」这类问题的关键线索。
    if (item.normalizedExpression && item.normalizedExpression !== item.expression) {
      meta.append(
        createElement('span', { text: `归一化后：${item.normalizedExpression}` }),
      );
    }
    body.append(meta);
    itemElement.append(body);

    // ---- 右：结果 ----
    itemElement.append(
      createElement('span', {
        className: 'history-item__result',
        text: item.resultText ?? String(item.result),
      }),
    );

    // ---- 操作按钮 ----
    const actions = createElement('div', { className: 'history-item__actions' });

    const reuseButton = createElement('button', {
      className: 'icon-btn',
      text: '⤴',
      attrs: { type: 'button', title: '在计算面板中复用这个表达式' },
    });
    reuseButton.addEventListener('click', () => onReuseExpression?.(item.expression));

    const favoriteButton = createElement('button', {
      className: `icon-btn${item.isFavorite ? ' icon-btn--active' : ''}`,
      text: item.isFavorite ? '★' : '☆',
      attrs: {
        type: 'button',
        title: item.isFavorite ? '取消收藏' : '加入收藏',
      },
    });
    favoriteButton.addEventListener('click', async () => {
      favoriteButton.disabled = true;
      try {
        await api.setFavorite(item.id, !item.isFavorite);
        await load();
        onHistoryChanged?.();
      } catch (error) {
        renderError(error);
        favoriteButton.disabled = false;
      }
    });

    const deleteButton = createElement('button', {
      className: 'icon-btn icon-btn--danger',
      text: '🗑',
      attrs: { type: 'button', title: `删除第 ${item.id} 条记录` },
    });
    deleteButton.addEventListener('click', async () => {
      deleteButton.disabled = true;
      try {
        await api.deleteHistory(item.id);
        // 删除之后重新向后端要一次列表。
        // 如果这一页被删空了（比如删除最后一条），自动回退一页，避免停在空白页。
        if (listElement.children.length === 1 && state.page > 1) {
          state.page -= 1;
        }
        await load();
        onHistoryChanged?.();
      } catch (error) {
        renderError(error);
        deleteButton.disabled = false;
      }
    });

    actions.append(reuseButton, favoriteButton, deleteButton);
    itemElement.append(actions);

    return itemElement;
  }

  function renderList(items) {
    listElement.replaceChildren();
    for (const item of items) {
      listElement.append(renderItem(item));
    }
    if (items.length === 0) {
      show(emptyElement);
    } else {
      hide(emptyElement);
    }
  }

  function renderSummary(data) {
    if (data.total === 0) {
      summaryElement.textContent =
        state.keyword !== '' || state.favoriteOnly ? '没有匹配的记录。' : '暂无计算记录。';
      return;
    }
    const rangeStart = (data.page - 1) * data.pageSize + 1;
    const rangeEnd = Math.min(data.page * data.pageSize, data.total);
    const extra = data.filters?.keyword ? `，关键词「${data.filters.keyword}」` : '';
    const favoriteExtra = data.filters?.favoriteOnly ? '，仅收藏' : '';
    summaryElement.textContent =
      `共 ${data.total} 条记录，当前显示第 ${rangeStart}–${rangeEnd} 条` +
      `（第 ${data.page} / ${Math.max(data.totalPages, 1)} 页）${extra}${favoriteExtra}`;
  }

  function renderPagination(data) {
    prevButton.disabled = data.page <= 1;
    nextButton.disabled = data.totalPages === 0 || data.page >= data.totalPages;
    pageInfoElement.textContent =
      data.totalPages === 0 ? '第 0 页 / 共 0 页' : `第 ${data.page} 页 / 共 ${data.totalPages} 页`;
  }

  /** 向后端拉取历史记录并渲染。 */
  async function load() {
    try {
      const data = await api.listHistory({
        page: state.page,
        pageSize: state.pageSize,
        keyword: state.keyword,
        favoriteOnly: state.favoriteOnly ? 'true' : '',
        sortBy: state.sortBy,
        order: state.order,
      });

      clearErrorStyle();
      state.total = data.total;
      state.totalPages = data.totalPages;

      // 删到最后一条时后端可能返回空页，这里把页码拉回到有效范围再请求一次。
      if (data.items.length === 0 && data.total > 0 && data.page > data.totalPages) {
        state.page = Math.max(data.totalPages, 1);
        return load();
      }

      renderList(data.items);
      renderSummary(data);
      renderPagination(data);
      return data;
    } catch (error) {
      renderError(error);
      renderList([]);
      pageInfoElement.textContent = '—';
      prevButton.disabled = true;
      nextButton.disabled = true;
      return null;
    }
  }

  // ---- 事件绑定 ----

  // 搜索用防抖：每敲一个字就发一次请求既浪费也没必要。
  searchInput?.addEventListener(
    'input',
    debounce(() => {
      state.keyword = searchInput.value.trim();
      state.page = 1;
      load();
    }, config.searchDebounceMs),
  );

  favoriteOnlyInput?.addEventListener('change', () => {
    state.favoriteOnly = favoriteOnlyInput.checked;
    state.page = 1;
    load();
  });

  sortSelect?.addEventListener('change', () => {
    const [sortBy, order] = sortSelect.value.split(':');
    state.sortBy = sortBy;
    state.order = order;
    state.page = 1;
    load();
  });

  pageSizeSelect?.addEventListener('change', () => {
    state.pageSize = Number(pageSizeSelect.value) || 20;
    state.page = 1;
    load();
  });

  refreshButton?.addEventListener('click', () => load());

  prevButton?.addEventListener('click', () => {
    if (state.page > 1) {
      state.page -= 1;
      load();
    }
  });

  nextButton?.addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page += 1;
      load();
    }
  });

  clearButton?.addEventListener('click', async () => {
    if (state.total === 0) {
      summaryElement.textContent = '当前没有记录需要清空。';
      return;
    }
    // 清空是不可逆操作，必须让用户二次确认。
    const confirmed = window.confirm(
      `确定要清空全部 ${state.total} 条历史记录吗？此操作不可撤销，记录将从后端数据库中永久删除。`,
    );
    if (!confirmed) return;

    clearButton.disabled = true;
    try {
      await api.clearHistory();
      state.page = 1;
      await load();
      onHistoryChanged?.();
    } catch (error) {
      renderError(error);
    } finally {
      clearButton.disabled = false;
    }
  });

  return {
    load,
    /** 重新从第一页加载（计算成功后调用） */
    async reloadFromStart() {
      state.page = 1;
      return load();
    },
    getState() {
      return { ...state, lastRequestFailed };
    },
  };
}

export default createHistoryView;
