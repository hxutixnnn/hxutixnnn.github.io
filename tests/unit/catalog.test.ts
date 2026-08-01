import { describe, expect, it } from "vitest";
import { appCatalogue, coreCatalogue, externalCatalogue } from "@/apps/catalog";
import { coreLoaders } from "@/apps/loaders";

it("keeps catalogue routes, IDs, and compile-time loaders in sync", () => {
  expect(new Set(appCatalogue.map((app) => app.id)).size).toBe(appCatalogue.length);
  expect(new Set(appCatalogue.map((app) => app.route)).size).toBe(appCatalogue.length);
  expect(coreCatalogue.map((app) => app.id).sort()).toEqual(Object.keys(coreLoaders).sort());
  for (const app of appCatalogue) expect(app.route).toBe(`/apps/${app.id}/`);
});

describe("external app trust boundary", () => {
  it("uses reviewed HTTPS new-tab targets with exact origins", () => {
    expect(externalCatalogue).toHaveLength(3);
    for (const app of externalCatalogue) {
      expect(app.target.presentation).toBe("new-tab");
      expect(new URL(app.target.url).protocol).toBe("https:");
      expect(new URL(app.target.url).origin).toBe(app.target.allowedOrigin);
    }
  });
});
