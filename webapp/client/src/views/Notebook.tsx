import { useNotebookStore } from '../stores/notebookStore.ts';
import { Cell } from './Cell.tsx';
import { NotebookToolbar } from './NotebookToolbar.tsx';

export function Notebook() {
  const cellIds = useNotebookStore((s) => s.cellIds);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NotebookToolbar />
      <div style={{ flex: 1, paddingBottom: '32px' }}>
        {cellIds.map((id) => (
          <Cell key={id} cellId={id} />
        ))}
      </div>
    </div>
  );
}
