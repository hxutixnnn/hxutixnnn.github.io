import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SystemSettings } from "./SystemSettings";

const legacyPlaceholderGlyphs = /[⌁ᛒ◎◉⚙◌◐✦▣☀☷⌕❉◖⌨▱▤⛨▰▦♙›‹]/u;

describe("SystemSettings icons", () => {
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
