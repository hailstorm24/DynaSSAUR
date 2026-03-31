import { useCellStore } from '../stores/cellStore.ts';
import { useKernelStore } from '../stores/kernelStore.ts';
import { handleWorkerMessage, type WorkerMessage } from '../workers/workerMessageHandler.ts';

type QueueItem = { cellId: string; code: string };

// In-memory execution queue (main thread). Serial: only one cell runs at a time.
const execQueue: QueueItem[] = [];
let worker: Worker | null = null;
let workerReady = false;
let isRunning = false;

function createWorker(): Worker {
  return new Worker(
    new URL('../workers/pyodide.worker.ts', import.meta.url),
    { type: 'module' },
  );
}

function dispatchNext(): void {
  if (isRunning || !workerReady || execQueue.length === 0) return;
  isRunning = true;
  const { cellId, code } = execQueue[0];
  worker!.postMessage({ type: 'run', cellId, code });
}

function onWorkerMessage(event: MessageEvent): void {
  const msg = event.data as WorkerMessage;

  // Delegate all store mutations to the shared handler.
  handleWorkerMessage(msg);

  // KernelController-only side-effects: drive the local execution queue.
  if (msg.type === 'kernel_ready') {
    workerReady = true;
    dispatchNext();
  } else if (msg.type === 'done') {
    execQueue.shift();
    isRunning = false;
    dispatchNext();
  }
}

export function initKernel(): void {
  if (worker !== null) return; // Already initialized.

  useKernelStore.getState().setStatus('loading');

  worker = createWorker();
  worker.onmessage = onWorkerMessage;
  worker.onerror = (err) => {
    console.error('Pyodide worker error:', err);
    useKernelStore.getState().setStatus('error');
  };
}

export function queueCell(cellId: string): void {
  // Lazy kernel init — Pyodide loads only when the user first runs a cell.
  if (worker === null) initKernel();

  const cellStore = useCellStore.getState();
  const code = cellStore.cells[cellId]?.source ?? '';

  cellStore.clearOutputs(cellId);
  cellStore.setStatus(cellId, 'running');

  execQueue.push({ cellId, code });
  useKernelStore.getState().enqueue(cellId);

  dispatchNext();
}

export function restartKernel(): void {
  // Terminate the current worker and drain the queue.
  if (worker !== null) {
    worker.terminate();
    worker = null;
  }
  workerReady = false;
  isRunning = false;
  execQueue.length = 0;

  useKernelStore.getState().clearQueue();
  useKernelStore.getState().setStatus('idle');

  // Reset all cell statuses.
  const { cells, setStatus, clearOutputs } = useCellStore.getState();
  for (const id of Object.keys(cells)) {
    setStatus(id, 'idle');
    clearOutputs(id);
  }
}
