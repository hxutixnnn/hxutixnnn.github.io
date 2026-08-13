import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MenuBar } from "./MenuBar";

afterEach(cleanup);

describe("MenuBar", () => {
  it("renders the system menu with the approved menu structure", async () => {
    const onAction = vi.fn();
    render(<MenuBar onAction={onAction} />);

    fireEvent.click(screen.getByRole("menuitem", { name: "Open tienOS menu" }));

    expect(await screen.findByText("About This OS")).toBeVisible();
    expect(screen.getByText("System Settings…")).toBeVisible();
    expect(screen.getByText("Recent Items")).toBeVisible();
    expect(screen.getByText("Lock Screen")).toBeVisible();

    expect(document.querySelector('[data-fa-icon="sparkle"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-sparkle",
    );
    expect(document.querySelector('[data-fa-icon="chevron-right"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-chevron-right",
    );
    expect(document.querySelector('[data-fa-icon="wifi"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-wifi",
    );
    expect(document.querySelector('[data-fa-icon="battery-full"] use')).toHaveAttribute(
      "href",
      "/fontawesome/fontawesome-pro-solid.svg#fa-battery-full",
    );
    expect(screen.getByRole("img", { name: "Wi-Fi connected" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Battery full" })).toBeVisible();
    expect(document.body.textContent).not.toMatch(/[✦⌁▰›‹]/u);
  });

  it("opens the system menu with keyboard activation", async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    screen.getByRole("menuitem", { name: "Open tienOS menu" }).focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("About This OS")).toBeVisible();
  });

  it.each(["pointer", "keyboard"])("emits a typed app activation command by %s", async (input) => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<MenuBar onAction={onAction} />);
    const trigger = screen.getByRole("menuitem", { name: "Open tienOS menu" });
    if (input === "pointer") {
      fireEvent.click(trigger);
      fireEvent.click(await screen.findByText("System Settings…"));
    } else {
      trigger.focus();
      await user.keyboard("{Enter}");
      await screen.findByText("System Settings…");
      await user.keyboard("{ArrowDown}{Enter}");
    }

    expect(onAction).toHaveBeenCalledWith({ type: "activate-app", appId: "system-settings" });
  });
});
