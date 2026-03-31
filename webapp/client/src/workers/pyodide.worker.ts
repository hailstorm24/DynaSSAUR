// Pyodide Web Worker — runs Python in a separate thread via WebAssembly.
// Loaded as an ES module worker (Vite default).
//
// Inbound messages:  { type: 'run', cellId: string, code: string }
// Outbound messages:
//   { type: 'kernel_ready' }
//   { type: 'kernel_error', message: string }
//   { type: 'stdout',       cellId: string, text: string }
//   { type: 'stderr',       cellId: string, text: string }
//   { type: 'error',        cellId: string, traceback: string }
//   { type: 'done',         cellId: string, count: number }

import { filterTraceback } from '../utils/filterTraceback.ts';

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/pyodide.mjs';

// Cast self to avoid DOM lib typing it as Window instead of DedicatedWorkerGlobalScope.
const workerSelf = self as unknown as {
  postMessage: (data: unknown) => void;
  onmessage: ((event: MessageEvent) => unknown) | null;
};

let pyodide: unknown = null;
let currentCellId: string | null = null;
let executionCount = 0;

async function init(): Promise<void> {
  try {
    const { loadPyodide } = await import(/* @vite-ignore */ PYODIDE_CDN);
    pyodide = await loadPyodide({
      stdout: (text: string) => {
        workerSelf.postMessage({ type: 'stdout', cellId: currentCellId, text });
      },
      stderr: (text: string) => {
        workerSelf.postMessage({ type: 'stderr', cellId: currentCellId, text });
      },
    });
    workerSelf.postMessage({ type: 'kernel_ready' });
  } catch (err: unknown) {
    workerSelf.postMessage({ type: 'kernel_error', message: String(err) });
  }
}

workerSelf.onmessage = async (event: MessageEvent) => {
  const { type, cellId, code } = event.data as {
    type: string;
    cellId: string;
    code: string;
  };

  if (type !== 'run') return;

  if (!pyodide) {
    workerSelf.postMessage({ type: 'error', cellId, traceback: 'Kernel not ready.' });
    return;
  }

  currentCellId = cellId;

  // Auto-load any Pyodide-bundled packages the code imports (e.g. numpy, pandas).
  try {
    await (pyodide as any).loadPackagesFromImports(code);
  } catch (err: unknown) {
    workerSelf.postMessage({
      type: 'error',
      cellId,
      traceback:
        `Package load error: ${String(err)}\n` +
        `This package may not be supported in the browser.`,
    });
    currentCellId = null;
    executionCount++;
    workerSelf.postMessage({ type: 'done', cellId, count: executionCount });
    return;
  }

  try {
    await (pyodide as any).runPythonAsync(code);
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    const filtered = filterTraceback(raw.split('\n')).join('\n');
    workerSelf.postMessage({ type: 'error', cellId, traceback: filtered });
  }

  executionCount++;
  currentCellId = null;
  workerSelf.postMessage({ type: 'done', cellId, count: executionCount });
};

init();
