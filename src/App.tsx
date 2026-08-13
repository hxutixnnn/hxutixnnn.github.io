import { useEffect, useLayoutEffect, useRef } from "react";
import { Dock } from "./components/Dock";
import { MenuBar } from "./components/MenuBar";
import { defaultDesktopApp, desktopApps, type DesktopAppDescriptor } from "./desktop/apps";
import { useDesktopAppController } from "./desktop/useDesktopAppController";
import { useWorkspaceGeometry } from "./windows/useWorkspaceGeometry";

type AppProps = {
  desktopAssetsReady?: Promise<void>;
  onDesktopReady?: () => void;
  apps?: readonly DesktopAppDescriptor[];
  defaultApp?: DesktopAppDescriptor;
};

export function App({
  desktopAssetsReady,
  onDesktopReady,
  apps = desktopApps,
  defaultApp = defaultDesktopApp,
}: AppProps = {}) {
  const { controllers, frontmostAppId, dispatch, desktopPointer, effectsConsumed } = useDesktopAppController(
    apps,
    defaultApp.id,
  );
  const menuBarRef = useRef<HTMLElement>(null);
  const dockSurfaceRef = useRef<HTMLElement>(null);
  const dockItemRefs = useRef(new Map<string, HTMLButtonElement>());
  const { workspace, getDockTargetRect } = useWorkspaceGeometry({
    menuBarRef,
    dockSurfaceRef,
    dockItemRefs,
  });
  useEffect(() => {
    const classifyDesktopPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-desktop-activity]")) {
        const appId = target.closest("[data-desktop-activity]")?.getAttribute("data-desktop-activity");
        if (appId && !controllers[appId]) return;
        const resolvedAppId = appId || Object.entries(controllers).find(([, value]) => value.window.active)?.[0];
        if (resolvedAppId) dispatch(resolvedAppId, { type: "WINDOW_INTERACTION" }, true);
        return;
      }
      if (target.closest("[data-dock-surface],[data-menu-bar-surface]")) return;
      desktopPointer();
    };
    document.addEventListener("pointerdown", classifyDesktopPointer, true);
    return () => document.removeEventListener("pointerdown", classifyDesktopPointer, true);
  }, [controllers, desktopPointer, dispatch]);

  useLayoutEffect(() => {
    if (!onDesktopReady) return;

    let cancelled = false;
    let frame = 0;
    const releaseDesktop = () => {
      if (cancelled) return;
      frame = window.requestAnimationFrame(onDesktopReady);
    };
    // Asset failures use the static CSS fallback and must never strand the startup cover.
    void Promise.resolve(desktopAssetsReady).then(releaseDesktop, releaseDesktop);
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
        className="tienos-wallpaper pointer-events-none absolute inset-0 [transform:scale(1.02)] bg-[image:var(--tienos-wallpaper)] bg-cover bg-center saturate-[1.08]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.35)_0%,rgb(0_0_0/0.08)_28%,rgb(0_0_0/0.24)_100%),radial-gradient(circle_at_center,transparent_34%,rgb(0_0_0/0.28)_100%)]"
        aria-hidden="true"
      />
      <MenuBar
        surfaceRef={menuBarRef}
        onAction={(command) => {
          if (command.type === "activate-app" && controllers[command.appId])
            dispatch(command.appId, { type: "ACTIVATE_FROM_MENU" }, true);
        }}
      />
      {apps.map((app) => {
        const controller = controllers[app.id];
        if (controller.window.presence !== "open") return null;
        const AppWindow = app.Window;
        return (
          <AppWindow
            key={app.id}
            appId={app.id}
            frontmost={app.id === frontmostAppId}
            windowState={controller.window}
            effects={controller.pendingEffects}
            onEffectsConsumed={() => effectsConsumed(app.id, controller.pendingEffects.length)}
            onEvent={(event) => dispatch(app.id, event, event.type === "WINDOW_INTERACTION")}
            workspace={workspace}
            dockTargetRectProvider={() => getDockTargetRect(app.id)}
          />
        );
      })}
      <Dock
        apps={apps}
        surfaceRef={dockSurfaceRef}
        targetRef={(appId, element) => {
          if (element) dockItemRefs.current.set(appId, element);
          else dockItemRefs.current.delete(appId);
        }}
        windowStates={Object.fromEntries(
          Object.entries(controllers).map(([id, controller]) => [id, controller.window]),
        )}
        onActivate={(app) => dispatch(app.id, { type: "ACTIVATE_FROM_DOCK" }, true)}
      />
    </main>
  );
}
