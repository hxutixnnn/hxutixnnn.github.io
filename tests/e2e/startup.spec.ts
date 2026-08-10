import { expect, test } from "@playwright/test";
import {
  startupViewports,
  paintCriticalAssets,
  createDelayGate,
  armThemeAnimationPause,
  waitForThemeAnimations,
  pauseThemeAnimationsAtMidpoint,
  finishThemeAnimations,
  expectProductionThemeAnimations,
  expectFontAwesomeIconToPaint,
  expectBootIconToPaint,
  recordDismissalFrames,
  expectStyledDismissalFrames,
  expectCapturedFramesToMatchStableReveal,
} from "./drivers/contracts";

test("serves the canonical favicon set from the production root", async ({ page, request }, testInfo) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);

  const links = await page
    .locator('head link[rel~="icon"], head link[rel="apple-touch-icon"], head link[rel="manifest"]')
    .evaluateAll((elements) => elements.map((element) => (element as HTMLLinkElement).getAttribute("href")));
  expect(links).toEqual([
    "/favicon.svg",
    "/favicon-32x32.png",
    "/favicon-16x16.png",
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/manifest.webmanifest",
  ]);

  for (const href of links) {
    const asset = await request.get(href!);
    expect(asset.ok(), `${href} should load from the production base path`).toBe(true);
  }
  expect((await request.get("/favicon.svg")).headers()["content-type"]).toContain("image/svg+xml");
  expect((await request.get("/favicon-32x32.png")).headers()["content-type"]).toContain("image/png");

  await page.goto("/favicon.svg");
  await testInfo.attach("canonical-tienos-favicon.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

for (const startupViewport of startupViewports) {
  test(`keeps the splash until delayed styles are ready on ${startupViewport.name}`, async ({ page }) => {
    await page.setViewportSize(startupViewport);
    await recordDismissalFrames(page);
    let stylesGate = createDelayGate();
    let stylesheetIntercepted = false;

    await page.route(/\/assets\/.*\.css$/, async (route) => {
      stylesheetIntercepted = true;
      await stylesGate.blocked;
      await route.continue();
    });
    const navigation = page.goto("/", { waitUntil: "domcontentloaded" });
    await expect.poll(() => stylesheetIntercepted).toBe(true);
    await page.waitForTimeout(700);

    const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
    await expect(bootScreen).toBeVisible();
    await expect(page.locator(":root")).toHaveCSS("font-size", "16px");
    stylesGate.release();
    await navigation;
    await expect(bootScreen).toBeHidden({ timeout: 10_000 });
    await expect(page.locator(":root")).toHaveCSS("font-size", "13px");
    await expect(page.locator("[data-menu-bar-surface]")).toHaveCSS("position", "fixed");
    await expectStyledDismissalFrames(page, { settings: true });

    stylesGate = createDelayGate();
    stylesheetIntercepted = false;
    const warmNavigation = page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(() => stylesheetIntercepted).toBe(true);
    await page.waitForTimeout(700);
    await expect(bootScreen).toBeVisible();
    stylesGate.release();
    await warmNavigation;
    await expect(bootScreen).toBeHidden();
    await expectStyledDismissalFrames(page, { settings: true });
  });
}

for (const startupViewport of startupViewports) {
  test(`keeps the styled shell until delayed module success on ${startupViewport.name}`, async ({ page }) => {
    await page.setViewportSize(startupViewport);
    await recordDismissalFrames(page);
    let moduleGate = createDelayGate();
    let moduleIntercepted = false;

    await page.route(/\/assets\/.*\.js$/, async (route) => {
      moduleIntercepted = true;
      await moduleGate.blocked;
      await route.continue();
    });

    const navigation = page.goto("/", { waitUntil: "domcontentloaded" });
    await expect.poll(() => moduleIntercepted).toBe(true);

    const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
    const settingsWindow = page.getByRole("region", { name: "System Settings" });
    await expect(bootScreen).toBeVisible();
    await expect(page.locator(":root")).toHaveCSS("font-size", "13px");
    await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
    await expect(page.locator("[data-menu-bar-surface]")).toHaveCSS("position", "fixed");
    await expect(settingsWindow).toHaveCount(0);
    await expect(page.locator("#root")).toHaveAttribute("inert", "");
    await page.waitForTimeout(700);
    await expect(bootScreen).toBeVisible();

    moduleGate.release();
    await navigation;
    await expect(bootScreen).toBeHidden();
    await expect(settingsWindow).toHaveCount(1);
    await expectStyledDismissalFrames(page, { settings: true });

    moduleGate = createDelayGate();
    moduleIntercepted = false;
    const warmNavigation = page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(() => moduleIntercepted).toBe(true);
    await expect(bootScreen).toBeVisible();
    await expect(page.locator(":root")).toHaveCSS("font-size", "13px");
    await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
    await expect(page.locator("[data-menu-bar-surface]")).toHaveCSS("position", "fixed");
    await expect(settingsWindow).toHaveCount(0);
    await expect(page.locator("#root")).toHaveAttribute("inert", "");
    await page.waitForTimeout(100);
    await expect(bootScreen).toBeVisible();

    moduleGate.release();
    await warmNavigation;
    await expect(bootScreen).toBeHidden();
    await expect(settingsWindow).toHaveCount(1);
    await expectStyledDismissalFrames(page, { settings: true });
  });
}

for (const asset of paintCriticalAssets) {
  for (const startupViewport of startupViewports) {
    test(`keeps the splash until delayed ${asset.name} paint on ${startupViewport.name}`, async ({
      page,
    }) => {
      await recordDismissalFrames(page);
      await page.setViewportSize(startupViewport);
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: asset.colorScheme });

      let assetGate = createDelayGate();
      let assetIntercepted = false;
      await page.route(asset.url, async (route) => {
        assetIntercepted = true;
        await assetGate.blocked;
        await route.continue();
      });

      const navigation = page.goto("/", { waitUntil: "domcontentloaded" });
      await expect.poll(() => assetIntercepted).toBe(true);

      const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
      const bootIcon = page.locator("[data-boot-icon]");
      const settingsWindow = page.getByRole("region", { name: "System Settings" });
      await expect(settingsWindow).toHaveCount(1);
      await expect(page.locator(":root")).toHaveCSS("font-size", "13px");
      await expect(bootScreen).toBeVisible();
      const coldGeometry = await expectBootIconToPaint(bootIcon);
      expect(coldGeometry.x).toBeCloseTo((startupViewport.width - 112) / 2, 0);
      expect(coldGeometry.y).toBeCloseTo((startupViewport.height - 188) / 2, 0);
      expect(coldGeometry).toMatchObject({ width: 112, height: 112 });
      await page.waitForTimeout(700);
      expect(await expectBootIconToPaint(bootIcon)).toEqual(coldGeometry);
      await expect(page.locator("#root")).toHaveAttribute("inert", "");

      assetGate.release();
      await navigation;
      await expect(bootScreen).toBeHidden();
      await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
      await expectFontAwesomeIconToPaint(page.locator('[data-fa-icon="sparkle"]'), "sparkle");
      await expect(page.locator(".tienos-wallpaper")).not.toHaveCSS("background-image", "none");
      await expect(page.locator(".tienos-wallpaper")).toHaveCSS(
        "background-image",
        new RegExp(asset.colorScheme === "light" ? "tienos-light\\.jpg" : "tienos-default\\.jpg"),
      );
      await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-size", "cover");
      await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-position", "50% 50%");
      await expectStyledDismissalFrames(page, { settings: true });

      assetGate = createDelayGate();
      assetIntercepted = false;
      const warmNavigation = page.reload({ waitUntil: "domcontentloaded" });
      await expect.poll(() => assetIntercepted).toBe(true);
      await expect(settingsWindow).toHaveCount(1);
      await expect(page.locator(":root")).toHaveCSS("font-size", "13px");
      await expect(bootScreen).toBeVisible();
      const warmGeometry = await expectBootIconToPaint(bootIcon);
      expect(warmGeometry).toEqual(coldGeometry);
      await page.waitForTimeout(100);
      expect(await expectBootIconToPaint(bootIcon)).toEqual(warmGeometry);

      assetGate.release();
      await warmNavigation;
      await expect(bootScreen).toBeHidden();
      await expectFontAwesomeIconToPaint(page.locator('[data-fa-icon="sparkle"]'), "sparkle");
      await expectStyledDismissalFrames(page, { settings: true });
    });
  }
}

