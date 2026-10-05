# Frontend Code Conventions (Calculator Frontend Codestyle)

## Sources of the Conventions

The conventions in this document are based on the following public standards, with trade-offs and refinements for this project's tech stack (vanilla HTML / CSS / JavaScript):

| Source | Version / link | Scope adopted |
| --- | --- | --- |
| **Google JavaScript Style Guide** | https://google.github.io/styleguide/jsguide.html | **Primary basis**. Naming, formatting, modules, comments, language feature restrictions |
| **Airbnb JavaScript Style Guide** | https://github.com/airbnb/javascript | Supplements where the Google guide does not cover (destructuring, array methods, equality comparison) |
| **BEM naming convention** | https://getbem.com/naming/ | **The CSS class-name convention** |
| **CSS Guidelines** (Harry Roberts) | https://cssguidelin.es/ | CSS organization, selector depth, specificity control |
| **HTML Living Standard** (WHATWG) | https://html.spec.whatwg.org/ | Semantic tag choices, form element usage |
| **MDN Web Docs** | https://developer.mozilla.org/ | Confirming Web API semantics, security practices |
| **WCAG 2.1 AA** | https://www.w3.org/TR/WCAG21/ | Minimum accessibility requirements (visible focus, contrast, ARIA) |
| **Conventional Commits** | https://www.conventionalcommits.org/ | Commit message format |

**Deviations from the Google guide**:

1. **CSS uses BEM rather than Google's class-name recommendations.** The Google guide says little about CSS,
   and BEM's hierarchical semantics and its "block-element-modifier" component division fit this project's interface structure better.
2. **JSDoc is not mandatory for every type.** There is no TypeScript; JSDoc is written for functions whose contract
   is not obvious (`api.js`, the View factory functions), and plain explanatory comments are used elsewhere.

All comments, documentation, and commit messages in this project are written in English, matching
the language of instruction.

---

## Table of Contents

