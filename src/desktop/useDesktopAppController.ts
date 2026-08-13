import { useCallback, useReducer } from "react";
import type { AppId, DesktopAppDescriptor } from "./apps";
import {
  initialSingleWindowState,
  reduceWindow,
  type SingleWindowState,
  type WindowEffect,
  type WindowEvent,
} from "../windows/singleWindowMachine";

type AppControllerState = Readonly<{
  window: SingleWindowState;
  pendingEffects: readonly WindowEffect[];
}>;

type DesktopControllerState = Readonly<Record<AppId, AppControllerState>>;

type DesktopControllerAction =
  | { type: "EVENT"; appId: AppId; event: WindowEvent; exclusive: boolean }
  | { type: "DESKTOP_POINTER" }
  | { type: "CONSUME_EFFECTS"; appId: AppId; count: number };

const closedWindowState: SingleWindowState = {
  ...initialSingleWindowState,
  presence: "closed",
  active: false,
};

function initializeControllers(apps: readonly DesktopAppDescriptor[], defaultAppId: AppId) {
  return Object.fromEntries(
    apps.map((app) => [
      app.id,
      { window: app.id === defaultAppId ? initialSingleWindowState : closedWindowState, pendingEffects: [] },
    ]),
  ) as DesktopControllerState;
}

function applyEvent(controller: AppControllerState, event: WindowEvent): AppControllerState {
  const reduction = reduceWindow(controller.window, event);
  if (reduction.state === controller.window && reduction.effects.length === 0) return controller;
  return {
    window: reduction.state,
    pendingEffects: [...controller.pendingEffects, ...reduction.effects],
  };
}

function reduceControllers(state: DesktopControllerState, action: DesktopControllerAction) {
  if (action.type === "DESKTOP_POINTER") {
    return Object.fromEntries(
      Object.entries(state).map(([id, controller]) => [id, applyEvent(controller, { type: "DESKTOP_POINTER" })]),
    ) as DesktopControllerState;
  }
  if (action.type === "CONSUME_EFFECTS") {
    const controller = state[action.appId];
    return {
      ...state,
      [action.appId]: { ...controller, pendingEffects: controller.pendingEffects.slice(action.count) },
    };
  }

  const next = action.exclusive
    ? (Object.fromEntries(
        Object.entries(state).map(([id, controller]) => [
          id,
          id === action.appId ? controller : applyEvent(controller, { type: "DESKTOP_POINTER" }),
        ]),
      ) as DesktopControllerState)
    : state;
  return { ...next, [action.appId]: applyEvent(next[action.appId], action.event) };
}

export function useDesktopAppController(apps: readonly DesktopAppDescriptor[], defaultAppId: AppId) {
  const [controllers, dispatchController] = useReducer(
    reduceControllers,
    undefined,
    () => initializeControllers(apps, defaultAppId),
  );
  const dispatch = useCallback((appId: AppId, event: WindowEvent, exclusive = false) => {
    dispatchController({ type: "EVENT", appId, event, exclusive });
  }, []);
  const desktopPointer = useCallback(() => dispatchController({ type: "DESKTOP_POINTER" }), []);
  const effectsConsumed = useCallback((appId: AppId, count: number) => {
    dispatchController({ type: "CONSUME_EFFECTS", appId, count });
  }, []);

  return { controllers, dispatch, desktopPointer, effectsConsumed };
}
