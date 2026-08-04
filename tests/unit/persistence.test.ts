import { describe, expect, it } from "vitest";
import { desktopReducer, initialDesktopState } from "@/os/domain/windows";
import {
  hydrateSession,
  serializeSession,
  SESSION_VERSION,
  defaultOsSettings,
  hydrateSettings,
  loadSettings,
  saveSettings,
} from "@/os/store/persistence";

const viewport = { width: 1000, height: 680 };

describe("window session persistence", () => {
  it("round-trips the versioned serializable model", () => {
    const opened = desktopReducer(initialDesktopState, { type: "open", appId: "blog", viewport });
    const hydrated = hydrateSession(serializeSession(opened), viewport);
    expect(hydrated.windows).toEqual(opened.windows);
    expect(hydrated.focusedWindowId).toBe(opened.focusedWindowId);
    expect(hydrated.schemaVersion).toBe(1);
  });

  it("rejects corrupt and future payloads without throwing", () => {
    expect(hydrateSession("not-json", viewport)).toEqual(initialDesktopState);
    expect(hydrateSession(JSON.stringify({ version: SESSION_VERSION + 1, windows: [] }), viewport)).toEqual(
      initialDesktopState,
    );
  });

  it("drops duplicate and invalid windows and advances identifiers", () => {
    const window = {
      id: "window-8",
      appId: "about",
      status: "open",
      rect: { x: 50, y: 50, width: 500, height: 400 },
      z: 9,
    };
    const hydrated = hydrateSession(
      JSON.stringify({
        version: 1,
        windows: [window, window, { ...window, id: "bad" }],
        focusedWindowId: "window-8",
        nextWindowId: 1,
        nextZ: 1,
      }),
      viewport,
    );
    expect(hydrated.windows).toHaveLength(1);
    expect(hydrated.nextWindowId).toBe(9);
    expect(hydrated.nextZ).toBe(10);
  });
});

describe("desktop settings persistence", () => {
  it("returns defaults for empty, corrupt, and out-of-range payloads", () => {
    expect(hydrateSettings(null)).toEqual(defaultOsSettings);
    expect(hydrateSettings("not-json")).toEqual(defaultOsSettings);
    expect(hydrateSettings(JSON.stringify({ brightness: 3, volume: -2 }))).toEqual(defaultOsSettings);
    const clamped = hydrateSettings(JSON.stringify({ ...defaultOsSettings, brightness: 3, volume: -2 }));
    expect(clamped.brightness).toBe(1);
    expect(clamped.volume).toBe(0);
  });

  it("round-trips settings through storage", () => {
    const custom = { ...defaultOsSettings, brightness: 0.5, wifi: false, appearance: "light" as const };
    saveSettings(custom);
    expect(loadSettings()).toEqual(custom);
    window.localStorage.clear();
    expect(loadSettings()).toEqual(defaultOsSettings);
  });
});
