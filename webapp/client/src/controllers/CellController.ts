import { useCellStore } from '../stores/cellStore.ts';
import { useNotebookStore } from '../stores/notebookStore.ts';

let cellCounter = 2;

/**
 * Adds a new cell to both the notebook order store and the cell data store.
 */
export function addCell(): void {
  const newId = `cell-${cellCounter++}`;
  useNotebookStore.getState().addCell(newId);
  useCellStore.getState().addCell(newId);
}

/**
 * Removes a cell from both stores.
 */
export function removeCell(id: string): void {
  useNotebookStore.getState().removeCell(id);
  useCellStore.getState().removeCell(id);
}

/**
 * Run stub — no execution in Phase 1a.
 */
export function runCell(_id: string): void {
  // Phase 1a: no-op stub
}
