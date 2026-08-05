import { describe, expect, it } from "vitest";
import {
  appCatalogue,
  coreCatalogue,
  externalCatalogue,
  projectCatalogue,
  socialCatalogue,
} from "@/apps/catalog";
import { coreLoaders } from "@/apps/loaders";
import repositories from "@/apps/repositories.json";
import socialProfiles from "@/apps/social-links.json";

it("keeps catalogue routes, IDs, and compile-time loaders in sync", () => {
  expect(new Set(appCatalogue.map((app) => app.id)).size).toBe(appCatalogue.length);
  expect(new Set(appCatalogue.map((app) => app.route)).size).toBe(appCatalogue.length);
  expect(coreCatalogue.map((app) => app.id).sort()).toEqual(Object.keys(coreLoaders).sort());
  for (const app of appCatalogue) expect(app.route).toBe(`/apps/${app.id}/`);
});

describe("generated portfolio apps", () => {
  it("represents every public repository except the portfolio system surface", () => {
    const representedSources = new Set<string>(
      projectCatalogue
        .map((app) => app.source)
        .filter((source): source is NonNullable<typeof source> => Boolean(source)),
    );
    for (const repository of repositories) {
      expect(representedSources.has(repository.htmlUrl)).toBe(repository.name !== "hxutixnnn.github.io");
    }
  });

  it("represents every published social profile exactly once and no email address", () => {
    expect(socialCatalogue).toHaveLength(socialProfiles.length);
    expect(socialCatalogue.map((app) => app.target.url).sort()).toEqual(
      socialProfiles.map((profile) => profile.url).sort(),
    );
    expect(JSON.stringify(socialCatalogue)).not.toContain("mailto:");
    expect(JSON.stringify(socialCatalogue)).not.toContain("@");
  });
});

describe("external app trust boundary", () => {
  it("uses reviewed HTTPS new-tab targets with exact origins", () => {
    expect(externalCatalogue.length).toBeGreaterThan(3);
    for (const app of externalCatalogue) {
      expect(app.target.presentation).toBe("new-tab");
      expect(new URL(app.target.url).protocol).toBe("https:");
      expect(new URL(app.target.url).origin).toBe(app.target.allowedOrigin);
    }
  });
});
