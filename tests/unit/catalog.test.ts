import { describe, expect, it } from "vitest";
import {
  appCatalogue,
  coreCatalogue,
  embeddedCatalogue,
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
  it("represents only public repositories with valid deployed homepages", () => {
    const representedSources = new Set<string>(
      projectCatalogue
        .map((app) => app.source)
        .filter((source): source is NonNullable<typeof source> => Boolean(source)),
    );
    for (const repository of repositories) {
      const homepage = typeof repository.homepage === "string" ? repository.homepage.trim() : "";
      const deployed = (() => {
        try {
          const url = new URL(homepage);
          return url.protocol === "https:" && !url.username && !url.password;
        } catch {
          return false;
        }
      })();
      expect(representedSources.has(repository.htmlUrl)).toBe(
        repository.name !== "hxutixnnn.github.io" && deployed,
      );
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

describe("app trust boundaries", () => {
  it("uses reviewed HTTPS embedded targets with exact origins for projects", () => {
    expect(embeddedCatalogue.length).toBeGreaterThan(1);
    expect(projectCatalogue.every((app) => app.target.kind === "embedded")).toBe(true);
    for (const app of embeddedCatalogue) {
      expect(app.target.presentation).toBe("embedded");
      expect(new URL(app.target.url).protocol).toBe("https:");
      expect(new URL(app.target.url).origin).toBe(app.target.allowedOrigin);
    }
  });

  it("keeps social apps as reviewed HTTPS new-tab targets", () => {
    expect(externalCatalogue.length).toBeGreaterThan(3);
    for (const app of externalCatalogue) {
      expect(app.target.presentation).toBe("new-tab");
      expect(new URL(app.target.url).protocol).toBe("https:");
      expect(new URL(app.target.url).origin).toBe(app.target.allowedOrigin);
    }
  });
});
