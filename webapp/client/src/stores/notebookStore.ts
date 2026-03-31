import { create } from 'zustand';

const DEFAULT_CELL_ID = 'cell-1';

interface NotebookState {
  cellIds: string[];
  addCell: (id: string) => void;
  removeCell: (id: string) => void;
  moveCellUp: (id: string) => void;
  moveCellDown: (id: string) => void;
}

export const useNotebookStore = create<NotebookState>((set) => ({
  cellIds: [DEFAULT_CELL_ID],

  addCell: (id: string) => {
    set((state) => ({ cellIds: [...state.cellIds, id] }));
  },

  removeCell: (id: string) => {
    set((state) => ({
      cellIds: state.cellIds.filter((cid) => cid !== id),
    }));
  },

  moveCellUp: (id: string) => {
    set((state) => {
      const idx = state.cellIds.indexOf(id);
      if (idx <= 0) return state;
      const next = [...state.cellIds];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return { cellIds: next };
    });
  },

  moveCellDown: (id: string) => {
    set((state) => {
      const idx = state.cellIds.indexOf(id);
      if (idx < 0 || idx >= state.cellIds.length - 1) return state;
      const next = [...state.cellIds];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return { cellIds: next };
    });
  },
}));
