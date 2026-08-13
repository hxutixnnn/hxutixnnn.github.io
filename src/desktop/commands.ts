import type { AppId } from "./apps";

export type DesktopCommand =
  | { type: "activate-app"; appId: AppId }
  | {
      type:
        | "about-this-os"
        | "app-store"
        | "force-quit"
        | "sleep"
        | "restart"
        | "shut-down"
        | "lock-screen"
        | "about-navigator"
        | "navigator-preferences"
        | "hide-navigator";
    };
