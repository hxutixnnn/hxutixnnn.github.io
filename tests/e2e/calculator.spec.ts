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

  await calculator.getByRole("button", { name: "AC" }).click();
  await page.keyboard.type("123456789012345");
  const desktopDisplay = calculator.getByRole("status", { name: "Calculator display" });
  await expect(desktopDisplay).toHaveText("123,456,789,012,345");
  expect(await desktopDisplay.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  await calculator.getByRole("button", { name: "Minimize Calculator" }).click();
  await expect(page.locator("#calculator-dock-status")).toContainText("running and minimized");
  await page.getByRole("button", { name: "Calculator" }).click();
  await expect(calculator).toBeVisible();
});

test("Calculator yields keyboard control to Spotlight and menus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Calculator" }).click();
  const calculator = page.getByRole("region", { name: "Calculator" });
  const display = calculator.getByRole("status", { name: "Calculator display" });

  await calculator.focus();
  await page.keyboard.type("7");
  await expect(display).toHaveText("7");

  await page.getByRole("button", { name: "Open Spotlight" }).click();
  const search = page.getByRole("combobox", { name: "Search apps" });
  await search.fill("123");
  await expect(search).toHaveValue("123");
  await expect(display).toHaveText("7");
  await page.keyboard.press("Escape");

  await page.getByRole("menuitem", { name: "Calculator", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "About Calculator" })).toBeVisible();
  await page.keyboard.type("9");
  await expect(display).toHaveText("7");
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
  await calculator.getByRole("button", { name: "AC" }).click();
  await page.keyboard.type("123456789012345");
  const compactDisplay = calculator.getByRole("status", { name: "Calculator display" });
  await expect(compactDisplay).toHaveText("123,456,789,012,345");
  expect(await compactDisplay.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(calculator).toBeInViewport();
});
