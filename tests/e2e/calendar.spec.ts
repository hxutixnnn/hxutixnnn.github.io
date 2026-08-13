import { expect, test } from "@playwright/test";

test("Calendar launches, coexists, navigates, persists events, and works compact", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Calendar" }).click();
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

  await page.setViewportSize({ width: 390, height: 760 });
  await expect(page.getByRole("region", { name: "Calendar" })).toBeVisible();
  const target = page.getByRole("region", { name: "Calendar" }).getByRole("gridcell", { selected: true });
  await target.click();
  await expect(target).toBeVisible();
});
