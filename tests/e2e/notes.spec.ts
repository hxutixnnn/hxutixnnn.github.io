import { expect, test } from "@playwright/test";

test("Notes launches beside Settings and persists keyboard-created content", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  const dock = page.getByRole("navigation", { name: "Dock" });
  const settingsLauncher = dock.getByRole("button", { name: "System Settings" });
  const notesLauncher = dock.getByRole("button", { name: "Notes" });
  await expect(dock.getByRole("button")).toHaveCount(2);
  await notesLauncher.click();

  const notesWindow = page.getByRole("region", { name: "Notes" });
  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await expect(notesWindow).toBeVisible();
  await expect(notesWindow).toBeFocused();
  await expect(settingsWindow).toBeVisible();
  const fullscreen = page.getByRole("button", { name: "Toggle fullscreen Notes" });
  await fullscreen.click();
  await expect(fullscreen).toHaveAttribute("aria-pressed", "true");
  await expect(notesWindow).toHaveCount(1);
  await fullscreen.click();
  await expect(fullscreen).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Create a Note" }).click();
  await page.getByRole("textbox", { name: "Note title" }).fill("Browser draft");
  await page.getByRole("textbox", { name: "Note text" }).fill("Saved locally");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const stored: unknown = JSON.parse(localStorage.getItem("tienos.notes") ?? "null");
        if (!stored || typeof stored !== "object" || !("notes" in stored) || !Array.isArray(stored.notes)) {
          return null;
        }
        const first: unknown = stored.notes[0];
        if (!first || typeof first !== "object" || !("body" in first)) return null;
        return typeof first.body === "string" ? first.body : null;
      }),
    )
    .toBe("Saved locally");

  await settingsLauncher.click();
  await expect(settingsWindow).toBeFocused();
  await expect(notesWindow).toBeVisible();
  await notesLauncher.click();
  await expect(notesWindow).toHaveAttribute("data-window-active", "true");
  await expect(notesWindow.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Control+n");
  await expect(page.getByRole("option")).toHaveCount(2);
  await page.getByRole("textbox", { name: "Search notes" }).fill("Browser draft");
  await expect(page.getByRole("option", { name: /Browser draft/ })).toBeVisible();

  await page.getByRole("button", { name: "Close Notes" }).click();
  await expect(notesWindow).toBeHidden();
  await notesLauncher.click();
  await expect(notesWindow).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("navigation", { name: "Dock" }).getByRole("button", { name: "Notes" }).click();
  await page.getByRole("option", { name: /Browser draft/ }).click();
  await expect(page.getByRole("textbox", { name: "Note text" })).toHaveValue("Saved locally");
});

test("Notes remains touch-usable inside compact desktop boundaries", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("navigation", { name: "Dock" }).getByRole("button", { name: "Notes" }).tap();

  const notesWindow = page.getByRole("region", { name: "Notes" });
  await page.getByRole("button", { name: "Create a Note" }).tap();
  await expect(page.getByRole("textbox", { name: "Search notes" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Note title" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Note text" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete New Note" })).toHaveCSS("min-height", "44px");

  const [menuBounds, windowBounds, dockBounds] = await Promise.all([
    page.locator("[data-menu-bar-surface]").boundingBox(),
    notesWindow.boundingBox(),
    page.locator("[data-dock-surface]").boundingBox(),
  ]);
  expect(windowBounds!.y).toBeGreaterThanOrEqual(menuBounds!.y + menuBounds!.height);
  expect(windowBounds!.y + windowBounds!.height).toBeLessThanOrEqual(dockBounds!.y);
  expect(windowBounds!.x).toBeGreaterThanOrEqual(0);
  expect(windowBounds!.x + windowBounds!.width).toBeLessThanOrEqual(390);
  await context.close();
});
