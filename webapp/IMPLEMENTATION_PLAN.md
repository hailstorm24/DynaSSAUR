# Assignment Flow — Stage-Based Implementation Plan

---

## Stage 0: Prerequisites & Conventions ✅

Architecture decisions locked:

- All five AI capabilities are implemented as **Express API routes** (`server/src/index.ts`), each making an Anthropic SDK call
- Session state lives in a **new Zustand store** (`assignmentSessionStore`) separate from the existing `assignmentStore`
- The assignment view is a **new top-level view** (`AssignmentView.tsx`) rendered alongside (not replacing) `Notebook.tsx` — `appStore` mode `"assignment"` routes to it
- Persistence reuses the existing `persistence.ts` debounce/localStorage mechanism with a new key (`assignment-session`)

---

## Stage 1: Types & State Model

**What to build:**

Define the complete data model from the spec in `client/src/models/AssignmentSessionModel.ts`:

```
AssignmentSessionModel
  uploadedFiles: { assignment: string; solution: string; tests: string }
  blocks: Block[]
  activeBlockIndex: number
  status: "uploading" | "initializing" | "active" | "complete"

Block (discriminated union)
  | { type: "summary";  content: string }
  | { type: "planning"; instruction: string; studentContent: string; evalState: EvalState; chatHistory: ChatMessage[] }
  | { type: "coding";   instruction: string; studentContent: string; testFunctions: string[]; evalState: EvalState; chatHistory: ChatMessage[] }

EvalState
  | { status: "idle" }
  | { status: "running" }
  | { status: "passed" }
  | { status: "failed"; feedback: string }

ChatMessage: { role: "user" | "assistant"; content: string }
```

Create `client/src/stores/assignmentSessionStore.ts` with Zustand actions:
- `initSession(files, summaryBlock)` — set uploadedFiles, push summary block, status → "active"
- `appendBlock(block)` — push to blocks array, increment activeBlockIndex
- `updateStudentContent(index, content)`
- `setEvalState(index, evalState)`
- `appendChatMessage(index, message)`
- `setStatus(status)`
- `reset()`

Add localStorage persistence in `client/src/utils/persistence.ts` under key `assignment-session`, same debounce pattern as sandbox.

**Verification:**
- TypeScript compilation produces zero errors
- Write unit tests in `client/src/tests/` that exercise every store action and confirm the resulting state shape
- Confirm that a serialized session round-trips through JSON without data loss (save → parse → compare)

---

## Stage 2: Upload → Session Init (Capability 1) — backend done ✅

**What was built:**

*Backend (complete):*
- `POST /api/session/init` is live in `server/src/index.ts`
- Accepts `{ files: { assignment, solution, tests } }` as JSON
- Returns `{ summaryContent: string }` — a placeholder Markdown summary
- Real implementation: replace the hardcoded string with an Anthropic SDK call (Capability 1)

*Frontend (remaining):*
- Replace the mock `generateFromFiles` in `UploadPage.tsx` with a real `fetch` to `/api/session/init`
  - Client reads each uploaded `File` as text (using `FileReader` or `file.text()`), sends all three as JSON
- On success: call `assignmentSessionStore.initSession(files, summaryBlock)` then set `appStore` mode to `"assignment"`
- Show a loading state while the API call is in flight; surface errors if it fails

**Verification:**
- Upload three real files → network tab shows the POST with file contents in the body, response contains Markdown
- `appStore` transitions to `"assignment"` mode
- Refreshing the page while in assignment mode (before Stage 8 persistence) returns to upload — intentional at this stage
- Unit test: mock the fetch call, assert store state after `initSession`

---

## Stage 3: Assignment View & Block Rendering

**What to build:**

Create `client/src/views/AssignmentView.tsx` — the top-level container rendered when `appStore.mode === "assignment"`. It reads `assignmentSessionStore.blocks` and renders each block in order.

Create three block components:

**`SummaryBlock.tsx`**
- Renders `block.content` as Markdown (use an existing Markdown renderer or `dangerouslySetInnerHTML` with sanitization)
- No editable area, no buttons
- Badge: "Assignment"

