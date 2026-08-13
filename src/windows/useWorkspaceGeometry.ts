import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import { workspaceFromMeasurements, type Rect, type Viewport, type Workspace } from "./geometry";

export type WorkspaceGeometryRefs = {
  menuBarRef: RefObject<HTMLElement | null>;
  dockSurfaceRef: RefObject<HTMLElement | null>;
  dockItemRefs: RefObject<ReadonlyMap<string, HTMLElement>>;
};

export type WorkspaceGeometrySnapshot = Readonly<{
  workspace: Workspace;
  dockTargetRect: Rect | null;
  getDockTargetRect: (appId: string) => Rect | null;
}>;

type MeasuredGeometry = {
  workspace: Workspace;
  dockTargetRect: Rect | null;
};

function readViewport(): Viewport {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function finiteOr(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function readRect(element: HTMLElement | null): Rect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const x = finiteOr(rect.x, finiteOr(rect.left, 0));
  const y = finiteOr(rect.y, finiteOr(rect.top, 0));
  const width = Math.max(0, finiteOr(rect.width, finiteOr(rect.right, x) - x));
  const height = Math.max(0, finiteOr(rect.height, finiteOr(rect.bottom, y) - y));
  return Object.freeze({ x, y, width, height });
}

function readSafeAreaBottom() {
  if (typeof document === "undefined" || typeof window === "undefined") return 0;
  if (typeof window.getComputedStyle !== "function") return 0;
  const value = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue("--tienos-safe-area-bottom"),
  );
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function sameRect(left: Rect | null, right: Rect | null) {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height
  );
}

function sameWorkspace(left: Workspace, right: Workspace) {
  return (
    left.layout === right.layout &&
    left.menuBottom === right.menuBottom &&
    left.dockTop === right.dockTop &&
    left.safeAreaBottom === right.safeAreaBottom &&
    left.viewport.width === right.viewport.width &&
    left.viewport.height === right.viewport.height
  );
}

function sameGeometry(left: MeasuredGeometry, right: MeasuredGeometry) {
  return (
    sameWorkspace(left.workspace, right.workspace) && sameRect(left.dockTargetRect, right.dockTargetRect)
  );
}

function initialGeometry(): MeasuredGeometry {
  const viewport = readViewport();
  return {
    workspace: workspaceFromMeasurements(viewport, 30, viewport.height, 0),
    dockTargetRect: null,
  };
}

type FrameHandle = number | ReturnType<typeof setTimeout>;

function requestFrame(callback: FrameRequestCallback): FrameHandle {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 0);
}

function cancelFrame(frame: FrameHandle) {
  if (
    typeof frame === "number" &&
    typeof window !== "undefined" &&
    typeof window.cancelAnimationFrame === "function"
  ) {
    window.cancelAnimationFrame(frame);
  } else {
    clearTimeout(frame);
  }
}

export function useWorkspaceGeometry({
  menuBarRef,
  dockSurfaceRef,
  dockItemRefs,
}: WorkspaceGeometryRefs): WorkspaceGeometrySnapshot {
  const [geometry, setGeometry] = useState(initialGeometry);
  const getDockTargetRect = useCallback(
    (appId: string) => readRect(dockItemRefs.current.get(appId) ?? null),
    [dockItemRefs],
  );

  useLayoutEffect(() => {
    let cancelled = false;
    let scheduledFrame: FrameHandle | null = null;

    const measure = () => {
      scheduledFrame = null;
      if (cancelled) return;
      const viewport = readViewport();
      const menu = readRect(menuBarRef.current);
      const dock = readRect(dockSurfaceRef.current);
      const dockTargetRect = readRect(dockItemRefs.current.values().next().value ?? null);
      const next = {
        workspace: workspaceFromMeasurements(
          viewport,
          menu?.y !== undefined ? menu.y + menu.height : 0,
          dock?.y ?? viewport.height,
          readSafeAreaBottom(),
        ),
        dockTargetRect,
      };
      setGeometry((current) => (sameGeometry(current, next) ? current : next));
    };

    const scheduleMeasure = () => {
      if (scheduledFrame !== null) return;
      scheduledFrame = requestFrame(() => measure());
    };

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    const mutationObserver =
      typeof MutationObserver === "undefined" ? null : new MutationObserver(scheduleMeasure);
    const menu = menuBarRef.current;
    const dock = dockSurfaceRef.current;
    const dockElements = [...dockItemRefs.current.values()];

    if (menu) observer?.observe(menu);
    if (dock) observer?.observe(dock);
    for (const dockElement of dockElements) observer?.observe(dockElement);
    if (menu) mutationObserver?.observe(menu, { attributes: true });
    if (dock) mutationObserver?.observe(dock, { attributes: true });
    for (const dockElement of dockElements) mutationObserver?.observe(dockElement, { attributes: true });
    if (typeof document !== "undefined") {
      mutationObserver?.observe(document.documentElement, { attributes: true });
    }
    if (typeof window !== "undefined") {
      window.addEventListener("resize", scheduleMeasure);
      window.addEventListener("orientationchange", scheduleMeasure);
    }

    // Ref assignments are complete by this layout effect, so the first committed
    // workspace uses actual menu/Dock geometry rather than waiting for an observer.
    measure();

    return () => {
      cancelled = true;
      if (scheduledFrame !== null) cancelFrame(scheduledFrame);
      observer?.disconnect();
      mutationObserver?.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", scheduleMeasure);
        window.removeEventListener("orientationchange", scheduleMeasure);
      }
    };
  }, [dockItemRefs, dockSurfaceRef, menuBarRef]);

  // The provider is passed through render but reads the target ref only when an effect or event invokes it.
  // eslint-disable-next-line react-hooks/refs
  return Object.freeze({
    workspace: geometry.workspace,
    dockTargetRect: geometry.dockTargetRect,
    getDockTargetRect,
  });
}
