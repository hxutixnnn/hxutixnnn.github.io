import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DesktopAppDescriptor } from "../desktop/apps";
import { Dock } from "./Dock";

const Window: DesktopAppDescriptor["Window"] = () => null;
const apps: readonly DesktopAppDescriptor[] = [
  { id: "calculator", name: "Calculator", icon: "display", Window },
  { id: "calendar", name: "Calendar", icon: "calendar-days", Window },
];

describe("Dock", () => {
  it("exposes lifecycle status for every registered app", () => {
    render(
      <Dock
        apps={apps}
        windowStates={{
          calculator: { presence: "open", visibility: "visible" },
          calendar: { presence: "open", visibility: "minimized" },
        }}
        onActivate={vi.fn()}
      />,
    );

    const dock = screen.getByRole("navigation", { name: "Dock" });
    expect(within(dock).getAllByRole("status")).toHaveLength(2);
    expect(dock.querySelector("#calculator-dock-status")).toHaveTextContent("Calculator is running");
    expect(dock.querySelector("#calendar-dock-status")).toHaveTextContent(
      "Calendar is running and minimized",
    );
  });
});
