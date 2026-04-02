/**
 * Phase 2 — Notebook Tests
 *
 * Tests define the contracts for multi-cell notebook behavior: ordering,
 * shared kernel state, and execution sequencing.
 *
 * Store-level tests pass now; formatExecutionCount tests fail until
 * src/utils/formatExecutionCount.ts is created.
 *
 * E2E (Playwright) scenarios listed in phase-2.md are not covered here —
 * they require a real browser + Pyodide and belong in a separate e2e/ suite.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCellStore } from '../stores/cellStore';
import { useNotebookStore } from '../stores/notebookStore';
import { useKernelStore } from '../stores/kernelStore';
import { executionLabel } from '../utils/executionLabel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStores() {
  useCellStore.setState({
    cells: {
      'cell-1': {
        id: 'cell-1',
        source: 'print("hello")',
        outputs: [],
        executionCount: null,
        status: 'idle',
      },
      'cell-2': {
        id: 'cell-2',
        source: 'print("world")',
        outputs: [],
        executionCount: null,
        status: 'idle',
      },
    },
  });
  useNotebookStore.setState({ cellIds: ['cell-1', 'cell-2'] });
  useKernelStore.setState({ status: 'idle', queue: [] });
}

beforeEach(resetStores);

// ---------------------------------------------------------------------------
// 1. NotebookStore — cell list mutations
// ---------------------------------------------------------------------------

describe('NotebookStore — addCell', () => {
  it('appends new cell to the end of cellIds', () => {
    useNotebookStore.getState().addCell('cell-3');
    const { cellIds } = useNotebookStore.getState();
    expect(cellIds[cellIds.length - 1]).toBe('cell-3');
  });

  it('preserves existing cells when a new one is added', () => {
    useNotebookStore.getState().addCell('cell-3');
    const { cellIds } = useNotebookStore.getState();
    expect(cellIds).toContain('cell-1');
    expect(cellIds).toContain('cell-2');
  });

  it('cellIds length increases by one', () => {
    const before = useNotebookStore.getState().cellIds.length;
    useNotebookStore.getState().addCell('cell-new');
    expect(useNotebookStore.getState().cellIds.length).toBe(before + 1);
  });
});

describe('NotebookStore — removeCell', () => {
  it('removes the target cell from cellIds', () => {
    useNotebookStore.getState().removeCell('cell-1');
    expect(useNotebookStore.getState().cellIds).not.toContain('cell-1');
  });

  it('preserves remaining cells in order after removal', () => {
    useNotebookStore.getState().addCell('cell-3');
    useNotebookStore.getState().removeCell('cell-2');
    expect(useNotebookStore.getState().cellIds).toEqual(['cell-1', 'cell-3']);
  });

  it('removing a non-existent id is a no-op', () => {
    const before = [...useNotebookStore.getState().cellIds];
    useNotebookStore.getState().removeCell('ghost-cell');
    expect(useNotebookStore.getState().cellIds).toEqual(before);
  });
});

describe('NotebookStore — moveCellUp', () => {
  it('swaps the cell with its predecessor', () => {
    useNotebookStore.getState().moveCellUp('cell-2');
    expect(useNotebookStore.getState().cellIds).toEqual(['cell-2', 'cell-1']);
  });

  it('no cells are lost after moveCellUp', () => {
    useNotebookStore.getState().moveCellUp('cell-2');
    const { cellIds } = useNotebookStore.getState();
    expect(cellIds).toHaveLength(2);
    expect(cellIds).toContain('cell-1');
    expect(cellIds).toContain('cell-2');
  });

  it('moveCellUp on the first cell is a no-op', () => {
    useNotebookStore.getState().moveCellUp('cell-1');
    expect(useNotebookStore.getState().cellIds[0]).toBe('cell-1');
  });
});

describe('NotebookStore — moveCellDown', () => {
  it('swaps the cell with its successor', () => {
    useNotebookStore.getState().moveCellDown('cell-1');
    expect(useNotebookStore.getState().cellIds).toEqual(['cell-2', 'cell-1']);
  });

  it('no cells are lost after moveCellDown', () => {
    useNotebookStore.getState().moveCellDown('cell-1');
    const { cellIds } = useNotebookStore.getState();
    expect(cellIds).toHaveLength(2);
    expect(cellIds).toContain('cell-1');
    expect(cellIds).toContain('cell-2');
  });

  it('moveCellDown on the last cell is a no-op', () => {
    useNotebookStore.getState().moveCellDown('cell-2');
    const { cellIds } = useNotebookStore.getState();
    expect(cellIds[cellIds.length - 1]).toBe('cell-2');
  });
});

// ---------------------------------------------------------------------------
// 2. CellStore — cell lookup by ID
// ---------------------------------------------------------------------------

describe('CellStore — cell lookup', () => {
  it('looking up an existing cell ID returns the correct CellModel', () => {
    const cell = useCellStore.getState().cells['cell-1'];
    expect(cell).toBeDefined();
    expect(cell.id).toBe('cell-1');
  });

  it('looking up a non-existent ID returns undefined (no throw)', () => {
    expect(() => {
      const cell = useCellStore.getState().cells['does-not-exist'];
      expect(cell).toBeUndefined();
    }).not.toThrow();
  });

  it('lookup returns the right cell when multiple cells exist', () => {
    const cell = useCellStore.getState().cells['cell-2'];
    expect(cell.id).toBe('cell-2');
    expect(cell.source).toBe('print("world")');
  });
});

// ---------------------------------------------------------------------------
// 3. Execution counter — state
// ---------------------------------------------------------------------------

describe('Execution counter — state', () => {
  it('a cell that has never been run has executionCount null', () => {
    expect(useCellStore.getState().cells['cell-1'].executionCount).toBeNull();
  });

  it('after the first cell run its counter is 1', () => {
    useCellStore.getState().setExecutionCount('cell-1', 1);
    expect(useCellStore.getState().cells['cell-1'].executionCount).toBe(1);
  });

  it('running a second cell gives it counter 2', () => {
    useCellStore.getState().setExecutionCount('cell-1', 1);
    useCellStore.getState().setExecutionCount('cell-2', 2);
    expect(useCellStore.getState().cells['cell-2'].executionCount).toBe(2);
  });

  it('re-running cell-1 after cell-2 gives it counter 3', () => {
    useCellStore.getState().setExecutionCount('cell-1', 1);
    useCellStore.getState().setExecutionCount('cell-2', 2);
    useCellStore.getState().setExecutionCount('cell-1', 3);
    expect(useCellStore.getState().cells['cell-1'].executionCount).toBe(3);
  });

  it('a cell that is running has status running', () => {
    useCellStore.getState().setStatus('cell-1', 'running');
    expect(useCellStore.getState().cells['cell-1'].status).toBe('running');
  });

  it('a queued cell appears in the kernel queue', () => {
    useKernelStore.getState().enqueue('cell-1');
    expect(useKernelStore.getState().queue).toContain('cell-1');
  });
});

// ---------------------------------------------------------------------------
// 4. executionLabel — display formatting for execution counter
// ---------------------------------------------------------------------------

describe('executionLabel', () => {
  it('returns "[ ]" for a cell that has never been run (null, idle)', () => {
    expect(executionLabel('idle', null)).toBe('[ ]');
  });

  it('returns "[*]" for a cell that is currently running', () => {
    expect(executionLabel('running', null)).toBe('[*]');
  });

  it('returns "[*]" for a running cell even if it has a previous count', () => {
    expect(executionLabel('running', 2)).toBe('[*]');
  });

  it('returns "[1]" after the first successful run', () => {
    expect(executionLabel('success', 1)).toBe('[1]');
  });

  it('returns "[3]" after three total runs', () => {
    expect(executionLabel('success', 3)).toBe('[3]');
  });

  it('returns "[ ]" for a cell in error state with no prior count', () => {
    expect(executionLabel('error', null)).toBe('[ ]');
  });

  it('shows previous count for a cell in error state with a prior count', () => {
    expect(executionLabel('error', 2)).toBe('[2]');
  });
});