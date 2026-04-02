/**
 * Phase 4 — Polish Tests
 *
 * Tests for interrupt/stop behavior, inline error line-number extraction,
 * kernel restart, notebook persistence, unsupported-package error display,
 * and theme toggling.
 *
 * E2E (Playwright) scenarios — real Stop/interrupt timing, CodeMirror gutter
 * markers appearing and clearing, localStorage theme persistence across actual
 * page reloads — are listed in phase-4.md and not covered here.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCellStore } from '../stores/cellStore';
import { useKernelStore } from '../stores/kernelStore';
import { useNotebookStore } from '../stores/notebookStore';
import { useThemeStore } from '../stores/themeStore';
import { handleWorkerMessage } from '../workers/workerMessageHandler';
import { filterTraceback } from '../utils/filterTraceback';
import { extractErrorLine } from '../utils/tracebackLineNumbers';
import { loadSavedNotebook } from '../utils/persistence';
import { executionLabel } from '../utils/executionLabel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CELL_1 = 'cell-1';
const CELL_2 = 'cell-2';
const CELL_3 = 'cell-3';

const makeCell = (id: string, source = '', status: 'idle' | 'running' | 'success' | 'error' = 'idle') => ({
  id,
  source,
  outputs: [] as never[],
  executionCount: null as null,
  status,
  errorLine: null as null,
});

function resetStores() {
  useCellStore.setState({
    cells: {
      [CELL_1]: makeCell(CELL_1, 'print("hello")'),
      [CELL_2]: makeCell(CELL_2, 'x = 42'),
      [CELL_3]: makeCell(CELL_3, 'print(x)'),
    },
  });
  useNotebookStore.setState({ cellIds: [CELL_1, CELL_2, CELL_3] });
  useKernelStore.setState({ status: 'idle', queue: [] });
}

beforeEach(resetStores);

// ---------------------------------------------------------------------------
// 1. Interrupt / Stop button — queue behavior
// ---------------------------------------------------------------------------

describe('Interrupt / Stop — queue cleared', () => {
  it('clearQueue empties the entire execution queue', () => {
    useKernelStore.setState({ queue: [CELL_1, CELL_2, CELL_3] });
    useKernelStore.getState().clearQueue();
    expect(useKernelStore.getState().queue).toHaveLength(0);
  });

  it('cells queued behind the running cell are gone after Stop', () => {
    useKernelStore.setState({ queue: [CELL_1, CELL_2, CELL_3] });
    useKernelStore.getState().clearQueue();
    expect(useKernelStore.getState().queue).not.toContain(CELL_2);
    expect(useKernelStore.getState().queue).not.toContain(CELL_3);
  });

  it('after Stop the queue length is zero', () => {
    useKernelStore.setState({ queue: [CELL_1, CELL_2] });
    useKernelStore.getState().clearQueue();
    expect(useKernelStore.getState().queue.length).toBe(0);
  });

  it('after Stop, new cells can be enqueued normally', () => {
    useKernelStore.setState({ queue: [CELL_1, CELL_2] });
    useKernelStore.getState().clearQueue();
    useKernelStore.getState().enqueue(CELL_1);
    expect(useKernelStore.getState().queue).toContain(CELL_1);
  });
});

describe('Interrupt / Stop — interrupted cell becomes error', () => {
  beforeEach(() => {
    useCellStore.setState((state) => ({
      cells: {
        ...state.cells,
        [CELL_1]: { ...state.cells[CELL_1], status: 'running' },
      },
    }));
  });

  it('an error message with KeyboardInterrupt sets cell status to error', () => {
    handleWorkerMessage({
      type: 'error',
      cellId: CELL_1,
      traceback: 'Traceback (most recent call last):\n  File "<cell>", line 1, in <module>\nKeyboardInterrupt\n',
    });
    expect(useCellStore.getState().cells[CELL_1].status).toBe('error');
  });

  it('the interrupt traceback is stored as an error output', () => {
    handleWorkerMessage({
      type: 'error',
      cellId: CELL_1,
      traceback: 'KeyboardInterrupt\n',
    });
    const outputs = useCellStore.getState().cells[CELL_1].outputs;
    expect(outputs.some((o) => o.type === 'error')).toBe(true);
  });

  it('the interrupt error output contains the traceback text', () => {
    const traceback = 'KeyboardInterrupt\n';
    handleWorkerMessage({ type: 'error', cellId: CELL_1, traceback });
    const errorOutput = useCellStore
      .getState()
      .cells[CELL_1].outputs.find((o) => o.type === 'error') as
      | { type: 'error'; text: string }
      | undefined;
    expect(errorOutput?.text).toContain('KeyboardInterrupt');
  });
});

// ---------------------------------------------------------------------------
// 2. Inline error highlighting — extractErrorLine
// ---------------------------------------------------------------------------

describe('extractErrorLine — basic extraction', () => {
  it('extracts the line number from a single-frame traceback', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "<cell>", line 3, in <module>',
      'ZeroDivisionError: division by zero',
    ].join('\n');
    expect(extractErrorLine(traceback)).toBe(3);
  });

  it('returns the innermost (last) frame line when multiple frames are present', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "<cell>", line 2, in <module>',
      '  File "<cell>", line 7, in some_function',
      'ValueError: bad value',
    ].join('\n');
    expect(extractErrorLine(traceback)).toBe(7);
  });

  it('returns null when there are no line references', () => {
    expect(extractErrorLine('SyntaxError: invalid syntax')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractErrorLine('')).toBeNull();
  });

  it('correctly parses a two-digit line number', () => {
    const traceback = '  File "<cell>", line 42, in <module>\nNameError: x';
    expect(extractErrorLine(traceback)).toBe(42);
  });
});

describe('extractErrorLine — integration with handleWorkerMessage', () => {
  it('an error message sets errorLine on the cell', () => {
    handleWorkerMessage({
      type: 'error',
      cellId: CELL_1,
      traceback: '  File "<cell>", line 5, in <module>\nNameError: name foo is not defined',
    });
    expect(useCellStore.getState().cells[CELL_1].errorLine).toBe(5);
  });

  it('errorLine is null on a fresh cell before any error', () => {
    expect(useCellStore.getState().cells[CELL_1].errorLine).toBeNull();
  });

  it('a successful done message clears a previous errorLine', () => {
    // Seed an error line.
    useCellStore.getState().setErrorLine(CELL_1, 3);
    // Simulate a successful run (status must not be 'error' for done to promote).
    useCellStore.getState().setStatus(CELL_1, 'running');
    handleWorkerMessage({ type: 'done', cellId: CELL_1, count: 2 });
    expect(useCellStore.getState().cells[CELL_1].errorLine).toBeNull();
  });

  it('setErrorLine stores the given line number', () => {
    useCellStore.getState().setErrorLine(CELL_1, 7);
    expect(useCellStore.getState().cells[CELL_1].errorLine).toBe(7);
  });

  it('setErrorLine(null) clears the error line marker', () => {
    useCellStore.getState().setErrorLine(CELL_1, 3);
    useCellStore.getState().setErrorLine(CELL_1, null);
    expect(useCellStore.getState().cells[CELL_1].errorLine).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. filterTraceback — strips pyodide noise (used before extractErrorLine)
// ---------------------------------------------------------------------------

describe('filterTraceback — strips pyodide-internal frames', () => {
  it('removes lines containing <pyodide>', () => {
    const lines = [
      '  File "<pyodide>", line 1',
      '  File "<cell>", line 2, in <module>',
    ];
    expect(filterTraceback(lines)).not.toContain(lines[0]);
  });

  it('keeps user-code lines intact', () => {
    const lines = [
      '  File "<cell>", line 5, in <module>',
      'NameError: name foo is not defined',
    ];
    expect(filterTraceback(lines)).toEqual(lines);
  });

  it('removes lines containing pyodide/ path fragments', () => {
    const lines = [
      '  File "/lib/python3.11/pyodide/ffi.py", line 10, in load',
      '  File "<cell>", line 1, in <module>',
    ];
    const filtered = filterTraceback(lines);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toContain('<cell>');
  });

  it('returns an empty array when all lines are pyodide-internal', () => {
    const lines = [
      '  File "<pyodide>", line 1',
      '  File "pyodide/_base.py", line 5',
    ];
    expect(filterTraceback(lines)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. Kernel restart — store level
// ---------------------------------------------------------------------------

describe('Kernel restart — queue and kernel status', () => {
  it('after restart the kernel queue is empty', () => {
    useKernelStore.setState({ status: 'ready', queue: [CELL_1, CELL_2] });
    useKernelStore.getState().clearQueue();
    useKernelStore.getState().setStatus('idle');
    expect(useKernelStore.getState().queue).toHaveLength(0);
  });

  it('after restart the kernel status is idle', () => {
    useKernelStore.setState({ status: 'ready', queue: [CELL_1] });
    useKernelStore.getState().clearQueue();
    useKernelStore.getState().setStatus('idle');
    expect(useKernelStore.getState().status).toBe('idle');
  });
});

describe('Kernel restart — cell state reset', () => {
  beforeEach(() => {
    useCellStore.setState({
      cells: {
        [CELL_1]: {
          id: CELL_1,
          source: 'x = 1',
          outputs: [{ type: 'stdout' as const, text: 'ran\n' }],
          executionCount: 1,
          status: 'success' as const,
          errorLine: null,
        },
        [CELL_2]: {
          id: CELL_2,
          source: 'print(x)',
          outputs: [{ type: 'stdout' as const, text: '1\n' }],
          executionCount: 2,
          status: 'success' as const,
          errorLine: null,
        },
      },
    });
    useNotebookStore.setState({ cellIds: [CELL_1, CELL_2] });
    useKernelStore.setState({ status: 'ready', queue: [] });
  });

  it('all cells have idle status after restart', () => {
    const { cells, setStatus } = useCellStore.getState();
    for (const id of Object.keys(cells)) setStatus(id, 'idle');
    expect(useCellStore.getState().cells[CELL_1].status).toBe('idle');
    expect(useCellStore.getState().cells[CELL_2].status).toBe('idle');
  });

  it('all cell outputs are cleared after restart', () => {
    const { cells, clearOutputs } = useCellStore.getState();
    for (const id of Object.keys(cells)) clearOutputs(id);
    expect(useCellStore.getState().cells[CELL_1].outputs).toHaveLength(0);
    expect(useCellStore.getState().cells[CELL_2].outputs).toHaveLength(0);
  });

  it('all execution counters are null after restart — cells show [ ]', () => {
    const { cells, setExecutionCount } = useCellStore.getState();
    for (const id of Object.keys(cells)) setExecutionCount(id, null);
    expect(useCellStore.getState().cells[CELL_1].executionCount).toBeNull();
    expect(useCellStore.getState().cells[CELL_2].executionCount).toBeNull();
  });

  it('a cell with executionCount null and status idle displays [ ]', () => {
    useCellStore.getState().setExecutionCount(CELL_1, null);
    useCellStore.getState().setStatus(CELL_1, 'idle');
    const cell = useCellStore.getState().cells[CELL_1];
    expect(executionLabel(cell.status, cell.executionCount)).toBe('[ ]');
  });
});

// ---------------------------------------------------------------------------
// 5. Notebook persistence — loadSavedNotebook / loadCells / loadCellIds
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'dynassaur_notebook';

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

describe('loadSavedNotebook — restores cells from localStorage', () => {
  it('restores the correct cellIds order from saved data', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cellIds: ['a', 'b', 'c'],
        cells: {
          a: { source: 'x = 1' },
          b: { source: 'print(x)' },
          c: { source: 'y = 2' },
        },
      }),
    );
    loadSavedNotebook();
    expect(useNotebookStore.getState().cellIds).toEqual(['a', 'b', 'c']);
  });

  it('restores source code for each cell', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cellIds: ['a'],
        cells: { a: { source: 'import math\nprint(math.pi)' } },
      }),
    );
    loadSavedNotebook();
    expect(useCellStore.getState().cells['a'].source).toBe('import math\nprint(math.pi)');
  });

  it('restored cells start with idle status and no outputs', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cellIds: ['a'],
        cells: { a: { source: 'pass' } },
      }),
    );
    loadSavedNotebook();
    const cell = useCellStore.getState().cells['a'];
    expect(cell.status).toBe('idle');
    expect(cell.outputs).toEqual([]);
    expect(cell.executionCount).toBeNull();
  });

  it('is a no-op when localStorage has no saved notebook', () => {
    const before = useNotebookStore.getState().cellIds.slice();
    loadSavedNotebook();
    expect(useNotebookStore.getState().cellIds).toEqual(before);
  });

  it('ignores corrupt/invalid JSON without throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{bad json}}}');
    expect(() => loadSavedNotebook()).not.toThrow();
  });

  it('ignores a saved object missing cellIds without throwing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cells: {} }));
    expect(() => loadSavedNotebook()).not.toThrow();
  });
});

describe('loadCells — direct store hydration', () => {
  it('creates cells with the given sources', () => {
    useCellStore.getState().loadCells(['p', 'q'], {
      p: { source: 'a = 1' },
      q: { source: 'b = 2' },
    });
    expect(useCellStore.getState().cells['p'].source).toBe('a = 1');
    expect(useCellStore.getState().cells['q'].source).toBe('b = 2');
  });

  it('loaded cells have idle status and null executionCount', () => {
    useCellStore.getState().loadCells(['p'], { p: { source: 'pass' } });
    const cell = useCellStore.getState().cells['p'];
    expect(cell.status).toBe('idle');
    expect(cell.executionCount).toBeNull();
  });

  it('cells not in the provided list are removed', () => {
    useCellStore.getState().loadCells(['only'], { only: { source: '' } });
    expect(useCellStore.getState().cells[CELL_1]).toBeUndefined();
  });
});

describe('loadCellIds — notebook order restoration', () => {
  it('replaces cellIds with the provided array', () => {
    useNotebookStore.getState().loadCellIds(['x', 'y', 'z']);
    expect(useNotebookStore.getState().cellIds).toEqual(['x', 'y', 'z']);
  });

  it('an empty array clears all cell IDs', () => {
    useNotebookStore.getState().loadCellIds([]);
    expect(useNotebookStore.getState().cellIds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Unsupported packages — error output in cell
// ---------------------------------------------------------------------------

describe('Unsupported packages — error message displayed', () => {
  it('an unsupported-package error is stored in cell output', () => {
    handleWorkerMessage({
      type: 'error',
      cellId: CELL_1,
      traceback: "ModuleNotFoundError: Package 'torch' is not supported in the browser.",
    });
    const outputs = useCellStore.getState().cells[CELL_1].outputs;
    expect(outputs.some((o) => o.type === 'error')).toBe(true);
  });

  it('the error output text contains the package name', () => {
    handleWorkerMessage({
      type: 'error',
      cellId: CELL_1,
      traceback: "Package 'torch' is not supported in the browser.",
    });
    const errorOutput = useCellStore
      .getState()
      .cells[CELL_1].outputs.find((o) => o.type === 'error') as
      | { type: 'error'; text: string }
      | undefined;
    expect(errorOutput?.text).toContain('torch');
  });

  it('an unsupported-package error sets the cell to error status', () => {
    handleWorkerMessage({
      type: 'error',
      cellId: CELL_1,
      traceback: "Package 'torch' is not supported in the browser.",
    });
    expect(useCellStore.getState().cells[CELL_1].status).toBe('error');
  });

});

// ---------------------------------------------------------------------------
// 7. Theme toggle
// ---------------------------------------------------------------------------

describe('ThemeStore — toggling', () => {
  it('isDark has a defined boolean initial value', () => {
    expect(typeof useThemeStore.getState().isDark).toBe('boolean');
  });

  it('toggleTheme flips isDark', () => {
    const before = useThemeStore.getState().isDark;
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDark).toBe(!before);
  });

  it('toggling twice returns to the original value', () => {
    const original = useThemeStore.getState().isDark;
    useThemeStore.getState().toggleTheme();
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDark).toBe(original);
  });

  it('toggling from dark gives light mode', () => {
    useThemeStore.setState({ isDark: true });
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDark).toBe(false);
  });

  it('toggling from light gives dark mode', () => {
    useThemeStore.setState({ isDark: false });
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().isDark).toBe(true);
  });
});
