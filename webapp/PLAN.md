# DynaSSAUR Web IDE — Specification

## Overview

A web-based, notebook-style Python IDE (similar to Google Colab) built in
TypeScript using an MVC architecture. Code is organized into independently
runnable **cells** that share a single persistent Python session. Python runs
entirely in the browser via **Pyodide** (WebAssembly), with a **Node.js +
Express** backend for static serving and future persistence.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React + Vite (TypeScript)         |
| Editor     | CodeMirror 6 (per cell)           |
| Python     | Pyodide (in-browser WASM)         |
| Backend    | Node.js + Express (TypeScript)    |
| Styling    | CSS Modules or Tailwind           |

---

## MVC Architecture

### Model

Owns all application state. No UI logic lives here.

- **`NotebookModel`** — ordered list of `CellModel`s, notebook metadata
- **`CellModel`** — cell id, source code, output(s), execution count,
  status (`idle | running | success | error`)
- **`KernelModel`** — Pyodide instance lifecycle, shared Python namespace,
  execution queue
- **`TurtleModel`** — canvas state and pending draw commands for turtle output

### View

React components. Purely presentational — receive props/state, emit events.

- **`Notebook`** — scrollable list of `Cell` components
- **`Cell`** — single notebook cell:
  - **`CellToolbar`** — run button, cell type badge, execution counter `[3]`,
    move up/down, delete
  - **`CodeEditor`** — CodeMirror 6 instance with Python syntax highlighting
  - **`CellOutput`** — output area directly below the editor:
    - **`TextOutput`** — stdout/stderr lines (like Colab's output box)
    - **`TurtleCanvas`** — `<canvas>` for turtle graphics (shown when used)
- **`NotebookToolbar`** — "Run All", "Restart Kernel", "Add Cell", clear all
  outputs

### Controller

Mediates between Model and View.

- **`KernelController`** — manages Pyodide Web Worker; queues and dispatches
  cell execution requests; injects turtle shim on kernel init.
  **Queue policy**: Cells are executed serially. If Cell N is running and the
  user clicks Run on Cell M, Cell M is appended to the queue and its counter
  shows `[*]` (pending). Clicking Stop on Cell N dequeues everything after it.
  "Run All" replaces the entire queue with all cells in order.
- **`CellController`** — handles run/stop for individual cells; writes output
  back to `CellModel`; increments execution counter
- **`NotebookController`** — add/remove/reorder cells; run-all orchestration

### State Management

Model state is held in **Zustand** stores (one per model). React components
subscribe via selectors — Zustand triggers re-renders only for the slice of
state each component reads. Controllers are plain TypeScript classes that call
store actions; they do not hold UI state themselves.

- `useNotebookStore` — cell list, add/remove/reorder actions
- `useCellStore(cellId)` — per-cell source, output, status, counter
- `useKernelStore` — kernel ready/loading/error status, execution queue

---

## Core Concept: Shared Kernel

All cells share one Pyodide instance (one Python namespace). This matches
Colab behavior:

```python
# Cell 1
x = 10

# Cell 2 — can access x from Cell 1 if Cell 1 was run first
print(x * 2)  # → 20
```

- Kernel persists until the user clicks **Restart Kernel**
- Cells can be run in any order; execution count `[n]` tracks run order
- "Run All" executes cells top-to-bottom in sequence

### Interrupting Execution

Pyodide supports interrupt via `pyodide.setInterruptBuffer(sharedBuffer)`,
where `sharedBuffer` is a `SharedArrayBuffer`. The main thread writes a
non-zero byte to signal interrupt; the Worker checks it between Python
opcodes.

**Requirement**: `SharedArrayBuffer` requires cross-origin isolation. The
Express server must send these headers on every response:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The Stop button (▶/■ toggle in `CellToolbar`) calls
`KernelController.interrupt()`, which writes to the shared buffer. If the
Worker does not respond within 2 s (e.g. tight C loop), it is terminated and
restarted with a fresh Pyodide instance.

---

## Package Support

Pyodide provides three tiers of package availability — no package manager UI
is needed; packages load automatically before each cell runs.

### Tier 1 — Python stdlib (always available, zero cost)
`math`, `json`, `re`, `datetime`, `random`, `itertools`, `collections`,
`functools`, `statistics`, `pathlib`, `csv`, `io`, `copy`, `typing`, etc.

### Tier 2 — Pyodide-bundled packages (loaded on demand)
Pre-compiled to WebAssembly; loaded via `pyodide.loadPackage()`.
Notable examples: `numpy`, `pandas`, `scipy`, `matplotlib`, `scikit-learn`,
`Pillow`, `sympy`, `networkx`, `lxml`, `regex`, `cryptography`, and ~100 more.
Full list: [pyodide.org/en/stable/usage/packages-in-pyodide.html](https://pyodide.org/en/stable/usage/packages-in-pyodide.html)

### Tier 3 — Pure-Python PyPI packages (installed via micropip)
Any package on PyPI without compiled C extensions can be installed at runtime:
```python
import micropip
await micropip.install("requests")   # example
```

> **Note**: `micropip.install` is async. Cells installing packages must use
> `await` at the top level — this works because `runPythonAsync` supports
> top-level await. Running `micropip.install(...)` without `await` will
> silently do nothing.

### Auto-loading Strategy
Before executing a cell, `KernelController` calls
**`pyodide.loadPackagesFromImports(code)`**, which scans the cell source for
`import`/`from` statements and automatically loads any Tier 2 packages needed.
This is transparent to the user — `import numpy as np` just works.

**Packages that will NOT work**: those with unported C extensions (e.g.
`torch`, `tensorflow`, `opencv-python`). The IDE should catch the load error
and display a clear message: *"Package X is not supported in the browser."*

---

## Key Features

### 1. Cell-based Execution
- Each cell has its own Run button (▶) and output area
- Output appears directly below the cell that produced it (not in a separate
  panel)
- Cells display an execution counter: `[ ]` (not run), `[*]` (running),
  `[3]` (ran 3rd)
- Shift+Enter runs the current cell and moves focus to the next

### 2. Python Execution (Pyodide in Web Worker)
- Pyodide loaded once on first run, then reused across all cells
- `stdout`/`stderr` streamed back per-cell via postMessage
- Errors shown inline below the cell with traceback
- Tracebacks are filtered to remove Pyodide-internal frames (frames whose
  filename contains `<pyodide>` or `pyodide/`). Only user-code frames are
  shown.

### 3. Kernel Loading UX

Pyodide (~20 MB) loads lazily on first cell run, not at page load.

- `KernelStore` exposes `status: "idle" | "loading" | "ready" | "error"`
- While loading, `NotebookToolbar` shows a progress bar fed by Pyodide's
  `loadingProgress` callback
- Pyodide assets are served from the official CDN; browsers cache the WASM
  binary across page loads, so subsequent loads are near-instant
- If load fails, a banner offers a retry button

### 4. Output Visualization
- **Text output**: `print()` results render in the cell's output area
- **Turtle graphics**: turtle draw commands render to a `<canvas>` embedded
  in the cell's output area (not a global panel)
  - Canvas is created fresh each time the cell runs
  - Canvas shown only if turtle commands are issued

### 5. Turtle Graphics Implementation

**Shim injection**: Before any user code runs, `KernelController` injects
`turtle_shim.py` into Pyodide's `sys.modules` as `turtle`. User code calling
`import turtle` receives the shim transparently.

**Command protocol**: Turtle draw calls are *batched* — the shim accumulates
commands in a Python list and flushes them as a single postMessage at the end
of cell execution (or on explicit `done()`/`mainloop()` calls, which are
no-ops in the shim). This avoids per-command round-trips for complex drawings.

**Canvas sizing**: `TurtleCanvas` renders at a fixed 600×400px. The shim's
coordinate system is centered at (0,0) matching standard turtle behavior.

**`mainloop()` / `done()`**: These are stubbed as no-ops; the shim does not
block.

Supported subset: `forward/fd`, `backward/bk`, `right/rt`, `left/lt`,
`penup/pu`, `pendown/pd`, `pencolor`, `pensize`, `goto`, `home`,
`circle`, `clear`, `reset`, `hideturtle/showturtle`, `speed`

---

## Project Structure

```
webapp/
├── client/                        # React + Vite frontend
│   ├── src/
│   │   ├── models/
│   │   │   ├── CellModel.ts
│   │   │   ├── NotebookModel.ts
│   │   │   ├── KernelModel.ts
│   │   │   └── TurtleModel.ts
│   │   ├── controllers/
│   │   │   ├── KernelController.ts
│   │   │   ├── CellController.ts
│   │   │   └── NotebookController.ts
│   │   ├── views/
│   │   │   ├── Notebook.tsx
│   │   │   ├── Cell.tsx
│   │   │   ├── CodeEditor.tsx
│   │   │   ├── CellOutput.tsx
│   │   │   ├── TurtleCanvas.tsx
│   │   │   └── NotebookToolbar.tsx
│   │   ├── workers/
│   │   │   └── pyodide.worker.ts  # Pyodide lives here
│   │   ├── turtle/
│   │   │   └── turtle_shim.py     # Python turtle compatibility layer
│   │   └── App.tsx
│   └── vite.config.ts
├── server/                        # Express backend
│   └── src/
│       └── index.ts               # Serves static build; future API routes
├── PLAN.md
└── package.json
```

---

## Data Flow (Single Cell Run)

```
User clicks ▶ on Cell N
  → CellController sets cell status = "running", output = []
  → KernelController enqueues { cellId, code } → postMessage to Worker
      Worker: calls pyodide.loadPackagesFromImports(code)  # auto-loads numpy etc.
        then: pyodide.runPythonAsync(code)
        stdout line  → postMessage({ type: "stdout", cellId, text })
        turtle cmd   → postMessage({ type: "turtle", cellId, cmd })
        error        → postMessage({ type: "error",  cellId, traceback })
        done         → postMessage({ type: "done",   cellId, count })
  → Main thread: routes messages to CellModel by cellId
  → CellOutput re-renders with new lines; TurtleCanvas draws commands
  → Cell status = "success" | "error", counter updates
```

---

## Implementation Phases

### Phase 1a — Scaffold + Editor
- [x] Vite + React + TypeScript project setup
- [x] Zustand stores scaffolded (`NotebookStore`, `CellStore`, `KernelStore`)
- [x] Single `Cell` with CodeMirror 6 (Python syntax highlighting)
- [x] Static UI renders; no execution yet

### Phase 1b — Pyodide Integration
- [x] Pyodide Web Worker with stdout/stderr capture via postMessage
- [x] Kernel loading UX (progress bar, ready/error state)
- [x] Output renders below cell; error traceback display (filtered)

### Phase 2 — Notebook
- [x] `NotebookModel` with ordered cell list
- [x] Add / delete / reorder cells
- [x] Shared kernel state across cells
- [x] Execution counter display
- [x] Shift+Enter keybinding, Run All

### Phase 3 — Turtle Graphics
- [x] `TurtleCanvas` component in cell output area
- [x] `turtle_shim.py` injected into Pyodide namespace
- [x] Worker ↔ main thread turtle command protocol

### Phase 4 — Polish
- [x] Express server with COOP/COEP headers (required for `SharedArrayBuffer` / interrupt support)
- [x] Inline error highlighting (map traceback line → CodeMirror gutter marker)
- [x] Restart Kernel flow (clears Python namespace, resets counters)
- [x] Notebook save/load via localStorage or JSON download
- [x] Dark/light theme toggle — GitHub Light/Dark themes via `@uiw/codemirror-theme-github`;
  toggle button in top-right corner of `NotebookToolbar`; theme state in `useThemeStore`;
  CodeMirror uses a `Compartment` for live theme switching without editor recreation
