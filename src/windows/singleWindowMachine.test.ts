import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  initialSingleWindowState,
  reduceWindow,
  type SingleWindowState,
  type WindowEffect,
  type WindowEvent,
  type WindowReduction,
  type WindowVisibility,
} from "./singleWindowMachine";

function apply(state: SingleWindowState, ...events: WindowEvent[]) {
  return events.reduce((current, event) => reduceWindow(current, event).state, state);
}

const generation = 7;
const focusEpoch = 11;

const reachableStates = [
  {
    name: "closed",
    state: {
      generation,
      presence: "closed",
      visibility: "visible",
      active: false,
      fullscreen: false,
      focusEpoch,
    },
  },
  ...(["visible", "minimizing", "minimized", "restoring"] as const).flatMap((visibility) =>
    [true, false].map((active) => ({
      name: `${visibility}-${active ? "active" : "inactive"}`,
      state: {
        generation,
        presence: "open" as const,
        visibility,
        active,
        fullscreen: true,
        focusEpoch,
      },
    })),
  ),
] satisfies { name: string; state: SingleWindowState }[];

const tableEvents = [
  { name: "launch", event: { type: "LAUNCH" } },
  { name: "menu activation", event: { type: "ACTIVATE_FROM_MENU" } },
  { name: "Dock activation", event: { type: "ACTIVATE_FROM_DOCK" } },
  { name: "desktop interaction", event: { type: "DESKTOP_POINTER" } },
  { name: "window interaction", event: { type: "WINDOW_INTERACTION" } },
  { name: "close", event: { type: "CLOSE" } },
  { name: "minimize", event: { type: "MINIMIZE" } },
  { name: "fullscreen", event: { type: "TOGGLE_FULLSCREEN" } },
  {
    name: "minimize completion",
    event: { type: "TRANSITION_SETTLED", generation, destination: "minimized" },
  },
  {
    name: "restore completion",
    event: { type: "TRANSITION_SETTLED", generation, destination: "visible" },
  },
] satisfies { name: string; event: WindowEvent }[];

type ExpectedOutcome =
  | "unchanged"
  | "focus"
  | "launch"
  | "inactive"
  | "active"
  | "close"
  | "minimize"
  | "dock-minimize"
  | "restore"
  | "toggle-fullscreen"
  | "settle-minimized"
  | "settle-visible";

const transitionTable: Record<string, readonly ExpectedOutcome[]> = {
  closed: ["launch", "launch", "launch", "unchanged", "unchanged", "unchanged", "unchanged", "unchanged", "unchanged", "unchanged"],
  "visible-active": ["focus", "focus", "dock-minimize", "inactive", "unchanged", "close", "minimize", "toggle-fullscreen", "unchanged", "unchanged"],
  "visible-inactive": ["focus", "focus", "focus", "unchanged", "active", "close", "minimize", "toggle-fullscreen", "unchanged", "unchanged"],
  "minimizing-active": ["restore", "restore", "restore", "inactive", "unchanged", "close", "unchanged", "toggle-fullscreen", "settle-minimized", "unchanged"],
  "minimizing-inactive": ["restore", "restore", "restore", "unchanged", "unchanged", "close", "unchanged", "toggle-fullscreen", "settle-minimized", "unchanged"],
  "minimized-active": ["restore", "restore", "restore", "inactive", "unchanged", "close", "unchanged", "toggle-fullscreen", "unchanged", "unchanged"],
  "minimized-inactive": ["restore", "restore", "restore", "unchanged", "unchanged", "close", "unchanged", "toggle-fullscreen", "unchanged", "unchanged"],
  "restoring-active": ["unchanged", "unchanged", "unchanged", "inactive", "unchanged", "close", "minimize", "toggle-fullscreen", "unchanged", "settle-visible"],
  "restoring-inactive": ["unchanged", "unchanged", "unchanged", "unchanged", "unchanged", "close", "minimize", "toggle-fullscreen", "unchanged", "settle-visible"],
};

