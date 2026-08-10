import { expect, type Page } from "@playwright/test";

export async function chooseAppearance(page: Page, mode: "Auto" | "Light" | "Dark") {
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("radio", { name: mode, exact: true }).last().click();
  if (mode !== "Auto") await expect(page.locator(":root")).toHaveAttribute("data-theme", mode.toLowerCase());
}
