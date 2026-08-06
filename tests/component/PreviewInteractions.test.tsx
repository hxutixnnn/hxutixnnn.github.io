import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import PreviewInteractions from "@/os/preview/PreviewInteractions";
import { SETTINGS_KEY } from "@/os/store/persistence";

afterEach(() => {
  localStorage.clear();
  const root = document.documentElement;
  root.style.removeProperty("--os-brightness");
  root.style.removeProperty("--os-volume");
  delete root.dataset.appearance;
  delete root.dataset.focus;
});

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
  const persistedSettings = JSON.stringify({
    version: 1,
    brightness: 0.2,
    volume: 0.1,
    wifi: false,
    bluetooth: true,
    airdrop: false,
    focus: true,
    appearance: "light",
  });
  localStorage.setItem(SETTINGS_KEY, persistedSettings);
  const root = document.documentElement;
  root.style.setProperty("--os-brightness", "0.91");
  root.style.setProperty("--os-volume", "0.81");
  root.dataset.appearance = "dark";
  root.dataset.focus = "off";
  render(<PreviewInteractions mode="system" />);

  const systemMenu = screen.getByRole("menuitem", { name: "Tien OS menu" });
  systemMenu.focus();
  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitem", { name: "About Tien OS" })).toBeVisible();
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Control Center" }));
  const controlCenter = screen.getByRole("dialog", { name: "Control Center" });
  const settingsScope = document.querySelector<HTMLElement>(".preview-settings-scope");
  expect(controlCenter).toBeVisible();
  expect(settingsScope).not.toBeNull();
  expect(controlCenter.closest(".preview-settings-scope")).toBe(settingsScope);
  expect(screen.getByRole("switch", { name: "Appearance" })).toHaveAttribute("aria-checked", "false");
  expect(screen.getByRole("switch", { name: "Focus" })).toHaveAttribute("aria-checked", "false");
  expect(settingsScope).toHaveAttribute("data-appearance", "dark");
  expect(settingsScope).toHaveAttribute("data-focus", "off");
  expect(settingsScope?.style.getPropertyValue("--os-brightness")).toBe("1");
  expect(root.style.getPropertyValue("--os-brightness")).toBe("0.91");
  expect(root.style.getPropertyValue("--os-volume")).toBe("0.81");

  await user.click(screen.getByRole("switch", { name: "Appearance" }));
  await user.click(screen.getByRole("switch", { name: "Focus" }));
  expect(settingsScope).toHaveAttribute("data-appearance", "light");
  expect(settingsScope).toHaveAttribute("data-focus", "on");
  expect(root).toHaveAttribute("data-appearance", "dark");
  expect(root).toHaveAttribute("data-focus", "off");
  expect(localStorage.getItem(SETTINGS_KEY)).toBe(persistedSettings);
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
}, 15_000);

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
