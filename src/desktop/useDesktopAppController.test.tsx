import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DesktopAppDescriptor } from "./apps";
import { useDesktopAppController } from "./useDesktopAppController";

const EmptyWindow: DesktopAppDescriptor["Window"] = () => null;
const apps: readonly DesktopAppDescriptor[] = [
  { id: "first", name: "First", icon: "gear", Window: EmptyWindow },
  { id: "second", name: "Second", icon: "sparkle", Window: EmptyWindow },
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

    expect(Object.values(result.current.controllers).every((controller) => !controller.window.active)).toBe(true);
    expect(result.current.frontmostAppId).toBe("second");
  });
});
