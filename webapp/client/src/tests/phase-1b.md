# Phase 1b Testing — Pyodide Integration

**Tool**: Vitest (unit), Playwright (E2E)

## Goals
Verify the Worker ↔ Controller ↔ Model message pipeline is correct and Pyodide loads cleanly.

## KernelModel — queue behavior
- Execution queue is FIFO: jobs dequeue in submission order
- A job enqueued while the kernel is busy is not lost
- Restart clears the queue and resets kernel status to `idle`

## CellModel — execution lifecycle
- Status transitions: `idle → running → success` on a clean run
- Status transitions: `idle → running → error` on a Python error
- Running a cell clears its previous output before new output arrives
- Output lines append in the correct order when multiple `stdout` messages arrive

## Execution pipeline (Worker ↔ Controller ↔ Model)
- A `stdout` postMessage routes to the correct cell's output list
- An `error` postMessage sets that cell's status to `error` and stores the traceback
- A `done` postMessage marks the cell `success` and increments its execution counter
- A message carrying an unknown `cellId` is silently ignored (no crash, no state mutation)
- Submitting a cell that is already `running` does not double-enqueue it

## E2E — Pyodide loads and runs (Playwright)
- `print("hello")` → cell output contains `"hello"`
- `import numpy as np; print(np.__version__)` → loads without error, version string appears
- A syntax error (e.g. `def f(`) → error message displayed in the cell, page does not crash
- Kernel loading progress bar appears during first run, disappears when ready
- If Pyodide fails to load, a retry button is shown
