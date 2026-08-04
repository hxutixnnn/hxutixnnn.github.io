import { appManifests } from "@/apps/manifests";
import type { CoreAppId } from "@/apps/contract";

export type WindowId = `window-${number}`;
export type Rect = { x: number; y: number; width: number; height: number };
export type Viewport = { width: number; height: number };
export type ViewportMode = "desktop" | "mobile";
export type WindowStatus = "open" | "minimized" | "maximized";

export type WindowState = {
  id: WindowId;
  appId: CoreAppId;
  status: WindowStatus;
  rect: Rect;
  restoreRect?: Rect;
  z: number;
};

export type DesktopState = {
  schemaVersion: 1;
  windows: readonly WindowState[];
  focusedWindowId: WindowId | null;
  selectedAppId: CoreAppId | null;
  nextWindowId: number;
  nextZ: number;
  viewportMode: ViewportMode;
};

export type DesktopAction =
  | { type: "open"; appId: CoreAppId; viewport: Viewport }
  | { type: "close"; id: WindowId }
  | { type: "focus"; id: WindowId }
  | { type: "minimize"; id: WindowId }
  | { type: "restore"; id: WindowId }
  | { type: "toggleMaximize"; id: WindowId; viewport: Viewport }
  | { type: "snap"; id: WindowId; position: "left" | "right"; viewport: Viewport }
  | { type: "move"; id: WindowId; x: number; y: number; viewport: Viewport }
  | { type: "resize"; id: WindowId; rect: Rect; viewport: Viewport }
  | { type: "viewportChanged"; mode: ViewportMode; viewport: Viewport }
  | { type: "selectRoute"; appId: CoreAppId | null; viewport: Viewport };

export const initialDesktopState: DesktopState = {
  schemaVersion: 1,
  windows: [],
  focusedWindowId: null,
  selectedAppId: null,
  nextWindowId: 1,
  nextZ: 1,
  viewportMode: "desktop",
};

const DESKTOP_MARGIN = 12;
const TITLE_VISIBLE = 72;

function nextFocusable(windows: readonly WindowState[], excluding?: WindowId): WindowState | undefined {
  return windows
    .filter((window) => window.id !== excluding && window.status !== "minimized")
    .sort((a, b) => b.z - a.z || b.id.localeCompare(a.id))[0];
}

export function clampRect(rect: Rect, viewport: Viewport, appId: CoreAppId): Rect {
  const minimum = appManifests[appId].min;
  const maxWidth = Math.max(1, viewport.width - DESKTOP_MARGIN * 2);
  const maxHeight = Math.max(1, viewport.height - DESKTOP_MARGIN * 2);
  const width = Math.min(Math.max(rect.width, Math.min(minimum.width, maxWidth)), maxWidth);
  const height = Math.min(Math.max(rect.height, Math.min(minimum.height, maxHeight)), maxHeight);
  const maxX = Math.max(DESKTOP_MARGIN, viewport.width - TITLE_VISIBLE);
  const maxY = Math.max(DESKTOP_MARGIN, viewport.height - TITLE_VISIBLE);
  const x = Math.min(Math.max(rect.x, DESKTOP_MARGIN - width + TITLE_VISIBLE), maxX);
  const y = Math.min(Math.max(rect.y, DESKTOP_MARGIN), maxY);
  return { x, y, width, height };
}

function initialRect(appId: CoreAppId, viewport: Viewport, sequence: number): Rect {
  const size = appManifests[appId].initial;
  const cascade = ((sequence - 1) % 5) * 24;
  return clampRect(
    {
      x: Math.round((viewport.width - size.width) / 2 + cascade),
      y: Math.round((viewport.height - size.height) / 2 + cascade * 0.55),
      ...size,
    },
    viewport,
    appId,
  );
}

function focusWindow(state: DesktopState, id: WindowId): DesktopState {
  const target = state.windows.find((window) => window.id === id);
  if (!target || target.status === "minimized") return state;
  return {
    ...state,
    focusedWindowId: id,
    selectedAppId: target.appId,
    nextZ: state.nextZ + 1,
    windows: state.windows.map((window) => (window.id === id ? { ...window, z: state.nextZ } : window)),
  };
}

function openApp(state: DesktopState, appId: CoreAppId, viewport: Viewport): DesktopState {
  const existing = state.windows.find((window) => window.appId === appId);
  if (existing) {
    const restored =
      existing.status === "minimized"
        ? {
            ...state,
            windows: state.windows.map((window) =>
              window.id === existing.id ? { ...window, status: "open" as const } : window,
            ),
          }
        : state;
    return focusWindow(restored, existing.id);
  }

  const id: WindowId = `window-${state.nextWindowId}`;
  const window: WindowState = {
    id,
    appId,
    status: "open",
    rect: initialRect(appId, viewport, state.nextWindowId),
    z: state.nextZ,
  };
  return {
    ...state,
    windows: [...state.windows, window],
    focusedWindowId: id,
    selectedAppId: appId,
    nextWindowId: state.nextWindowId + 1,
    nextZ: state.nextZ + 1,
  };
}

