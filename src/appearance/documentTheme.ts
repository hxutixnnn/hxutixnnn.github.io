import { createResolvedThemeTransition } from "../theme-transition";
import { themeColorByTheme } from "./definitions";
import type { DocumentThemeCompositor, ThemeCommit } from "./types";

export function createDocumentThemeCompositor(target: Document = document): DocumentThemeCompositor {
  const transitions = createResolvedThemeTransition();

  const apply = ({ mode, resolvedTheme, wallpaperReady }: ThemeCommit) => {
    const root = target.documentElement;
    root.dataset.appearance = mode;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    if (wallpaperReady) {
      delete root.dataset.wallpaperFallback;
      root.style.removeProperty("--tienos-wallpaper");
    } else {
      root.dataset.wallpaperFallback = resolvedTheme;
      root.style.setProperty("--tienos-wallpaper", "none");
    }
    target
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute("content", themeColorByTheme[resolvedTheme]);
  };

  return {
    cancel: transitions.cancel,
    async commit(theme, options) {
      const { animate, isCurrent, onCommit } = options;
      let committed = false;
      await transitions.transition(
        () => {
          apply(theme);
          onCommit?.();
          committed = true;
        },
        isCurrent,
        animate,
      );
      return committed && isCurrent();
    },
  };
}
