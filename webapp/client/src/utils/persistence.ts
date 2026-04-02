import { useCellStore } from '../stores/cellStore.ts';
import { useNotebookStore } from '../stores/notebookStore.ts';
import { serializeNotebook, isValidNotebookData } from './notebookSerializer.ts';

const STORAGE_KEY = 'dynassaur_notebook';

function getNotebookSnapshot() {
  const { cells } = useCellStore.getState();
  const { cellIds } = useNotebookStore.getState();
  return serializeNotebook(cellIds, cells);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave() {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getNotebookSnapshot()));
  }, 500);
}

/**
 * Load a previously saved notebook from localStorage and hydrate both stores.
 * Call once before React renders so components start with the restored state.
 */
export function loadSavedNotebook(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (!isValidNotebookData(data)) return;
    useCellStore.getState().loadCells(data.cellIds, data.cells);
    useNotebookStore.getState().loadCellIds(data.cellIds);
  } catch {
    // Corrupt storage — ignore, start fresh.
  }
}

/**
 * Subscribe to store changes and auto-save to localStorage (debounced 500 ms).
 * Call once at app startup.
 */
export function initPersistence(): void {
  useCellStore.subscribe(() => debouncedSave());
  useNotebookStore.subscribe(() => debouncedSave());
}
