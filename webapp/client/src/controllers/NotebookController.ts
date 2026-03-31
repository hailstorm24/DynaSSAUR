import { useNotebookStore } from '../stores/notebookStore.ts';
import { queueCell, restartKernel } from './KernelController.ts';

/**
 * Queues all cells in notebook order for sequential execution.
 */
export function runAll(): void {
  const cellIds = useNotebookStore.getState().cellIds;
  for (const id of cellIds) {
    queueCell(id);
  }
}

export { restartKernel };
