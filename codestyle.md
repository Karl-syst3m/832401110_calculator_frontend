# 前端代码规范（Calculator Frontend Codestyle）

## 规范来源

本文档的规范依据以下公开标准，并按本项目的技术栈（原生 HTML / CSS / JavaScript）做了取舍与细化：

| 来源 | 版本 / 链接 | 采用范围 |
| --- | --- | --- |
| **Google JavaScript Style Guide** | https://google.github.io/styleguide/jsguide.html | **主要依据**。命名、格式、模块、注释、语言特性限制 |
| **Airbnb JavaScript Style Guide** | https://github.com/airbnb/javascript | 在 Google 指南未覆盖处补充（解构、数组方法、相等比较） |
| **BEM 命名约定** | https://getbem.com/naming/ | **CSS 类名规范** |
| **CSS Guidelines**（Harry Roberts） | https://cssguidelin.es/ | CSS 组织方式、选择器深度、特异性控制 |
| **HTML Living Standard**（WHATWG） | https://html.spec.whatwg.org/ | 语义标签选择、表单元素用法 |
| **MDN Web Docs** | https://developer.mozilla.org/ | Web API 语义确认、安全实践 |
| **WCAG 2.1 AA** | https://www.w3.org/TR/WCAG21/ | 可访问性最低要求（焦点可见、对比度、ARIA） |
| **Conventional Commits** | https://www.conventionalcommits.org/ | 提交信息格式 |

**与 Google 指南的差异说明**：

1. **JS 与 CSS 的注释使用中文**。读者是中文母语者；标识符与面向用户的英文内容保持英文。
2. **CSS 采用 BEM 而非 Google 的类名建议**。Google 指南对 CSS 着墨较少，
   而 BEM 的层级语义与「块-元素-修饰符」的组件划分更契合本项目的界面结构。
3. **不强制 JSDoc 标注全部类型**。无 TypeScript；对契约不直观的函数（`api.js`、
   各 View 工厂函数）写 JSDoc，其余只写说明性注释。

---

## 目录

