import catalogData from "./catalog.json";
import type { AppDescriptor, AppId, CoreAppId } from "./contract";

export const appCatalogue = catalogData as readonly AppDescriptor[];

export const appById = new Map<AppId, AppDescriptor>(appCatalogue.map((app) => [app.id, app] as const));

export const coreCatalogue = appCatalogue.filter(
  (app): app is AppDescriptor & { id: CoreAppId; target: { kind: "core"; loaderKey: CoreAppId } } =>
    app.target?.kind === "core",
);

export const externalCatalogue = appCatalogue.filter(
  (app): app is AppDescriptor & { target: Extract<AppDescriptor["target"], { kind: "external" }> } =>
    app.target?.kind === "external",
);

export function getApp(id: string): AppDescriptor | undefined {
  return appById.get(id as AppId);
}
