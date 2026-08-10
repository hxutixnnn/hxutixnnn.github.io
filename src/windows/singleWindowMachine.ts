export type WindowPresence = "closed" | "open";
export type WindowVisibility = "visible" | "minimizing" | "minimized" | "restoring";
export type WindowTransitionDirection = "minimize" | "restore";
export type WindowTransitionDestination = "minimized" | "visible";

export type SingleWindowState = {
  generation: number;
  presence: WindowPresence;
  visibility: WindowVisibility;
  active: boolean;
  fullscreen: boolean;
  focusEpoch: number;
};

export type WindowEvent =
  | { type: "LAUNCH" }
  | { type: "ACTIVATE_FROM_DOCK" }
  | { type: "ACTIVATE_FROM_MENU" }
  | { type: "DESKTOP_POINTER" }
  | { type: "WINDOW_INTERACTION" }
  | { type: "CLOSE" }
  | { type: "MINIMIZE" }
  | { type: "TOGGLE_FULLSCREEN" }
  | {
      type: "TRANSITION_SETTLED";
      generation: number;
      destination: WindowTransitionDestination;
    };

export type WindowEffect =
  | { type: "FOCUS"; generation: number; epoch: number }
  | {
      type: "START_TRANSITION";
      generation: number;
      direction: WindowTransitionDirection;
      defer?: boolean;
    }
  | { type: "CANCEL_TRANSITION"; generation: number };

export type WindowReduction = {
  state: SingleWindowState;
  effects: readonly WindowEffect[];
};

export const initialSingleWindowState: SingleWindowState = {
  generation: 0,
  presence: "open",
  visibility: "visible",
  active: true,
  fullscreen: false,
  focusEpoch: 0,
};

function unchanged(state: SingleWindowState): WindowReduction {
  return { state, effects: [] };
}

function nextGeneration(state: SingleWindowState) {
  return state.generation + 1;
}

function focus(state: SingleWindowState): WindowReduction {
  const epoch = state.focusEpoch + 1;
  return {
    state: { ...state, active: true, focusEpoch: epoch },
    effects: [{ type: "FOCUS", generation: state.generation, epoch }],
  };
}

function startTransition(
  state: SingleWindowState,
  visibility: WindowVisibility,
  direction: WindowTransitionDirection,
  cancel = false,
  defer = false,
): WindowReduction {
  const generation = nextGeneration(state);
  const effects: WindowEffect[] = [];
  if (cancel) effects.push({ type: "CANCEL_TRANSITION", generation });
  effects.push({ type: "START_TRANSITION", generation, direction, ...(defer ? { defer: true } : {}) });
  return {
    state: { ...state, visibility, generation },
    effects,
  };
}

function restore(state: SingleWindowState): WindowReduction {
  return startTransition(
    { ...state, active: true, focusEpoch: state.focusEpoch + 1 },
    "restoring",
    "restore",
    true,
  );
}

function minimize(state: SingleWindowState, defer = false): WindowReduction {
  return startTransition({ ...state, active: false }, "minimizing", "minimize", false, defer);
}

function activate(state: SingleWindowState): WindowReduction {
  if (state.visibility === "minimizing" || state.visibility === "minimized") return restore(state);
  if (state.visibility === "restoring") return unchanged(state);
  return focus(state);
}

function launch(state: SingleWindowState): WindowReduction {
  if (state.presence === "open") return activate(state);
  const generation = nextGeneration(state);
  const epoch = state.focusEpoch + 1;
  return {
    state: {
      generation,
      presence: "open",
      visibility: "visible",
      active: true,
      fullscreen: false,
      focusEpoch: epoch,
    },
    effects: [{ type: "FOCUS", generation, epoch }],
  };
}

export function reduceWindow(state: SingleWindowState, event: WindowEvent): WindowReduction {
  if (event.type === "TRANSITION_SETTLED") {
    if (event.generation !== state.generation || state.presence !== "open") return unchanged(state);
    if (event.destination === "minimized" && state.visibility === "minimizing") {
      return { state: { ...state, visibility: "minimized", active: false }, effects: [] };
    }
    if (event.destination === "visible" && state.visibility === "restoring") {
      return {
        state: { ...state, visibility: "visible", active: true },
        effects: [{ type: "FOCUS", generation: state.generation, epoch: state.focusEpoch }],
      };
    }
    return unchanged(state);
  }

  if (event.type === "CLOSE") {
    if (state.presence === "closed") return unchanged(state);
    return {
      state: {
        ...state,
        generation: nextGeneration(state),
        presence: "closed",
        visibility: "visible",
        active: false,
        fullscreen: false,
      },
      effects: [],
    };
  }

  if (state.presence === "closed") {
    return event.type === "LAUNCH" ||
      event.type === "ACTIVATE_FROM_MENU" ||
      event.type === "ACTIVATE_FROM_DOCK"
      ? launch(state)
      : unchanged(state);
  }

  switch (event.type) {
    case "LAUNCH":
    case "ACTIVATE_FROM_MENU":
      return activate(state);
    case "ACTIVATE_FROM_DOCK":
      if (state.visibility === "visible" && state.active) return minimize(state, true);
      if (state.visibility === "minimizing" || state.visibility === "minimized") return restore(state);
      if (state.visibility === "restoring") return unchanged(state);
      return focus(state);
    case "DESKTOP_POINTER":
      return state.active ? { state: { ...state, active: false }, effects: [] } : unchanged(state);
    case "WINDOW_INTERACTION":
      return state.visibility === "visible" && !state.active
        ? { state: { ...state, active: true }, effects: [] }
        : unchanged(state);
    case "MINIMIZE":
      if (state.visibility === "visible") return minimize(state);
      if (state.visibility === "restoring") return minimize(state);
      return unchanged(state);
    case "TOGGLE_FULLSCREEN":
      return {
        state: { ...state, active: true, fullscreen: !state.fullscreen },
        effects: [],
      };
  }
}

export const reduceSingleWindow = reduceWindow;
