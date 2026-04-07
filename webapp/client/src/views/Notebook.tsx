import { useNotebookStore } from "../stores/notebookStore.ts";
import { Cell } from "./Cell.tsx";
import { NotebookToolbar } from "./NotebookToolbar.tsx";
import { CoachChatBar } from "./CoachChatBar.tsx";

export function Notebook() {
  const cellIds = useNotebookStore((s) => s.cellIds);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <NotebookToolbar />
      <div style={{ flex: 1, paddingBottom: "20px" }}>
        {cellIds.map((id) => (
          <Cell key={id} cellId={id} />
        ))}
      </div>
      <CoachChatBar />
    </div>
  );
}
