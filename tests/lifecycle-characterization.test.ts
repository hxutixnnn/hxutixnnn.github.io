import { describe, expect, it } from "vitest";
import {
  initialSingleWindowState,
  reduceWindow,
  type SingleWindowState,
  type WindowEvent,
} from "../src/windows/singleWindowMachine";

function current(state: SingleWindowState, ...events: WindowEvent[]) {
  return events.reduce((next, event) => reduceWindow(next, event).state, state);
}

/** Phase 0's current-behavior table now executes against the Phase 1 owner. */
describe("single Settings window lifecycle characterization", () => {
  it.each([
    ["open active window becomes inactive from desktop", [{ type: "DESKTOP_POINTER" }], { active: false }],
    [
      "inactive Dock activation focuses the same window",
      [{ type: "DESKTOP_POINTER" }, { type: "ACTIVATE_FROM_DOCK" }],
      { presence: "open", visibility: "visible", active: true, focusEpoch: 1 },
    ],
    [
      "active Dock activation minimizes",
      [
        { type: "ACTIVATE_FROM_DOCK" },
        { type: "TRANSITION_SETTLED", generation: 1, destination: "minimized" },
      ],
      { presence: "open", visibility: "minimized", active: false },
    ],
    [
      "minimized Dock activation restores",
      [
        { type: "ACTIVATE_FROM_DOCK" },
        { type: "TRANSITION_SETTLED", generation: 1, destination: "minimized" },
        { type: "ACTIVATE_FROM_DOCK" },
        { type: "TRANSITION_SETTLED", generation: 2, destination: "visible" },
      ],
      { presence: "open", visibility: "visible", active: true },
    ],
    [
      "same-tick Dock interruption reverses minimizing",
      [
        { type: "ACTIVATE_FROM_DOCK" },
        { type: "ACTIVATE_FROM_DOCK" },
        { type: "TRANSITION_SETTLED", generation: 2, destination: "visible" },
      ],
      { visibility: "visible", active: true, generation: 2 },
    ],
    [
      "close and launch creates one fresh fullscreen-free instance",
      [{ type: "CLOSE" }, { type: "LAUNCH" }],
      { presence: "open", visibility: "visible", active: true, fullscreen: false, generation: 2 },
    ],
    [
      "fullscreen remains single-window and focused",
      [{ type: "TOGGLE_FULLSCREEN" }],
      { presence: "open", active: true, fullscreen: true, focusEpoch: 0 },
    ],
  ] as const)("%s", (_name, events, expected) => {
    expect(current(initialSingleWindowState, ...events)).toMatchObject(expected);
  });

  it("ignores stale transition settlement after a close and relaunch", () => {
    const minimizing = reduceWindow(initialSingleWindowState, { type: "ACTIVATE_FROM_DOCK" });
    const reopened = current(minimizing.state, { type: "CLOSE" }, { type: "LAUNCH" });
    expect(
      reduceWindow(reopened, {
        type: "TRANSITION_SETTLED",
        generation: minimizing.state.generation,
        destination: "minimized",
      }).state,
    ).toBe(reopened);
  });

  it("always characterizes exactly one retained instance", () => {
    expect(current(initialSingleWindowState, { type: "LAUNCH" }, { type: "LAUNCH" }).presence).toBe("open");
  });
});
