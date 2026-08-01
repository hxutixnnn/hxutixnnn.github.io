import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { appById } from "@/apps/catalog";
import type { CoreAppId, CoreAppProps } from "@/apps/contract";
import { appManifests } from "@/apps/manifests";
import {
  desktopReducer,
  selectFocusedWindow,
  selectRunningAppIds,
  selectWindowsByZ,
} from "../domain/windows";
import type { DesktopState, Viewport, WindowId, WindowState } from "../domain/windows";
import { loadSession, saveSession } from "../store/persistence";
import { DesktopIcons, Launcher, MobileLauncher } from "./Launcher";
import { MenuBar } from "./MenuBar";
import { MobileSwitcher } from "./MobileSwitcher";
import { WindowFrame } from "./WindowFrame";

const lazyApps = Object.fromEntries(
  Object.entries(appManifests).map(([id, manifest]) => [id, lazy(manifest.load)]),
) as Record<CoreAppId, React.LazyExoticComponent<React.ComponentType<CoreAppProps>>>;

function viewportSize(): Viewport {
  return { width: window.innerWidth, height: Math.max(320, window.innerHeight - 160) };
}

function viewportMode(): "mobile" | "desktop" {
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

function appFromPath(): CoreAppId | null {
  const match = window.location.pathname.match(/^\/apps\/([a-z0-9-]+)\/?$/);
  const app = match ? appById.get(match[1] as CoreAppId) : undefined;
  return app?.target?.kind === "core" ? (app.id as CoreAppId) : null;
}

function initialState(initialAppId?: CoreAppId | null): DesktopState {
  const viewport = viewportSize();
  let state = { ...loadSession(viewport), viewportMode: viewportMode() };
  const selected = initialAppId ?? appFromPath();
  if (selected) state = desktopReducer(state, { type: "open", appId: selected, viewport });
  return state;
}

function restoreSwitcherFocus(opener: HTMLElement | null) {
  requestAnimationFrame(() => {
    if (opener?.isConnected) opener.focus();
    else document.querySelector<HTMLButtonElement>("[data-launcher-id]")?.focus();
  });
}

export default function PortfolioShell({ initialAppId = null }: { initialAppId?: CoreAppId | null }) {
  const [state, dispatch] = useReducer(desktopReducer, undefined, () => initialState(initialAppId));
  const [announcement, setAnnouncement] = useState("Tien OS ready");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const frameRefs = useRef(new Map<WindowId, HTMLElement>());
  const switcherOpenerRef = useRef<HTMLElement | null>(null);
  const switcherOpenRef = useRef(switcherOpen);
  const stateRef = useRef(state);
  switcherOpenRef.current = switcherOpen;
  stateRef.current = state;
  const mobile = state.viewportMode === "mobile";
  const orderedWindows = useMemo(() => selectWindowsByZ(state), [state]);
  const focused = selectFocusedWindow(state);
  const running = selectRunningAppIds(state);
  const activeTitle = focused ? (appById.get(focused.appId)?.name ?? "Tien OS") : "Tien OS";
  const activeDocument = focused
    ? (appById.get(focused.appId)?.documentRoute ?? `/apps/${focused.appId}/`)
    : "/about/";

  useEffect(() => {
    document.documentElement.classList.add("os-hydrated");
    return () => document.documentElement.classList.remove("os-hydrated");
  }, []);

  useEffect(() => saveSession(state), [state]);

  useEffect(() => {
    const onResize = () => {
      const mode = viewportMode();
      if (mode === "desktop" && switcherOpenRef.current) {
        setSwitcherOpen(false);
        restoreSwitcherFocus(switcherOpenerRef.current);
      }
      dispatch({ type: "viewportChanged", mode, viewport: viewportSize() });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onPopState = () =>
      dispatch({ type: "selectRoute", appId: appFromPath(), viewport: viewportSize() });
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (switcherOpenRef.current && (key === "w" || key === "m")) {
        event.preventDefault();
        return;
      }
      const focusedWindow = selectFocusedWindow(stateRef.current);
      if (!focusedWindow) return;
      if (key === "w") {
        event.preventDefault();
        closeWindow(focusedWindow);
      } else if (key === "m") {
        event.preventDefault();
        minimizeWindow(focusedWindow);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function track(appId: CoreAppId, action: "app_open" | "app_close") {
    window.dispatchEvent(new CustomEvent("tien:analytics", { detail: { event: action, appId } }));
  }

  function updateRoute(appId: CoreAppId | null, replace = false) {
    const path = appId ? `/apps/${appId}/` : "/";
    if (window.location.pathname === path) return;
    window.history[replace ? "replaceState" : "pushState"]({ appId }, "", path);
  }

  function focusFrame(id: WindowId | null, fallbackApp?: CoreAppId) {
    requestAnimationFrame(() => {
      if (id) frameRefs.current.get(id)?.focus();
      else if (fallbackApp)
        document.querySelector<HTMLButtonElement>(`[data-launcher-id="${fallbackApp}"]`)?.focus();
    });
  }

  function openApp(appId: CoreAppId, replaceRoute = false) {
    const existing = state.windows.find((window) => window.appId === appId);
    dispatch({ type: "open", appId, viewport: viewportSize() });
    updateRoute(appId, replaceRoute);
    setAnnouncement(`${appById.get(appId)?.name} ${existing ? "focused" : "opened"}`);
    if (!existing) track(appId, "app_open");
    const targetId: WindowId = existing?.id ?? `window-${state.nextWindowId}`;
    focusFrame(targetId);
  }

  function successorAfter(id: WindowId): WindowState | undefined {
    return [...state.windows]
      .filter((window) => window.id !== id && window.status !== "minimized")
      .sort((a, b) => b.z - a.z || b.id.localeCompare(a.id))[0];
  }

  function closeWindow(target: WindowState, moveFocus = true) {
    const successor = successorAfter(target.id);
    dispatch({ type: "close", id: target.id });
    updateRoute(successor?.appId ?? null, true);
    setAnnouncement(`${appById.get(target.appId)?.name} closed`);
    track(target.appId, "app_close");
    if (moveFocus) focusFrame(successor?.id ?? null, target.appId);
  }

  function minimizeWindow(target: WindowState) {
    const successor = successorAfter(target.id);
    dispatch({ type: "minimize", id: target.id });
    updateRoute(successor?.appId ?? null, true);
    setAnnouncement(`${appById.get(target.appId)?.name} minimized`);
    focusFrame(successor?.id ?? null, target.appId);
  }

  function focusWindow(target: WindowState) {
    dispatch({ type: "focus", id: target.id });
    updateRoute(target.appId);
  }

  function showSwitcher() {
    switcherOpenerRef.current = document.activeElement as HTMLElement | null;
    setSwitcherOpen(true);
  }

  function dismissSwitcher() {
    setSwitcherOpen(false);
    restoreSwitcherFocus(switcherOpenerRef.current);
  }

  function switchTo(target: WindowState) {
    dispatch({ type: "restore", id: target.id });
    updateRoute(target.appId);
    setSwitcherOpen(false);
    setAnnouncement(`${appById.get(target.appId)?.name} focused`);
    focusFrame(target.id);
  }

  function actOnFocused(action: "close" | "minimize" | "maximize") {
    if (!focused) return;
    if (action === "close") closeWindow(focused);
    else if (action === "minimize") minimizeWindow(focused);
    else {
      dispatch({ type: "toggleMaximize", id: focused.id, viewport: viewportSize() });
      setAnnouncement(`${activeTitle} size changed`);
      focusFrame(focused.id);
    }
  }

  const visibleWindows = mobile
    ? orderedWindows
        .filter((window) => window.appId === state.selectedAppId && window.status !== "minimized")
        .slice(-1)
    : orderedWindows.filter((window) => window.status !== "minimized");

  return (
    <div className={`portfolio-shell${mobile ? " is-mobile" : ""}`}>
      <a className="skip-link" href="#tien-os-main">
        Skip desktop and view portfolio content
      </a>
      <MenuBar
        activeTitle={activeTitle}
        hasActiveWindow={Boolean(focused)}
        onOpenAbout={() => openApp("about")}
        onClose={() => actOnFocused("close")}
        onMinimize={() => actOnFocused("minimize")}
        onMaximize={() => actOnFocused("maximize")}
        documentUrl={activeDocument}
      />

      <div className="os-main" id="tien-os-main">
        {!mobile && (
          <>
            <DesktopIcons onOpen={openApp} />
            {state.windows.length === 0 && (
              <section className="desktop-welcome glass-surface" aria-labelledby="welcome-title">
                <span>TIEN / PERSONAL SYSTEM</span>
                <h1 id="welcome-title">Ideas, work, and notes in one place.</h1>
                <p>
                  Open an app to explore, or choose the document view for a conventional reading experience.
                </p>
                <div>
                  <button type="button" onClick={() => openApp("about")}>
                    Start with About
                  </button>
                  <a href="/blog/">Read the blog</a>
                </div>
              </section>
            )}
          </>
        )}

        {mobile && visibleWindows.length === 0 && <MobileLauncher onOpen={openApp} />}

        <main className="window-layer" aria-label="Open Tien OS windows">
          {visibleWindows.map((windowState) => {
            const manifest = appManifests[windowState.appId];
            const App = lazyApps[windowState.appId];
            return (
              <WindowFrame
                key={windowState.id}
                window={windowState}
                title={manifest.title}
                viewport={viewportSize()}
                mobile={mobile}
                focused={state.focusedWindowId === windowState.id}
                resizable={manifest.resizable}
                registerFrame={(element) => {
                  if (element) frameRefs.current.set(windowState.id, element);
                  else frameRefs.current.delete(windowState.id);
                }}
                onFocus={() => focusWindow(windowState)}
                onClose={() => closeWindow(windowState)}
                onMinimize={() => minimizeWindow(windowState)}
                onToggleMaximize={() =>
                  dispatch({ type: "toggleMaximize", id: windowState.id, viewport: viewportSize() })
                }
                onMove={(x, y) =>
                  dispatch({ type: "move", id: windowState.id, x, y, viewport: viewportSize() })
                }
                onResize={(rect) =>
                  dispatch({ type: "resize", id: windowState.id, rect, viewport: viewportSize() })
                }
              >
                <Suspense
                  fallback={
                    <div className="app-loading" role="status">
                      Opening {manifest.title}…
                    </div>
                  }
                >
                  <App
                    appId={windowState.appId}
                    announce={setAnnouncement}
                    navigate={(url) => window.location.assign(url)}
                    openExternal={(url) => {
                      const opened = window.open(url, "_blank", "noopener,noreferrer");
                      if (opened) opened.opener = null;
                    }}
                  />
                </Suspense>
              </WindowFrame>
            );
          })}
        </main>
      </div>

      <Launcher
        running={running}
        selected={state.selectedAppId}
        mobile={mobile}
        onOpen={openApp}
        onShowSwitcher={showSwitcher}
      />

      {mobile && switcherOpen && (
        <MobileSwitcher
          windows={orderedWindows}
          onSwitch={switchTo}
          onCloseWindow={(target) => closeWindow(target, false)}
          onDismiss={dismissSwitcher}
        />
      )}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
