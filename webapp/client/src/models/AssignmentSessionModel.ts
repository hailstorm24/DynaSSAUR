export type EvalState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'passed' }
  | { status: 'failed'; feedback: string };

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
