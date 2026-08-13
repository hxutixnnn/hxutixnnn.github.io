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
  ownsDockStatus?: boolean;
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
    ownsDockStatus: true,
    Window: SystemSettingsApp,
  },
  {
    id: "calculator",
    name: "Calculator",
    icon: "display",
    iconText: "123",
    Window: CalculatorApp,
  },
] as const satisfies readonly DesktopAppDescriptor[];

export const defaultDesktopApp = desktopApps[0];

export function findDesktopApp(id: AppId): DesktopAppDescriptor | undefined {
  return desktopApps.find((app) => app.id === id);
}
