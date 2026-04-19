# DynaSSAUR — Assignment Flow Specification

## Overview

The assignment flow is a guided, notebook-style learning experience distinct from the sandbox IDE. The user uploads three files to initialize a session; the app generates a structured sequence of planning and coding cells that scaffold the student toward a complete solution. Progress is gated — each cell must pass evaluation before the next is generated.

---

## Session Initialization

### Upload Page

The user uploads three files before the session begins:

| File | Purpose |
|------|---------|
| `assignment.md` | Assignment description and requirements |
| `solution.py` | Reference solution (used to guide step generation) |
| `tests.py` | Test suite; functions here are used to evaluate coding cells |

On successful upload, the app initializes the assignment view.

---

## Block Types

There are three block types. All blocks are displayed in a vertical sequence; only the latest unlocked block is interactive.

### 1. Assignment Summary Block

- **Content**: Static rendered Markdown
- **Editable**: No
- **Source**: AI-generated from `assignment.md` *(AI Capability 1)*
- **Buttons**: None
- **Appears**: Once, at the top of every session

### 2. Planning Cell

- **Content**: 
  - Static instruction text (AI-generated per step, describes what to plan) *(AI Capability 5)*
  - Editable Markdown textarea (student writes their implementation plan)
- **Editable**: Yes (Markdown body only)
- **Buttons**: **Chat**, **Evaluate**
- **Evaluate behavior**: LLM judges whether the plan is sufficient *(AI Capability 2)*
  - Fail → AI-generated feedback displayed inline *(AI Capability 3)*
  - Pass → triggers next step generation *(AI Capability 5)*

### 3. Coding Cell

- **Content**:
  - Static instruction text (AI-generated per step, describes what to implement) *(AI Capability 5)*
  - Editable Python editor (CodeMirror, shared Pyodide kernel)
- **Editable**: Yes (Python body only)
- **Buttons**: **Chat**, **Evaluate** (plus the standard kernel Run button)
- **Evaluate behavior**: Runs a specified set of test functions from `tests.py` against the student's code
  - The set of applicable test functions is determined by AI during step generation *(AI Capability 5)*
  - Fail → AI-generated feedback displayed inline *(AI Capability 3)*
  - Pass → triggers next step generation *(AI Capability 5)*

---

## Cell Sequence & Progression

```
[Upload] → [Assignment Summary]
               ↓
         [Planning Cell #1]  ← first cell always planning
               ↓ (evaluate passes)
         [Next Step Generation]  ← AI decides: planning or coding
               ↓
         [Planning Cell or Coding Cell #2]
               ↓ (evaluate passes)
         [Next Step Generation]
               ↓
              ...
               ↓ (AI determines session complete)
         [Completion State]
```

- Cells are revealed one at a time; past cells remain visible and editable after passing, but the Evaluate button is permanently disabled once a cell passes
- The student can re-attempt evaluation on the active cell unlimited times
- Failures show feedback inline without blocking further attempts

---

## AI Capabilities

Five separately-implemented AI capabilities, all placeholders until integrated.

### Shared Input (all capabilities receive this)

Every AI call receives the full session context:
- `assignment.md`, `solution.py`, `tests.py` (original uploads, verbatim)
- All blocks in order: type, instruction, current student content, eval state (pass/fail/feedback)

Capabilities may also receive additional call-specific inputs listed below.

### Capability Table

| # | Capability | Trigger | Additional input beyond shared context | Output |
|---|-----------|---------|----------------------------------------|--------|
| 1 | **Assignment Overview Generation** | Session init | *(none — shared context is sufficient)* | Markdown summary for the Assignment Summary block |
| 2 | **Planning Cell Validation** | Evaluate on planning cell | Index of the cell being evaluated | Pass/fail decision + rationale |
| 3 | **Evaluate Failure Feedback** | Evaluate fails (planning or coding) | Index of the cell being evaluated; for coding cells: test runner output / error details | Natural language feedback shown inline below the cell |
| 4 | **Chatbot Coach** | Chat button on any planning/coding cell | Index of the cell where Chat was opened; user's message | Conversational response rendered in inline drawer |
| 5 | **Dynamic Next Step Generation** | Evaluate passes on any cell | Index of the cell that just passed | Next cell type (`"planning"` or `"coding"`), static instruction text, list of applicable test function names (coding only), and `complete: boolean` signaling whether the session is finished |

---

## UI Layout (per cell)

```
┌──────────────────────────────────────────┐
│ [Block type badge]  [Step N]             │
│──────────────────────────────────────────│
│ Static instruction text                  │
│ (read-only)                              │
│──────────────────────────────────────────│
│                                          │
│  Editable area (MD or Python)            │
│                                          │
│──────────────────────────────────────────│
│ [Run ▶]  (coding only)                  │
│ Output area  (coding only)               │
│──────────────────────────────────────────│
│              [Chat]  [Evaluate]          │
│──────────────────────────────────────────│
│ Feedback area (shown after failed eval)  │
└──────────────────────────────────────────┘
        ↓ Chat button pressed
┌──────────────────────────────────────────┐
│ Chat  [×]                                │
│──────────────────────────────────────────│
│  [assistant message]                     │
│                    [student message]     │
│  ...                                     │
│──────────────────────────────────────────│
│ [text input field]          [Send]       │
└──────────────────────────────────────────┘
```

The chat drawer opens inline below the cell that triggered it. Each cell has its own independent chat history. The drawer is dismissible via [×] and re-openable; prior messages are preserved within the session.

---

## State Model (additions to existing architecture)

```
AssignmentSessionModel
  uploadedFiles: { assignment: string; solution: string; tests: string }
  blocks: Block[]          // ordered, append-only
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

ChatMessage
  { role: "user" | "assistant"; content: string }
```

### Persistence

Session state is serialized to JSON and cached (matching the existing notebook save/load mechanism). The full `AssignmentSessionModel` — including uploaded file contents, all block states, and per-cell chat histories — is written to cache on every state change and restored on page reload.
