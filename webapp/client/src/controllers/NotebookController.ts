import { useNotebookStore } from '../stores/notebookStore.ts';
import { useCellStore } from '../stores/cellStore.ts';

/**
 * Run all cells — no-op stub for Phase 1a.
 */
export function runAll(): void {
  // Phase 1a: no-op stub
}

/**
 * Restart kernel — no-op stub for Phase 1a.
 */
export function restartKernel(): void {
  // Phase 1a: no-op stub
  const cellIds = useNotebookStore.getState().cellIds;
  const { setStatus, clearOutputs } = useCellStore.getState();
  for (const id of cellIds) {
    setStatus(id, 'idle');
    clearOutputs(id);
  }
}
