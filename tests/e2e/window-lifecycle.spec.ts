import { expect, test } from "@playwright/test";
import {
  expectTrafficOwnershipMap,
  exerciseTrafficHitPoints,
  expectFontAwesomeIconToPaint,
  expectConventionalRoundedGeometry,
  touchDrag,
} from "./drivers/contracts";

test("uses conventional rounded geometry without shape masks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  const trigger = page.getByRole("menuitem", { name: "Open tienOS menu" });
  await trigger.click();
  const popup = page.locator(".tienos-menu-popup").first();
  const menuItem = page.getByRole("menuitem", { name: "System Settings…" });

  expect(await trigger.evaluate((node) => parseFloat(getComputedStyle(node).borderRadius))).toBeGreaterThan(
    0,
  );
  await expect(popup).toHaveCSS("border-radius", "14px");
  await expect(menuItem).toHaveCSS("border-radius", "10px");
  for (const element of [trigger, popup, menuItem]) {
    await expectConventionalRoundedGeometry(element);
  }
  await menuItem.click();

  const settingsWindow = page.locator(".settings-window");
  const sidebarPanel = page.locator(".settings-sidebar-panel");
  await expect(settingsWindow).toHaveCSS("font-size", "13px");
  await expect(settingsWindow).toHaveCSS("border-radius", "24px");
  await expect(sidebarPanel).toHaveCSS("border-radius", "16px");
  await expect(page.locator(".settings-hero h2")).toHaveCSS("font-size", "23px");

  const representatives = [
    settingsWindow,
    page.locator(".settings-sidebar-panel"),
    page.locator(".settings-search"),
    page.locator(".settings-nav-item").first(),
    page.locator(".settings-icon").first(),
    page.locator(".settings-hero"),
    page.locator(".settings-hero-icon"),
    page.locator(".settings-group").first(),
    page.locator(".settings-row-icon").first(),
  ];

  for (const element of representatives) {
    await expectConventionalRoundedGeometry(element, {
      allowFullRectangleClip: element === settingsWindow,
    });
  }

  const circles = [page.locator("[data-traffic-dot]").first(), page.locator(".settings-avatar")];
  for (const circle of circles) {
    const geometry = await circle.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        radius: parseFloat(getComputedStyle(element).borderTopLeftRadius),
      };
    });
    expect(geometry.width).toBe(geometry.height);
    expect(geometry.radius).toBeGreaterThanOrEqual(geometry.width / 2);
  }
});

test("adds visible row boundaries with increased contrast", async ({ page }) => {
  await page.emulateMedia({ contrast: "more" });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  const menuItem = page.getByRole("menuitem", { name: "System Settings…" });
  await expect(menuItem).not.toHaveCSS("box-shadow", "none");
  await menuItem.click();
  const settingsRow = page.locator(".settings-row").first();
  await expect(settingsRow).not.toHaveCSS("box-shadow", "none");
  await expect(settingsRow).toHaveCSS("outline-style", "none");

  await page.keyboard.press("Tab");
  await settingsRow.focus();
  await expect(settingsRow).toBeFocused();
  await expect(settingsRow).toHaveCSS("outline-style", "solid");
  await expect(settingsRow).toHaveCSS("outline-width", "2px");
  await expect(settingsRow).toHaveCSS("outline-offset", "-2px");

  const selectedNavItem = page.locator(".settings-nav-item[data-selected]");
  await page.keyboard.press("Tab");
  await selectedNavItem.focus();
  await expect(selectedNavItem).toHaveCSS("outline-color", "rgb(255, 255, 255)");
  const selectedColors = await selectedNavItem.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { background: styles.backgroundColor, focus: styles.outlineColor };
  });
  expect(selectedColors.focus).not.toBe(selectedColors.background);
});

