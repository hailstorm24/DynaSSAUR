export type CellStatus = 'idle' | 'running' | 'success' | 'error';

export interface CellOutput {
  type: 'stdout' | 'stderr' | 'error';
  text: string;
}

export interface CellModel {
  id: string;
  source: string;
  outputs: CellOutput[];
  executionCount: number | null;
  status: CellStatus;
}