**`PlanningBlock.tsx`**
- Read-only instruction text at top
- Markdown textarea bound to `block.studentContent`; only editable if `index === activeBlockIndex`
- Evaluate button (disabled if `index < activeBlockIndex` or `evalState.status === "passed"`)
- Chat button
- Feedback area shown when `evalState.status === "failed"`
- Badge: "Planning · Step N"

**`CodingBlock.tsx`**
- Read-only instruction text at top
- CodeMirror editor bound to `block.studentContent`; only editable if `index === activeBlockIndex`
- Run button + output area (reuses existing Pyodide kernel via `KernelController`)
- Evaluate button (same disable logic as planning)
- Chat button
- Feedback area on fail
- Badge: "Coding · Step N"

**Verification:**
- Seed the store manually in dev (hardcode an initial state with one of each block type) and confirm all three render correctly
- Verify that past blocks are visible and their textareas/editors accept input but Evaluate is disabled
- Confirm the active block's Evaluate and Chat buttons are clickable
- Run the existing Vitest suite — no regressions

---

## Stage 4: Planning Cell Evaluate (Capabilities 2 & 3) — backend done ✅

**What was built:**

*Backend (complete):*
- `POST /api/cell/evaluate` is live in `server/src/index.ts`
- Accepts `{ cellType, cellIndex, files, blocks }` — `cellType` drives which feedback pool is used
- Placeholder: passes 60% of the time; on fail returns one of three canned planning or coding feedback strings
- Real implementation: replace random logic with Capability 2 (Claude judges the plan), then Capability 3 on fail (Claude generates feedback)

*Frontend (remaining):*
- Evaluate button click → set `evalState = { status: "running" }` → POST to `/api/cell/evaluate` with full session context
- On response:
  - Pass → `evalState = { status: "passed" }` → trigger Stage 5 (next step generation)
  - Fail → `evalState = { status: "failed", feedback }` → display feedback inline below the cell
- Evaluate button shows a spinner while `status === "running"`; remains disabled once `status === "passed"`

**Verification:**
- Hit Evaluate repeatedly — feedback appears inline on fail; cell locks on pass and the next-step call fires
- Manually verify the full session context shape sent in the request body matches the documented shape at the top of `server/src/index.ts`
- Unit test: mock `/api/cell/evaluate`, assert store transitions for pass and fail paths

---

## Stage 5: Dynamic Next Step Generation (Capability 5) — backend done ✅

**What was built:**

*Backend (complete):*
- `POST /api/cell/next-step` is live in `server/src/index.ts`
- Accepts `{ cellIndex, files, blocks }`
- Placeholder: alternates planning/coding by parity of `cellIndex`; signals `complete: true` after step 4; returns stub instruction text and fake `testFunctions` for coding steps
- Real implementation: replace placeholder logic with Capability 5 (Claude decides type, writes instruction, picks test functions, signals completion)

*Frontend (remaining):*
- After an evaluate-pass (planning or coding), call `/api/cell/next-step` with `cellIndex` of the passing cell
- If `complete: false` → `appendBlock(newBlock)` with the returned type/instruction/testFunctions
- If `complete: true` → `setStatus("complete")` → render a completion state in `AssignmentView`

The completion state is a simple banner/panel: "You've completed the assignment." with a count of blocks completed.

**Verification:**
- Walk through a two-step sequence using the placeholder backend; verify blocks append correctly and `activeBlockIndex` advances
- With `cellIndex = 4`, the backend returns `complete: true` — confirm the completion UI renders without crashing
- Unit test: mock `/api/cell/next-step`, assert block appended correctly for both planning and coding response shapes

---

## Stage 6: Coding Cell Evaluate (test runner integration)

**What to build:**

The placeholder `/api/cell/evaluate` already handles the pass/fail/feedback shape for coding cells. This stage replaces the random logic for coding cells with a real test runner.

*Backend (extend the existing `cellType === "coding"` branch in `/api/cell/evaluate`):*
1. Extract `block.testFunctions` from the request body
2. Construct a runner script: prepend student code, import `tests.py` content, call each listed test function, collect stdout/stderr and pass/fail per function
3. Execute via a `child_process.spawn` Python subprocess on the server (not Pyodide — server-side for reliable isolation)
4. If any test fails: pass the runner output to **Capability 3** (Claude generates readable feedback) — replace the canned coding feedback strings
5. If all pass: return `{ pass: true }`

