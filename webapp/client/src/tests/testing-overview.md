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

### Assignment session persistence
The session store, assignment store, and persistence layer are pure state — testable without a browser.

**AssignmentSessionStore**
- `initSession` sets uploaded files, creates summary block, sets status to `active`
- `appendBlock` pushes a block and advances `activeBlockIndex`
- `updateStudentContent` mutates planning/coding blocks, leaves summary blocks untouched
- `setEvalState` transitions through idle → running → passed/failed
- `appendChatMessage` appends in order and keeps per-block chat histories isolated
- `setStatus` transitions to `complete` and other values
- `reset` clears blocks and wipes `localStorage`

**AssignmentStore (session persistence)**
- `addAssignment` stores `sessionData` alongside the entry and persists to `localStorage`
- `updateSessionData` updates only `sessionData` and bumps `updatedAt`
- `loadFromStorage` round-trips an entry with `sessionData` without data loss

**`isValidSessionData` type guard**
- Rejects `null`, empty object, missing `blocks`, missing `uploadedFiles`, invalid `status` value
- Accepts a minimal valid `AssignmentSessionModel`

**`debouncedSessionSave` (persistence)**
- When `currentAssignmentId` is set, also calls `updateSessionData` with the snapshot
- When `currentAssignmentId` is `null`, `updateSessionData` is not called

**Sidebar session restore**
- `handleOpenAssignment` calls `useAssignmentSessionStore.setState` with `entry.sessionData`

**JSON round-trip**
- A fully-populated session snapshot (student content, eval states, chat histories) serializes and deserializes without data loss — covered by the existing round-trip test in `assignmentSession.test.ts`

### End-to-end (real browser)
Some things can only be verified with a real Pyodide instance and DOM.
Use **Playwright** for these:

- `print("hello")` → cell output contains the text
- `import numpy as np` → loads without error
- A syntax error → error displayed in the cell, not a crash
- Two cells sharing a variable → second cell sees the value set by the first
- Kernel restart → previously defined variables are gone
- A turtle cell → a `<canvas>` appears in the cell output

**Assignment session persistence (E2E only)**
- Starting a new assignment creates a sidebar entry with the correct title and "0/N steps"
- Passing a step updates the sidebar progress indicator without a page reload
- Completing all steps shows "Complete" in the sidebar
- Clicking a past sidebar entry restores all blocks, student content, chat history, and eval state
- The download button (↓) produces a `.json` file with the correct filename
- "or restore a saved session" on the upload page reopens the session from that file
- Uploading a malformed `.json` shows an error message and leaves app state unchanged

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
| `phase5.test.ts` | Vitest | `next-step` API flow — planning/coding block appended, `complete: true` short-circuit, two-step end-to-end sequence |
| `phase6.test.ts` | Vitest | `evaluate` API flow — pass/fail/server-error responses, pass → complete transition, no-testFunctions guard, `evalState` guards |
| `assignmentSession.test.ts` | Vitest | `AssignmentSessionStore` actions (`initSession`, `appendBlock`, `updateStudentContent`, `setEvalState`, `appendChatMessage`, `setStatus`, `reset`), upload flow mock, JSON round-trip for session persistence |

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
- Assignment session sidebar progress updating live as steps pass
- Session restore from sidebar rendering all blocks and chat history correctly in the UI
- File download triggering a real browser download event
- Session JSON upload opening the restored session end-to-end
