import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("preview route is directly addressable, static, and interactive", async ({ page }) => {
  await page.goto("/preview/");
  await expect(page.getByRole("heading", { name: "UI components for a calmer desktop." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Tien OS", exact: true })).toHaveAttribute("href", "/");
  await expect(page.getByRole("heading", { name: "Design tokens and typography" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Interaction lab" })).toBeVisible();

  const liveInkToken = await page
    .locator(".preview-live-checkpoint")
    .evaluate((element) => getComputedStyle(element).getPropertyValue("--preview-ink").trim());
  expect(liveInkToken).toBe("#f5f7ff");

  const gallery = page.locator(".preview-page");
  await gallery.getByRole("button", { name: "Switch to light preview appearance" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-preview-theme", "light");

  const galleryControls = gallery.locator("#controls");
  await galleryControls.getByRole("button", { name: "Core" }).click();
  await expect(galleryControls.getByRole("button", { name: "Core" })).toHaveAttribute("aria-pressed", "true");
  const galleryOverviewTab = galleryControls.getByRole("tab", { name: "Overview" });
  await galleryOverviewTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(galleryControls.getByRole("tab", { name: "Details" })).toBeFocused();
  await expect(galleryControls.getByRole("tabpanel", { name: "Details" })).toBeVisible();
  await galleryControls.getByRole("searchbox", { name: "Filter components" }).fill("window");
  await expect(galleryControls.getByText("Window chrome")).toBeVisible();

  const controls = page.locator(".preview-live-controls");
  const focusMode = controls.getByRole("switch", { name: "Live focus mode" });
  await expect(focusMode).toHaveAttribute("aria-checked", "true");
  await focusMode.click();
  await expect(focusMode).toHaveAttribute("aria-checked", "false");
  await controls.getByRole("button", { name: "Core" }).click();
  await expect(controls.getByRole("button", { name: "Core" })).toHaveAttribute("aria-pressed", "true");
  await controls.getByRole("tab", { name: "Overview" }).focus();
  await page.keyboard.press("End");
  await expect(controls.getByRole("tab", { name: "Notes" })).toBeFocused();
  await expect(controls.getByRole("tabpanel", { name: "Notes" })).toBeVisible();
  await controls.getByRole("searchbox", { name: "Filter shell samples" }).fill("window");
  await expect(controls.getByText("Window chrome")).toBeVisible();

  const system = page.locator(".preview-live-system");
  await system.getByRole("button", { name: "Open popover" }).click();
  await expect(page.getByRole("dialog", { name: "Live material notes" })).toBeVisible();
  await page.keyboard.press("Escape");
  await system.getByRole("button", { name: "Open dialog" }).click();
  await expect(page.getByRole("dialog", { name: "Live dialog" })).toBeVisible();
  await page.keyboard.press("Escape");
  await system.getByRole("button", { name: "Empty Spotlight" }).click();
  await expect(page.getByRole("dialog", { name: "Spotlight search" })).toBeVisible();
  await expect(page.getByText(/No results for/)).toBeVisible();
  await page.keyboard.press("Escape");

  const windowSample = page.locator(".preview-live-window");
  await windowSample.getByRole("button", { name: "Maximize About" }).click();
  await expect(windowSample.getByRole("button", { name: "Restore About" })).toBeVisible();
  await windowSample.getByRole("button", { name: "Close About" }).click();
  await expect(windowSample.getByRole("button", { name: "Restore sample" })).toBeVisible();
});

test("preview remains useful as static HTML with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/preview/");
  await expect(page.getByRole("heading", { name: "UI components for a calmer desktop." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Original icons and status language" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Tien OS", exact: true })).toHaveAttribute("href", "/");
  await context.close();
});

test("preview has no serious accessibility violations or narrow overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/preview/");
  await expect(page.getByRole("heading", { name: "UI components for a calmer desktop." })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("preview fallbacks survive forced colors and reduced motion", async ({ browser }) => {
  const context = await browser.newContext({
    forcedColors: "active",
    reducedMotion: "reduce",
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();
  await page.goto("/preview/");
  const material = await page.locator(".preview-material--glass").evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    backdrop: getComputedStyle(element).backdropFilter,
  }));
  expect(material.backdrop).toBe("none");
  const liveStageBackground = await page
    .locator(".preview-live-system__stage")
    .evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(liveStageBackground).toBe("none");
  await page.locator(".preview-live-system").getByRole("button", { name: "Open dialog" }).click();
  const dialogBackdrop = await page
    .locator(".preview-dialog-backdrop")
    .evaluate((element) => getComputedStyle(element).backdropFilter);
  expect(dialogBackdrop).toBe("none");
  await page.keyboard.press("Escape");
  const animation = await page
    .locator(".preview-spinner")
    .evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(animation)).toBeLessThanOrEqual(0.01);
  await context.close();
});
