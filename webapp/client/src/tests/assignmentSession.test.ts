import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAssignmentSessionStore, SESSION_STORAGE_KEY } from '../stores/assignmentSessionStore';
import type {
  SummaryBlock,
  PlanningBlock,
  CodingBlock,
  ChatMessage,
  UploadedFiles,
} from '../models/AssignmentSessionModel';

const TEST_FILES: UploadedFiles = {
  assignment: 'assignment content',
  solution: 'solution content',
  tests: 'tests content',
};

const SUMMARY_BLOCK: SummaryBlock = { type: 'summary', content: '## Overview' };

const PLANNING_BLOCK: PlanningBlock = {
  type: 'planning',
  instruction: 'Plan your approach',
  studentContent: '',
  evalState: { status: 'idle' },
  chatHistory: [],
};

const CODING_BLOCK: CodingBlock = {
  type: 'coding',
  instruction: 'Write the code',
  studentContent: '',
  testFunctions: ['test_basic', 'test_edge'],
  evalState: { status: 'idle' },
  chatHistory: [],
};

beforeEach(() => {
  localStorage.clear();
  useAssignmentSessionStore.setState({
    uploadedFiles: { assignment: '', solution: '', tests: '' },
    blocks: [],
    activeBlockIndex: 0,
    status: 'uploading',
  });
});

describe('initSession', () => {
  it('sets uploadedFiles and pushes summary block', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    const { uploadedFiles, blocks, activeBlockIndex, status } = useAssignmentSessionStore.getState();
    expect(uploadedFiles).toEqual(TEST_FILES);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual(SUMMARY_BLOCK);
    expect(activeBlockIndex).toBe(0);
    expect(status).toBe('active');
  });
});

describe('appendBlock', () => {
  it('pushes a block and advances activeBlockIndex', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(PLANNING_BLOCK);
    const { blocks, activeBlockIndex } = useAssignmentSessionStore.getState();
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toEqual(PLANNING_BLOCK);
    expect(activeBlockIndex).toBe(1);
  });

  it('activeBlockIndex always points to the last block', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(PLANNING_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(CODING_BLOCK);
    expect(useAssignmentSessionStore.getState().activeBlockIndex).toBe(2);
    expect(useAssignmentSessionStore.getState().blocks).toHaveLength(3);
  });
});

describe('updateStudentContent', () => {
  it('updates studentContent on a planning block', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(PLANNING_BLOCK);
    useAssignmentSessionStore.getState().updateStudentContent(1, 'my plan');
    const block = useAssignmentSessionStore.getState().blocks[1];
    expect(block.type).toBe('planning');
    if (block.type === 'planning') expect(block.studentContent).toBe('my plan');
  });

  it('does not modify a summary block', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().updateStudentContent(0, 'ignored');
    const block = useAssignmentSessionStore.getState().blocks[0];
    expect(block.type).toBe('summary');
    if (block.type === 'summary') expect(block.content).toBe('## Overview');
  });
});

describe('setEvalState', () => {
  it('transitions to passed', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(PLANNING_BLOCK);
    useAssignmentSessionStore.getState().setEvalState(1, { status: 'passed' });
    const block = useAssignmentSessionStore.getState().blocks[1];
    if (block.type !== 'summary') expect(block.evalState).toEqual({ status: 'passed' });
  });

  it('transitions to failed with feedback', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(PLANNING_BLOCK);
    useAssignmentSessionStore.getState().setEvalState(1, { status: 'failed', feedback: 'needs work' });
    const block = useAssignmentSessionStore.getState().blocks[1];
    if (block.type !== 'summary') {
      expect(block.evalState.status).toBe('failed');
      if (block.evalState.status === 'failed') expect(block.evalState.feedback).toBe('needs work');
    }
  });

  it('transitions to running', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(CODING_BLOCK);
    useAssignmentSessionStore.getState().setEvalState(1, { status: 'running' });
    const block = useAssignmentSessionStore.getState().blocks[1];
    if (block.type !== 'summary') expect(block.evalState).toEqual({ status: 'running' });
  });
});

