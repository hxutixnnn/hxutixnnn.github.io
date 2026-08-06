import { describe, expect, it } from "vitest";
import {
  mapRepositoriesToApps,
  mapSocialProfilesToApps,
  selectRepositoryLaunchUrl,
  type RepositoryCatalogConfig,
  type RepositoryInventoryItem,
  type SocialProfile,
} from "@/apps/catalog-mapping.mjs";

const config: RepositoryCatalogConfig = {
  owner: "hxutixnnn",
  displayOwner: "Nguyễn Hữu Tiền",
  excludedRepositories: { "hxutixnnn.github.io": "system surface" },
};

function repository(overrides: Partial<RepositoryInventoryItem> = {}): RepositoryInventoryItem {
  const name = overrides.name ?? "sample-app";
  return {
    id: 1,
    name,
    fullName: `hxutixnnn/${name}`,
    owner: "hxutixnnn",
    private: false,
    visibility: "public",
    description: null,
    homepage: null,
    language: null,
    topics: [],
    htmlUrl: `https://github.com/hxutixnnn/${name}`,
    fork: false,
    archived: false,
    disabled: false,
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("repository app mapping", () => {
  it("maps only deployed owned public repositories once in deterministic order", () => {
    const input = [
      repository({
        name: "z-last",
        fullName: "hxutixnnn/z-last",
        htmlUrl: "https://github.com/hxutixnnn/z-last",
        homepage: "https://z.example.com",
      }),
      repository({
        name: "a-first",
        fullName: "hxutixnnn/a-first",
        htmlUrl: "https://github.com/hxutixnnn/a-first",
        homepage: "https://a.example.com",
      }),
      repository({
        name: "a-first",
        fullName: "hxutixnnn/a-first",
        htmlUrl: "https://github.com/hxutixnnn/a-first",
        homepage: "https://a.example.com",
      }),
      repository({
        name: "github-only",
        fullName: "hxutixnnn/github-only",
        htmlUrl: "https://github.com/hxutixnnn/github-only",
      }),
      repository({
        name: "hxutixnnn.github.io",
        fullName: "hxutixnnn/hxutixnnn.github.io",
        htmlUrl: "https://github.com/hxutixnnn/hxutixnnn.github.io",
        homepage: "https://portfolio.example.com",
      }),
      repository({
        name: "private",
        fullName: "hxutixnnn/private",
        htmlUrl: "https://github.com/hxutixnnn/private",
        homepage: "https://private.example.com",
        private: true,
      }),
      repository({
        name: "unrelated",
        fullName: "other/unrelated",
        owner: "other",
        htmlUrl: "https://github.com/other/unrelated",
        homepage: "https://other.example.com",
      }),
    ];

    expect(mapRepositoriesToApps(input, config).map((app) => app.id)).toEqual([
      "repo-a-first",
      "repo-z-last",
    ]);
  });

  it("requires a safe deployed homepage and never falls back to GitHub", () => {
    const deployed = repository({ homepage: "https://demo.example.com/path" });
    const unsafeHomepage = repository({ homepage: "http://demo.example.com" });
    const githubHomepage = repository({ homepage: "https://github.com/hxutixnnn/sample-app" });
    expect(selectRepositoryLaunchUrl(deployed)).toBe("https://demo.example.com/path");
    expect(selectRepositoryLaunchUrl(unsafeHomepage)).toBeNull();
    expect(selectRepositoryLaunchUrl(githubHomepage)).toBeNull();
    expect(mapRepositoriesToApps([unsafeHomepage, githubHomepage], config)).toEqual([]);

    const app = mapRepositoriesToApps([deployed], config)[0];
    if (!app) throw new Error("Expected a mapped repository app");
    expect(app.summary).toBe("Explore the sample-app deployed project.");
    expect(app.tags).toEqual(["github"]);
    expect(app.source).toBe("https://github.com/hxutixnnn/sample-app");
    expect(app.target).toMatchObject({
      kind: "embedded",
      url: "https://demo.example.com/path",
      allowedOrigin: "https://demo.example.com",
      presentation: "embedded",
    });
  });

  it("rejects repository URLs that do not match the recorded owner and name", () => {
    expect(() =>
      selectRepositoryLaunchUrl(repository({ htmlUrl: "https://example.com/hxutixnnn/sample-app" })),
    ).toThrow(/invalid GitHub URL/);
    expect(() =>
      selectRepositoryLaunchUrl(repository({ htmlUrl: "https://github.com/other/sample-app" })),
    ).toThrow(/does not match/);
  });
});

describe("social app mapping", () => {
  const profiles: SocialProfile[] = [
    { id: "github", name: "GitHub", url: "https://github.com/hxutixnnn", icon: "github" },
    {
      id: "facebook",
      name: "Facebook",
      url: "https://www.facebook.com/hxutixnnn",
      icon: "facebook",
    },
  ];

  it("creates one app per exact published profile URL", () => {
    const apps = mapSocialProfilesToApps(profiles, config.displayOwner);
    expect(apps.map((app) => [app.id, app.name, app.target?.url, app.icon])).toEqual([
      ["social-facebook", "Facebook", "https://www.facebook.com/hxutixnnn", "facebook"],
      ["social-github", "GitHub", "https://github.com/hxutixnnn", "github"],
    ]);
  });

  it("rejects non-HTTPS social destinations", () => {
    expect(() =>
      mapSocialProfilesToApps(
        [{ id: "bad", name: "Bad", url: "mailto:private@example.com", icon: "code" }],
        config.displayOwner,
      ),
    ).toThrow(/credential-free HTTPS/);
  });
});
