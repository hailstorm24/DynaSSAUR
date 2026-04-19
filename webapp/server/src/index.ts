import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3001;

// Required for SharedArrayBuffer (interrupt support in Phase 4)
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(express.json({ limit: '4mb' }));

// ── Python test runner helpers ────────────────────────────────────────────────

function buildRunnerScript(studentCode: string, testsCode: string, testFunctions: string[]): string {
  const fnList = JSON.stringify(testFunctions);
  return `import sys

# ---- student code ----
${studentCode}

# ---- test definitions ----
${testsCode}

# ---- harness ----
_failed = []
for _fn_name in ${fnList}:
    try:
        globals()[_fn_name]()
        print(f'PASS: {_fn_name}')
    except Exception as _e:
        _failed.append(_fn_name)
        _msg = str(_e)
        print(f'FAIL: {_fn_name}')
        print(type(_e).__name__ + (': ' + _msg if _msg else ''))

sys.exit(1 if _failed else 0)
`;
}

async function runTests(
  studentCode: string,
  testsCode: string,
  testFunctions: string[],
): Promise<{ allPassed: boolean; output: string }> {
  const tmpFile = join(tmpdir(), `dynassaur-runner-${randomUUID()}.py`);
  writeFileSync(tmpFile, buildRunnerScript(studentCode, testsCode, testFunctions), 'utf8');

  return new Promise((resolve) => {
    let output = '';
    const python = spawn('python3', [tmpFile], { timeout: 10_000 });

    python.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    python.stderr.on('data', (chunk: Buffer) => { output += chunk.toString(); });

    python.on('close', (code) => {
      try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
      resolve({ allPassed: code === 0, output: output.trim() });
    });

    python.on('error', (err) => {
      try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
      resolve({ allPassed: false, output: `Failed to start Python: ${err.message}` });
    });
  });
}

// ── Capability 3: Coding feedback generation (scaffolded) ────────────────────
// TODO: Replace scaffold body with a real Anthropic messages.create call.
async function generateCodingFeedback(testOutput: string): Promise<string> {
  // Scaffold — drop in the real Claude call here when ready:
  //
  // const anthropic = new Anthropic();
  // const msg = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-6',
  //   max_tokens: 400,
  //   messages: [{
  //     role: 'user',
  //     content:
  //       'A student submitted Python code that failed automated tests.\n\n' +
  //       'Test output:\n```\n' + testOutput + '\n```\n\n' +
  //       'Write 2–3 sentences of helpful feedback: explain what went wrong and ' +
  //       'give a concrete hint for fixing it. Do not reveal test internals. ' +
  //       'Address the student directly.',
  //   }],
  // });
  // return (msg.content[0] as Anthropic.TextBlock).text;

  const lines = testOutput.split('\n').filter(Boolean);
  const failures = lines.filter((l) => l.startsWith('FAIL:'));
  if (failures.length === 0) {
    return 'Your code raised an unexpected error. Check the output above for details.';
  }
  const names = failures.map((l) => l.replace('FAIL:', '').trim());
  return (
    `${names.length} test${names.length > 1 ? 's' : ''} failed: ${names.join(', ')}. ` +
    'Review your implementation and make sure it handles all the cases described in the instructions.'
  );
}

// ─── Shared context shape (all AI routes receive this) ────────────────────────
//
// req.body.files: { assignment: string; solution: string; tests: string }
// req.body.blocks: Array<{
//   type: "summary" | "planning" | "coding"
//   instruction?: string
//   studentContent?: string
//   testFunctions?: string[]
//   evalState: { status: "idle"|"running"|"passed"|"failed"; feedback?: string }
//   chatHistory: { role: "user"|"assistant"; content: string }[]
// }>
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Capability 1: Assignment Overview Generation ──────────────────────────────
// Trigger: session init after upload
// Additional input: (none beyond shared context)
// Returns: { summaryContent: string }  — Markdown for the Summary block
app.post('/api/session/init', (_req, res) => {
  const summaryContent = `## Assignment Overview

Welcome! Here is a summary of what you'll be working on in this assignment.

**Objective:** Implement the required functions as described in the assignment instructions.

**What you'll need:**
- Read through the assignment requirements carefully
- Plan your approach before writing any code
- Test your implementation against the provided test cases

**How this works:**
You'll work through a series of planning and coding steps. Each step must be evaluated before the next one unlocks. Use the Chat button on any step if you want a hint or guidance.

> *This summary was generated from your uploaded assignment file.*`;

  res.json({ summaryContent });
});

