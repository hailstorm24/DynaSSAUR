import { useCellStore } from '../stores/cellStore.ts';
import { useNotebookStore } from '../stores/notebookStore.ts';
import { useAppStore } from '../stores/appStore.ts';
import { useAssignmentStore } from '../stores/assignmentStore.ts';
import { useAssignmentSessionStore, SESSION_STORAGE_KEY } from '../stores/assignmentSessionStore.ts';
import { serializeNotebook, isValidNotebookData, DEFAULT_SANDBOX_METADATA } from './notebookSerializer.ts';
import type { AssignmentSessionModel } from '../models/AssignmentSessionModel.ts';

const SANDBOX_KEY = 'dynassaur_notebook';

function getNotebookSnapshot() {
  const { cells } = useCellStore.getState();
  const { cellIds } = useNotebookStore.getState();
  return serializeNotebook(cellIds, cells, DEFAULT_SANDBOX_METADATA);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave() {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const { view, currentAssignmentId } = useAppStore.getState();

    if (view === 'assignment' && currentAssignmentId) {
      const { cells } = useCellStore.getState();
      const { cellIds } = useNotebookStore.getState();
      const assignment = useAssignmentStore.getState().getAssignment(currentAssignmentId);
      const metadata = assignment?.notebookData.metadata ?? DEFAULT_SANDBOX_METADATA;
      const data = serializeNotebook(cellIds, cells, metadata);
      useAssignmentStore.getState().updateAssignment(currentAssignmentId, data);
    } else if (view === 'sandbox') {
      localStorage.setItem(SANDBOX_KEY, JSON.stringify(getNotebookSnapshot()));
    }
  }, 500);
}

/**
 * Load the sandbox notebook from localStorage into the stores.
 * Called when switching to sandbox mode.
 */
export function loadSavedSandbox(): void {
  const raw = localStorage.getItem(SANDBOX_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (!isValidNotebookData(data)) return;
    useCellStore.getState().loadCells(data.cellIds, data.cells);
    useNotebookStore.getState().loadCellIds(data.cellIds);
  } catch {
    // Corrupt storage — start fresh.
  }
}

/**
 * Load the sandbox notebook before first render (called from main.tsx).
 * Only hydrates if the app starts in sandbox mode (i.e., previous session was sandbox).
 */
export function loadSavedNotebook(): void {
  loadSavedSandbox();
}

let sessionSaveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSessionSave() {
  if (sessionSaveTimer !== null) clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(() => {
    sessionSaveTimer = null;
    const state = useAssignmentSessionStore.getState();
    const { status, uploadedFiles, blocks, activeBlockIndex } = state;
    const snapshot: AssignmentSessionModel = { status, uploadedFiles, blocks, activeBlockIndex };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  }, 500);
}

export function loadSavedSession(): AssignmentSessionModel | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AssignmentSessionModel;
  } catch {
    return null;
  }
}

/**
 * Subscribe to store changes and auto-save based on current mode.
 * Call once at app startup.
 */
export function initPersistence(): void {
  useCellStore.subscribe(() => debouncedSave());
  useNotebookStore.subscribe(() => debouncedSave());
  useAssignmentSessionStore.subscribe(() => debouncedSessionSave());
}
