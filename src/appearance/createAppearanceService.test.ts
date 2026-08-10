import { describe, expect, it, vi } from "vitest";
import { createAppearanceService, type AppearanceServiceDependencies } from "./createAppearanceService";
import type { DocumentThemeCompositor, ResolvedTheme, ThemeCommit } from "./types";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function harness(overrides: Partial<AppearanceServiceDependencies> = {}) {
  let system: ResolvedTheme = "light";
  let ready = false;
  const commits: ThemeCommit[] = [];
  const cancel = vi.fn();
  const commit = vi.fn<DocumentThemeCompositor["commit"]>((theme, options) => {
    if (!options.isCurrent()) return Promise.resolve(false);
    commits.push(theme);
    options.onCommit?.();
    return Promise.resolve(true);
  });
  const compositor: DocumentThemeCompositor = { cancel, commit };
  const setItem = vi.fn();
  const storage = { setItem };
  const loadWallpaper = vi.fn(() => Promise.resolve());
  const service = createAppearanceService(
    { mode: "auto", resolvedTheme: "light", wallpaperReady: true },
    {
      storage,
      systemTheme: () => system,
      loadWallpaper,
      compositor,
      animationEligible: () => ready,
      ...overrides,
    },
  );
  return {
    service,
    compositor,
    cancel,
    commit,
    commits,
    storage,
    setItem,
    loadWallpaper,
    setSystem: (value: ResolvedTheme) => (system = value),
    setReady: (value: boolean) => (ready = value),
  };
}

describe("appearance service", () => {
  it("commits explicit modes, persists the stable contract, and selects animation at request time", async () => {
    const test = harness();
    expect(await test.service.request("dark")).toMatchObject({
      status: "committed",
      mode: "dark",
      resolvedTheme: "dark",
    });
    expect(test.commit).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ animate: false }),
    );
    test.setReady(true);
    await test.service.request("light");
    expect(test.commit).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ animate: true }),
    );
    expect(test.setItem).toHaveBeenLastCalledWith("tienos-appearance", '"light"');
  });

  it("makes rapid requests latest-wins and rejects stale decode callbacks", async () => {
    const dark = deferred();
    const loadWallpaper = vi.fn((theme: ResolvedTheme) =>
      theme === "dark" ? dark.promise : Promise.resolve(),
    );
    const test = harness({ loadWallpaper });
    const first = test.service.request("dark");
    const second = await test.service.request("light");
    dark.resolve();
    expect((await first).status).toBe("stale");
    expect(second.status).toBe("committed");
    expect(test.commits).toEqual([{ mode: "light", resolvedTheme: "light", wallpaperReady: true }]);
  });

  it("ignores system flips for pending explicit requests", async () => {
    const dark = deferred();
    const test = harness({ loadWallpaper: () => dark.promise });
    const pending = test.service.request("dark");
    test.setSystem("dark");
    test.service.systemThemeChanged();
    dark.resolve();
    expect(await pending).toMatchObject({ status: "committed", mode: "dark" });
    expect(test.commits).toHaveLength(1);
  });

  it("retargets pending Auto to the latest system theme", async () => {
    const dark = deferred();
    const light = deferred();
    const test = harness({ loadWallpaper: (theme) => (theme === "dark" ? dark.promise : light.promise) });
    test.setSystem("dark");
    const old = test.service.request("auto");
    test.setSystem("light");
    test.service.systemThemeChanged();
    light.resolve();
    dark.resolve();
    expect((await old).status).toBe("stale");
    await Promise.resolve();
    expect(test.service.snapshot()).toMatchObject({
      mode: "auto",
      resolvedTheme: "light",
      pendingMode: null,
    });
  });

  it("retargets Auto while a cached wallpaper commit is deferred", async () => {
    const release = deferred();
    const test = harness({ decodedWallpapers: new Set(["light", "dark"]) });
    await test.service.request("light");
    test.commit.mockImplementationOnce(async (_theme, options) => {
      await release.promise;
      if (!options.isCurrent()) return false;
      options.onCommit?.();
      return true;
    });
    test.setSystem("dark");
    const staleAuto = test.service.request("auto");
    expect(test.service.snapshot().pendingMode).toBe("auto");
    test.setSystem("light");
    test.service.systemThemeChanged();
    release.resolve();
    expect((await staleAuto).status).toBe("stale");
    await vi.waitFor(() =>
      expect(test.service.snapshot()).toMatchObject({
        mode: "auto",
        resolvedTheme: "light",
        pendingMode: null,
      }),
    );
    expect(test.loadWallpaper).not.toHaveBeenCalled();
  });

  it("commits an intentional solid fallback after wallpaper rejection", async () => {
    const test = harness({
      loadWallpaper: () => Promise.reject(new Error("decode failed")),
    });
    expect(await test.service.request("dark")).toEqual({
      status: "committed",
      mode: "dark",
      resolvedTheme: "dark",
      wallpaperReady: false,
    });
    expect(test.commits.at(-1)).toMatchObject({ resolvedTheme: "dark", wallpaperReady: false });
  });

  it("caches only decoded wallpapers within each service instance", async () => {
    const test = harness();
    await test.service.request("dark");
    await test.service.request("light");
    await test.service.request("dark");
    expect(test.loadWallpaper).toHaveBeenCalledTimes(1);
    const independent = harness();
    await independent.service.request("dark");
    expect(independent.loadWallpaper).toHaveBeenCalledTimes(1);
  });

  it("keeps a committed session result when persistence throws", async () => {
    const test = harness({
      storage: {
        setItem: vi.fn(() => {
          throw new Error("blocked");
        }),
      },
    });
    expect((await test.service.request("dark")).status).toBe("committed");
    expect(test.service.snapshot()).toMatchObject({ mode: "dark", resolvedTheme: "dark" });
  });

  it("cancels pending work, subscriptions, and callbacks on disposal without leaking across instances", async () => {
    const decode = deferred();
    const unsubscribe = vi.fn();
    const subscribeSystemTheme = vi.fn(() => unsubscribe);
    const first = harness({ loadWallpaper: () => decode.promise, subscribeSystemTheme });
    expect(subscribeSystemTheme).toHaveBeenCalledOnce();
    const second = harness();
    const pending = first.service.request("dark");
    first.service.dispose();
    decode.resolve();
    expect((await pending).status).toBe("stale");
    expect(first.commits).toEqual([]);
    expect(await second.service.request("dark")).toMatchObject({ status: "committed" });
    expect(first.cancel).toHaveBeenCalledTimes(2);
    expect(unsubscribe).toHaveBeenCalledOnce();
    first.service.dispose();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