// ── Capability 2 + 3: Cell Evaluate (planning or coding) ─────────────────────
// Trigger: Evaluate button on any planning or coding cell
// Additional input: cellIndex (number); for coding cells: testOutput (string)
// Returns: { pass: boolean; feedback?: string }
//   pass=true  → caller triggers Capability 5 (next-step)
//   pass=false → feedback string shown inline below the cell
app.post('/api/cell/evaluate', async (req, res) => {
  const { cellType = 'planning', cellIndex = 0, files, blocks } = req.body as {
    cellType?: 'planning' | 'coding';
    cellIndex?: number;
    files?: { assignment: string; solution: string; tests: string };
    blocks?: Array<{ type: string; studentContent?: string; testFunctions?: string[] }>;
  };

  // ── Coding path: real test runner ─────────────────────────────────────────
  if (cellType === 'coding') {
    const block = blocks?.[cellIndex];
    const studentCode = block?.studentContent ?? '';
    const testFunctions = block?.testFunctions ?? [];
    const testsCode = files?.tests ?? '';

    try {
      const { allPassed, output } = await runTests(studentCode, testsCode, testFunctions);
      if (allPassed) {
        res.json({ pass: true });
        return;
      }
      const feedback = await generateCodingFeedback(output);
      res.json({ pass: false, feedback, testOutput: output });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Test runner failed.';
      res.json({ pass: false, feedback: `Could not run tests: ${msg}` });
    }
    return;
  }

  // ── Planning path: placeholder (Capability 2 not yet implemented) ─────────
  const pass = Math.random() > 0.4;
  if (pass) {
    res.json({ pass: true });
    return;
  }

  const planningFeedback = [
    'Your plan is missing a description of the data structures you intend to use. Add a short note about what variables or collections will hold the key state.',
    'The plan doesn\'t explain how edge cases (empty input, negative numbers) will be handled. Revise to include that.',
    'Good start, but the steps are too vague. Break down step 2 into at least two more concrete sub-steps.',
  ];
  res.json({ pass: false, feedback: planningFeedback[Math.floor(Math.random() * planningFeedback.length)] });
});

// ── Capability 4: Chatbot Coach ───────────────────────────────────────────────
// Trigger: user sends a message in the chat drawer on any cell
// Additional input: cellIndex (number); message (string)
// Returns: { response: string }
app.post('/api/cell/chat', (req, res) => {
  const { message = '', cellIndex = 0 } = req.body as {
    message?: string;
    cellIndex?: number;
  };

  const responses = [
    `Great question about step ${cellIndex + 1}! Think about what the function needs to return and work backwards from there. What's the simplest input you could test with?`,
    `For "${message.slice(0, 30)}..." — consider breaking the problem into smaller pieces. What's the very first thing that has to happen?`,
    'Hint: trace through your logic with a small example by hand before writing any code. What does the output look like for input `[1, 2, 3]`?',
    `You're on the right track. One thing to double-check: are you modifying the original data or creating a new structure? The assignment likely expects one specific approach.`,
    'Think about edge cases early — what should happen if the input is empty? What if all values are the same?',
  ];

  const response = responses[Math.floor(Math.random() * responses.length)];
  res.json({ response });
});

// ── Capability 5: Dynamic Next Step Generation ────────────────────────────────
// Trigger: evaluate passes on any cell
// Additional input: cellIndex (number) — the cell that just passed
// Returns: { type: "planning"|"coding"; instruction: string; testFunctions?: string[]; complete: boolean }
//   complete=true  → session is finished, show completion state
//   complete=false → append the new block and advance activeBlockIndex
app.post('/api/cell/next-step', (req, res) => {
  const { cellIndex = 0 } = req.body as { cellIndex?: number };

  // Placeholder: min 3 steps, max 10; end probability doubles each step after step 3
  // (step 3: 1%, 4: 2%, 5: 4%, 6: 8%, 7: 16%, 8: 32%, 9: 64%, 10+: 100%)
  if (cellIndex >= 10 || (cellIndex >= 3 && Math.random() < Math.min(1, 0.01 * Math.pow(2, cellIndex - 3)))) {
    res.json({ complete: true });
    return;
  }

  // Alternate between planning and coding; first step after summary is always planning
  const type: 'planning' | 'coding' = cellIndex % 2 === 0 ? 'coding' : 'planning';

  const planningInstructions = [
    'Before writing any code, outline your approach. Describe the overall algorithm in plain language — what are the main steps, and in what order will they execute?',
    'Plan how you will handle edge cases. List at least two scenarios that could cause unexpected behavior and explain how your implementation will address each one.',
    'Describe how the pieces you\'ve built so far connect. How will the functions interact with each other?',
  ];

  const codingInstructions = [
    'Implement the core function described in the assignment. Your code will be evaluated against the test suite — make sure to handle all the cases you planned for.',
    'Now implement the helper function that your main logic depends on. Focus on correctness first; you can optimize later.',
    'Wire the pieces together. Implement the top-level function that calls your helpers and returns the final result.',
  ];

  const instruction = type === 'coding'
    ? codingInstructions[Math.min(Math.floor(cellIndex / 2), codingInstructions.length - 1)]
    : planningInstructions[Math.min(Math.floor(cellIndex / 2), planningInstructions.length - 1)];

  const testFunctions = type === 'coding'
    ? ['placeholder_test']
    : undefined;

  res.json({ type, instruction, testFunctions, complete: false });
});

// ─────────────────────────────────────────────────────────────────────────────

const distPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DynaSSAUR server running at http://localhost:${PORT}`);
});
