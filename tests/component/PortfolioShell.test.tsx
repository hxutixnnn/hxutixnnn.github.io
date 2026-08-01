import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PortfolioShell from "@/os/shell/PortfolioShell";

beforeEach(() => window.history.replaceState({}, "", "/"));
afterEach(() => vi.restoreAllMocks());

it("opens a route-backed lazy app, announces lifecycle, and restores launcher focus on close", async () => {
  const user = userEvent.setup();
  render(<PortfolioShell />);
  expect(screen.queryByRole("application")).not.toBeInTheDocument();
  const launcher = screen.getByRole("button", { name: "Open About" });
  await user.click(launcher);
  await screen.findByRole("heading", { name: "Hi, I’m Tien." });
  expect(window.location.pathname).toBe("/apps/about/");
  expect(screen.getByText("About opened")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Close About" }));
  expect(window.location.pathname).toBe("/");
  await waitFor(() => expect(launcher).toHaveFocus());
  expect(screen.getByText("About closed")).toBeInTheDocument();
});

it("hydrates a direct app route as selected", async () => {
  window.history.replaceState({}, "", "/apps/resources/");
  render(<PortfolioShell initialAppId="resources" />);
  expect(
    await screen.findByRole("heading", { name: "A deliberately short reading list." }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Switch to Resources" })).toHaveAttribute("aria-pressed", "true");
});

it("tracks app opens only when a new window is created", async () => {
  const user = userEvent.setup();
  const events: unknown[] = [];
  const listener = (event: Event) => events.push((event as CustomEvent).detail);
  window.addEventListener("tien:analytics", listener);
  render(<PortfolioShell />);

  const launcher = screen.getByRole("button", { name: "Open About" });
  await user.click(launcher);
  await screen.findByRole("heading", { name: "Hi, I’m Tien." });
  await user.click(launcher);
  await user.click(screen.getByRole("button", { name: "Close About" }));

  expect(events).toEqual([
    { event: "app_open", appId: "about" },
    { event: "app_close", appId: "about" },
  ]);
  window.removeEventListener("tien:analytics", listener);
});

it("keeps mobile switcher focus modal and restores its opener", async () => {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query === "(max-width: 767px)",
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
  const user = userEvent.setup();
  render(<PortfolioShell />);

  await user.click(
    within(screen.getByRole("main", { name: "Tien OS apps" })).getByRole("button", { name: "About" }),
  );
  await screen.findByRole("heading", { name: "Hi, I’m Tien." });
  const opener = screen.getByRole("button", { name: "Show running apps" });
  await user.click(opener);
  const done = screen.getByRole("button", { name: "Close app switcher" });
  expect(done).toHaveFocus();

  await user.keyboard("{Escape}");
  await waitFor(() => expect(opener).toHaveFocus());

  await user.click(opener);
  const dialog = screen.getByRole("dialog", { name: "App switcher" });
  await user.click(within(dialog).getByRole("button", { name: "Close About" }));
  expect(within(dialog).getByRole("button", { name: "Close app switcher" })).toHaveFocus();
});
