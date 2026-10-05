/**
 * History panel view.
 *
 * All data comes from GET /api/history, and no "local copy serving as a data source" is kept on the page.
 * After a deletion or a favorite toggle the list is always fetched from the backend again, rather than removing that entry from a frontend array.
 * The reason for doing this: if the frontend maintained its own copy, then as soon as the backend data were changed somewhere else
 * (for example deleting one entry by switching to the mobile client), the UI would display stale data.
 *
 * Rendering safety: all user-visible text is written through textContent, and innerHTML is never used.
 * An expression is a string the user entered freely; if it were concatenated with innerHTML, inputting
 * `<img src=x onerror=alert(1)>` would trigger script execution (XSS) while the history is being viewed.
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

  /** The current query state. It corresponds one-to-one to the backend query parameters. */
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

  /** Keep "items per page" in effect after a refresh, but a failed request must not pollute the UI state. */
  let lastRequestFailed = false;

  function renderError(error) {
    summaryElement.textContent = `Failed to load: ${describeError(error)}`;
    summaryElement.classList.add('is-error-text');
    lastRequestFailed = true;
  }

  function clearErrorStyle() {
    summaryElement.classList.remove('is-error-text');
    lastRequestFailed = false;
  }

  /** Render one history record. */
  function renderItem(item) {
    const itemElement = createElement('li', {
      className: `history-item${item.isFavorite ? ' is-favorite' : ''}`,
    });

    // ---- Left: id ----
    itemElement.append(
      createElement('span', { className: 'history-item__id', text: `#${item.id}` }),
    );

    // ---- Middle: expression and metadata ----
    const body = createElement('div', { className: 'history-item__body' });
    body.append(
      createElement('div', {
        className: 'history-item__expression',
        text: item.expression,
      }),
    );

    const meta = createElement('div', { className: 'history-item__meta' });
    meta.append(createElement('span', { text: formatDateTime(item.createdAt) }));
    // When the expression has been normalized (for example the user types × but it is actually computed as *), display the normalized form,
    // which is the key clue for investigating problems such as "I definitely typed ×, so why is the result wrong?".
    if (item.normalizedExpression && item.normalizedExpression !== item.expression) {
      meta.append(
        createElement('span', { text: `Normalized: ${item.normalizedExpression}` }),
      );
    }
    body.append(meta);
    itemElement.append(body);

    // ---- Right: result ----
    itemElement.append(
      createElement('span', {
        className: 'history-item__result',
        text: item.resultText ?? String(item.result),
      }),
    );

    // ---- Action buttons ----
    const actions = createElement('div', { className: 'history-item__actions' });

    const reuseButton = createElement('button', {
      className: 'icon-btn',
      text: '⤴',
      attrs: { type: 'button', title: 'Reuse this expression in the calculator panel' },
    });
    reuseButton.addEventListener('click', () => onReuseExpression?.(item.expression));

    const favoriteButton = createElement('button', {
      className: `icon-btn${item.isFavorite ? ' icon-btn--active' : ''}`,
      text: item.isFavorite ? '★' : '☆',
      attrs: {
        type: 'button',
        title: item.isFavorite ? 'Remove from favorites' : 'Add to favorites',
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
      attrs: { type: 'button', title: `Delete record ${item.id}` },
    });
    deleteButton.addEventListener('click', async () => {
      deleteButton.disabled = true;
      try {
        await api.deleteHistory(item.id);
        // After deleting, ask the backend for the list once more.
        // If this page was emptied by deletions (for example the last entry was deleted), step back one page automatically, so the user does not sit on a blank page.
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
        state.keyword !== '' || state.favoriteOnly ? 'No matching records.' : 'No calculation records yet.';
      return;
    }
    const rangeStart = (data.page - 1) * data.pageSize + 1;
    const rangeEnd = Math.min(data.page * data.pageSize, data.total);
    const extra = data.filters?.keyword ? `, keyword "${data.filters.keyword}"` : '';
    const favoriteExtra = data.filters?.favoriteOnly ? ', favorites only' : '';
    summaryElement.textContent =
      `Showing ${rangeStart}–${rangeEnd} of ${data.total} records` +
      ` (page ${data.page} / ${Math.max(data.totalPages, 1)})${extra}${favoriteExtra}`;
  }

  function renderPagination(data) {
    prevButton.disabled = data.page <= 1;
    nextButton.disabled = data.totalPages === 0 || data.page >= data.totalPages;
    pageInfoElement.textContent =
      data.totalPages === 0 ? 'Page 0 / 0' : `Page ${data.page} / ${data.totalPages}`;
  }

  /** Fetch the history records from the backend and render them. */
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

      // When the last record is deleted the backend may return an empty page; pull the page number back into the valid range and request once more.
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

  // ---- Event binding ----

  // Debounce the search: sending a request on every single keystroke is both wasteful and unnecessary.
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
      summaryElement.textContent = 'There are no records to clear.';
      return;
    }
    // Clearing is an irreversible operation, so the user must confirm a second time.
    const confirmed = window.confirm(
      `Clear all ${state.total} history records? This operation cannot be undone, and the records will be permanently deleted from the backend database.`,
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
    /** Reload from the first page (called after a successful calculation) */
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
