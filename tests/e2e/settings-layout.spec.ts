import { expect, test } from "@playwright/test";
import {} from "./drivers/contracts";

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
  expect(roundedBounds(heroBounds)).toMatchObject({ x: 348, y: 150, width: 451, height: 161 });
  expect(roundedBounds(firstGroupBounds)).toMatchObject({ x: 348, y: 321, width: 451, height: 128 });
});

test("drags and resizes the System Settings window with react-rnd", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  const initial = await settingsWindow.boundingBox();
  expect(initial).not.toBeNull();

  const dragHandle = await page.locator(".settings-sidebar-panel").boundingBox();
  await page.mouse.move(dragHandle!.x + dragHandle!.width - 12, dragHandle!.y + 20);
  await page.mouse.down();
  await page.mouse.move(dragHandle!.x + dragHandle!.width + 18, dragHandle!.y + 40, { steps: 4 });
  await page.mouse.up();

  const dragged = await settingsWindow.boundingBox();
  expect(Math.round(dragged!.x - initial!.x)).toBe(30);
  expect(Math.round(dragged!.y - initial!.y)).toBe(20);

  const movedHandle = await page.locator(".settings-sidebar-panel").boundingBox();
  await page.mouse.move(movedHandle!.x + movedHandle!.width - 12, movedHandle!.y + 20);
  await page.mouse.down();
  await page.mouse.move(movedHandle!.x + movedHandle!.width - 12, -100, { steps: 6 });
  await page.mouse.up();
  const menuBar = await page.locator('header:has([aria-label="tienOS menu bar"])').boundingBox();
  const topClamped = await settingsWindow.boundingBox();
  expect(topClamped!.y).toBeGreaterThanOrEqual(menuBar!.y + menuBar!.height);

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

  const northHandle = page.locator('.settings-rnd div[style*="cursor: row-resize"][style*="top: -5px"]');
  const northHandleBounds = await northHandle.boundingBox();
  await page.mouse.move(
    northHandleBounds!.x + northHandleBounds!.width / 2,
    northHandleBounds!.y + northHandleBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(northHandleBounds!.x + northHandleBounds!.width / 2, -100, { steps: 6 });
  const resizingAtBoundary = await settingsWindow.boundingBox();
  expect(resizingAtBoundary!.y).toBeGreaterThanOrEqual(menuBar!.y + menuBar!.height);
  expect(Math.round(resizingAtBoundary!.y + resizingAtBoundary!.height)).toBe(
    Math.round(resized!.y + resized!.height),
  );
  await page.mouse.up();

  const resizedFromTop = await settingsWindow.boundingBox();
  expect(resizedFromTop!.y).toBeGreaterThanOrEqual(menuBar!.y + menuBar!.height);
  expect(Math.round(resizedFromTop!.y + resizedFromTop!.height)).toBe(
    Math.round(resized!.y + resized!.height),
  );
});

test("keeps compact splitter bounds valid across intermediate phone widths", async ({ page }) => {
  for (const width of [431, 500, 563]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

    const splitter = page.getByRole("separator", { name: "Resize Settings sidebar" });
    const minimum = Number(await splitter.getAttribute("aria-valuemin"));
    const maximum = Number(await splitter.getAttribute("aria-valuemax"));
    const current = Number(await splitter.getAttribute("aria-valuenow"));
    const shell = await page.locator(".settings-window").boundingBox();
    const sidebar = await page.locator(".settings-sidebar").boundingBox();

    expect(minimum).toBeLessThanOrEqual(maximum);
    expect(current).toBeGreaterThanOrEqual(minimum);
    expect(current).toBeLessThanOrEqual(maximum);
    expect(sidebar!.width / shell!.width).toBeGreaterThanOrEqual(0.39);
    expect(sidebar!.width / shell!.width).toBeLessThanOrEqual(0.41);
  }
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
