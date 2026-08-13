import { expect, test } from "@playwright/test";

test("Calculator launches, coexists, calculates, and owns the active menu", async ({ page }) => {
  await page.goto("/");
  const settings = page.getByRole("region", { name: "System Settings" });
  await expect(settings).toBeVisible();
  await page.getByRole("button", { name: "Calculator" }).click();
  const calculator = page.getByRole("region", { name: "Calculator" });
  await expect(calculator).toBeVisible();
  await expect(settings).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Calculator", exact: true })).toBeVisible();

  await page.keyboard.press("1");
  await page.keyboard.press("2");
  await page.keyboard.press("*");
  await page.keyboard.press("3");
  await page.keyboard.press("Enter");
  await expect(calculator.getByRole("status", { name: "Calculator display" })).toHaveText("36");

  await calculator.getByRole("button", { name: "Minimize Calculator" }).click();
  await expect(page.locator("#calculator-dock-status")).toContainText("running and minimized");
  await page.getByRole("button", { name: "Calculator" }).click();
  await expect(calculator).toBeVisible();
});

test("Calculator remains usable in a compact viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Calculator" }).click();
  const calculator = page.getByRole("region", { name: "Calculator" });
  await calculator.getByRole("button", { name: "7" }).click();
  await calculator.getByRole("button", { name: "+" }).click();
  await calculator.getByRole("button", { name: "8" }).click();
  await calculator.getByRole("button", { name: "=" }).click();
  await expect(calculator.getByRole("status", { name: "Calculator display" })).toHaveText("15");
  await expect(calculator).toBeInViewport();
});
