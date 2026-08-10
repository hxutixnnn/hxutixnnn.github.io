import { expect, type Page } from "@playwright/test";

export async function waitForDesktop(page: Page) {
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
}

export function desktopShell(page: Page) {
  return {
    menu: page.getByRole("navigation", { name: "tienOS menu bar" }),
    dock: page.getByRole("navigation", { name: "Dock" }),
  };
}
