import { useState, type MutableRefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import { useThemeStore } from '../../stores/themeStore.ts';
import { useAssignmentSessionStore } from '../../stores/assignmentSessionStore.ts';
import { useEvaluateCell } from '../../hooks/useEvaluateCell.ts';
import { useSendChat } from '../../hooks/useSendChat.ts';
import { CodeEditor } from '../CodeEditor.tsx';
import type { CodingBlock as CodingBlockType } from '../../models/AssignmentSessionModel.ts';

interface Props {
  block: CodingBlockType;
  index: number;
  stepNumber: number;
  isActive: boolean;
  workerRef: MutableRefObject<Worker | null>;
  workerReadyRef: MutableRefObject<boolean>;
}

export function CodingBlock({ block, index, stepNumber, isActive, workerRef, workerReadyRef }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const updateStudentContent = useAssignmentSessionStore((s) => s.updateStudentContent);

  const handleEvaluate = useEvaluateCell(index, 'coding');
  const { sendChat, loading: chatLoading } = useSendChat(index);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [stdout, setStdout] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<string | null>(null);
  const [fullTraceback, setFullTraceback] = useState<string | null>(null);
  const [traceExpanded, setTraceExpanded] = useState(false);
  const [running, setRunning] = useState(false);

  const evalPassed = block.evalState.status === 'passed';
  const evalRunning = block.evalState.status === 'running';
  const evalFailed = block.evalState.status === 'failed';
  const evaluateDisabled = !isActive || evalPassed || evalRunning;

  const border = isDark ? '#3c3c3c' : '#d0d7de';
  const bg = isDark ? '#1e1e1e' : '#ffffff';
  const toolbar = isDark ? '#252526' : '#f6f8fa';
  const textMain = isDark ? '#d4d4d4' : '#1f2328';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';
  const badgeBg = isDark ? '#132b18' : '#dcfce7';
  const badgeText = isDark ? '#86efac' : '#15803d';

  function handleRun() {
    if (running) return;
    setRunning(true);
    setStdout('');
    setErrorLine(null);
    setFullTraceback(null);
    setTraceExpanded(false);

    let accumulated = '';

    function attachHandler(worker: Worker) {
      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'stdout' || msg.type === 'stderr') {
          accumulated += msg.text;
          setStdout(accumulated);
        } else if (msg.type === 'error') {
          const raw: string = msg.traceback ?? msg.text ?? '';
          const lines = raw.trimEnd().split('\n');
          const lastLine = [...lines].reverse().find((l: string) => l.trim()) ?? raw;
          setErrorLine(lastLine.trim());
          setFullTraceback(raw);
          setRunning(false);
        } else if (msg.type === 'done') {
          setRunning(false);
        } else if (msg.type === 'kernel_ready') {
          workerReadyRef.current = true;
          worker.postMessage({ type: 'run', cellId: `assignment-${index}`, code: block.studentContent });
        }
      };
      worker.onerror = () => {
        setErrorLine('Error: failed to start Python runtime.');
        setFullTraceback(null);
        setRunning(false);
      };
    }

    if (!workerRef.current) {
      const worker = new Worker(
        new URL('../../workers/pyodide.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;
      workerReadyRef.current = false;
      attachHandler(worker);
      // kernel_ready will trigger the run
    } else {
      attachHandler(workerRef.current);
      workerRef.current.postMessage({ type: 'run', cellId: `assignment-${index}`, code: block.studentContent });
    }
  }

  function handleSendChat() {
    const trimmed = chatDraft.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setChatDraft('');
  }

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: '14px',
        overflow: 'hidden',
        background: bg,
        opacity: isActive ? 1 : 0.85,
      }}
    >
      {/* Toolbar */}
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
          Coding · Step {stepNumber}
        </span>
        <span style={{ fontSize: '12px', color: textMuted, marginLeft: 'auto' }}>
          {evalPassed ? '✓ Passed' : evalRunning ? 'Evaluating…' : evalFailed ? '✗ Needs revision' : ''}
        </span>
      </div>

      {/* Instruction */}
      <div
        style={{
          padding: '16px 20px 12px',
          fontSize: '14px',
          color: textMain,
          lineHeight: 1.6,
          borderBottom: `1px solid ${border}`,
        }}
      >
        <ReactMarkdown>{block.instruction}</ReactMarkdown>
      </div>

      {/* Code editor */}
      <div style={{ borderBottom: `1px solid ${border}` }}>
        <CodeEditor
          initialValue={block.studentContent}
          onUpdate={(src) => isActive && updateStudentContent(index, src)}
          onRun={handleRun}
        />
      </div>

      {/* Run button + output */}
      <div style={{ padding: '10px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ActionButton onClick={handleRun} disabled={running} isDark={isDark}>
            {running ? '■ Running…' : '▶ Run'}
          </ActionButton>
        </div>
        {stdout !== null && (
          <pre
            style={{
              margin: '0 0 10px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: isDark ? '#111' : '#f6f8fa',
              border: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
              color: isDark ? '#d4d4d4' : '#1f2328',
              fontSize: '13px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              minHeight: '36px',
            }}
          >
            {stdout || ' '}
            {errorLine !== null && (
              <span style={{ color: '#ff6b6b' }}>
                {'\n'}{traceExpanded ? fullTraceback : errorLine}
                {'\n'}
                <button
                  onClick={() => setTraceExpanded((v) => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff6b6b',
                    cursor: 'pointer',
                    fontSize: '11px',
                    opacity: 0.7,
                    padding: '0',
                    textDecoration: 'underline',
                  }}
                >
                  {traceExpanded ? 'hide traceback' : 'show full traceback'}
                </button>
              </span>
            )}
          </pre>
        )}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '4px 20px 14px',
        }}
      >
        <ActionButton onClick={() => setChatOpen((o) => !o)} isDark={isDark}>
          Chat
        </ActionButton>
        <ActionButton
          onClick={handleEvaluate}
          disabled={evaluateDisabled}
          isDark={isDark}
          primary
        >
          {evalRunning ? 'Evaluating…' : 'Evaluate'}
        </ActionButton>
      </div>

      {/* Feedback area */}
      {evalFailed && block.evalState.status === 'failed' && (
        <FeedbackPanel
          feedback={block.evalState.feedback}
          testOutput={block.evalState.testOutput}
          isDark={isDark}
        />
      )}

      {/* Chat drawer */}
      {chatOpen && (
        <ChatDrawer
          history={block.chatHistory}
          draft={chatDraft}
          onDraftChange={setChatDraft}
          onSend={handleSendChat}
          onClose={() => setChatOpen(false)}
          loading={chatLoading}
          isDark={isDark}
        />
      )}
    </div>
  );
}

