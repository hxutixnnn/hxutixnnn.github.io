import { expect, type Page } from "@playwright/test";

export function settingsWindow(page: Page) {
  const region = page.getByRole("region", { name: "System Settings" });
  return {
    region,
    async openFromSystemMenu() {
      await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
      await page.getByRole("menuitem", { name: "System Settings…" }).click();
      await expect(region).toBeVisible();
    },
    async activateFromDock() {
      await page
        .getByRole("navigation", { name: "Dock" })
        .getByRole("button", { name: "System Settings" })
        .click();
    },
  };
}