test("opens System Settings by default and supports close and reopen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await expect(settingsWindow).toBeVisible();
  await expect(settingsWindow).toHaveCount(1);
  await page.getByRole("button", { name: "Close System Settings" }).click();
  await expect(settingsWindow).toBeHidden();

  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  await expect(settingsWindow).toBeVisible();
  await expect(settingsWindow).toHaveCount(1);
  await expect(page.getByRole("menuitem", { name: "System Settings…" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
  await expectFontAwesomeIconToPaint(
    page.locator('.settings-search [data-fa-icon="magnifying-glass"]'),
    "magnifying-glass",
  );
  await expectFontAwesomeIconToPaint(page.locator('.settings-hero [data-fa-icon="gear"]'), "gear");
  await expectFontAwesomeIconToPaint(
    page.locator('.settings-row [data-fa-icon="shield-check"]'),
    "shield-check",
  );
  await expectFontAwesomeIconToPaint(
    page.locator('.settings-row [data-fa-icon="chevron-right"]').first(),
    "chevron-right",
  );
  expect(
    await page
      .locator(
        ".settings-search,.settings-family,.settings-icon,.settings-hero-icon,.settings-row-icon,.settings-chevron,.settings-history",
      )
      .allTextContents(),
  ).not.toEqual(expect.arrayContaining([expect.stringMatching(/[⌁ᛒ◎◉⚙◌◐✦▣☀☷⌕❉◖⌨▱▤⛨▰▦♙›‹]/u)]));
  await page.getByRole("button", { name: "Close System Settings" }).click();
  await expect(page.getByRole("region", { name: "System Settings" })).toBeHidden();
});

test("fits and fixes an open System Settings window on compact screens", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await page.setViewportSize({ width: 320, height: 320 });
  await expect(settingsWindow).toHaveCSS("border-radius", "18px");
  await expect(page.locator(".settings-sidebar-panel")).toHaveCSS("border-radius", "11px");
  await expect(page.locator(".settings-hero h2")).toHaveCSS("font-size", "22px");
  await expect(page.locator(".settings-search")).toHaveCSS("padding-left", "8px");
  await expect(page.locator(".settings-search")).toHaveCSS("padding-right", "8px");
  const history = page.locator(".settings-history");
  await expect(history).toHaveCSS("align-items", "center");
  await expect(history).toHaveCSS("height", "36px");
  await expect(history.getByRole("button", { name: "Back" })).toHaveCSS("width", "38px");
  await expect(history.getByRole("button", { name: "Back" })).toHaveCSS("font-size", "12px");

  await expect
    .poll(async () => {
      const [bounds, menuBounds, dockBounds] = await Promise.all([
        settingsWindow.boundingBox(),
        page.locator("[data-menu-bar-surface]").boundingBox(),
        page.locator("[data-dock-surface]").boundingBox(),
      ]);
      if (!bounds || !menuBounds || !dockBounds) return null;
      const top = Math.max(46, Math.ceil(menuBounds.y + menuBounds.height));
      return [
        Math.round(bounds.x) - 8,
        Math.round(bounds.y) - top,
        Math.round(bounds.width) - 304,
        Math.round(bounds.height) - Math.max(0, Math.floor(dockBounds.y) - top - 8),
      ];
    })
    .toEqual([0, 0, 0, 0]);

  const compactBounds = await settingsWindow.boundingBox();
  const compactDragHandle = await page.locator(".settings-history").boundingBox();
  await page.mouse.move(compactDragHandle!.x + 38, compactDragHandle!.y + compactDragHandle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(compactDragHandle!.x - 2, compactBounds!.y - 20, {
    steps: 4,
  });
  await page.mouse.up();

  const fixedBounds = await settingsWindow.boundingBox();
  expect(fixedBounds).toEqual(compactBounds);
});

test("resizes the Settings sidebar with mouse, keyboard, touch, and responsive bounds", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  const splitter = page.getByRole("separator", { name: "Resize Settings sidebar" });
  await expect(splitter).toHaveAttribute("aria-orientation", "vertical");
  const initialValue = Number(await splitter.getAttribute("aria-valuenow"));
  const grip = splitter.locator("[data-splitter-grip]");
  await expect(grip).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await splitter.hover();
  await expect(grip).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const splitterBounds = await splitter.boundingBox();
  await page.mouse.move(splitterBounds!.x + 4, splitterBounds!.y + 120);
  await page.mouse.down();
  await page.mouse.move(splitterBounds!.x + 64, splitterBounds!.y + 120);
  await page.mouse.up();
  expect(Number(await splitter.getAttribute("aria-valuenow"))).toBeGreaterThan(initialValue);

  await splitter.focus();
  await expect(grip).not.toHaveCSS("box-shadow", "none");
  await page.keyboard.press("Home");
  expect(await splitter.getAttribute("aria-valuenow")).toBe(await splitter.getAttribute("aria-valuemin"));
  await page.keyboard.press("End");
  expect(await splitter.getAttribute("aria-valuenow")).toBe(await splitter.getAttribute("aria-valuemax"));
  await page.keyboard.press("ArrowLeft");
  expect(Number(await splitter.getAttribute("aria-valuenow"))).toBeLessThan(
    Number(await splitter.getAttribute("aria-valuemax")),
  );

  const session = await page.context().newCDPSession(page);
  const beforeTouch = Number(await splitter.getAttribute("aria-valuenow"));
  const touchBounds = await splitter.boundingBox();
  await touchDrag(
    session,
    { x: touchBounds!.x + 4, y: touchBounds!.y + 160 },
    { x: touchBounds!.x - 35, y: touchBounds!.y + 160 },
  );
  expect(Number(await splitter.getAttribute("aria-valuenow"))).toBeLessThan(beforeTouch);

  await page.setViewportSize({ width: 390, height: 844 });
  const settingsWindow = page.locator(".settings-window");
  await expect.poll(async () => Math.round((await settingsWindow.boundingBox())?.width ?? 0)).toBe(374);
  expect(Number(await splitter.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(36);
  const shell = await settingsWindow.boundingBox();
  const sidebar = await page.locator(".settings-sidebar").boundingBox();
  expect(Math.round(shell!.width)).toBe(374);
  expect(sidebar!.width / shell!.width).toBeGreaterThanOrEqual(0.36);
  expect(sidebar!.width / shell!.width).toBeLessThanOrEqual(0.43);
  await expect(page.locator(".settings-nav-item").first()).toHaveCSS("min-height", "33.5px");
});

test("keeps labeled sidebar and immediate keyboard resizing after compact recomputation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 700, height: 700 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  const splitter = page.getByRole("separator", { name: "Resize Settings sidebar" });
  await splitter.focus();
  await page.keyboard.press("End");
  const maximum = await splitter.getAttribute("aria-valuemax");
  expect(maximum).not.toBeNull();
  await expect(splitter).toHaveAttribute("aria-valuenow", maximum!);

  await page.setViewportSize({ width: 320, height: 700 });
  await expect
    .poll(
      async () =>
        Number(await splitter.getAttribute("aria-valuenow")) ===
        Number(await splitter.getAttribute("aria-valuemax")),
    )
    .toBe(true);
  const beforeArrow = Number(await splitter.getAttribute("aria-valuenow"));
  await page.keyboard.press("ArrowLeft");
  expect(Number(await splitter.getAttribute("aria-valuenow"))).toBeLessThan(beforeArrow);

  const firstCategory = page.locator(".settings-nav-item").first();
  const firstLabel = firstCategory.getByText("General", { exact: true });
  await expect(firstLabel).toBeVisible();
  const [categoryBounds, labelBounds] = await Promise.all([
    firstCategory.boundingBox(),
    firstLabel.boundingBox(),
  ]);
  expect(categoryBounds!.height).toBeGreaterThanOrEqual(33.5);
  expect(labelBounds!.width).toBeGreaterThan(0);
  expect(labelBounds!.x + labelBounds!.width).toBeLessThanOrEqual(categoryBounds!.x + categoryBounds!.width);
});

test("supports touch window drag, resize, boundary clamping, and inner scrolling", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1100, height: 900 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  const session = await context.newCDPSession(page);
  const shell = page.locator(".settings-window");
  const initial = await shell.boundingBox();
  const dragHandle = await page.locator(".settings-sidebar-panel").boundingBox();
  await touchDrag(
    session,
    { x: dragHandle!.x + dragHandle!.width - 12, y: dragHandle!.y + 20 },
    { x: dragHandle!.x + dragHandle!.width + 18, y: dragHandle!.y + 44 },
  );
  const dragged = await shell.boundingBox();
  expect(Math.round(dragged!.x - initial!.x)).toBe(30);
  expect(Math.round(dragged!.y - initial!.y)).toBe(24);

  const movedHandle = await page.locator(".settings-sidebar-panel").boundingBox();
  await touchDrag(
    session,
    { x: movedHandle!.x + movedHandle!.width - 12, y: movedHandle!.y + 20 },
    { x: movedHandle!.x + movedHandle!.width - 12, y: 0 },
  );
  const menu = await page.locator("[data-menu-bar-surface]").boundingBox();
  expect((await shell.boundingBox())!.y).toBeGreaterThanOrEqual(menu!.y + menu!.height);

  const resizeHandle = await page.locator('.settings-rnd div[style*="se-resize"]').boundingBox();
  const beforeResize = await shell.boundingBox();
  await touchDrag(
    session,
    { x: resizeHandle!.x + 5, y: resizeHandle!.y + 5 },
    { x: resizeHandle!.x + 35, y: resizeHandle!.y + 25 },
  );
  const resized = await shell.boundingBox();
  expect(resized!.width).toBeGreaterThan(beforeResize!.width);
  expect(resized!.height).toBeGreaterThan(beforeResize!.height);

  const details = page.locator('.settings-scroll-viewport[aria-label="Settings details"]');
  const detailsBounds = await details.boundingBox();
  const beforeScroll = await details.evaluate((node) => node.scrollTop);
  await touchDrag(
    session,
    { x: detailsBounds!.x + detailsBounds!.width / 2, y: detailsBounds!.y + detailsBounds!.height - 30 },
    { x: detailsBounds!.x + detailsBounds!.width / 2, y: detailsBounds!.y + 30 },
  );
  expect(await details.evaluate((node) => node.scrollTop)).toBeGreaterThan(beforeScroll);
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(1);
  await context.close();
});

test("uses measured menu geometry for initial and constrained settings frames", async ({ page }) => {
  await page.setViewportSize({ width: 680, height: 500 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await page.getByRole("button", { name: "Close System Settings" }).click();
  await page.evaluate(() => {
    const observedWindow = window as typeof window & { firstSettingsTop?: number };
    new MutationObserver((_, observer) => {
      const settings = document.querySelector<HTMLElement>(".settings-window");
      if (!settings) return;
      observedWindow.firstSettingsTop = settings.getBoundingClientRect().top;
      observer.disconnect();
    }).observe(document.getElementById("root")!, { childList: true, subtree: true });
  });

  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();
  const menuBottom = await page
    .locator("[data-menu-bar-surface]")
    .evaluate((element) => element.getBoundingClientRect().bottom);
  expect(
    await page.evaluate(() => (window as typeof window & { firstSettingsTop?: number }).firstSettingsTop),
  ).toBeGreaterThanOrEqual(menuBottom);
  expect((await settingsWindow.boundingBox())!.y).toBeGreaterThanOrEqual(menuBottom);

  await page.setViewportSize({ width: 1100, height: 500 });
  const frame = page.locator(".settings-rnd");
  const dockTop = await page
    .locator("[data-dock-surface]")
    .evaluate((element) => element.getBoundingClientRect().top);
  const expectedAvailableHeight = `${Math.floor(dockTop) - Math.ceil(menuBottom)}px`;
  await expect(frame).toHaveCSS("min-height", expectedAvailableHeight);
  await expect(frame).toHaveCSS("max-height", expectedAvailableHeight);
  const constrainedBounds = await settingsWindow.boundingBox();
  expect(constrainedBounds!.y).toBeGreaterThanOrEqual(menuBottom);
  expect(constrainedBounds!.y + constrainedBounds!.height).toBeLessThanOrEqual(dockTop);
});

test("Dock activation minimizes only the active frontmost Settings window", async ({ page }) => {
  await page.goto("/");
  const dockApp = page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: "System Settings" });
  const window = page.getByRole("region", { name: "System Settings" });

  await page.mouse.click(1400, 400);
  await dockApp.click();
  await expect(window).toBeVisible();
  await expect(window).toBeFocused();
  await expect(window).toHaveCount(1);

  await dockApp.click();
  await expect(window).toBeHidden();
  await expect(dockApp).not.toHaveAttribute("aria-pressed");
  await expect(page.getByRole("navigation", { name: "Dock" }).getByRole("status")).toHaveText(
    "System Settings is running and minimized",
  );
  await dockApp.click();
  await expect(page.locator('[data-genie-window][data-window-visibility="visible"]')).toHaveCount(1);
  await expect(window).toBeFocused();
  await expect(window).toHaveCount(1);
});

test("traffic lights preserve one window through genie minimize, Dock restore, and fullscreen", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const window = page.getByRole("region", { name: "System Settings" });
  const genieWindow = page.locator("[data-genie-window]");
  const dock = page.getByRole("navigation", { name: "Dock" });
  const dockApp = dock.getByRole("button", { name: "System Settings" });
  const normal = await window.boundingBox();
  expect(normal).not.toBeNull();

  await page
    .getByRole("button", { name: "Minimize System Settings" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator('.settings-window[data-window-visibility="minimizing"]')).toHaveCount(1);
  await page.waitForTimeout(120);
  const midpoint = await genieWindow.evaluate((element) => ({
    transform: getComputedStyle(element).transform,
    clipPath: getComputedStyle(element).clipPath,
    opacity: Number(getComputedStyle(element).opacity),
  }));
  expect(midpoint.transform).not.toBe("none");
  expect(midpoint.clipPath).not.toContain("0px 0px, 100% 0px, 100% 100%");
  expect(midpoint.opacity).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("settings-genie-midpoint.png") });

  await expect(window).toBeHidden();
  await expect(dock.getByRole("status")).toHaveText("System Settings is running and minimized");
  await dockApp.click();
  await expect(window).toBeVisible();
  await page.waitForTimeout(430);
  await expect(window).toBeFocused();
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(1);
  await expect.poll(() => window.boundingBox(), { timeout: 2_000 }).toEqual(normal);
  await page.screenshot({ path: testInfo.outputPath("settings-restored.png") });

  const fullscreen = page.getByRole("button", { name: "Toggle fullscreen System Settings" });
  await expect(fullscreen).toHaveAttribute("aria-pressed", "false");
  await fullscreen.click();
  await expect(fullscreen).toHaveAttribute("aria-pressed", "true");
  const menuBottom = await page
    .locator("[data-menu-bar-surface]")
    .evaluate((el) => el.getBoundingClientRect().bottom);
  const dockTop = await page.locator("[data-dock-surface]").evaluate((el) => el.getBoundingClientRect().top);
  const maximized = await window.boundingBox();
  expect(maximized).not.toBeNull();
  expect(maximized!.x).toBeCloseTo(0, 0);
  expect(maximized!.y).toBeCloseTo(Math.ceil(menuBottom), 0);
  expect(maximized!.width).toBeCloseTo(page.viewportSize()!.width, 0);
  expect(maximized!.height).toBeCloseTo(Math.floor(dockTop) - Math.ceil(menuBottom), 0);
  await page.screenshot({ path: testInfo.outputPath("settings-fullscreen.png") });
  await fullscreen.click();
  expect(await window.boundingBox()).toEqual(normal);

  // Fullscreen is preserved across minimize/restore, while close starts a fresh normal window.
  await fullscreen.click();
  await page.getByRole("button", { name: "Minimize System Settings" }).click();
  await expect(window).toBeHidden();
  await dockApp.click();
  await expect(page.getByRole("button", { name: "Toggle fullscreen System Settings" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Close System Settings" }).click();
  await expect(dock.getByRole("status")).toHaveText("System Settings is not running");
  await dockApp.click();
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Toggle fullscreen System Settings" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("each traffic light accepts genuine touch activation", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 320, height: 568 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const dockApp = page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: "System Settings" });
  await expectTrafficOwnershipMap(page);
  const compactDotGeometry = await page.locator("[data-sidebar-panel]").evaluate((panel) => {
    const panelBox = panel.getBoundingClientRect();
    return Array.from(panel.querySelectorAll<HTMLElement>("[data-traffic-dot]"), (dot) => {
      const box = dot.getBoundingClientRect();
      return {
        center: Math.round((box.left + box.width / 2 - panelBox.left) * 1_000) / 1_000,
        owner: document
          .elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
          ?.closest("button")
          ?.getAttribute("aria-label"),
        size: box.width,
      };
    });
  });
  expect(compactDotGeometry).toEqual([
    { center: 25, owner: "Close System Settings", size: 11 },
    { center: 45, owner: "Minimize System Settings", size: 11 },
    { center: 65, owner: "Toggle fullscreen System Settings", size: 11 },
  ]);
  const compactHeaderClearance = await page.evaluate(() => {
    const fullscreen = document.querySelector<HTMLElement>(
      'button[aria-label="Toggle fullscreen System Settings"]',
    )!;
    const history = document.querySelector<HTMLElement>(".settings-history")!;
    return history.getBoundingClientRect().left - fullscreen.getBoundingClientRect().right;
  });
  expect(compactHeaderClearance).toBeGreaterThanOrEqual(0);
  const splitter = await page.getByRole("separator", { name: "Resize Settings sidebar" }).boundingBox();
  const controls = await page.locator('[aria-label="Window controls"]').boundingBox();
  expect(splitter).not.toBeNull();
  expect(controls).not.toBeNull();
  expect(controls!.x + 84).toBeLessThanOrEqual(splitter!.x);
  expect(
    await page.evaluate(() =>
      document
        .elementFromPoint(
          document.querySelector<HTMLElement>('[aria-label="Window controls"]')!.getBoundingClientRect()
            .left + 83.5,
          document.querySelector<HTMLElement>('[aria-label="Window controls"]')!.getBoundingClientRect().top +
            22,
        )
        ?.closest("button")
        ?.getAttribute("aria-label"),
    ),
  ).toBe("Toggle fullscreen System Settings");
  await exerciseTrafficHitPoints(page, async (x, y) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, radiusX: 1, radiusY: 1, force: 1, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  });
  await page.screenshot({ path: testInfo.outputPath("settings-touch-fullscreen.png") });

  await dockApp.tap();
  await expect(page.getByRole("region", { name: "System Settings" })).toBeHidden();
  await dockApp.press("Enter");
  await expect(page.getByRole("region", { name: "System Settings" })).toBeVisible();
  await context.close();
});

test("genie transition is interruptible and reduced motion bypasses warping", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const continuity = await page
    .getByRole("button", { name: "Minimize System Settings" })
    .evaluate(async (button: HTMLButtonElement) => {
      const window = document.querySelector<HTMLElement>("[data-genie-window]")!;
      const dock = document.querySelector<HTMLButtonElement>("[data-dock-settings]")!;
      const readVisualState = () => {
        const style = getComputedStyle(window);
        return {
          clipPath: Array.from(style.clipPath.matchAll(/-?\d+(?:\.\d+)?/g), (match) => Number(match[0])),
          matrix: Array.from(new DOMMatrixReadOnly(style.transform).toFloat64Array()),
          opacity: Number(style.opacity),
          visibility: window.dataset.windowVisibility,
        };
      };
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 120));
      const before = readVisualState();
      const afterRestoring = new Promise<ReturnType<typeof readVisualState>>((resolve) => {
        const observer = new MutationObserver(() => {
          if (window.dataset.windowVisibility !== "restoring") return;
          observer.disconnect();
          resolve(readVisualState());
        });
        observer.observe(window, { attributes: true, attributeFilter: ["data-window-visibility"] });
      });
      dock.click();
      return { before, after: await afterRestoring };
    });
  const maximumDelta = (before: number[], after: number[]) =>
    Math.max(...before.map((value, index) => Math.abs(value - after[index])));
  expect(maximumDelta(continuity.before.clipPath, continuity.after.clipPath)).toBeLessThan(2);
  expect(maximumDelta(continuity.before.matrix, continuity.after.matrix)).toBeLessThan(2);
  expect(Math.abs(continuity.before.opacity - continuity.after.opacity)).toBeLessThan(0.02);
  expect(continuity.before.visibility).toBe("minimizing");
  expect(continuity.after.visibility).toBe("restoring");
  await expect(page.getByRole("region", { name: "System Settings" })).toBeVisible();
  await expect(page.getByRole("region", { name: "System Settings" })).toBeFocused();

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedStyle = await page
    .getByRole("button", { name: "Minimize System Settings" })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      const window = document.querySelector<HTMLElement>(".settings-window")!;
      const style = getComputedStyle(window);
      return { transform: style.transform, transitionDuration: style.transitionDuration };
    });
  expect(reducedStyle.transform).toBe("none");
  expect(reducedStyle.transitionDuration).toBe("0.08s");
  await expect(page.getByRole("navigation", { name: "Dock" }).getByRole("status")).toHaveText(
    "System Settings is running and minimized",
  );
});

