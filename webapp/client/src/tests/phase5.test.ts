import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAssignmentSessionStore } from '../stores/assignmentSessionStore';
import type {
  SummaryBlock,
  PlanningBlock,
  CodingBlock,
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
  studentContent: 'my plan',
  evalState: { status: 'idle' },
  chatHistory: [],
};

const CODING_BLOCK: CodingBlock = {
  type: 'coding',
  instruction: 'Write the code',
  studentContent: 'def solve(): pass',
  testFunctions: ['test_basic'],
  evalState: { status: 'idle' },
  chatHistory: [],
};

beforeEach(() => {
  localStorage.clear();
  useAssignmentSessionStore.setState({
    uploadedFiles: TEST_FILES,
    blocks: [SUMMARY_BLOCK, { ...PLANNING_BLOCK, evalState: { status: 'passed' } }],
    activeBlockIndex: 1,
    status: 'active',
  });
  vi.unstubAllGlobals();
});

// ─── helpers that replicate what useEvaluateCell does after a pass ────────────

async function simulateNextStep(cellIndex: number) {
  const { uploadedFiles: files, blocks } = useAssignmentSessionStore.getState();
  const res = await fetch('/api/cell/next-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cellIndex, files, blocks }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const step = await res.json() as {
    type: 'planning' | 'coding';
    instruction: string;
    testFunctions?: string[];
    complete: boolean;
  };
  const { appendBlock, setStatus } = useAssignmentSessionStore.getState();
  if (step.complete) {
    setStatus('complete');
  } else {
    appendBlock(
      step.type === 'coding'
        ? { type: 'coding', instruction: step.instruction, studentContent: '', testFunctions: step.testFunctions ?? [], evalState: { status: 'idle' }, chatHistory: [] }
        : { type: 'planning', instruction: step.instruction, studentContent: '', evalState: { status: 'idle' }, chatHistory: [] },
    );
  }
  return step;
}

// ─── next-step → planning block appended ─────────────────────────────────────

describe('next-step → planning block appended', () => {
  it('appends a planning block with the returned instruction', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'planning',
        instruction: 'Outline your algorithm.',
        complete: false,
      }),
    }));

    await simulateNextStep(1);

    const { blocks, activeBlockIndex } = useAssignmentSessionStore.getState();
    expect(blocks).toHaveLength(3);
    const newBlock = blocks[2];
    expect(newBlock.type).toBe('planning');
    if (newBlock.type === 'planning') {
      expect(newBlock.instruction).toBe('Outline your algorithm.');
      expect(newBlock.studentContent).toBe('');
      expect(newBlock.evalState).toEqual({ status: 'idle' });
      expect(newBlock.chatHistory).toEqual([]);
    }
    expect(activeBlockIndex).toBe(2);
  });

  it('planning block has no testFunctions field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'planning', instruction: 'Plan it.', complete: false }),
    }));

    await simulateNextStep(1);

    const newBlock = useAssignmentSessionStore.getState().blocks[2];
    expect(newBlock.type).toBe('planning');
    expect('testFunctions' in newBlock).toBe(false);
  });
});

// ─── next-step → coding block appended ───────────────────────────────────────

describe('next-step → coding block appended', () => {
  it('appends a coding block with instruction and testFunctions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'coding',
        instruction: 'Implement the core function.',
        testFunctions: ['test_basic', 'test_edge'],
        complete: false,
      }),
    }));

    await simulateNextStep(1);

    const { blocks, activeBlockIndex } = useAssignmentSessionStore.getState();
    expect(blocks).toHaveLength(3);
    const newBlock = blocks[2];
    expect(newBlock.type).toBe('coding');
    if (newBlock.type === 'coding') {
      expect(newBlock.instruction).toBe('Implement the core function.');
      expect(newBlock.studentContent).toBe('');
      expect(newBlock.testFunctions).toEqual(['test_basic', 'test_edge']);
      expect(newBlock.evalState).toEqual({ status: 'idle' });
      expect(newBlock.chatHistory).toEqual([]);
    }
    expect(activeBlockIndex).toBe(2);
  });

  it('falls back to empty testFunctions when the field is omitted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'coding', instruction: 'Code it.', complete: false }),
    }));

    await simulateNextStep(1);

    const newBlock = useAssignmentSessionStore.getState().blocks[2];
    if (newBlock.type === 'coding') {
      expect(newBlock.testFunctions).toEqual([]);
    }
  });
});

// ─── next-step → complete ─────────────────────────────────────────────────────

describe('next-step → complete: true', () => {
  it('sets session status to complete when complete: true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ complete: true }),
    }));

    await simulateNextStep(4);

    expect(useAssignmentSessionStore.getState().status).toBe('complete');
  });

  it('does not append a block when complete: true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ complete: true }),
    }));

    await simulateNextStep(4);

    expect(useAssignmentSessionStore.getState().blocks).toHaveLength(2);
  });
});

// ─── two-step sequence: blocks append and activeBlockIndex advances ───────────

describe('two-step sequence end-to-end', () => {
  it('walks through two steps, appending blocks and advancing activeBlockIndex', async () => {
    // Step 1: cellIndex=1 passes → planning next step
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'planning', instruction: 'Step 2 plan.', complete: false }),
    }));
    await simulateNextStep(1);

    expect(useAssignmentSessionStore.getState().blocks).toHaveLength(3);
    expect(useAssignmentSessionStore.getState().activeBlockIndex).toBe(2);

    // Step 2: mark index 2 as passed, cellIndex=2 → coding next step
    useAssignmentSessionStore.getState().setEvalState(2, { status: 'passed' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'coding',
        instruction: 'Step 3 code.',
        testFunctions: ['test_step3'],
        complete: false,
      }),
    }));
    await simulateNextStep(2);

    const { blocks, activeBlockIndex } = useAssignmentSessionStore.getState();
    expect(blocks).toHaveLength(4);
    expect(activeBlockIndex).toBe(3);
    expect(blocks[3].type).toBe('coding');
    if (blocks[3].type === 'coding') {
      expect(blocks[3].instruction).toBe('Step 3 code.');
      expect(blocks[3].testFunctions).toEqual(['test_step3']);
    }
  });

  it('sets complete after the sequence ends at cellIndex 4', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ complete: true }),
    }));

    await simulateNextStep(4);

    expect(useAssignmentSessionStore.getState().status).toBe('complete');
    expect(useAssignmentSessionStore.getState().blocks).toHaveLength(2);
  });
});
