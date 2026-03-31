import { create } from 'zustand';
import type { CellModel, CellOutput, CellStatus } from '../models/CellModel.ts';

const DEFAULT_CELL_ID = 'cell-1';

const makeDefaultCell = (id: string): CellModel => ({
  id,
  source: '# Write your Python code here\nprint("Hello, DynaSSAUR!")',
  outputs: [],
  executionCount: null,
  status: 'idle',
});

interface CellState {
  cells: Record<string, CellModel>;
  updateSource: (id: string, source: string) => void;
  addOutput: (id: string, output: CellOutput) => void;
  clearOutputs: (id: string) => void;
  setStatus: (id: string, status: CellStatus) => void;
  setExecutionCount: (id: string, count: number) => void;
  addCell: (id: string) => void;
  removeCell: (id: string) => void;
}

export const useCellStore = create<CellState>((set) => ({
  cells: {
    [DEFAULT_CELL_ID]: makeDefaultCell(DEFAULT_CELL_ID),
  },

  updateSource: (id, source) => {
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: { ...state.cells[id], source },
      },
    }));
  },

  addOutput: (id, output) => {
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: {
          ...state.cells[id],
          outputs: [...state.cells[id].outputs, output],
        },
      },
    }));
  },

  clearOutputs: (id) => {
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: { ...state.cells[id], outputs: [] },
      },
    }));
  },

  setStatus: (id, status) => {
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: { ...state.cells[id], status },
      },
    }));
  },

  setExecutionCount: (id, count) => {
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: { ...state.cells[id], executionCount: count },
      },
    }));
  },

  addCell: (id) => {
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: makeDefaultCell(id),
      },
    }));
  },

  removeCell: (id) => {
    set((state) => {
      const next = { ...state.cells };
      delete next[id];
      return { cells: next };
    });
  },
}));
