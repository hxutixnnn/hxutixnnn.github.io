import { lazy, type ComponentType } from "react";
import { SystemSettingsApp } from "../apps/system-settings/SystemSettingsApp";
import type { FontAwesomeIconName } from "../components/FontAwesomeIcon";
import type { Rect, Workspace } from "../windows/geometry";
import type { SingleWindowState, WindowEffect, WindowEvent } from "../windows/singleWindowMachine";

export type AppId = string;

export type DesktopAppWindowProps = Readonly<{
  appId: AppId;
  frontmost: boolean;
  windowState: SingleWindowState;
  effects: readonly WindowEffect[];
  onEffectsConsumed(): void;
  onEvent(event: WindowEvent): void;
  workspace: Workspace;
  dockTargetRectProvider(): Rect | null;
}>;

/** Static app metadata projected by the shell into launch surfaces and a window host. */
export type DesktopAppDescriptor = Readonly<{
  id: AppId;
  name: string;
  menuName?: string;
  icon: FontAwesomeIconName;
  iconText?: string;
  iconClassName?: string;
  Window: ComponentType<DesktopAppWindowProps>;
}>;

const CalculatorApp = lazy(async () => {
  const module = await import("../apps/calculator/CalculatorApp");
  return { default: module.CalculatorApp };
});

export const desktopApps = [
  {
    id: "system-settings",
    name: "System Settings",
    menuName: "Navigator",
    icon: "gear",
    Window: SystemSettingsApp,
  },
  {
    id: "notes",
    name: "Notes",
    icon: "bars",
    Window: lazy(() => import("../apps/notes/NotesApp").then(({ NotesApp }) => ({ default: NotesApp }))),
  },
  {
    id: "calculator",
    name: "Calculator",
    icon: "display",
    iconText: "123",
    Window: CalculatorApp,
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: "calendar-days",
    iconClassName: "bg-[linear-gradient(#fff_0_28%,#ff3b30_28%)] text-white",
    Window: lazy(() =>
      import("../apps/calendar/CalendarApp").then(({ CalendarApp }) => ({ default: CalendarApp })),
    ),
  },
] as const satisfies readonly DesktopAppDescriptor[];

export const defaultDesktopApp = desktopApps[0];

export function findDesktopApp(id: AppId): DesktopAppDescriptor | undefined {
  return desktopApps.find((app) => app.id === id);
}
