import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appearanceStorageKey,
  readBrowserAppearance,
  readPersistedAppearance,
  useAppearanceStore,
} from "./appearance";

describe("appearance store", () => {
  beforeEach(() => {
    localStorage.clear();
    useAppearanceStore.getState().setMode("auto");
  });

  it("safely falls back to Auto for missing, malformed, and unsupported preferences", () => {
    expect(readPersistedAppearance(localStorage)).toBe("auto");
    localStorage.setItem(appearanceStorageKey, "not json");
    expect(readPersistedAppearance(localStorage)).toBe("auto");
    localStorage.setItem(appearanceStorageKey, JSON.stringify("sepia"));
    expect(readPersistedAppearance(localStorage)).toBe("auto");
    expect(
      readPersistedAppearance({
        getItem: vi.fn(() => {
          throw new Error("blocked");
        }),
      }),
    ).toBe("auto");
  });

  it("safely falls back to Auto when browser storage acquisition is blocked", () => {
    const storage = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(readBrowserAppearance()).toBe("auto");
    storage.mockRestore();
  });

  it("persists explicit modes and applies their resolved theme", () => {
    useAppearanceStore.getState().setMode("light");
    expect(localStorage.getItem(appearanceStorageKey)).toBe(JSON.stringify("light"));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    useAppearanceStore.getState().setMode("dark");
    expect(useAppearanceStore.getState()).toMatchObject({ mode: "dark", resolvedTheme: "dark" });
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});
