import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const settingsOpenRef = useRef(true);
  const [settingsMinimized, setSettingsMinimized] = useState(false);
  const [settingsActive, setSettingsActive] = useState(true);
  const settingsVisibilityRef = useRef<WindowVisibility>("visible");
  const [settingsFocusRequest, setSettingsFocusRequest] = useState(0);
  const lifecycleGenerationRef = useRef(0);
  const [settingsLifecycleGeneration, setSettingsLifecycleGeneration] = useState(0);
  const lifecycleRequestIdRef = useRef(0);
  const [settingsLifecycleRequest, setSettingsLifecycleRequest] = useState<{
    generation: number;
    id: number;
    action: "minimize" | "restore";
  } | null>(null);
  const syncSystemTheme = useAppearanceStore((state) => state.syncSystemTheme);
  const handleSettingsVisibilityChange = useCallback((visibility: WindowVisibility) => {
    settingsVisibilityRef.current = visibility;
  }, []);
  const openFreshSettings = useCallback(() => {
    const generation = ++lifecycleGenerationRef.current;
    settingsOpenRef.current = true;
    settingsVisibilityRef.current = "visible";
    setSettingsLifecycleGeneration(generation);
    setSettingsLifecycleRequest(null);
    setSettingsOpen(true);
    setSettingsMinimized(false);
    setSettingsActive(true);
    setSettingsFocusRequest((request) => request + 1);
  }, []);

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
      if (target.closest("[data-genie-window],[data-settings-portal]")) {
        setSettingsActive(true);
        return;
      }
      if (target.closest("[data-dock-surface]")) return;
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
          if (!settingsOpenRef.current) {
            openFreshSettings();
            return;
          }
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
            key={settingsLifecycleGeneration}
            lifecycleGeneration={settingsLifecycleGeneration}
            focusRequest={settingsFocusRequest}
            minimized={settingsMinimized}
            lifecycleRequest={settingsLifecycleRequest}
            onMinimizedChange={(minimized) => {
              if (lifecycleGenerationRef.current !== settingsLifecycleGeneration) return;
              setSettingsMinimized(minimized);
            }}
            onVisibilityChange={(visibility) => {
              if (lifecycleGenerationRef.current !== settingsLifecycleGeneration) return;
              handleSettingsVisibilityChange(visibility);
            }}
            onActiveChange={(active) => {
              if (lifecycleGenerationRef.current !== settingsLifecycleGeneration) return;
              setSettingsActive(active);
            }}
            onClose={() => {
              if (lifecycleGenerationRef.current !== settingsLifecycleGeneration) return;
              lifecycleGenerationRef.current += 1;
              settingsOpenRef.current = false;
              setSettingsLifecycleRequest(null);
              setSettingsOpen(false);
              setSettingsMinimized(false);
              setSettingsActive(false);
              settingsVisibilityRef.current = "visible";
            }}
          />
        </>
      )}
      <Dock
        settingsOpen={settingsOpen}
        settingsMinimized={settingsMinimized}
        onActivateSettings={() => {
          const settingsVisibility = settingsVisibilityRef.current;
          if (!settingsOpenRef.current) {
            openFreshSettings();
            return;
          }
          if (settingsVisibility === "minimizing") {
            settingsVisibilityRef.current = "restoring";
            setSettingsLifecycleRequest({
              generation: lifecycleGenerationRef.current,
              id: ++lifecycleRequestIdRef.current,
              action: "restore",
            });
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
            settingsVisibilityRef.current = "minimizing";
            setSettingsLifecycleRequest({
              generation: lifecycleGenerationRef.current,
              id: ++lifecycleRequestIdRef.current,
              action: "minimize",
            });
            return;
          }
          setSettingsActive(true);
          setSettingsFocusRequest((request) => request + 1);
        }}
      />
    </main>
  );
}
