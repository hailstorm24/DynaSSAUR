# DynaSSAUR Web IDE

A browser-based, notebook-style Python IDE — similar to Google Colab — that runs Python entirely in your browser with no installation required.

## Running the App

```bash
cd webapp
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## What It Looks Like

### The Notebook

When you open the app, you see a vertical list of **cells** — each cell is a self-contained Python editor with its own output area directly below it. At the top is a toolbar with notebook-level actions.

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
├──────────────────────────────────────────────────┤
│ [2] ▶ ■  Python                                   │
│ ┌────────────────────────────────────────────── ┐ │
│ │  import turtle                                 │ │
│ │  turtle.forward(100)                           │ │
│ └────────────────────────────────────────────── ┘ │
│  [  canvas with turtle drawing  ]                 │  ← Turtle canvas
└──────────────────────────────────────────────────┘
```

---

## Cell Toolbar

Each cell has a small toolbar showing:

| Element | Description |
|---|---|
| `[3]` | Execution counter — which run this cell was in the session |
| `[ ]` | Cell has not been run yet |
| `[*]` | Cell is currently running or queued |
| `▶` | Run this cell |
| `■` | Stop execution |
| Move up / Move down | Reorder the cell in the notebook |
| Delete | Remove the cell |

---

## Running Code

Click **▶** on a cell (or press **Shift+Enter**) to run it. Output appears directly below the editor:

- `print()` results and stdout stream in as the code runs
- Errors show an inline traceback — only your code's frames are shown (Pyodide internals are filtered out)
- The execution counter updates to show which run number this was: `[1]`, `[2]`, etc.

**First run:** Python loads in the background the first time you run a cell (~20 MB download). A progress bar in the toolbar shows loading status. After that, the browser caches it and subsequent page loads are near-instant.

---

## Shared Kernel

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

---

## Stopping Execution

Click **■** (Stop) on a running cell to interrupt it. If the code doesn't respond within 2 seconds (e.g. a tight loop), the kernel restarts automatically with a fresh Python environment.

If a cell is queued while another is running, its counter shows `[*]`. Stopping the current cell clears the entire queue.

---

## Turtle Graphics

The standard Python `turtle` module works out of the box. When a cell uses turtle, a **600×400 canvas** appears in the cell's output area — no separate window needed:

```python
import turtle

t = turtle.Turtle()
t.forward(100)
t.right(90)
t.forward(100)
```

The canvas is drawn fresh each time the cell runs. Supported turtle commands include `forward`, `backward`, `right`, `left`, `penup`, `pendown`, `pencolor`, `pensize`, `goto`, `home`, `circle`, `clear`, `reset`, `hideturtle`, `showturtle`, and `speed`.

---

## Package Support

You don't need to install packages manually. Just import them:

**Always available (Python stdlib):** `math`, `json`, `re`, `datetime`, `random`, `collections`, `statistics`, and more.

**Loads automatically on import:** `numpy`, `pandas`, `scipy`, `matplotlib`, `scikit-learn`, `Pillow`, `sympy`, `networkx`, and ~100 more pre-compiled packages.

**Pure-Python PyPI packages** can be installed at runtime:
```python
import micropip
await micropip.install("requests")
```

> Packages with compiled C extensions (e.g. `torch`, `tensorflow`, `opencv-python`) are not supported. A clear error message will tell you if a package can't load.

---

## Notebook Toolbar Actions

| Button | What it does |
|---|---|
| **Run All** | Runs every cell top-to-bottom in order |
| **Restart Kernel** | Clears the Python namespace and resets all execution counters |
| **Add Cell** | Appends a new empty cell at the bottom |
| **Clear All Outputs** | Removes all output from every cell without re-running |