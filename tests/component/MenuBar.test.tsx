import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MenuBar } from "@/os/shell/MenuBar";

function renderMenu() {
  const actions = { about: vi.fn(), close: vi.fn(), minimize: vi.fn(), maximize: vi.fn() };
  render(
    <MenuBar
      activeTitle="Blog"
      hasActiveWindow
      mobile={false}
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
});
