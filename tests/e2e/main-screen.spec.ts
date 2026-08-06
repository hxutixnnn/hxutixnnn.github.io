import { expect, test } from "@playwright/test";

test("renders the tienOS main screen and system menu", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("tienOS");
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await expect(page.getByText("About This OS", { exact: true })).toBeVisible();
});
