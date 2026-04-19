import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

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
app.post('/api/cell/evaluate', (req, res) => {
  const { cellType = 'planning', cellIndex = 0 } = req.body as {
    cellType?: 'planning' | 'coding';
    cellIndex?: number;
  };

  // Placeholder: pass 60% of the time so both paths are exercisable
  const pass = Math.random() > 0.4;

  if (pass) {
    res.json({ pass: true });
    return;
  }

  // Capability 3 placeholder feedback
  const planningFeedback = [
    'Your plan is missing a description of the data structures you intend to use. Add a short note about what variables or collections will hold the key state.',
    'The plan doesn\'t explain how edge cases (empty input, negative numbers) will be handled. Revise to include that.',
    'Good start, but the steps are too vague. Break down step 2 into at least two more concrete sub-steps.',
  ];

  const codingFeedback = [
    `Test failed at step ${cellIndex + 1}. Your function returned the wrong value for an empty input — check your base case.`,
    'One or more tests failed. Make sure you\'re returning a value, not just printing it.',
    'Tests failed. Hint: double-check how you\'re handling the loop termination condition.',
  ];

  const feedback = cellType === 'coding'
    ? codingFeedback[Math.floor(Math.random() * codingFeedback.length)]
    : planningFeedback[Math.floor(Math.random() * planningFeedback.length)];

  res.json({ pass: false, feedback });
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

  // Placeholder: end session after 5 steps
  if (cellIndex >= 4) {
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
    ? [`test_step_${cellIndex + 1}_basic`, `test_step_${cellIndex + 1}_edge_cases`]
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
