# Phase 4 Testing — Polish

**Tool**: Playwright (E2E), Vitest (unit where noted)

**Unit tests**: `phase4.test.ts` — 46 tests, all passing.
**Setup requirement**: `src/tests/setup.ts` mocks `localStorage` for the node test environment (wired via `setupFiles` in `vite.config.ts`).

## Goals
Verify interrupt, error highlighting, kernel restart, persistence, and theme features work end-to-end.

## Interrupt / Stop button
- ✅ Clicking Stop clears the execution queue (cells queued behind the stopped cell are dequeued)
- ✅ An interrupted cell receives an error message and its status becomes `error`
- ✅ The queue can be re-populated normally after Stop
- 🌐 If the Worker does not respond within 2 s, it is terminated and restarted; subsequent cells can run normally after restart *(E2E only)*

## Inline error highlighting
- ✅ `extractErrorLine` parses the innermost frame line number from a traceback string
- ✅ An `error` worker message sets `errorLine` on the cell store
- ✅ A successful `done` message clears `errorLine` (gutter marker removed)
- ✅ `filterTraceback` strips pyodide-internal frames before line-number extraction
- 🌐 The CodeMirror gutter marker appears and clears in the live editor *(E2E only)*

## Kernel restart flow
- ✅ Restart clears the kernel queue and sets status to `idle`
- ✅ All cells return to `idle` status with outputs cleared
- ✅ All execution counters reset to `null` (cells display `[ ]`)
- 🌐 Previously defined Python variables are gone after restart (`NameError` on access) *(E2E only)*

## Notebook persistence
- ✅ `loadSavedNotebook` restores cellIds order and source code from localStorage
- ✅ Restored cells start with idle status, no outputs, and null execution count
- ✅ `loadSavedNotebook` is a no-op when localStorage is empty
- ✅ Corrupt or structurally invalid saved data is silently ignored
- ✅ `loadCells` / `loadCellIds` hydrate the stores directly (used by `loadSavedNotebook`)
- 🌐 Auto-save via `initPersistence` and page-reload restore *(E2E only)*

## Unsupported packages
- ✅ An error message with "not supported in the browser" text is stored in cell output and sets cell status to `error`
- 🌐 `import torch` specifically triggers the "Package X is not supported in the browser." message in the real Pyodide runtime *(E2E only)*

## Theme toggle
- ✅ `toggleTheme` flips `isDark`; toggling twice returns to the original value
- ✅ Transitions between dark and light mode are correct in both directions
- 🌐 Dark/light styling applied to editor and output areas *(E2E only)*
- 🌐 Theme preference persists across page reloads *(E2E only)*

---
*✅ = covered by `phase4.test.ts` (Vitest) · 🌐 = E2E only (Playwright)*