function FeedbackPanel({ feedback, testOutput, isDark }: { feedback: string; testOutput?: string; isDark: boolean }) {
  return (
    <div
      style={{
        margin: '0 20px 16px',
        padding: '12px 14px',
        borderRadius: '10px',
        background: isDark ? '#2d1b10' : '#fff4e8',
        border: `1px solid ${isDark ? '#9a5a2a' : '#f3c58d'}`,
        color: isDark ? '#ffd7b2' : '#9a3412',
        fontSize: '14px',
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '4px' }}>Feedback</div>
      <ReactMarkdown>{feedback}</ReactMarkdown>
      {testOutput && (() => {
        const lines = testOutput.split('\n');
        const kept: string[] = [];
        lines.forEach((l, i) => {
          if (l.startsWith('PASS:') || l.startsWith('FAIL:')) {
            kept.push(l);
          } else if (i > 0 && lines[i - 1].startsWith('FAIL:') && l.trim()) {
            kept.push('  ' + l.trim());
          }
        });
        const display = kept.length > 0 ? kept.join('\n') : lines.filter(Boolean).slice(-2).join('\n');
        return (
          <pre
            style={{
              marginTop: '10px',
              padding: '8px 10px',
              borderRadius: '6px',
              background: isDark ? '#1a1008' : '#fef3e2',
              border: `1px solid ${isDark ? '#6b3a18' : '#f3c58d'}`,
              fontSize: '12px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: isDark ? '#ffd7b2' : '#7c2d12',
            }}
          >
            {display}
          </pre>
        );
      })()}
    </div>
  );
}

function ChatDrawer({
  history,
  draft,
  onDraftChange,
  onSend,
  onClose,
  loading,
  isDark,
}: {
  history: { role: 'user' | 'assistant'; content: string }[];
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  loading: boolean;
  isDark: boolean;
}) {
  const border = isDark ? '#3c3c3c' : '#d0d7de';
  const bg = isDark ? '#252526' : '#f6f8fa';
  const textMain = isDark ? '#d4d4d4' : '#1f2328';
  const textMuted = isDark ? '#9da7b1' : '#66707a';

  return (
    <div style={{ borderTop: `1px solid ${border}`, background: bg }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 14px',
          borderBottom: `1px solid ${border}`,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '13px', color: textMain }}>Chat</span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: textMuted,
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px 6px',
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {history.length === 0 && (
          <div style={{ fontSize: '13px', color: textMuted, textAlign: 'center' }}>
            Ask a question about this step.
          </div>
        )}
        {history.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              padding: '8px 12px',
              borderRadius: '12px',
              background:
                msg.role === 'user'
                  ? isDark ? '#173a5e' : '#eaf2ff'
                  : isDark ? '#2b2b2b' : '#ffffff',
              color: textMain,
              fontSize: '14px',
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontSize: '11px', color: textMuted, marginBottom: '3px', fontWeight: 700 }}>
              {msg.role === 'user' ? 'You' : 'Coach'}
            </div>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '0 14px 8px', fontSize: '13px', color: textMuted, fontStyle: 'italic' }}>
          Coach is thinking…
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 14px' }}>
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) { e.preventDefault(); onSend(); } }}
          disabled={loading}
          placeholder="Ask for a hint or clarification…"
          style={{
            flex: 1,
            borderRadius: '999px',
            border: `1px solid ${border}`,
            padding: '8px 14px',
            background: isDark ? '#1e1e1e' : '#ffffff',
            color: textMain,
            fontSize: '14px',
            outline: 'none',
            opacity: loading ? 0.6 : 1,
          }}
        />
        <button
          onClick={onSend}
          disabled={loading}
          style={{
            border: 'none',
            borderRadius: '999px',
            padding: '8px 16px',
            background: loading ? (isDark ? '#2a2a2a' : '#e5e7eb') : '#3b82f6',
            color: loading ? (isDark ? '#6b7280' : '#9ca3af') : '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '14px',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
  isDark,
  primary,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  isDark: boolean;
  primary?: boolean;
}) {
  const base = primary
    ? {
        background: disabled ? (isDark ? '#2a2a2a' : '#e5e7eb') : '#4c6fff',
        color: disabled ? (isDark ? '#6b7280' : '#9ca3af') : '#ffffff',
        border: 'none',
      }
    : {
        background: 'transparent',
        color: isDark ? '#d4d4d4' : '#1f2328',
        border: `1px solid ${isDark ? '#555' : '#d0d7de'}`,
      };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        borderRadius: '999px',
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 150ms',
      }}
    >
      {children}
    </button>
  );
}
