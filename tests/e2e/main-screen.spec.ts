import { expect, test } from "@playwright/test";

test("renders the tienOS main screen and system menu", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("tienOS");
  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeVisible();
  await expect(bootScreen).toBeHidden();
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("overflow-x", "hidden");
  await expect(page.locator("html")).toHaveCSS("overflow-y", "hidden");
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  const popup = page.locator(".tienos-menu-popup").first();
  await expect(popup).toHaveCSS("border-radius", "14px");
  await expect(popup).toHaveCSS("padding", "4px");
  await expect(page.getByText("About This OS", { exact: true }).locator("..")).toHaveCSS(
    "border-radius",
    "10px",
  );
  await expect(page.getByText("About This OS", { exact: true })).toBeVisible();
});

test("reveals the static desktop without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeVisible();
  await expect(bootScreen).toBeHidden();
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();

  await context.close();
});

test("opens System Settings from the system menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  await expect(page.getByRole("region", { name: "System Settings" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "System Settings…" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
  await page.getByRole("button", { name: "Close System Settings" }).click();
  await expect(page.getByRole("region", { name: "System Settings" })).toBeHidden();
});

test("matches the System Settings reference geometry", async ({ page }) => {
  await page.setViewportSize({ width: 918, height: 922 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const windowBounds = await page.getByRole("region", { name: "System Settings" }).boundingBox();
  const heroBounds = await page.locator(".settings-hero").boundingBox();
  const firstGroupBounds = await page.locator(".settings-group").first().boundingBox();

  const roundedBounds = (bounds: typeof windowBounds) =>
    bounds && Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, Math.round(value)]));

  expect(roundedBounds(windowBounds)).toMatchObject({ x: 97, y: 97, width: 723, height: 670 });
  expect(roundedBounds(heroBounds)).toMatchObject({ x: 340, y: 150, width: 459, height: 164 });
  expect(roundedBounds(firstGroupBounds)).toMatchObject({ x: 340, y: 324, width: 459, height: 128 });
});

test("drags and resizes the System Settings window with react-rnd", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  const initial = await settingsWindow.boundingBox();
  expect(initial).not.toBeNull();

  await page.mouse.move(initial!.x + initial!.width * 0.7, initial!.y + 16);
  await page.mouse.down();
  await page.mouse.move(initial!.x + initial!.width * 0.7 + 30, initial!.y + 36, { steps: 4 });
  await page.mouse.up();

  const dragged = await settingsWindow.boundingBox();
  expect(Math.round(dragged!.x - initial!.x)).toBe(30);
  expect(Math.round(dragged!.y - initial!.y)).toBe(20);

  const southeastHandle = page.locator('.settings-rnd div[style*="se-resize"]');
  const handle = await southeastHandle.boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x + handle!.width / 2 + 40, handle!.y + handle!.height / 2 + 30, {
    steps: 4,
  });
  await page.mouse.up();

  const resized = await settingsWindow.boundingBox();
  expect(Math.round(resized!.width - dragged!.width)).toBe(40);
  expect(Math.round(resized!.height - dragged!.height)).toBe(30);
});

test("fits and fixes an open System Settings window on compact screens", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await page.setViewportSize({ width: 320, height: 320 });

  await expect
    .poll(async () => {
      const bounds = await settingsWindow.boundingBox();
      return (
        bounds && {
          x: Math.round(bounds.x),
          y: Math.round(bounds.y),
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        }
      );
    })
    .toEqual({ x: 8, y: 46, width: 304, height: 266 });

  const compactBounds = await settingsWindow.boundingBox();
  await page.mouse.move(compactBounds!.x + compactBounds!.width * 0.7, compactBounds!.y + 16);
  await page.mouse.down();
  await page.mouse.move(compactBounds!.x + compactBounds!.width * 0.7 - 40, compactBounds!.y - 20, {
    steps: 4,
  });
  await page.mouse.up();

  const fixedBounds = await settingsWindow.boundingBox();
  expect(fixedBounds).toEqual(compactBounds);
});

test("keeps the default menu corners on a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 320 });
  await page.goto("/");
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();

  const popup = page.locator(".tienos-menu-popup").first();
  await expect(popup).toHaveCSS("border-radius", "14px");
  await expect(page.getByText("About This OS", { exact: true }).locator("..")).toHaveCSS(
    "border-radius",
    "10px",
  );
});
