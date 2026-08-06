import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import PreviewInteractions from "@/os/preview/PreviewInteractions";

it("keeps the live control lab interactive", async () => {
  const user = userEvent.setup();
  render(<PreviewInteractions mode="controls" />);

  const focus = screen.getByRole("switch", { name: "Live focus mode" });
  await user.click(focus);
  expect(focus).toHaveAttribute("aria-checked", "false");
  const coreSegment = screen.getByRole("button", { name: "Core" });
  await user.click(coreSegment);
  expect(coreSegment).toHaveAttribute("aria-pressed", "true");

  const overviewTab = screen.getByRole("tab", { name: "Overview" });
  overviewTab.focus();
  await user.keyboard("{ArrowRight}");
  const detailsTab = screen.getByRole("tab", { name: "Details" });
  expect(detailsTab).toHaveFocus();
  expect(detailsTab).toHaveAttribute("aria-selected", "true");
  expect(detailsTab).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("tabpanel", { name: "Details" })).toHaveTextContent(
    "Keyboard and pointer input share the same state.",
  );

  await user.keyboard("{End}");
  expect(screen.getByRole("tab", { name: "Notes" })).toHaveFocus();
  await user.keyboard("{Home}");
  expect(overviewTab).toHaveFocus();

  await user.type(screen.getByRole("searchbox", { name: "Filter shell samples" }), "window");
  expect(screen.getByText("Window chrome")).toBeInTheDocument();
});

it("opens the real menu, Control Center, popover, dialog, and Spotlight samples", async () => {
  const user = userEvent.setup();
  render(<PreviewInteractions mode="system" />);

  const systemMenu = screen.getByRole("menuitem", { name: "Tien OS menu" });
  systemMenu.focus();
  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitem", { name: "About Tien OS" })).toBeVisible();
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Control Center" }));
  expect(screen.getByRole("dialog", { name: "Control Center" })).toBeVisible();
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Open popover" }));
  expect(screen.getByRole("dialog", { name: "Live material notes" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "Open dialog" }));
  expect(screen.getByRole("dialog", { name: "Live dialog" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Done" }));
  await user.click(screen.getByRole("button", { name: "Switch to About" }));
  await user.click(screen.getByRole("button", { name: "Restore Blog" }));
  await user.click(screen.getByRole("button", { name: "Trash" }));
  await user.click(screen.getByRole("button", { name: "Populated Spotlight" }));
  await user.click(screen.getByRole("option", { name: /About/ }));
  await user.click(screen.getByRole("button", { name: "Empty Spotlight" }));
  expect(screen.getByRole("dialog", { name: "Spotlight search" })).toBeVisible();
  expect(screen.getByText(/No results for/)).toBeVisible();
});

it("exercises representative window controls", async () => {
  const user = userEvent.setup();
  render(<PreviewInteractions mode="window" />);

  await user.click(screen.getByRole("button", { name: "Maximize About" }));
  expect(screen.getByRole("button", { name: "Restore About" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Restore About" }));
  await user.click(screen.getByRole("button", { name: "Close About" }));
  expect(screen.getByRole("button", { name: "Restore sample" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Restore sample" }));
  expect(screen.getByRole("button", { name: "Close About" })).toBeVisible();
});
