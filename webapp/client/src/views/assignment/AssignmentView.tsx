import { useAssignmentSessionStore } from '../../stores/assignmentSessionStore.ts';
import { useThemeStore } from '../../stores/themeStore.ts';
import { SummaryBlock } from './SummaryBlock.tsx';
import { PlanningBlock } from './PlanningBlock.tsx';
import { CodingBlock } from './CodingBlock.tsx';

export function AssignmentView() {
  const blocks = useAssignmentSessionStore((s) => s.blocks);
  const activeBlockIndex = useAssignmentSessionStore((s) => s.activeBlockIndex);
  const status = useAssignmentSessionStore((s) => s.status);
  const isDark = useThemeStore((s) => s.isDark);

  const bg = isDark ? '#1e1e1e' : '#f9fafb';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';

  if (status === 'initializing') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: textMuted,
          fontSize: '15px',
        }}
      >
        Initializing session…
      </div>
    );
  }

  if (status === 'complete') {
    return (
      <CompletionView blocks={blocks.length} isDark={isDark} />
    );
  }

  let planStep = 0;
  let codeStep = 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bg,
        padding: '32px 24px',
      }}
    >
      <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {blocks.map((block, i) => {
          const isActive = i === activeBlockIndex;

          if (block.type === 'summary') {
            return <SummaryBlock key={i} block={block} />;
          }

          if (block.type === 'planning') {
            planStep += 1;
            const step = planStep + codeStep;
            return (
              <PlanningBlock
                key={i}
                block={block}
                index={i}
                stepNumber={step}
                isActive={isActive}
              />
            );
          }

          if (block.type === 'coding') {
            codeStep += 1;
            const step = planStep + codeStep;
            return (
              <CodingBlock
                key={i}
                block={block}
                index={i}
                stepNumber={step}
                isActive={isActive}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function CompletionView({ blocks, isDark }: { blocks: number; isDark: boolean }) {
  const bg = isDark ? '#1e1e1e' : '#f9fafb';
  const cardBg = isDark ? '#252526' : '#ffffff';
  const border = isDark ? '#3c3c3c' : '#d0d7de';
  const textMain = isDark ? '#d4d4d4' : '#1f2328';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div
        style={{
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: '16px',
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: '480px',
          width: '100%',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: textMain, margin: '0 0 10px' }}>
          Assignment Complete
        </h2>
        <p style={{ color: textMuted, fontSize: '15px', margin: 0 }}>
          You completed {blocks - 1} step{blocks - 1 !== 1 ? 's' : ''}.
        </p>
      </div>
    </div>
  );
}
