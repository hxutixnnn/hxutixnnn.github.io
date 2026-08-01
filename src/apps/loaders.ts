import type { CoreAppId, CoreAppModule } from "./contract";

export const coreLoaders: Record<CoreAppId, () => Promise<CoreAppModule>> = {
  about: () => import("./core/AboutApp"),
  projects: () => import("./core/ProjectsApp"),
  blog: () => import("./core/BlogApp"),
  uses: () => import("./core/UsesApp"),
  resources: () => import("./core/ResourcesApp"),
  til: () => import("./core/TilApp"),
};
