import { create } from "zustand";
import type { CellModel, CellOutput, CellStatus } from "../models/CellModel.ts";

const DEFAULT_CELL_ID = "cell-1";

export const makeDefaultCell = (id: string): CellModel => ({
  id,
  source: '# Write your Python code here\nprint("Hello, DynaSSAUR!")',
  outputs: [],
  executionCount: null,
  status: "idle",
  errorLine: null,
});

interface CellState {
  cells: Record<string, CellModel>;
  updateSource: (id: string, source: string) => void;
  addOutput: (id: string, output: CellOutput) => void;
  clearOutputs: (id: string) => void;
  setStatus: (id: string, status: CellStatus) => void;
  setExecutionCount: (id: string, count: number | null) => void;
  setErrorLine: (id: string, line: number | null) => void;
  addCell: (id: string) => void;
  removeCell: (id: string) => void;
  loadCells: (
    ids: string[],
    sources: Record<string, { source: string }>,
  ) => void;
  resetAllCells: () => void;
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

  setErrorLine: (id, line) => {
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: { ...state.cells[id], errorLine: line },
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

  loadCells: (ids, sources) => {
    const cells: Record<string, CellModel> = {};
    for (const id of ids) {
      cells[id] = { ...makeDefaultCell(id), source: sources[id]?.source ?? "" };
    }
    set({ cells });
  },

  resetAllCells: () => {
    set({
      cells: {
        [DEFAULT_CELL_ID]: makeDefaultCell(DEFAULT_CELL_ID),
      },
    });
  },
}));
