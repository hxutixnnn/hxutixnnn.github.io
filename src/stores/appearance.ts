import { create } from "zustand";

export type AppearanceMode = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const appearanceStorageKey = "tienos-appearance";

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

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(mode: AppearanceMode): ResolvedTheme {
  return mode === "auto" ? systemTheme() : mode;
}

function applyTheme(mode: AppearanceMode, resolvedTheme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.appearance = mode;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", resolvedTheme === "dark" ? "#07121d" : "#dbeafe");
}

const initialMode = readPersistedAppearance(typeof window === "undefined" ? undefined : window.localStorage);
const initialTheme = resolveTheme(initialMode);
applyTheme(initialMode, initialTheme);

type AppearanceState = {
  mode: AppearanceMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: AppearanceMode) => void;
  syncSystemTheme: () => void;
};

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  mode: initialMode,
  resolvedTheme: initialTheme,
  setMode: (mode) => {
    const resolvedTheme = resolveTheme(mode);
    try {
      window.localStorage.setItem(appearanceStorageKey, JSON.stringify(mode));
    } catch {
      // The preference still works for this session when storage is unavailable.
    }
    applyTheme(mode, resolvedTheme);
    set({ mode, resolvedTheme });
  },
  syncSystemTheme: () => {
    if (get().mode !== "auto") return;
    const resolvedTheme = systemTheme();
    applyTheme("auto", resolvedTheme);
    set({ resolvedTheme });
  },
}));
