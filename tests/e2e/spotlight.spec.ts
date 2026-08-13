import { expect, test, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
}

test("invokes, navigates, dismisses, and launches Spotlight without disturbing the desktop", async ({
  page,
}) => {
  await ready(page);
  const settings = page.getByRole("region", { name: "System Settings" });
  await page.keyboard.press("Meta+Space");
  const dialog = page.getByRole("dialog", { name: "Spotlight" });
  await expect(dialog).toBeVisible();
  const search = page.getByRole("combobox", { name: "Search apps" });
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("aria-controls");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(settings).toBeVisible();

  await page.getByRole("button", { name: "Open Spotlight" }).click();
  await search.fill("syst stng");
  const result = page.getByRole("option", { name: /System Settings/ });
  await expect(result).toHaveAttribute("aria-selected", "true");
  await result.click();
  await expect(dialog).toBeHidden();
  await expect(settings).toHaveAttribute("data-window-active", "true");
});

test("keeps Spotlight usable in a compact viewport and supports an empty result", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await ready(page);
  await page.getByRole("button", { name: "Open Spotlight" }).click();
  const dialog = page.getByRole("dialog", { name: "Spotlight" });
  await expect(dialog).toBeInViewport();
  await page.getByRole("combobox", { name: "Search apps" }).fill("no such application");
  await expect(page.getByText("No applications found")).toBeVisible();
  await page.locator('[data-shell-overlay="spotlight"]').click({ position: { x: 1, y: 1 } });
  await expect(dialog).toBeHidden();
});
