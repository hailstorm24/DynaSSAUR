import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import rateLimit from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3001;

const anthropic = new Anthropic();

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// Required for SharedArrayBuffer (interrupt support in Phase 4)
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(express.json({ limit: '4mb' }));
app.use('/api/', apiLimiter);

// ── Shared types ──────────────────────────────────────────────────────────────

type Files = { assignment: string; solution: string; tests: string };

type Block = {
  type: string;
  instruction?: string;
  studentContent?: string;
  testFunctions?: string[];
  evalState?: { status: string; feedback?: string };
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

// ── Prompt caching helper ─────────────────────────────────────────────────────
// Caches the stable assignment + test content as a system prompt prefix.
// Called once per session upload; cache hits save ~90% on input token cost.

function systemPrompt(files: Files): Anthropic.TextBlockParam[] {
  return [
    {
      type: 'text',
      text:
        'You are a Socratic coding coach. Guide students to insights through questions — ' +
        'never give answers directly. Be encouraging and specific.\n' +
        'Never reveal test suite internals (function names, assertions, implementation details). ' +
        'You may only describe the *purpose* of a test (e.g. "the test checks that your function handles an empty list").\n\n' +
        `## Assignment\n${files.assignment}\n\n` +
        `## Reference Solution (do not reveal to the student)\n\`\`\`python\n${files.solution}\n\`\`\`\n\n` +
        `## Test Suite\n\`\`\`python\n${files.tests}\n\`\`\``,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

// Strips markdown fences Claude sometimes wraps around JSON responses.
function parseJson(text: string): Record<string, unknown> {
  return JSON.parse(text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim());
}

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
    if _fn_name not in globals():
        print(f'SKIP: {_fn_name}')
        continue
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

// ── Capability 3: Coding feedback ─────────────────────────────────────────────

async function generateCodingFeedback(testOutput: string, files?: Files, studentCode?: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 400,
    system: files ? systemPrompt(files) : undefined,
    messages: [
      {
        role: 'user',
        content:
          'A student submitted Python code that failed automated tests.\n\n' +
          (studentCode ? `Student code:\n\`\`\`python\n${studentCode}\n\`\`\`\n\n` : '') +
          `Test output:\n\`\`\`\n${testOutput}\n\`\`\`\n\n` +
          'Write 2–3 sentences of helpful, Socratic feedback: explain what went wrong and ' +
          'ask a guiding question that points toward the fix. Address the student directly.',
      },
    ],
  });
  return (msg.content[0] as Anthropic.TextBlock).text;
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
// Returns: { summaryContent: string }  — Markdown for the Summary block
app.post('/api/session/init', async (req, res) => {
  const { files } = req.body as { files: Files };

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: systemPrompt(files),
      messages: [
        {
          role: 'user',
          content:
            'Write a 2–3 paragraph overview of this assignment for the student. ' +
            'Summarize the goal, highlight any unusual constraints or tricky parts, ' +
            'and end with one Socratic question that gets them thinking about the core design decision. ' +
            'Use Markdown.',
        },
      ],
    });
    res.json({ summaryContent: (msg.content[0] as Anthropic.TextBlock).text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate summary.';
    res.status(500).json({ error: msg });
  }
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
    files?: Files;
    blocks?: Block[];
  };

  // ── Coding path ───────────────────────────────────────────────────────────
  if (cellType === 'coding') {
    const block = blocks?.[cellIndex];
    const priorCode = (blocks ?? [])
      .slice(0, cellIndex)
      .filter((b) => b.type === 'coding' && b.evalState?.status === 'passed')
      .map((b) => b.studentContent ?? '')
      .join('\n\n');
    const studentCode = [priorCode, block?.studentContent ?? ''].filter(Boolean).join('\n\n');
    const testFunctions = block?.testFunctions ?? [];
    const testsCode = files?.tests ?? '';

    try {
      const { allPassed, output } = await runTests(studentCode, testsCode, testFunctions);
      if (allPassed) {
        res.json({ pass: true });
        return;
      }
      const feedback = await generateCodingFeedback(output, files, studentCode);
      res.json({ pass: false, feedback, testOutput: output });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Test runner failed.';
      res.json({ pass: false, feedback: `Could not run tests: ${msg}` });
    }
    return;
  }

  // ── Planning path (Capability 2) ──────────────────────────────────────────
  const block = blocks?.[cellIndex];
  const studentContent = block?.studentContent ?? '';

  const previousSteps = (blocks ?? [])
    .slice(0, cellIndex)
    .filter((b) => b.type === 'planning' && b.evalState?.status === 'passed')
    .map((b, i) => `Step ${i + 1}: ${b.studentContent ?? ''}`)
    .join('\n');

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      system: files ? systemPrompt(files) : 'You are a Socratic coding coach.',
      messages: [
        {
          role: 'user',
          content:
            `The student wrote this implementation plan:\n\n${studentContent}\n\n` +
            'Evaluate it as an implementation plan. A good plan:\n' +
            '- Breaks the assignment into concrete, implementable steps (not vague phases)\n' +
            '- Covers all major parts of the assignment\n' +
            '- Has a logical ordering where each step builds on the last\n' +
            '- Is specific enough that each step could be coded and tested independently\n\n' +
            'If it passes, give brief positive reinforcement. If not, ask one Socratic question ' +
            'that guides them toward what is missing or too vague — do not rewrite it for them.\n\n' +
            'Reply with JSON only:\n' +
            '{"pass": boolean, "feedback": "one or two sentences"}',
        },
      ],
    });

    const result = parseJson((msg.content[0] as Anthropic.TextBlock).text);
    res.json({ pass: Boolean(result.pass), feedback: result.feedback as string });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Evaluation failed.';
    res.json({ pass: false, feedback: `Could not evaluate: ${msg}` });
  }
});

