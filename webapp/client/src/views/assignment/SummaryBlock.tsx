import { useThemeStore } from '../../stores/themeStore.ts';
import type { SummaryBlock as SummaryBlockType } from '../../models/AssignmentSessionModel.ts';

interface Props {
  block: SummaryBlockType;
}

export function SummaryBlock({ block }: Props) {
  const isDark = useThemeStore((s) => s.isDark);

  const border = isDark ? '#3c3c3c' : '#d0d7de';
  const bg = isDark ? '#1e1e1e' : '#ffffff';
  const toolbar = isDark ? '#252526' : '#f6f8fa';
  const textMain = isDark ? '#d4d4d4' : '#1f2328';
  const badgeBg = isDark ? '#1a2a4a' : '#dbeafe';
  const badgeText = isDark ? '#93c5fd' : '#1d4ed8';

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: '14px',
        overflow: 'hidden',
        background: bg,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: toolbar,
          borderBottom: `1px solid ${border}`,
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
            background: badgeBg,
            color: badgeText,
          }}
        >
          Assignment
        </span>
      </div>
      <div
        style={{
          padding: '20px 24px',
          color: textMain,
          fontSize: '14px',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}
      >
        {block.content}
      </div>
    </div>
  );
}
