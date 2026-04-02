import { useCellStore } from '../stores/cellStore.ts';
import { useKernelStore } from '../stores/kernelStore.ts';
import { extractErrorLine } from '../utils/tracebackLineNumbers.ts';

export type WorkerMessage =
  | { type: 'kernel_ready' }
  | { type: 'kernel_error'; message?: string }
  | { type: 'stdout'; cellId: string; text: string }
  | { type: 'stderr'; cellId: string; text: string }
  | { type: 'error'; cellId: string; traceback: string }
  | { type: 'done'; cellId: string; count: number }
  | { type: 'turtle'; cellId: string; commands: unknown[] };

/**
 * Route a message from the Pyodide worker to the appropriate store updates.
 * This is the single source of truth for store mutations driven by worker output;
 * KernelController calls this and then handles its own in-memory queue state.
 */
export function handleWorkerMessage(msg: WorkerMessage): void {
  const cellStore = useCellStore.getState();
  const kernelStore = useKernelStore.getState();

  switch (msg.type) {
    case 'kernel_ready':
      kernelStore.setStatus('ready');
      break;

    case 'kernel_error':
      kernelStore.setStatus('error');
      break;

    case 'stdout':
      cellStore.addOutput(msg.cellId, { type: 'stdout', text: msg.text });
      break;

    case 'stderr':
      cellStore.addOutput(msg.cellId, { type: 'stderr', text: msg.text });
      break;

    case 'error': {
      cellStore.addOutput(msg.cellId, { type: 'error', text: msg.traceback });
      cellStore.setStatus(msg.cellId, 'error');
      cellStore.setErrorLine(msg.cellId, extractErrorLine(msg.traceback));
      break;
    }

    case 'done': {
      // Only promote to success if no error output was already set.
      if (cellStore.cells[msg.cellId]?.status !== 'error') {
        cellStore.setStatus(msg.cellId, 'success');
        // Clear any stale error line marker on successful run.
        cellStore.setErrorLine(msg.cellId, null);
      }
      cellStore.setExecutionCount(msg.cellId, msg.count);
      kernelStore.dequeue();
      break;
    }

    case 'turtle': {
      const cell = cellStore.cells[msg.cellId];
      if (!cell) break;
      // Replace any existing canvas output, preserving text outputs.
      const nonCanvas = cell.outputs.filter((o) => o.type !== 'canvas');
      useCellStore.setState((state) => ({
        cells: {
          ...state.cells,
          [msg.cellId]: {
            ...state.cells[msg.cellId],
            outputs: [...nonCanvas, { type: 'canvas', commands: msg.commands }],
          },
        },
      }));
      break;
    }
  }
}