function expectedReduction(state: SingleWindowState, outcome: ExpectedOutcome): WindowReduction {
  const nextGeneration = state.generation + 1;
  const nextEpoch = state.focusEpoch + 1;
  const noEffects: readonly WindowEffect[] = [];

  switch (outcome) {
    case "unchanged":
      return { state, effects: noEffects };
    case "focus":
      return {
        state: { ...state, active: true, focusEpoch: nextEpoch },
        effects: [{ type: "FOCUS", generation: state.generation, epoch: nextEpoch }],
      };
    case "launch":
      return {
        state: {
          generation: nextGeneration,
          presence: "open",
          visibility: "visible",
          active: true,
          fullscreen: false,
          focusEpoch: nextEpoch,
        },
        effects: [{ type: "FOCUS", generation: nextGeneration, epoch: nextEpoch }],
      };
    case "inactive":
      return { state: { ...state, active: false }, effects: noEffects };
    case "active":
      return { state: { ...state, active: true }, effects: noEffects };
    case "close":
      return {
        state: {
          ...state,
          generation: nextGeneration,
          presence: "closed",
          visibility: "visible",
          active: false,
          fullscreen: false,
        },
        effects: noEffects,
      };
    case "minimize":
    case "dock-minimize":
      return {
        state: { ...state, generation: nextGeneration, visibility: "minimizing", active: false },
        effects: [{
          type: "START_TRANSITION",
          generation: nextGeneration,
          direction: "minimize",
          ...(outcome === "dock-minimize" ? { defer: true } : {}),
        }],
      };
    case "restore":
      return {
        state: {
          ...state,
          generation: nextGeneration,
          visibility: "restoring",
          active: true,
          focusEpoch: nextEpoch,
        },
        effects: [
          { type: "CANCEL_TRANSITION", generation: nextGeneration },
          { type: "START_TRANSITION", generation: nextGeneration, direction: "restore" },
        ],
      };
    case "toggle-fullscreen":
      return {
        state: { ...state, active: true, fullscreen: !state.fullscreen },
        effects: noEffects,
      };
    case "settle-minimized":
      return {
        state: { ...state, visibility: "minimized", active: false },
        effects: noEffects,
      };
    case "settle-visible":
      return {
        state: { ...state, visibility: "visible", active: true },
        effects: [{ type: "FOCUS", generation: state.generation, epoch: state.focusEpoch }],
      };
  }
}

describe("single-window lifecycle transition table", () => {
  const cases = reachableStates.flatMap(({ name: stateName, state }) =>
    tableEvents.map(({ name: eventName, event }, eventIndex) => ({
      name: `${stateName} + ${eventName}`,
      state,
      event,
      outcome: transitionTable[stateName][eventIndex],
    })),
  );

  it.each(cases)("$name", ({ state, event, outcome }) => {
    expect(reduceWindow(state, event)).toEqual(expectedReduction(state, outcome));
  });

  it("makes same-tick reversal deterministic and lets only the latest generation settle", () => {
    const minimizing = reduceWindow(initialSingleWindowState, { type: "ACTIVATE_FROM_DOCK" });
    const restoring = reduceWindow(minimizing.state, { type: "ACTIVATE_FROM_DOCK" });

    expect(restoring).toEqual({
      state: {
        ...minimizing.state,
        generation: 2,
        visibility: "restoring",
        active: true,
        focusEpoch: 1,
      },
      effects: [
        { type: "CANCEL_TRANSITION", generation: 2 },
        { type: "START_TRANSITION", generation: 2, direction: "restore" },
      ],
    });
    expect(
      reduceWindow(restoring.state, {
        type: "TRANSITION_SETTLED",
        generation: minimizing.state.generation,
        destination: "minimized",
      }).state,
    ).toBe(restoring.state);
    expect(
      reduceWindow(restoring.state, {
        type: "TRANSITION_SETTLED",
        generation: restoring.state.generation,
        destination: "visible",
      }).state,
    ).toMatchObject({ visibility: "visible", active: true });
  });

  it("preserves fullscreen through minimize and restore", () => {
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
    const minimizing = reduceWindow(
      apply(initialSingleWindowState, { type: "TOGGLE_FULLSCREEN" }),
      { type: "ACTIVATE_FROM_DOCK" },
    );
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
});

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
    generation: fc.nat(100),
    destination: fc.constantFrom("minimized" as const, "visible" as const),
  }),
);

const activationArbitrary = fc.constantFrom<WindowEvent>(
  { type: "LAUNCH" },
  { type: "ACTIVATE_FROM_DOCK" },
  { type: "ACTIVATE_FROM_MENU" },
);

