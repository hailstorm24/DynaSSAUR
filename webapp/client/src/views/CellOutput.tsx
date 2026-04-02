import type { CellOutput as CellOutputType } from '../models/CellModel.ts';
import { useThemeStore } from '../stores/themeStore.ts';
import { TurtleCanvas } from './TurtleCanvas.tsx';

interface CellOutputProps {
  outputs: CellOutputType[];
}

export function CellOutput({ outputs }: CellOutputProps) {
  const isDark = useThemeStore((s) => s.isDark);

  if (outputs.length === 0) return null;

  const bg = isDark ? '#1a1a1a' : '#f6f8fa';
  const border = isDark ? '#333' : '#d0d7de';
  const stdoutColor = isDark ? '#d4d4d4' : '#1f2328';

  return (
    <div
      style={{
        background: bg,
        borderTop: `1px solid ${border}`,
        padding: '8px 12px',
        fontFamily: 'monospace',
        fontSize: '13px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {outputs.map((output, idx) => {
        if (output.type === 'canvas') {
          return <TurtleCanvas key={idx} commands={output.commands} />;
        }
        return (
          <div
            key={idx}
            style={{
              color:
                output.type === 'stderr' || output.type === 'error'
                  ? '#ff6b6b'
                  : stdoutColor,
            }}
          >
            {output.text}
          </div>
        );
      })}
    </div>
  );
}
