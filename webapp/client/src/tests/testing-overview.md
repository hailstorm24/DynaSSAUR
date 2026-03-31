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