test("applies pre-ready Auto changes directly and animates after reveal", async ({ page }) => {
  test.slow();
  await page.addInitScript(() => {
    localStorage.setItem("tienos-appearance", JSON.stringify("auto"));
    const tracker = { count: 0 };
    Object.defineProperty(window, "themeTransitionStarts", { configurable: true, value: tracker });
    type TransitionDocument = Document & {
      startViewTransition?: (update: () => void | Promise<void>) => {
        finished: Promise<void>;
        ready: Promise<void>;
        skipTransition: () => void;
      };
    };
    const transitionDocument = document as TransitionDocument;
    const startViewTransition = transitionDocument.startViewTransition?.bind(document);
    if (startViewTransition) {
      transitionDocument.startViewTransition = (update) => {
        tracker.count += 1;
        return startViewTransition(update);
      };
    }
  });
  await page.emulateMedia({ colorScheme: "light" });
  const iconSpriteGate = createDelayGate();
  let iconSpriteIntercepted = false;
  await page.route("**/fontawesome/fontawesome-pro-solid.svg", async (route) => {
    iconSpriteIntercepted = true;
    await iconSpriteGate.blocked;
    await route.continue();
  });
  await page.route("**/wallpapers/tienos-default.jpg", (route) => route.abort("failed"));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => iconSpriteIntercepted).toBe(true);
  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeVisible();
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(1);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(":root")).toHaveAttribute("data-wallpaper-fallback", "dark");
  await expect(page.locator('[data-theme-transition-layer="old"]')).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { themeTransitionStarts: { count: number } }).themeTransitionStarts.count,
    ),
  ).toBe(0);

  await expect(bootScreen).toBeHidden({ timeout: 10_000 });
  await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
  await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", "none");

  await armThemeAnimationPause(page);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { themeTransitionStarts: { count: number } }).themeTransitionStarts
            .count,
      ),
    )
    .toBe(1);
  await waitForThemeAnimations(page);
  expectProductionThemeAnimations(await pauseThemeAnimationsAtMidpoint(page));
  await finishThemeAnimations(page);
  iconSpriteGate.release();
});