- [1. JavaScript Conventions](#1-javascript-conventions)
- [2. CSS Conventions](#2-css-conventions)
- [3. HTML Conventions](#3-html-conventions)
- [4. Security Conventions](#4-security-conventions)
- [5. Frontend/Backend Boundary Conventions](#5-frontend-backend-boundary-conventions)
- [6. Accessibility Conventions](#6-accessibility-conventions)
- [7. Git Commit Conventions](#7-git-commit-conventions)
- [8. Pre-Commit Checklist](#8-pre-commit-checklist)

---

## 1. JavaScript Conventions

### 1.1 Files and Modules

- Use **ES Modules** (`import` / `export`), not `require`
- One file per view or per utility module, with file names in `lowerCamelCase.js`
- Relative imports **must include the `.js` extension** (a browser ESM requirement)

```javascript
import { api } from './api.js';        // ✅
import { api } from './api';           // ❌ fails to load in the browser
```

- **Each module exposes only the necessary API**; internal helper functions are not exported

### 1.2 Naming

| Object | Style | Example |
| --- | --- | --- |
| Variables, functions | `lowerCamelCase` | `expressionInput`, `renderItem` |
| Constants | `UPPER_SNAKE_CASE` | `BASE_OPTIONS`, `DIRECT_INPUT_PATTERN` |
| Classes | `UpperCamelCase` | `ApiError` |
| Variable names for DOM elements | End with `Element`, or add a suffix such as `Button`/`Input` | `summaryElement`, `refreshButton` |
| Event handler functions | `handle` + the event | `handleKeypadClick` |
| Boolean variables | Start with `is` / `has` / `will` / `should` | `isSubmitting`, `lastRequestFailed` |
| Private module variables | Simply do not export them; no `_` prefix | — |

```javascript
// ✅ Good: the variable name tells you whether it is a DOM element or plain data
const statusTextElement = $('#backend-status-text');
const historyState = { page: 1, pageSize: 20 };

// ❌ Bad
const el = $('#backend-status-text');
const d = { p: 1, s: 20 };
```

### 1.3 Formatting

- Indentation: **2 spaces**
- Lines no longer than **100 characters**
- **Semicolons are mandatory**
- Use **single quotes** for strings; use template literals when interpolation is needed
- Keep **trailing commas** in multi-line arrays and objects
- Leave one newline at the end of the file

### 1.4 Language Features

**Forbidden**

| Feature | Reason |
| --- | --- |
| `eval()` / `new Function()` | Arbitrary code execution, a security hole; explicitly forbidden in this project |
| `innerHTML` concatenation with user data | XSS injection |
| `var` | Use `const` / `let` |
| `==` / `!=` | Use `===` / `!==` |
| `document.write()` | Blocks parsing, and its behavior in modules is undefined |
| Global variable pollution | Nothing is attached to the global scope except `window.__calculator` (for debugging) and `window.__CALCULATOR_CONFIG__` |

**Recommended**

```javascript
// prefer const; use let only when reassignment is needed
const items = [];

// destructuring
const { code, message } = error;

// optional chaining and nullish coalescing
const text = response?.resultText ?? String(response.result);

// event delegation instead of binding each one individually
keypad.addEventListener('click', handleKeypadClick);
```

### 1.5 Comments

Comments explain **why**, not **what**:

```javascript
// ✅ Valuable: it states a non-obvious reason
// After inserting, place the cursor after the new content so the user can keep typing, matching the feel of a real calculator.
expressionInput.setSelectionRange(nextCaret, nextCaret);

// ❌ Worthless: the code itself already says it clearly
// set the cursor position
expressionInput.setSelectionRange(nextCaret, nextCaret);
```

Security-related code **must** state what it defends against:

```javascript
// All user-visible text is written through textContent; innerHTML is never used.
// An expression is a free-form user input string; if it were concatenated with innerHTML,
// entering `<img src=x onerror=alert(1)>` would trigger XSS when the history is viewed.
```

### 1.6 Function Design

- A single function should not exceed **50 lines**
- Switch to an object parameter when there are more than 3 parameters
- View modules always use a **factory function** that returns an interface object; no global singletons

```javascript
// ✅ The shape of this project's view modules
export function createHistoryView({ onReuseExpression, onHistoryChanged } = {}) {
  // ... internal state and functions ...
  return { load, reloadFromStart, getState };
}
```

The payoff: internal state (the current page number, the search keyword) is encapsulated in a closure and cannot be changed by mistake from outside;
at the same time, dependencies are passed in explicitly as parameters instead of implicitly referencing global objects.

---

## 2. CSS Conventions

### 2.1 BEM Naming

Class names follow **Block__Element--Modifier**:

```css
/* Block: an independent functional unit */
.keypad { }

/* Element: a part of a block, not used on its own */
.keypad__item { }

/* Modifier: a different form of the same element */
.keypad--scientific { }

/* Element + modifier */
.history-item__result { }
.history-item--favorite { }
```

Do **not** use class names that "describe appearance":

```css
/* ❌ Change the appearance and the class name becomes a lie */
.red { color: red; }
.big-button { padding: 20px; }
.left { float: left; }

/* ✅ Describes semantics, so the appearance can be adjusted freely */
.btn--danger { color: var(--color-danger); }
.key--equals { padding: 15px 8px; }
```

### 2.2 Selectors

- **Do not use ID selectors for styling** (an ID's specificity is too high and hard to override)
- Selector nesting **must not exceed 2 levels**. BEM class names already carry the hierarchy, so it need not be expressed through selector nesting
- Avoid `!important`. The only exception is overriding third-party styles, and it must be explained with a comment

```css
/* ❌ Too deeply nested; specificity is hard to manage */
.app-main .card .toolbar .btn { }

/* ✅ One class name says it all */
.btn { }
```

### 2.3 Order of Style Organization

The order of sections inside `style.css` is fixed, for ease of lookup:

1. Theme variables (`:root` and `[data-theme="dark"]`)
2. Base reset and typography
3. Layout skeleton (header / main / footer)
4. Component styles (in interface order, from top to bottom)
5. Responsive media queries
6. Motion-preference media queries

### 2.4 Colors Are Referenced Only Through Variables

**Every color must be defined once in the theme variables**; component styles only reference the variables:

```css
/* ✅ A new theme only needs one more set of variables; the component rules stay untouched */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

/* ❌ Hard-coded colors cause white backgrounds with black text in the dark theme */
.card {
  background: #ffffff;
  border: 1px solid #e3e7ee;
}
```

If a color really must be derived from a variable (such as a translucent background), use `color-mix()`:

```css
.icon-btn--active {
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
}
```

### 2.5 Units

- Use `px` for spacing and border radii (this project's interface is simple and does not need `rem`'s scaling ability)
- Use `px` for font sizes
- Use percentages only where a value must be relative to the parent container (such as `width: 100%`)

### 2.6 Responsiveness

A "desktop first + a single mobile breakpoint" strategy is used, with the breakpoint at `640px`:

```css
@media (max-width: 640px) {
  .app-main { padding: 14px 12px 30px; }
}
```

No multi-breakpoint system is introduced — this project's layout is itself a single-column card flow, so one breakpoint is enough.

---

## 3. HTML Conventions

### 3.1 Structure

- Starts with `<!DOCTYPE html>` and declares `<html lang="en">`
- `<meta charset="UTF-8">` must come first in `<head>`
- **The viewport declaration is mandatory**, otherwise mobile devices render at desktop width

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### 3.2 Semantic Tags

Use semantic tags instead of a pile of `div`s:

| Scenario | Use |
| --- | --- |
| Top of the page | `<header>` |
| Main navigation / tabs | `<nav>` |
| Main content | `<main>` |
| Functional section | `<section>` |
| Footer | `<footer>` |
| Calculation result | `<output>` |
| Error message | `<p role="alert">` |

### 3.3 Attribute Order

A fixed order, for quick location:

```
class → id → type → name → other attributes → data-* → aria-*
```

### 3.4 Form Elements Must Have an Associated Label

```html
<!-- ✅ Associate the label with for -->
<label class="display__label" for="expression-input">Expression</label>
<input id="expression-input" type="text" />

<!-- ✅ Or wrap the input in the label -->
<label class="field">
  <span class="field__label">Value</span>
  <input id="base-value" type="text" />
</label>

<!-- ❌ Only a placeholder; a screen reader cannot tell what the field is for -->
<input type="text" placeholder="Enter a value" />
```

### 3.5 `data-*` Attributes Carry Behavior Markers

Button behavior is marked with `data-*` rather than inferred from text content or a class:

```html
<!-- ✅ The event handler reads dataset, decoupled from the displayed text -->
<button class="key" type="button" data-insert="7">7</button>
<button class="key key--action" type="button" data-action="clear">C</button>
<button class="key key--action" type="button" data-action="backspace">⌫</button>
```

**Why not judge by text**: button text may change when the interface is adjusted,
whereas the semantics of `data-action="clear"` are stable.

### 3.6 No Inline Events or Inline Styles in HTML

```html
<!-- ❌ An inline event handler: hard to debug and in conflict with CSP -->
<button onclick="calculate()">=</button>

<!-- ❌ Inline styles break the theme variable system -->
<div style="color: red">Error</div>

<!-- ✅ Bind in JS and define in CSS, uniformly -->
<button id="calculate-button" class="key key--equals" type="button">=</button>
```

---

## 4. Security Conventions

### 4.1 Always Use `textContent` for User Data

**This is the single most important frontend security rule in this project.**

```javascript
// ❌ Dangerous: a user input of <img src=x onerror=alert(1)> executes a script
listElement.innerHTML += `<li>${item.expression} = ${item.resultText}</li>`;

// ✅ Safe
const itemElement = createElement('li', { className: 'history-item' });
itemElement.append(
  createElement('span', { text: item.expression }),
  createElement('span', { text: item.resultText }),
);
```

The `expression`, `resultText` and `normalizedExpression` in the history are all user-controlled data,
and using `innerHTML` at any of those points creates a persistent stored XSS (it fires every time the history is viewed).

### 4.2 Do Not Use the `eval` Family

| Forbidden | Description |
| --- | --- |
| `eval()` | Arbitrary code execution |
| `new Function()` | Same as above |
| `setTimeout('string')` | Implicit eval |
| `element.innerHTML = user input` | HTML injection |

### 4.3 Do Not Store Calculation Results on the Frontend

The calculation history **must** come from the backend database; `localStorage` / `sessionStorage` /
in-memory variables must not be used as the data source for history records.

- ✅ Allowed in `localStorage`: the theme preference (`calculator.theme`)
- ❌ Forbidden: the calculation history and calculation results

### 4.4 URL Parameters Must Be Escaped

```javascript
// ✅ Parameters interpolated into a URL path must be encoded
request(`/history/${encodeURIComponent(id)}`);

// ✅ Query parameters are assembled with URLSearchParams
const search = new URLSearchParams();
search.set('keyword', keyword);
```

### 4.5 External Links Carry `rel="noopener"`

```html
<a href="https://example.com" target="_blank" rel="noopener">Link</a>
```

Without `noopener`, the new page can manipulate this page in reverse through `window.opener`.

---

## 5. Frontend-Backend Boundary Conventions

This is the set of constraints specific to this assignment, and also the most important one.

### 5.1 The Frontend Must Not Calculate

| Forbidden | Description |
| --- | --- |
| Evaluating an expression | Including but not limited to `eval`, `new Function`, a hand-written parser |
| Computing the result the user wants with `Number()` / arithmetic operators | For example computing `12+8` as `20` and then displaying it |
| Numeric conversion for base conversion | Must call `POST /api/convert/base` |
| Multiplying coefficients for unit conversion | Must call `POST /api/convert/unit` |
| Statistical aggregation (averages, distinct counts) | Must call `GET /api/history/stats` |

**What is allowed** (these are not "calculation"):

- Assembling button clicks into an expression string (`'1'` + `'+'` → `'1+'`)
- Pagination controls using the `page` / `totalPages` returned by the backend, not deriving them on their own
- Date and time formatting (ISO → a locally readable format)
- String trimming, concatenation and case conversion

```javascript
// ✅ Allowed: concatenating a string
insertText('7');   // the input box becomes "1+7"

// ❌ Forbidden: computing the result
const result = Number(a) + Number(b);
```

### 5.2 All Requests Must Go Through `api.js`

No module may call `fetch` directly:

```javascript
// ❌ Bypasses the wrapper, so timeouts and error handling are both skipped
const response = await fetch('http://127.0.0.1:5000/api/calculate', { /* ... */ });

// ✅
import { api } from './api.js';
const response = await api.calculate(expression);
```

### 5.3 The API Address Must Not Be Hard-Coded in Business Modules

The API address is resolved exactly once in `config.js`, and business modules take their value from `config.apiBaseUrl`.

### 5.4 Do Not Degrade to Local Calculation When the Backend Is Unavailable

| Scenario | Correct behavior |
| --- | --- |
| Request timeout | Show "request timed out"; the result area shows `—` |
| Network unreachable | Show "cannot connect to the backend service"; the result area shows `—` |
| The backend returns 4xx | Show the English message translated from the error code |
| The backend returns 5xx | Show "internal server error" |

**Under no circumstances** may a result be computed locally just to "make the interface look good".

---

## 6. Accessibility Conventions

Meeting the minimum requirements of WCAG 2.1 AA:

### 6.1 Visible Focus

Do not remove the browser's default focus styles; enhance them instead:

```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### 6.2 Use the Correct Tags for Interactive Elements

| Scenario | Use | Do not use |
| --- | --- | --- |
| Clickable | `<button type="button">` | `<div onclick>` |
| Input | `<input>` + `<label for>` | an input with no label |
| Result display | `<output aria-live="polite">` | `<div>` |
| Error message | `role="alert"` | plain text |

### 6.3 State Changes Must Be Semantic

```html
<!-- Tabs -->
<button role="tab" aria-selected="true">Calculate</button>
<section role="tabpanel" aria-label="Calculate">...</section>

<!-- Toggle button -->
<button aria-pressed="false">Scientific keypad</button>

<!-- Dynamic result; screen readers announce it automatically -->
<output aria-live="polite">7</output>
```

### 6.4 Color Is Not the Only Carrier of Information

The backend status indicator uses both **color** (a red/green dot) and **text** ("backend healthy" / "backend not connected"),
so users with color vision deficiency can get the information too.

### 6.5 Respect the Reduced Motion Preference

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

---

## 7. Git Commit Conventions

Consistent with the backend repository, [Conventional Commits](https://www.conventionalcommits.org/) is used:

```
<type>(<scope>): <short description>
```

**Type**: `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`

**Scope** (commonly used in the frontend): `calculator` / `history` / `conversion` / `statistics` / `ui` / `api`

**Example**

```
feat(history): render history with textContent to eliminate stored XSS

Previously the expression was concatenated with an innerHTML template string, so once a user
entered an expression containing HTML, the script ran on every view of the history. Changed to
building the nodes one by one with createElement + textContent.
```

**Requirements**

- The description is written in English, in the imperative mood, no longer than 50 characters
- One commit does one thing only
- Do not commit `node_modules/` or editor configuration

---

## 8. Pre-Commit Checklist

### Code Search Confirmation (should return no results)

```bash
# search for dangerous APIs (run from the src/ directory)
grep -rn "innerHTML" src/js/          # should be empty
grep -rn "eval(" src/js/              # should be empty
grep -rn "new Function" src/js/       # should be empty
grep -rn "localStorage" src/js/       # should only appear in theme.js
grep -rn "fetch(" src/js/             # should only appear in api.js
```

### Manual Verification

- [ ] No errors in the browser console
- [ ] `1+2*3` gives `7`, `(1+2)*3` gives `9`
- [ ] `1/0` shows an English error message and the result area is `—`
- [ ] **After the backend is stopped, the calculation result area shows `—` and reports that it cannot connect**
- [ ] The history is still there after refreshing the page (the data comes from the backend)
- [ ] After deleting a record, the list matches the backend data
- [ ] All text is still clearly readable after switching to the dark theme
- [ ] The layout does not overflow on a narrow mobile screen (< 640px)
- [ ] Every interactive element can be reached with the Tab key, with a clear focus ring
- [ ] There are no hard-coded color values anywhere in the page (everything goes through `var(--color-*)`)
