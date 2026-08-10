import { appearanceStorageKey, resolveAppearance } from "./definitions";
import type {
  AppearanceMode,
  AppearanceResult,
  AppearanceSnapshot,
  DocumentThemeCompositor,
  ResolvedTheme,
  ThemeCommit,
} from "./types";

export type AppearanceServiceDependencies = {
  storage?: Pick<Storage, "setItem">;
  systemTheme: () => ResolvedTheme;
  subscribeSystemTheme?: (listener: () => void) => () => void;
  loadWallpaper: (theme: ResolvedTheme) => Promise<void>;
  compositor: DocumentThemeCompositor;
  animationEligible: () => boolean;
  decodedWallpapers?: Set<ResolvedTheme>;
  onChange?: (snapshot: AppearanceSnapshot) => void;
};

export type AppearanceService = {
  request(mode: AppearanceMode): Promise<AppearanceResult>;
  systemThemeChanged(): void;
  dispose(): void;
  snapshot(): AppearanceSnapshot;
};

export function createAppearanceService(
  initial: ThemeCommit,
  dependencies: AppearanceServiceDependencies,
): AppearanceService {
  let generation = 0;
  let disposed = false;
  let state: AppearanceSnapshot = { ...initial, pendingMode: null };
  const decoded = dependencies.decodedWallpapers ?? new Set<ResolvedTheme>();
  if (initial.wallpaperReady) decoded.add(initial.resolvedTheme);

  const publish = (next: AppearanceSnapshot) => {
    state = next;
    dependencies.onChange?.({ ...state });
  };
  const stale = (mode: AppearanceMode, resolvedTheme: ResolvedTheme, wallpaperReady: boolean) => ({
    status: "stale" as const,
    mode,
    resolvedTheme,
    wallpaperReady,
  });

  const request = async (mode: AppearanceMode): Promise<AppearanceResult> => {
    const resolvedTheme = resolveAppearance(mode, dependencies.systemTheme());
    const requestGeneration = ++generation;
    dependencies.compositor.cancel();
    const animate = dependencies.animationEligible() && resolvedTheme !== state.resolvedTheme;
    const needsWallpaper = resolvedTheme !== state.resolvedTheme || !state.wallpaperReady;
    if (needsWallpaper && !decoded.has(resolvedTheme)) publish({ ...state, pendingMode: mode });

    let wallpaperReady = true;
    if (needsWallpaper && !decoded.has(resolvedTheme)) {
      try {
        await dependencies.loadWallpaper(resolvedTheme);
        decoded.add(resolvedTheme);
      } catch {
        wallpaperReady = false;
      }
    }
    if (disposed || requestGeneration !== generation) return stale(mode, resolvedTheme, wallpaperReady);
    if (mode === "auto" && resolvedTheme !== dependencies.systemTheme()) {
      void request("auto");
      return stale(mode, resolvedTheme, wallpaperReady);
    }

    const commit: ThemeCommit = { mode, resolvedTheme, wallpaperReady };
    const isCurrent = () => !disposed && requestGeneration === generation;
    const committed = await dependencies.compositor.commit(commit, {
      animate,
      isCurrent,
      onCommit: () => {
        try {
          dependencies.storage?.setItem(appearanceStorageKey, JSON.stringify(mode));
        } catch {
          // Appearance remains committed for this session when storage is unavailable.
        }
        publish({ ...commit, pendingMode: null });
      },
    });
    if (!committed || !isCurrent()) return stale(mode, resolvedTheme, wallpaperReady);
    return { status: "committed", ...commit };
  };

  const systemThemeChanged = () => {
    if (state.pendingMode === "auto") void request("auto");
    else if (state.pendingMode === null && state.mode === "auto") void request("auto");
  };
  const unsubscribe = dependencies.subscribeSystemTheme?.(systemThemeChanged);

  return {
    request,
    systemThemeChanged() {
      systemThemeChanged();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe?.();
      generation += 1;
      dependencies.compositor.cancel();
    },
    snapshot: () => ({ ...state }),
  };
}