export function desktopReducer(state: DesktopState, action: DesktopAction): DesktopState {
  switch (action.type) {
    case "open":
      return openApp(state, action.appId, action.viewport);
    case "selectRoute":
      return action.appId ? openApp(state, action.appId, action.viewport) : { ...state, selectedAppId: null };
    case "focus":
      return focusWindow(state, action.id);
    case "close": {
      if (!state.windows.some((window) => window.id === action.id)) return state;
      const windows = state.windows.filter((window) => window.id !== action.id);
      const successor = nextFocusable(windows);
      return {
        ...state,
        windows,
        focusedWindowId: successor?.id ?? null,
        selectedAppId: successor?.appId ?? null,
      };
    }
    case "minimize": {
      const target = state.windows.find((window) => window.id === action.id);
      if (!target || target.status === "minimized") return state;
      const windows = state.windows.map((window) =>
        window.id === action.id ? { ...window, status: "minimized" as const } : window,
      );
      const successor = nextFocusable(windows, action.id);
      return {
        ...state,
        windows,
        focusedWindowId: successor?.id ?? null,
        selectedAppId: successor?.appId ?? null,
      };
    }
    case "restore": {
      const target = state.windows.find((window) => window.id === action.id);
      if (!target) return state;
      const restored = {
        ...state,
        windows: state.windows.map((window) =>
          window.id === action.id
            ? { ...window, status: window.status === "minimized" ? ("open" as const) : window.status }
            : window,
        ),
      };
      return focusWindow(restored, action.id);
    }
    case "toggleMaximize": {
      const target = state.windows.find((window) => window.id === action.id);
      if (!target) return state;
      const nextWindow: WindowState =
        target.status === "maximized"
          ? (() => {
              const { restoreRect, ...rest } = target;
              return { ...rest, status: "open", rect: restoreRect ?? target.rect };
            })()
          : {
              ...target,
              status: "maximized",
              restoreRect: target.rect,
              rect: { x: 0, y: 0, width: action.viewport.width, height: action.viewport.height },
            };
      return focusWindow(
        { ...state, windows: state.windows.map((window) => (window.id === action.id ? nextWindow : window)) },
        action.id,
      );
    }
    case "snap": {
      const target = state.windows.find((window) => window.id === action.id);
      if (!target || target.status === "minimized") return state;
      const half = Math.round(action.viewport.width / 2);
      const rect =
        action.position === "left"
          ? { x: 0, y: 0, width: half, height: action.viewport.height }
          : { x: half, y: 0, width: action.viewport.width - half, height: action.viewport.height };
      const nextWindow: WindowState = {
        id: target.id,
        appId: target.appId,
        z: target.z,
        status: "open",
        rect,
        ...(target.restoreRect === undefined ? {} : { restoreRect: target.restoreRect }),
      };
      return focusWindow(
        { ...state, windows: state.windows.map((window) => (window.id === action.id ? nextWindow : window)) },
        action.id,
      );
    }
    case "move":
      return {
        ...state,
        windows: state.windows.map((window) =>
          window.id === action.id && window.status === "open"
            ? {
                ...window,
                rect: clampRect({ ...window.rect, x: action.x, y: action.y }, action.viewport, window.appId),
              }
            : window,
        ),
      };
    case "resize":
      return {
        ...state,
        windows: state.windows.map((window) =>
          window.id === action.id && window.status === "open"
            ? { ...window, rect: clampRect(action.rect, action.viewport, window.appId) }
            : window,
        ),
      };
    case "viewportChanged":
      return {
        ...state,
        viewportMode: action.mode,
        windows:
          action.mode === "mobile"
            ? state.windows
            : state.windows.map((window) => ({
                ...window,
                rect:
                  window.status === "maximized"
                    ? window.rect
                    : clampRect(window.rect, action.viewport, window.appId),
              })),
      };
  }
}

export function selectRunningAppIds(state: DesktopState): readonly CoreAppId[] {
  return [...new Set(state.windows.map((window) => window.appId))];
}

export function selectWindowsByZ(state: DesktopState): readonly WindowState[] {
  return [...state.windows].sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
}

export function selectFocusedWindow(state: DesktopState): WindowState | undefined {
  return state.windows.find((window) => window.id === state.focusedWindowId);
}
