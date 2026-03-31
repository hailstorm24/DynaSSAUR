/**
 * Phase 1b — Pyodide Integration Tests
 *
 * Tests define the contracts for kernel loading UX, worker message protocol,
 * cell execution lifecycle, and traceback filtering. Store-level tests pass
 * now; filterTraceback and handleWorkerMessage tests fail until implemented.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCellStore } from '../stores/cellStore';
import { useKernelStore } from '../stores/kernelStore';

const CELL_ID = 'cell-1';

function resetStores() {
  useCellStore.setState({
    cells: {
      [CELL_ID]: {
        id: CELL_ID,
        source: 'print("hello")',
        outputs: [],
        executionCount: null,
        status: 'idle',
      },
    },
  });
  useKernelStore.setState({ status: 'idle', queue: [] });
}

beforeEach(resetStores);

// ---------------------------------------------------------------------------
// 1. KernelStore — status lifecycle
// ---------------------------------------------------------------------------

describe('KernelStore — status lifecycle', () => {
  it('starts as idle', () => {
    expect(useKernelStore.getState().status).toBe('idle');
  });

  it('transitions to loading when kernel init begins', () => {
    useKernelStore.getState().setStatus('loading');
    expect(useKernelStore.getState().status).toBe('loading');
  });

  it('transitions to ready after successful kernel init', () => {
    useKernelStore.getState().setStatus('loading');
    useKernelStore.getState().setStatus('ready');
    expect(useKernelStore.getState().status).toBe('ready');
  });

  it('transitions to error when kernel init fails', () => {
    useKernelStore.getState().setStatus('loading');
    useKernelStore.getState().setStatus('error');
    expect(useKernelStore.getState().status).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// 2. KernelStore — execution queue
// ---------------------------------------------------------------------------

describe('KernelStore — execution queue', () => {
  it('enqueue adds a cellId to the queue', () => {
    useKernelStore.getState().enqueue(CELL_ID);
    expect(useKernelStore.getState().queue).toContain(CELL_ID);
  });

  it('dequeue removes the first item', () => {
    useKernelStore.getState().enqueue('cell-a');
    useKernelStore.getState().enqueue('cell-b');
    useKernelStore.getState().dequeue();
    expect(useKernelStore.getState().queue[0]).toBe('cell-b');
  });

  it('clearQueue empties the queue', () => {
    useKernelStore.getState().enqueue('cell-a');
    useKernelStore.getState().enqueue('cell-b');
    useKernelStore.getState().clearQueue();
    expect(useKernelStore.getState().queue).toHaveLength(0);
  });

  it('queue maintains insertion order for multiple cells', () => {
    const ids = ['cell-a', 'cell-b', 'cell-c'];
    ids.forEach((id) => useKernelStore.getState().enqueue(id));
    expect(useKernelStore.getState().queue).toEqual(ids);
  });
});

// ---------------------------------------------------------------------------
// 3. CellStore — execution lifecycle (state driven by worker messages)
// ---------------------------------------------------------------------------

describe('CellStore — execution start', () => {
  it('setStatus running clears the way for a new run', () => {
    useCellStore.getState().setStatus(CELL_ID, 'running');
    expect(useCellStore.getState().cells[CELL_ID].status).toBe('running');
  });

  it('clearOutputs removes previous outputs before execution', () => {
    useCellStore.getState().addOutput(CELL_ID, { type: 'stdout', text: 'old output' });
    useCellStore.getState().clearOutputs(CELL_ID);
    expect(useCellStore.getState().cells[CELL_ID].outputs).toHaveLength(0);
  });
});

describe('CellStore — stdout message handling', () => {
  it('addOutput with type stdout appends a stdout line', () => {
    useCellStore.getState().addOutput(CELL_ID, { type: 'stdout', text: 'hello\n' });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toEqual({ type: 'stdout', text: 'hello\n' });
  });

  it('multiple stdout messages accumulate in order', () => {
    useCellStore.getState().addOutput(CELL_ID, { type: 'stdout', text: 'line 1\n' });
    useCellStore.getState().addOutput(CELL_ID, { type: 'stdout', text: 'line 2\n' });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs).toHaveLength(2);
    expect(outputs[1].text).toBe('line 2\n');
  });
});

describe('CellStore — stderr message handling', () => {
  it('addOutput with type stderr stores a stderr line', () => {
    useCellStore.getState().addOutput(CELL_ID, { type: 'stderr', text: 'warning\n' });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs[0]).toEqual({ type: 'stderr', text: 'warning\n' });
  });
});

describe('CellStore — done message handling', () => {
  it('sets cell status to success on done', () => {
    useCellStore.getState().setStatus(CELL_ID, 'running');
    useCellStore.getState().setStatus(CELL_ID, 'success');
    expect(useCellStore.getState().cells[CELL_ID].status).toBe('success');
  });

  it('sets executionCount from the done message counter', () => {
    useCellStore.getState().setExecutionCount(CELL_ID, 3);
    expect(useCellStore.getState().cells[CELL_ID].executionCount).toBe(3);
  });

  it('executionCount updates across multiple runs', () => {
    useCellStore.getState().setExecutionCount(CELL_ID, 1);
    useCellStore.getState().setExecutionCount(CELL_ID, 2);
    expect(useCellStore.getState().cells[CELL_ID].executionCount).toBe(2);
  });
});

describe('CellStore — error message handling', () => {
  it('sets cell status to error on error message', () => {
    useCellStore.getState().setStatus(CELL_ID, 'running');
    useCellStore.getState().setStatus(CELL_ID, 'error');
    expect(useCellStore.getState().cells[CELL_ID].status).toBe('error');
  });

  it('stores error output with type error', () => {
    useCellStore
      .getState()
      .addOutput(CELL_ID, { type: 'error', text: 'NameError: name x is not defined' });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs[0].type).toBe('error');
  });

  it('error output text contains the traceback', () => {
    const tb = 'Traceback (most recent call last):\n  File "cell", line 1\nNameError: x';
    useCellStore.getState().addOutput(CELL_ID, { type: 'error', text: tb });
    expect(useCellStore.getState().cells[CELL_ID].outputs[0].text).toBe(tb);
  });
});

// ---------------------------------------------------------------------------
// 4. filterTraceback — fails until src/utils/filterTraceback.ts is created
// ---------------------------------------------------------------------------

import { filterTraceback } from '../utils/filterTraceback';

describe('filterTraceback', () => {
  it('passes through a clean user traceback unchanged', () => {
    const lines = [
      'Traceback (most recent call last):',
      '  File "cell", line 2, in <module>',
      '    print(x)',
      "NameError: name 'x' is not defined",
    ];
    expect(filterTraceback(lines)).toEqual(lines);
  });

  it('removes frame lines whose filename contains <pyodide>', () => {
    const lines = [
      'Traceback (most recent call last):',
      '  File "<pyodide>", line 42, in run_code',
      '    result = eval(code)',
      '  File "cell", line 1, in <module>',
      '    print(x)',
      "NameError: name 'x' is not defined",
    ];
    const filtered = filterTraceback(lines);
    expect(filtered.some((l) => l.includes('<pyodide>'))).toBe(false);
  });

  it('removes frame lines whose filename contains pyodide/', () => {
    const lines = [
      'Traceback (most recent call last):',
      '  File "pyodide/runpython.py", line 10, in run',
      '    exec(code)',
      '  File "cell", line 3, in <module>',
      '    1 / 0',
      'ZeroDivisionError: division by zero',
    ];
    const filtered = filterTraceback(lines);
    expect(filtered.some((l) => l.includes('pyodide/'))).toBe(false);
  });

  it('keeps the "Traceback (most recent call last):" header', () => {
    const lines = [
      'Traceback (most recent call last):',
      '  File "<pyodide>", line 5, in exec',
      '  File "cell", line 1, in <module>',
      'ValueError: bad value',
    ];
    const filtered = filterTraceback(lines);
    expect(filtered[0]).toBe('Traceback (most recent call last):');
  });

  it('keeps the final exception line', () => {
    const lines = [
      'Traceback (most recent call last):',
      '  File "<pyodide>", line 1, in run',
      'RuntimeError: something went wrong',
    ];
    const filtered = filterTraceback(lines);
    expect(filtered[filtered.length - 1]).toBe('RuntimeError: something went wrong');
  });

  it('returns an empty array given an empty input', () => {
    expect(filterTraceback([])).toEqual([]);
  });

  it('handles a traceback with only pyodide frames', () => {
    const lines = [
      'Traceback (most recent call last):',
      '  File "<pyodide>", line 1, in run',
      '  File "pyodide/core.py", line 3, in exec',
      'SystemError: internal',
    ];
    const filtered = filterTraceback(lines);
    expect(filtered).not.toContain('  File "<pyodide>", line 1, in run');
    expect(filtered).not.toContain('  File "pyodide/core.py", line 3, in exec');
    expect(filtered[filtered.length - 1]).toBe('SystemError: internal');
  });
});

// ---------------------------------------------------------------------------
// 5. handleWorkerMessage — fails until src/workers/workerMessageHandler.ts is created
// ---------------------------------------------------------------------------

import { handleWorkerMessage } from '../workers/workerMessageHandler';

describe('handleWorkerMessage', () => {
  beforeEach(resetStores);

  it('stdout message appends to cell outputs', () => {
    handleWorkerMessage({ type: 'stdout', cellId: CELL_ID, text: 'hi\n' });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toEqual({ type: 'stdout', text: 'hi\n' });
  });

  it('stderr message appends to cell outputs as stderr', () => {
    handleWorkerMessage({ type: 'stderr', cellId: CELL_ID, text: 'warn\n' });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs[0].type).toBe('stderr');
  });

  it('error message sets cell status to error and appends error output', () => {
    useCellStore.getState().setStatus(CELL_ID, 'running');
    handleWorkerMessage({ type: 'error', cellId: CELL_ID, traceback: 'NameError: x' });
    const cell = useCellStore.getState().cells[CELL_ID];
    expect(cell.status).toBe('error');
    expect(cell.outputs.some((o) => o.type === 'error')).toBe(true);
  });

  it('done message sets cell status to success', () => {
    useCellStore.getState().setStatus(CELL_ID, 'running');
    handleWorkerMessage({ type: 'done', cellId: CELL_ID, count: 1 });
    expect(useCellStore.getState().cells[CELL_ID].status).toBe('success');
  });

  it('done message sets executionCount from count field', () => {
    handleWorkerMessage({ type: 'done', cellId: CELL_ID, count: 5 });
    expect(useCellStore.getState().cells[CELL_ID].executionCount).toBe(5);
  });

  it('done message dequeues the completed cell from the kernel queue', () => {
    useKernelStore.getState().enqueue(CELL_ID);
    handleWorkerMessage({ type: 'done', cellId: CELL_ID, count: 1 });
    expect(useKernelStore.getState().queue).not.toContain(CELL_ID);
  });

  it('kernel_ready message sets kernel status to ready', () => {
    useKernelStore.getState().setStatus('loading');
    handleWorkerMessage({ type: 'kernel_ready' });
    expect(useKernelStore.getState().status).toBe('ready');
  });

  it('kernel_error message sets kernel status to error', () => {
    useKernelStore.getState().setStatus('loading');
    handleWorkerMessage({ type: 'kernel_error' });
    expect(useKernelStore.getState().status).toBe('error');
  });
});
