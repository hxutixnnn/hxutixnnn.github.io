import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { CoreAppId } from "@/apps/contract";
import {
  clampRect,
  desktopReducer,
  initialDesktopState,
  selectFocusedWindow,
  selectRunningAppIds,
  selectWindowsByZ,
} from "@/os/domain/windows";

const viewport = { width: 1200, height: 720 };
const apps: CoreAppId[] = ["about", "projects", "blog", "uses", "resources", "til"];

function open(state = initialDesktopState, appId: CoreAppId = "about") {
  return desktopReducer(state, { type: "open", appId, viewport });
}

describe("desktopReducer", () => {
  it("opens unique singleton windows and focuses an existing app", () => {
    const first = open();
    const second = open(first);
    expect(second.windows).toHaveLength(1);
    expect(second.windows[0]?.id).toBe("window-1");
    expect(second.focusedWindowId).toBe("window-1");
    expect(second.nextWindowId).toBe(2);
    expect(second.windows[0]?.z).toBeGreaterThan(first.windows[0]?.z ?? 0);
  });

  it("chooses the highest remaining z-order deterministically after close", () => {
    let state = open(initialDesktopState, "about");
    state = open(state, "blog");
    state = open(state, "uses");
    const uses = selectFocusedWindow(state)!;
    state = desktopReducer(state, { type: "focus", id: "window-1" });
    state = desktopReducer(state, { type: "close", id: "window-1" });
    expect(state.focusedWindowId).toBe(uses.id);
    expect(state.selectedAppId).toBe("uses");
  });

  it("minimizes, restores, maximizes, and returns to the exact restore rectangle", () => {
    let state = open();
    const id = state.windows[0]!.id;
    const original = state.windows[0]!.rect;
    state = desktopReducer(state, { type: "minimize", id });
    expect(state.windows[0]?.status).toBe("minimized");
    expect(state.focusedWindowId).toBeNull();
    state = desktopReducer(state, { type: "restore", id });
    expect(state.windows[0]?.status).toBe("open");
    state = desktopReducer(state, { type: "toggleMaximize", id, viewport });
    expect(state.windows[0]).toMatchObject({
      status: "maximized",
      rect: { x: 0, y: 0, ...viewport },
      restoreRect: original,
    });
    state = desktopReducer(state, { type: "toggleMaximize", id, viewport });
    expect(state.windows[0]).toMatchObject({ status: "open", rect: original });
  });

  it("constrains move and resize while leaving mobile coordinates untouched", () => {
    let state = open();
    const id = state.windows[0]!.id;
    state = desktopReducer(state, { type: "move", id, x: 9000, y: -400, viewport });
    expect(state.windows[0]!.rect.x).toBeLessThanOrEqual(viewport.width - 72);
    expect(state.windows[0]!.rect.y).toBeGreaterThanOrEqual(12);
    state = desktopReducer(state, {
      type: "resize",
      id,
      rect: { x: -900, y: 4, width: 9000, height: 10 },
      viewport,
    });
    expect(state.windows[0]!.rect.width).toBeLessThanOrEqual(viewport.width - 24);
    expect(state.windows[0]!.rect.height).toBeGreaterThanOrEqual(280);
    const beforeMobile = state.windows[0]!.rect;
    state = desktopReducer(state, {
      type: "viewportChanged",
      mode: "mobile",
      viewport: { width: 320, height: 500 },
    });
    expect(state.windows[0]!.rect).toEqual(beforeMobile);
  });

  it("backs the selected app with route actions", () => {
    const state = desktopReducer(initialDesktopState, { type: "selectRoute", appId: "resources", viewport });
    expect(state.selectedAppId).toBe("resources");
    expect(state.windows[0]?.appId).toBe("resources");
    expect(desktopReducer(state, { type: "selectRoute", appId: null, viewport }).selectedAppId).toBeNull();
  });

  it("derives running apps and sorted windows instead of duplicating state maps", () => {
    let state = open(initialDesktopState, "blog");
    state = open(state, "about");
    expect(selectRunningAppIds(state)).toEqual(["blog", "about"]);
    expect(selectWindowsByZ(state).map((window) => window.appId)).toEqual(["blog", "about"]);
  });

  it("keeps IDs unique, rectangles finite, and one window per app under random opens", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...apps), { minLength: 1, maxLength: 40 }), (sequence) => {
        const state = sequence.reduce((current, appId) => open(current, appId), initialDesktopState);
        expect(new Set(state.windows.map((window) => window.id)).size).toBe(state.windows.length);
        expect(new Set(state.windows.map((window) => window.appId)).size).toBe(state.windows.length);
        for (const window of state.windows) {
          expect(Object.values(window.rect).every(Number.isFinite)).toBe(true);
          expect(window.rect).toEqual(clampRect(window.rect, viewport, window.appId));
        }
      }),
    );
  });
});
