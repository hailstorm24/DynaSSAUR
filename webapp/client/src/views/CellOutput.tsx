import type { CellOutput as CellOutputType } from '../models/CellModel.ts';

interface CellOutputProps {
  outputs: CellOutputType[];
}

export function CellOutput({ outputs }: CellOutputProps) {
  if (outputs.length === 0) return null;

  return (
    <div
      style={{
        background: '#1a1a1a',
        borderTop: '1px solid #333',
        padding: '8px 12px',
        fontFamily: 'monospace',
        fontSize: '13px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {outputs.map((output, idx) => (
        <div
          key={idx}
          style={{
            color:
              output.type === 'stderr' || output.type === 'error'
                ? '#ff6b6b'
                : '#d4d4d4',
          }}
        >
          {output.text}
        </div>
      ))}
    </div>
  );
}
