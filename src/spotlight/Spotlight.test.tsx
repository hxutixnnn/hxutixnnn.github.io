import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DesktopAppDescriptor } from "../desktop/apps";
import { Spotlight } from "./Spotlight";

afterEach(cleanup);
const Window: DesktopAppDescriptor["Window"] = () => null;
const apps: readonly DesktopAppDescriptor[] = [
  { id: "alpha", name: "Alpha", icon: "sparkle", Window },
  { id: "beta", name: "Beta", icon: "gear", Window },
];

describe("Spotlight", () => {
  it("supports keyboard navigation, empty state, dismissal, and launch", async () => {
    const user = userEvent.setup();
    const dismiss = vi.fn();
    const launch = vi.fn();
    render(<Spotlight apps={apps} open onDismiss={dismiss} onLaunch={launch} />);
    const input = screen.getByRole("combobox", { name: "Search apps" });
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(dismiss).toHaveBeenCalledOnce();
    expect(launch).toHaveBeenCalledWith("beta");
    await user.type(input, "zzz");
    expect(screen.getByText("No applications found")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(dismiss).toHaveBeenCalledTimes(2);
  });

  it("launches a pointer-selected registry result", async () => {
    const user = userEvent.setup();
    const launch = vi.fn();
    render(<Spotlight apps={apps} open onDismiss={() => undefined} onLaunch={launch} />);
    await user.click(screen.getByRole("option", { name: /Beta/ }));
    expect(launch).toHaveBeenCalledWith("beta");
  });
});
