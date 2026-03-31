import { useCellStore } from '../stores/cellStore.ts';
import { useKernelStore } from '../stores/kernelStore.ts';

export type WorkerMessage =
  | { type: 'kernel_ready' }
  | { type: 'kernel_error'; message?: string }
  | { type: 'stdout'; cellId: string; text: string }
  | { type: 'stderr'; cellId: string; text: string }
  | { type: 'error'; cellId: string; traceback: string }
  | { type: 'done'; cellId: string; count: number };

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

    case 'error':
      cellStore.addOutput(msg.cellId, { type: 'error', text: msg.traceback });
      cellStore.setStatus(msg.cellId, 'error');
      break;

    case 'done': {
      // Only promote to success if no error output was already set.
      if (cellStore.cells[msg.cellId]?.status !== 'error') {
        cellStore.setStatus(msg.cellId, 'success');
      }
      cellStore.setExecutionCount(msg.cellId, msg.count);
      kernelStore.dequeue();
      break;
    }
  }
}
