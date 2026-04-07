import { useState } from 'react';
import type { CellOutput as CellOutputType } from '../models/CellModel.ts';
import { useThemeStore } from '../stores/themeStore.ts';
import { TurtleCanvas } from './TurtleCanvas.tsx';

interface CellOutputProps {
  outputs: CellOutputType[];
}

function getErrorSummary(text: string): { summary: string; hasFull: boolean } {
  const marker = 'File "<exec>", ';
  const idx = text.lastIndexOf(marker);
  if (idx === -1) return { summary: text, hasFull: false };
  const afterMarker = text.slice(idx + marker.length).trim();
  const capitalized = afterMarker.charAt(0).toUpperCase() + afterMarker.slice(1);
  return { summary: capitalized, hasFull: true };
}

function ErrorOutput({ text, color }: { text: string; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const { summary, hasFull } = getErrorSummary(text);

  return (
    <div style={{ color }}>
      <div>{expanded ? text : summary}</div>
      {hasFull && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: '4px',
            background: 'none',
            border: 'none',
            color,
            cursor: 'pointer',
            fontSize: '11px',
            opacity: 0.7,
            padding: '0',
            textDecoration: 'underline',
            display: 'block',
          }}
        >
          {expanded ? 'hide traceback' : 'show full traceback'}
        </button>
      )}
    </div>
  );
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
        if (output.type === 'error') {
          return <ErrorOutput key={idx} text={output.text} color="#ff6b6b" />;
        }
        return (
          <div
            key={idx}
            style={{
              color: output.type === 'stderr' ? '#ff6b6b' : stdoutColor,
            }}
          >
            {output.text}
          </div>
        );
      })}
    </div>
  );
}
