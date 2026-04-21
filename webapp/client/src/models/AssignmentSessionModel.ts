export type EvalState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'passed' }
  | { status: 'failed'; feedback: string; testOutput?: string };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SummaryBlock {
  type: 'summary';
  content: string;
}

export interface PlanningBlock {
  type: 'planning';
  instruction: string;
  studentContent: string;
  evalState: EvalState;
  chatHistory: ChatMessage[];
}

export interface CodingBlock {
  type: 'coding';
  instruction: string;
  studentContent: string;
  testFunctions: string[];
  evalState: EvalState;
  chatHistory: ChatMessage[];
}

export type Block = SummaryBlock | PlanningBlock | CodingBlock;

export interface UploadedFiles {
  assignment: string;
  solution: string;
  tests: string;
}

export interface AssignmentSessionModel {
  uploadedFiles: UploadedFiles;
  blocks: Block[];
  activeBlockIndex: number;
  status: 'uploading' | 'initializing' | 'active' | 'complete';
}

export function isValidSessionData(data: unknown): data is AssignmentSessionModel {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.uploadedFiles === 'object' && d.uploadedFiles !== null &&
    Array.isArray(d.blocks) &&
    typeof d.activeBlockIndex === 'number' &&
    typeof d.status === 'string' &&
    ['uploading', 'initializing', 'active', 'complete'].includes(d.status as string)
  );
}