test("fullscreen preserves window identity, keyboard focus, scroll, and live usable geometry", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const window = page.getByRole("region", { name: "System Settings" });
  const fullscreen = page.getByRole("button", { name: "Toggle fullscreen System Settings" });
  const details = page.locator('.settings-scroll-viewport[aria-label="Settings details"]');
  await window.evaluate((element) => (element.dataset.testIdentity = "original"));
  await details.evaluate((element) => (element.scrollTop = 96));
  const scrollTop = await details.evaluate((element) => element.scrollTop);

  await fullscreen.focus();
  await fullscreen.press("Enter");
  await expect(fullscreen).toBeFocused();
  await expect(window).toHaveAttribute("data-test-identity", "original");

  await page.setViewportSize({ width: 1180, height: 760 });
  await expect
    .poll(async () => {
      const box = await window.boundingBox();
      const menuBottom = await page
        .locator("[data-menu-bar-surface]")
        .evaluate((element) => Math.ceil(element.getBoundingClientRect().bottom));
      const dockTop = await page
        .locator("[data-dock-surface]")
        .evaluate((element) => Math.floor(element.getBoundingClientRect().top));
      return (
        box !== null &&
        Math.abs(box.x) <= 1 &&
        Math.abs(box.y - menuBottom) <= 1 &&
        Math.abs(box.width - 1180) <= 1 &&
        Math.abs(box.height - (dockTop - menuBottom)) <= 1
      );
    })
    .toBe(true);
  await page.locator("[data-dock-surface]").evaluate((dock) => (dock.style.bottom = "90px"));
  await expect
    .poll(async () => {
      const height = (await window.boundingBox())?.height;
      const expected = await page
        .locator("[data-dock-surface]")
        .evaluate((element) => Math.floor(element.getBoundingClientRect().top) - 30);
      return height !== undefined && Math.abs(height - expected) <= 1;
    })
    .toBe(true);

  await fullscreen.press("Enter");
  await expect(fullscreen).toBeFocused();
  await expect(window).toHaveAttribute("data-test-identity", "original");
  expect(await details.evaluate((element) => element.scrollTop)).toBe(scrollTop);
});

