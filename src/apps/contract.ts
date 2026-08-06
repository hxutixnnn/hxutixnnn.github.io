import type { ComponentType } from "react";

export type CoreAppId = "about" | "projects" | "blog" | "uses" | "resources" | "til" | "airconsole";
export type ExternalAppId = string;
export type AppId = string;
export type IconName =
  | "person"
  | "projects"
  | "blog"
  | "tools"
  | "resources"
  | "idea"
  | "game"
  | "image"
  | "music"
  | "car"
  | "code"
  | "github"
  | "linkedin"
  | "twitter"
  | "facebook"
  | "instagram";

export type CoreAppProps = {
  appId: CoreAppId;
  announce: (message: string) => void;
  navigate: (url: string) => void;
  openApp?: (appId: AppId) => void;
  openExternal: (url: string) => void;
};

export type CoreAppModule = { default: ComponentType<CoreAppProps> };

export type CoreTarget = {
  kind: "core";
  loaderKey: CoreAppId;
};

export type EmbeddedTarget = {
  kind: "embedded";
  url: `https://${string}`;
  presentation: "embedded";
  allowedOrigin: `https://${string}`;
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
  category: "system" | "project" | "social";
  name: string;
  summary: string;
  route: `/apps/${string}/`;
  documentRoute?: `/${string}/`;
  icon: IconName;
  owner: string;
  tags: readonly string[];
  source?: `https://github.com/${string}`;
  target?: CoreTarget | EmbeddedTarget | ExternalTarget;
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

export type EmbeddedWindowManifest = {
  id: "embedded";
  title: string;
  singleton: true;
  mobile: "fullscreen";
  resizable: true;
  initial: { width: number; height: number };
  min: { width: number; height: number };
  commands: readonly ("close" | "minimize" | "maximize" | "document")[];
};

export type WindowManifest = AppWindowManifest | EmbeddedWindowManifest;
