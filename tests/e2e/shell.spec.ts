import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(".portfolio-shell")).toBeVisible();
});

test("desktop window lifecycle, drag, resize, persistence, and route state", async ({ page }) => {
  await page.getByRole("button", { name: "Open About" }).click();
  const about = page.locator('[data-app-id="about"]');
  await expect(about).toBeVisible();
  await expect(page).toHaveURL(/\/apps\/about\/$/);

  const before = await about.boundingBox();
  const titlebar = about.locator(".window-titlebar");
  const titleBox = await titlebar.boundingBox();
  if (!before || !titleBox) throw new Error("About window did not have measurable geometry");
  await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(titleBox.x + titleBox.width / 2 + 60, titleBox.y + titleBox.height / 2 + 35, {
    steps: 4,
  });
  await page.mouse.up();
  const moved = await about.boundingBox();
  expect(moved?.x).toBeGreaterThan(before.x + 30);

  const positioner = about.locator("..");
  const beforeResize = await positioner.boundingBox();
  const resize = positioner.locator(".resize-handle--se");
  const resizeBox = await resize.boundingBox();
  if (!resizeBox || !beforeResize) throw new Error("Resize handle did not have measurable geometry");
  const handleCenter = {
    x: resizeBox.x + resizeBox.width / 2,
    y: resizeBox.y + resizeBox.height / 2,
  };
  await page.mouse.move(handleCenter.x, handleCenter.y);
  await page.mouse.down();
  await page.mouse.move(handleCenter.x + 60, handleCenter.y + 40, { steps: 4 });
  await page.mouse.up();
  const resized = await positioner.boundingBox();
  expect(resized?.width).toBeGreaterThan(beforeResize.width + 30);

  await page.getByRole("button", { name: "Maximize About" }).click();
  await expect(page.getByRole("button", { name: "Restore About" })).toBeVisible();
  await page.getByRole("button", { name: "Restore About" }).click();
  await page.getByRole("button", { name: "Minimize About" }).click();
  await expect(about).toBeHidden();
  await page.getByRole("button", { name: "Switch to About" }).click();
  await expect(about).toBeVisible();

  const restored = await about.boundingBox();
  await page.reload();
  await expect(page.locator('[data-app-id="about"]')).toBeVisible();
  const persisted = await page.locator('[data-app-id="about"]').boundingBox();
  expect(Math.round(persisted?.width ?? 0)).toBe(Math.round(restored?.width ?? -1));

  await page.getByRole("button", { name: "Close About" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Open About" })).toBeFocused();
});

test("keyboard menus and window shortcuts remain operable", async ({ page }) => {
  await page.getByRole("button", { name: "Open Blog" }).click();
  const appMenu = page.getByRole("menuitem", { name: "Blog" });
  await appMenu.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "About Blog" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem", { name: "Open document view" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Blog", exact: true })).toBeFocused();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+w" : "Control+w");
  await expect(page.locator('[data-app-id="blog"]')).toHaveCount(0);
});

test("direct core route is useful and initializes the requested app", async ({ page }) => {
  await page.goto("/apps/til/");
  await expect(page.locator('[data-app-id="til"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today I learned." })).toBeVisible();
});

test("direct embedded route keeps fallback HTML and hydrates the requested project", async ({
  page,
  request,
}) => {
  const response = await request.get("/apps/repo-jquery-website-input/");
  const html = await response.text();
  expect(html).toContain('class="app-detail-document static-fallback"');
  expect(html).toContain("jquery-website-input");

  await page.goto("/apps/repo-jquery-website-input/");

  const project = page.locator('[data-app-id="repo-jquery-website-input"]');
  await expect(project).toBeVisible();
  await expect(project.getByTitle("jquery-website-input deployed project")).toHaveAttribute(
    "src",
    "https://hxutixnnn.github.io/jquery-website-input",
  );
  await expect(page.locator(".app-detail-document.static-fallback")).toBeHidden();
});

test("a retained deployed project opens in the generic embedded window", async ({ page }) => {
  await page.getByRole("button", { name: "Open Projects" }).click();
  const card = page.locator(".project-card").filter({ hasText: "jquery-website-input" });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "Launch project" }).click();

  const project = page.locator('[data-app-id="repo-jquery-website-input"]');
  await expect(project).toBeVisible();
  const frame = project.getByTitle("jquery-website-input deployed project");
  await expect(frame).toHaveAttribute("src", "https://hxutixnnn.github.io/jquery-website-input");
  await expect(frame).toHaveAttribute("sandbox", /allow-scripts/);
  await expect(frame).not.toHaveAttribute("sandbox", /allow-same-origin/);
  await expect(project.getByRole("link", { name: /Open jquery-website-input in a new tab/ })).toBeVisible();
  await expect(page.getByText("harness-skills", { exact: true })).toHaveCount(0);
});

test("the embedded project window remains a single responsive mobile surface", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const card = page.locator(".project-card").filter({ hasText: "jquery-website-input" });
  await card.getByRole("link", { name: "Launch project" }).click();
  const project = page.locator('[data-app-id="repo-jquery-website-input"]');
  await expect(project).toHaveClass(/is-mobile/);
  await expect(project.getByRole("button", { name: "Maximize jquery-website-input" })).toHaveCount(0);
  await expect(project.locator("iframe")).toBeVisible();
  const frameBox = await project.locator("iframe").boundingBox();
  expect(frameBox?.width).toBeLessThanOrEqual(390);
});
