import { useNotebookStore } from "../stores/notebookStore.ts";
import { useCellStore } from "../stores/cellStore.ts";
import { queueCell, restartKernel } from "./KernelController.ts";
import {
  serializeNotebook,
  isValidNotebookData,
} from "../utils/notebookSerializer.ts";

/**
 * Queues all cells in notebook order for sequential execution.
 */
export function runAll(): void {
  const cellIds = useNotebookStore.getState().cellIds;
  for (const id of cellIds) {
    queueCell(id);
  }
}

/**
 * Clears the notebook back to a single starter cell and resets the kernel.
 */
export function clearAllCells(): void {
  restartKernel();
  useCellStore.getState().resetAllCells();
  useNotebookStore.getState().resetNotebook();
}

/**
 * Serializes the notebook to JSON and triggers a file download.
 */
export function downloadNotebook(): void {
  const { cells } = useCellStore.getState();
  const { cellIds } = useNotebookStore.getState();

  const data = serializeNotebook(cellIds, cells);
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "notebook.json";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Opens a file picker and loads a previously saved notebook JSON.
 */
export function importNotebook(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!isValidNotebookData(data)) return;
        useCellStore.getState().loadCells(data.cellIds, data.cells);
        useNotebookStore.getState().loadCellIds(data.cellIds);
      } catch {
        // Invalid or corrupt file — silently ignore.
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

export { restartKernel };
