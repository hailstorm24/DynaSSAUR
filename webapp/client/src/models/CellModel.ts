export type CellType = "instruction" | "task" | "code" | "feedback";
export type CellStatus = "idle" | "queued" | "running" | "success" | "error";
export type VerificationState =
  | "idle"
  | "pending"
  | "passed"
  | "needs-revision";

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
  type?: CellType;
  source: string;
  outputs: CellOutput[];
  executionCount: number | null;
  status: CellStatus;
  errorLine?: number | null;
  verificationState?: VerificationState;
  verificationMessage?: string;
}
