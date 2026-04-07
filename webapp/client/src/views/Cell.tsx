import { useCellStore } from "../stores/cellStore.ts";
import { useNotebookStore } from "../stores/notebookStore.ts";
import { useThemeStore } from "../stores/themeStore.ts";
import {
  removeCell,
  runCell,
  verifyCell,
} from "../controllers/CellController.ts";
import { stopCell } from "../controllers/KernelController.ts";
import { executionLabel } from "../utils/executionLabel.ts";
import { CodeEditor } from "./CodeEditor.tsx";
import { CellOutput } from "./CellOutput.tsx";
import type {
  CellStatus,
  CellType,
  VerificationState,
} from "../models/CellModel.ts";

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

  const cellType = cell.type ?? "code";
  const verificationState = cell.verificationState ?? "idle";
  const verificationMessage = cell.verificationMessage ?? "";
  const errorLine = cell.errorLine ?? null;

  const shell = getShellPalette(cellType, cell.status, isDark);
  const btnColor = isDark ? "#d4d4d4" : "#1f2328";
  const btnBorder = isDark ? "#555" : "#d0d7de";
  const statusText =
    cellType === "code" ? codeStatusLabel(cell.status) : typeLabel(cellType);

  function handleShiftEnter() {
    if (cellType !== "code") return;

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

  return (
    <div
      data-cell-id={cellId}
      style={{
        border: `2px solid ${shell.border}`,
        borderRadius: "14px",
        margin: "14px 16px",
        overflow: "hidden",
        background: shell.background,
        boxShadow: shell.shadow,
        transition:
          "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 10px",
          background: shell.toolbar,
          borderBottom: `1px solid ${shell.divider}`,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "12px",
            color: shell.muted,
            minWidth: cellType === "code" ? "40px" : "auto",
            fontWeight: 700,
          }}
        >
          {cellType === "code"
            ? executionLabel(cell.status, cell.executionCount)
            : typeTag(cellType)}
        </span>

        {cellType === "code" && (
          <>
            {cell.status === "running" ? (
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
              onClick={() => verifyCell(cellId)}
              color={btnColor}
              border={btnBorder}
            >
              ✓ Verify
            </CellButton>
          </>
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
            color: shell.label,
            fontWeight: 700,
          }}
        >
          {statusText}
        </div>
      </div>

      {cellType === "code" ? (
        <>
          <CodeEditor
            initialValue={cell.source}
            onUpdate={(src) => updateSource(cellId, src)}
            onRun={handleShiftEnter}
            errorLine={errorLine}
          />
          <CellOutput outputs={cell.outputs} />
          <VerificationPanel
            state={verificationState}
            message={verificationMessage}
            isDark={isDark}
          />
        </>
      ) : (
        <TextBlockEditor
          label={typeLabel(cellType)}
          value={cell.source}
          onChange={(value) => updateSource(cellId, value)}
          type={cellType}
          isDark={isDark}
        />
      )}
    </div>
  );
}

function TextBlockEditor({
  label,
  value,
  onChange,
  type,
  isDark,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: CellType;
  isDark: boolean;
}) {
  const minHeight = type === "instruction" ? 150 : 110;

  return (
    <div style={{ padding: "14px 16px 16px" }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: "14px",
          marginBottom: "10px",
          opacity: 0.9,
        }}
      >
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          minHeight,
          resize: "vertical",
          borderRadius: "12px",
          border: `1px solid ${isDark ? "#444" : "#d0d7de"}`,
          padding: "12px 14px",
          background: isDark ? "#1b1b1b" : "#ffffff",
          color: isDark ? "#d4d4d4" : "#1f2328",
          fontSize: "14px",
          lineHeight: 1.5,
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function VerificationPanel({
  state,
  message,
  isDark,
}: {
  state: VerificationState;
  message: string;
  isDark: boolean;
}) {
  if (state === "idle" && !message) {
    return (
      <div
        style={{
          borderTop: `1px solid ${isDark ? "#333" : "#e5e7eb"}`,
          padding: "12px 16px 16px",
          fontSize: "13px",
          color: isDark ? "#9da7b1" : "#66707a",
        }}
      >
        Verify feedback will appear here. For now, this is a frontend prototype
        hook your backend can attach to later.
      </div>
    );
  }

  const palette = getVerificationPalette(state, isDark);

  return (
    <div
      style={{
        borderTop: `1px solid ${isDark ? "#333" : "#e5e7eb"}`,
        padding: "12px 16px 16px",
      }}
    >
      <div
        style={{
          borderRadius: "12px",
          border: `1px solid ${palette.border}`,
          background: palette.background,
          color: palette.text,
          padding: "12px 14px",
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "6px" }}>
          {verificationLabel(state)}
        </div>
        {message || "No feedback yet."}
      </div>
    </div>
  );
}

function verificationLabel(state: VerificationState) {
  switch (state) {
    case "pending":
      return "Reviewing";
    case "passed":
      return "Verified";
    case "needs-revision":
      return "Needs revision";
    default:
      return "Idle";
  }
}

function getVerificationPalette(state: VerificationState, isDark: boolean) {
  if (state === "passed") {
    return isDark
      ? { background: "#132b18", border: "#2f7a4b", text: "#b7f7c8" }
      : { background: "#eefbf3", border: "#b9ebc9", text: "#166534" };
  }

  if (state === "needs-revision") {
    return isDark
      ? { background: "#2d1b10", border: "#9a5a2a", text: "#ffd7b2" }
      : { background: "#fff4e8", border: "#f3c58d", text: "#9a3412" };
  }

  return isDark
    ? { background: "#16233d", border: "#274d8f", text: "#cfe2ff" }
    : { background: "#eaf2ff", border: "#c8dcff", text: "#1d4ed8" };
}

function typeTag(type: CellType) {
  switch (type) {
    case "instruction":
      return "[instruction]";
    case "task":
      return "[task]";
    case "feedback":
      return "[feedback]";
    default:
      return "[code]";
  }
}

function typeLabel(type: CellType) {
  switch (type) {
    case "instruction":
      return "Instruction Block";
    case "task":
      return "Task Block";
    case "feedback":
      return "Feedback Block";
    default:
      return "Code Block";
  }
}

function codeStatusLabel(status: CellStatus) {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "success":
      return "Run successful";
    case "error":
      return "Run error";
    default:
      return "Code Block";
  }
}

function getShellPalette(type: CellType, status: CellStatus, isDark: boolean) {
  if (type !== "code") {
    if (isDark) {
      if (type === "instruction") {
        return {
          background: "#191f2b",
          toolbar: "#1f2a3b",
          border: "#4c6fff",
          divider: "#324664",
          label: "#bcd0ff",
          muted: "#9db4f2",
          shadow: "none",
        };
      }
      if (type === "task") {
        return {
          background: "#241e12",
          toolbar: "#312716",
          border: "#e0a100",
          divider: "#5f4a16",
          label: "#ffe08a",
          muted: "#eacb74",
          shadow: "none",
        };
      }
      return {
        background: "#1d1d1d",
        toolbar: "#2a2a2a",
        border: "#6b7280",
        divider: "#3c3c3c",
        label: "#d1d5db",
        muted: "#9ca3af",
        shadow: "none",
      };
    }

    if (type === "instruction") {
      return {
        background: "#f5f8ff",
        toolbar: "#ebf1ff",
        border: "#91b4ff",
        divider: "#d6e2ff",
        label: "#3556b6",
        muted: "#5273cc",
        shadow: "none",
      };
    }
    if (type === "task") {
      return {
        background: "#fff9ec",
        toolbar: "#fff2c9",
        border: "#f0bf4c",
        divider: "#f3dfaa",
        label: "#9a6700",
        muted: "#b07a08",
        shadow: "none",
      };
    }
    return {
      background: "#f8fafc",
      toolbar: "#eef2f7",
      border: "#c4cbd5",
      divider: "#dde3ea",
      label: "#4b5563",
      muted: "#6b7280",
      shadow: "none",
    };
  }

  if (isDark) {
    switch (status) {
      case "queued":
        return {
          background: "#111a2b",
          toolbar: "#16233d",
          border: "#3b82f6",
          divider: "#274d8f",
          label: "#93c5fd",
          muted: "#a7b0b8",
          shadow: "0 0 0 1px rgba(59,130,246,0.10)",
        };
      case "running":
        return {
          background: "#2a220d",
          toolbar: "#3a2d0f",
          border: "#facc15",
          divider: "#806412",
          label: "#fde68a",
          muted: "#a7b0b8",
          shadow: "0 0 0 1px rgba(250,204,21,0.10)",
        };
      case "success":
        return {
          background: "#102315",
          toolbar: "#14301a",
          border: "#22c55e",
          divider: "#2f7a4b",
          label: "#86efac",
          muted: "#a7b0b8",
          shadow: "0 0 0 1px rgba(34,197,94,0.12)",
        };
      case "error":
        return {
          background: "#2a1113",
          toolbar: "#381518",
          border: "#ef4444",
          divider: "#8b2e33",
          label: "#fca5a5",
          muted: "#a7b0b8",
          shadow: "0 0 0 1px rgba(239,68,68,0.10)",
        };
      default:
        return {
          background: "#1e1e1e",
          toolbar: "#252526",
          border: "#3c3c3c",
          divider: "#3c3c3c",
          label: "#888",
          muted: "#a7b0b8",
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
        muted: "#6e7781",
        shadow: "0 0 0 1px rgba(96,165,250,0.10)",
      };
    case "running":
      return {
        background: "#fff9db",
        toolbar: "#fff3bf",
        border: "#f59e0b",
        divider: "#f6dea2",
        label: "#b45309",
        muted: "#6e7781",
        shadow: "0 0 0 1px rgba(245,158,11,0.10)",
      };
    case "success":
      return {
        background: "#eefbf3",
        toolbar: "#dcfce7",
        border: "#22c55e",
        divider: "#b9ebc9",
        label: "#15803d",
        muted: "#6e7781",
        shadow: "0 0 0 1px rgba(34,197,94,0.10)",
      };
    case "error":
      return {
        background: "#fff1f2",
        toolbar: "#ffe4e6",
        border: "#ef4444",
        divider: "#ffc8cf",
        label: "#b91c1c",
        muted: "#6e7781",
        shadow: "0 0 0 1px rgba(239,68,68,0.08)",
      };
    default:
      return {
        background: "#ffffff",
        toolbar: "#f6f8fa",
        border: "#d0d7de",
        divider: "#d0d7de",
        label: "#888",
        muted: "#6e7781",
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
        borderRadius: "999px",
        padding: "4px 10px",
        cursor: "pointer",
        fontSize: "12px",
      }}
    >
      {children}
    </button>
  );
}
