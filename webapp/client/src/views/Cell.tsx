import { useCellStore } from "../stores/cellStore.ts";
import { useNotebookStore } from "../stores/notebookStore.ts";
import { useThemeStore } from "../stores/themeStore.ts";
import { removeCell, runCell } from "../controllers/CellController.ts";
import { stopCell } from "../controllers/KernelController.ts";
import { executionLabel } from "../utils/executionLabel.ts";
import { CodeEditor } from "./CodeEditor.tsx";
import { CellOutput } from "./CellOutput.tsx";

interface CellProps {
  cellId: string;
}

export function Cell({ cellId }: CellProps) {
  const cell = useCellStore((s) => s.cells[cellId]);
  const updateSource = useCellStore((s) => s.updateSource);
  const moveCellUp = useNotebookStore((s) => s.moveCellUp);
  const moveCellDown = useNotebookStore((s) => s.moveCellDown);
  const cellIds = useNotebookStore((s) => s.cellIds);
  const isDark = useThemeStore((s) => s.isDark);

  if (!cell) return null;

  function handleShiftEnter() {
    runCell(cellId);
    const idx = cellIds.indexOf(cellId);
    const nextId = cellIds[idx + 1];
    if (nextId) {
      const nextCell = document.querySelector(
        `[data-cell-id="${nextId}"] .cm-editor`,
      ) as HTMLElement | null;
      nextCell?.focus();
    }
  }

  const palette = getCellPalette(cell.status, isDark);
  const counterColor = isDark ? "#a7b0b8" : "#6e7781";
  const btnColor = isDark ? "#d4d4d4" : "#1f2328";
  const btnBorder = isDark ? "#555" : "#d0d7de";
  const isRunning = cell.status === "running";

  return (
    <div
      data-cell-id={cellId}
      style={{
        border: `2px solid ${palette.border}`,
        borderRadius: "10px",
        margin: "12px 16px",
        overflow: "hidden",
        background: palette.background,
        boxShadow: palette.shadow,
        transition:
          "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 8px",
          background: palette.toolbar,
          borderBottom: `1px solid ${palette.divider}`,
          transition: "background 160ms ease, border-color 160ms ease",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "13px",
            color: counterColor,
            minWidth: "36px",
            fontWeight: cell.status === "success" ? 700 : 500,
          }}
        >
          {executionLabel(cell.status, cell.executionCount)}
        </span>

        {isRunning ? (
          <CellButton onClick={stopCell} color="#ff6b6b" border={btnBorder}>
            ■ Stop
          </CellButton>
        ) : (
          <CellButton
            onClick={() => runCell(cellId)}
            color={btnColor}
            border={btnBorder}
          >
            ▶ Run
          </CellButton>
        )}

        <CellButton
          onClick={() => moveCellUp(cellId)}
          color={btnColor}
          border={btnBorder}
        >
          ↑
        </CellButton>
        <CellButton
          onClick={() => moveCellDown(cellId)}
          color={btnColor}
          border={btnBorder}
        >
          ↓
        </CellButton>
        <CellButton
          onClick={() => removeCell(cellId)}
          color={btnColor}
          border={btnBorder}
          danger
        >
          ✕
        </CellButton>

        <div
          style={{
            marginLeft: "8px",
            fontSize: "12px",
            color: palette.label,
            fontWeight: 600,
          }}
        >
          {statusLabel(cell.status)}
        </div>
      </div>

      {/* Editor */}
      <CodeEditor
        initialValue={cell.source}
        onUpdate={(src) => updateSource(cellId, src)}
        onRun={handleShiftEnter}
        errorLine={cell.errorLine}
      />

      {/* Output */}
      <CellOutput outputs={cell.outputs} />
    </div>
  );
}

function statusLabel(
  status: "idle" | "queued" | "running" | "success" | "error",
) {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "success":
      return "Success";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

function getCellPalette(
  status: "idle" | "queued" | "running" | "success" | "error",
  isDark: boolean,
) {
  if (isDark) {
    switch (status) {
      case "queued":
        return {
          background: "#111a2b",
          toolbar: "#16233d",
          border: "#3b82f6",
          divider: "#274d8f",
          label: "#93c5fd",
          shadow: "0 0 0 1px rgba(59,130,246,0.10)",
        };
      case "running":
        return {
          background: "#2a220d",
          toolbar: "#3a2d0f",
          border: "#facc15",
          divider: "#806412",
          label: "#fde68a",
          shadow: "0 0 0 1px rgba(250,204,21,0.10)",
        };
      case "success":
        return {
          background: "#102315",
          toolbar: "#14301a",
          border: "#22c55e",
          divider: "#2f7a4b",
          label: "#86efac",
          shadow: "0 0 0 1px rgba(34,197,94,0.12)",
        };
      case "error":
        return {
          background: "#2a1113",
          toolbar: "#381518",
          border: "#ef4444",
          divider: "#8b2e33",
          label: "#fca5a5",
          shadow: "0 0 0 1px rgba(239,68,68,0.10)",
        };
      default:
        return {
          background: "#1e1e1e",
          toolbar: "#252526",
          border: "#3c3c3c",
          divider: "#3c3c3c",
          label: "#888",
          shadow: "none",
        };
    }
  }

  switch (status) {
    case "queued":
      return {
        background: "#f4f8ff",
        toolbar: "#eaf2ff",
        border: "#60a5fa",
        divider: "#c8dcff",
        label: "#2563eb",
        shadow: "0 0 0 1px rgba(96,165,250,0.10)",
      };
    case "running":
      return {
        background: "#fff9db",
        toolbar: "#fff3bf",
        border: "#f59e0b",
        divider: "#f6dea2",
        label: "#b45309",
        shadow: "0 0 0 1px rgba(245,158,11,0.10)",
      };
    case "success":
      return {
        background: "#eefbf3",
        toolbar: "#dcfce7",
        border: "#22c55e",
        divider: "#b9ebc9",
        label: "#15803d",
        shadow: "0 0 0 1px rgba(34,197,94,0.10)",
      };
    case "error":
      return {
        background: "#fff1f2",
        toolbar: "#ffe4e6",
        border: "#ef4444",
        divider: "#ffc8cf",
        label: "#b91c1c",
        shadow: "0 0 0 1px rgba(239,68,68,0.08)",
      };
    default:
      return {
        background: "#ffffff",
        toolbar: "#f6f8fa",
        border: "#d0d7de",
        divider: "#d0d7de",
        label: "#888",
        shadow: "none",
      };
  }
}

function CellButton({
  onClick,
  children,
  danger,
  color,
  border,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  color: string;
  border: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        color: danger ? "#ff6b6b" : color,
        border: `1px solid ${border}`,
        borderRadius: "4px",
        padding: "2px 8px",
        cursor: "pointer",
        fontSize: "12px",
      }}
    >
      {children}
    </button>
  );
}
