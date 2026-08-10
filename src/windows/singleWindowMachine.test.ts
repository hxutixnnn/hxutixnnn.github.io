import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  initialSingleWindowState,
  reduceWindow,
  type SingleWindowState,
  type WindowEvent,
} from "./singleWindowMachine";

function apply(state: SingleWindowState, ...events: WindowEvent[]) {
  return events.reduce((current, event) => reduceWindow(current, event).state, state);
}

describe("single-window lifecycle transition table", () => {
  const rows = [
    {
      name: "menu activation focuses an inactive visible window",
      from: { ...initialSingleWindowState, active: false },
      events: [{ type: "ACTIVATE_FROM_MENU" }],
      expected: { generation: 0, visibility: "visible", active: true, focusEpoch: 1 },
    },
    {
      name: "Dock activation minimizes the active visible window",
      from: initialSingleWindowState,
      events: [{ type: "ACTIVATE_FROM_DOCK" }],
      expected: { generation: 1, visibility: "minimizing", active: false },
    },
    {
      name: "Dock activation restores a minimizing window and advances its generation",
      from: initialSingleWindowState,
      events: [{ type: "ACTIVATE_FROM_DOCK" }, { type: "ACTIVATE_FROM_DOCK" }],
      expected: { generation: 2, visibility: "restoring", active: true, focusEpoch: 1 },
    },
  ] as const;

  it.each(rows)("$name", ({ from, events, expected }) => {
    expect(apply(from, ...events)).toMatchObject(expected);
  });

  it("settles only the current transition generation", () => {
    const minimizing = reduceWindow(initialSingleWindowState, { type: "ACTIVATE_FROM_DOCK" });
    expect(
      reduceWindow(minimizing.state, {
        type: "TRANSITION_SETTLED",
        generation: minimizing.state.generation - 1,
        destination: "minimized",
      }).state,
    ).toBe(minimizing.state);
    expect(
      reduceWindow(minimizing.state, {
        type: "TRANSITION_SETTLED",
        generation: minimizing.state.generation,
        destination: "minimized",
      }).state.visibility,
    ).toBe("minimized");
  });

  it("makes same-tick Dock reversal deterministic and latest-generation completion win", () => {
    const minimizing = reduceWindow(initialSingleWindowState, { type: "ACTIVATE_FROM_DOCK" });
    const restoring = reduceWindow(minimizing.state, { type: "ACTIVATE_FROM_DOCK" });
    const stale = reduceWindow(restoring.state, {
      type: "TRANSITION_SETTLED",
      generation: minimizing.state.generation,
      destination: "minimized",
    });
    const settled = reduceWindow(restoring.state, {
      type: "TRANSITION_SETTLED",
      generation: restoring.state.generation,
      destination: "visible",
    });

    expect(restoring.state).toMatchObject({ visibility: "restoring", active: true });
    expect(stale.state).toBe(restoring.state);
    expect(settled.state).toMatchObject({ visibility: "visible", active: true });
  });

  it("keeps one retained instance and preserves fullscreen through minimize and restore", () => {
    const fullscreen = apply(initialSingleWindowState, { type: "TOGGLE_FULLSCREEN" });
    const minimizing = reduceWindow(fullscreen, { type: "ACTIVATE_FROM_DOCK" });
    const minimized = reduceWindow(minimizing.state, {
      type: "TRANSITION_SETTLED",
      generation: minimizing.state.generation,
      destination: "minimized",
    });
    const restoring = reduceWindow(minimized.state, { type: "ACTIVATE_FROM_DOCK" });
    const visible = reduceWindow(restoring.state, {
      type: "TRANSITION_SETTLED",
      generation: restoring.state.generation,
      destination: "visible",
    });

    expect(visible.state).toMatchObject({
      presence: "open",
      visibility: "visible",
      fullscreen: true,
    });
  });

  it("close and relaunch discard stale completions and reset fullscreen", () => {
    const minimizing = reduceWindow(initialSingleWindowState, { type: "ACTIVATE_FROM_DOCK" });
    const closed = reduceWindow(minimizing.state, { type: "CLOSE" });
    const reopened = reduceWindow(closed.state, { type: "ACTIVATE_FROM_MENU" });
    const stale = reduceWindow(reopened.state, {
      type: "TRANSITION_SETTLED",
      generation: minimizing.state.generation,
      destination: "minimized",
    });

    expect(reopened.state).toMatchObject({
      presence: "open",
      visibility: "visible",
      active: true,
      fullscreen: false,
    });
    expect(stale.state).toBe(reopened.state);
  });

  it("only activation changes focus epochs", () => {
    let state = initialSingleWindowState;
    state = apply(state, { type: "DESKTOP_POINTER" });
    expect(state.focusEpoch).toBe(0);
    state = apply(state, { type: "ACTIVATE_FROM_DOCK" });
    expect(state.focusEpoch).toBe(1);
    state = apply(state, { type: "TOGGLE_FULLSCREEN" });
    expect(state.focusEpoch).toBe(1);
    state = apply(state, { type: "ACTIVATE_FROM_DOCK" }, { type: "ACTIVATE_FROM_DOCK" });
    expect(state.focusEpoch).toBe(2);
  });
});

describe("single-window lifecycle properties", () => {
  const eventArbitrary: fc.Arbitrary<WindowEvent> = fc.oneof(
    fc.constantFrom<WindowEvent>(
      { type: "LAUNCH" },
      { type: "ACTIVATE_FROM_DOCK" },
      { type: "ACTIVATE_FROM_MENU" },
      { type: "DESKTOP_POINTER" },
      { type: "WINDOW_INTERACTION" },
      { type: "CLOSE" },
      { type: "MINIMIZE" },
      { type: "TOGGLE_FULLSCREEN" },
    ),
    fc.record({
      type: fc.constant("TRANSITION_SETTLED" as const),
      generation: fc.nat(20),
      destination: fc.constantFrom("minimized" as const, "visible" as const),
    }),
  );

  it("preserves closed consistency, legal visibility, and one-instance identity for arbitrary streams", () => {
    fc.assert(
      fc.property(fc.array(eventArbitrary, { maxLength: 100 }), (events) => {
        let state = initialSingleWindowState;
        for (const event of events) {
          state = reduceWindow(state, event).state;
          expect(["visible", "minimizing", "minimized", "restoring"]).toContain(state.visibility);
          if (state.presence === "closed") {
            expect(state.active).toBe(false);
            expect(state.fullscreen).toBe(false);
          }
          expect(state.generation).toBeGreaterThanOrEqual(0);
          expect(state.focusEpoch).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it("never decreases focus epochs and ignores stale generation events", () => {
    fc.assert(
      fc.property(fc.array(eventArbitrary, { maxLength: 80 }), (events) => {
        let state = initialSingleWindowState;
        let focusEpoch = state.focusEpoch;
        for (const event of events) {
          const next = reduceWindow(state, event).state;
          expect(next.focusEpoch).toBeGreaterThanOrEqual(focusEpoch);
          focusEpoch = next.focusEpoch;
          state = next;
        }
      }),
    );
  });
});
