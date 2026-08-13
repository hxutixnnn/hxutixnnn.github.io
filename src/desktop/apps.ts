import type { ComponentType } from "react";
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
  icon: FontAwesomeIconName;
  Window: ComponentType<DesktopAppWindowProps>;
}>;

export const desktopApps = [
  {
    id: "system-settings",
    name: "System Settings",
    icon: "gear",
    Window: SystemSettingsApp,
  },
] as const satisfies readonly DesktopAppDescriptor[];

export const defaultDesktopApp = desktopApps[0];

export function findDesktopApp(id: AppId): DesktopAppDescriptor | undefined {
  return desktopApps.find((app) => app.id === id);
}