// ── Capability 4: Chatbot Coach ───────────────────────────────────────────────
// Trigger: user sends a message in the chat drawer on any cell
// Additional input: cellIndex (number); message (string)
// Returns: { response: string }
app.post('/api/cell/chat', async (req, res) => {
  const { message = '', cellIndex = 0, files, blocks } = req.body as {
    message?: string;
    cellIndex?: number;
    files?: Files;
    blocks?: Block[];
  };

  const history = blocks?.[cellIndex]?.chatHistory ?? [];

  // Second cache breakpoint: mark the last message in the existing history so
  // growing conversations don't re-tokenize the whole chat on each turn.
  const cachedHistory: Anthropic.MessageParam[] = history.map((m, i) => {
    if (i === history.length - 1) {
      return {
        role: m.role,
        content: [{ type: 'text', text: m.content, cache_control: { type: 'ephemeral' } }],
      };
    }
    return { role: m.role as 'user' | 'assistant', content: m.content };
  });

  const block = blocks?.[cellIndex];
  const cellContext = block
    ? `\nCurrent cell type: ${block.type}` +
      (block.instruction ? `\nInstruction: ${block.instruction}` : '') +
      (block.studentContent ? `\nStudent's current work:\n${block.studentContent}` : '')
    : '';

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      system: files
        ? systemPrompt(files)
        : [{ type: 'text', text: 'You are a Socratic coding coach. Guide through questions, never give answers.' }],
      messages: [
        ...cachedHistory,
        {
          role: 'user',
          content: cellContext ? `[Context]${cellContext}\n\n[Student message] ${message}` : message,
        },
      ],
    });
    res.json({ response: (msg.content[0] as Anthropic.TextBlock).text });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Chat failed.';
    res.status(500).json({ error: errMsg });
  }
});

// ── Capability 5: Dynamic Next Step Generation ────────────────────────────────
// Trigger: evaluate passes on any cell
// Additional input: cellIndex (number) — the cell that just passed
// Returns: { type: "planning"|"coding"; instruction: string; testFunctions?: string[]; complete: boolean }
//   complete=true  → session is finished, show completion state
//   complete=false → append the new block and advance activeBlockIndex
app.post('/api/cell/next-step', async (req, res) => {
  const { cellIndex = 0, files, blocks } = req.body as {
    cellIndex?: number;
    files?: Files;
    blocks?: Block[];
  };

  // After summary: always go to the overall planning step
  if (cellIndex <= 0) {
    res.json({
      complete: false,
      type: 'planning',
      instruction:
        'Write an overall implementation plan for this assignment. ' +
        'Break it down into concrete, implementable steps — each step should be small enough ' +
        'to code and test independently. Think about what order makes sense and what each piece depends on.',
    });
    return;
  }

  // After planning or a coding step: use the approved plan to drive what comes next
  const approvedPlan = (blocks ?? [])
    .find((b) => b.type === 'planning' && b.evalState?.status === 'passed')
    ?.studentContent ?? '';

  const completedCodingSteps = (blocks ?? [])
    .filter((b) => b.type === 'coding' && b.evalState?.status === 'passed')
    .map((b, i) => ({ step: i + 1, instruction: b.instruction ?? '', summary: (b.studentContent ?? '').slice(0, 200) }));

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      system: files ? systemPrompt(files) : 'You are a Socratic coding coach.',
      messages: [
        {
          role: 'user',
          content:
            `The student created this implementation plan:\n\n${approvedPlan}\n\n` +
            (completedCodingSteps.length > 0
              ? `Coding steps already completed:\n${JSON.stringify(completedCodingSteps, null, 2)}\n\n`
              : '') +
            'What is the next coding step from their plan? ' +
            'Match the instruction closely to the corresponding chunk in their plan. ' +
            'Include the exact test function names from the test suite that cover this step. ' +
            'If all steps in the plan have been completed, return complete: true.\n\n' +
            'Reply with JSON only:\n' +
            '{"complete": false, "type": "coding", "instruction": "...", "testFunctions": ["fn_name"]}\n' +
            'or {"complete": false, "type": "planning", "instruction": "..."}\n' +
            'or {"complete": true}',
        },
      ],
    });

    const result = parseJson((msg.content[0] as Anthropic.TextBlock).text);

    if (result.complete) {
      res.json({ complete: true });
      return;
    }

    res.json({
      complete: false,
      type: 'coding',
      instruction: result.instruction,
      testFunctions: result.testFunctions ?? undefined,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Next step generation failed.';
    res.status(500).json({ error: errMsg });
  }
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
