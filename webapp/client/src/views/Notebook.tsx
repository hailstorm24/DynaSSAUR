import { useState, useRef } from "react";
import { useNotebookStore } from "../stores/notebookStore.ts";
import { useThemeStore } from "../stores/themeStore.ts";
import { Cell } from "./Cell.tsx";
import { NotebookToolbar } from "./NotebookToolbar.tsx";
import { CoachChatBar } from "./CoachChatBar.tsx";

interface DropTarget {
  index: number;
  position: "above" | "below";
}

export function Notebook() {
  const cellIds = useNotebookStore((s) => s.cellIds);
  const reorderCells = useNotebookStore((s) => s.reorderCells);
  const isDark = useThemeStore((s) => s.isDark);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
    setDraggingIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? "above" : "below";
    setDropTarget({ index, position });
  }

  function handleDrop() {
    if (dragIndexRef.current !== null && dropTarget !== null) {
      const insertBefore =
        dropTarget.position === "above" ? dropTarget.index : dropTarget.index + 1;
      reorderCells(dragIndexRef.current, insertBefore);
    }
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDropTarget(null);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDropTarget(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NotebookToolbar />
      <div style={{ flex: 1, paddingBottom: "20px" }}>
        {cellIds.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 20px",
              color: isDark ? "#6e7681" : "#8c959f",
              fontSize: "15px",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "32px" }}>🦖</span>
            <span>No cells yet — use the toolbar above to add one.</span>
          </div>
        )}
        {cellIds.map((id, index) => {
          const showAbove =
            dropTarget?.index === index &&
            dropTarget.position === "above" &&
            draggingIndex !== index;
          const showBelow =
            dropTarget?.index === index &&
            dropTarget.position === "below" &&
            draggingIndex !== index;

          return (
            <div
              key={id}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              style={{ position: "relative" }}
            >
              {showAbove && <DropLine />}
              <Cell
                cellId={id}
                isDragging={draggingIndex === index}
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
              />
              {showBelow && <DropLine />}
            </div>
          );
        })}
        {draggingIndex !== null && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget({ index: cellIds.length - 1, position: "below" });
            }}
            onDrop={handleDrop}
            style={{ height: "40px" }}
          />
        )}
      </div>
      <CoachChatBar />
    </div>
  );
}

function DropLine() {
  return (
    <div
      style={{
        height: "3px",
        background: "#3b82f6",
        borderRadius: "2px",
        margin: "0 18px",
        pointerEvents: "none",
      }}
    />
  );
}
