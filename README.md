# Calculator System · Frontend (Calculator Frontend)

The **frontend** of the front-end/back-end separated calculator system. It handles interface rendering, button and keyboard interaction, expression input,
result display, history display and deletion, and showing the error messages returned by the backend.

**This frontend performs no numeric calculation whatsoever.** All calculations (including base conversion and unit conversion) are sent to the backend
through HTTP endpoints. See [Design Notes](#design-notes) for details.

> This project is the frontend part of the first assignment of the Software Engineering course, "Front-end/Back-end Separated Calculator System".
> The backend repository is the companion project `calculator_backend`.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Runtime Requirements](#runtime-requirements)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Configuration](#configuration)
- [Backend Connection](#backend-connection)
- [Interface Overview](#interface-overview)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Project Structure](#project-structure)
- [Design Notes](#design-notes)
- [FAQ](#faq)

---

## Features

### Required Features

| Feature | Description | Implementation location |
| --- | --- | --- |
| Calculator interface | Numeric keypad, operators, parentheses, backspace, clear | `src/index.html`, `src/css/style.css` |
| Expression input | Can be typed directly or assembled by clicking buttons; supports insertion at the cursor | `src/js/calculatorView.js` |
| Sending calculation requests | Click `=` or press Enter to POST the expression to the backend | `src/js/api.js` |
| Result display | Shows the `resultText` returned by the backend, with no local processing | `src/js/calculatorView.js` |
| History display | Fetched from the backend and rendered, supports pagination | `src/js/historyView.js` |
| Deleting history records | Deletes a specific record by id, then re-fetches from the backend | `src/js/historyView.js` |
| Error message display | Translates backend error codes into English messages | `src/js/errorMessages.js` |

### Extended Features

| Feature | Description |
| --- | --- |
| Scientific keypad | Collapsible panel: `sin` `cos` `tan` `√` `xʸ` `ln` `log` `|x|` `n!` `π` `e` `mod` `round` `max` `min` |
| Keyboard shortcuts | Type digits and operators directly, Enter to calculate, Esc to clear, Backspace to delete, Ctrl/Cmd+D to switch themes |
| History search | Fuzzy keyword search (300 ms debounce) |
| History pagination | 10 / 20 / 50 records per page, selectable |
| History sorting | Sort by time or by result, ascending or descending |
| Favorites | Star frequently used records and filter with "Favorites only" |
| Reuse expression | Put a history record's expression back into the calculator panel for further editing in one click |
| Base conversion | Conversion between bases 2 / 8 / 10 / 16 / 32 / 36, direction can be swapped |
| Unit conversion | 8 unit categories (length, mass, area, volume, time, data, speed, temperature) |
| Statistics panel | Total records, today's calculations, favorites, average value, most frequent expression, etc. |
| Theme switching | Light and dark themes, remembers the user's choice, follows the system by default |
| Backend status indicator | Periodically polls `/api/health` to show at a glance whether the backend is available |

---

## Tech Stack

| Aspect | Choice | Description |
| --- | --- | --- |
| Language | Vanilla JavaScript (ES Module) | No TypeScript, no transpilation |
| Structure | Vanilla HTML5 | Semantic tags + ARIA |
| Styling | Vanilla CSS3 | CSS custom properties for theming, BEM naming |
| Build tooling | **None** | No Webpack / Vite / npm install required |
| Runtime dependencies | **Zero** | The browser runs the source directly |
| Development server | Node's built-in `http` module | `scripts/dev-server.mjs`, zero dependencies |

### Why not use a framework and build tools?

The assignment explicitly states that "technical complexity itself is only worth part of the score"; what matters is getting the front-end/back-end separation right and clear.
Not pulling in a framework brings three practical benefits:

1. **Zero verification cost for the TA.** No `npm install` is needed, and it can be opened with any static server even without Node installed,
   which removes a whole class of failures ("dependencies won't install") that is unrelated to the assignment's goal.
2. **All the code is readable.** There are no build artifacts and no runtime framework black box;
   every line you see in the browser is the line in the repository.
3. **No risk of build output diverging from the source.** The frontend repository contains nothing but source code.

The price is that some DOM manipulation that a framework could have handled is written by hand. Since this project's interface is limited in scale
(4 panels, about 40 interactive elements), that price is manageable.

---

## Runtime Requirements

The frontend itself **does not need Node.js** — it is purely static files, and any static server can host it.

The repository does, however, ship a zero-dependency development server for convenient local debugging, and that one requires Node.js ≥ 20.

| How it is run | Requirement |
| --- | --- |
| Using the bundled development server | Node.js ≥ 20 |
| Using another static server (nginx / Python / VS Code Live Server, etc.) | None |

> **Note: you cannot simply double-click `index.html` to open it over `file://`.**
> This project uses ES Modules (`<script type="module">`), and for security reasons browsers
> refuse to load modules through the `file://` protocol and report a CORS error. It must be accessed over HTTP.

Check the Node version (only needed when using the bundled development server):

```bash
node -v
```

---

## Installation

**No dependencies need to be installed.**

```bash
cd calculator_frontend
# there is no npm install step
```

`package.json` has no `dependencies` at all, only two start scripts.

---

## Running the Project

### Option 1: use the bundled development server (recommended)

```bash
npm run dev
# equivalent to
node scripts/dev-server.mjs
```

It listens on `http://127.0.0.1:5500` by default. To specify another port:

```bash
node scripts/dev-server.mjs 8080
```

### Option 2: use Python's built-in server

```bash
cd src
python -m http.server 5500
```

### Option 3: host it with nginx

Use the `src/` directory as the site root and configure a reverse proxy for `/api` to the backend (see the deployment documentation).

### Option 4: VS Code Live Server

Open the `src/` directory in VS Code, right-click `index.html` → "Open with Live Server".

### Confirming it started

Open `http://127.0.0.1:5500` in a browser; the status indicator in the top-right corner of the header should show a green
"backend healthy · N records". If it shows a red "backend not connected", check whether the backend has been started.

---

## Configuration

The frontend's configurable items are gathered in a single file: **`src/js/config.js`**.

| Configuration item | Default value | Description |
| --- | --- | --- |
| `apiBaseUrl` | Inferred automatically | Root address of the backend API, see [Backend Connection](#backend-connection) |
| `requestTimeoutMs` | `10000` | Timeout for a single request (milliseconds) |
| `healthCheckIntervalMs` | `30000` | Polling interval of the backend health check |
| `searchDebounceMs` | `300` | Debounce delay for history search |

### Three ways to override the API address

In descending order of priority:

**1. URL query parameter** (for temporary debugging, no code change needed)

```
http://127.0.0.1:5500/?api=http://192.168.1.100:5000/api
```

**2. Global variable** (declared in the `<head>` of `index.html`)

```html
<script>
  window.__CALCULATOR_CONFIG__ = { apiBaseUrl: 'https://api.example.com/api' };
</script>
```

**3. Editing `src/js/config.js`** (long-term configuration)

```javascript
const LOCAL_BACKEND = 'http://127.0.0.1:5000/api';
```

---

## Backend Connection

```
┌──────────────────────┐
│  Browser             │
│  calculator_frontend │
│  (static files)      │
└──────────┬───────────┘
           │  HTTP / JSON
           │  POST /api/calculate  { "expression": "1+2*3" }
           ▼
┌──────────────────────┐
│  Backend service     │
│  calculator_backend  │
│  Express :5000       │
└──────────┬───────────┘
           │  SQL
           ▼
┌──────────────────────┐
│  SQLite database     │
└──────────────────────┘
```

### Automatic inference rules for the API address

| How the frontend runs | Inferred API address | Cross-origin |
| --- | --- | --- |
| Opened over `file://` | `http://127.0.0.1:5000/api` | Yes |
| Local development ports `5500` / `8080` / `5173` / `3000` / `8000` | `http://<same host>:5000/api` | Yes, the backend must configure CORS |
| Anything else (including a same-origin nginx deployment) | Same-origin `/api` | No |

> **Why default to the same-origin `/api`?**
> In production, nginx reverse-proxies `/api/` to the backend, so the frontend and the API are same-origin
> and the browser makes no cross-origin request. That way there is no need to configure CORS,
> and hard-coding an IP will not break the entire frontend when the domain changes.

### Full local integration steps

```bash
# Terminal A -- start the backend
cd calculator_backend
npm install
npm start          # listens on http://127.0.0.1:5000

# Terminal B -- start the frontend
cd calculator_frontend
npm run dev        # listens on http://127.0.0.1:5500
```

Open `http://127.0.0.1:5500` in a browser, type `1+2*3` and press Enter; it should show `7`.

### Database initialization

**The frontend does not touch the database.** Creating the database, defining its tables and initializing it are all the backend's responsibility;
see the "Database initialization" section of the backend repository's README.
The frontend only reads and writes data through the API and never touches the database directly.

---

## Interface Overview

The frontend has four panels in total, switched through the tabs at the top.

### 1. Calculate

- **Expression input**: can be typed directly or assembled by clicking the keypad below. Supports insertion at the cursor position.
- **Result area**: shows the result returned by the backend. When a calculation fails it shows `—` with an error message below.
- **Scientific keypad** (collapsed by default): click the "Scientific keypad" button to expand it.
- **Main keypad**: `C` clear / `(` `)` parentheses / `⌫` backspace / digits / `.` / `=` / the four arithmetic operations.
  The interface displays `×` `÷` `−`, which the backend normalizes to `*` `/` `-` automatically.

### 2. History

- Toolbar: keyword search, favorites only, sort order, items per page, refresh, clear all
- Each record shows: `#id`, the expression, the calculation time, the normalized expression (if it differs from the original input), the result
- Three action buttons: `⤴` reuse expression / `☆` favorite / `🗑` delete
- Pagination at the bottom: previous / page info / next

### 3. Convert

- **Base conversion**: enter a value, choose the source base and the target base, then click "Convert" or press Enter
- **Unit conversion**: after choosing a category, the unit dropdowns update automatically to the units available in that category
- Both panels have a "Swap" button that swaps source and target and recalculates automatically

### 4. Statistics

Displays the nine metrics aggregated by the backend's SQL in the form of cards.

---

## Keyboard Shortcuts

| Key | Function | Scope |
| --- | --- | --- |
| `0`–`9` `.` `+` `-` `*` `/` `^` `(` `)` `×` `÷` `−` | Type directly into the expression | When focus is not in an input control and the calculator panel is visible |
| `Enter` | Calculate | Inside the input / while the calculator panel is visible |
| `Backspace` | Backspace | Inside the input / while the calculator panel is visible |
| `Escape` | Clear the expression | Inside the input / while the calculator panel is visible |
| `Ctrl` / `Cmd` + `D` | Switch between light and dark themes | Global |
| `Enter` | Trigger a conversion | In the value inputs of base conversion / unit conversion |

> When focus is in a control such as a search box or a dropdown, the shortcuts deliberately step aside to avoid conflicting with normal text input.

---

## Project Structure

```
calculator_frontend/
├── src/
│   ├── index.html               # page structure (four panels + keypad)
│   ├── css/
│   │   └── style.css            # all styles (theme variables + BEM component styles)
│   └── js/
│       ├── app.js               # entry point: assembles the views, tabs, lazy loading
│       ├── config.js            # ★ the only place that needs changing per environment
│       ├── api.js               # API wrapper (timeouts, error normalization)
│       ├── errorMessages.js     # error code -> English message
│       ├── calculatorView.js    # calculator panel (contains no calculation logic at all)
│       ├── historyView.js       # history panel
│       ├── conversionView.js    # conversion panel
│       ├── statisticsView.js    # statistics panel
│       ├── health.js            # backend status indicator
│       ├── theme.js             # theme switching
│       └── dom.js               # DOM helper functions
├── scripts/
│   └── dev-server.mjs           # zero-dependency static development server
├── package.json
├── codestyle.md
└── README.md
```

### Module dependencies

```
app.js
  ├── config.js
  ├── theme.js
  ├── health.js        -> api.js -> config.js
  ├── calculatorView.js -> api.js, errorMessages.js, dom.js
  ├── historyView.js    -> api.js, errorMessages.js, dom.js, config.js
  ├── conversionView.js -> api.js, errorMessages.js, dom.js
  └── statisticsView.js -> api.js, errorMessages.js, dom.js
```

All modules **may only reach the backend through `api.js`**; no module writes its own `fetch`.
That way the API address, the timeout policy and error normalization have exactly one implementation.

The view modules **do not reference one another**; `app.js` is responsible for coordination (for example, "refresh the history list after a successful calculation").

---

## Testing

```bash
npm test
```

It uses Node's built-in test runner, so no test framework has to be installed.

What it currently covers is the **API address inference logic** (`src/js/config.js`), 13 cases in total:

| Group | Scenarios covered |
| --- | --- |
| Local development | Ports 5500, 8080 and 5173 on `localhost` / `127.0.0.1` |
| Public deployment | Ports 8080, 8000 and 9000 on a public IP; ports 80 and 443 on a domain |
| Opened directly over file:// | Falls back to local port 5000 |
| Override priority | Query parameter > global variable > automatic inference |

**How this test suite came about** (worth explaining separately):
the original implementation decided whether it was in a local development environment based only on the **port number**.
Because 8080 also appears in the list of development ports, when the site was deployed to `:8080` on a public IP,
the frontend mistakenly believed it was in a local development environment and requested `http://<public IP>:5000/api` instead,
which caused a cross-origin failure and forced the backend port to be exposed to the outside.

The fix was to change the condition to "the hostname is local **and** the port is a development port";
the case `port 8080 on a public IP -> same-origin /api` is a regression test written specifically to pin down that defect.

> The interactive parts of the interface (clicks, rendering, the deletion flow) currently rely on manual acceptance testing;
> no end-to-end tests have been introduced yet. This is a known weak point of this project and has been listed as future work.

---

## Design Notes

### 1. Why the frontend does not calculate

This is the core requirement of this assignment. The frontend's `calculatorView.js` contains no `eval`, no `Number()` arithmetic
and no arithmetic expression evaluation — pressing a button merely concatenates a string into the input box, and pressing `=` sends the expression to the backend as it is,
after which the `resultText` returned by the backend is displayed.

**A verifiable behavior**: stop the backend service and the page still loads normally, the buttons can still be pressed and an expression can still be typed,
but the result area only shows `—` and reports "cannot connect to the backend service". This directly proves that the result really does come from the backend.

Base conversion and unit conversion follow the same principle and are carried out entirely through the API; the frontend only renders the dropdowns and the result.

### 2. Rendering with `textContent` rather than `innerHTML`

The expressions in the history are free-form user input. If `innerHTML` were used with string concatenation:

```javascript
// ❌ Dangerous approach
list.innerHTML += `<li>${item.expression} = ${item.resultText}</li>`;
```

A user only has to enter `<img src=x onerror=alert(document.cookie)>` as an expression, and from then on every visit to the history page executes that script (XSS).

This project's approach is to build the nodes one by one with `document.createElement`, writing all text through
`textContent` — which is never parsed as HTML:

```javascript
// ✅ Safe approach (the createElement helper in src/js/dom.js)
createElement('div', { className: 'history-item__expression', text: item.expression })
```

### 3. Error codes are separated from display text

The backend returns language-independent error codes (such as `DIVISION_BY_ZERO`),
and the frontend maps them to English messages in `errorMessages.js`.

The benefit is that the API does not have to be changed for the sake of multiple languages; at the same time the message keeps the error code,
which makes it easier to locate when a user reports a problem with a screenshot, and easier to cross-check in the network panel.

### 4. Timeout control

`api.js` uses `AbortController` to give every request a 10-second timeout.
Without timeout control, if the backend process hangs while the port is still open,
`fetch` can remain pending for a long time, and the interface shows a button spinning forever with no message of any kind.

### 5. Lazy loading

The data of the four panels is requested on demand: the data of a panel is fetched only when you actually switch to that tab.
This avoids firing four API requests concurrently as soon as the page is entered.

### 6. `file://` and ES Modules

Local development must be accessed through an HTTP server. This is not a special requirement of this project
but a browser security restriction on ES Modules (`file://` is treated as an opaque origin).
The bundled `dev-server.mjs` exists precisely so that the TA does not have to install anything extra.

---

## FAQ

### The page is blank when opened and the console reports a CORS error

You double-clicked `index.html` and opened it over `file://`. It must be accessed over HTTP:

```bash
npm run dev
# then visit http://127.0.0.1:5500
```

### The status indicator shows "backend not connected"

1. Confirm the backend is running: `curl http://127.0.0.1:5000/api/health`
2. Confirm the backend port is 5000 (if you changed it, update `src/js/config.js` accordingly)
3. Open the Network panel of the browser developer tools and check whether the request is blocked by CORS

### Calculating reports "cannot connect to the backend service [NETWORK_ERROR]"

This usually means the backend is not running, or the API address is wrong. This is also one of the acceptance scenarios required by the assignment —
in this situation the frontend **must not** be able to produce a result.

### The history is empty

The backend database is empty the first time it starts, so one successful calculation has to happen first.
Failed calculations (such as `1/0`) are not written to the history. If you need demo data,
you can run `npm run seed` in the backend repository.

### The list does not change after deleting a record

Normally the list is re-fetched from the backend after a successful deletion.
If nothing changes, check whether the browser console reports an error, and check the status code of that request in the backend logs.

### I changed the code but the page did not update

The development server sets `Cache-Control: no-store`, so in theory a refresh is enough.
If it still does not take effect, force a refresh with `Ctrl` + `F5`.

---

## Related Documentation

- [codestyle.md](./codestyle.md) —— code conventions (based on the Google JavaScript Style Guide + BEM)
- Backend repository: `calculator_backend`
