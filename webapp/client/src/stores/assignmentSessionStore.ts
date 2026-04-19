import { create } from 'zustand';
import type {
  AssignmentSessionModel,
  Block,
  EvalState,
  ChatMessage,
  UploadedFiles,
  SummaryBlock,
} from '../models/AssignmentSessionModel.ts';

export const SESSION_STORAGE_KEY = 'assignment-session';

const initialState: AssignmentSessionModel = {
  uploadedFiles: { assignment: '', solution: '', tests: '' },
  blocks: [],
  activeBlockIndex: 0,
  status: 'uploading',
};

interface AssignmentSessionState extends AssignmentSessionModel {
  initSession: (files: UploadedFiles, summaryBlock: SummaryBlock) => void;
  appendBlock: (block: Block) => void;
  updateStudentContent: (index: number, content: string) => void;
  setEvalState: (index: number, evalState: EvalState) => void;
  appendChatMessage: (index: number, message: ChatMessage) => void;
  setStatus: (status: AssignmentSessionModel['status']) => void;
  reset: () => void;
}

export const useAssignmentSessionStore = create<AssignmentSessionState>((set, get) => ({
  ...initialState,

  initSession: (files, summaryBlock) => {
    set({
      uploadedFiles: files,
      blocks: [summaryBlock],
      activeBlockIndex: 0,
      status: 'active',
    });
  },

  appendBlock: (block) => {
    const blocks = [...get().blocks, block];
    set({ blocks, activeBlockIndex: blocks.length - 1 });
  },

  updateStudentContent: (index, content) => {
    const blocks = get().blocks.map((b, i) => {
      if (i !== index || b.type === 'summary') return b;
      return { ...b, studentContent: content };
    });
    set({ blocks });
  },

  setEvalState: (index, evalState) => {
    const blocks = get().blocks.map((b, i) => {
      if (i !== index || b.type === 'summary') return b;
      return { ...b, evalState };
    });
    set({ blocks });
  },

  appendChatMessage: (index, message) => {
    const blocks = get().blocks.map((b, i) => {
      if (i !== index || b.type === 'summary') return b;
      return { ...b, chatHistory: [...b.chatHistory, message] };
    });
    set({ blocks });
  },

  setStatus: (status) => {
    set({ status });
  },

  reset: () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    set(initialState);
  },
}));
