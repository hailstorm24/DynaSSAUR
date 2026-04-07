import { useCellStore } from "../stores/cellStore.ts";
import { useKernelStore } from "../stores/kernelStore.ts";
import {
  handleWorkerMessage,
  type WorkerMessage,
} from "../workers/workerMessageHandler.ts";

type QueueItem = { cellId: string; code: string };

// In-memory execution queue (main thread). Serial: only one cell runs at a time.
const execQueue: QueueItem[] = [];
let worker: Worker | null = null;
let workerReady = false;
let isRunning = false;
let interruptTimer: ReturnType<typeof setTimeout> | null = null;

function createWorker(): Worker {
  return new Worker(new URL("../workers/pyodide.worker.ts", import.meta.url), {
    type: "module",
  });
}

function dispatchNext(): void {
  if (isRunning || !workerReady || execQueue.length === 0) return;

  isRunning = true;
  const { cellId, code } = execQueue[0];

  const cellStore = useCellStore.getState();
  cellStore.setStatus(cellId, "running");

  worker!.postMessage({ type: "run", cellId, code });
}

function onWorkerMessage(event: MessageEvent): void {
  const msg = event.data as WorkerMessage;

  // Delegate all store mutations to the shared handler.
  handleWorkerMessage(msg);

  // KernelController-only side-effects: drive the local execution queue.
  if (msg.type === "kernel_ready") {
    workerReady = true;
    dispatchNext();
  } else if (msg.type === "done") {
    // If an interrupt timer is pending, the worker finished before the 2s timeout — cancel it.
    if (interruptTimer !== null) {
      clearTimeout(interruptTimer);
      interruptTimer = null;
    }
    execQueue.shift();
    isRunning = false;
    dispatchNext();
  }
}

export function initKernel(): void {
  if (worker !== null) return;

  useKernelStore.getState().setStatus("loading");

  worker = createWorker();
  worker.onmessage = onWorkerMessage;
  worker.onerror = (err) => {
    console.error("Pyodide worker error:", err);
    useKernelStore.getState().setStatus("error");
  };
}

export function queueCell(cellId: string): void {
  // Lazy kernel init — Pyodide loads only when the user first runs a cell.
  if (worker === null) initKernel();

  const cellStore = useCellStore.getState();
  const cell = cellStore.cells[cellId];
  if (!cell || (cell.type ?? "code") !== "code") return;

  const code = cell.source;
  cellStore.clearOutputs(cellId);
  cellStore.setErrorLine(cellId, null);
  cellStore.setStatus(cellId, "queued");

  execQueue.push({ cellId, code });
  useKernelStore.getState().enqueue(cellId);

  dispatchNext();
}

export function stopCell(): void {
  if (!isRunning || worker === null) return;

  const runningItem = execQueue[0];
  if (!runningItem) return;

  const { cellId } = runningItem;
  const cellStore = useCellStore.getState();

  // Immediately mark the running cell as interrupted.
  cellStore.addOutput(cellId, {
    type: "error",
    text: "KeyboardInterrupt: Execution interrupted by user.",
  });
  cellStore.setStatus(cellId, "error");

  // Reset all waiting cells back to idle and drain both queues.
  for (const item of execQueue.slice(1)) {
    cellStore.setStatus(item.cellId, "idle");
  }
  execQueue.length = 0;
  useKernelStore.getState().clearQueue();

  // Schedule hard termination after 2 s if the worker doesn't finish on its own.
  interruptTimer = setTimeout(() => {
    interruptTimer = null;
    if (worker !== null) {
      worker.terminate();
      worker = null;
    }
    workerReady = false;
    isRunning = false;
    // Reinitialize so subsequent cells can run.
    initKernel();
  }, 2000);
}

export function restartKernel(): void {
  // Cancel any pending interrupt timer.
  if (interruptTimer !== null) {
    clearTimeout(interruptTimer);
    interruptTimer = null;
  }

  // Terminate the current worker and drain the queue.
  if (worker !== null) {
    worker.terminate();
    worker = null;
  }
  workerReady = false;
  isRunning = false;
  execQueue.length = 0;

  useKernelStore.getState().clearQueue();
  useKernelStore.getState().setStatus("idle");

  const { cells, setStatus, clearOutputs, setExecutionCount, setErrorLine } =
    useCellStore.getState();
  for (const id of Object.keys(cells)) {
    if ((cells[id]?.type ?? "code") === "code") {
      setStatus(id, "idle");
      clearOutputs(id);
      setExecutionCount(id, null);
      setErrorLine(id, null);
    }
  }
}
