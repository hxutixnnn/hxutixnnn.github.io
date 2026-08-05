import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import baseCatalog from "../src/apps/catalog.json" with { type: "json" };
import repositories from "../src/apps/repositories.json" with { type: "json" };
import socialProfiles from "../src/apps/social-links.json" with { type: "json" };
import { mapRepositoriesToApps, mapSocialProfilesToApps } from "../src/apps/catalog-mapping.mjs";
import { repositoryCatalogConfig } from "../src/apps/catalog.config.mjs";

const coreIds = ["about", "projects", "blog", "uses", "resources", "til"];
const iconNames = [
  "person",
  "projects",
  "blog",
  "tools",
  "resources",
  "idea",
  "image",
  "music",
  "car",
  "code",
  "github",
  "linkedin",
  "twitter",
  "facebook",
  "instagram",
];
const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:", "must use HTTPS");
const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("core"), loaderKey: z.enum(coreIds) }).strict(),
  z
    .object({
      kind: z.literal("external"),
      url: httpsUrl,
      presentation: z.literal("new-tab"),
      allowedOrigin: httpsUrl,
    })
    .strict(),
]);
const appSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["active", "retired"]),
    category: z.enum(["system", "project", "social"]),
    name: z.string().min(1).max(60),
    summary: z.string().min(20).max(240),
    route: z.string().regex(/^\/apps\/[a-z0-9-]+\/$/),
    documentRoute: z
      .string()
      .regex(/^\/[a-z0-9-]+\/$/)
      .optional(),
    icon: z.enum(iconNames),
    owner: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    source: httpsUrl.optional(),
    target: targetSchema.optional(),
  })
  .strict();

const file = resolve(import.meta.dirname, "../src/apps/catalog.json");
await readFile(file, "utf8");
const catalogue = z
  .array(appSchema)
  .min(1)
  .parse([
    ...baseCatalog,
    ...mapRepositoriesToApps(repositories, repositoryCatalogConfig),
    ...mapSocialProfilesToApps(socialProfiles, repositoryCatalogConfig.displayOwner),
  ]);
const ids = new Set();
const routes = new Set();
for (const app of catalogue) {
  if (ids.has(app.id)) throw new Error(`Duplicate app ID: ${app.id}`);
  if (routes.has(app.route)) throw new Error(`Duplicate app route: ${app.route}`);
  ids.add(app.id);
  routes.add(app.route);
  if (app.route !== `/apps/${app.id}/`) throw new Error(`App route does not match ID: ${app.id}`);
  if (app.status === "active" && !app.target) throw new Error(`Active app has no target: ${app.id}`);
  if (app.target?.kind === "core") {
    if (app.target.loaderKey !== app.id) throw new Error(`Core loader key must match ID: ${app.id}`);
    if (!app.documentRoute) throw new Error(`Core app needs a document route: ${app.id}`);
  }
  if (app.target?.kind === "external") {
    const url = new URL(app.target.url);
    const allowedOrigin = new URL(app.target.allowedOrigin);
    if (url.username || url.password) throw new Error(`External URL contains credentials: ${app.id}`);
    if (url.origin !== allowedOrigin.origin || allowedOrigin.pathname !== "/")
      throw new Error(`Allowed origin mismatch: ${app.id}`);
  }
}
for (const coreId of coreIds) {
  if (!catalogue.some((app) => app.id === coreId && app.target?.kind === "core"))
    throw new Error(`Missing core app: ${coreId}`);
}
const repositoryNames = new Set();
for (const repository of repositories) {
  if (
    repository.owner !== repositoryCatalogConfig.owner ||
    repository.private !== false ||
    repository.visibility !== "public"
  ) {
    throw new Error(`Repository inventory contains an unrelated or non-public entry: ${repository.fullName}`);
  }
  if (repositoryNames.has(repository.fullName))
    throw new Error(`Duplicate repository: ${repository.fullName}`);
  repositoryNames.add(repository.fullName);
}
const excludedNames = new Set(Object.keys(repositoryCatalogConfig.excludedRepositories));
for (const repository of repositories) {
  const represented = catalogue.some((app) => app.source === repository.htmlUrl);
  if (represented === excludedNames.has(repository.name)) {
    throw new Error(`Repository representation mismatch: ${repository.fullName}`);
  }
}
for (const profile of socialProfiles) {
  if (!catalogue.some((app) => app.category === "social" && app.target?.url === profile.url))
    throw new Error(`Missing social app: ${profile.name}`);
}
console.log(
  `App catalogue verified: ${catalogue.length} apps (${repositories.length} public repositories, ${socialProfiles.length} social profiles, ${coreIds.length} compile-time core loaders).`,
);
