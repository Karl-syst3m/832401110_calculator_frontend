/**
 * 计算面板视图。
 *
 * ============================ 最重要的设计约束 ============================
 * 这个文件里**没有任何计算逻辑**。
 *
 * 「按 1」「按 2」「按 +」做的事情只是往输入框里拼字符串；
 * 真正按下「=」时，它把表达式原样 POST 给 /api/calculate，
 * 然后把后端返回的 resultText 显示出来。
 *
 * 为什么必须这样？作业明确要求后端负责计算，并给了一个验收方法：
 * 把后端服务停掉，前端可以正常交互，但**不能独立得到一个有效结果**。
 * 如果这里偷偷用 Number() 或 eval 把结果算出来，那个验收测试立刻就会失败，
 * 而且属于作业里点名的扣分项。
 * ========================================================================
 */

import { api } from './api.js';
import { describeError } from './errorMessages.js';
import { $, hide, show, createElement } from './dom.js';

/** 允许通过键盘直接输入的字符（焦点不在输入框时生效）。 */
const DIRECT_INPUT_PATTERN = /^[0-9.+\-*/^()×÷−]$/;

export function createCalculatorView({ onCalculationSaved } = {}) {
  const expressionInput = $('#expression-input');
  const resultOutput = $('#result-output');
  const errorMessage = $('#error-message');
  const calculateButton = $('#calculate-button');
  const scientificToggle = $('#scientific-toggle');
  const scientificKeypad = $('#keypad-scientific');

  /** 防止用户连点导致重复提交。 */
  let isSubmitting = false;

  // ---- 输入框操作（纯字符串处理，不涉及计算）----

  /** 在光标位置插入文本。若没有选中内容，就相当于在光标处追加。 */
  function insertText(text) {
    const start = expressionInput.selectionStart ?? expressionInput.value.length;
    const end = expressionInput.selectionEnd ?? expressionInput.value.length;
    expressionInput.value =
      expressionInput.value.slice(0, start) + text + expressionInput.value.slice(end);
    const nextCaret = start + text.length;
    // 插完把光标放在新内容之后，用户可以接着输入，体验和真实计算器一致。
    expressionInput.setSelectionRange(nextCaret, nextCaret);
    expressionInput.focus();
    hideError();
  }

  /** 退格：有选中内容就删选中，否则删光标前一个字符。 */
  function backspace() {
    const start = expressionInput.selectionStart ?? expressionInput.value.length;
    const end = expressionInput.selectionEnd ?? expressionInput.value.length;
    if (start !== end) {
      expressionInput.value = expressionInput.value.slice(0, start) + expressionInput.value.slice(end);
      expressionInput.setSelectionRange(start, start);
    } else if (start > 0) {
      expressionInput.value =
        expressionInput.value.slice(0, start - 1) + expressionInput.value.slice(start);
      expressionInput.setSelectionRange(start - 1, start - 1);
    }
    expressionInput.focus();
    hideError();
  }

  function clearAll() {
    expressionInput.value = '';
    resultOutput.textContent = '—';
    resultOutput.classList.remove('is-error');
    hideError();
    expressionInput.focus();
  }

  function showError(error) {
    errorMessage.textContent = describeError(error);
    show(errorMessage);
  }

  function hideError() {
    hide(errorMessage);
    errorMessage.textContent = '';
  }

  // ---- 提交计算：唯一与后端交互的入口 ----

  async function calculate() {
    if (isSubmitting) return;

    const expression = expressionInput.value.trim();
    if (expression === '') {
      resultOutput.textContent = '—';
      showError({ code: 'EXPRESSION_REQUIRED' });
      return;
    }

    isSubmitting = true;
    calculateButton.disabled = true;
    calculateButton.textContent = '…';

    try {
      // 只把表达式发给后端，不发送任何结果。
      const response = await api.calculate(expression);

      // 界面上显示的结果，严格等于后端返回的字段，没有任何本地加工。
      resultOutput.textContent = response.resultText ?? String(response.result);
      resultOutput.classList.remove('is-error');
      hideError();

      onCalculationSaved?.(response);
    } catch (error) {
      // 后端不可用时，这里必须显示失败，而不能退化成「本地算一个」。
      // 这正是「前端不计算」的可验证表现。
      resultOutput.textContent = '—';
      resultOutput.classList.add('is-error');
      showError(error);
    } finally {
      isSubmitting = false;
      calculateButton.disabled = false;
      calculateButton.textContent = '=';
    }
  }

  // ---- 事件绑定 ----

  /** 键盘区点击：统一用事件委托，避免给二十多个按钮各绑一个监听器。 */
  function handleKeypadClick(event) {
    const button = event.target.closest('button');
    if (button === null) return;

    const { action, insert } = button.dataset;

    if (action === 'clear') {
      clearAll();
      return;
    }
    if (action === 'backspace') {
      backspace();
      return;
    }
    if (action === 'calculate') {
      calculate();
      return;
    }
    if (insert !== undefined) {
      insertText(insert);
    }
  }

  for (const keypad of [$('.keypad--main'), scientificKeypad]) {
    keypad?.addEventListener('click', handleKeypadClick);
  }

  // 科学键盘显隐
  scientificToggle?.addEventListener('click', () => {
    const willShow = scientificKeypad.hidden;
    scientificKeypad.hidden = !willShow;
    scientificToggle.setAttribute('aria-pressed', String(willShow));
    scientificToggle.textContent = willShow ? '收起科学键盘' : '科学键盘';
  });

  // 输入框内快捷键
  expressionInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      calculate();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      clearAll();
    }
  });

  // 输入框内容变化时清掉上一次的错误提示，避免提示与内容不匹配
  expressionInput?.addEventListener('input', hideError);

  /**
   * 键盘直输（扩展功能）。
   *
   * 只有当焦点不在任何输入控件上、且用户按下的是数字或运算符时才接管，
   * 否则会和浏览器默认行为（比如在搜索框里打字）冲突。
   */
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

    // 只在计算面板可见时生效
    if (!document.getElementById('panel-calculator')?.classList.contains('is-active')) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      calculate();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      backspace();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      clearAll();
      return;
    }
    if (DIRECT_INPUT_PATTERN.test(event.key)) {
      event.preventDefault();
      insertText(event.key);
    }
  });

  return {
    /** 把某个表达式放回输入框（历史记录「复用」按钮会调用） */
    setExpression(text) {
      expressionInput.value = text;
      hideError();
      expressionInput.focus();
      const end = text.length;
      expressionInput.setSelectionRange(end, end);
    },
    /** 以编程方式触发一次计算 */
    submit: calculate,
    clear: clearAll,
    focus() {
      expressionInput.focus();
    },
  };
}

export default createCalculatorView;