test("transition state is inert, tracks Dock movement, and repeated activation stays deterministic", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const window = page.locator("[data-genie-window]");
  const dock = page.getByRole("navigation", { name: "Dock" });
  const dockApp = dock.getByRole("button", { name: "System Settings" });

  await page.mouse.click(1400, 400);
  await page.screenshot({ path: testInfo.outputPath("settings-inactive.png") });
  await page.getByPlaceholder("Search").click();
  await page.screenshot({ path: testInfo.outputPath("settings-active.png") });
  const minimizing = await page
    .getByRole("button", { name: "Minimize System Settings" })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      return new Promise<{ visibility: string | undefined; hidden: string | null; inert: boolean }>(
        (resolve) =>
          requestAnimationFrame(() => {
            const element = document.querySelector<HTMLElement>("[data-genie-window]")!;
            resolve({
              visibility: element.dataset.windowVisibility,
              hidden: element.getAttribute("aria-hidden"),
              inert: element.inert,
            });
          }),
      );
    });
  expect(minimizing).toEqual({ visibility: "minimizing", hidden: "true", inert: true });
  const originalTarget = await window.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--genie-y"),
  );
  await page.waitForTimeout(300);
  await page.locator("[data-dock-surface]").evaluate((element) => (element.style.bottom = "120px"));
  await page.waitForTimeout(150);
  expect(
    await window.evaluate((element) => getComputedStyle(element).getPropertyValue("--genie-y")),
  ).not.toBe(originalTarget);
  await expect(dock.getByRole("status")).toHaveText("System Settings is running and minimized", {
    timeout: 2_500,
  });

  const activateTwiceAndReadWindow = (button: HTMLButtonElement) => {
    button.click();
    return new Promise<Array<{ visibility: string | undefined; hidden: string | null; inert: boolean }>>(
      (resolve) =>
        requestAnimationFrame(() => {
          const element = document.querySelector<HTMLElement>("[data-genie-window]")!;
          const first = {
            visibility: element.dataset.windowVisibility,
            hidden: element.getAttribute("aria-hidden"),
            inert: element.inert,
          };
          button.click();
          requestAnimationFrame(() =>
            resolve([
              first,
              {
                visibility: element.dataset.windowVisibility,
                hidden: element.getAttribute("aria-hidden"),
                inert: element.inert,
              },
            ]),
          );
        }),
    );
  };
  const [restoring, repeated] = await dockApp.evaluate(activateTwiceAndReadWindow);
  expect(restoring).toEqual({ visibility: "restoring", hidden: "true", inert: true });
  expect([
    { visibility: "restoring", hidden: "true", inert: true },
    { visibility: "visible", hidden: null, inert: false },
  ]).toContainEqual(repeated);
  await expect(window).toHaveAttribute("data-window-visibility", "visible", { timeout: 1_000 });
  await expect(window).not.toHaveAttribute("aria-hidden");
  expect(await window.evaluate((element: HTMLElement): boolean => element.inert)).toBe(false);
  await dockApp.evaluate((button: HTMLButtonElement) => button.click());
  await expect(dock.getByRole("status")).toHaveText("System Settings is running and minimized", {
    timeout: 2_500,
  });
});

