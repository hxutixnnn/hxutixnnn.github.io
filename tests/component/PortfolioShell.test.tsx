import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import PortfolioShell from "@/os/shell/PortfolioShell";

beforeEach(() => window.history.replaceState({}, "", "/"));

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