for (const startupViewport of startupViewports) {
  test(`releases the static desktop when styles fail on ${startupViewport.name}`, async ({ page }) => {
    await page.setViewportSize(startupViewport);
    await recordDismissalFrames(page);
    await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("light")));
    await page.route(/\/assets\/.*\.css$/, async (route) => {
      await route.abort("failed");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
    await expect(bootScreen).toBeVisible();
    await expect(page.locator("#root")).toHaveAttribute("inert", "");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await expect(bootScreen).toBeHidden({ timeout: 10_000 });
    await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
    await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
    await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Dock preview (non-interactive)" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "tienOS menu bar" })).toHaveCSS(
      "color",
      "rgba(255, 255, 255, 0.9)",
    );
    await expectStyledDismissalFrames(page, { settings: false, menu: "fallback" });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(bootScreen).toBeHidden({ timeout: 10_000 });
    await expectStyledDismissalFrames(page, { settings: false, menu: "fallback" });
  });
}

for (const startupViewport of startupViewports) {
  test(`reveals the static desktop when the module fails on ${startupViewport.name}`, async ({ page }) => {
    await page.setViewportSize(startupViewport);
    await recordDismissalFrames(page);
    await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("light")));
    let applicationGate = createDelayGate();
    let applicationIntercepted = false;
    await page.route(/\/assets\/.*\.js$/, async (route) => {
      applicationIntercepted = true;
      await applicationGate.blocked;
      await route.abort("failed");
    });

    const navigation = page.goto("/", { waitUntil: "domcontentloaded" });
    await expect.poll(() => applicationIntercepted).toBe(true);

    const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
    const bootIcon = page.locator("[data-boot-icon]");
    await expect(bootScreen).toBeVisible();
    const initialGeometry = await expectBootIconToPaint(bootIcon);
    await page.waitForTimeout(100);
    expect(await expectBootIconToPaint(bootIcon)).toEqual(initialGeometry);
    applicationGate.release();
    await navigation;
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
    await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
    await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('[data-theme-transition-layer="old"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect !== null &&
                "pseudoElement" in animation.effect &&
                typeof animation.effect.pseudoElement === "string" &&
                animation.effect.pseudoElement.startsWith("::view-transition"),
            ).length,
      ),
    ).toBe(0);
    const staticDock = page.getByRole("complementary", { name: "Dock preview (non-interactive)" });
    await expect(staticDock).toBeVisible();
    await expect(staticDock.getByRole("button")).toHaveCount(0);
    await expect(staticDock).toContainText(
      "System Settings is shown running. Launcher controls require JavaScript.",
    );
    const menubar = page.getByRole("navigation", { name: "tienOS menu bar" });
    await expect(menubar).toHaveCSS("color", "rgba(255, 255, 255, 0.9)");
    await expect(menubar.locator(".tienos-menu-trigger").first()).toHaveCSS(
      "color",
      "rgba(255, 255, 255, 0.9)",
    );
    await expect(menubar.getByText("Navigator", { exact: true })).toHaveCSS(
      "color",
      "rgba(255, 255, 255, 0.9)",
    );
    await expectStyledDismissalFrames(page, { settings: false });

    applicationGate = createDelayGate();
    applicationIntercepted = false;
    const warmNavigation = page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(() => applicationIntercepted).toBe(true);
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeVisible();
    applicationGate.release();
    await warmNavigation;
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
    await expectStyledDismissalFrames(page, { settings: false });
    await expect(staticDock).toBeVisible();
  });
}

