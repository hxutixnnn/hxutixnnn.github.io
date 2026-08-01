import { expect, test } from "@playwright/test";

const mobileViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

for (const viewport of mobileViewports) {
  test(`single-surface mobile policy has no overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator(".mobile-home")).toBeVisible();
    await page.getByRole("button", { name: "About", exact: true }).click();
    await expect(page.locator('[data-app-id="about"]')).toBeVisible();
    await expect(page.locator(".resize-handle")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Maximize About" })).toHaveCount(0);
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      touchTargets: [...document.querySelectorAll("button")]
        .filter((button) => {
          const style = getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return (
            style.display !== "none" &&
            rect.width > 0 &&
            rect.height > 0 &&
            (rect.width < 44 || rect.height < 44)
          );
        })
        .map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            label: button.getAttribute("aria-label") || button.textContent?.trim(),
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          };
        }),
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.touchTargets).toEqual([]);
  });
}

test("crossing the breakpoint ignores mobile coordinates and restores a clamped desktop window", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Open Projects" }).click();
  const shell = page.locator(".portfolio-shell");
  const window = page.locator('[data-app-id="projects"]');
  const maximize = page.getByRole("button", { name: "Maximize Projects" });
  const measureWindow = () =>
    window.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) throw new Error("Projects window has zero-size geometry");
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

  await expect(window).toBeVisible();
  await expect(maximize).toBeVisible();
  const desktop = await measureWindow();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(shell).toHaveClass(/is-mobile/);
  await expect(maximize).toHaveCount(0);
  await expect(window).toBeVisible();
  await expect(window).toHaveClass(/is-mobile/);
  const mobile = await measureWindow();
  expect(mobile.x).toBeGreaterThanOrEqual(0);
  expect(mobile.width).toBeLessThanOrEqual(390);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(shell).not.toHaveClass(/is-mobile/);
  await expect(maximize).toBeVisible();
  await expect(window).toBeVisible();
  const restored = await measureWindow();
  expect(restored.width).toBe(desktop.width);
  expect(restored.x).toBeGreaterThanOrEqual(0);
  expect(restored.x + restored.width).toBeLessThanOrEqual(1024);
});

test("a 200% effective viewport collapses to a useful single surface", async ({ page }) => {
  // A 1440 px display exposes a 720 CSS-pixel viewport at 200% browser zoom.
  await page.setViewportSize({ width: 720, height: 450 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(".mobile-home")).toBeVisible();
  await page.getByRole("button", { name: "About", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hi, I’m Tien." })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

test("forced-colors mode retains named, visible window controls", async ({ browser }) => {
  const context = await browser.newContext({
    forcedColors: "active",
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Open About" }).click();
  const close = page.getByRole("button", { name: "Close About" });
  const frame = page.locator('[data-app-id="about"]');
  await expect(close).toBeVisible();
  await expect(frame).toBeFocused();
  const material = await frame.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    border: getComputedStyle(element).borderStyle,
    backdrop: getComputedStyle(element).backdropFilter,
  }));
  expect(material.border).toBe("solid");
  expect(material.backdrop).toBe("none");
  await context.close();
});

test("reduced motion collapses nonessential transitions", async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();
  await page.goto("/");
  const duration = await page
    .getByRole("button", { name: "Open About" })
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
  await context.close();
});
