import { lazy, Suspense, useState } from "react";
import { MenuBar } from "./components/MenuBar";

const SystemSettings = lazy(() =>
  import("./components/SystemSettings").then(({ SystemSettings }) => ({ default: SystemSettings })),
);

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main
      aria-label="tienOS desktop"
      className="relative min-h-screen overflow-hidden bg-slate-950 text-white"
    >
      <div className="tienos-wallpaper" aria-hidden="true" />
      <div className="tienos-vignette" aria-hidden="true" />
      <MenuBar onAction={(action) => action === "System Settings…" && setSettingsOpen(true)} />
      {settingsOpen && (
        <>
          <div className="settings-backdrop" aria-hidden="true" />
          <Suspense fallback={null}>
            <SystemSettings onClose={() => setSettingsOpen(false)} />
          </Suspense>
        </>
      )}
    </main>
  );
}
