import { expect, test } from "@playwright/test";

test("launches Relay Arcade and starts a host round", async ({ page }) => {
  await page.goto("/apps/airconsole/");
  await expect(page.locator(".portfolio-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Relay Arcade" })).toBeVisible();
  await page.getByRole("button", { name: "Host a round" }).click();
  await expect(page.getByRole("heading", { name: "Catch the sparks" })).toBeVisible();
  await page.getByRole("button", { name: "Start round" }).click();
  await expect(page.getByRole("progressbar", { name: "Round progress" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/Solo keyboard ready|Controller linked/)).toBeVisible();
});

test("supports the responsive controller path", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto("/apps/airconsole/?mode=controller&room=Q2RT");
  await expect(page.getByRole("heading", { name: "Controller console" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move left" })).toBeVisible();
  await page.getByRole("button", { name: "Move right" }).click();
  await expect(page.getByText(/Looking for a host|Host connected/)).toBeVisible();
});
