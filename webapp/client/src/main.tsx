import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { loadSavedNotebook, loadSavedSession, initPersistence } from './utils/persistence.ts';
import { useAssignmentSessionStore, SESSION_STORAGE_KEY } from './stores/assignmentSessionStore.ts';
import { useAppStore } from './stores/appStore.ts';

// Restore saved notebook state before React renders (synchronous store hydration).
loadSavedNotebook();

// Restore assignment session if one was saved.
const savedSession = loadSavedSession();
if (savedSession) {
  if (savedSession.status === 'initializing') {
    // Incomplete session — discard it and return to upload.
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    useAssignmentSessionStore.setState({ ...savedSession, apiError: null });
    useAppStore.getState().openSession();
  }
}

// Begin auto-saving to localStorage on store changes.
initPersistence();

const root = document.getElementById('root');
if (!root) throw new Error('No #root element found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
