import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { lazy } from "react";
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
    expect(dock.querySelectorAll("button")).toHaveLength(3);
    expect(getByRole("button", { name: "Notes" })).toBeInTheDocument();
    expect(getByRole("button", { name: "Calculator" })).toBeInTheDocument();
    expect(app).not.toHaveAttribute("aria-pressed");
    expect(document.querySelector("#system-settings-dock-status")).toHaveTextContent(
      "System Settings is running",
    );

    await user.click(getByRole("main", { name: "tienOS desktop" }));
    await user.click(app);
    expect(getAllByRole("region", { name: "System Settings" })).toHaveLength(1);
    expect(getByRole("region", { name: "System Settings" })).toHaveFocus();

    await user.click(getByRole("button", { name: "Close System Settings" }));
    expect(queryByRole("region", { name: "System Settings" })).not.toBeInTheDocument();
    expect(document.querySelector("#system-settings-dock-status")).toHaveTextContent(
      "System Settings is not running",
    );

    app.focus();
    await user.keyboard("{Enter}");
    expect(getAllByRole("region", { name: "System Settings" })).toHaveLength(1);
    expect(document.querySelector("#system-settings-dock-status")).toHaveTextContent(
      "System Settings is running",
    );
  });

  it("keeps an inactive app inactive while its menu owns pointer and keyboard activation", async () => {
    const user = userEvent.setup();
    render(<App />);
    const desktop = screen.getByRole("main", { name: "tienOS desktop" });
    await user.click(desktop);
    const window = screen.getByRole("region", { name: "System Settings" });
    expect(window).toHaveAttribute("data-window-active", "false");

    await user.click(screen.getByRole("menuitem", { name: "Open tienOS menu" }));
    await user.click(await screen.findByText("About This OS"));
    expect(window).toHaveAttribute("data-window-active", "false");

    const trigger = screen.getByRole("menuitem", { name: "Open tienOS menu" });
    trigger.focus();
    await user.keyboard("{Enter}{Enter}");
    expect(window).toHaveAttribute("data-window-active", "false");
  });

  it("invokes Spotlight from keyboard and menu, restores focus, and launches through the registry controller", async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = screen.getByRole("button", { name: "Open Spotlight" });
    trigger.focus();
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Spotlight" })).toBeVisible();
    await user.keyboard("{Meta>} {/Meta}");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Spotlight" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.keyboard("{Meta>} {/Meta}");
    const search = screen.getByRole("combobox", { name: "Search apps" });
    await user.type(search, "settings{Enter}");
    expect(screen.queryByRole("dialog", { name: "Spotlight" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "System Settings" })).toHaveAttribute(
      "data-window-active",
      "true",
    );
  });

  it("dismisses Spotlight from a focused result", async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = screen.getByRole("button", { name: "Open Spotlight" });
    trigger.focus();
    await user.click(trigger);
    screen.getByRole("option", { name: /System Settings/ }).focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Spotlight" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("dismisses Spotlight from a desktop interaction without changing window lifecycle", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open Spotlight" }));
    const window = screen.getByRole("region", { name: "System Settings" });
    await user.click(screen.getByRole("main", { name: "tienOS desktop" }));
    expect(screen.queryByRole("dialog", { name: "Spotlight" })).not.toBeInTheDocument();
    expect(window).toHaveAttribute("data-window-active", "false");
    expect(window).toHaveAttribute("data-window-visibility", "visible");
  });

  it("ignores activity markers owned by unregistered apps", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("main", { name: "tienOS desktop" }));
    const window = screen.getByRole("region", { name: "System Settings" });
    expect(window).toHaveAttribute("data-window-active", "false");

    const unknownPortal = document.createElement("button");
    unknownPortal.dataset.desktopActivity = "unregistered";
    document.body.append(unknownPortal);
    await user.click(unknownPortal);

    expect(window).toHaveAttribute("data-window-active", "false");
  });

  it("launches and projects lifecycle for every registered app id", async () => {
    const user = userEvent.setup();
    const AuxiliaryWindow: DesktopAppDescriptor["Window"] = ({
      appId,
      dockTargetRectProvider,
      frontmost,
      onEvent,
      windowState,
    }) => (
      <section data-desktop-activity={appId} aria-label="Auxiliary App">
        {windowState.active ? "active" : "inactive"}
        <output aria-label="Auxiliary layer">{frontmost ? "frontmost" : "background"}</output>
        <button onClick={() => onEvent({ type: "MINIMIZE" })}>Minimize Auxiliary App</button>
        <button onClick={() => onEvent({ type: "CLOSE" })}>Close Auxiliary App</button>
        <output aria-label="Auxiliary target">{JSON.stringify(dockTargetRectProvider())}</output>
      </section>
    );
    const apps: readonly DesktopAppDescriptor[] = [
      {
        id: "system-settings",
        name: "System Settings",
        menuName: "Navigator",
        icon: "gear",
        Window: (props) => (
          <div aria-label="System Settings Test Window">
            {String(props.windowState.active)}
            <output aria-label="System Settings layer">{props.frontmost ? "frontmost" : "background"}</output>
          </div>
        ),
      },
      { id: "auxiliary", name: "Auxiliary", icon: "sparkle", Window: AuxiliaryWindow },
    ];

    render(<App apps={apps} defaultApp={apps[0]} />);
    expect(screen.getByText("Auxiliary is not running")).toBeInTheDocument();
    const auxiliaryLauncher = screen.getByRole("button", { name: "Auxiliary" });
    vi.spyOn(auxiliaryLauncher, "getBoundingClientRect").mockReturnValue({
      x: 220,
      y: 700,
      width: 56,
      height: 56,
      top: 700,
      right: 276,
      bottom: 756,
      left: 220,
      toJSON: () => undefined,
    });
    await user.click(screen.getByRole("button", { name: "Open Spotlight" }));
    await user.type(screen.getByRole("combobox", { name: "Search apps" }), "aux{Enter}");

    expect(screen.getByRole("menuitem", { name: "Auxiliary" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Auxiliary App" })).toHaveTextContent("active");
    expect(screen.getByRole("status", { name: "Auxiliary layer" })).toHaveTextContent("frontmost");
    expect(screen.getByRole("status", { name: "System Settings layer" })).toHaveTextContent("background");
    expect(screen.getByRole("status", { name: "Auxiliary target" })).toHaveTextContent(
      '{"x":220,"y":700,"width":56,"height":56}',
    );
    expect(screen.getByText("Auxiliary is running")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Minimize Auxiliary App" }));
    await user.click(screen.getByRole("button", { name: "Open Spotlight" }));
    await user.type(screen.getByRole("combobox", { name: "Search apps" }), "aux{Enter}");
    expect(screen.getByRole("region", { name: "Auxiliary App" })).toHaveTextContent("active");
    await user.click(screen.getByRole("button", { name: "System Settings" }));
    expect(screen.getByRole("status", { name: "System Settings layer" })).toHaveTextContent("frontmost");
    expect(screen.getByRole("status", { name: "Auxiliary layer" })).toHaveTextContent("background");
    await user.click(screen.getByRole("button", { name: "Open Spotlight" }));
    await user.type(screen.getByRole("combobox", { name: "Search apps" }), "aux{Enter}");
    expect(screen.getByRole("status", { name: "Auxiliary layer" })).toHaveTextContent("frontmost");
    await user.click(screen.getByRole("button", { name: "Open Spotlight" }));
    await user.type(screen.getByRole("combobox", { name: "Search apps" }), "aux{Enter}");
    expect(screen.getAllByRole("region", { name: "Auxiliary App" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "System Settings" }));
    await user.click(screen.getByRole("main", { name: "tienOS desktop" }));
    expect(screen.getByRole("menuitem", { name: "Navigator" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "System Settings layer" })).toHaveTextContent("frontmost");
    expect(screen.getByRole("status", { name: "Auxiliary layer" })).toHaveTextContent("background");
    await user.click(screen.getByRole("button", { name: "Close Auxiliary App" }));
    expect(screen.queryByRole("region", { name: "Auxiliary App" })).not.toBeInTheDocument();
    expect(screen.getByText("Auxiliary is not running")).toBeInTheDocument();
  });

  it("keeps loaded app windows mounted while another app suspends", async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const LazyWindow = lazy(async () => {
      await pending;
      return { default: () => <section aria-label="Lazy App">Loaded</section> };
    });
    const apps: readonly DesktopAppDescriptor[] = [
      {
        id: "system-settings",
        name: "System Settings",
        menuName: "Navigator",
        icon: "gear",
        Window: () => <section aria-label="System Settings Test Window">Settings content</section>,
      },
      { id: "lazy", name: "Lazy App", icon: "sparkle", Window: LazyWindow },
    ];

    render(<App apps={apps} defaultApp={apps[0]} />);
    await user.click(screen.getByRole("button", { name: "Lazy App" }));

    expect(screen.getByRole("region", { name: "System Settings Test Window" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Lazy App" })).not.toBeInTheDocument();
    release?.();
    expect(await screen.findByRole("region", { name: "Lazy App" })).toBeVisible();
  });

  it("stops Calculator keyboard input after desktop deactivation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Calculator" }));
    const calculator = await screen.findByRole("region", { name: "Calculator" });
    await user.keyboard("4");
    expect(screen.getByRole("status", { name: "Calculator display" })).toHaveTextContent("4");

    await user.click(screen.getByRole("main", { name: "tienOS desktop" }));
    expect(calculator).toHaveAttribute("data-window-active", "false");
    await user.keyboard("9");

    expect(screen.getByRole("status", { name: "Calculator display" })).toHaveTextContent("4");
  });
});
