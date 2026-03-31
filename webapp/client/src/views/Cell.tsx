import { useCellStore } from '../stores/cellStore.ts';
import { useNotebookStore } from '../stores/notebookStore.ts';
import { removeCell } from '../controllers/CellController.ts';
import { CodeEditor } from './CodeEditor.tsx';
import { CellOutput } from './CellOutput.tsx';

interface CellProps {
  cellId: string;
}

function executionLabel(status: string, count: number | null): string {
  if (status === 'running') return '[*]';
  if (count !== null) return `[${count}]`;
  return '[ ]';
}

export function Cell({ cellId }: CellProps) {
  const cell = useCellStore((s) => s.cells[cellId]);
  const updateSource = useCellStore((s) => s.updateSource);
  const moveCellUp = useNotebookStore((s) => s.moveCellUp);
  const moveCellDown = useNotebookStore((s) => s.moveCellDown);

  if (!cell) return null;

  return (
    <div
      style={{
        border: '1px solid #3c3c3c',
        borderRadius: '6px',
        margin: '12px 16px',
        overflow: 'hidden',
        background: '#1e1e1e',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          background: '#252526',
          borderBottom: '1px solid #3c3c3c',
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#888',
            minWidth: '36px',
          }}
        >
          {executionLabel(cell.status, cell.executionCount)}
        </span>
        <CellButton onClick={() => console.log('run', cellId)}>▶ Run</CellButton>
        <CellButton onClick={() => moveCellUp(cellId)}>↑</CellButton>
        <CellButton onClick={() => moveCellDown(cellId)}>↓</CellButton>
        <CellButton onClick={() => removeCell(cellId)} danger>
          ✕
        </CellButton>
      </div>

      {/* Editor */}
      <CodeEditor
        initialValue={cell.source}
        onUpdate={(src) => updateSource(cellId, src)}
      />

      {/* Output */}
      <CellOutput outputs={cell.outputs} />
    </div>
  );
}

function CellButton({
  onClick,
  children,
  danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        color: danger ? '#ff6b6b' : '#d4d4d4',
        border: '1px solid #444',
        borderRadius: '3px',
        padding: '2px 8px',
        cursor: 'pointer',
        fontSize: '12px',
      }}
    >
      {children}
    </button>
  );
}
