# AI Integration — Scaffolded Functions

All five AI capabilities live in [server/src/index.ts](server/src/index.ts). Each one is
currently a placeholder. This document describes what each function/route receives, what it must
return, and what the real implementation should do.

---

## Shared Request Context

Every route receives the full session state so Claude has complete context for any call:

```ts
req.body.files: {
  assignment: string;   // raw text of the uploaded assignment file
  solution:   string;   // raw text of the uploaded solution file
  tests:      string;   // raw text of the uploaded Python test file
}

req.body.blocks: Array<{
  type:            'summary' | 'planning' | 'coding';
  instruction?:    string;                              // prompt shown to student
  studentContent?: string;                              // what the student wrote
  testFunctions?:  string[];                            // coding blocks only
  evalState:       { status: 'idle' | 'running' | 'passed' | 'failed'; feedback?: string };
  chatHistory:     { role: 'user' | 'assistant'; content: string }[];
}>
```

---

## Capability 1 — Assignment Overview Generation

**Route:** `POST /api/session/init`

**Trigger:** Immediately after the instructor uploads the three files. Called once per session.

**Additional inputs:** *(none beyond shared context — only `files` is relevant here)*

**Current behavior:** Returns a hardcoded markdown string.

**What it should do:** Read `files.assignment` and generate a concise, student-facing overview:
what the assignment asks them to build, what concepts it covers, and how the session will be
structured (planning → coding → repeat).

**Output shape:**
```ts
{ summaryContent: string }   // Markdown string rendered in the Summary block
```

---

## Capability 2 — Planning Block Evaluation

**Route:** `POST /api/cell/evaluate` (when `cellType === 'planning'`)

**Trigger:** Student clicks **Evaluate** on a Planning block.

**Additional inputs:**
```ts
req.body.cellType:  'planning'
req.body.cellIndex: number     // index of the block being evaluated
```

The block at `blocks[cellIndex]` contains:
- `instruction` — the planning prompt the student was given
- `studentContent` — the student's written plan

**Current behavior:** Randomly passes (~60%) or fails with one of three canned feedback strings.

**What it should do:** Evaluate `studentContent` against `instruction` and the assignment context.
Pass if the plan demonstrates genuine understanding (correct approach, mentions key data
structures or edge cases). Fail with specific, actionable feedback if the plan is vague,
incomplete, or incorrect.

**Output shape:**
```ts
{ pass: true }
// or
{ pass: false; feedback: string }   // 2–3 sentences shown inline below the block
```

---

## Capability 3 — Coding Feedback Generation

**Function:** `generateCodingFeedback(testOutput: string): Promise<string>`

**Trigger:** Called internally by `POST /api/cell/evaluate` (coding path) when tests fail.
The test runner has already executed and produced output — this function turns that raw output
into a human-readable hint.

**Input:**
```
testOutput: string   // stdout+stderr from the python3 subprocess, e.g.:
                     //   "PASS: test_basic\nFAIL: test_edge\nAssertionError: expected 3 got 0"
```

**Current behavior:** Counts `FAIL:` lines and returns a generic "N tests failed: …" string.

**What it should do:** Interpret the failure messages and write 2–3 sentences of targeted feedback:
explain what went wrong and give a concrete hint for fixing it — without revealing the solution
or test internals directly. Address the student in second person.

**Output shape:**
```ts
string   // used as the `feedback` field in { pass: false; feedback; testOutput }
```

---

## Capability 4 — Chatbot Coach

**Route:** `POST /api/cell/chat`

**Trigger:** Student sends a message in the Chat drawer on any block.

**Additional inputs:**
```ts
req.body.cellIndex: number   // which block the chat is open on
req.body.message:   string   // the student's message
```

The block at `blocks[cellIndex]` contains `chatHistory` (full prior conversation), `instruction`,
and `studentContent`. `files` provides the full assignment context.

**Current behavior:** Returns one of five random canned responses, ignoring the actual message.

**What it should do:** Respond as a Socratic coding coach. Use the assignment, the block's
instruction, the student's current work, and the conversation history to give a relevant,
targeted hint. Never give away the answer directly. Use questions to guide the student toward
the solution.

**Output shape:**
```ts
{ response: string }   // appended to the block's chatHistory as role: 'assistant'
```

---

## Capability 5 — Dynamic Next Step Generation

**Route:** `POST /api/cell/next-step`

**Trigger:** Called automatically by `useEvaluateCell` immediately after a block passes evaluation.

**Additional inputs:**
```ts
req.body.cellIndex: number   // index of the block that just passed
```

`blocks` contains the full session history up to this point, including all completed planning and
coding blocks with their `studentContent` and `chatHistory`.

**Current behavior:** Alternates mechanically between planning and coding blocks using canned
instructions. Ends the session probabilistically after step 3 (1% → doubles each step → 100% at
step 10+).

**What it should do:** Read `files.assignment`, `files.tests`, and the completed blocks to decide:
1. **Is the assignment complete?** Return `{ complete: true }` if all required functions have
   been implemented and tested. Use `files.tests` and `files.solution` as the ground truth.
2. **What's the next step?** Generate a `planning` or `coding` block whose `instruction` is
   specific to what still needs to be done — not a generic prompt. For coding blocks, include
   the exact `testFunctions` from `files.tests` that should be run to evaluate that step.

**Output shape:**
```ts
{ complete: true }
// or
{
  complete:       false;
  type:           'planning' | 'coding';
  instruction:    string;       // specific prompt for this step
  testFunctions?: string[];     // coding blocks only — function names from the test file
}
```

---

## Example Request Body

A mid-session request body after the student has completed one planning block and is submitting
their first coding attempt:

```json
{
  "cellType": "coding",
  "cellIndex": 2,
  "message": "Why does my loop not terminate?",
  "files": {
    "assignment": "Implement a function `find_max(lst)` that returns the largest value in a list. Handle empty lists by returning None.",
    "solution": "def find_max(lst):\n    if not lst:\n        return None\n    return max(lst)",
    "tests": "def test_basic():\n    assert find_max([3, 1, 2]) == 3\n\ndef test_empty():\n    assert find_max([]) is None\n\ndef test_single():\n    assert find_max([7]) == 7\n"
  },
  "blocks": [
    {
      "type": "summary",
      "content": "## Assignment Overview\nYou will implement `find_max`, a function that finds the largest element in a list..."
    },
    {
      "type": "planning",
      "instruction": "Before writing any code, outline your approach in plain language.",
      "studentContent": "I'll iterate through the list, keeping track of the largest value seen so far. If the list is empty I'll return None.",
      "evalState": { "status": "passed" },
      "chatHistory": []
    },
    {
      "type": "coding",
      "instruction": "Implement `find_max(lst)` based on your plan. Your code will be run against the test suite.",
      "studentContent": "def find_max(lst):\n    best = 0\n    for x in lst:\n        if x > best:\n            best = x\n    return best",
      "testFunctions": ["test_basic", "test_empty", "test_single"],
      "evalState": { "status": "failed", "feedback": "2 tests failed: test_empty, test_single." },
      "chatHistory": [
        { "role": "user", "content": "Why does my loop not terminate?" },
        { "role": "assistant", "content": "Your loop does terminate — the issue is with the initial value of `best`. What should happen if every element in the list is negative?" }
      ]
    }
  ]
}
```
