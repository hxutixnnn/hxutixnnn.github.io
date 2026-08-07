import { useEffect, useLayoutEffect, useState } from "react";
import { MenuBar } from "./components/MenuBar";
import { SystemSettings } from "./components/SystemSettings";
import { useAppearanceStore } from "./stores/appearance";

type AppProps = {
  desktopAssetsReady?: Promise<void>;
  onDesktopReady?: () => void;
};

export function App({ desktopAssetsReady, onDesktopReady }: AppProps = {}) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const syncSystemTheme = useAppearanceStore((state) => state.syncSystemTheme);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
    syncSystemTheme();
    systemPreference.addEventListener("change", syncSystemTheme);
    return () => systemPreference.removeEventListener("change", syncSystemTheme);
  }, [syncSystemTheme]);

  useLayoutEffect(() => {
    if (!onDesktopReady) return;

    let cancelled = false;
    let frame = 0;
    void Promise.resolve(desktopAssetsReady).then(() => {
      if (cancelled) return;
      frame = window.requestAnimationFrame(onDesktopReady);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [desktopAssetsReady, onDesktopReady]);

  return (
    <main aria-label="tienOS desktop" className="tienos-desktop relative min-h-screen overflow-hidden">
      <div className="tienos-wallpaper" aria-hidden="true" />
      <div className="tienos-vignette" aria-hidden="true" />
      <MenuBar onAction={(action) => action === "System Settings…" && setSettingsOpen(true)} />
      {settingsOpen && (
        <>
          <div className="settings-backdrop" aria-hidden="true" />
          <SystemSettings onClose={() => setSettingsOpen(false)} />
        </>
      )}
    </main>
  );
}
