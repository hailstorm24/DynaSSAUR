import { useRef } from 'react';
import { useAssignmentSessionStore } from '../../stores/assignmentSessionStore.ts';
import { useAppStore } from '../../stores/appStore.ts';
import { useThemeStore } from '../../stores/themeStore.ts';
import { SummaryBlock } from './SummaryBlock.tsx';
import { PlanningBlock } from './PlanningBlock.tsx';
import { CodingBlock } from './CodingBlock.tsx';

export function AssignmentView() {
  const blocks = useAssignmentSessionStore((s) => s.blocks);
  const activeBlockIndex = useAssignmentSessionStore((s) => s.activeBlockIndex);
  const status = useAssignmentSessionStore((s) => s.status);
  const apiError = useAssignmentSessionStore((s) => s.apiError);
  const reset = useAssignmentSessionStore((s) => s.reset);
  const setApiError = useAssignmentSessionStore((s) => s.setApiError);
  const openUpload = useAppStore((s) => s.openUpload);
  const isDark = useThemeStore((s) => s.isDark);

  const sharedWorkerRef = useRef<Worker | null>(null);
  const sharedWorkerReadyRef = useRef<boolean>(false);

  const bg = isDark ? '#1e1e1e' : '#f9fafb';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';

  function handleNewSession() {
    reset();
    openUpload();
  }

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
      <CompletionView blocks={blocks.length} isDark={isDark} onNewSession={handleNewSession} />
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
        {/* Header row with New Session button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleNewSession}
            style={{
              background: 'transparent',
              border: `1px solid ${isDark ? '#555' : '#d0d7de'}`,
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              color: isDark ? '#d4d4d4' : '#1f2328',
              cursor: 'pointer',
            }}
          >
            New Session
          </button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: isDark ? '#2d1010' : '#fff0f0',
              border: `1px solid ${isDark ? '#9a2a2a' : '#fca5a5'}`,
              color: isDark ? '#fca5a5' : '#b91c1c',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span>{apiError}</span>
            <button
              onClick={() => setApiError(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        )}

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
                workerRef={sharedWorkerRef}
                workerReadyRef={sharedWorkerReadyRef}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function CompletionView({ blocks, isDark, onNewSession }: { blocks: number; isDark: boolean; onNewSession: () => void }) {
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
        <p style={{ color: textMuted, fontSize: '15px', margin: '0 0 24px' }}>
          You completed {blocks - 1} step{blocks - 1 !== 1 ? 's' : ''}.
        </p>
        <button
          onClick={onNewSession}
          style={{
            background: '#4c6fff',
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          New Session
        </button>
      </div>
    </div>
  );
}
