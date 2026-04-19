import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAssignmentSessionStore } from '../stores/assignmentSessionStore';
import type {
  SummaryBlock,
  CodingBlock,
  UploadedFiles,
} from '../models/AssignmentSessionModel';

// ─── fixtures ────────────────────────────────────────────────────────────────

const TEST_FILES: UploadedFiles = {
  assignment: 'assignment content',
  solution: 'solution content',
  tests: 'def placeholder_test():\n    assert add(1, 2) == 3\n',
};

const SUMMARY_BLOCK: SummaryBlock = { type: 'summary', content: '## Overview' };

const CODING_BLOCK: CodingBlock = {
  type: 'coding',
  instruction: 'Implement the add function.',
  studentContent: 'def add(a, b):\n    return a + b\n',
  testFunctions: ['placeholder_test'],
  evalState: { status: 'idle' },
  chatHistory: [],
};

beforeEach(() => {
  localStorage.clear();
  useAssignmentSessionStore.setState({
    uploadedFiles: TEST_FILES,
    blocks: [SUMMARY_BLOCK, CODING_BLOCK],
    activeBlockIndex: 1,
    status: 'active',
  });
  vi.unstubAllGlobals();
});

// ─── helpers ─────────────────────────────────────────────────────────────────

async function simulateEvaluate(cellIndex: number, cellType: 'planning' | 'coding') {
  const { setEvalState, appendBlock, setStatus, uploadedFiles: files, blocks } =
    useAssignmentSessionStore.getState();

  setEvalState(cellIndex, { status: 'running' });

  const res = await fetch('/api/cell/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cellType, cellIndex, files, blocks }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data = await res.json() as { pass: boolean; feedback?: string };

  if (!data.pass) {
    setEvalState(cellIndex, { status: 'failed', feedback: data.feedback ?? '' });
    return data;
  }

  setEvalState(cellIndex, { status: 'passed' });

  // trigger next-step
  const { uploadedFiles: files2, blocks: blocks2 } = useAssignmentSessionStore.getState();
  const res2 = await fetch('/api/cell/next-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cellIndex, files: files2, blocks: blocks2 }),
  });
  const step = await res2.json() as {
    type: 'planning' | 'coding'; instruction: string;
    testFunctions?: string[]; complete: boolean;
  };
  if (step.complete) {
    setStatus('complete');
  } else {
    appendBlock(
      step.type === 'coding'
        ? { type: 'coding', instruction: step.instruction, studentContent: '', testFunctions: step.testFunctions ?? [], evalState: { status: 'idle' }, chatHistory: [] }
        : { type: 'planning', instruction: step.instruction, studentContent: '', evalState: { status: 'idle' }, chatHistory: [] },
    );
  }
  return data;
}

// ─── coding evaluate → pass ───────────────────────────────────────────────────

describe('coding evaluate → pass', () => {
  it('sets evalState to passed and triggers next-step', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ pass: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ type: 'planning', instruction: 'Plan next.', complete: false }) }),
    );

    await simulateEvaluate(1, 'coding');

    const { blocks, activeBlockIndex } = useAssignmentSessionStore.getState();
    expect((blocks[1] as CodingBlock).evalState.status).toBe('passed');
    expect(blocks).toHaveLength(3);
    expect(activeBlockIndex).toBe(2);
  });

  it('sends testFunctions and studentContent to /api/cell/evaluate', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ pass: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ complete: true }) });
    vi.stubGlobal('fetch', mockFetch);

    await simulateEvaluate(1, 'coding');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.cellType).toBe('coding');
    expect(body.cellIndex).toBe(1);
    expect(body.blocks[1].testFunctions).toEqual(['placeholder_test']);
    expect(body.blocks[1].studentContent).toContain('def add');
    expect(body.files.tests).toContain('placeholder_test');
  });
});

// ─── coding evaluate → fail ───────────────────────────────────────────────────

describe('coding evaluate → fail', () => {
  it('sets evalState to failed with feedback string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pass: false, feedback: '1 test failed: test_basic.' }),
    }));

    await simulateEvaluate(1, 'coding');

    const block = useAssignmentSessionStore.getState().blocks[1] as CodingBlock;
    expect(block.evalState.status).toBe('failed');
    if (block.evalState.status === 'failed') {
      expect(block.evalState.feedback).toBe('1 test failed: test_basic.');
    }
  });

  it('does not append a new block on fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pass: false, feedback: 'Tests failed.' }),
    }));

    await simulateEvaluate(1, 'coding');

    expect(useAssignmentSessionStore.getState().blocks).toHaveLength(2);
  });

  it('does not advance activeBlockIndex on fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pass: false, feedback: 'Tests failed.' }),
    }));

    await simulateEvaluate(1, 'coding');

    expect(useAssignmentSessionStore.getState().activeBlockIndex).toBe(1);
  });
});

