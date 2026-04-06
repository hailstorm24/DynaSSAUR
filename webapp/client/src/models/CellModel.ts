export type CellStatus = "idle" | "queued" | "running" | "success" | "error";

export interface TextOutput {
  type: "stdout" | "stderr" | "error";
  text: string;
}

export interface CanvasOutput {
  type: "canvas";
  commands: unknown[];
}

export type CellOutput = TextOutput | CanvasOutput;

export interface CellModel {
  id: string;
  source: string;
  outputs: CellOutput[];
  executionCount: number | null;
  status: CellStatus;
  errorLine: number | null;
}
