import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { loadSavedNotebook, initPersistence } from './utils/persistence.ts';

// Restore saved notebook state before React renders (synchronous store hydration).
loadSavedNotebook();
// Begin auto-saving to localStorage on store changes.
initPersistence();

const root = document.getElementById('root');
if (!root) throw new Error('No #root element found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
