import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MenuBar } from "@/os/shell/MenuBar";
import { SETTINGS_KEY } from "@/os/store/persistence";

function resetSettingsEffects() {
  localStorage.clear();
  const root = document.documentElement;
  root.style.removeProperty("--os-brightness");
  root.style.removeProperty("--os-volume");
  delete root.dataset.appearance;
  delete root.dataset.focus;
}

beforeEach(resetSettingsEffects);
afterEach(resetSettingsEffects);

function renderMenu(mobile = false) {
  const actions = { about: vi.fn(), close: vi.fn(), minimize: vi.fn(), maximize: vi.fn() };
  render(
    <MenuBar
      activeTitle="Blog"
      hasActiveWindow
      mobile={mobile}
      onOpenAbout={actions.about}
      onClose={actions.close}
      onMinimize={actions.minimize}
      onMaximize={actions.maximize}
      documentUrl="/blog/"
      onOpenSpotlight={vi.fn()}
      announce={vi.fn()}
    />,
  );
  return actions;
}

describe("MenuBar", () => {
  it("opens with the keyboard, roves menu items, invokes a command, and restores focus", async () => {
    const user = userEvent.setup();
    const actions = renderMenu();
    const appMenu = screen.getByRole("menuitem", { name: "Blog" });
    appMenu.focus();
    await user.keyboard("{ArrowDown}");
    const about = screen.getByRole("menuitem", { name: "About Blog" });
    expect(about).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{Enter}");
    expect(actions.close).toHaveBeenCalledOnce();
    expect(appMenu).toHaveFocus();
  });

  it("moves between top-level menus and closes with Escape", async () => {
    const user = userEvent.setup();
    renderMenu();
    const system = screen.getByRole("menuitem", { name: "Tien OS menu" });
    system.focus();
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "About Blog" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: "Blog" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Blog" })).toHaveFocus();
  });

  it("exposes named native window commands", () => {
    renderMenu();
    expect(screen.getByRole("menuitem", { name: "Tien OS menu" })).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.getByLabelText(/Local time/)).toBeInTheDocument();
  });

  it("keeps production Control Center effects and persistence on the document root", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Control Center" }));
    await user.click(screen.getByRole("switch", { name: "Appearance" }));
    await user.click(screen.getByRole("switch", { name: "Focus" }));

    const root = document.documentElement;
    expect(root).toHaveAttribute("data-appearance", "light");
    expect(root).toHaveAttribute("data-focus", "on");
    expect(root.style.getPropertyValue("--os-brightness")).toBe("1");
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}")).toMatchObject({
      version: 1,
      appearance: "light",
      focus: true,
    });
  });

  it("hides desktop-only window commands on mobile", async () => {
    const user = userEvent.setup();
    renderMenu(true);
    const appMenu = screen.getByRole("menuitem", { name: "Blog" });
    appMenu.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.queryByRole("menuitem", { name: "Maximize or restore" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^Minimize/ })).toBeInTheDocument();
  });
});