test("keyboard traffic lights preserve focus, geometry, and single-window state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const dockApp = page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: "System Settings" });
  const dockStatus = page.getByRole("navigation", { name: "Dock" }).getByRole("status");
  const window = page.getByRole("region", { name: "System Settings" });
  const search = page.getByPlaceholder("Search");
  const normal = await window.boundingBox();
  expect(normal).not.toBeNull();

  await search.focus();
  await dockApp.click();
  await expect(dockStatus).toHaveText("System Settings is running and minimized");
  await dockApp.click();
  await expect(page.locator('[data-genie-window][data-window-visibility="visible"]')).toHaveCount(1);
  await expect(search).toBeFocused({ timeout: 1_000 });

  const minimize = page.getByRole("button", { name: "Minimize System Settings" });
  await minimize.focus();
  await minimize.press("Space");
  await expect(dockStatus).toHaveText("System Settings is running and minimized");
  await dockApp.click();
  await expect(page.locator('[data-genie-window][data-window-visibility="visible"]')).toHaveCount(1);
  await expect(minimize).toBeFocused({ timeout: 1_000 });

  const fullscreen = page.getByRole("button", { name: "Toggle fullscreen System Settings" });
  await fullscreen.focus();
  await fullscreen.press("Enter");
  await expect(fullscreen).toHaveAttribute("aria-pressed", "true");
  await expect(fullscreen).toBeFocused();
  expect(await window.boundingBox()).not.toEqual(normal);
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(1);
  await fullscreen.press("Space");
  await expect(fullscreen).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => window.boundingBox()).toEqual(normal);
  await expect(fullscreen).toBeFocused();

  const close = page.getByRole("button", { name: "Close System Settings" });
  await close.focus();
  await close.press("Enter");
  await expect(window).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Dock" }).getByRole("status")).toHaveText(
    "System Settings is not running",
  );
  await dockApp.press("Enter");
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(1);
});

