import type { CoreAppId } from "@/apps/contract";
import { appManifests } from "@/apps/manifests";
import { clampRect, initialDesktopState } from "../domain/windows";
import type { DesktopState, Rect, Viewport, WindowId, WindowState } from "../domain/windows";

export const SESSION_KEY = "tien-os:session";
export const SESSION_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCoreAppId(value: unknown): value is CoreAppId {
  return typeof value === "string" && Object.hasOwn(appManifests, value);
}

function isRect(value: unknown): value is Rect {
  return (
    isRecord(value) &&
    [value.x, value.y, value.width, value.height].every(
      (part) => typeof part === "number" && Number.isFinite(part),
    )
  );
}

function parseWindow(value: unknown, viewport: Viewport): WindowState | undefined {
  if (!isRecord(value) || !isCoreAppId(value.appId) || !isRect(value.rect)) return undefined;
  if (typeof value.id !== "string" || !/^window-\d+$/.test(value.id)) return undefined;
  if (value.status !== "open" && value.status !== "minimized" && value.status !== "maximized")
    return undefined;
  if (typeof value.z !== "number" || !Number.isFinite(value.z)) return undefined;
  const restoreRect = isRect(value.restoreRect)
    ? clampRect(value.restoreRect, viewport, value.appId)
    : undefined;
  return {
    id: value.id as WindowId,
    appId: value.appId,
    status: value.status,
    rect: clampRect(value.rect, viewport, value.appId),
    ...(restoreRect ? { restoreRect } : {}),
    z: value.z,
  };
}

export function serializeSession(state: DesktopState): string {
  return JSON.stringify({
    version: SESSION_VERSION,
    windows: state.windows,
    focusedWindowId: state.focusedWindowId,
    selectedAppId: state.selectedAppId,
    nextWindowId: state.nextWindowId,
    nextZ: state.nextZ,
  });
}

export function hydrateSession(raw: string | null, viewport: Viewport): DesktopState {
  if (!raw) return initialDesktopState;
  try {
    const payload: unknown = JSON.parse(raw);
    if (!isRecord(payload) || payload.version !== SESSION_VERSION || !Array.isArray(payload.windows)) {
      return initialDesktopState;
    }
    const seen = new Set<string>();
    const windows: WindowState[] = [];
    for (const value of payload.windows) {
      const parsed = parseWindow(value, viewport);
      if (parsed && !seen.has(parsed.id)) {
        seen.add(parsed.id);
        windows.push(parsed);
      }
    }
    const focusedWindowId =
      typeof payload.focusedWindowId === "string" &&
      windows.some((window) => window.id === payload.focusedWindowId)
        ? (payload.focusedWindowId as WindowId)
        : null;
    const focusedWindow = windows.find(
      (window) => window.id === focusedWindowId && window.status !== "minimized",
    );
    const maxId = windows.reduce((max, window) => Math.max(max, Number(window.id.split("-")[1])), 0);
    const maxZ = windows.reduce((max, window) => Math.max(max, window.z), 0);
    return {
      schemaVersion: 1,
      windows,
      focusedWindowId: focusedWindow?.id ?? null,
      selectedAppId: focusedWindow?.appId ?? null,
      nextWindowId: Math.max(maxId + 1, typeof payload.nextWindowId === "number" ? payload.nextWindowId : 1),
      nextZ: Math.max(maxZ + 1, typeof payload.nextZ === "number" ? payload.nextZ : 1),
      viewportMode: "desktop",
    };
  } catch {
    return initialDesktopState;
  }
}

export function loadSession(viewport: Viewport): DesktopState {
  try {
    return hydrateSession(window.localStorage.getItem(SESSION_KEY), viewport);
  } catch {
    return initialDesktopState;
  }
}

export function saveSession(state: DesktopState): void {
  try {
    window.localStorage.setItem(SESSION_KEY, serializeSession(state));
  } catch {
    // Storage is optional; private modes and disabled storage must not break navigation.
  }
}
