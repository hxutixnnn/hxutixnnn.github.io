import { beforeEach, describe, expect, it, vi } from "vitest";
import { createResolvedThemeTransition } from "../theme-transition";
import { createDocumentThemeCompositor } from "./documentTheme";

vi.mock("../theme-transition", () => ({ createResolvedThemeTransition: vi.fn() }));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function target() {
  document.documentElement.removeAttribute("data-appearance");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-wallpaper-fallback");
  document.documentElement.removeAttribute("style");
  document.head.innerHTML = '<meta name="theme-color" content="initial">';
  return document;
}

describe("document theme compositor", () => {
  beforeEach(() => {
    vi.mocked(createResolvedThemeTransition).mockReset();
  });

  it.each([
    {
      wallpaperReady: true,
      fallback: undefined,
      wallpaper: "",
    },
    {
      wallpaperReady: false,
      fallback: "dark",
      wallpaper: "none",
    },
  ])("atomically commits ready and fallback document state", async (expected) => {
    const release = deferred();
    const cancel = vi.fn();
    vi.mocked(createResolvedThemeTransition).mockReturnValue({
      cancel,
      transition: vi.fn(async (commit, isCurrent = () => true) => {
        await release.promise;
        if (isCurrent()) commit();
      }),
    });
    const compositor = createDocumentThemeCompositor(target());
    let observed: Record<string, string | undefined> | undefined;
    const result = compositor.commit(
      { mode: "auto", resolvedTheme: "dark", wallpaperReady: expected.wallpaperReady },
      {
        animate: true,
        isCurrent: () => true,
        onCommit: () => {
          observed = {
            appearance: document.documentElement.dataset.appearance,
            theme: document.documentElement.dataset.theme,
            colorScheme: document.documentElement.style.colorScheme,
            fallback: document.documentElement.dataset.wallpaperFallback,
            wallpaper: document.documentElement.style.getPropertyValue("--tienos-wallpaper"),
            themeColor:
              document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ??
              undefined,
          };
        },
      },
    );
    expect(document.documentElement.dataset.theme).toBeUndefined();
    release.resolve();
    await expect(result).resolves.toBe(true);
    expect(observed).toEqual({
      appearance: "auto",
      theme: "dark",
      colorScheme: "dark",
      fallback: expected.fallback,
      wallpaper: expected.wallpaper,
      themeColor: "#07121d",
    });
  });

  it("does not commit stale or cancelled work", async () => {
    const staleRelease = deferred();
    const cancelledRelease = deferred();
    const releases = [staleRelease, cancelledRelease];
    let generation = 0;
    const cancel = vi.fn(() => {
      generation += 1;
    });
    const transition = vi.fn(
      async (commit: () => void, isCurrent: () => boolean = () => true) => {
        const ownGeneration = generation;
        await releases.shift()!.promise;
        if (ownGeneration === generation && isCurrent()) commit();
      },
    );
    vi.mocked(createResolvedThemeTransition).mockReturnValue({ cancel, transition });
    const compositor = createDocumentThemeCompositor(target());
    const onCommit = vi.fn();
    let current = false;
    const stale = compositor.commit(
      { mode: "dark", resolvedTheme: "dark", wallpaperReady: true },
      { animate: true, isCurrent: () => current, onCommit },
    );
    staleRelease.resolve();
    await expect(stale).resolves.toBe(false);

    current = true;
    const cancelled = compositor.commit(
      { mode: "light", resolvedTheme: "light", wallpaperReady: true },
      { animate: true, isCurrent: () => current, onCommit },
    );
    compositor.cancel();
    cancelledRelease.resolve();
    await expect(cancelled).resolves.toBe(false);
    expect(cancel).toHaveBeenCalledOnce();
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
