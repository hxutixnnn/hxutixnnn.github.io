import type { AppId } from "@/apps/contract";
import { getAppWindowManifest } from "@/apps/manifests";
import { clampRect, initialDesktopState } from "../domain/windows";
import type { DesktopState, Rect, Viewport, WindowId, WindowState } from "../domain/windows";

export const SESSION_KEY = "tien-os:session";
export const SESSION_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWindowAppId(value: unknown): value is AppId {
  return typeof value === "string" && Boolean(getAppWindowManifest(value));
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
  if (!isRecord(value) || !isWindowAppId(value.appId) || !isRect(value.rect)) return undefined;
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

export type OsSettings = {
  brightness: number;
  volume: number;
  wifi: boolean;
  bluetooth: boolean;
  airdrop: boolean;
  focus: boolean;
  appearance: "dark" | "light";
};

export const SETTINGS_KEY = "tien-os:settings";
export const SETTINGS_VERSION = 1;

export const defaultOsSettings: OsSettings = {
  brightness: 1,
  volume: 0.6,
  wifi: true,
  bluetooth: false,
  airdrop: true,
  focus: false,
  appearance: "dark",
};

function isOsSettings(value: unknown): value is OsSettings {
  if (!isRecord(value)) return false;
  return (
    value.version === SETTINGS_VERSION &&
    typeof value.brightness === "number" &&
    Number.isFinite(value.brightness) &&
    typeof value.volume === "number" &&
    Number.isFinite(value.volume) &&
    typeof value.wifi === "boolean" &&
    typeof value.bluetooth === "boolean" &&
    typeof value.airdrop === "boolean" &&
    typeof value.focus === "boolean" &&
    (value.appearance === "dark" || value.appearance === "light")
  );
}

function clampLevel(level: number): number {
  return Math.min(1, Math.max(0, level));
}

export function hydrateSettings(raw: string | null): OsSettings {
  if (!raw) return defaultOsSettings;
  try {
    const payload: unknown = JSON.parse(raw);
    if (!isOsSettings(payload)) return defaultOsSettings;
    return {
      brightness: clampLevel(payload.brightness),
      volume: clampLevel(payload.volume),
      wifi: payload.wifi,
      bluetooth: payload.bluetooth,
      airdrop: payload.airdrop,
      focus: payload.focus,
      appearance: payload.appearance,
    };
  } catch {
    return defaultOsSettings;
  }
}

export function loadSettings(): OsSettings {
  try {
    return hydrateSettings(window.localStorage.getItem(SETTINGS_KEY));
  } catch {
    return defaultOsSettings;
  }
}

export function saveSettings(settings: OsSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: SETTINGS_VERSION, ...settings }));
  } catch {
    // Storage is optional; private modes and disabled storage must not break navigation.
  }
}
