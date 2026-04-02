# Testing Overview

## What needs to be verified

### Model correctness
The models are pure state — no browser or Pyodide required to test them.

**CellModel**
- Status transitions are valid: `idle → running → success | error`
- Output lines append in the correct order
- Execution counter increments on each run
- Running a cell clears previous output first

**NotebookModel**
- Cells are added, removed, and reordered correctly
- Cell lookup by ID returns the right cell (or nothing if missing)
- Cell order is preserved after mutations

**KernelModel**
- Execution queue is FIFO
- Queued jobs don't get lost when the kernel is busy
- Restart clears the queue and resets state

### Execution pipeline
These verify that the Worker ↔ Controller ↔ Model wiring is correct.

- A `stdout` message from the worker reaches the right cell's output
- An `error` message sets the cell to error status with the traceback
- A `done` message marks the cell successful and updates its counter
- Messages with unknown cell IDs are safely ignored
- A cell cannot be double-submitted while already running

### Python turtle shim
The shim is pure Python and can be tested with **pytest** outside the browser.
Mock the `postMessage` call and assert each turtle API call emits the expected
command object (e.g. `turtle.forward(100)` → `{ type: "forward", distance: 100 }`).

### End-to-end (real browser)
Some things can only be verified with a real Pyodide instance and DOM.
Use **Playwright** for these:

- `print("hello")` → cell output contains the text
- `import numpy as np` → loads without error
- A syntax error → error displayed in the cell, not a crash
- Two cells sharing a variable → second cell sees the value set by the first
- Kernel restart → previously defined variables are gone
- A turtle cell → a `<canvas>` appears in the cell output

## Suggested tools

| Layer | Tool |
|---|---|
| Model / Controller unit tests | Vitest (built into Vite) |
| Python shim | pytest |
| Full browser / E2E | Playwright |
| Type safety (always-on) | TypeScript strict mode + ESLint |

## Test files

| File | Tool | What it covers |
|---|---|---|
| `phase1a.test.ts` | Vitest | CellModel shape, CellStore instantiation, NotebookStore initialization |
| `phase1b.test.ts` | Vitest | KernelStore lifecycle, execution pipeline, `filterTraceback`, `handleWorkerMessage` |
| `phase2.test.ts` | Vitest | NotebookStore mutations (add/remove/move), cell lookup, execution counter, `executionLabel` |
| `phase3.test.ts` | Vitest | Canvas output type, `parseTurtleCommand`, `handleWorkerMessage` turtle branch |
| `phase4.test.ts` | Vitest | Interrupt/stop queue behavior, `extractErrorLine`, `errorLine` store integration, kernel restart, notebook persistence (`loadSavedNotebook`, `loadCells`, `loadCellIds`), unsupported-package error display, theme toggle |

## Setup

`src/tests/setup.ts` provides a `localStorage` mock for the node test environment.
It is loaded automatically via `setupFiles` in `vite.config.ts`.

## What is not covered here (E2E only)

- Real Stop/interrupt timing (2 s worker termination window)
- CodeMirror gutter markers appearing and clearing
- `import torch` displaying "Package X is not supported in the browser." in the real Pyodide runtime
- Theme preference persisting across actual page reloads
- `print("hello")` → cell output in a live browser
- Kernel restart clearing Python namespace (`NameError` on previously defined variables)
- Turtle `<canvas>` appearing in cell output