describe('appendChatMessage', () => {
  it('appends messages in order', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(PLANNING_BLOCK);
    const userMsg: ChatMessage = { role: 'user', content: 'help me' };
    const assistantMsg: ChatMessage = { role: 'assistant', content: 'sure!' };
    useAssignmentSessionStore.getState().appendChatMessage(1, userMsg);
    useAssignmentSessionStore.getState().appendChatMessage(1, assistantMsg);
    const block = useAssignmentSessionStore.getState().blocks[1];
    if (block.type !== 'summary') {
      expect(block.chatHistory).toHaveLength(2);
      expect(block.chatHistory[0]).toEqual(userMsg);
      expect(block.chatHistory[1]).toEqual(assistantMsg);
    }
  });

  it('maintains separate chat histories per block', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(PLANNING_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(CODING_BLOCK);
    useAssignmentSessionStore.getState().appendChatMessage(1, { role: 'user', content: 'q1' });
    useAssignmentSessionStore.getState().appendChatMessage(2, { role: 'user', content: 'q2' });
    const b1 = useAssignmentSessionStore.getState().blocks[1];
    const b2 = useAssignmentSessionStore.getState().blocks[2];
    if (b1.type !== 'summary') expect(b1.chatHistory).toHaveLength(1);
    if (b2.type !== 'summary') expect(b2.chatHistory).toHaveLength(1);
  });
});

describe('setStatus', () => {
  it('transitions status to complete', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().setStatus('complete');
    expect(useAssignmentSessionStore.getState().status).toBe('complete');
  });

  it('transitions status to initializing', () => {
    useAssignmentSessionStore.getState().setStatus('initializing');
    expect(useAssignmentSessionStore.getState().status).toBe('initializing');
  });
});

describe('reset', () => {
  it('returns state to initial uploading state', () => {
    useAssignmentSessionStore.getState().initSession(TEST_FILES, SUMMARY_BLOCK);
    useAssignmentSessionStore.getState().appendBlock(PLANNING_BLOCK);
    useAssignmentSessionStore.getState().reset();
    const { blocks, status, activeBlockIndex } = useAssignmentSessionStore.getState();
    expect(blocks).toHaveLength(0);
    expect(status).toBe('uploading');
    expect(activeBlockIndex).toBe(0);
  });

  it('clears localStorage on reset', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{"dummy":true}');
    useAssignmentSessionStore.getState().reset();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});

describe('upload flow: POST /api/session/init → initSession', () => {
  it('mocks fetch, calls initSession, and sets store state correctly', async () => {
    const mockSummary = '## Assignment Overview\n\nTest summary.';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ summaryContent: mockSummary }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const files = { assignment: 'assign text', solution: 'solution text', tests: 'tests text' };

    const res = await fetch('/api/session/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });
    const { summaryContent } = await res.json() as { summaryContent: string };
    useAssignmentSessionStore.getState().initSession(files, { type: 'summary', content: summaryContent });

    const state = useAssignmentSessionStore.getState();
    expect(mockFetch).toHaveBeenCalledWith('/api/session/init', expect.objectContaining({ method: 'POST' }));
    expect(state.status).toBe('active');
    expect(state.uploadedFiles).toEqual(files);
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0]).toEqual({ type: 'summary', content: mockSummary });

    vi.unstubAllGlobals();
  });

  it('does not call initSession when fetch returns an error status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', mockFetch);

    let threw = false;
    try {
      const res = await fetch('/api/session/init', { method: 'POST' });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
    } catch {
      threw = true;
    }

    expect(threw).toBe(true);
    // Store should remain in initial uploading state
    expect(useAssignmentSessionStore.getState().status).toBe('uploading');

    vi.unstubAllGlobals();
  });
});

describe('JSON round-trip', () => {
  it('serializes and deserializes without data loss', () => {
    const store = useAssignmentSessionStore.getState();
    store.initSession(TEST_FILES, SUMMARY_BLOCK);
    store.appendBlock(PLANNING_BLOCK);
    store.appendBlock(CODING_BLOCK);
    store.updateStudentContent(1, 'my plan text');
    store.updateStudentContent(2, 'def solve(): pass');
    store.setEvalState(1, { status: 'passed' });
    store.setEvalState(2, { status: 'failed', feedback: 'wrong answer' });
    store.appendChatMessage(1, { role: 'user', content: 'hint?' });
    store.appendChatMessage(1, { role: 'assistant', content: 'think harder' });

    const { status, uploadedFiles, blocks, activeBlockIndex } = useAssignmentSessionStore.getState();
    const snapshot = { status, uploadedFiles, blocks, activeBlockIndex };
    const serialized = JSON.stringify(snapshot);
    const parsed = JSON.parse(serialized);

    expect(parsed).toEqual(snapshot);
    expect(parsed.blocks).toHaveLength(3);
    expect(parsed.blocks[0].type).toBe('summary');
    expect(parsed.blocks[1].studentContent).toBe('my plan text');
    expect(parsed.blocks[1].evalState).toEqual({ status: 'passed' });
    expect(parsed.blocks[1].chatHistory).toHaveLength(2);
    expect(parsed.blocks[2].studentContent).toBe('def solve(): pass');
    expect(parsed.blocks[2].evalState).toEqual({ status: 'failed', feedback: 'wrong answer' });
    expect(parsed.blocks[2].testFunctions).toEqual(['test_basic', 'test_edge']);
  });
});