for (const colorScheme of ["dark", "light"] as const) {
  for (const viewport of startupViewports) {
    test(`reveals the resolved ${colorScheme} static desktop without JavaScript on ${viewport.name}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        colorScheme,
        javaScriptEnabled: false,
        reducedMotion: "no-preference",
        viewport,
      });
      const page = await context.newPage();
      await page.emulateMedia({ colorScheme });
      const wallpaperUrl =
        colorScheme === "light" ? "**/wallpapers/tienos-light.jpg" : "**/wallpapers/tienos-default.jpg";
      await page.route(wallpaperUrl, (route) => route.abort("failed"));
      const session = await context.newCDPSession(page);
      const renderedFrames: Buffer[] = [];
      session.on("Page.screencastFrame", ({ data, sessionId }) => {
        renderedFrames.push(Buffer.from(data, "base64"));
        void session.send("Page.screencastFrameAck", { sessionId });
      });
      await session.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });

      await page.goto("/", { waitUntil: "domcontentloaded" });
      const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
      await expect(bootScreen).toBeHidden();
      await page.waitForTimeout(100);
      const coldStableFrame = await page.screenshot();
      const warmFrameStart = renderedFrames.length;

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(bootScreen).toBeHidden();
      await page.waitForTimeout(100);
      const warmStableFrame = await page.screenshot();
      const warmFrameEnd = renderedFrames.length;
      await session.send("Page.stopScreencast");
      await expectCapturedFramesToMatchStableReveal(
        renderedFrames.slice(0, warmFrameStart),
        coldStableFrame,
        colorScheme,
      );
      await expectCapturedFramesToMatchStableReveal(
        renderedFrames.slice(warmFrameStart, warmFrameEnd),
        warmStableFrame,
        colorScheme,
      );

      await page.unroute(wallpaperUrl);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(bootScreen).toBeHidden();
      await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
      const staticDock = page.getByRole("complementary", {
        name: "Dock preview (non-interactive)",
      });
      await expect(staticDock).toBeVisible();
      await expect(staticDock.getByRole("button")).toHaveCount(0);
      await expect(staticDock).toContainText(
        "System Settings is shown running. Launcher controls require JavaScript.",
      );
      await expect(page.getByRole("img", { name: "Wi-Fi connected" })).toBeVisible();
      await expect(page.getByRole("img", { name: "Battery full" })).toBeVisible();
      const noScriptFont = await page
        .locator("body")
        .evaluate((element) => getComputedStyle(element).fontFamily);
      expect(noScriptFont).not.toMatch(/(^|,\s*)(serif|"?Times New Roman"?|Times)(,|$)/i);
      await expect(page.locator("[data-menu-bar-surface]")).toHaveCSS("position", "fixed");
      const wallpaper = page.locator(".tienos-wallpaper");
      const vignette = page.locator(".tienos-vignette");
      await expect(wallpaper).toHaveCSS("filter", "saturate(1.08)");
      await expect(wallpaper).not.toHaveCSS("transform", "none");
      await expect(wallpaper).toHaveCSS(
        "background-image",
        new RegExp(colorScheme === "light" ? "tienos-light\\.jpg" : "tienos-default\\.jpg"),
      );
      await expect(wallpaper).toHaveCSS("background-size", "cover");
      await expect(wallpaper).toHaveCSS("background-position", "50% 50%");
      const wallpaperState = await wallpaper.evaluate((element) => {
        const styles = getComputedStyle(element);
        const matrix = new DOMMatrixReadOnly(styles.transform);
        return { scale: styles.scale, transformScale: matrix.a };
      });
      expect(wallpaperState.scale).toBe("none");
      expect(wallpaperState.transformScale).toBeCloseTo(1.02);
      await expect(vignette).toHaveCSS("background-image", /linear-gradient.*radial-gradient/);
      const menuBarSurface = page.locator("[data-menu-bar-surface]");
      await expect(menuBarSurface).toHaveCSS("backdrop-filter", "none");
      await expect(menuBarSurface).toHaveCSS("background-image", "none");
      await expect(menuBarSurface).toHaveCSS("border-radius", "0px");
      await expect(menuBarSurface).toHaveCSS("box-shadow", "none");
      await expect(page.getByRole("navigation", { name: "tienOS menu bar" })).toHaveCSS(
        "text-shadow",
        "rgba(0, 0, 0, 0.4) 0px 1px 3px",
      );

      await context.close();
    });
  }
}
