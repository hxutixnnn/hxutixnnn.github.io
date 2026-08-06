import { appById } from "./catalog";
import type { AppId, AppWindowManifest, CoreAppId, EmbeddedWindowManifest, WindowManifest } from "./contract";
import { coreLoaders } from "./loaders";

const base = {
  singleton: true,
  mobile: "fullscreen",
  resizable: true,
  min: { width: 360, height: 280 },
  commands: ["close", "minimize", "maximize", "document"],
} as const;

export const appManifests = {
  about: {
    ...base,
    id: "about",
    title: "About",
    initial: { width: 620, height: 510 },
    load: coreLoaders.about,
  },
  projects: {
    ...base,
    id: "projects",
    title: "Projects",
    initial: { width: 720, height: 560 },
    load: coreLoaders.projects,
  },
  blog: {
    ...base,
    id: "blog",
    title: "Blog",
    initial: { width: 680, height: 560 },
    load: coreLoaders.blog,
  },
  uses: {
    ...base,
    id: "uses",
    title: "Uses",
    initial: { width: 640, height: 540 },
    load: coreLoaders.uses,
  },
  resources: {
    ...base,
    id: "resources",
    title: "Resources",
    initial: { width: 620, height: 500 },
    load: coreLoaders.resources,
  },
  til: {
    ...base,
    id: "til",
    title: "Today I Learned",
    initial: { width: 620, height: 500 },
    load: coreLoaders.til,
  },
  airconsole: {
    ...base,
    id: "airconsole",
    title: "Relay Arcade",
    initial: { width: 780, height: 640 },
    min: { width: 360, height: 470 },
    load: coreLoaders.airconsole,
  },
} satisfies Record<CoreAppId, AppWindowManifest>;

export const embeddedAppManifest = {
  id: "embedded",
  title: "Project",
  singleton: true,
  mobile: "fullscreen",
  resizable: true,
  initial: { width: 860, height: 620 },
  min: { width: 360, height: 280 },
  commands: ["close", "minimize", "maximize", "document"],
} satisfies EmbeddedWindowManifest;

export function getAppWindowManifest(appId: AppId): WindowManifest | undefined {
  const app = appById.get(appId);
  if (app?.target?.kind === "core") return appManifests[app.target.loaderKey];
  if (app?.target?.kind === "embedded") return embeddedAppManifest;
  return undefined;
}
