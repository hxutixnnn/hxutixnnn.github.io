import { describe, expect, it } from "vitest";
import type { DesktopAppDescriptor } from "../desktop/apps";
import { searchDesktopApps } from "./searchDesktopApps";

const Window: DesktopAppDescriptor["Window"] = () => null;
const apps: readonly DesktopAppDescriptor[] = [
  { id: "notes", name: "Notes", icon: "sparkle", Window },
  { id: "system-settings", name: "System Settings", icon: "gear", Window },
  { id: "calendar", name: "Calendar", icon: "calendar-days", Window },
];

describe("searchDesktopApps", () => {
  it("derives empty results from the registry in deterministic name order", () => {
    expect(searchDesktopApps(apps, "").map(({ app }) => app.id)).toEqual([
      "calendar",
      "notes",
      "system-settings",
    ]);
  });

  it("normalizes and ranks exact, prefix, substring, and fuzzy matches", () => {
    expect(searchDesktopApps(apps, "notes")[0].app.id).toBe("notes");
    expect(searchDesktopApps(apps, "SYSTEM settings")[0].app.id).toBe("system-settings");
    expect(searchDesktopApps(apps, "cal")[0].app.id).toBe("calendar");
    expect(searchDesktopApps(apps, "syss")[0].app.id).toBe("system-settings");
    expect(searchDesktopApps(apps, "zzz")).toEqual([]);
  });
});
