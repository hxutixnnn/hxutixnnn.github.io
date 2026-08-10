import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dock } from "./components/Dock";
import { MenuBar } from "./components/MenuBar";
import { SystemSettings } from "./components/SystemSettings";
import { useSingleWindowController } from "./windows/useSingleWindowController";
import type { WindowEffect } from "./windows/singleWindowMachine";
import { useAppearanceStore } from "./stores/appearance";
import { useWorkspaceGeometry } from "./windows/useWorkspaceGeometry";

type AppProps = {
  desktopAssetsReady?: Promise<void>;
  onDesktopReady?: () => void;
};

export function App({ desktopAssetsReady, onDesktopReady }: AppProps = {}) {
  const [windowEffects, setWindowEffects] = useState<readonly WindowEffect[]>([]);
  const handleWindowEffect = useCallback((effect: WindowEffect) => {
    setWindowEffects((effects) => [...effects, effect]);
  }, []);
  const clearWindowEffects = useCallback(() => setWindowEffects([]), []);
  const { state: windowState, dispatch } = useSingleWindowController({ onEffect: handleWindowEffect });
  const menuBarRef = useRef<HTMLElement>(null);
  const dockSurfaceRef = useRef<HTMLElement>(null);
  const settingsDockItemRef = useRef<HTMLButtonElement>(null);
  const { workspace, getDockTargetRect } = useWorkspaceGeometry({
    menuBarRef,
    dockSurfaceRef,
    settingsDockItemRef,
  });
  const syncSystemTheme = useAppearanceStore((state) => state.syncSystemTheme);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
    syncSystemTheme();
    systemPreference.addEventListener("change", syncSystemTheme);
    return () => systemPreference.removeEventListener("change", syncSystemTheme);
  }, [syncSystemTheme]);

  useEffect(() => {
    const classifyDesktopPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-genie-window],[data-settings-portal]")) {
        dispatch({ type: "WINDOW_INTERACTION" });
        return;
      }
      if (target.closest("[data-dock-surface]")) return;
      dispatch({ type: "DESKTOP_POINTER" });
    };
    document.addEventListener("pointerdown", classifyDesktopPointer, true);
    return () => document.removeEventListener("pointerdown", classifyDesktopPointer, true);
  }, [dispatch]);

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
        surfaceRef={menuBarRef}
        onAction={(command) => {
          if (command === "system-settings") dispatch({ type: "ACTIVATE_FROM_MENU" });
        }}
      />
      {windowState.presence === "open" && (
        <SystemSettings
          windowState={windowState}
          effects={windowEffects}
          onEffectsConsumed={clearWindowEffects}
          onEvent={dispatch}
          workspace={workspace}
          dockTargetRectProvider={getDockTargetRect}
        />
      )}
      <Dock
        surfaceRef={dockSurfaceRef}
        settingsTargetRef={settingsDockItemRef}
        windowState={windowState}
        onActivateSettings={() => dispatch({ type: "ACTIVATE_FROM_DOCK" })}
      />
    </main>
  );
}
