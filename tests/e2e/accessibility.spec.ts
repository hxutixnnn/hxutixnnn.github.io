import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const material = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(material, material.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
}

test("desktop, open app, and mobile switcher pass axe", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".portfolio-shell")).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole("button", { name: "Control Center" }).click();
  await expect(page.getByRole("dialog", { name: "Control Center" })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open About" }).click();
  await expect(page.locator('[data-app-id="about"]')).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Show running apps" }).click();
  await expect(page.getByRole("dialog", { name: "App switcher" })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "App switcher" })).toHaveCount(0);
});

test("document route remains useful with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/apps/about/");
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read the document view" })).toHaveAttribute("href", "/about/");
  await context.close();
});

test("external app details use safe new-tab links and load no embedded app", async ({ page }) => {
  await page.goto("/apps/image-restoration/");
  const launch = page.getByRole("link", { name: /Launch Image Restoration/ });
  await expect(launch).toHaveAttribute("target", "_blank");
  await expect(launch).toHaveAttribute("rel", /noopener/);
  await expect(launch).toHaveAttribute("rel", /noreferrer/);
  await expect(page.locator("iframe")).toHaveCount(0);
});
