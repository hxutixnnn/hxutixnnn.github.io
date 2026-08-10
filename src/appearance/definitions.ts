import type { AppearanceMode, ResolvedTheme } from "./types";

export const appearanceModes = ["auto", "light", "dark"] as const satisfies readonly AppearanceMode[];
export const appearanceStorageKey = "tienos-appearance";
export const appearanceMediaQuery = "(prefers-color-scheme: dark)";
export const themeColorByTheme = { dark: "#07121d", light: "#dbeafe" } as const;
export const wallpaperByTheme = {
  dark: "/wallpapers/tienos-default.jpg",
  light: "/wallpapers/tienos-light.jpg",
} as const satisfies Record<ResolvedTheme, string>;

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return typeof value === "string" && appearanceModes.includes(value as AppearanceMode);
}

export function resolveAppearance(mode: AppearanceMode, systemTheme: ResolvedTheme): ResolvedTheme {
  return mode === "auto" ? systemTheme : mode;
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
