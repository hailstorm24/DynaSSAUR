import { addCell } from '../controllers/CellController.ts';
import { runAll, restartKernel } from '../controllers/NotebookController.ts';

export function NotebookToolbar() {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 16px',
        background: '#252526',
        borderBottom: '1px solid #3c3c3c',
        alignItems: 'center',
      }}
    >
      <span style={{ fontWeight: 'bold', marginRight: '8px', fontSize: '15px' }}>
        DynaSSAUR
      </span>
      <ToolbarButton onClick={addCell}>+ Add Cell</ToolbarButton>
      <ToolbarButton onClick={runAll}>▶ Run All</ToolbarButton>
      <ToolbarButton onClick={restartKernel}>↺ Restart Kernel</ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#3c3c3c',
        color: '#d4d4d4',
        border: '1px solid #555',
        borderRadius: '4px',
        padding: '4px 12px',
        cursor: 'pointer',
        fontSize: '13px',
      }}
    >
      {children}
    </button>
  );
}
