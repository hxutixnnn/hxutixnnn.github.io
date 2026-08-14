import { expect, test } from "@playwright/test";

test("Calendar launches, coexists, navigates, persists events, and works compact", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 760 } });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Calendar" }).tap();
  const calendar = page.getByRole("region", { name: "Calendar" });
  await expect(calendar).toBeVisible();
  await expect(page.getByRole("region", { name: "System Settings" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Calendar" })).toBeVisible();

  const heading = calendar.getByRole("heading", { level: 1 });
  const originalMonth = await heading.textContent();
  await calendar.getByRole("button", { name: "Next month" }).click();
  await expect(heading).not.toHaveText(originalMonth ?? "");
  await calendar.getByRole("button", { name: "Create event" }).click();
  await calendar.getByLabel("Title").fill("Calendar e2e event");
  await calendar.getByLabel("Time (optional)").fill("10:15");
  await calendar.getByRole("button", { name: "Save" }).click();
  await expect(calendar.getByText("Calendar e2e event")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Calendar" }).click();
  await page.getByRole("region", { name: "Calendar" }).getByRole("button", { name: "Next month" }).click();
  await expect(page.getByText("Calendar e2e event")).toBeVisible();

  const compactCalendar = page.getByRole("region", { name: "Calendar" });
  const selected = compactCalendar.getByRole("gridcell", { selected: true });
  const touchTarget = compactCalendar.locator('[role="gridcell"][aria-selected="false"]').nth(10);
  const originalSelection = await selected.getAttribute("aria-label");
  const targetLabel = await touchTarget.getAttribute("aria-label");
  await touchTarget.tap();
  await expect(
    compactCalendar.getByRole("gridcell", { name: targetLabel ?? "", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(compactCalendar.getByRole("gridcell", { selected: true })).not.toHaveAttribute(
    "aria-label",
    originalSelection ?? "",
  );

  const [menuBounds, windowBounds, dockBounds] = await Promise.all([
    page.locator("[data-menu-bar-surface]").boundingBox(),
    compactCalendar.boundingBox(),
    page.locator("[data-dock-surface]").boundingBox(),
  ]);
  expect(windowBounds!.y).toBeGreaterThanOrEqual(menuBounds!.y + menuBounds!.height);
  expect(windowBounds!.y + windowBounds!.height).toBeLessThanOrEqual(dockBounds!.y);
  expect(windowBounds!.x).toBeGreaterThanOrEqual(0);
  expect(windowBounds!.x + windowBounds!.width).toBeLessThanOrEqual(390);
  await context.close();
});

test("Calendar event editing remains touch-usable in a short compact viewport", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 320, height: 568 } });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Calendar" }).tap();

  const calendar = page.getByRole("region", { name: "Calendar" });
  const sixthWeekDay = calendar.getByRole("gridcell").nth(35);
  await sixthWeekDay.scrollIntoViewIfNeeded();
  await expect(sixthWeekDay).toBeInViewport();
  expect((await sixthWeekDay.boundingBox())!.height).toBeGreaterThanOrEqual(40);
  const sixthWeekLabel = await sixthWeekDay.getAttribute("aria-label");
  await sixthWeekDay.tap();
  await expect(calendar.getByRole("gridcell", { name: sixthWeekLabel ?? "", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await calendar.getByRole("button", { name: "Create event" }).tap();
  await calendar.getByLabel("Title").fill("Short viewport event");
  await calendar.getByRole("button", { name: "Save" }).tap();
  await expect(calendar.getByText("Short viewport event")).toBeVisible();

  const [menuBounds, windowBounds, dockBounds] = await Promise.all([
    page.locator("[data-menu-bar-surface]").boundingBox(),
    calendar.boundingBox(),
    page.locator("[data-dock-surface]").boundingBox(),
  ]);
  expect(windowBounds!.y).toBeGreaterThanOrEqual(menuBounds!.y + menuBounds!.height);
  expect(windowBounds!.y + windowBounds!.height).toBeLessThanOrEqual(dockBounds!.y);
  expect(windowBounds!.x).toBeGreaterThanOrEqual(0);
  expect(windowBounds!.x + windowBounds!.width).toBeLessThanOrEqual(320);
  await context.close();
});
