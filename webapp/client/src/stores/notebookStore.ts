import { create } from "zustand";

interface NotebookState {
  cellIds: string[];
  addCell: (id: string) => void;
  removeCell: (id: string) => void;
  moveCellUp: (id: string) => void;
  moveCellDown: (id: string) => void;
  reorderCells: (fromIndex: number, toIndex: number) => void;
  loadCellIds: (ids: string[]) => void;
  resetNotebook: () => void;
}

export const useNotebookStore = create<NotebookState>((set) => ({
  cellIds: [],

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

  // insertBeforeIndex: the index the dragged cell should end up before in the final array
  reorderCells: (fromIndex: number, insertBeforeIndex: number) => {
    set((state) => {
      if (fromIndex === insertBeforeIndex || fromIndex + 1 === insertBeforeIndex) return state;
      const next = [...state.cellIds];
      const [moved] = next.splice(fromIndex, 1);
      const adjusted = fromIndex < insertBeforeIndex ? insertBeforeIndex - 1 : insertBeforeIndex;
      next.splice(adjusted, 0, moved);
      return { cellIds: next };
    });
  },

  loadCellIds: (ids: string[]) => set({ cellIds: ids }),

  resetNotebook: () => set({ cellIds: [] }),
}));
