import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DesktopAppDescriptor } from "./apps";
import { useDesktopAppController } from "./useDesktopAppController";

const EmptyWindow: DesktopAppDescriptor["Window"] = () => null;
const apps: readonly DesktopAppDescriptor[] = [
  { id: "first", name: "First", icon: "gear", Window: EmptyWindow },
  { id: "second", name: "Second", icon: "sparkle", Window: EmptyWindow },
];
const threeApps: readonly DesktopAppDescriptor[] = [
  ...apps,
  { id: "third", name: "Third", icon: "display", Window: EmptyWindow },
];
const fourApps: readonly DesktopAppDescriptor[] = [
  ...threeApps,
  { id: "fourth", name: "Fourth", icon: "circle-info", Window: EmptyWindow },
];

describe("useDesktopAppController", () => {
  it("does not reactivate a background app when restore settles", () => {
    const { result } = renderHook(() => useDesktopAppController(apps, "first"));

    act(() => result.current.dispatch("first", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() =>
      result.current.dispatch("first", {
        type: "TRANSITION_SETTLED",
        generation: 1,
        destination: "minimized",
      }),
    );
    act(() => result.current.dispatch("first", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() =>
      result.current.dispatch("first", {
        type: "TRANSITION_SETTLED",
        generation: 2,
        destination: "visible",
      }),
    );

    expect(result.current.controllers.first.window).toMatchObject({ visibility: "visible", active: false });
    expect(result.current.controllers.second.window.active).toBe(true);
    expect(result.current.controllers.first.pendingEffects.at(-1)?.type).not.toBe("FOCUS");
  });

  it("exclusively reactivates an inactive app while it is restoring", () => {
    const { result } = renderHook(() => useDesktopAppController(apps, "first"));

    act(() => result.current.dispatch("first", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() =>
      result.current.dispatch("first", {
        type: "TRANSITION_SETTLED",
        generation: 1,
        destination: "minimized",
      }),
    );
    act(() => result.current.dispatch("first", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    expect(result.current.controllers.first.window).toMatchObject({ visibility: "restoring", active: false });

    act(() => result.current.dispatch("first", { type: "ACTIVATE_FROM_DOCK" }, true));
    expect(result.current.controllers.first.window).toMatchObject({ visibility: "restoring", active: true });
    expect(result.current.controllers.second.window.active).toBe(false);
    expect(result.current.frontmostAppId).toBe("first");

    act(() =>
      result.current.dispatch("first", {
        type: "TRANSITION_SETTLED",
        generation: 2,
        destination: "visible",
      }),
    );
    expect(result.current.controllers.first.window).toMatchObject({ visibility: "visible", active: true });
    expect(result.current.controllers.first.pendingEffects.at(-1)?.type).toBe("FOCUS");
  });

  it("retains the last frontmost app while the desktop owns activity", () => {
    const { result } = renderHook(() => useDesktopAppController(apps, "first"));

    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    expect(result.current.frontmostAppId).toBe("second");
    act(() => result.current.desktopPointer());

    expect(Object.values(result.current.controllers).every((controller) => !controller.window.active)).toBe(
      true,
    );
    expect(result.current.frontmostAppId).toBe("second");
  });

  it("transfers frontmost activity when the frontmost app closes", () => {
    const { result } = renderHook(() => useDesktopAppController(apps, "first"));

    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("first", { type: "WINDOW_INTERACTION" }, true));
    expect(result.current.frontmostAppId).toBe("first");

    act(() => result.current.dispatch("first", { type: "CLOSE" }));

    expect(result.current.controllers.first.window.presence).toBe("closed");
    expect(result.current.controllers.second.window.active).toBe(true);
    expect(result.current.frontmostAppId).toBe("second");
    expect(result.current.controllers.second.pendingEffects.at(-1)?.type).toBe("FOCUS");
  });

  it("transfers frontmost activity when the frontmost app minimizes", () => {
    const { result } = renderHook(() => useDesktopAppController(apps, "first"));

    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("first", { type: "WINDOW_INTERACTION" }, true));
    expect(result.current.frontmostAppId).toBe("first");

    act(() => result.current.dispatch("first", { type: "MINIMIZE" }));

    expect(result.current.controllers.first.window).toMatchObject({
      visibility: "minimizing",
      active: false,
    });
    expect(result.current.controllers.second.window.active).toBe(true);
    expect(result.current.frontmostAppId).toBe("second");
    expect(result.current.controllers.second.pendingEffects.at(-1)?.type).toBe("FOCUS");
  });

  it("promotes a restoring prior owner when it becomes visible", () => {
    const { result } = renderHook(() => useDesktopAppController(apps, "first"));

    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() =>
      result.current.dispatch("second", {
        type: "TRANSITION_SETTLED",
        generation: 2,
        destination: "minimized",
      }),
    );
    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("first", { type: "WINDOW_INTERACTION" }, true));
    act(() => result.current.dispatch("first", { type: "CLOSE" }));

    expect(result.current.controllers.second.window.visibility).toBe("restoring");
    expect(result.current.frontmostAppId).toBe("first");

    act(() =>
      result.current.dispatch("second", {
        type: "TRANSITION_SETTLED",
        generation: 3,
        destination: "visible",
      }),
    );

    expect(result.current.frontmostAppId).toBe("second");
    expect(result.current.controllers.second.window).toMatchObject({ visibility: "visible", active: true });
  });

  it("promotes the immediate prior owner instead of registry order", () => {
    const { result } = renderHook(() => useDesktopAppController(threeApps, "first"));

    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("third", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("first", { type: "WINDOW_INTERACTION" }, true));
    expect(result.current.frontmostAppId).toBe("first");

    act(() => result.current.dispatch("first", { type: "CLOSE" }));

    expect(result.current.frontmostAppId).toBe("third");
    expect(result.current.controllers.third.window.active).toBe(true);
    expect(result.current.controllers.second.window.active).toBe(false);
  });

  it("preserves activation order through consecutive minimize handoffs", () => {
    const { result } = renderHook(() => useDesktopAppController(fourApps, "first"));

    act(() => result.current.dispatch("second", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("third", { type: "ACTIVATE_FROM_DOCK" }, true));
    act(() => result.current.dispatch("fourth", { type: "ACTIVATE_FROM_DOCK" }, true));
    expect(result.current.frontmostAppId).toBe("fourth");

    act(() => result.current.dispatch("fourth", { type: "MINIMIZE" }));
    expect(result.current.frontmostAppId).toBe("third");
    expect(result.current.controllers.third.window.active).toBe(true);

    act(() => result.current.dispatch("third", { type: "MINIMIZE" }));
    expect(result.current.frontmostAppId).toBe("second");
    expect(result.current.controllers.second.window.active).toBe(true);
    expect(result.current.controllers.first.window.active).toBe(false);
  });
});