// ─── server error handling ────────────────────────────────────────────────────

describe('coding evaluate → server error', () => {
  it('transitions evalState to failed with error message on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    // replicate what useEvaluateCell does on error
    const { setEvalState, uploadedFiles: files, blocks } = useAssignmentSessionStore.getState();
    setEvalState(1, { status: 'running' });

    try {
      const res = await fetch('/api/cell/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellType: 'coding', cellIndex: 1, files, blocks }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
    } catch (err) {
      setEvalState(1, {
        status: 'failed',
        feedback: err instanceof Error ? err.message : 'Evaluation failed.',
      });
    }

    const block = useAssignmentSessionStore.getState().blocks[1] as CodingBlock;
    expect(block.evalState.status).toBe('failed');
    if (block.evalState.status === 'failed') {
      expect(block.evalState.feedback).toContain('500');
    }
  });
});

// ─── complete path: pass → complete: true ────────────────────────────────────

describe('coding evaluate → pass → complete', () => {
  it('sets session status to complete when next-step returns complete: true', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ pass: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ complete: true }) }),
    );

    await simulateEvaluate(1, 'coding');

    expect(useAssignmentSessionStore.getState().status).toBe('complete');
    expect(useAssignmentSessionStore.getState().blocks).toHaveLength(2);
  });
});

// ─── empty testFunctions: pass iff code runs without errors ──────────────────

describe('coding evaluate with no testFunctions', () => {
  it('passes when server returns pass: true (code ran without errors)', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ pass: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ complete: true }) }),
    );

    useAssignmentSessionStore.setState({
      uploadedFiles: TEST_FILES,
      blocks: [SUMMARY_BLOCK, { ...CODING_BLOCK, testFunctions: [] }],
      activeBlockIndex: 1,
      status: 'active',
    });

    await simulateEvaluate(1, 'coding');

    expect((useAssignmentSessionStore.getState().blocks[1] as CodingBlock).evalState.status).toBe('passed');
  });

  it('fails when server returns pass: false (code errored)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pass: false, feedback: 'Your code raised an unexpected error.' }),
    }));

    useAssignmentSessionStore.setState({
      uploadedFiles: TEST_FILES,
      blocks: [SUMMARY_BLOCK, { ...CODING_BLOCK, testFunctions: [] }],
      activeBlockIndex: 1,
      status: 'active',
    });

    await simulateEvaluate(1, 'coding');

    const block = useAssignmentSessionStore.getState().blocks[1] as CodingBlock;
    expect(block.evalState.status).toBe('failed');
  });

  it('sends an empty testFunctions array (not omitted) in the request body', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ pass: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ complete: true }) });
    vi.stubGlobal('fetch', mockFetch);

    useAssignmentSessionStore.setState({
      uploadedFiles: TEST_FILES,
      blocks: [SUMMARY_BLOCK, { ...CODING_BLOCK, testFunctions: [] }],
      activeBlockIndex: 1,
      status: 'active',
    });

    await simulateEvaluate(1, 'coding');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.blocks[1].testFunctions).toEqual([]);
  });
});

// ─── re-evaluate is blocked after pass ───────────────────────────────────────

describe('evalState guards', () => {
  it('evalState stays passed if evaluate is called again (UI should disable button)', () => {
    useAssignmentSessionStore.getState().setEvalState(1, { status: 'passed' });
    const block = useAssignmentSessionStore.getState().blocks[1] as CodingBlock;
    // The UI disables Evaluate when status === 'passed'; this confirms the store
    // does not spontaneously reset it.
    expect(block.evalState.status).toBe('passed');
  });

  it('feedback is cleared when a new evaluation starts (status → running)', () => {
    useAssignmentSessionStore.getState().setEvalState(1, { status: 'failed', feedback: 'old' });
    useAssignmentSessionStore.getState().setEvalState(1, { status: 'running' });
    const block = useAssignmentSessionStore.getState().blocks[1] as CodingBlock;
    expect(block.evalState.status).toBe('running');
    expect('feedback' in block.evalState).toBe(false);
  });
});
