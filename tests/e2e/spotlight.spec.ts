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
  const trigger = page.getByRole("button", { name: "Open Spotlight" });
  await trigger.focus();
  await page.keyboard.press("Meta+Space");
  const dialog = page.getByRole("dialog", { name: "Spotlight" });
  await expect(dialog).toBeVisible();
  const search = page.getByRole("combobox", { name: "Search apps" });
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("aria-controls");
  await page.keyboard.press("Meta+Space");
  await expect(search).toBeFocused();
  await page.getByRole("option", { name: /System Settings/ }).focus();
  await page.keyboard.press("Tab");
  await expect(search).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(search).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(settings).toBeVisible();

  await trigger.click();
  await search.fill("syst stng");
  const result = page.getByRole("option", { name: /System Settings/ });
  await expect(result).toHaveAttribute("aria-selected", "true");
  await search.press("ArrowDown");
  await expect(result).toHaveAttribute("aria-selected", "true");
  await search.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(settings).toHaveAttribute("data-window-active", "true");
});

test("launches the registry app from closed, minimized, background, and frontmost states", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const dialog = page.getByRole("dialog", { name: "Spotlight" });
  const settings = page.getByRole("region", { name: "System Settings" });
  const launch = async () => {
    await page.keyboard.press("Meta+Space");
    await page.getByRole("combobox", { name: "Search apps" }).fill("settings");
    await page.getByRole("combobox", { name: "Search apps" }).press("Enter");
    await expect(dialog).toBeHidden();
    await expect(settings).toHaveAttribute("data-window-visibility", "visible");
    await expect(settings).toHaveAttribute("data-window-active", "true");
  };

  await page.getByRole("button", { name: "Close System Settings" }).click();
  await expect(settings).toHaveCount(0);
  await launch();

  await page.getByRole("button", { name: "Minimize System Settings" }).click();
  await expect(page.getByRole("navigation", { name: "Dock" }).getByRole("status")).toHaveText(
    "System Settings is running and minimized",
  );
  await launch();

  await page.getByRole("main", { name: "tienOS desktop" }).click({ position: { x: 4, y: 80 } });
  await expect(settings).toHaveAttribute("data-window-active", "false");
  await launch();
  await launch();
  await expect(settings).toHaveCount(1);
});

test("supports touch selection from the live registry", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await ready(page);
  await page.getByRole("button", { name: "Open Spotlight" }).tap();
  await page.getByRole("combobox", { name: "Search apps" }).fill("settings");
  await page.getByRole("option", { name: /System Settings/ }).tap();
  await expect(page.getByRole("dialog", { name: "Spotlight" })).toBeHidden();
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveAttribute(
    "data-window-active",
    "true",
  );
  await context.close();
});

test("launches an actual background app from a multi-app registry", async ({ page }) => {
  await page.goto("/?desktop-fixture=multiple-apps");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  const spotlight = page.getByRole("combobox", { name: "Search apps" });
  const auxiliary = page.getByRole("region", { name: "Auxiliary" });
  const settings = page.getByRole("region", { name: "System Settings" });

  await page.keyboard.press("Meta+Space");
  await expect(page.getByRole("option")).toHaveCount(2);
  await spotlight.fill("auxiliary");
  await spotlight.press("Enter");
  await expect(auxiliary).toHaveAttribute("data-window-frontmost", "true");
  await page.getByRole("navigation", { name: "Dock" }).getByRole("button", { name: "System Settings" }).click();
  await expect(auxiliary).toHaveAttribute("data-window-frontmost", "false");
  await expect(settings).toHaveAttribute("data-window-active", "true");

  await page.keyboard.press("Meta+Space");
  await spotlight.fill("auxiliary");
  await spotlight.press("Enter");
  await expect(auxiliary).toHaveAttribute("data-window-frontmost", "true");
  await expect(settings).toHaveAttribute("data-window-active", "false");
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
