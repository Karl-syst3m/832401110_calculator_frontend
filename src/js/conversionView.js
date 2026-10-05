/**
 * 换算面板视图（扩展功能）。
 *
 * 关键点：进制换算与单位换算**都调用后端接口**，前端不做任何数值换算。
 *   进制换算 -> POST /api/convert/base
 *   单位换算 -> POST /api/convert/unit
 *   单位清单 -> GET  /api/convert/units
 *
 * 单位下拉框的内容完全由后端返回，前端不硬编码任何单位表。
 * 这样「换算规则」只有后端这一个事实来源，不存在前后端规则不一致的可能。
 */

import { api } from './api.js';
import { describeError } from './errorMessages.js';
import { $, hide, show, createElement } from './dom.js';

/** 进制下拉框的候选值。用常见进制而不是 2–36 全列，避免下拉框过长难选。 */
const BASE_OPTIONS = [
  { value: 2, label: '二进制（2）' },
  { value: 8, label: '八进制（8）' },
  { value: 10, label: '十进制（10）' },
  { value: 16, label: '十六进制（16）' },
  { value: 32, label: '三十二进制（32）' },
  { value: 36, label: '三十六进制（36）' },
];

export function createConversionView() {
  // ---- 进制换算相关元素 ----
  const baseValueInput = $('#base-value');
  const baseFromSelect = $('#base-from');
  const baseToSelect = $('#base-to');
  const baseConvertButton = $('#base-convert');
  const baseSwapButton = $('#base-swap');
  const baseResultOutput = $('#base-result');
  const baseErrorElement = $('#base-error');

  // ---- 单位换算相关元素 ----
  const unitCategorySelect = $('#unit-category');
  const unitValueInput = $('#unit-value');
  const unitFromSelect = $('#unit-from');
  const unitToSelect = $('#unit-to');
  const unitConvertButton = $('#unit-convert');
  const unitSwapButton = $('#unit-swap');
  const unitResultOutput = $('#unit-result');
  const unitErrorElement = $('#unit-error');

  /** 后端返回的单位类别清单，供切换类别时重建下拉框。 */
  let unitCategories = [];

  function fillSelect(select, options, selectedValue) {
    select.replaceChildren();
    for (const option of options) {
      const element = createElement('option', {
        text: option.label,
        attrs: { value: String(option.value) },
      });
      if (String(option.value) === String(selectedValue)) element.selected = true;
      select.append(element);
    }
  }

  function showError(element, error) {
    element.textContent = describeError(error);
    show(element);
  }

  function hideError(element) {
    hide(element);
    element.textContent = '';
  }

  // ============================ 进制换算 ============================

  function initBaseSelects() {
    fillSelect(baseFromSelect, BASE_OPTIONS, 10);
    fillSelect(baseToSelect, BASE_OPTIONS, 2);
  }

  async function convertBase() {
    hideError(baseErrorElement);
    baseConvertButton.disabled = true;
    try {
      const response = await api.convertBase({
        value: baseValueInput.value,
        fromBase: Number(baseFromSelect.value),
        toBase: Number(baseToSelect.value),
      });
      baseResultOutput.textContent = response.output;
    } catch (error) {
      baseResultOutput.textContent = '—';
      showError(baseErrorElement, error);
    } finally {
      baseConvertButton.disabled = false;
    }
  }

  // ============================ 单位换算 ============================

  /** 根据当前类别重建源单位与目标单位下拉框。 */
  function refreshUnitSelects() {
    const category = unitCategories.find((item) => item.key === unitCategorySelect.value);
    if (category === undefined) return;

    const options = category.units.map((unit) => ({ value: unit.key, label: unit.label }));
    // 默认选中前两个不同单位，避免出现「源和目标相同」这种无意义的初始状态。
    const defaultFrom = options[0]?.value ?? '';
    const defaultTo = options[1]?.value ?? options[0]?.value ?? '';

    fillSelect(unitFromSelect, options, defaultFrom);
    fillSelect(unitToSelect, options, defaultTo);
  }

  async function loadUnits() {
    try {
      const response = await api.listUnits();
      unitCategories = response.categories ?? [];

      fillSelect(
        unitCategorySelect,
        unitCategories.map((category) => ({ value: category.key, label: category.label })),
        'length',
      );
      refreshUnitSelects();
    } catch (error) {
      showError(unitErrorElement, error);
    }
  }

  async function convertUnit() {
    hideError(unitErrorElement);
    unitConvertButton.disabled = true;
    try {
      const response = await api.convertUnit({
        category: unitCategorySelect.value,
        from: unitFromSelect.value,
        to: unitToSelect.value,
        value: unitValueInput.value,
      });
      unitResultOutput.textContent = response.outputText ?? String(response.output);
    } catch (error) {
      unitResultOutput.textContent = '—';
      showError(unitErrorElement, error);
    } finally {
      unitConvertButton.disabled = false;
    }
  }

  // ---- 事件绑定 ----
  baseConvertButton?.addEventListener('click', convertBase);
  baseSwapButton?.addEventListener('click', () => {
    const from = baseFromSelect.value;
    baseFromSelect.value = baseToSelect.value;
    baseToSelect.value = from;
    // 交换进制后顺手重算一次，省得用户再点一下「换算」。
    convertBase();
  });
  baseValueInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') convertBase();
  });

  unitCategorySelect?.addEventListener('change', refreshUnitSelects);
  unitConvertButton?.addEventListener('click', convertUnit);
  unitSwapButton?.addEventListener('click', () => {
    const from = unitFromSelect.value;
    unitFromSelect.value = unitToSelect.value;
    unitToSelect.value = from;
    convertUnit();
  });
  unitValueInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') convertUnit();
  });

  return {
    async init() {
      initBaseSelects();
      await loadUnits();
    },
    reloadUnits: loadUnits,
  };
}

export default createConversionView;