test("fullscreen exit reconciles saved geometry across the compact breakpoint", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const window = page.getByRole("region", { name: "System Settings" });
  const fullscreen = page.getByRole("button", { name: "Toggle fullscreen System Settings" });
  await fullscreen.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await window.boundingBox())?.width).toBeCloseTo(390, 0);
  await fullscreen.click();

  const dockTop = await page
    .locator("[data-dock-surface]")
    .evaluate((element) => Math.floor(element.getBoundingClientRect().top));
  await expect
    .poll(async () => {
      const box = await window.boundingBox();
      return (
        box !== null &&
        Math.abs(box.x - 8) <= 1 &&
        Math.abs(box.y - 46) <= 1 &&
        Math.abs(box.width - 374) <= 1 &&
        Math.abs(box.height - (dockTop - 54)) <= 1
      );
    })
    .toBe(true);
  await expect(fullscreen).toBeFocused();
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(1);
  const compactWindow = await window.boundingBox();
  const compactControls = await Promise.all(
    ["Close System Settings", "Minimize System Settings", "Toggle fullscreen System Settings"].map((name) =>
      page.getByRole("button", { name }).boundingBox(),
    ),
  );
  for (const control of compactControls) {
    expect(control).not.toBeNull();
    expect(control!.width).toBeCloseTo(44, 0);
    expect(control!.height).toBeCloseTo(44, 0);
    expect(control!.x).toBeGreaterThanOrEqual(compactWindow!.x);
    expect(control!.x + control!.width).toBeLessThanOrEqual(compactWindow!.x + compactWindow!.width);
  }
  await page.screenshot({ path: testInfo.outputPath("settings-fullscreen-compact-exit.png") });
});

