# DynaSSAUR Web IDE

A browser-based, notebook-style Python IDE — similar to Google Colab — that runs Python entirely in your browser with no installation required. Also includes an **Assignment Mode** for guided, step-by-step coding exercises with AI evaluation and coaching.

---

## Setup & Installation

```bash
cd webapp
npm install
```

The server requires **Python 3** on your PATH (used to run test suites in Assignment Mode).

---

## Running the App

```bash
npm run dev
```

This starts both the Vite dev server (frontend) and the Express backend concurrently.

| Service  | URL |
| -------- | --- |
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3001 |

> **First run note:** Python (Pyodide, ~20 MB) loads in the background the first time you run a
> cell. A progress bar appears in the toolbar. After that, the browser caches it and subsequent
> page loads are near-instant.

---

## Modes

The app has two modes selectable from the home screen:

| Mode | Description |
| ---- | ----------- |
| **Sandbox** | Free-form notebook — add, edit, and run cells in any order |
| **Assignment** | Guided step-by-step flow with AI evaluation and coaching |

---

## Sandbox (Notebook) Mode

When you open the Sandbox, you see a vertical list of **cells** — each is a self-contained Python
editor with its own output area directly below it.

```
┌──────────────────────────────────────────────────┐
│  [Run All]  [Restart Kernel]  [Add Cell]  [Clear] │  ← Notebook toolbar
├──────────────────────────────────────────────────┤
│ [1] ▶ ■  Python                                   │  ← Cell toolbar
│ ┌────────────────────────────────────────────── ┐ │
│ │  x = 10                                        │ │  ← Code editor
│ │  print(x * 2)                                  │ │
│ └────────────────────────────────────────────── ┘ │
│  20                                               │  ← Output area
└──────────────────────────────────────────────────┘
```

### Cell Toolbar

| Element             | Description |
| ------------------- | ----------- |
| `[3]`               | Execution counter — which run this cell was in the session |
| `[ ]`               | Cell has not been run yet |
| `[*]`               | Cell is currently running or queued |
| `▶`                 | Run this cell |
| `■`                 | Stop execution |
| Move up / Move down | Reorder the cell in the notebook |
| Delete              | Remove the cell |

### Running Code

Click **▶** on a cell (or press **Shift+Enter**) to run it. Output appears directly below the editor:

- `print()` results and stdout stream in as the code runs
- Errors show an inline traceback — only your code's frames are shown (Pyodide internals are filtered out)
- The execution counter updates to show which run number this was: `[1]`, `[2]`, etc.

### Shared Kernel

All cells share **one Python session**. Variables defined in one cell are available in later cells — just like Colab:

```python
# Cell 1
x = 10

# Cell 2 — x is available here if Cell 1 was run first
print(x * 2)  # → 20
```

- Variables persist until you click **Restart Kernel**
- You can run cells in any order
- **Run All** executes every cell top-to-bottom in sequence

### Stopping Execution

Click **■** (Stop) on a running cell to interrupt it. If the code doesn't respond within 2 seconds
(e.g. a tight loop), the kernel restarts automatically with a fresh Python environment.

If a cell is queued while another is running, its counter shows `[*]`. Stopping the current cell
clears the entire queue.

### Turtle Graphics

The standard Python `turtle` module works out of the box. A **600×400 canvas** appears in the
cell's output area — no separate window needed:

```python
import turtle

t = turtle.Turtle()
t.forward(100)
t.right(90)
t.forward(100)
```

Supported commands: `forward`, `backward`, `right`, `left`, `penup`, `pendown`, `pencolor`,
`pensize`, `goto`, `home`, `circle`, `clear`, `reset`, `hideturtle`, `showturtle`, `speed`.

### Package Support

**Always available (Python stdlib):** `math`, `json`, `re`, `datetime`, `random`, `collections`,
`statistics`, and more.

**Loads automatically on import:** `numpy`, `pandas`, `scipy`, `matplotlib`, `scikit-learn`,
`Pillow`, `sympy`, `networkx`, and ~100 more pre-compiled packages.

**Pure-Python PyPI packages** can be installed at runtime:

```python
import micropip
await micropip.install("requests")
```

> Packages with compiled C extensions (e.g. `torch`, `tensorflow`, `opencv-python`) are not
> supported. A clear error message will tell you if a package can't load.

### Notebook Toolbar Actions

| Button                | What it does |
| --------------------- | ------------ |
| **Run All**           | Runs every cell top-to-bottom in order |
| **Restart Kernel**    | Clears the Python namespace and resets all execution counters |
| **Add Cell**          | Appends a new empty cell at the bottom |
| **Clear All Outputs** | Removes all output from every cell without re-running |

---

## Assignment Mode

Assignment Mode guides students through a structured exercise with alternating planning and coding
steps. Each step must pass AI evaluation before the next one unlocks.

### Step 1 — Upload Files

Navigate to the Upload page and provide three files:

| File | Description |
| ---- | ----------- |
| **Assignment** | The student-facing problem description |
| **Solution** | Reference solution (used by the AI evaluator) |
| **Tests** | Python test file containing test functions |

After uploading, the server generates an **Assignment Overview** and the first step unlocks.

### Step 2 — Work Through Blocks

A session is a sequence of **blocks** rendered vertically:

```
┌─────────────────────────────────────────────────────────┐
│  Assignment Overview                                      │  ← Summary (read-only)
├─────────────────────────────────────────────────────────┤
│  Planning · Step 1                               ✓ / ✗  │
│  [Textarea for your plan…]                               │
│                                      [Chat]  [Evaluate]  │
├─────────────────────────────────────────────────────────┤
│  Coding · Step 2                                 ✓ / ✗  │
│  [Code editor]                            [▶ Run]        │
│  [output…]                                               │
│                                      [Chat]  [Evaluate]  │
└─────────────────────────────────────────────────────────┘
```

Only the **active block** (the bottom-most unlocked step) is editable. Completed blocks are shown
in a read-only, dimmed state.

**Planning blocks** — write your approach in plain text, then click **Evaluate**. The AI checks
that your plan is sufficiently detailed and provides feedback if not.

**Coding blocks** — write Python in the CodeMirror editor. Click **▶ Run** at any time to execute
your code locally in the browser (uses a fresh Pyodide worker per run). When ready, click
**Evaluate** — the server runs your code against the uploaded test suite via a `python3`
subprocess and shows pass/fail results with AI-generated feedback.

### Chat Coaching

Every block has a **Chat** button that opens a per-block coaching panel. Type a question or ask for
a hint; the AI coach responds without revealing the solution.

### Evaluation Flow

1. Click **Evaluate** → status changes to `Evaluating…`
2. Server returns `pass: true` or `pass: false + feedback`
3. **Fail** — feedback appears inline below the block; revise and re-evaluate
4. **Pass** — block locks, the server generates the next step and appends it below
5. When all steps are done, a completion screen is shown

### Running the Backend

The Express backend (port 3001) handles all AI evaluation and chat routes. It must be running for
Assignment Mode to work. `npm run dev` starts it automatically alongside the frontend.

To run the backend alone:

```bash
cd server
npx tsx src/index.ts
```
