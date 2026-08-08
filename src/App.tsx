import { useEffect, useLayoutEffect, useState } from "react";
import { Dock } from "./components/Dock";
import { MenuBar } from "./components/MenuBar";
import { SystemSettings, type WindowVisibility } from "./components/SystemSettings";
import { useAppearanceStore } from "./stores/appearance";

type AppProps = {
  desktopAssetsReady?: Promise<void>;
  onDesktopReady?: () => void;
};

export function App({ desktopAssetsReady, onDesktopReady }: AppProps = {}) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [settingsMinimized, setSettingsMinimized] = useState(false);
  const [settingsActive, setSettingsActive] = useState(true);
  const [settingsVisibility, setSettingsVisibility] = useState<WindowVisibility>("visible");
  const [settingsFocusRequest, setSettingsFocusRequest] = useState(0);
  const [settingsMinimizeRequest, setSettingsMinimizeRequest] = useState(0);
  const syncSystemTheme = useAppearanceStore((state) => state.syncSystemTheme);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
    syncSystemTheme();
    systemPreference.addEventListener("change", syncSystemTheme);
    return () => systemPreference.removeEventListener("change", syncSystemTheme);
  }, [syncSystemTheme]);

  useEffect(() => {
    const deactivateForDesktopPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-genie-window],[data-dock-surface]")) return;
      setSettingsActive(false);
    };
    document.addEventListener("pointerdown", deactivateForDesktopPointer, true);
    return () => document.removeEventListener("pointerdown", deactivateForDesktopPointer, true);
  }, []);

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
        className="tienos-wallpaper pointer-events-none absolute inset-0 [transform:scale(1.02)] bg-[image:var(--tienos-wallpaper)] bg-cover bg-center saturate-[1.08] motion-safe:animate-[tienos-drift_24s_ease-in-out_infinite_alternate]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.35)_0%,rgb(0_0_0/0.08)_28%,rgb(0_0_0/0.24)_100%),radial-gradient(circle_at_center,transparent_34%,rgb(0_0_0/0.28)_100%)]"
        aria-hidden="true"
      />
      <MenuBar
        onAction={(action) => {
          if (action !== "System Settings…") return;
          setSettingsOpen(true);
          setSettingsMinimized(false);
          setSettingsActive(true);
          setSettingsFocusRequest((request) => request + 1);
        }}
      />
      {settingsOpen && (
        <>
          {!settingsMinimized && (
            <div
              className="fixed inset-0 z-20 bg-[var(--tienos-color-scrim)] backdrop-blur-[2px] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none"
              aria-hidden="true"
            />
          )}
          <SystemSettings
            focusRequest={settingsFocusRequest}
            minimized={settingsMinimized}
            minimizeRequest={settingsMinimizeRequest}
            onMinimizedChange={setSettingsMinimized}
            onVisibilityChange={setSettingsVisibility}
            onActiveChange={setSettingsActive}
            onClose={() => {
              setSettingsOpen(false);
              setSettingsMinimized(false);
              setSettingsActive(false);
              setSettingsVisibility("visible");
            }}
          />
        </>
      )}
      <Dock
        settingsOpen={settingsOpen}
        settingsMinimized={settingsMinimized}
        onActivateSettings={() => {
          if (!settingsOpen) {
            setSettingsOpen(true);
            setSettingsMinimized(false);
            setSettingsActive(true);
            setSettingsFocusRequest((request) => request + 1);
            return;
          }
          if (settingsVisibility === "minimizing") {
            setSettingsFocusRequest((request) => request + 1);
            return;
          }
          if (settingsMinimized || settingsVisibility === "minimized") {
            setSettingsMinimized(false);
            setSettingsActive(true);
            setSettingsFocusRequest((request) => request + 1);
            return;
          }
          if (settingsVisibility === "restoring") return;
          if (settingsActive) {
            setSettingsMinimizeRequest((request) => request + 1);
            return;
          }
          setSettingsActive(true);
          setSettingsFocusRequest((request) => request + 1);
        }}
      />
    </main>
  );
}
