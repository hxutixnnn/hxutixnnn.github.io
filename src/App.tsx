import { useEffect, useLayoutEffect, useState } from "react";
import { Dock } from "./components/Dock";
import { MenuBar } from "./components/MenuBar";
import { SystemSettings } from "./components/SystemSettings";
import { useAppearanceStore } from "./stores/appearance";

type AppProps = {
  desktopAssetsReady?: Promise<void>;
  onDesktopReady?: () => void;
};

export function App({ desktopAssetsReady, onDesktopReady }: AppProps = {}) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [settingsFocusRequest, setSettingsFocusRequest] = useState(0);
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
    <main
      aria-label="tienOS desktop"
      className="relative min-h-screen overflow-hidden bg-[#07121d] text-white [[data-theme=light]_&]:bg-[#dbeafe] [[data-theme=light]_&]:text-[#0f172a]"
    >
      <div
        className="tienos-wallpaper pointer-events-none absolute inset-0 [transform:scale(1.02)] bg-[url(/wallpapers/tienos-default.jpg)] bg-cover bg-center saturate-[1.08] motion-safe:animate-[tienos-drift_24s_ease-in-out_infinite_alternate]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.35)_0%,rgb(0_0_0/0.08)_28%,rgb(0_0_0/0.24)_100%),radial-gradient(circle_at_center,transparent_34%,rgb(0_0_0/0.28)_100%)]"
        aria-hidden="true"
      />
      <MenuBar onAction={(action) => action === "System Settings…" && setSettingsOpen(true)} />
      {settingsOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-[var(--tienos-color-scrim)] backdrop-blur-[2px] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none"
            aria-hidden="true"
          />
          <SystemSettings focusRequest={settingsFocusRequest} onClose={() => setSettingsOpen(false)} />
        </>
      )}
      <Dock
        settingsOpen={settingsOpen}
        onActivateSettings={() => {
          if (!settingsOpen) setSettingsOpen(true);
          setSettingsFocusRequest((request) => request + 1);
        }}
      />
    </main>
  );
}
