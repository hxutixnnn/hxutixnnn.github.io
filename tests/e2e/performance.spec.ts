import { expect, test } from "@playwright/test";

test("initial shell makes no third-party requests and app code loads on demand", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await expect(page.locator(".portfolio-shell")).toBeVisible();
  const before = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  expect(requests.filter((url) => new URL(url).origin !== "http://127.0.0.1:4321")).toEqual([]);
  await page.getByRole("button", { name: "Open Blog" }).click();
  await expect(page.getByRole("heading", { name: "Problems, fixes, and things learned." })).toBeVisible();
  const after = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  expect(after.length).toBeGreaterThan(before.length);
});
