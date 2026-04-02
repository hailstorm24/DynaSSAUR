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
//   { type: 'turtle',       cellId: string, commands: unknown[] }

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

    // Load the turtle shim and register it as sys.modules['turtle'].
    const shimResp = await fetch('/turtle_shim.py');
    const shimSrc = await shimResp.text();
    (pyodide as any).FS.writeFile('/turtle_shim.py', shimSrc);
    await (pyodide as any).runPythonAsync(`
import sys as _sys
if '/' not in _sys.path:
    _sys.path.insert(0, '/')
import turtle_shim as _ts
_sys.modules['turtle'] = _ts
del _ts
`);

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
    const errStr = String(err);
    const pkgMatch = errStr.match(/'([^']+)'/) ?? errStr.match(/"([^"]+)"/);
    const pkgName = pkgMatch ? pkgMatch[1] : 'This package';
    workerSelf.postMessage({
      type: 'error',
      cellId,
      traceback: `Package ${pkgName} is not supported in the browser.`,
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

  // Extract any buffered turtle commands and post them before 'done'.
  try {
    const pyList = (pyodide as any).runPython(
      'import turtle_shim as _ts; _cmds = list(_ts._commands); _ts._reset(); _cmds'
    );
    const commands: unknown[] = pyList.toJs({ dict_converter: Object.fromEntries });
    pyList.destroy();
    if (commands.length > 0) {
      workerSelf.postMessage({ type: 'turtle', cellId, commands });
    }
  } catch {
    // Turtle shim not loaded or no commands — safe to ignore.
  }

  executionCount++;
  currentCellId = null;
  workerSelf.postMessage({ type: 'done', cellId, count: executionCount });
};

init();