- [1. JavaScript 规范](#1-javascript-规范)
- [2. CSS 规范](#2-css-规范)
- [3. HTML 规范](#3-html-规范)
- [4. 安全规范](#4-安全规范)
- [5. 前后端边界规范](#5-前后端边界规范)
- [6. 可访问性规范](#6-可访问性规范)
- [7. Git 提交规范](#7-git-提交规范)
- [8. 提交前检查清单](#8-提交前检查清单)

---

## 1. JavaScript 规范

### 1.1 文件与模块

- 使用 **ES Module**（`import` / `export`），不使用 `require`
- 一个文件一个视图或一个工具模块，文件名 `lowerCamelCase.js`
- 相对导入**必须写明 `.js` 扩展名**（浏览器 ESM 要求）

```javascript
import { api } from './api.js';        // ✅
import { api } from './api';           // ❌ 浏览器加载失败
```

- **每个模块只暴露必要的接口**；内部辅助函数不导出

### 1.2 命名

| 对象 | 风格 | 示例 |
| --- | --- | --- |
| 变量、函数 | `lowerCamelCase` | `expressionInput`、`renderItem` |
| 常量 | `UPPER_SNAKE_CASE` | `BASE_OPTIONS`、`DIRECT_INPUT_PATTERN` |
| 类 | `UpperCamelCase` | `ApiError` |
| DOM 元素的变量名 | 以 `Element` 结尾，或加 `Button`/`Input` 等后缀 | `summaryElement`、`refreshButton` |
| 事件处理函数 | `handle` + 事件 | `handleKeypadClick` |
| 布尔变量 | `is` / `has` / `will` / `should` 开头 | `isSubmitting`、`lastRequestFailed` |
| 私有模块变量 | 不导出即可，不加 `_` 前缀 | — |

```javascript
// ✅ 好：从变量名就能知道它是个 DOM 元素还是普通数据
const statusTextElement = $('#backend-status-text');
const historyState = { page: 1, pageSize: 20 };

// ❌ 差
const el = $('#backend-status-text');
const d = { p: 1, s: 20 };
```

### 1.3 格式

- 缩进 **2 个空格**
- 单行不超过 **100 字符**
- **必须写分号**
- 字符串用**单引号**；需要插值时用模板字符串
- 多行数组与对象保留**尾随逗号**
- 文件末尾留一个换行符

### 1.4 语言特性

**禁止**

| 特性 | 原因 |
| --- | --- |
| `eval()` / `new Function()` | 任意代码执行，安全漏洞；本项目明令禁止 |
| `innerHTML` 拼接用户数据 | XSS 注入 |
| `var` | 用 `const` / `let` |
| `==` / `!=` | 用 `===` / `!==` |
| `document.write()` | 会阻塞解析，且在模块中行为不确定 |
| 全局变量污染 | 除 `window.__calculator`（调试用）与 `window.__CALCULATOR_CONFIG__` 外不挂全局 |

**推荐**

```javascript
// const 优先，需要重新赋值才用 let
const items = [];

// 解构
const { code, message } = error;

// 可选链与空值合并
const text = response?.resultText ?? String(response.result);

// 事件委托代替逐个绑定
keypad.addEventListener('click', handleKeypadClick);
```

### 1.5 注释

注释解释**为什么**，不解释**是什么**：

```javascript
// ✅ 有价值：说明了非显然的原因
// 插完把光标放在新内容之后，用户可以接着输入，体验和真实计算器一致。
expressionInput.setSelectionRange(nextCaret, nextCaret);

// ❌ 无价值：代码本身已经说清楚
// 设置光标位置
expressionInput.setSelectionRange(nextCaret, nextCaret);
```

安全相关的代码**必须**写明防御对象：

```javascript
// 所有用户可见文本都通过 textContent 写入，绝不使用 innerHTML。
// 表达式是用户自由输入的字符串，若用 innerHTML 拼接，输入
// `<img src=x onerror=alert(1)>` 就会在查看历史时触发 XSS。
```

### 1.6 函数设计

- 单个函数建议不超过 **50 行**
- 参数超过 3 个时改用对象参数
- 视图模块一律用**工厂函数**返回接口对象，不使用全局单例

```javascript
// ✅ 本项目的视图模块形态
export function createHistoryView({ onReuseExpression, onHistoryChanged } = {}) {
  // ... 内部状态与函数 ...
  return { load, reloadFromStart, getState };
}
```

这样做的收益：内部状态（当前页码、搜索关键词）被闭包封装，
外部无法误改；同时依赖通过参数显式传入，而不是隐式引用全局对象。

---

## 2. CSS 规范

### 2.1 BEM 命名

类名遵循 **块（Block）__ 元素（Element）-- 修饰符（Modifier）**：

```css
/* 块：独立的功能单元 */
.keypad { }

/* 元素：块的组成部分，不单独使用 */
.keypad__item { }

/* 修饰符：同一元素的不同形态 */
.keypad--scientific { }

/* 元素 + 修饰符 */
.history-item__result { }
.history-item--favorite { }
```

**禁止**用「描述外观」的类名：

```css
/* ❌ 外观一改，类名就变成谎言 */
.red { color: red; }
.big-button { padding: 20px; }
.left { float: left; }

/* ✅ 描述语义，外观可自由调整 */
.btn--danger { color: var(--color-danger); }
.key--equals { padding: 15px 8px; }
```

### 2.2 选择器

- **禁止使用 ID 选择器写样式**（ID 的特异性过高，难以覆盖）
- 选择器嵌套深度**不超过 2 层**。BEM 的类名已自带层级，无需靠选择器嵌套表达
- 避免 `!important`。唯一例外是覆盖第三方样式，且需注释说明

```css
/* ❌ 嵌套过深，特异性难以管理 */
.app-main .card .toolbar .btn { }

/* ✅ 一个类名说明一切 */
.btn { }
```

### 2.3 样式组织顺序

`style.css` 内的段落顺序固定，便于查找：

1. 主题变量（`:root` 与 `[data-theme="dark"]`）
2. 基础重置与排版
3. 布局骨架（header / main / footer）
4. 各组件样式（按界面从上到下）
5. 响应式媒体查询
6. 动效偏好媒体查询

### 2.4 颜色只通过变量引用

**所有颜色必须在主题变量中定义一次**，组件样式只引用变量：

```css
/* ✅ 新增主题只需再写一组变量，组件规则完全不动 */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

/* ❌ 硬编码颜色会导致深色主题下出现白底黑字 */
.card {
  background: #ffffff;
  border: 1px solid #e3e7ee;
}
```

若确实需要基于变量派生颜色（如半透明背景），使用 `color-mix()`：

```css
.icon-btn--active {
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
}
```

### 2.5 单位

- 间距、圆角用 `px`（本项目界面简单，无需 `rem` 的缩放能力）
- 字号用 `px`
- 百分比仅用于需要相对父容器的场景（如 `width: 100%`）

### 2.6 响应式

采用「桌面优先 + 单个移动端断点」策略，断点取 `640px`：

```css
@media (max-width: 640px) {
  .app-main { padding: 14px 12px 30px; }
}
```

不引入多断点体系——本项目布局本身是单列卡片流，一个断点足够。

---

## 3. HTML 规范

### 3.1 结构

- `<!DOCTYPE html>` 开头，声明 `<html lang="zh-CN">`
- `<meta charset="UTF-8">` 必须位于 `<head>` 最前
- **必须包含 viewport 声明**，否则移动端会以桌面宽度渲染

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### 3.2 语义标签

用语义标签而不是一堆 `div`：

| 场景 | 使用 |
| --- | --- |
| 页面顶部 | `<header>` |
| 主导航 / 标签页 | `<nav>` |
| 主要内容 | `<main>` |
| 功能区块 | `<section>` |
| 页脚 | `<footer>` |
| 计算结果 | `<output>` |
| 错误提示 | `<p role="alert">` |

### 3.3 属性顺序

固定顺序，便于快速定位：

```
class → id → type → name → 其他属性 → data-* → aria-*
```

### 3.4 表单元素必须有关联标签

```html
<!-- ✅ 用 for 关联 label -->
<label class="display__label" for="expression-input">表达式</label>
<input id="expression-input" type="text" />

<!-- ✅ 或把 input 包在 label 里 -->
<label class="field">
  <span class="field__label">数值</span>
  <input id="base-value" type="text" />
</label>

<!-- ❌ 只有 placeholder，屏幕阅读器读不出字段用途 -->
<input type="text" placeholder="请输入" />
```

### 3.5 `data-*` 属性承载行为标记

按钮的行为用 `data-*` 标记，而不是靠文本内容或 class 判断：

```html
<!-- ✅ 事件处理读 dataset，与显示文本解耦 -->
<button class="key" type="button" data-insert="7">7</button>
<button class="key key--action" type="button" data-action="clear">C</button>
<button class="key key--action" type="button" data-action="backspace">⌫</button>
```

**为什么不用文本判断**：按钮文字可能因界面调整而变化，
而 `data-action="clear"` 的语义是稳定的。

### 3.6 HTML 中不写内联事件与内联样式

```html
<!-- ❌ 内联事件处理器，难以调试，且与 CSP 冲突 -->
<button onclick="calculate()">=</button>

<!-- ❌ 内联样式，破坏主题变量体系 -->
<div style="color: red">错误</div>

<!-- ✅ 统一在 JS 中绑定、在 CSS 中定义 -->
<button id="calculate-button" class="key key--equals" type="button">=</button>
```

---

## 4. 安全规范

### 4.1 用户数据一律用 `textContent`

**这是本项目最重要的一条前端安全规则。**

```javascript
// ❌ 危险：用户输入 <img src=x onerror=alert(1)> 会执行脚本
listElement.innerHTML += `<li>${item.expression} = ${item.resultText}</li>`;

// ✅ 安全
const itemElement = createElement('li', { className: 'history-item' });
itemElement.append(
  createElement('span', { text: item.expression }),
  createElement('span', { text: item.resultText }),
);
```

历史记录中的 `expression`、`resultText`、`normalizedExpression` 全部是用户可控数据，
任何一处用 `innerHTML` 都会形成持久的存储型 XSS（每看一次历史就触发一次）。

### 4.2 不使用 `eval` 系列

| 禁止 | 说明 |
| --- | --- |
| `eval()` | 任意代码执行 |
| `new Function()` | 同上 |
| `setTimeout('字符串')` | 隐式 eval |
| `element.innerHTML = 用户输入` | HTML 注入 |

### 4.3 不在前端存储计算结果

计算历史**必须**来自后端数据库，不得使用 `localStorage` / `sessionStorage` /
内存变量作为历史记录的数据来源。

- ✅ 允许存入 `localStorage` 的：主题偏好（`calculator.theme`）
- ❌ 禁止存入的：计算历史、计算结果

### 4.4 URL 参数要转义

```javascript
// ✅ 拼进 URL 路径的参数必须编码
request(`/history/${encodeURIComponent(id)}`);

// ✅ 查询参数用 URLSearchParams 组装
const search = new URLSearchParams();
search.set('keyword', keyword);
```

### 4.5 外部链接带 `rel="noopener"`

```html
<a href="https://example.com" target="_blank" rel="noopener">链接</a>
```

不加 `noopener` 时，新页面可以通过 `window.opener` 反向操作本页面。

---

## 5. 前后端边界规范

这是本作业特有的、也是最重要的一组约束。

### 5.1 前端禁止计算

| 禁止 | 说明 |
| --- | --- |
| 对表达式求值 | 包括但不限于 `eval`、`new Function`、手写解析器 |
| 用 `Number()` / 算术运算符算出用户要的结果 | 例如把 `12+8` 算出 `20` 再显示 |
| 进制换算的数值转换 | 必须调 `POST /api/convert/base` |
| 单位换算的系数相乘 | 必须调 `POST /api/convert/unit` |
| 统计聚合（平均值、去重计数） | 必须调 `GET /api/history/stats` |

**允许做的**（这些不是「计算」）：

- 把按钮点击拼成表达式字符串（`'1'` + `'+'` → `'1+'`）
- 分页控件使用后端返回的 `page` / `totalPages`，不自行推导
- 日期时间格式化（ISO → 本地可读格式）
- 字符串裁剪、拼接、大小写转换

```javascript
// ✅ 允许：拼字符串
insertText('7');   // 输入框变成 "1+7"

// ❌ 禁止：把结果算出来
const result = Number(a) + Number(b);
```

### 5.2 所有请求必须经过 `api.js`

禁止任何模块直接调用 `fetch`：

```javascript
// ❌ 绕过封装，超时与错误处理都会被漏掉
const response = await fetch('http://127.0.0.1:5000/api/calculate', { /* ... */ });

// ✅
import { api } from './api.js';
const response = await api.calculate(expression);
```

### 5.3 接口地址不得硬编码在业务模块里

接口地址只在 `config.js` 中解析一次，业务模块从 `config.apiBaseUrl` 取值。

### 5.4 后端不可用时不退化为本地计算

| 场景 | 正确行为 |
| --- | --- |
| 请求超时 | 显示「请求超时」，结果区显示 `—` |
| 网络不可达 | 显示「无法连接后端服务」，结果区显示 `—` |
| 后端返回 4xx | 显示按错误码翻译后的中文提示 |
| 后端返回 5xx | 显示「服务器内部错误」 |

**任何情况下都不得**为了「让界面好看」而在本地算一个结果出来。

---

## 6. 可访问性规范

满足 WCAG 2.1 AA 的最低要求：

### 6.1 焦点可见

不删除浏览器默认焦点样式，而是在其基础上增强：

```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### 6.2 交互元素用正确的标签

| 场景 | 使用 | 不使用 |
| --- | --- | --- |
| 可点击 | `<button type="button">` | `<div onclick>` |
| 输入 | `<input>` + `<label for>` | 无标签的 input |
| 结果显示 | `<output aria-live="polite">` | `<div>` |
| 错误提示 | `role="alert"` | 纯文本 |

### 6.3 状态变化要有语义

```html
<!-- 标签页 -->
<button role="tab" aria-selected="true">计算</button>
<section role="tabpanel" aria-label="计算">...</section>

<!-- 可切换按钮 -->
<button aria-pressed="false">科学键盘</button>

<!-- 动态结果，屏幕阅读器会自动播报 -->
<output aria-live="polite">7</output>
```

### 6.4 颜色不是唯一的信息载体

后端状态指示同时使用**颜色**（红/绿圆点）与**文字**（「后端正常」/「后端未连接」），
色觉障碍用户也能获取信息。

### 6.5 尊重减少动效偏好

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

---

## 7. Git 提交规范

与后端仓库一致，采用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<类型>(<范围>): <简短描述>
```

**类型**：`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`

**范围**（前端常用）：`calculator` / `history` / `conversion` / `statistics` / `ui` / `api`

**示例**

```
feat(history): 历史记录改用 textContent 渲染，消除存储型 XSS

原先用 innerHTML 模板字符串拼接表达式，用户输入含 HTML 的表达式后
每次查看历史都会执行脚本。改为 createElement + textContent 逐节点构建。
```

**要求**

- 描述用中文，祈使句，不超过 50 字
- 一次提交只做一件事
- 不提交 `node_modules/`、编辑器配置

---

## 8. 提交前检查清单

### 代码搜索确认（应无结果）

```bash
# 搜索危险 API（在 src/ 目录下执行）
grep -rn "innerHTML" src/js/          # 应为空
grep -rn "eval(" src/js/              # 应为空
grep -rn "new Function" src/js/       # 应为空
grep -rn "localStorage" src/js/       # 只应出现在 theme.js 中
grep -rn "fetch(" src/js/             # 只应出现在 api.js 中
```

### 手动验证

- [ ] 浏览器控制台无报错
- [ ] `1+2*3` 得到 `7`、`(1+2)*3` 得到 `9`
- [ ] `1/0` 显示中文错误提示，结果区为 `—`
- [ ] **停掉后端后，计算结果区显示 `—` 并提示无法连接**
- [ ] 刷新页面后历史记录仍在（数据来自后端）
- [ ] 删除一条记录后，列表与后端数据一致
- [ ] 切换深色主题后所有文字仍清晰可读
- [ ] 移动端窄屏（< 640px）下布局不溢出
- [ ] 用 Tab 键可以遍历到所有交互元素，且有清晰的焦点框
- [ ] 页面中没有任何硬编码的颜色值（全部走 `var(--color-*)`）
