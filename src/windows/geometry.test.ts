import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  clampFrame,
  defaultCompactFrame,
  defaultDesktopFrame,
  frameFromResize,
  fullscreenFrame,
  restoreNormalFrame,
  workspaceBottomBoundary,
  workspaceFromMeasurements,
  type Frame,
  type ResizeDirection,
  type Workspace,
} from "./geometry";

function workspace(width: number, height: number, menuBottom: number, dockTop: number, safeAreaBottom = 0) {
  return workspaceFromMeasurements({ width, height }, menuBottom, dockTop, safeAreaBottom);
}

const boundaryCases: ReadonlyArray<{
  name: string;
  workspace: Workspace;
  boundary: number;
  compactFrame?: Frame;
}> = [
  {
    name: "desktop menu and Dock bounds",
    workspace: workspace(918, 922, 36, 846),
    boundary: 846,
  },
  {
    name: "safe area wins over a low Dock",
    workspace: workspace(900, 800, 42.5, 760, 28),
    boundary: 760,
  },
  {
    name: "safe area wins when Dock overlaps the menu",
    workspace: workspace(900, 800, 42.5, 20, 28),
    boundary: 772,
  },
  {
    name: "compact iPhone top has a 46 pixel floor",
    workspace: workspace(390, 844, 36, 760, 0),
    boundary: 760,
    compactFrame: { x: 8, y: 46, width: 374, height: 706 },
  },
  {
    name: "compact non-iPhone follows the measured menu",
    workspace: workspace(500, 700, 52, 640, 0),
    boundary: 640,
    compactFrame: { x: 8, y: 52, width: 484, height: 580 },
  },
] as const;

describe("pure workspace geometry boundary table", () => {
  it.each(boundaryCases)("$name", ({ workspace: current, boundary, compactFrame }) => {
    expect(workspaceBottomBoundary(current)).toBe(boundary);
    if (compactFrame) expect(defaultCompactFrame(current)).toEqual(compactFrame);
  });

  it("keeps the measured desktop default policy independent of workspace surfaces", () => {
    const frame = defaultDesktopFrame({ width: 918, height: 922 });
    expect(frame.x).toBeCloseTo(97.308);
    expect(frame.y).toBeCloseTo(96.81);
    expect(frame.width).toBeCloseTo(723.384);
    expect(frame.height).toBeCloseTo(670.294);
  });

  it("produces the usable fullscreen frame and restores the latest normal frame", () => {
    const current = workspace(1200, 900, 38, 820, 16);
    const fullscreen = fullscreenFrame(current);
    expect(fullscreen).toEqual({ x: 0, y: 38, width: 1200, height: 782 });

    const saved: Frame = { x: 110, y: 90, width: 700, height: 600 };
    expect(restoreNormalFrame(saved, current)).toEqual(clampFrame(saved, current));
    expect(restoreNormalFrame(saved, workspace(500, 700, 36, 620))).toEqual(
      defaultCompactFrame(workspace(500, 700, 36, 620)),
    );
  });

  it("preserves feasible resize anchors for every direction", () => {
    const current = workspace(1200, 900, 36, 840);
    const position = { x: 180, y: 180 };
    const size = { width: 700, height: 600 };
    const bottom = position.y + size.height;
    const right = position.x + size.width;
    const directions: readonly ResizeDirection[] = [
      "top",
      "topLeft",
      "topRight",
      "left",
      "right",
      "bottom",
      "bottomLeft",
      "bottomRight",
    ];

    for (const direction of directions) {
      const next = frameFromResize(direction, size, position, current);
      if (direction.toLowerCase().startsWith("top")) expect(next.y + next.height).toBe(bottom);
      if (direction.toLowerCase().endsWith("left")) expect(next.x + next.width).toBe(right);
    }
  });
});

const numberArbitrary = fc.double({ min: 0, max: 2400, noNaN: true, noDefaultInfinity: true });
const viewportArbitrary = fc.record({
  width: fc.integer({ min: 0, max: 2400 }),
  height: fc.integer({ min: 0, max: 1600 }),
});

const workspaceArbitrary: fc.Arbitrary<Workspace> = viewportArbitrary.chain(({ width, height }) =>
  fc
    .record({
      menuBottom: fc.integer({ min: 0, max: height }),
      dockGap: fc.integer({ min: 0, max: Math.max(0, height) }),
      safeAreaBottom: fc.integer({ min: 0, max: height }),
    })
    .map(({ menuBottom, dockGap, safeAreaBottom }) =>
      workspaceFromMeasurements(
        { width, height },
        menuBottom,
        Math.max(menuBottom, height - dockGap),
        Math.min(safeAreaBottom, Math.max(0, height - menuBottom)),
      ),
    ),
);

describe("workspace geometry properties", () => {
  it("returns finite, nonnegative, workspace-contained frames for arbitrary inputs", () => {
    fc.assert(
      fc.property(
        workspaceArbitrary,
        numberArbitrary,
        numberArbitrary,
        numberArbitrary,
        numberArbitrary,
        (current, x, y, width, height) => {
          const next = clampFrame({ x, y, width, height }, current);
          const boundary = workspaceBottomBoundary(current);
          const top = Math.ceil(current.menuBottom);

          for (const value of Object.values(next)) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
          }
          expect(next.x + next.width).toBeLessThanOrEqual(current.viewport.width);
          expect(next.y).toBeGreaterThanOrEqual(top);
          expect(next.y + next.height).toBeLessThanOrEqual(boundary);
          expect(clampFrame(next, current)).toEqual(next);
        },
      ),
    );
  });

  it("keeps compact defaults and desktop defaults deterministic across repeated calls", () => {
    fc.assert(
      fc.property(workspaceArbitrary, (current) => {
        expect(defaultCompactFrame(current)).toEqual(defaultCompactFrame(current));
        expect(defaultDesktopFrame(current.viewport)).toEqual(defaultDesktopFrame(current.viewport));
        if (current.layout === "compact") {
          expect(restoreNormalFrame(defaultCompactFrame(current), current)).toEqual(
            defaultCompactFrame(current),
          );
        }
      }),
    );
  });
});
