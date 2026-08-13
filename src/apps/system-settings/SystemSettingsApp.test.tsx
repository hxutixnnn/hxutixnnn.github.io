import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemSettingsApp } from "./SystemSettingsApp";

const legacyPlaceholderGlyphs = /[⌁ᛒ◎◉⚙◌◐✦▣☀☷⌕❉◖⌨▱▤⛨▰▦♙›‹]/u;

afterEach(cleanup);

describe("SystemSettings", () => {
  it("uses Base UI scroll areas inside a distinct floating sidebar", () => {
    render(<SystemSettingsApp onEvent={vi.fn()} />);

    const sidebar = document.querySelector("[data-floating-panel]");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar?.querySelector(":scope > [data-sidebar-panel]")).toBeInTheDocument();

    expect(
      screen
        .getAllByRole("button", {
          name: /^(General|Appearance|Desktop & Dock|Displays|Menu Bar|Spotlight|Wallpaper|Notifications|Sound|Lock Screen|Keyboard|Trackpad)$/,
        })
        .map((button) => button.textContent),
    ).toEqual([
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
    ]);
    expect(screen.queryByRole("button", { name: "Wi-Fi" })).not.toBeInTheDocument();

    const groups = screen.getAllByRole("group", { name: /System|Personal/ });
    expect(groups).toHaveLength(2);
    expect(groups[0]).toContainElement(screen.getByRole("button", { name: "Wallpaper" }));
    expect(groups[1]).toContainElement(screen.getByRole("button", { name: "Notifications" }));

    const viewports = [
      document.querySelector('div[aria-label="Settings categories"]'),
      document.querySelector('div[aria-label="Settings details"]'),
    ];
    for (const viewport of viewports) {
      expect(viewport).toHaveAttribute("tabindex", "0");
      expect(viewport?.parentElement?.querySelector('[data-orientation="vertical"]')).toBeInTheDocument();
    }
  });

  it("filters categories by label while retaining stable pane selection", async () => {
    const user = userEvent.setup();
    render(<SystemSettingsApp onEvent={vi.fn()} />);

    const search = screen.getByRole("textbox", { name: "Search settings" });
    await user.type(search, "display");
    expect(screen.getByRole("button", { name: "Displays" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "General" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Displays" }));
    expect(screen.getByRole("heading", { name: "Displays" })).toBeVisible();
    expect(screen.getByText("Displays controls are ready for configuration.")).toBeVisible();
  });

  it("renders General by default with its description and complete setting rows", () => {
    render(<SystemSettingsApp onEvent={vi.fn()} />);

    expect(screen.getByRole("button", { name: "General" })).toHaveAttribute("data-selected");
    expect(screen.getByRole("heading", { name: "General" })).toBeVisible();
    expect(screen.getByText(/Manage your overall setup and preferences/)).toBeVisible();
    expect(screen.getByRole("button", { name: "About" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Transfer or Reset" })).toBeVisible();
  });

  it("provides interactive Appearance controls", async () => {
    const user = userEvent.setup();
    render(<SystemSettingsApp onEvent={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Appearance" }));
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeVisible();
    const dark = within(screen.getByRole("radiogroup", { name: "Appearance mode" })).getByRole("radio", {
      name: "Dark",
      checked: false,
    });
    await user.click(dark);
    expect(dark).toBeChecked();
    expect(screen.getByRole("radiogroup", { name: "Accent color" })).toBeVisible();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    const highlight = screen.getByRole("combobox", { name: "Text highlight color" });
    await user.click(highlight);
    await user.click(screen.getByRole("option", { name: "Purple" }));
    expect(highlight).toHaveTextContent("Purple");

    const folder = screen.getByRole("combobox", { name: "Folder color" });
    await user.click(folder);
    await user.keyboard("{ArrowDown}{Escape}");
    expect(folder).toHaveFocus();
    expect(folder).toHaveTextContent("Automatic");

    const iconSize = screen.getByRole("combobox", { name: "Sidebar icon size" });
    await user.click(iconSize);
    await user.click(screen.getByRole("option", { name: "Large" }));
    expect(iconSize).toHaveTextContent("Large");
    const wallpaperTint = screen.getByRole("switch", {
      name: "Tint window background with wallpaper color",
    });
    expect(wallpaperTint).toBeChecked();
    await user.click(wallpaperTint);
    expect(wallpaperTint).not.toBeChecked();
  });

  it("assigns app-owned control portals to the hosting app", async () => {
    const user = userEvent.setup();
    render(<SystemSettingsApp appId="host-app" onEvent={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Appearance" }));
    await user.click(screen.getByRole("combobox", { name: "Text highlight color" }));

    expect(screen.getByRole("listbox").closest("[data-desktop-activity]")).toHaveAttribute(
      "data-desktop-activity",
      "host-app",
    );
  });

  it("preserves every Appearance demo control across pane navigation", async () => {
    const user = userEvent.setup();
    render(<SystemSettingsApp onEvent={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Appearance" }));
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Liquid Glass style" })).getByRole("radio", {
        name: "Tinted",
      }),
    );
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Accent color" })).getByRole("radio", {
        name: "Blue",
      }),
    );
    const highlight = screen.getByRole("combobox", { name: "Text highlight color" });
    await user.click(highlight);
    await user.click(screen.getByRole("option", { name: "Purple" }));
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Icon and widget style" })).getByRole("radio", {
        name: "Dark",
      }),
    );
    const folder = screen.getByRole("combobox", { name: "Folder color" });
    await user.click(folder);
    await user.click(screen.getByRole("option", { name: "Blue" }));
    const iconSize = screen.getByRole("combobox", { name: "Sidebar icon size" });
    await user.click(iconSize);
    await user.click(screen.getByRole("option", { name: "Large" }));
    await user.click(screen.getByRole("switch", { name: "Tint window background with wallpaper color" }));

    const details = screen.getByLabelText("Settings details");
    details.scrollTop = 180;
    const generalButton = screen.getByRole("button", { name: "General" });
    await user.click(generalButton);
    expect(generalButton).toHaveFocus();
    expect(details.scrollTop).toBe(0);

    details.scrollTop = 120;
    const appearanceButton = screen.getByRole("button", { name: "Appearance" });
    await user.click(appearanceButton);
    expect(appearanceButton).toHaveFocus();
    expect(details.scrollTop).toBe(0);
    expect(
      within(screen.getByRole("radiogroup", { name: "Liquid Glass style" })).getByRole("radio", {
        name: "Tinted",
      }),
    ).toBeChecked();
    expect(
      within(screen.getByRole("radiogroup", { name: "Accent color" })).getByRole("radio", {
        name: "Blue",
      }),
    ).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Text highlight color" })).toHaveTextContent("Purple");
    expect(
      within(screen.getByRole("radiogroup", { name: "Icon and widget style" })).getByRole("radio", {
        name: "Dark",
      }),
    ).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Folder color" })).toHaveTextContent("Blue");
    expect(screen.getByRole("combobox", { name: "Sidebar icon size" })).toHaveTextContent("Large");
    expect(
      screen.getByRole("switch", { name: "Tint window background with wallpaper color" }),
    ).not.toBeChecked();
  });

  it("resets the details viewport when the selected category changes", async () => {
    const user = userEvent.setup();
    render(<SystemSettingsApp onEvent={vi.fn()} />);

    const details = screen.getByLabelText("Settings details");
    details.scrollTop = 180;

    await user.click(screen.getByRole("button", { name: "Appearance" }));
    expect(details.scrollTop).toBe(0);
  });

  it("renders local Font Awesome icons in representative settings slots", () => {
    render(<SystemSettingsApp onEvent={vi.fn()} />);

    expect(screen.getByRole("region", { name: "System Settings" })).toBeVisible();
    expect(
      document.querySelector('[data-settings-search] [data-fa-icon="magnifying-glass"] use'),
    ).toHaveAttribute("href", "/fontawesome/fontawesome-pro-solid.svg#fa-magnifying-glass");
    expect(document.querySelector('[data-fa-icon="people-group"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-people-group",
    );
    expect(
      screen.getByRole("button", { name: "General" }).querySelector('[data-fa-icon="gear"] use'),
    ).toHaveAttribute("href", "/fontawesome/fontawesome-pro-solid.svg#fa-gear");
    expect(
      screen
        .getByRole("region", { name: "System Settings" })
        .querySelector('header [data-fa-icon="gear"] use'),
    ).toHaveAttribute("href", "/fontawesome/fontawesome-pro-solid.svg#fa-gear");
    expect(
      screen
        .getByRole("button", { name: "Coverage & Warranty" })
        .querySelector('[data-fa-icon="shield-check"] use'),
    ).toHaveAttribute("href", "/fontawesome/fontawesome-pro-solid.svg#fa-shield-check");
    expect(
      screen
        .getByRole("button", { name: "Coverage & Warranty" })
        .querySelector('[data-fa-icon="chevron-right"] use'),
    ).toHaveAttribute("href", "/fontawesome/fontawesome-pro-solid.svg#fa-chevron-right");
    expect(
      screen.getByRole("button", { name: "Back" }).querySelector('[data-fa-icon="chevron-left"] use'),
    ).toHaveAttribute("href", "/fontawesome/fontawesome-pro-solid.svg#fa-chevron-left");

    for (const icon of document.querySelectorAll("svg[data-fa-icon]")) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
    }
    expect(document.body.textContent).not.toMatch(legacyPlaceholderGlyphs);
  });
});
