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
import { Dock, MobileDockBar, MobileLauncher } from "./Launcher";
import { MenuBar } from "./MenuBar";
import { MobileSwitcher } from "./MobileSwitcher";
import { Spotlight } from "./Spotlight";
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
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [bounceToken, setBounceToken] = useState<string | null>(null);
  const [minimizingWindowIds, setMinimizingWindowIds] = useState<ReadonlySet<WindowId>>(new Set());
  const frameRefs = useRef(new Map<WindowId, HTMLElement>());
  const minimizeTimers = useRef(new Map<WindowId, ReturnType<typeof globalThis.setTimeout>>());
  const switcherOpenerRef = useRef<HTMLElement | null>(null);
  const switcherOpenRef = useRef(switcherOpen);
  const spotlightOpenRef = useRef(spotlightOpen);
  const bounceTimer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const bounceSequence = useRef(0);
  const stateRef = useRef(state);
  const mobile = state.viewportMode === "mobile";
  const orderedWindows = useMemo(() => selectWindowsByZ(state), [state]);
  const focused = selectFocusedWindow(state);
  const running = selectRunningAppIds(state);
  const minimizedWindows = orderedWindows.filter((window) => window.status === "minimized");
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
    switcherOpenRef.current = switcherOpen;
  }, [switcherOpen]);

  useEffect(() => {
    spotlightOpenRef.current = spotlightOpen;
  }, [spotlightOpen]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(
    () => () => {
      for (const timer of minimizeTimers.current.values()) globalThis.clearTimeout(timer);
    },
    [],
  );

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

  function bounceApp(appId: CoreAppId) {
    bounceSequence.current += 1;
    const token = `${appId}:${bounceSequence.current}`;
    setBounceToken(token);
    if (bounceTimer.current) globalThis.clearTimeout(bounceTimer.current);
    bounceTimer.current = globalThis.setTimeout(() => setBounceToken(null), 1200);
  }

  function openApp(appId: CoreAppId, replaceRoute = false) {
    const existing = state.windows.find((window) => window.appId === appId);
    dispatch({ type: "open", appId, viewport: viewportSize() });
    updateRoute(appId, replaceRoute);
    setAnnouncement(`${appById.get(appId)?.name} ${existing ? "focused" : "opened"}`);
    if (!existing) {
      track(appId, "app_open");
      bounceApp(appId);
    }
    const targetId: WindowId = existing?.id ?? `window-${state.nextWindowId}`;
    focusFrame(targetId);
  }

  function successorAfter(id: WindowId, windows = state.windows): WindowState | undefined {
    return [...windows]
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

  function requestMinimize(target: WindowState) {
    if (!frameRefs.current.has(target.id)) {
      minimizeWindow(target);
      return;
    }
    if (minimizeTimers.current.has(target.id)) return;
    setMinimizingWindowIds((current) => new Set(current).add(target.id));
    minimizeTimers.current.set(
      target.id,
      globalThis.setTimeout(() => completeMinimize(target.id), 300),
    );
  }

  function completeMinimize(id: WindowId) {
    const timer = minimizeTimers.current.get(id);
    if (!timer) return;
    globalThis.clearTimeout(timer);
    minimizeTimers.current.delete(id);
    setMinimizingWindowIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    const target = stateRef.current.windows.find((window) => window.id === id);
    if (target && target.status !== "minimized") minimizeWindow(target);
  }

  function minimizeWindow(target: WindowState) {
    const successor = successorAfter(target.id, stateRef.current.windows);
    dispatch({ type: "minimize", id: target.id });
    updateRoute(successor?.appId ?? null, true);
    setAnnouncement(`${appById.get(target.appId)?.name} minimized`);
    focusFrame(successor?.id ?? null, target.appId);
  }

  function restoreMinimized(id: WindowId) {
    const target = state.windows.find((window) => window.id === id);
    if (!target) return;
    dispatch({ type: "restore", id });
    updateRoute(target.appId);
    setAnnouncement(`${appById.get(target.appId)?.name} restored`);
    focusFrame(id);
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
    else if (action === "minimize") requestMinimize(focused);
    else {
      dispatch({ type: "toggleMaximize", id: focused.id, viewport: viewportSize() });
      setAnnouncement(`${activeTitle} size changed`);
      focusFrame(focused.id);
    }
  }

  function trashFocused() {
    if (focused) {
      closeWindow(focused);
      setAnnouncement(`${appById.get(focused.appId)?.name} moved to Trash`);
    } else {
      setAnnouncement("Trash is empty");
    }
  }

  function openSpotlight() {
    setSpotlightOpen(true);
  }

  function closeSpotlight() {
    setSpotlightOpen(false);
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) {
        document.querySelector<HTMLButtonElement>("[data-spotlight-opener]")?.focus();
      }
    });
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === " ") {
        event.preventDefault();
        setSpotlightOpen((open) => !open);
        return;
      }
      if (spotlightOpenRef.current) return;
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
        requestMinimize(focusedWindow);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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
      <div className="os-scene" aria-hidden="true">
        <span className="os-scene__sky" />
        <span className="os-scene__sun" />
        <span className="os-scene__haze os-scene__haze--far" />
        <svg
          className="os-scene__bridge"
          viewBox="0 0 1440 280"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          <path
            className="os-scene__hill"
            d="M0 118 Q 180 96 360 108 T 720 112 T 1080 106 T 1440 118 V 150 H 0 Z"
          />
          {(() => {
            const cables: React.ReactNode[] = [];
            const suspenders: React.ReactNode[] = [];
            const deckY = 150;
            const cableY = (x: number) => 52 + 64 * ((x - 720) / 357) ** 2;
            for (let x = 384; x <= 690; x += 24) {
              const y = cableY(x);
              suspenders.push(<line key={`sl-${x}`} x1={x} y1={y} x2={x} y2={deckY} />);
            }
            for (let x = 750; x <= 1056; x += 24) {
              const y = cableY(x);
              suspenders.push(<line key={`sr-${x}`} x1={x} y1={y} x2={x} y2={deckY} />);
            }
            cables.push(<path key="cable-main" d="M 363 52 Q 720 116 1077 52" />);
            cables.push(<path key="cable-left" d="M 40 150 Q 200 104 363 52" />);
            cables.push(<path key="cable-right" d="M 1400 150 Q 1240 104 1077 52" />);
            return (
              <g className="os-scene__bridge-line">
                {cables}
                {suspenders}
              </g>
            );
          })()}
          <g className="os-scene__bridge-tower">
            <path d="M 349 52 v 98 h 28 v -98 z" />
            <path d="M 1063 52 v 98 h 28 v -98 z" />
            <path d="M 342 52 h 140 v 10 h -140 z" />
            <path d="M 1056 52 h 140 v 10 h -140 z" />
          </g>
          <path className="os-scene__bridge-deck" d="M 30 150 H 1410" />
          <g className="os-scene__bridge-tower" opacity="0.55">
            <path d="M 331 40 v 110 h 14 v -110 z" />
            <path d="M 1095 40 v 110 h 14 v -110 z" />
          </g>
        </svg>
        <span className="os-scene__haze os-scene__haze--near" />
        <span className="os-scene__sea" />
        <span className="os-scene__shimmer" />
        <span className="os-scene__vignette" />
      </div>

      <MenuBar
        activeTitle={activeTitle}
        hasActiveWindow={Boolean(focused)}
        mobile={mobile}
        onOpenAbout={() => openApp("about")}
        onClose={() => actOnFocused("close")}
        onMinimize={() => actOnFocused("minimize")}
        onMaximize={() => actOnFocused("maximize")}
        documentUrl={activeDocument}
        onOpenSpotlight={openSpotlight}
        announce={setAnnouncement}
      />

      <div className="os-main" id="tien-os-main">
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
                minimizing={minimizingWindowIds.has(windowState.id)}
                resizable={manifest.resizable}
                registerFrame={(element) => {
                  if (element) frameRefs.current.set(windowState.id, element);
                  else frameRefs.current.delete(windowState.id);
                }}
                onFocus={() => focusWindow(windowState)}
                onClose={() => closeWindow(windowState)}
                onRequestMinimize={() => requestMinimize(windowState)}
                onMinimizeAnimationEnd={() => completeMinimize(windowState.id)}
                onToggleMaximize={() =>
                  dispatch({ type: "toggleMaximize", id: windowState.id, viewport: viewportSize() })
                }
                onSnap={(position) =>
                  dispatch({ type: "snap", id: windowState.id, position, viewport: viewportSize() })
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
        {mobile && visibleWindows.length === 0 && <MobileLauncher onOpen={openApp} />}
      </div>

      {mobile ? (
        <MobileDockBar
          running={running}
          selected={state.selectedAppId}
          onOpen={openApp}
          onShowSwitcher={showSwitcher}
        />
      ) : (
        <Dock
          running={running}
          selected={state.selectedAppId}
          minimized={minimizedWindows}
          bounceToken={bounceToken}
          onOpen={openApp}
          onRestoreMinimized={restoreMinimized}
          onTrash={trashFocused}
        />
      )}

      {mobile && switcherOpen && (
        <MobileSwitcher
          windows={orderedWindows}
          onSwitch={switchTo}
          onCloseWindow={(target) => closeWindow(target, false)}
          onDismiss={dismissSwitcher}
        />
      )}

      <Spotlight
        open={spotlightOpen}
        onOpenChange={(open) => (open ? openSpotlight() : closeSpotlight())}
        onOpenApp={openApp}
        onNavigate={(url) => window.location.assign(url)}
        onAnnounce={setAnnouncement}
      />

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
