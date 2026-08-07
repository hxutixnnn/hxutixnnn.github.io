import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemSettings } from "./SystemSettings";

const legacyPlaceholderGlyphs = /[⌁ᛒ◎◉⚙◌◐✦▣☀☷⌕❉◖⌨▱▤⛨▰▦♙›‹]/u;

afterEach(cleanup);

describe("SystemSettings", () => {
  it("uses Base UI scroll areas inside a distinct floating sidebar", () => {
    render(<SystemSettings onClose={vi.fn()} />);

    const sidebar = document.querySelector(".settings-sidebar");
    expect(sidebar).toHaveAttribute("data-floating-panel");
    expect(sidebar?.querySelector(":scope > .settings-sidebar-panel")).toBeInTheDocument();

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

    const viewports = document.querySelectorAll(".settings-scroll-viewport");
    expect(viewports).toHaveLength(2);
    for (const viewport of viewports) {
      expect(viewport).toHaveClass("settings-scroll-viewport");
      expect(viewport).toHaveAttribute("tabindex", "0");
      expect(viewport.parentElement?.querySelector('[data-orientation="vertical"]')).toHaveClass(
        "settings-scrollbar",
      );
    }
  });

  it("provides interactive Appearance controls", async () => {
    const user = userEvent.setup();
    render(<SystemSettings onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Appearance" }));
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeVisible();
    const dark = within(screen.getByRole("group", { name: "Appearance mode" })).getByRole("button", {
      name: "Dark",
      pressed: false,
    });
    await user.click(dark);
    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Accent color" })).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Tint window background with wallpaper color" }),
    ).toBeChecked();
  });

  it("renders local Font Awesome icons in representative settings slots", () => {
    render(<SystemSettings onClose={vi.fn()} />);

    expect(screen.getByRole("region", { name: "System Settings" })).toBeVisible();
    expect(document.querySelector('.settings-search [data-fa-icon="magnifying-glass"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-magnifying-glass",
    );
    expect(document.querySelector('.settings-family [data-fa-icon="people-group"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-people-group",
    );
    expect(document.querySelector('.settings-nav-item [data-fa-icon="gear"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-gear",
    );
    expect(document.querySelector('.settings-hero [data-fa-icon="gear"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-gear",
    );
    expect(document.querySelector('.settings-row [data-fa-icon="shield-check"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-shield-check",
    );
    expect(document.querySelector('.settings-row [data-fa-icon="chevron-right"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-chevron-right",
    );
    expect(document.querySelector('.settings-history [data-fa-icon="chevron-left"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-chevron-left",
    );

    for (const icon of document.querySelectorAll("svg[data-fa-icon]")) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
    }
    expect(document.body.textContent).not.toMatch(legacyPlaceholderGlyphs);
  });
});
