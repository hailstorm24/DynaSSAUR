# Phase 4 Testing — Polish

**Tool**: Playwright (E2E), Vitest (unit where noted)

## Goals
Verify interrupt, error highlighting, kernel restart, persistence, and theme features work end-to-end.

## Interrupt / Stop button
- Clicking Stop while a cell is running sends the interrupt signal; cell status becomes `error` with an interrupt message
- If the Worker does not respond within 2 s, it is terminated and restarted; subsequent cells can run normally after restart
- Cells queued behind the stopped cell are dequeued (queue is empty after Stop)

## Inline error highlighting
- A runtime error traceback maps to the correct line number in the CodeMirror gutter
- The gutter marker appears on re-run and clears when the cell runs successfully

## Kernel restart flow
- "Restart Kernel" clears all execution counters (all cells show `[ ]`)
- Previously defined Python variables are gone after restart (NameError on access)
- The kernel status returns to `idle`/`ready` after restart completes

## Notebook persistence
- Saving a notebook and reloading the page restores all cells and their source code
- Cell outputs and counters are not required to persist (source only is acceptable)
- JSON download produces a valid file that can be re-imported

## Unsupported packages
- Importing a package with unported C extensions (e.g. `import torch`) displays the message *"Package X is not supported in the browser."* and does not crash

## Theme toggle
- Switching to dark mode applies dark styling to the editor and output areas
- Switching back to light mode restores light styling
- Theme preference persists across page reloads
