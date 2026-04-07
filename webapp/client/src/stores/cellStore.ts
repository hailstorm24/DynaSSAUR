import { create } from "zustand";
import type {
  CellModel,
  CellOutput,
  CellStatus,
  CellType,
  VerificationState,
} from "../models/CellModel.ts";

const DEFAULT_CELL_ID = "cell-1";

function defaultSourceForType(type: CellType): string {
  switch (type) {
    case "instruction":
      return "## Lesson instructions\nUse this block to explain the concept before the learner starts coding.";
    case "task":
      return "### Task\nWrite a function that prints a greeting.";
    case "feedback":
      return "Coach feedback will appear here. In sandbox mode, you can edit this block manually.";
    case "code":
    default:
      return '# Write your Python code here\nprint("Hello, DynaSSAUR!")';
  }
}

export const makeCell = (id: string, type: CellType = "code"): CellModel => ({
  id,
  type,
  source: defaultSourceForType(type),
  outputs: [],
  executionCount: null,
  status: "idle",
  errorLine: null,
  verificationState: "idle",
  verificationMessage: "",
});

interface CellState {
  cells: Record<string, CellModel>;
  updateSource: (id: string, source: string) => void;
  addOutput: (id: string, output: CellOutput) => void;
  clearOutputs: (id: string) => void;
  setStatus: (id: string, status: CellStatus) => void;
  setExecutionCount: (id: string, count: number | null) => void;
  setErrorLine: (id: string, line: number | null) => void;
  setVerification: (
    id: string,
    state: VerificationState,
    message: string,
  ) => void;
  addCell: (id: string, type?: CellType) => void;
  removeCell: (id: string) => void;
  loadCells: (
    ids: string[],
    sources: Record<string, { source: string; type?: CellType }>,
  ) => void;
  resetAllCells: () => void;
}

export const useCellStore = create<CellState>((set) => ({
  cells: {
    [DEFAULT_CELL_ID]: makeCell(DEFAULT_CELL_ID, "code"),
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

  setVerification: (id, verificationState, verificationMessage) => {
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: {
          ...state.cells[id],
          verificationState,
          verificationMessage,
        },
      },
    }));
  },

  addCell: (id, type = "code") => {
    set((state) => ({
      cells: {
        ...state.cells,
        [id]: makeCell(id, type),
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
      const type = sources[id]?.type ?? "code";
      cells[id] = { ...makeCell(id, type), source: sources[id]?.source ?? "" };
    }
    set({ cells });
  },

  resetAllCells: () => {
    set({
      cells: {
        [DEFAULT_CELL_ID]: makeCell(DEFAULT_CELL_ID, "code"),
      },
    });
  },
}));
