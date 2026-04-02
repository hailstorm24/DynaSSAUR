import { useCellStore } from '../stores/cellStore.ts';
import { useNotebookStore } from '../stores/notebookStore.ts';
import { useThemeStore } from '../stores/themeStore.ts';
import { removeCell, runCell } from '../controllers/CellController.ts';
import { stopCell } from '../controllers/KernelController.ts';
import { executionLabel } from '../utils/executionLabel.ts';
import { CodeEditor } from './CodeEditor.tsx';
import { CellOutput } from './CellOutput.tsx';

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
      const nextCell = document.querySelector(`[data-cell-id="${nextId}"] .cm-editor`) as HTMLElement | null;
      nextCell?.focus();
    }
  }

  const bg = isDark ? '#1e1e1e' : '#ffffff';
  const border = isDark ? '#3c3c3c' : '#d0d7de';
  const toolbarBg = isDark ? '#252526' : '#f6f8fa';
  const counterColor = isDark ? '#888' : '#888';
  const btnColor = isDark ? '#d4d4d4' : '#1f2328';
  const btnBorder = isDark ? '#444' : '#d0d7de';
  const isRunning = cell.status === 'running';

  return (
    <div
      data-cell-id={cellId}
      style={{
        border: `1px solid ${border}`,
        borderRadius: '6px',
        margin: '12px 16px',
        overflow: 'hidden',
        background: bg,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          background: toolbarBg,
          borderBottom: `1px solid ${border}`,
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            color: counterColor,
            minWidth: '36px',
          }}
        >
          {executionLabel(cell.status, cell.executionCount)}
        </span>
        {isRunning ? (
          <CellButton onClick={stopCell} color="#ff6b6b" border={btnBorder}>■ Stop</CellButton>
        ) : (
          <CellButton onClick={() => runCell(cellId)} color={btnColor} border={btnBorder}>▶ Run</CellButton>
        )}
        <CellButton onClick={() => moveCellUp(cellId)} color={btnColor} border={btnBorder}>↑</CellButton>
        <CellButton onClick={() => moveCellDown(cellId)} color={btnColor} border={btnBorder}>↓</CellButton>
        <CellButton onClick={() => removeCell(cellId)} color={btnColor} border={btnBorder} danger>
          ✕
        </CellButton>
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
        background: 'transparent',
        color: danger ? '#ff6b6b' : color,
        border: `1px solid ${border}`,
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
