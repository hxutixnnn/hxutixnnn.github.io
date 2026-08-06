import baseCatalogData from "./catalog.json";
import repositoryData from "./repositories.json";
import socialProfileData from "./social-links.json";
import { mapRepositoriesToApps, mapSocialProfilesToApps } from "./catalog-mapping.mjs";
import { repositoryCatalogConfig } from "./catalog.config.mjs";
import type { AppDescriptor, AppId, CoreAppId, EmbeddedTarget, ExternalTarget } from "./contract";
import type { RepositoryInventoryItem, SocialProfile } from "./catalog-mapping.mjs";

const generatedRepositoryApps = mapRepositoriesToApps(
  repositoryData as RepositoryInventoryItem[],
  repositoryCatalogConfig,
);
const generatedSocialApps = mapSocialProfilesToApps(
  socialProfileData as SocialProfile[],
  repositoryCatalogConfig.displayOwner,
);

export const appCatalogue = [
  ...(baseCatalogData as AppDescriptor[]),
  ...generatedRepositoryApps,
  ...generatedSocialApps,
] as readonly AppDescriptor[];

export const appById = new Map<AppId, AppDescriptor>(appCatalogue.map((app) => [app.id, app] as const));

export const coreCatalogue = appCatalogue.filter(
  (app): app is AppDescriptor & { id: CoreAppId; target: { kind: "core"; loaderKey: CoreAppId } } =>
    app.target?.kind === "core",
);

export const embeddedCatalogue = appCatalogue.filter(
  (app): app is AppDescriptor & { target: EmbeddedTarget } => app.target?.kind === "embedded",
);

export const externalCatalogue = appCatalogue.filter(
  (app): app is AppDescriptor & { target: ExternalTarget } => app.target?.kind === "external",
);

export const projectCatalogue = appCatalogue.filter(
  (app): app is AppDescriptor & { category: "project"; target: EmbeddedTarget } =>
    app.category === "project" && app.target?.kind === "embedded",
);
export const socialCatalogue = externalCatalogue.filter((app) => app.category === "social");

export function getApp(id: string): AppDescriptor | undefined {
  return appById.get(id);
}
