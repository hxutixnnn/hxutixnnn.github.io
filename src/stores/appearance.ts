import { create } from "zustand";

export type AppearanceMode = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const appearanceStorageKey = "tienos-appearance";
export const wallpaperByTheme = {
  dark: "/wallpapers/tienos-default.jpg",
  light: "/wallpapers/tienos-light.jpg",
} as const satisfies Record<ResolvedTheme, string>;

let themeRequest = 0;
const decodedWallpapers = new Set<ResolvedTheme>();

function decodeWallpaper(theme: ResolvedTheme) {
  if (typeof Image === "undefined" || decodedWallpapers.has(theme)) return Promise.resolve();
  const image = new Image();
  image.src = wallpaperByTheme[theme];
  if (typeof image.decode !== "function") return Promise.resolve();
  return image.decode().then(() => {
    decodedWallpapers.add(theme);
  });
}

function persistAppearance(mode: AppearanceMode) {
  try {
    window.localStorage.setItem(appearanceStorageKey, JSON.stringify(mode));
  } catch {
    // The preference still works for this session when storage is unavailable.
  }
}

function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === "auto" || value === "light" || value === "dark";
}

export function readPersistedAppearance(storage?: Pick<Storage, "getItem">): AppearanceMode {
  if (!storage) return "auto";
  try {
    const parsed: unknown = JSON.parse(storage.getItem(appearanceStorageKey) ?? "null");
    return isAppearanceMode(parsed) ? parsed : "auto";
  } catch {
    return "auto";
  }
}

export function readBrowserAppearance(): AppearanceMode {
  if (typeof window === "undefined") return "auto";
  try {
    return readPersistedAppearance(window.localStorage);
  } catch {
    return "auto";
  }
}

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(mode: AppearanceMode): ResolvedTheme {
  return mode === "auto" ? systemTheme() : mode;
}

function applyTheme(mode: AppearanceMode, resolvedTheme: ResolvedTheme, wallpaperReady = true) {
  if (typeof document === "undefined") return;
  if (!wallpaperReady) {
    document.documentElement.dataset.wallpaperFallback = resolvedTheme;
    document.documentElement.style.setProperty("--tienos-wallpaper", "none");
  }
  document.documentElement.dataset.appearance = mode;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  if (wallpaperReady) {
    delete document.documentElement.dataset.wallpaperFallback;
    document.documentElement.style.removeProperty("--tienos-wallpaper");
  }
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", resolvedTheme === "dark" ? "#07121d" : "#dbeafe");
}

const initialMode = readBrowserAppearance();
const initialTheme = resolveTheme(initialMode);
applyTheme(initialMode, initialTheme);

type AppearanceState = {
  mode: AppearanceMode;
  pendingMode: AppearanceMode | null;
  resolvedTheme: ResolvedTheme;
  wallpaperReady: boolean;
  setMode: (mode: AppearanceMode) => Promise<boolean>;
  syncSystemTheme: () => void;
};

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  mode: initialMode,
  pendingMode: null,
  resolvedTheme: initialTheme,
  wallpaperReady: true,
  setMode: (mode) => {
    const resolvedTheme = resolveTheme(mode);
    const request = ++themeRequest;
    const commit = () => {
      if (request !== themeRequest) return false;
      if (mode === "auto" && resolvedTheme !== resolveTheme("auto")) {
        void get().setMode("auto");
        return false;
      }
      persistAppearance(mode);
      applyTheme(mode, resolvedTheme);
      set({ mode, pendingMode: null, resolvedTheme, wallpaperReady: true });
      return true;
    };
    const rollback = () => {
      if (request === themeRequest) {
        set({ pendingMode: null });
        if (mode !== "auto" && get().mode === "auto") get().syncSystemTheme();
      }
      return false;
    };
    if (
      (resolvedTheme === get().resolvedTheme && get().wallpaperReady) ||
      typeof Image === "undefined" ||
      !("decode" in Image.prototype)
    ) {
      commit();
      return Promise.resolve(true);
    }
    set({ pendingMode: mode });
    return decodeWallpaper(resolvedTheme).then(commit, rollback);
  },
  syncSystemTheme: () => {
    if (get().pendingMode !== null) {
      if (get().pendingMode === "auto") void get().setMode("auto");
      return;
    }
    if (get().mode !== "auto") return;
    const resolvedTheme = systemTheme();
    const request = ++themeRequest;
    if (typeof Image === "undefined" || !("decode" in Image.prototype)) {
      applyTheme("auto", resolvedTheme);
      set({ resolvedTheme, wallpaperReady: true });
      return;
    }
    void decodeWallpaper(resolvedTheme).then(
      () => {
        if (request !== themeRequest || get().mode !== "auto") return;
        applyTheme("auto", resolvedTheme);
        set({ resolvedTheme, wallpaperReady: true });
      },
      () => {
        if (request !== themeRequest || get().mode !== "auto") return;
        applyTheme("auto", resolvedTheme, false);
        set({ resolvedTheme, wallpaperReady: false });
      },
    );
  },
}));
