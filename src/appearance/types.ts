export type AppearanceMode = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export type ThemeCommit = {
  mode: AppearanceMode;
  resolvedTheme: ResolvedTheme;
  wallpaperReady: boolean;
};

export type AppearanceResult = ThemeCommit & {
  status: "committed" | "stale";
};

export interface DocumentThemeCompositor {
  cancel(): void;
  commit(
    theme: ThemeCommit,
    options: { animate: boolean; isCurrent: () => boolean; onCommit?: () => void },
  ): Promise<boolean>;
}

export type AppearanceSnapshot = ThemeCommit & { pendingMode: AppearanceMode | null };
