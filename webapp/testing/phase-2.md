# Phase 2 Testing — Notebook

**Tool**: Vitest (unit), Playwright (E2E)

## Goals
Verify multi-cell notebook behavior: ordering, shared kernel state, and execution sequencing.

## NotebookModel — cell list mutations
- Adding a cell appends it to the end of the ordered list
- Deleting a cell removes it and preserves the order of remaining cells
- Moving a cell up/down swaps it with its neighbor; no cells are lost
- Looking up a cell by ID returns the correct `CellModel`
- Looking up a non-existent ID returns `null`/`undefined` (no throw)

## Execution counter
- After the first cell run, its counter shows `[1]`
- Running a second cell shows `[2]`; re-running the first shows `[3]`
- A cell that has never been run shows `[ ]`
- A cell that is queued but not yet started shows `[*]`

## Shared kernel across cells (E2E — Playwright)
- Cell 1 sets `x = 42`; Cell 2 prints `x` → output is `42`
- Cells run in order when "Run All" is clicked
- Kernel restart → Cell 2 can no longer access `x` (NameError)

## Keybinding
- Shift+Enter runs the current cell and moves focus to the next cell
