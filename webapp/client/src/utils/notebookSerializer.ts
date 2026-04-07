import type { CellModel, CellType } from "../models/CellModel.ts";

export interface NotebookData {
  cellIds: string[];
  cells: Record<string, { source: string; type: CellType }>;
}

/**
 * Serialize cell data into a plain JSON-safe notebook representation.
 * Only source code is persisted; outputs and execution state are transient.
 */
export function serializeNotebook(
  cellIds: string[],
  cells: Record<string, CellModel>,
): NotebookData {
  return {
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

/**
 * Validate that an unknown value is a well-formed NotebookData object.
 */
export function isValidNotebookData(data: unknown): data is NotebookData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.cellIds) && typeof d.cells === "object" && d.cells !== null
  );
}
