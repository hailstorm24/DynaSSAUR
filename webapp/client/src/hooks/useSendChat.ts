import { useState } from 'react';
import { useAssignmentSessionStore } from '../stores/assignmentSessionStore.ts';

export function useSendChat(index: number) {
  const appendChatMessage = useAssignmentSessionStore((s) => s.appendChatMessage);
  const getState = useAssignmentSessionStore.getState;
  const [loading, setLoading] = useState(false);

  async function sendChat(message: string) {
    if (!message.trim() || loading) return;
    appendChatMessage(index, { role: 'user', content: message });
    setLoading(true);

    const { uploadedFiles: files, blocks } = getState();

    try {
      const res = await fetch('/api/cell/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellIndex: index, message, files, blocks }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json() as { response: string };
      appendChatMessage(index, { role: 'assistant', content: data.response });
    } catch (err) {
      appendChatMessage(index, {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Failed to get a response. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return { sendChat, loading };
}
