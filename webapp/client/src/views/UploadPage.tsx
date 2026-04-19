import { useRef, useState } from "react";
import { useAppStore } from "../stores/appStore.ts";
import { useThemeStore } from "../stores/themeStore.ts";
import { useAssignmentSessionStore } from "../stores/assignmentSessionStore.ts";

interface UploadedFile {
  file: File;
  name: string;
}

export function UploadPage() {
  const isDark = useThemeStore((s) => s.isDark);
  const openSession = useAppStore((s) => s.openSession);
  const initSession = useAssignmentSessionStore((s) => s.initSession);
  const appendBlock = useAssignmentSessionStore((s) => s.appendBlock);

  const [mdFile, setMdFile] = useState<UploadedFile | null>(null);
  const [solutionFile, setSolutionFile] = useState<UploadedFile | null>(null);
  const [testFile, setTestFile] = useState<UploadedFile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mdRef = useRef<HTMLInputElement>(null);
  const solutionRef = useRef<HTMLInputElement>(null);
  const testRef = useRef<HTMLInputElement>(null);

  const allUploaded = mdFile && solutionFile && testFile;

  async function handleGenerate() {
    if (!mdFile || !solutionFile || !testFile) return;
    setGenerating(true);
    setError(null);
    try {
      const [assignment, solution, tests] = await Promise.all([
        mdFile.file.text(),
        solutionFile.file.text(),
        testFile.file.text(),
      ]);
      const files = { assignment, solution, tests };
      const res = await fetch("/api/session/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const { summaryContent } = await res.json() as { summaryContent: string };
      initSession(files, { type: "summary", content: summaryContent });

      const stepRes = await fetch("/api/cell/next-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellIndex: -1, files, blocks: [] }),
      });
      if (!stepRes.ok) throw new Error(`Server error: ${stepRes.status}`);
      const step = await stepRes.json() as {
        type: "planning" | "coding";
        instruction: string;
        testFunctions?: string[];
        complete: boolean;
      };
      if (!step.complete) {
        appendBlock(
          step.type === "coding"
            ? { type: "coding", instruction: step.instruction, studentContent: "", testFunctions: step.testFunctions ?? [], evalState: { status: "idle" }, chatHistory: [] }
            : { type: "planning", instruction: step.instruction, studentContent: "", evalState: { status: "idle" }, chatHistory: [] },
        );
      }

      openSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setGenerating(false);
    }
  }

  const bg = isDark ? "#1e1e1e" : "#f9fafb";
  const cardBg = isDark ? "#252526" : "#ffffff";
  const border = isDark ? "#3c3c3c" : "#e1e4e8";
  const textMuted = isDark ? "#9ca3af" : "#6b7280";
  const textMain = isDark ? "#d4d4d4" : "#1f2328";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🦖</div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: textMain, margin: 0 }}>
            New Assignment
          </h1>
          <p style={{ color: textMuted, marginTop: "8px", fontSize: "15px" }}>
            Upload your three files and DynaSSAUR will generate an interactive lesson.
          </p>
        </div>

        <div
          style={{
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: "16px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <UploadZone
            label="Assignment Instructions"
            description=".md file — the full assignment prompt"
            accept=".md,text/markdown"
            icon="📄"
            file={mdFile}
            onSelect={(f) => setMdFile({ file: f, name: f.name })}
            onClear={() => setMdFile(null)}
            inputRef={mdRef}
            isDark={isDark}
          />
          <UploadZone
            label="Solution Code"
            description=".py file — the complete reference solution"
            accept=".py,text/x-python"
            icon="✅"
            file={solutionFile}
            onSelect={(f) => setSolutionFile({ file: f, name: f.name })}
            onClear={() => setSolutionFile(null)}
            inputRef={solutionRef}
            isDark={isDark}
          />
          <UploadZone
            label="Test Cases"
            description=".py file — test cases used for verification"
            accept=".py,text/x-python"
            icon="🧪"
            file={testFile}
            onSelect={(f) => setTestFile({ file: f, name: f.name })}
            onClear={() => setTestFile(null)}
            inputRef={testRef}
            isDark={isDark}
          />

          {error && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: isDark ? "#2a1113" : "#fff1f2",
                border: `1px solid ${isDark ? "#8b2e33" : "#ffc8cf"}`,
                color: isDark ? "#fca5a5" : "#b91c1c",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          <button
            disabled={!allUploaded || generating}
            onClick={handleGenerate}
            style={{
              marginTop: "8px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: allUploaded && !generating ? "#4c6fff" : isDark ? "#2a2a2a" : "#e5e7eb",
              color: allUploaded && !generating ? "#ffffff" : textMuted,
              fontSize: "15px",
              fontWeight: 600,
              cursor: allUploaded && !generating ? "pointer" : "not-allowed",
              transition: "background 200ms ease",
            }}
          >
            {generating ? "Generating lesson…" : "Generate"}
          </button>

          {!allUploaded && (
            <p style={{ textAlign: "center", fontSize: "13px", color: textMuted, margin: 0 }}>
              Upload all three files to enable Generate.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadZone({
  label,
  description,
  accept,
  icon,
  file,
  onSelect,
  onClear,
  inputRef,
  isDark,
}: {
  label: string;
  description: string;
  accept: string;
  icon: string;
  file: UploadedFile | null;
  onSelect: (f: File) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  isDark: boolean;
}) {
  const border = isDark ? "#3c3c3c" : "#d0d7de";
  const activeBorder = "#4c6fff";
  const bg = isDark ? "#1b1b1b" : "#f6f8fa";
  const activeBg = isDark ? "#191f2b" : "#f0f4ff";
  const textMain = isDark ? "#d4d4d4" : "#1f2328";
  const textMuted = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
          e.target.value = "";
        }}
      />
      <div
        onClick={() => !file && inputRef.current?.click()}
        style={{
          border: `2px dashed ${file ? activeBorder : border}`,
          borderRadius: "12px",
          background: file ? activeBg : bg,
          padding: "16px 18px",
          cursor: file ? "default" : "pointer",
          transition: "border-color 150ms, background 150ms",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <span style={{ fontSize: "22px", flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "14px", color: textMain }}>
            {label}
          </div>
          {file ? (
            <div
              style={{
                fontSize: "13px",
                color: "#4c6fff",
                marginTop: "2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {file.name}
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: textMuted, marginTop: "2px" }}>
              {description}
            </div>
          )}
        </div>
        {file ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: textMuted,
              cursor: "pointer",
              fontSize: "16px",
              padding: "4px",
              flexShrink: 0,
            }}
            title="Remove file"
          >
            ✕
          </button>
        ) : (
          <span style={{ fontSize: "13px", color: textMuted, flexShrink: 0 }}>
            Choose file
          </span>
        )}
      </div>
    </div>
  );
}
