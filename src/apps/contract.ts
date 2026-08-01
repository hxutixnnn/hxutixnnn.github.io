import type { ComponentType } from "react";

export type CoreAppId = "about" | "projects" | "blog" | "uses" | "resources" | "til";
export type ExternalAppId = "image-restoration" | "karaoke-player" | "car-rental";
export type AppId = CoreAppId | ExternalAppId;
export type IconName =
  "person" | "projects" | "blog" | "tools" | "resources" | "idea" | "image" | "music" | "car";

export type CoreAppProps = {
  appId: CoreAppId;
  announce: (message: string) => void;
  navigate: (url: string) => void;
  openExternal: (url: string) => void;
};

export type CoreAppModule = { default: ComponentType<CoreAppProps> };

export type CoreTarget = {
  kind: "core";
  loaderKey: CoreAppId;
};

export type ExternalTarget = {
  kind: "external";
  url: `https://${string}`;
  presentation: "new-tab";
  allowedOrigin: `https://${string}`;
};

export type AppDescriptor = {
  schemaVersion: 1;
  id: AppId;
  status: "active" | "retired";
  name: string;
  summary: string;
  route: `/apps/${string}/`;
  documentRoute?: `/${string}/`;
  icon: IconName;
  owner: string;
  tags: readonly string[];
  source?: `https://github.com/${string}`;
  target?: CoreTarget | ExternalTarget;
};

export type AppWindowManifest = {
  id: CoreAppId;
  title: string;
  singleton: true;
  mobile: "fullscreen" | "document";
  resizable: boolean;
  initial: { width: number; height: number };
  min: { width: number; height: number };
  commands: readonly ("close" | "minimize" | "maximize" | "document")[];
  load: () => Promise<CoreAppModule>;
};
