import { useAssignmentSessionStore } from '../stores/assignmentSessionStore.ts';

export function useEvaluateCell(index: number, cellType: 'planning' | 'coding') {
  const setEvalState = useAssignmentSessionStore((s) => s.setEvalState);
  const appendBlock = useAssignmentSessionStore((s) => s.appendBlock);
  const setStatus = useAssignmentSessionStore((s) => s.setStatus);
  const setApiError = useAssignmentSessionStore((s) => s.setApiError);
  const getState = useAssignmentSessionStore.getState;

  return async function handleEvaluate() {
    setEvalState(index, { status: 'running' });

    const { uploadedFiles: files, blocks } = getState();

    let evalPass = false;
    let feedback = '';
    let testOutput: string | undefined;

    try {
      const res = await fetch('/api/cell/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellType, cellIndex: index, files, blocks }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json() as { pass: boolean; feedback?: string; testOutput?: string };
      evalPass = data.pass;
      feedback = data.feedback ?? '';
      testOutput = data.testOutput;
    } catch (err) {
      setEvalState(index, {
        status: 'failed',
        feedback: err instanceof Error ? err.message : 'Evaluation failed. Please try again.',
      });
      return;
    }

    if (!evalPass) {
      setEvalState(index, { status: 'failed', feedback, testOutput });
      return;
    }

    setEvalState(index, { status: 'passed' });

    // Stage 5: fetch next step
    const { uploadedFiles: files2, blocks: blocks2 } = getState();
    try {
      const res = await fetch('/api/cell/next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellIndex: index, files: files2, blocks: blocks2 }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const step = await res.json() as {
        type: 'planning' | 'coding';
        instruction: string;
        testFunctions?: string[];
        complete: boolean;
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
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to load next step. Please refresh.');
    }
  };
}
