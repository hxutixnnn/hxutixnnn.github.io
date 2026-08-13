import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { DesktopAppDescriptor } from "./desktop/apps";

afterEach(cleanup);

describe("tienOS main screen", () => {
  it("renders the default System Settings window with the desktop", () => {
    render(<App />);

    expect(screen.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
    expect(screen.getByRole("region", { name: "System Settings" })).toBeVisible();
    expect(screen.queryByText("A new desktop is under way.")).not.toBeInTheDocument();
  });

  it("releases startup when desktop asset loading fails", async () => {
    const onDesktopReady = vi.fn();
    render(
      <App desktopAssetsReady={Promise.reject(new Error("decode failed"))} onDesktopReady={onDesktopReady} />,
    );

    await waitFor(() => expect(onDesktopReady).toHaveBeenCalledOnce());
  });

  it("opens, raises, and reports the single Settings window from the Dock", async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByRole, queryByRole } = render(<App />);

    const dock = getByRole("navigation", { name: "Dock" });
    const app = getByRole("button", { name: "System Settings" });
    expect(dock.querySelectorAll("button")).toHaveLength(1);
    expect(app).not.toHaveAttribute("aria-pressed");
    expect(getByRole("status")).toHaveTextContent("System Settings is running");

    await user.click(getByRole("main", { name: "tienOS desktop" }));
    await user.click(app);
    expect(getAllByRole("region", { name: "System Settings" })).toHaveLength(1);
    expect(getByRole("region", { name: "System Settings" })).toHaveFocus();

    await user.click(getByRole("button", { name: "Close System Settings" }));
    expect(queryByRole("region", { name: "System Settings" })).not.toBeInTheDocument();
    expect(getByRole("status")).toHaveTextContent("System Settings is not running");

    app.focus();
    await user.keyboard("{Enter}");
    expect(getAllByRole("region", { name: "System Settings" })).toHaveLength(1);
    expect(getByRole("status")).toHaveTextContent("System Settings is running");
  });

  it("keeps an inactive app inactive while its menu owns pointer and keyboard activation", async () => {
    const user = userEvent.setup();
    render(<App />);
    const desktop = screen.getByRole("main", { name: "tienOS desktop" });
    await user.click(desktop);
    const window = screen.getByRole("region", { name: "System Settings" });
    expect(window).toHaveAttribute("data-window-active", "false");

    fireEvent.click(screen.getByRole("menuitem", { name: "Open tienOS menu" }));
    fireEvent.click(await screen.findByText("About This OS"));
    expect(window).toHaveAttribute("data-window-active", "false");

    const trigger = screen.getByRole("menuitem", { name: "Open tienOS menu" });
    trigger.focus();
    await user.keyboard("{Enter}{Enter}");
    expect(window).toHaveAttribute("data-window-active", "false");
  });

  it("launches and projects lifecycle for every registered app id", async () => {
    const user = userEvent.setup();
    const AuxiliaryWindow: DesktopAppDescriptor["Window"] = ({ appId, onEvent, windowState }) => (
      <section data-desktop-activity={appId} aria-label="Auxiliary App">
        {windowState.active ? "active" : "inactive"}
        <button onClick={() => onEvent({ type: "CLOSE" })}>Close Auxiliary App</button>
      </section>
    );
    const apps: readonly DesktopAppDescriptor[] = [
      {
        id: "system-settings",
        name: "System Settings",
        icon: "gear",
        Window: (props) => <div aria-label="System Settings Test Window">{String(props.windowState.active)}</div>,
      },
      { id: "auxiliary", name: "Auxiliary", icon: "sparkle", Window: AuxiliaryWindow },
    ];

    render(<App apps={apps} defaultApp={apps[0]} />);
    expect(screen.getByText("Auxiliary is not running")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Auxiliary" }));

    expect(screen.getByRole("region", { name: "Auxiliary App" })).toHaveTextContent("active");
    expect(screen.getByText("Auxiliary is running")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close Auxiliary App" }));
    expect(screen.queryByRole("region", { name: "Auxiliary App" })).not.toBeInTheDocument();
    expect(screen.getByText("Auxiliary is not running")).toBeInTheDocument();
  });
});
