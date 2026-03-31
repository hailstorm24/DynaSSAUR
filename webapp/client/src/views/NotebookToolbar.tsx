import { addCell } from '../controllers/CellController.ts';
import { runAll, restartKernel } from '../controllers/NotebookController.ts';
import { useThemeStore } from '../stores/themeStore.ts';

export function NotebookToolbar() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const bg = isDark ? '#252526' : '#f6f8fa';
  const border = isDark ? '#3c3c3c' : '#d0d7de';
  const btnBg = isDark ? '#3c3c3c' : '#ffffff';
  const btnColor = isDark ? '#d4d4d4' : '#1f2328';
  const btnBorder = isDark ? '#555' : '#d0d7de';

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 16px',
        background: bg,
        borderBottom: `1px solid ${border}`,
        alignItems: 'center',
      }}
    >
      <span style={{ fontWeight: 'bold', marginRight: '8px', fontSize: '15px' }}>
        DynaSSAUR
      </span>
      <ToolbarButton onClick={addCell} bg={btnBg} color={btnColor} border={btnBorder}>
        + Add Cell
      </ToolbarButton>
      <ToolbarButton onClick={runAll} bg={btnBg} color={btnColor} border={btnBorder}>
        ▶ Run All
      </ToolbarButton>
      <ToolbarButton onClick={restartKernel} bg={btnBg} color={btnColor} border={btnBorder}>
        ↺ Restart Kernel
      </ToolbarButton>
      <div style={{ marginLeft: 'auto' }}>
        <ToolbarButton onClick={toggleTheme} bg={btnBg} color={btnColor} border={btnBorder}>
          {isDark ? '☀ Light' : '◑ Dark'}
        </ToolbarButton>
      </div>
    </div>
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
