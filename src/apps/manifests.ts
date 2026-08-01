import type { AppWindowManifest, CoreAppId } from "./contract";
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
} satisfies Record<CoreAppId, AppWindowManifest>;
