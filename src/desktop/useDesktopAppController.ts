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

type DesktopControllerState = Readonly<{
  controllers: Readonly<Record<AppId, AppControllerState>>;
  frontmostAppId: AppId;
}>;

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
  return {
    controllers: Object.fromEntries(
      apps.map((app) => [
        app.id,
        { window: app.id === defaultAppId ? initialSingleWindowState : closedWindowState, pendingEffects: [] },
      ]),
    ),
    frontmostAppId: defaultAppId,
  } as DesktopControllerState;
}

function applyEvent(controller: AppControllerState, event: WindowEvent): AppControllerState {
  if (
    controller.window.visibility === "restoring" &&
    !controller.window.active &&
    (event.type === "ACTIVATE_FROM_DOCK" ||
      event.type === "ACTIVATE_FROM_MENU" ||
      event.type === "WINDOW_INTERACTION")
  ) {
    return { ...controller, window: { ...controller.window, active: true } };
  }
  const reduction = reduceWindow(controller.window, event);
  if (reduction.state === controller.window && reduction.effects.length === 0) return controller;
  const preserveInactiveRestore =
    event.type === "TRANSITION_SETTLED" && event.destination === "visible" && !controller.window.active;
  return {
    window: preserveInactiveRestore ? { ...reduction.state, active: false } : reduction.state,
    pendingEffects: [
      ...controller.pendingEffects,
      ...reduction.effects.filter((effect) => !preserveInactiveRestore || effect.type !== "FOCUS"),
    ],
  };
}

function reduceControllers(state: DesktopControllerState, action: DesktopControllerAction) {
  if (action.type === "DESKTOP_POINTER") {
    return {
      ...state,
      controllers: Object.fromEntries(
        Object.entries(state.controllers).map(([id, controller]) => [
          id,
          applyEvent(controller, { type: "DESKTOP_POINTER" }),
        ]),
      ),
    };
  }
  if (action.type === "CONSUME_EFFECTS") {
    const controller = state.controllers[action.appId];
    return {
      ...state,
      controllers: {
        ...state.controllers,
        [action.appId]: { ...controller, pendingEffects: controller.pendingEffects.slice(action.count) },
      },
    };
  }

  const next = action.exclusive
    ? (Object.fromEntries(
        Object.entries(state.controllers).map(([id, controller]) => [
          id,
          id === action.appId ? controller : applyEvent(controller, { type: "DESKTOP_POINTER" }),
        ]),
      ) as DesktopControllerState["controllers"])
    : state.controllers;
  const controllers = { ...next, [action.appId]: applyEvent(next[action.appId], action.event) };
  const target = controllers[action.appId];
  return {
    controllers,
    frontmostAppId:
      action.exclusive && target.window.presence === "open"
        ? action.appId
        : state.frontmostAppId === action.appId && target.window.presence === "closed"
          ? (Object.entries(controllers).find(([, controller]) => controller.window.active)?.[0] ??
            state.frontmostAppId)
          : state.frontmostAppId,
  };
}

export function useDesktopAppController(apps: readonly DesktopAppDescriptor[], defaultAppId: AppId) {
  const [state, dispatchController] = useReducer(
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

  return { ...state, dispatch, desktopPointer, effectsConsumed };
}