test("same-tick and repeated Dock activation reverse one minimize transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");

  const states = await page.evaluate(async () => {
    const minimize = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Minimize System Settings"]',
    )!;
    const dock = document.querySelector<HTMLButtonElement>("[data-dock-settings]")!;
    const readVisibility = () =>
      document.querySelector<HTMLElement>("[data-genie-window]")!.dataset.windowVisibility;
    const nextPaint = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    minimize.click();
    dock.click();
    await nextPaint();
    const afterInterruption = readVisibility();
    dock.click();
    dock.click();
    await nextPaint();
    return [afterInterruption, readVisibility()];
  });

  expect(states).toEqual(["restoring", "visible"]);
  await expect(page.locator('[data-genie-window][data-window-visibility="visible"]')).toHaveCount(1);
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Dock" }).getByRole("status")).toHaveText(
    "System Settings is running",
  );
});

test("fresh Settings lifecycles discard stale and in-flight requests", async ({ page }) => {
  test.setTimeout(30_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const window = page.locator("[data-genie-window]");
  const dock = page.getByRole("navigation", { name: "Dock" });
  const dockApp = dock.getByRole("button", { name: "System Settings" });
  const dockStatus = dock.getByRole("status");
  const initialFrame = await window.boundingBox();

  await dockApp.click();
  await expect(dockStatus).toHaveText("System Settings is running and minimized");
  await dockApp.click();
  await expect(window).toHaveAttribute("data-window-visibility", "visible");
  await page.getByRole("button", { name: "Close System Settings" }).click();
  await expect(dockStatus).toHaveText("System Settings is not running");
  await dockApp.click();
  await expect(window).toHaveAttribute("data-window-visibility", "visible");
  await expect(window).toBeFocused();
  await expect(window).toHaveCount(1);
  await expect.poll(() => window.boundingBox()).toEqual(initialFrame);
  await page.waitForTimeout(500);
  await expect(window).toHaveAttribute("data-window-visibility", "visible");

  await page
    .getByRole("button", { name: "Minimize System Settings" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(window).toHaveAttribute("data-window-visibility", "minimizing");
  await page
    .locator('button[aria-label="Close System Settings"]')
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(window).toHaveCount(0);
  await expect(dockStatus).toHaveText("System Settings is not running");
  await dockApp.click();
  await expect(window).toHaveAttribute("data-window-visibility", "visible");
  await expect(window).toBeFocused();
  await expect(window).toHaveCount(1);

  const rapidVisibility = await dockApp.evaluate(async (button: HTMLButtonElement) => {
    button.click();
    button.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return document.querySelector<HTMLElement>("[data-genie-window]")?.dataset.windowVisibility;
  });
  expect(rapidVisibility).toBe("visible");
  await expect(window).toHaveCount(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Minimize System Settings" }).click();
  await expect(dockStatus).toHaveText("System Settings is running and minimized");
  await dockApp.click();
  await expect(window).toHaveAttribute("data-window-visibility", "visible");
  await page.getByRole("button", { name: "Close System Settings" }).click();
  await dockApp.click();
  await expect(window).toHaveAttribute("data-window-visibility", "visible");
  await expect(window).toBeFocused();
  await expect(window).toHaveCount(1);
  await page.waitForTimeout(150);
  await expect(dockStatus).toHaveText("System Settings is running");
});

test("window lifecycle never installs a desktop-wide visual or pointer backdrop", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const window = page.locator("[data-genie-window]");
  const dockApp = page.getByRole("navigation", { name: "Dock" }).getByRole("button", {
    name: "System Settings",
  });
  const desktopCrop = { x: 8, y: 72, width: 96, height: 96 };
  const desktopFrame = () => page.screenshot({ animations: "disabled", clip: desktopCrop });
  const expectNoViewportBoundary = async () => {
    expect(
      await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("body *")]
          .filter((element) => {
            const style = getComputedStyle(element);
            const bounds = element.getBoundingClientRect();
            return (
              style.position === "fixed" &&
              style.pointerEvents !== "none" &&
              bounds.left <= 0 &&
              bounds.top <= 0 &&
              bounds.right >= innerWidth &&
              bounds.bottom >= innerHeight
            );
          })
          .map((element) => element.outerHTML.slice(0, 120)),
      ),
    ).toEqual([]);
  };

  await page.getByRole("button", { name: "Close System Settings" }).click();
  const before = await desktopFrame();
  await testInfo.attach("desktop-before-open", { body: before, contentType: "image/png" });

  await dockApp.click();
  await expect(window).toHaveAttribute("data-window-visibility", "visible");
  await expectNoViewportBoundary();
  const open = await desktopFrame();
  await testInfo.attach("desktop-window-open", { body: open, contentType: "image/png" });
  expect(open.equals(before)).toBe(true);
  await expect(page.locator(".settings-window")).toHaveCSS("backdrop-filter", "blur(32px) saturate(1.4)");

  await page.mouse.click(40, 110);
  await expect(window).not.toBeFocused();
  expect((await desktopFrame()).equals(before)).toBe(true);
  await expectNoViewportBoundary();

  await dockApp.click();
  await expect(window).toHaveAttribute("data-window-visibility", "visible");
  await dockApp.click();
  await expect(page.getByRole("navigation", { name: "Dock" }).getByRole("status")).toHaveText(
    "System Settings is running and minimized",
  );
  expect((await desktopFrame()).equals(before)).toBe(true);
  await expectNoViewportBoundary();

  await dockApp.click();
  await expect(window).toHaveAttribute("data-window-visibility", "visible");
  expect((await desktopFrame()).equals(before)).toBe(true);
  const fullscreen = page.getByRole("button", { name: "Toggle fullscreen System Settings" });
  await fullscreen.click();
  await expect(fullscreen).toHaveAttribute("aria-pressed", "true");
  await expectNoViewportBoundary();
  await fullscreen.click();
  await expect(fullscreen).toHaveAttribute("aria-pressed", "false");
  expect((await desktopFrame()).equals(before)).toBe(true);

  await page.getByRole("button", { name: "Close System Settings" }).click();
  expect((await desktopFrame()).equals(before)).toBe(true);
  await expectNoViewportBoundary();
});
