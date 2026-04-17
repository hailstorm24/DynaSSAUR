import { useState } from "react";
import { useAppStore } from "../stores/appStore.ts";
import { useAssignmentStore, type AssignmentEntry } from "../stores/assignmentStore.ts";
import { useCellStore } from "../stores/cellStore.ts";
import { useNotebookStore } from "../stores/notebookStore.ts";
import { loadSavedSandbox } from "../utils/persistence.ts";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const currentId = useAppStore((s) => s.currentAssignmentId);
  const openSandbox = useAppStore((s) => s.openSandbox);
  const openUpload = useAppStore((s) => s.openUpload);
  const openAssignment = useAppStore((s) => s.openAssignment);
  const assignments = useAssignmentStore((s) => s.assignments);
  const removeAssignment = useAssignmentStore((s) => s.removeAssignment);
  const loadCells = useCellStore((s) => s.loadCells);
  const loadCellIds = useNotebookStore((s) => s.loadCellIds);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function handleOpenAssignment(entry: AssignmentEntry) {
    loadCells(entry.notebookData.cellIds, entry.notebookData.cells);
    loadCellIds(entry.notebookData.cellIds);
    openAssignment(entry.id);
  }

  function handleOpenSandbox() {
    loadSavedSandbox();
    openSandbox();
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (deleteConfirm === id) {
      removeAssignment(id);
      if (currentId === id) openUpload();
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
    }
  }

  const isSandbox = view === "sandbox";
  const isUpload = view === "upload";

  return (
    <div
      style={{
        width: "260px",
        flexShrink: 0,
        height: "100vh",
        background: "#161b22",
        borderRight: "1px solid #30363d",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #30363d" }}>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "#e6edf3" }}>
          🦖 DynaSSAUR
        </div>
      </div>

      {/* Sandbox button */}
      <div style={{ padding: "12px 10px 4px" }}>
        <SidebarButton
          active={isSandbox}
          onClick={handleOpenSandbox}
          icon="🧪"
          label="Sandbox"
        />
      </div>

      <div style={{ height: "1px", background: "#30363d", margin: "10px 10px 4px" }} />

      {/* New Assignment */}
      <div style={{ padding: "4px 10px 8px" }}>
        <SidebarButton
          active={isUpload}
          onClick={openUpload}
          icon="+"
          label="New Assignment"
          iconStyle={{ fontWeight: 700, fontSize: "16px" }}
        />
      </div>

      {/* Assignment list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 16px" }}>
        {assignments.length === 0 ? (
          <div
            style={{
              fontSize: "12px",
              color: "#6e7781",
              textAlign: "center",
              padding: "24px 8px",
              lineHeight: 1.5,
            }}
          >
            No assignments yet.
            <br />
            Upload files to generate one.
          </div>
        ) : (
          assignments.map((entry) => {
            const isActive = currentId === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => handleOpenAssignment(entry)}
                onMouseLeave={() => setDeleteConfirm(null)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "2px",
                  cursor: "pointer",
                  background: isActive ? "#21262d" : "transparent",
                  border: isActive ? "1px solid #30363d" : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 120ms",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#e6edf3" : "#cdd9e5",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6e7781", marginTop: "2px" }}>
                    {relativeTime(entry.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(entry.id, e)}
                  title={deleteConfirm === entry.id ? "Click again to confirm" : "Delete"}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: deleteConfirm === entry.id ? "#f85149" : "#6e7781",
                    cursor: "pointer",
                    fontSize: "13px",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    flexShrink: 0,
                    opacity: isActive || deleteConfirm === entry.id ? 1 : 0,
                  }}
                >
                  {deleteConfirm === entry.id ? "Confirm" : "✕"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SidebarButton({
  active,
  onClick,
  icon,
  label,
  iconStyle,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  iconStyle?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 12px",
        borderRadius: "8px",
        border: active ? "1px solid #30363d" : "1px solid transparent",
        background: active ? "#21262d" : "transparent",
        color: active ? "#e6edf3" : "#cdd9e5",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: active ? 600 : 400,
        textAlign: "left",
        transition: "background 120ms",
      }}
    >
      <span style={{ fontSize: "15px", ...iconStyle }}>{icon}</span>
      {label}
    </button>
  );
}
