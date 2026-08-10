import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceGeometry, type WorkspaceGeometryRefs } from "./useWorkspaceGeometry";

function elementRect({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return {
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

class TestResizeObserver {
  static instances: TestResizeObserver[] = [];
  readonly observed: Element[] = [];
  readonly callback: ResizeObserverCallback;
  disconnected = false;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    TestResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  disconnect() {
    this.disconnected = true;
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

class TestMutationObserver extends TestResizeObserver {}

function makeRefs(): {
  refs: WorkspaceGeometryRefs;
  menu: HTMLElement;
  dock: HTMLElement;
  target: HTMLButtonElement;
} {
  const menu = document.createElement("header");
  const dock = document.createElement("nav");
  const target = document.createElement("button");
  vi.spyOn(menu, "getBoundingClientRect").mockReturnValue(
    elementRect({ x: 0, y: 0, width: 800, height: 36 }),
  );
  vi.spyOn(dock, "getBoundingClientRect").mockReturnValue(
    elementRect({ x: 300, y: 730, width: 200, height: 62 }),
  );
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue(
    elementRect({ x: 370, y: 736, width: 56, height: 56 }),
  );
  return {
    refs: {
      menuBarRef: { current: menu },
      dockSurfaceRef: { current: dock },
      settingsDockItemRef: { current: target },
    } satisfies WorkspaceGeometryRefs,
    menu,
    dock,
    target,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  TestResizeObserver.instances = [];
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
  vi.stubGlobal("MutationObserver", TestMutationObserver);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
    window.setTimeout(() => callback(performance.now()), 16),
  );
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((handle) => window.clearTimeout(handle));
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useWorkspaceGeometry", () => {
  it("registers explicit surfaces, measures the first frame, and provides a live target rect", () => {
    const { refs: currentRefs, menu, dock, target } = makeRefs();
    const { result, unmount } = renderHook(() => useWorkspaceGeometry(currentRefs));

    expect(result.current.workspace).toMatchObject({
      viewport: { width: 800, height: 800 },
      menuBottom: 36,
      dockTop: 730,
      layout: "desktop",
    });
    expect(result.current.dockTargetRect).toMatchObject({ x: 370, y: 736, width: 56, height: 56 });
    expect(result.current.getDockTargetRect()).toMatchObject({ x: 370, y: 736, width: 56, height: 56 });
    expect(TestResizeObserver.instances).toHaveLength(2);
    expect(TestResizeObserver.instances[0].observed).toEqual([menu, dock, target]);
    expect(TestResizeObserver.instances[1].observed.slice(0, 3)).toEqual([menu, dock, target]);
    expect(TestResizeObserver.instances[1].observed[3]).toBe(document.documentElement);

    target.getBoundingClientRect = vi.fn(() => elementRect({ x: 20, y: 30, width: 40, height: 50 }));
    act(() => {
      TestResizeObserver.instances[0].trigger();
      vi.advanceTimersByTime(16);
    });
    expect(result.current.getDockTargetRect()).toMatchObject({ x: 20, y: 30, width: 40, height: 50 });

    unmount();
    expect(TestResizeObserver.instances.every((observer) => observer.disconnected)).toBe(true);
  });

  it("coalesces observer bursts and cleans the scheduled measurement", () => {
    const { refs: currentRefs, dock } = makeRefs();
    const { result, unmount } = renderHook(() => useWorkspaceGeometry(currentRefs));
    const resizeObserver = TestResizeObserver.instances[0];
    const mutationObserver = TestResizeObserver.instances[1];

    dock.getBoundingClientRect = vi.fn(() => elementRect({ x: 300, y: 680, width: 200, height: 62 }));
    act(() => {
      resizeObserver.trigger();
      resizeObserver.trigger();
      mutationObserver.trigger();
    });
    expect(result.current.workspace.dockTop).toBe(730);

    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(result.current.workspace.dockTop).toBe(680);

    resizeObserver.trigger();
    unmount();
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(TestResizeObserver.instances.every((observer) => observer.disconnected)).toBe(true);
  });

  it("re-registers observers when explicit ref objects change and tolerates null refs", () => {
    const first = makeRefs();
    const second = makeRefs();
    second.refs.menuBarRef.current = null;
    second.refs.dockSurfaceRef.current = null;
    second.refs.settingsDockItemRef.current = null;
    const { rerender, result } = renderHook(
      ({ currentRefs }: { currentRefs: WorkspaceGeometryRefs }) => useWorkspaceGeometry(currentRefs),
      { initialProps: { currentRefs: first.refs } },
    );

    rerender({ currentRefs: second.refs });
    expect(TestResizeObserver.instances[0].disconnected).toBe(true);
    expect(TestResizeObserver.instances[2].observed).toEqual([]);
    expect(result.current.getDockTargetRect()).toBeNull();
  });
});
