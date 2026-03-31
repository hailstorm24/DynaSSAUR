import { Notebook } from './views/Notebook.tsx';

export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'sans-serif',
      }}
    >
      <Notebook />
    </div>
  );
}
