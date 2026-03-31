import { Notebook } from './views/Notebook.tsx';
import { useThemeStore } from './stores/themeStore.ts';

export default function App() {
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: isDark ? '#1e1e1e' : '#ffffff',
        color: isDark ? '#d4d4d4' : '#1f2328',
        fontFamily: 'sans-serif',
      }}
    >
      <Notebook />
    </div>
  );
}
