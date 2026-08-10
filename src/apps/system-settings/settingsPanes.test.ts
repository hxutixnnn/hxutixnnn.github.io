import { describe, expect, it } from "vitest";
import { defaultSettingsPaneId, settingsPaneIds, settingsPanes } from "./settingsPanes";

const expectedIds = [
  "general",
  "appearance",
  "desktop-dock",
  "displays",
  "menu-bar",
  "spotlight",
  "wallpaper",
  "notifications",
  "sound",
  "lock-screen",
  "keyboard",
  "trackpad",
];

const expectedLabels = [
  "General",
  "Appearance",
  "Desktop & Dock",
  "Displays",
  "Menu Bar",
  "Spotlight",
  "Wallpaper",
  "Notifications",
  "Sound",
  "Lock Screen",
  "Keyboard",
  "Trackpad",
];

describe("settings pane metadata", () => {
  it("provides one complete descriptor for every unique stable pane ID", () => {
    expect(settingsPaneIds).toEqual(expectedIds);
    expect(settingsPanes.map(({ id }) => id)).toEqual(expectedIds);
    expect(new Set(settingsPanes.map(({ id }) => id)).size).toBe(settingsPanes.length);
    expect(settingsPanes.map(({ label }) => label)).toEqual(expectedLabels);
    expect(
      settingsPanes.every(
        ({ Component, icon, group }) => typeof Component === "function" && Boolean(icon && group),
      ),
    ).toBe(true);
    expect(defaultSettingsPaneId).toBe("general");
  });
});
