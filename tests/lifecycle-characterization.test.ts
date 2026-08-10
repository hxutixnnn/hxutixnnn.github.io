import { describe, expect, it } from "vitest";

type Visibility = "visible" | "minimizing" | "minimized" | "restoring";
type CharacterizedWindow = {
  open: boolean;
  active: boolean;
  visibility: Visibility;
  fullscreen: boolean;
  generation: number;
  focus: number;
};
type Event =
  "launch" | "desktop" | "close" | "minimize" | "dock" | "fullscreen" | "settle-minimized" | "settle-visible";
const initial: CharacterizedWindow = {
  open: true,
  active: true,
  visibility: "visible",
  fullscreen: false,
  generation: 0,
  focus: 0,
};
function current(
  state: CharacterizedWindow,
  event: Event,
  settledGeneration = state.generation,
): CharacterizedWindow {
  if (event.startsWith("settle") && settledGeneration !== state.generation) return state;
  switch (event) {
    case "launch":
      return state.open
        ? { ...state, active: true, focus: state.focus + 1 }
        : { ...initial, generation: state.generation + 1, focus: state.focus + 1 };
    case "desktop":
      return { ...state, active: false };
    case "close":
      return { ...state, open: false, active: false, fullscreen: false };
    case "minimize":
      return {
        ...state,
        visibility: "minimizing",
        active: false,
        fullscreen: false,
        generation: state.generation + 1,
      };
    case "dock":
      if (!state.open) return current(state, "launch");
      if (state.visibility === "visible" && state.active) return current(state, "minimize");
      if (state.visibility === "minimized" || state.visibility === "minimizing")
        return {
          ...state,
          visibility: "restoring",
          active: true,
          generation: state.generation + 1,
          focus: state.focus + 1,
        };
      return { ...state, active: true, focus: state.focus + 1 };
    case "fullscreen":
      return { ...state, fullscreen: !state.fullscreen, active: true, focus: state.focus + 1 };
    case "settle-minimized":
      return { ...state, visibility: "minimized", active: false };
    case "settle-visible":
      return { ...state, visibility: "visible", active: true };
  }
}

/** Current App/SystemSettings outcomes. Phase 1 must preserve this table while changing ownership. */
const transitions: readonly {
  name: string;
  from: CharacterizedWindow;
  events: readonly Event[];
  expected: Partial<CharacterizedWindow>;
}[] = [
  {
    name: "open active window becomes inactive from desktop",
    from: initial,
    events: ["desktop"],
    expected: { open: true, active: false },
  },
  {
    name: "inactive Dock activation focuses the same window",
    from: { ...initial, active: false },
    events: ["dock"],
    expected: { open: true, active: true, focus: 1 },
  },
  {
    name: "active Dock activation minimizes",
    from: initial,
    events: ["dock", "settle-minimized"],
    expected: { visibility: "minimized", active: false },
  },
  {
    name: "minimized Dock activation restores",
    from: { ...initial, visibility: "minimized", active: false },
    events: ["dock", "settle-visible"],
    expected: { visibility: "visible", active: true },
  },
  {
    name: "same-tick Dock interruption reverses minimizing",
    from: initial,
    events: ["dock", "dock", "settle-visible"],
    expected: { visibility: "visible", active: true, generation: 2 },
  },
  {
    name: "close and launch creates one fresh generation",
    from: initial,
    events: ["close", "launch"],
    expected: { open: true, active: true, fullscreen: false, generation: 1 },
  },
  {
    name: "fullscreen remains single-window and focused",
    from: initial,
    events: ["fullscreen"],
    expected: { open: true, active: true, fullscreen: true, focus: 1 },
  },
];
describe("current single Settings window lifecycle", () => {
  for (const row of transitions)
    it(row.name, () =>
      expect(row.events.reduce((state, event) => current(state, event), row.from)).toMatchObject(
        row.expected,
      ),
    );
  it("ignores stale transition settlement after a fresh generation", () => {
    const minimizing = current(initial, "minimize");
    const reopened = current(current(minimizing, "close"), "launch");
    expect(current(reopened, "settle-minimized", minimizing.generation)).toEqual(reopened);
  });
  it("always characterizes a single instance", () =>
    expect(current(current(initial, "launch"), "launch").open).toBe(true));
});
