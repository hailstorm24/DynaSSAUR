import { useCellStore } from "../stores/cellStore.ts";
import { useNotebookStore } from "../stores/notebookStore.ts";
import { queueCell } from "./KernelController.ts";
import type { CellType } from "../models/CellModel.ts";

let cellCounter = 2;

export function addCell(): void {
  addBlock("code");
}

export function addBlock(type: CellType): void {
  const newId = `cell-${cellCounter++}`;
  useNotebookStore.getState().addCell(newId);
  useCellStore.getState().addCell(newId, type);
}

export function removeCell(id: string): void {
  useNotebookStore.getState().removeCell(id);
  useCellStore.getState().removeCell(id);
}

export function runCell(id: string): void {
  useCellStore.getState().setVerification(id, "idle", "");
  queueCell(id);
}

export function verifyCell(id: string): void {
  const { cells, setVerification } = useCellStore.getState();
  const cell = cells[id];
  if (!cell || (cell.type ?? "code") !== "code") return;

  setVerification(id, "pending", "Reviewing your implementation…");

  window.setTimeout(() => {
    const latest = useCellStore.getState().cells[id];
    if (!latest || (latest.type ?? "code") !== "code") return;

    const trimmed = latest.source.trim();
    const hasRuntimeError = latest.status === "error";
    const isTooSmall = trimmed.length < 12;
    const stillPlaceholder = /TODO|pass\b|Write your Python code here/i.test(
      trimmed,
    );

    if (hasRuntimeError) {
      setVerification(
        id,
        "needs-revision",
        "Run this block without errors first, then verify again.",
      );
      return;
    }

    if (isTooSmall || stillPlaceholder) {
      setVerification(
        id,
        "needs-revision",
        "This looks incomplete. Try implementing a fuller solution before moving on.",
      );
      return;
    }

    setVerification(
      id,
      "passed",
      "Prototype verify passed. Later, your backend can replace this with real rubric-based feedback.",
    );
  }, 500);
}
