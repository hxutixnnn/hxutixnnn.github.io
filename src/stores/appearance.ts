import { create } from "zustand";
import { createAppearanceService } from "../appearance/createAppearanceService";
import {
  appearanceMediaQuery,
  appearanceStorageKey,
  readPersistedAppearance,
  resolveAppearance,
  wallpaperByTheme,
} from "../appearance/definitions";
import { createDocumentThemeCompositor } from "../appearance/documentTheme";
import type { AppearanceMode, ResolvedTheme } from "../appearance/types";

export { appearanceStorageKey, readPersistedAppearance, wallpaperByTheme };
export type { AppearanceMode, ResolvedTheme };

export function readBrowserAppearance(): AppearanceMode {
  if (typeof window === "undefined") return "auto";
  try {
    return readPersistedAppearance(window.localStorage);
  } catch {
    return "auto";
  }
}

function browserSystemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia?.(appearanceMediaQuery).matches
    ? "dark"
    : "light";
}

function loadBrowserWallpaper(theme: ResolvedTheme) {
  if (typeof Image === "undefined") return Promise.resolve();
  const image = new Image();
  image.src = wallpaperByTheme[theme];
  return typeof image.decode === "function" ? image.decode() : Promise.resolve();
}

export type AppearanceState = {
  desktopReady: boolean;
  mode: AppearanceMode;
  pendingMode: AppearanceMode | null;
  resolvedTheme: ResolvedTheme;
  wallpaperReady: boolean;
  markDesktopReady: () => void;
  setMode: (mode: AppearanceMode) => Promise<boolean>;
  syncSystemTheme: () => void;
};

const initialMode = readBrowserAppearance();
const initialTheme = resolveAppearance(initialMode, browserSystemTheme());
const initialAppearance = { mode: initialMode, resolvedTheme: initialTheme, wallpaperReady: true };
const documentCompositor = createDocumentThemeCompositor();
void documentCompositor.commit(initialAppearance, { animate: false, isCurrent: () => true });

export const useAppearanceStore = create<AppearanceState>((set, get) => {
  const service = createAppearanceService(initialAppearance, {
    storage: (() => {
      try {
        return window.localStorage;
      } catch {
        return undefined;
      }
    })(),
    systemTheme: browserSystemTheme,
    subscribeSystemTheme: (listener) => {
      const preference = window.matchMedia?.(appearanceMediaQuery);
      preference?.addEventListener("change", listener);
      return () => preference?.removeEventListener("change", listener);
    },
    loadWallpaper: loadBrowserWallpaper,
    compositor: documentCompositor,
    animationEligible: () => get().desktopReady,
    onChange: (appearance) => set(appearance),
  });

  return {
    desktopReady: false,
    ...service.snapshot(),
    markDesktopReady: () => set({ desktopReady: true }),
    setMode: async (mode) => (await service.request(mode)).status === "committed",
    syncSystemTheme: () => service.systemThemeChanged(),
  };
});