describe("single-window lifecycle properties", () => {
  it("preserves lifecycle invariants and typed effect contracts for arbitrary streams", () => {
    fc.assert(
      fc.property(fc.array(eventArbitrary, { maxLength: 100 }), (events) => {
        let state = initialSingleWindowState;
        for (const event of events) {
          const previous = state;
          const reduction = reduceWindow(state, event);
          state = reduction.state;

          expect(["closed", "open"]).toContain(state.presence);
          expect(["visible", "minimizing", "minimized", "restoring"]).toContain(state.visibility);
          expect(state.generation).toBeGreaterThanOrEqual(previous.generation);
          expect(state.focusEpoch).toBeGreaterThanOrEqual(previous.focusEpoch);
          expect(state.focusEpoch - previous.focusEpoch).toBeLessThanOrEqual(1);
          if (state.presence === "closed") {
            expect(state).toMatchObject({ visibility: "visible", active: false, fullscreen: false });
          }
          for (const effect of reduction.effects) {
            expect(effect.generation).toBe(state.generation);
            if (effect.type === "FOCUS") expect(effect.epoch).toBe(state.focusEpoch);
          }
        }
      }),
    );
  });

  it("ignores every stale completion after arbitrary event histories", () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { maxLength: 80 }),
        fc.constantFrom("minimized" as const, "visible" as const),
        fc.integer({ min: 1, max: 100 }),
        (events, destination, distance) => {
          const state = apply(initialSingleWindowState, ...events);
          const staleGeneration = state.generation + distance;
          const reduction = reduceWindow(state, {
            type: "TRANSITION_SETTLED",
            generation: staleGeneration,
            destination,
          });
          expect(reduction.state).toBe(state);
          expect(reduction.effects).toEqual([]);
        },
      ),
    );
  });

  it("makes the latest activation generation win over minimize completion", () => {
    fc.assert(
      fc.property(activationArbitrary, (activation) => {
        const minimizing = reduceWindow(initialSingleWindowState, { type: "MINIMIZE" });
        const restoring = reduceWindow(minimizing.state, activation);
        const stale = reduceWindow(restoring.state, {
          type: "TRANSITION_SETTLED",
          generation: minimizing.state.generation,
          destination: "minimized",
        });
        const settled = reduceWindow(stale.state, {
          type: "TRANSITION_SETTLED",
          generation: restoring.state.generation,
          destination: "visible",
        });

        expect(stale.state).toBe(restoring.state);
        expect(settled.state).toMatchObject({ visibility: "visible", active: true });
        expect(settled.effects).toEqual([{
          type: "FOCUS",
          generation: restoring.state.generation,
          epoch: restoring.state.focusEpoch,
        }]);
      }),
    );
  });

  it("relaunches exactly one clean instance regardless of stale requests", () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { maxLength: 40 }),
        activationArbitrary,
        (events, activation) => {
          const beforeClose = apply(initialSingleWindowState, ...events);
          const closed = reduceWindow(beforeClose, { type: "CLOSE" }).state;
          const reopened = reduceWindow(closed, activation);

          expect(reopened.state).toEqual({
            generation: closed.generation + 1,
            presence: "open",
            visibility: "visible",
            active: true,
            fullscreen: false,
            focusEpoch: closed.focusEpoch + 1,
          });
          expect(reopened.effects).toEqual([{
            type: "FOCUS",
            generation: reopened.state.generation,
            epoch: reopened.state.focusEpoch,
          }]);
        },
      ),
    );
  });

  it("preserves fullscreen across every minimize, reversal, and settle path", () => {
    fc.assert(
      fc.property(fc.boolean(), activationArbitrary, (fullscreen, activation) => {
        const start = fullscreen
          ? apply(initialSingleWindowState, { type: "TOGGLE_FULLSCREEN" })
          : initialSingleWindowState;
        const minimizing = reduceWindow(start, { type: "MINIMIZE" });
        const restoring = reduceWindow(minimizing.state, activation);
        const visible = reduceWindow(restoring.state, {
          type: "TRANSITION_SETTLED",
          generation: restoring.state.generation,
          destination: "visible",
        });

        expect(minimizing.state.fullscreen).toBe(fullscreen);
        expect(restoring.state.fullscreen).toBe(fullscreen);
        expect(visible.state.fullscreen).toBe(fullscreen);
      }),
    );
  });

  it("advances focus epochs only for focus requests and restore activations", () => {
    fc.assert(
      fc.property(fc.array(eventArbitrary, { maxLength: 100 }), (events) => {
        let state = initialSingleWindowState;
        for (const event of events) {
          const reduction = reduceWindow(state, event);
          const epochAdvanced = reduction.state.focusEpoch === state.focusEpoch + 1;
          const startedRestore = reduction.effects.some(
            (effect) => effect.type === "START_TRANSITION" && effect.direction === "restore",
          );
          const requestedNewFocus = reduction.effects.some(
            (effect) => effect.type === "FOCUS" && effect.epoch === state.focusEpoch + 1,
          );

          expect(epochAdvanced).toBe(startedRestore || requestedNewFocus);
          state = reduction.state;
        }
      }),
    );
  });
});
