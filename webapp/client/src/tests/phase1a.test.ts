import { describe, it, expect, beforeEach } from 'vitest';
import { useCellStore } from '../stores/cellStore';
import { useNotebookStore } from '../stores/notebookStore';

// Reset stores to initial state before each test
beforeEach(() => {
  useCellStore.setState({
    cells: {
      'cell-1': {
        id: 'cell-1',
        source: '# Write your Python code here\nprint("Hello, DynaSSAUR!")',
        outputs: [],
        executionCount: null,
        status: 'idle',
      },
    },
  });
  useNotebookStore.setState({ cellIds: ['cell-1'] });
});

describe('CellModel — basic state shape', () => {
  it('default cell has status idle', () => {
    const { cells } = useCellStore.getState();
    expect(cells['cell-1'].status).toBe('idle');
  });

  it('default cell has empty outputs', () => {
    const { cells } = useCellStore.getState();
    expect(cells['cell-1'].outputs).toEqual([]);
  });

  it('default cell has executionCount null', () => {
    const { cells } = useCellStore.getState();
    expect(cells['cell-1'].executionCount).toBeNull();
  });
});

describe('CellStore — cell instantiation', () => {
  it('addCell creates a cell with the given ID', () => {
    useCellStore.getState().addCell('test-cell');
    const { cells } = useCellStore.getState();
    expect(cells['test-cell']).toBeDefined();
  });

  it('new cell has correct initial state', () => {
    useCellStore.getState().addCell('test-cell');
    const cell = useCellStore.getState().cells['test-cell'];
    expect(cell.id).toBe('test-cell');
    expect(cell.status).toBe('idle');
    expect(cell.outputs).toEqual([]);
    expect(cell.executionCount).toBeNull();
  });
});

describe('NotebookStore — initialization', () => {
  it('initializes with at least one cell', () => {
    const { cellIds } = useNotebookStore.getState();
    expect(cellIds.length).toBeGreaterThanOrEqual(1);
  });
});
