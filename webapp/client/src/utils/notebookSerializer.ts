import type { CellModel, CellType } from "../models/CellModel.ts";

export interface NotebookMetadata {
  title: string;
  step: number;
  totalSteps: number;
}

export interface NotebookData {
  metadata: NotebookMetadata;
  cellIds: string[];
  cells: Record<string, { source: string; type: CellType }>;
}

export const DEFAULT_SANDBOX_METADATA: NotebookMetadata = {
  title: "Sandbox",
  step: 1,
  totalSteps: 1,
};

export function serializeNotebook(
  cellIds: string[],
  cells: Record<string, CellModel>,
  metadata: NotebookMetadata = DEFAULT_SANDBOX_METADATA,
): NotebookData {
  return {
    metadata,
    cellIds,
    cells: Object.fromEntries(
      cellIds.map((id) => [
        id,
        {
          source: cells[id]?.source ?? "",
          type: cells[id]?.type ?? "code",
        },
      ]),
    ),
  };
}

export function isValidNotebookData(data: unknown): data is NotebookData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.cellIds) && typeof d.cells === "object" && d.cells !== null
  );
}
