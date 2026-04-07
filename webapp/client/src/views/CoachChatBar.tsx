import { useState } from "react";
import { useThemeStore } from "../stores/themeStore.ts";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const starterMessages: ChatMessage[] = [
  {
    role: "assistant",
    text: "Coach chat prototype: ask for clarification, hints, or feedback about the current task.",
  },
];

export function CoachChatBar() {
  const isDark = useThemeStore((s) => s.isDark);
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  const panelBg = isDark
    ? "rgba(37, 37, 38, 0.96)"
    : "rgba(255, 255, 255, 0.96)";
  const border = isDark ? "#3c3c3c" : "#d0d7de";
  const textColor = isDark ? "#d4d4d4" : "#1f2328";
  const muted = isDark ? "#9da7b1" : "#66707a";

  function sendMessage() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text: "Mock coach response: I can clarify the instructions, point out what to inspect next, or give a hint without giving away the answer.",
      },
    ]);
    setDraft("");
    setOpen(true);
  }

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 50,
        padding: "0 16px 16px",
      }}
    >
      <div
        style={{
          marginLeft: "auto",
          width: "min(760px, 100%)",
          border: `1px solid ${border}`,
          borderRadius: "16px",
          background: panelBg,
          backdropFilter: "blur(14px)",
          boxShadow: isDark
            ? "0 10px 30px rgba(0,0,0,0.35)"
            : "0 10px 30px rgba(31,35,40,0.10)",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setOpen((prev) => !prev)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "12px 14px",
            border: "none",
            borderBottom: open ? `1px solid ${border}` : "none",
            background: "transparent",
            color: textColor,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Coach Chat {open ? "▾" : "▸"}
        </button>

        {open && (
          <div
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              padding: "12px 14px 0",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  alignSelf:
                    message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  padding: "10px 12px",
                  borderRadius: "14px",
                  background:
                    message.role === "user"
                      ? isDark
                        ? "#173a5e"
                        : "#eaf2ff"
                      : isDark
                        ? "#2b2b2b"
                        : "#f6f8fa",
                  color: textColor,
                  fontSize: "14px",
                  lineHeight: 1.45,
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: muted,
                    marginBottom: "4px",
                    fontWeight: 700,
                  }}
                >
                  {message.role === "user" ? "You" : "Coach"}
                </div>
                {message.text}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", padding: "12px 14px 14px" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask for clarification or a hint…"
            style={{
              flex: 1,
              borderRadius: "999px",
              border: `1px solid ${border}`,
              padding: "10px 14px",
              background: isDark ? "#1e1e1e" : "#ffffff",
              color: textColor,
              outline: "none",
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              border: "none",
              borderRadius: "999px",
              padding: "10px 16px",
              background: "#3b82f6",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
