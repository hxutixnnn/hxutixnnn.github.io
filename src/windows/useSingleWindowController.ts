import { useCallback, useLayoutEffect, useReducer } from "react";
import {
  initialSingleWindowState,
  reduceWindow,
  type SingleWindowState,
  type WindowEffect,
  type WindowEvent,
} from "./singleWindowMachine";

export type SingleWindowControllerOptions = {
  initialState?: SingleWindowState;
  onEffect?: (effect: WindowEffect) => void;
};

type ControllerAction = { type: "EVENT"; event: WindowEvent } | { type: "CONSUME_EFFECTS"; count: number };

type ControllerState = {
  window: SingleWindowState;
  pendingEffects: readonly WindowEffect[];
};

function reduceController(state: ControllerState, action: ControllerAction): ControllerState {
  if (action.type === "CONSUME_EFFECTS") {
    return { ...state, pendingEffects: state.pendingEffects.slice(action.count) };
  }
  const reduction = reduceWindow(state.window, action.event);
  if (reduction.state === state.window && reduction.effects.length === 0) return state;
  return {
    window: reduction.state,
    pendingEffects: [...state.pendingEffects, ...reduction.effects],
  };
}

export function useSingleWindowController({
  initialState = initialSingleWindowState,
  onEffect,
}: SingleWindowControllerOptions = {}) {
  const [controller, dispatchController] = useReducer(reduceController, {
    window: initialState,
    pendingEffects: [],
  });

  const dispatch = useCallback((event: WindowEvent) => {
    dispatchController({ type: "EVENT", event });
  }, []);

  useLayoutEffect(() => {
    if (controller.pendingEffects.length === 0) return;
    for (const effect of controller.pendingEffects) onEffect?.(effect);
    dispatchController({ type: "CONSUME_EFFECTS", count: controller.pendingEffects.length });
  }, [controller.pendingEffects, onEffect]);

  return { state: controller.window, dispatch };
}