*Frontend (CodingBlock — no change from Stage 4/5 wiring):*
- The Evaluate button flow is already wired; this stage only changes what the server does internally
- The existing Pyodide Run button remains independent (for student experimentation)

**Verification:**
- Test the runner in isolation first: POST a known-good and known-bad student solution with a real `tests.py`, verify output before wiring Capability 3 feedback
- Submit broken code → test runner output is legible in feedback, not a raw traceback dump
- Submit code with a syntax error → server handles it gracefully, no 500, feedback shown
- Submit passing code → cell passes, next-step fires correctly

---

## Stage 7: Chat Drawer (Capability 4) — backend done ✅

**What was built:**

*Backend (complete):*
- `POST /api/cell/chat` is live in `server/src/index.ts`
- Accepts `{ cellIndex, message, files, blocks }`
- Placeholder: returns one of five generic coaching responses, echoing `cellIndex` and the first 30 chars of the user's message
- Real implementation: replace with Capability 4 (Claude responds in context as a coaching assistant)

*Frontend (remaining):*
- Wire `CoachChatBar.tsx` (the existing stub) to this API
- Chat button on any block toggles an inline drawer below that block
- Each block's `chatHistory: ChatMessage[]` lives in `assignmentSessionStore`
- Sending a message: append user message to history → POST with full session context → append assistant response to history
- Drawer is dismissible via × and re-openable; prior messages are preserved within the session
- Show a loading indicator while the POST is in flight

**Verification:**
- Open chat on a planning block, send a message, verify a response appears
- Close and reopen the drawer — prior messages are still there
- Open chat on a different block — confirm it has a separate, independent history
- Verify `cellIndex` in the request body matches the block where Chat was opened

---

## Stage 8: Persistence & Hardening

**What to build:**

*Persistence:*
- Confirm `assignmentSessionStore` state is written to localStorage on every state change (use existing 500ms debounce from `persistence.ts`)
- On app mount: if `assignment-session` exists in localStorage, rehydrate the store and set `appStore.mode = "assignment"` — skipping the upload page
- Add a "New Session" button in the assignment view that calls `reset()` and clears localStorage, returning to upload

*Hardening:*
- Evaluate button disabled while `evalState.status === "running"` to prevent double-submits
- All API calls have `try/catch` with user-visible error states (not silent failures)
- `status === "initializing"` shows a loading state instead of an empty block list
- Kernel restart in assignment mode resets only the Python namespace, not the assignment session state
- Handle the case where localStorage hydration finds a `status === "initializing"` session (abort it, return to upload)

**Verification:**
- Progress through two steps, close the browser tab, reopen → session fully restored (blocks, chat histories, eval states, student content)
- Verify a `status === "passed"` cell loads with Evaluate disabled
- Force an API error (kill the server mid-session) → error message appears, no state corruption
- Verify "New Session" clears all state and returns to the upload page
- Run the full Vitest suite; confirm no regressions in sandbox mode

---

## Summary Table

| Stage | Deliverable | Status | Primary Verification |
|-------|-------------|--------|----------------------|
| 0 | Architecture decisions locked | ✅ Done | — |
| 1 | Types + store + persistence skeleton | Not started | TypeScript compiles, unit tests pass |
| 2 | Upload → API → summary block rendered | Backend ✅, frontend remaining | Live upload of real files |
| 3 | All three block types render correctly | Not started | Manual UI test with seeded state |
| 4 | Planning Evaluate (pass/fail/feedback) | Backend ✅, frontend remaining | Hit Evaluate, verify both paths |
| 5 | Next step generation + completion | Backend ✅, frontend remaining | Walk through 2-step sequence end-to-end |
| 6 | Coding Evaluate (real test runner) | Not started | Submit passing + failing Python code |
| 7 | Chat drawer per-cell | Backend ✅, frontend remaining | Multi-cell chat, independent histories |
| 8 | Persistence + error hardening | Not started | Page reload mid-session, full restore |
