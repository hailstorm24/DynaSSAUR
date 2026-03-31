# Phase 1a Testing — Scaffold + Editor

**Tool**: TypeScript strict mode + ESLint (always-on), Vitest for store unit tests

## Goals
Verify the static scaffold renders correctly and the Zustand stores are wired up before any execution logic exists.

## CellModel — basic state shape
- A new `CellModel` has status `idle`, empty output, and counter `null`
- `CellStore` can be instantiated with a given cell ID and returns the correct initial state
- `NotebookStore` initializes with at least one cell

## Type safety
- TypeScript compiles with zero errors under `strict` mode
- ESLint reports no errors on all source files

## Static render (manual / visual)
- Page loads without a console error
- At least one `Cell` component is visible
- CodeMirror editor is focusable and accepts keystrokes
- No Python execution is triggered on page load
