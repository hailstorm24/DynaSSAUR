import { useAppStore } from "../stores/appStore.ts";
import { useThemeStore } from "../stores/themeStore.ts";
import { Sidebar } from "./Sidebar.tsx";
import { UploadPage } from "./UploadPage.tsx";
import { Notebook } from "./Notebook.tsx";

export function AppLayout() {
  const view = useAppStore((s) => s.view);
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflow: "auto",
          background: isDark ? "#1e1e1e" : "#ffffff",
          color: isDark ? "#d4d4d4" : "#1f2328",
        }}
      >
        {view === "upload" && <UploadPage />}
        {(view === "sandbox" || view === "assignment") && <Notebook />}
      </main>
    </div>
  );
}
