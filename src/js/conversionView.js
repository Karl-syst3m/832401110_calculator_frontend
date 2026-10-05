/**
 * Conversion panel view (extension feature).
 *
 * Key point: base conversion and unit conversion **both call the backend API**, and the frontend performs no numeric conversion at all.
 *   Base conversion -> POST /api/convert/base
 *   Unit conversion -> POST /api/convert/unit
 *   Unit list -> GET  /api/convert/units
 *
 * The contents of the unit dropdown are returned entirely by the backend, and the frontend hard-codes no unit table.
 * This way "the conversion rules" have the backend as their single source of truth, so the frontend and backend rules can never disagree.
 */

import { api } from './api.js';
import { describeError } from './errorMessages.js';
import { $, hide, show, createElement } from './dom.js';

/** Candidate values for the base dropdown. Common bases are used instead of the full 2–36 range, so the dropdown does not become too long to choose from. */
const BASE_OPTIONS = [
  { value: 2, label: 'Binary (2)' },
  { value: 8, label: 'Octal (8)' },
  { value: 10, label: 'Decimal (10)' },
  { value: 16, label: 'Hexadecimal (16)' },
  { value: 32, label: 'Base 32 (32)' },
  { value: 36, label: 'Base 36 (36)' },
];

export function createConversionView() {
  // ---- Base conversion elements ----
  const baseValueInput = $('#base-value');
  const baseFromSelect = $('#base-from');
  const baseToSelect = $('#base-to');
  const baseConvertButton = $('#base-convert');
  const baseSwapButton = $('#base-swap');
  const baseResultOutput = $('#base-result');
  const baseErrorElement = $('#base-error');

  // ---- Unit conversion elements ----
  const unitCategorySelect = $('#unit-category');
  const unitValueInput = $('#unit-value');
  const unitFromSelect = $('#unit-from');
  const unitToSelect = $('#unit-to');
  const unitConvertButton = $('#unit-convert');
  const unitSwapButton = $('#unit-swap');
  const unitResultOutput = $('#unit-result');
  const unitErrorElement = $('#unit-error');

  /** The list of unit categories returned by the backend, used to rebuild the dropdowns when the category changes. */
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

  // ============================ Base conversion ============================

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

  // ============================ Unit conversion ============================

  /** Rebuild the source-unit and target-unit dropdowns for the current category. */
  function refreshUnitSelects() {
    const category = unitCategories.find((item) => item.key === unitCategorySelect.value);
    if (category === undefined) return;

    const options = category.units.map((unit) => ({ value: unit.key, label: unit.label }));
    // Default to the first two distinct units, avoiding a meaningless initial state where "source and target are the same".
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

  // ---- Event binding ----
  baseConvertButton?.addEventListener('click', convertBase);
  baseSwapButton?.addEventListener('click', () => {
    const from = baseFromSelect.value;
    baseFromSelect.value = baseToSelect.value;
    baseToSelect.value = from;
    // Recalculate right after swapping the bases, saving the user from clicking "Convert" a second time.
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
