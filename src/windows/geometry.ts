export type Viewport = Readonly<{
  width: number;
  height: number;
}>;

export type Rect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type Frame = Rect;

export type LayoutMode = "desktop" | "compact";

export type Workspace = Readonly<{
  viewport: Viewport;
  menuBottom: number;
  dockTop: number;
  safeAreaBottom: number;
  layout: LayoutMode;
}>;

export type ResizeDirection =
  "top" | "right" | "bottom" | "left" | "topRight" | "bottomRight" | "bottomLeft" | "topLeft";

export type ResizeSize = Readonly<{
  width: number;
  height: number;
}>;

export type Position = Readonly<{
  x: number;
  y: number;
}>;

export type SidebarBounds = Readonly<{
  minimum: number;
  maximum: number;
}>;

export const COMPACT_BREAKPOINT = 700;
export const IPHONE_BREAKPOINT = 430;
export const IPHONE_WINDOW_TOP = 46;
export const SPLITTER_WIDTH = 8;
export const DESKTOP_MINIMUM = Object.freeze({ width: 680, height: 520 });

const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
const nonNegative = (value: number, fallback = 0) => Math.max(0, finiteOr(value, fallback));

function freezeViewport(width: number, height: number): Viewport {
  return Object.freeze({ width: nonNegative(width), height: nonNegative(height) });
}

function freezeFrame(x: number, y: number, width: number, height: number): Frame {
  return Object.freeze({
    x: nonNegative(x),
    y: nonNegative(y),
    width: nonNegative(width),
    height: nonNegative(height),
  });
}

export function clamp(value: number, minimum: number, maximum: number) {
  const lower = finiteOr(minimum, 0);
  const upper = finiteOr(maximum, lower);
  const boundedMinimum = Math.min(lower, upper);
  const boundedMaximum = Math.max(lower, upper);
  return Math.min(Math.max(finiteOr(value, boundedMinimum), boundedMinimum), boundedMaximum);
}

export function workspaceFromMeasurements(
  viewport: Viewport,
  menuBottom: number,
  dockTop: number,
  safeAreaBottom: number,
): Workspace {
  const normalizedViewport = freezeViewport(viewport.width, viewport.height);
  return Object.freeze({
    viewport: normalizedViewport,
    menuBottom: nonNegative(menuBottom),
    dockTop: nonNegative(dockTop, normalizedViewport.height),
    safeAreaBottom: nonNegative(safeAreaBottom),
    layout: normalizedViewport.width <= COMPACT_BREAKPOINT ? "compact" : "desktop",
  });
}

export function workspaceBottomBoundary(workspace: Workspace): number {
  const safeAreaBoundary = Math.max(0, workspace.viewport.height - nonNegative(workspace.safeAreaBottom));
  const dockTop = nonNegative(workspace.dockTop, workspace.viewport.height);
  const boundary = dockTop > workspace.menuBottom ? Math.min(dockTop, safeAreaBoundary) : safeAreaBoundary;
  return Math.floor(Math.max(0, boundary));
}

export function defaultCompactFrame(workspace: Workspace): Frame {
  const { viewport } = workspace;
  const measuredTop = Math.ceil(nonNegative(workspace.menuBottom));
  const top = viewport.width <= IPHONE_BREAKPOINT ? Math.max(IPHONE_WINDOW_TOP, measuredTop) : measuredTop;
  const bottomBoundary = workspaceBottomBoundary(workspace);
  return freezeFrame(8, top, viewport.width - 16, bottomBoundary - top - 8);
}

export function defaultDesktopFrame(viewport: Viewport): Frame {
  const width = Math.min(
    viewport.width,
    Math.max(Math.min(DESKTOP_MINIMUM.width, viewport.width), viewport.width * 0.788),
    1120,
  );
  const height = Math.min(
    viewport.height,
    Math.max(Math.min(DESKTOP_MINIMUM.height, viewport.height), viewport.height * 0.727),
    860,
  );

  return freezeFrame(
    clamp(viewport.width * 0.106, 0, viewport.width - width),
    clamp(viewport.height * 0.105, 0, viewport.height - height),
    width,
    height,
  );
}

export function fullscreenFrame(workspace: Workspace): Frame {
  const top = Math.ceil(nonNegative(workspace.menuBottom));
  const bottomBoundary = workspaceBottomBoundary(workspace);
  return freezeFrame(0, top, workspace.viewport.width, Math.max(0, bottomBoundary - top));
}

export function clampFrame(frame: Frame, workspace: Workspace): Frame {
  const { viewport } = workspace;
  const top = Math.ceil(nonNegative(workspace.menuBottom));
  const bottomBoundary = workspaceBottomBoundary(workspace);
  const availableHeight = Math.max(0, bottomBoundary - top);
  const width = clamp(frame.width, Math.min(DESKTOP_MINIMUM.width, viewport.width), viewport.width);
  const height = clamp(frame.height, Math.min(DESKTOP_MINIMUM.height, availableHeight), availableHeight);

  return freezeFrame(
    clamp(frame.x, 0, viewport.width - width),
    clamp(frame.y, top, bottomBoundary - height),
    width,
    height,
  );
}

export function restoreNormalFrame(savedFrame: Frame, workspace: Workspace): Frame {
  return workspace.layout === "compact" ? defaultCompactFrame(workspace) : clampFrame(savedFrame, workspace);
}

export function frameFromResize(
  direction: ResizeDirection,
  size: ResizeSize,
  position: Position,
  workspace: Workspace,
): Frame {
  const top = direction.toLowerCase().startsWith("top")
    ? Math.max(finiteOr(position.y, 0), Math.ceil(nonNegative(workspace.menuBottom)))
    : finiteOr(position.y, 0);
  const bottom = finiteOr(position.y, 0) + nonNegative(size.height);
  const topResize = direction.toLowerCase().startsWith("top");

  return clampFrame(
    {
      x: finiteOr(position.x, 0),
      y: top,
      width: nonNegative(size.width),
      height: topResize ? Math.max(0, bottom - top) : nonNegative(size.height),
    },
    workspace,
  );
}

export function sidebarBounds(frameWidth: number, layout: LayoutMode): SidebarBounds {
  const width = Math.max(1, nonNegative(frameWidth));
  const availableWidth = Math.max(0, width - SPLITTER_WIDTH);
  const requestedSidebar = layout === "compact" ? 112 : 180;
  const requestedDetails = layout === "compact" ? 170 : 360;
  const scale = Math.min(1, availableWidth / (requestedSidebar + requestedDetails));
  const minimumSidebar = requestedSidebar * scale;
  const minimumDetails = requestedDetails * scale;

  return Object.freeze({
    minimum: (minimumSidebar / width) * 100,
    maximum: ((availableWidth - minimumDetails) / width) * 100,
  });
}

export const compactFrame = defaultCompactFrame;
export const desktopFrame = defaultDesktopFrame;
