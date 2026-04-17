import { addBlock } from "../controllers/CellController.ts";
import {
  runAll,
  restartKernel,
  downloadNotebook,
  importNotebook,
  clearAllCells,
} from "../controllers/NotebookController.ts";
import { useThemeStore } from "../stores/themeStore.ts";
import { useKernelStore } from "../stores/kernelStore.ts";
import { useAppStore } from "../stores/appStore.ts";
import { useAssignmentStore } from "../stores/assignmentStore.ts";

export function NotebookToolbar() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const kernelStatus = useKernelStore((s) => s.status);
  const view = useAppStore((s) => s.view);
  const currentId = useAppStore((s) => s.currentAssignmentId);
  const getAssignment = useAssignmentStore((s) => s.getAssignment);

  const isSandbox = view === "sandbox";
  const assignmentTitle = !isSandbox && currentId
    ? (getAssignment(currentId)?.title ?? "Assignment")
    : null;

  const bg = isDark ? "#252526" : "#f6f8fa";
  const border = isDark ? "#3c3c3c" : "#d0d7de";
  const btnBg = isDark ? "#3c3c3c" : "#ffffff";
  const btnColor = isDark ? "#d4d4d4" : "#1f2328";
  const btnBorder = isDark ? "#555" : "#d0d7de";

  return (
    <div
      style={{
        background: bg,
        borderBottom: `1px solid ${border}`,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "8px 16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: "bold", marginRight: "8px", fontSize: "15px" }}>
          {assignmentTitle ?? "Sandbox 🧪"}
        </span>

        {isSandbox && (
          <>
            <ToolbarButton onClick={() => addBlock("instruction")} bg={btnBg} color={btnColor} border={btnBorder}>
              + Instruction
            </ToolbarButton>
            <ToolbarButton onClick={() => addBlock("task")} bg={btnBg} color={btnColor} border={btnBorder}>
              + Task
            </ToolbarButton>
            <ToolbarButton onClick={() => addBlock("code")} bg={btnBg} color={btnColor} border={btnBorder}>
              + Code
            </ToolbarButton>
            <ToolbarButton onClick={() => addBlock("feedback")} bg={btnBg} color={btnColor} border={btnBorder}>
              + Feedback
            </ToolbarButton>
          </>
        )}

        <ToolbarButton onClick={runAll} bg={btnBg} color={btnColor} border={btnBorder}>
          ▶ Run All Code
        </ToolbarButton>

        <ToolbarButton onClick={restartKernel} bg={btnBg} color={btnColor} border={btnBorder}>
          ↺ Restart Kernel
        </ToolbarButton>

        {isSandbox && (
          <ToolbarButton onClick={clearAllCells} bg={btnBg} color={btnColor} border={btnBorder}>
            ⊘ Clear All
          </ToolbarButton>
        )}

        <ToolbarButton onClick={downloadNotebook} bg={btnBg} color={btnColor} border={btnBorder}>
          ↓ Save JSON
        </ToolbarButton>

        {isSandbox && (
          <ToolbarButton onClick={importNotebook} bg={btnBg} color={btnColor} border={btnBorder}>
            ↑ Load JSON
          </ToolbarButton>
        )}

        <KernelStatusBadge status={kernelStatus} isDark={isDark} />

        <div style={{ marginLeft: "auto" }}>
          <ToolbarButton
            onClick={toggleTheme}
            bg={btnBg}
            color={btnColor}
            border={btnBorder}
          >
            {isDark ? "☀ Light" : "◑ Dark"}
          </ToolbarButton>
        </div>
      </div>

      {kernelStatus === "loading" && (
        <div
          style={{
            height: "2px",
            background: isDark ? "#3c3c3c" : "#e0e0e0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#2196f3",
              animation: "kernelLoading 1.4s ease-in-out infinite",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes kernelLoading {
          0%   { transform: translateX(-100%) scaleX(0.4); }
          50%  { transform: translateX(25%)   scaleX(0.6); }
          100% { transform: translateX(125%)  scaleX(0.4); }
        }
      `}</style>
    </div>
  );
}

function KernelStatusBadge({
  status,
  isDark,
}: {
  status: string;
  isDark: boolean;
}) {
  const color =
    status === "ready"
      ? "#4caf50"
      : status === "loading"
        ? "#2196f3"
        : status === "error"
          ? "#f44336"
          : isDark
            ? "#888"
            : "#aaa";

  const label =
    status === "ready"
      ? "Kernel ready"
      : status === "loading"
        ? "Loading kernel…"
        : status === "error"
          ? "Kernel error"
          : "Kernel idle";

  return (
    <span style={{ fontSize: "12px", color, marginLeft: "4px" }}>
      ● {label}
    </span>
  );
}

function ToolbarButton({
  onClick,
  children,
  bg,
  color,
  border,
}: {
  onClick: () => void;
  children: React.ReactNode;
  bg: string;
  color: string;
  border: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        borderRadius: "999px",
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: "13px",
      }}
    >
      {children}
    </button>
  );
}
