import { expect, test, type Locator } from "@playwright/test";
import {
  themeMidpointMaxDiffPixelRatio,
  themeFinalMaxDiffPixelRatio,
  startupViewports,
  createDelayGate,
  expectTrafficOwnershipMap,
  exerciseTrafficHitPoints,
  armThemeAnimationPause,
  waitForThemeAnimations,
  pauseThemeAnimationsAtMidpoint,
  finishThemeAnimations,
  expectProductionThemeAnimations,
  captureNativeThemeTransition,
  expectFontAwesomeIconToPaint,
  touchDrag,
  readCenterPixel,
  readHorizontalPixels,
  parseColor,
  contrastRatio,
  expectColorContrast,
  expectLocalRenderedContrasts,
  expectLocalSeparatorTreatment,
  setResolvedTheme,
} from "./drivers/contracts";

test("applies design-system tokens to component styles", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(false);
  await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("dark")));
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden({ timeout: 10_000 });

  const tokens = await page.locator(":root").evaluate((root) => {
    const styles = getComputedStyle(root);
    return {
      space1: styles.getPropertyValue("--tienos-space-1").trim(),
      accent: styles.getPropertyValue("--tienos-color-accent").trim(),
      accentHover: styles.getPropertyValue("--tienos-color-accent-hover").trim(),
      focusOnAccent: styles.getPropertyValue("--tienos-color-focus-on-accent").trim(),
      menuRadius: styles.getPropertyValue("--tienos-radius-menu").trim(),
      windowRadius: styles.getPropertyValue("--tienos-radius-window").trim(),
    };
  });

  expect(tokens).toEqual({
    space1: "4px",
    accent: "#2863d7",
    accentHover: "#326edc",
    focusOnAccent: "#fff",
    menuRadius: "14px",
    windowRadius: "24px",
  });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menuitem", { name: "Open tienOS menu" })).not.toHaveCSS("box-shadow", "none");

  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  const popup = page.locator(".tienos-menu-popup").first();
  const menuItem = page.getByRole("menuitem", { name: "System Settings…" });
  await page.locator(":root").evaluate((root) => {
    const styles = (root as HTMLElement).style;
    styles.setProperty("--tienos-motion-fast", "777ms");
    styles.setProperty("--tienos-motion-standard", "888ms");
  });
  await expect(menuItem).toHaveCSS("transition-property", "background-color");
  await expect(menuItem).toHaveCSS("transition-duration", "0.777s");
  await expect(menuItem).toHaveCSS("transition-timing-function", "ease");
  await expect.poll(() => popup.evaluate((element) => element.style.transition !== "none")).toBe(true);
  const popupState = await popup.evaluate((element) => {
    element.setAttribute("data-ending-style", "");
    const styles = getComputedStyle(element);
    const transition = {
      property: styles.transitionProperty,
      duration: styles.transitionDuration,
      timing: styles.transitionTimingFunction,
    };
    element.removeAttribute("data-ending-style");
    element.style.transition = "none";
    const transforms = ["data-starting-style", "data-ending-style"].map((attribute) => {
      element.setAttribute(attribute, "");
      const stateStyles = getComputedStyle(element);
      const matrix = new DOMMatrixReadOnly(stateStyles.transform);
      const state = {
        matrix: { a: matrix.a, d: matrix.d, f: matrix.f },
        scale: stateStyles.scale,
        translate: stateStyles.translate,
      };
      element.removeAttribute(attribute);
      return state;
    });
    element.style.removeProperty("transition");
    return { transition, transforms };
  });
  expect(popupState.transition).toEqual({
    property: "opacity, transform",
    duration: "0.777s, 0.888s",
    timing: "ease, ease",
  });
  for (const state of popupState.transforms) {
    expect(state.scale).toBe("none");
    expect(state.translate).toBe("none");
    expect(state.matrix.a).toBeCloseTo(0.96);
    expect(state.matrix.d).toBeCloseTo(0.96);
    expect(state.matrix.f).toBeCloseTo(-3.84);
  }

  await menuItem.click();
  await page.locator(":root").evaluate((root) => {
    (root as HTMLElement).style.setProperty("--tienos-color-accent-hover", "rgb(1 2 3)");
  });
  const selectedNavItem = page.locator(".settings-nav-item[data-selected]");
  await selectedNavItem.hover();
  await expect(selectedNavItem).toHaveCSS("background-color", "rgb(1, 2, 3)");

  await page.locator(":root").evaluate((root) => {
    const styles = (root as HTMLElement).style;
    styles.setProperty("--tienos-radius-window", "26px");
    styles.setProperty("--tienos-radius-content", "16px");
  });
  await expect(page.locator(".settings-window")).toHaveCSS("border-radius", "26px");
  await expect(page.locator(".settings-sidebar-panel")).toHaveCSS("border-radius", "18px");
  await expect(page.locator(".settings-hero")).toHaveCSS("border-radius", "16px");
  await expect(page.locator(".settings-group").first()).toHaveCSS("border-radius", "16px");
  const detailsViewport = page.locator('.settings-scroll-viewport[aria-label="Settings details"]');
  await detailsViewport.focus();
  await expect(detailsViewport).toHaveCSS("border-radius", "16px");
  await page.getByRole("button", { name: "Appearance" }).click();
  await expect(page.getByRole("region", { name: "Appearance style" })).toHaveCSS("border-radius", "16px");
});

test("keeps keyboard focus visible in forced colors", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("dark")));
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  const menuBarSurface = page.locator("[data-menu-bar-surface]");
  await expect(menuBarSurface).toHaveCSS("backdrop-filter", "none");
  await expect(menuBarSurface).toHaveCSS("box-shadow", "none");
  await expect(menuBarSurface).toHaveCSS("background-image", "none");

  await page.keyboard.press("Tab");
  const trigger = page.getByRole("menuitem", { name: "Open tienOS menu" });
  await expect(trigger).toHaveCSS("outline-style", "solid");
  await expect(trigger).toHaveCSS("outline-width", "2px");

  await trigger.click();
  await page.keyboard.press("ArrowDown");
  const highlightedMenuItem = page.locator(".tienos-menu-item[data-highlighted]");
  await highlightedMenuItem.focus();
  const highlightedColors = await highlightedMenuItem.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { background: styles.backgroundColor, outline: styles.outlineColor };
  });
  expect(highlightedColors.outline).not.toBe(highlightedColors.background);

  await page.getByRole("menuitem", { name: "System Settings…" }).click();
  const settingsRow = page.locator(".settings-row").first();
  await page.keyboard.press("Tab");
  await settingsRow.focus();
  await expect(settingsRow).toBeFocused();
  await expect(settingsRow).toHaveCSS("outline-style", "solid");
  await expect(settingsRow).toHaveCSS("outline-width", "2px");
  await expect(settingsRow).toHaveCSS("outline-offset", "-2px");

  const selectedNavItem = page.locator(".settings-nav-item[data-selected]");
  await page.keyboard.press("Tab");
  await selectedNavItem.focus();
  const forcedColors = await selectedNavItem.evaluate((element) => {
    const styles = getComputedStyle(element);
    const rootStyles = getComputedStyle(document.documentElement);
    return {
      background: styles.backgroundColor,
      focus: styles.outlineColor,
      focusToken: rootStyles.getPropertyValue("--tienos-color-focus-on-accent").trim(),
    };
  });
  expect(forcedColors.focusToken).toBe("HighlightText");
  expect(forcedColors.focus).not.toBe(forcedColors.background);
});

test("menu popup families are translucent and wallpaper-responsive", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  await page.goto("/");
  for (const theme of ["dark", "light"] as const) {
    await setResolvedTheme(page, theme);
    await page.getByRole("button", { name: "Close System Settings" }).click();

    const wallpaper = page.locator(".tienos-wallpaper");
    const sampleAgainstWallpapers = async (
      popup: Locator,
      family: string,
      expectedSeparatorCount: number,
    ) => {
      const bounds = await popup.boundingBox();
      expect(bounds).not.toBeNull();
      const pattern = "repeating-linear-gradient(90deg, rgb(8 16 28) 0 220px, rgb(232 242 250) 220px 440px)";
      const centerX = bounds!.x + bounds!.width / 2;
      const regions = [
        { name: "dark-to-bright", position: centerX - 220, direction: 1 },
        { name: "bright-to-dark", position: centerX - 440, direction: -1 },
      ];
      for (const region of regions) {
        await wallpaper.evaluate(
          (node, values) => {
            const styles = (node as HTMLElement).style;
            styles.setProperty("background-image", values.pattern, "important");
            styles.setProperty("background-position", `${values.position}px 0`, "important");
            styles.setProperty("background-size", "440px 100%", "important");
            styles.setProperty("transform", "none", "important");
          },
          { pattern, position: region.position },
        );
        const boundaryPixels = await readHorizontalPixels(popup, 55);
        const [leftBrightness, rightBrightness] = boundaryPixels.map((pixel) =>
          pixel.reduce((sum, channel) => sum + channel, 0),
        );
        expect(
          (rightBrightness - leftBrightness) * region.direction,
          `${theme} ${family} should render the ${region.name} wallpaper boundary`,
        ).toBeGreaterThan(20);
        await expectLocalSeparatorTreatment(
          popup,
          await popup.locator('[role="separator"]').all(),
          `${theme} ${family} ${region.name}`,
          expectedSeparatorCount,
        );
        await page.screenshot({
          animations: "disabled",
          path: testInfo.outputPath(`popup-${theme}-${family}-${region.name}.png`),
        });
      }
      await wallpaper.evaluate(
        (node, values) => {
          (node as HTMLElement).style.setProperty(
            "background-position",
            `${values.centerX - 330}px 0`,
            "important",
          );
        },
        { centerX },
      );
    };

    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    const systemPopup = page.locator(".tienos-menu-popup:visible").first();
    const expectedBackground = theme === "dark" ? "rgba(20, 27, 36, 0.62)" : "rgba(245, 248, 252, 0.62)";
    await expect(systemPopup).toHaveCSS("background-color", expectedBackground);
    await expect(systemPopup).toHaveCSS("backdrop-filter", "blur(18px) saturate(1.5)");
    await sampleAgainstWallpapers(systemPopup, "system", 5);
    const systemLabels = await systemPopup.locator(".tienos-menu-item > span").all();
    const systemShortcuts = await systemPopup.locator("kbd").all();
    await expectLocalRenderedContrasts(systemPopup, [
      ...systemLabels.map((foreground, index) => ({
        foreground,
        minimum: 4.5,
        label: `${theme} system row ${index + 1} should remain legible over bright wallpaper`,
      })),
      ...systemShortcuts.map((foreground, index) => ({
        foreground,
        minimum: 4.5,
        label: `${theme} system shortcut ${index + 1} should remain legible over bright wallpaper`,
      })),
      {
        foreground: page.getByRole("menuitem", { name: "Recent Items" }).locator("svg"),
        minimum: 3,
        label: `${theme} submenu chevron should remain legible over bright wallpaper`,
      },
    ]);

    await page.getByRole("menuitem", { name: "Recent Items" }).hover();
    const submenuPopup = page.locator(".tienos-menu-popup:visible").last();
    await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(2);
    await expect(submenuPopup).toHaveCSS("background-color", expectedBackground);
    await sampleAgainstWallpapers(submenuPopup, "submenu", 0);
    await expectLocalRenderedContrasts(submenuPopup, [
      {
        foreground: page.getByRole("menuitem", { name: "No Recent Items" }),
        minimum: 3,
        label: `${theme} disabled submenu row should remain legible over bright wallpaper`,
      },
    ]);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(0);

    await page.getByRole("menuitem", { name: "Navigator" }).click();
    const navigatorPopup = page.locator(".tienos-menu-popup:visible");
    await expect(navigatorPopup).toHaveCSS("background-color", expectedBackground);
    await sampleAgainstWallpapers(navigatorPopup, "navigator", 1);
    const navigatorLabels = await navigatorPopup.locator(".tienos-menu-item > span").all();
    const navigatorShortcuts = await navigatorPopup.locator("kbd").all();
    await expectLocalRenderedContrasts(navigatorPopup, [
      ...navigatorLabels.map((foreground, index) => ({
        foreground,
        minimum: 4.5,
        label: `${theme} navigator row ${index + 1} should remain legible over bright wallpaper`,
      })),
      ...navigatorShortcuts.map((foreground, index) => ({
        foreground,
        minimum: 4.5,
        label: `${theme} navigator shortcut ${index + 1} should remain legible over bright wallpaper`,
      })),
    ]);
    await page.keyboard.press("Escape");
  }
});

test("accessibility modes keep every popup family opaque and legible", async ({ page }) => {
  test.setTimeout(150_000);
  const session = await page.context().newCDPSession(page);
  await page.goto("/");
  const modes = [
    { name: "reduced transparency", feature: "prefers-reduced-transparency", value: "reduce" },
    { name: "increased contrast", feature: "prefers-contrast", value: "more" },
    { name: "forced colors", feature: "forced-colors", value: "active" },
  ];

  for (const theme of ["dark", "light"] as const) {
    for (const mode of modes) {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: mode.feature, value: mode.value }],
      });
      await setResolvedTheme(page, theme);
      await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();

      const systemPopup = page.locator(".tienos-menu-popup:visible").first();
      const popupBackground = parseColor(
        await systemPopup.evaluate((node) => getComputedStyle(node).backgroundColor),
      );
      expect(popupBackground.alpha, `${theme} ${mode.name} popup should be opaque`).toBe(1);
      await expect(systemPopup).toHaveCSS("background-image", "none");

      const primaryItem = page.getByRole("menuitem", { name: "About This OS" });
      const shortcut = page.getByRole("menuitem", { name: "System Settings…" }).locator("kbd");
      const recentItems = page.getByRole("menuitem", { name: "Recent Items" });
      const chevron = recentItems.locator("svg");
      await expectColorContrast(primaryItem, "color", popupBackground, 4.5);
      await expectColorContrast(shortcut, "color", popupBackground, 3);
      await expectColorContrast(chevron, "color", popupBackground, 3);
      const systemSeparators = await systemPopup.locator('[role="separator"]').all();
      await expectLocalSeparatorTreatment(
        systemPopup,
        systemSeparators,
        `${theme} ${mode.name} system`,
        5,
        "explicit",
      );

      await page.getByRole("menuitem", { name: "System Settings…" }).hover();
      const selectedItem = page.locator(".tienos-menu-item[data-highlighted]");
      const selectedBackground = parseColor(
        await selectedItem.evaluate((node) => getComputedStyle(node).backgroundColor),
      );
      expect(contrastRatio(selectedBackground, popupBackground)).toBeGreaterThanOrEqual(1.1);
      await expectColorContrast(selectedItem, "color", selectedBackground, 4.5);
      await expectColorContrast(selectedItem.locator("kbd"), "color", selectedBackground, 4.5);

      await recentItems.hover();
      const submenuPopup = page.locator(".tienos-menu-popup:visible").last();
      await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(2);
      const submenuBackground = parseColor(
        await submenuPopup.evaluate((node) => getComputedStyle(node).backgroundColor),
      );
      expect(submenuBackground.alpha, `${theme} ${mode.name} submenu should be opaque`).toBe(1);
      await expectLocalSeparatorTreatment(
        submenuPopup,
        await submenuPopup.locator('[role="separator"]').all(),
        `${theme} ${mode.name} recent items submenu`,
        0,
        "explicit",
      );
      await expectColorContrast(
        page.getByRole("menuitem", { name: "No Recent Items" }),
        "color",
        submenuBackground,
        3,
      );
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(0);

      await page.getByRole("menuitem", { name: "Navigator" }).click();
      const navigatorPopup = page.locator(".tienos-menu-popup:visible");
      await expect(navigatorPopup).toHaveCount(1);
      const navigatorBackground = parseColor(
        await navigatorPopup.evaluate((node) => getComputedStyle(node).backgroundColor),
      );
      expect(navigatorBackground.alpha, `${theme} ${mode.name} navigator should be opaque`).toBe(1);
      await expectColorContrast(
        page.getByRole("menuitem", { name: "About Navigator" }),
        "color",
        navigatorBackground,
        4.5,
      );
      const navigatorSeparators = await navigatorPopup.locator('[role="separator"]').all();
      await expectLocalSeparatorTreatment(
        navigatorPopup,
        navigatorSeparators,
        `${theme} ${mode.name} navigator`,
        1,
        "explicit",
      );
      await page.keyboard.press("Escape");
    }
  }
});

test("keeps Settings seamless across themes, accessibility modes, and layouts", async ({
  page,
}, testInfo) => {
  test.setTimeout(150_000);
  const session = await page.context().newCDPSession(page);
  const scenarios: readonly {
    name: string;
    appearance: "light" | "dark" | "auto";
    resolved: "light" | "dark";
    feature?: { name: string; value: string };
    width: number;
    height: number;
  }[] = [
    { name: "light", appearance: "light", resolved: "light", width: 1440, height: 900 },
    { name: "dark", appearance: "dark", resolved: "dark", width: 1440, height: 900 },
    { name: "auto-light", appearance: "auto", resolved: "light", width: 1440, height: 900 },
    { name: "auto-dark", appearance: "auto", resolved: "dark", width: 1440, height: 900 },
    {
      name: "reduced-transparency",
      appearance: "auto",
      resolved: "dark",
      feature: { name: "prefers-reduced-transparency", value: "reduce" },
      width: 1440,
      height: 900,
    },
    {
      name: "increased-contrast",
      appearance: "auto",
      resolved: "light",
      feature: { name: "prefers-contrast", value: "more" },
      width: 1440,
      height: 900,
    },
    {
      name: "forced-colors",
      appearance: "auto",
      resolved: "dark",
      feature: { name: "forced-colors", value: "active" },
      width: 1440,
      height: 900,
    },
    { name: "iphone", appearance: "auto", resolved: "light", width: 390, height: 844 },
  ];

  await page.goto("/");
  for (const scenario of scenarios) {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await session.send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-color-scheme", value: scenario.resolved },
        ...(scenario.feature ? [scenario.feature] : []),
      ],
    });
    await page.evaluate(
      (appearance) => localStorage.setItem("tienos-appearance", JSON.stringify(appearance)),
      scenario.appearance,
    );
    await page.reload();
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden({ timeout: 10_000 });
    await expect(page.locator("html")).toHaveAttribute("data-theme", scenario.resolved);
    const menu = page.locator("[data-menu-bar-surface]");
    await expect(menu).toHaveCSS("top", "0px");
    await expect(menu).toHaveCSS("left", "0px");
    await expect(menu).toHaveCSS("right", "0px");
    await expect(menu).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(menu).toHaveCSS("background-image", "none");
    await expect(menu).toHaveCSS("backdrop-filter", "none");
    await expect(menu).toHaveCSS("border-radius", "0px");
    await expect(menu).toHaveCSS("box-shadow", "none");

    const shell = page.locator(".settings-window");
    const sidebar = page.locator(".settings-sidebar-panel");
    const detail = page.locator(".settings-detail");
    const fallback = scenario.feature?.name;
    if (fallback === "prefers-reduced-transparency" || fallback === "forced-colors") {
      await expect(shell).toHaveCSS("backdrop-filter", "none");
      await expect(sidebar).toHaveCSS("backdrop-filter", "none");
    } else {
      await expect(shell).toHaveCSS("backdrop-filter", "blur(32px) saturate(1.4)");
      await expect(sidebar).toHaveCSS("backdrop-filter", "blur(24px) saturate(1.35)");
    }
    if (fallback) {
      await expect(shell).toHaveCSS("background-image", "none");
      await expect(sidebar).toHaveCSS("background-image", "none");
    } else {
      await expect(shell).toHaveCSS("background-image", /linear-gradient/);
      await expect(sidebar).toHaveCSS("background-image", /linear-gradient/);
    }
    await expect(sidebar).toHaveCSS("border-style", "solid");
    await expect(sidebar).toHaveCSS("border-radius", scenario.width <= 700 ? "11px" : "16px");
    await expect(detail).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(detail).toHaveCSS("background-image", "none");
    await expect(detail).toHaveCSS("box-shadow", "none");
    const splitter = page.getByRole("separator", { name: "Resize Settings sidebar" });
    const grip = splitter.locator("[data-splitter-grip]");
    await expect(splitter).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(grip).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const seam = await splitter.evaluate((node) => ({
      before: getComputedStyle(node, "::before").backgroundColor,
      after: getComputedStyle(node, "::after").backgroundColor,
    }));
    expect(seam).toEqual({ before: "rgba(0, 0, 0, 0)", after: "rgba(0, 0, 0, 0)" });
    const [splitterBounds, gripBounds, shellBounds, sidebarBounds] = await Promise.all([
      splitter.boundingBox(),
      grip.boundingBox(),
      shell.boundingBox(),
      sidebar.boundingBox(),
    ]);
    expect(gripBounds!.height).toBeLessThan(splitterBounds!.height / 4);
    expect(sidebarBounds!.x).toBeGreaterThan(shellBounds!.x);
    expect(sidebarBounds!.y).toBeGreaterThan(shellBounds!.y);
    const minimum = Number(await splitter.getAttribute("aria-valuemin"));
    const maximum = Number(await splitter.getAttribute("aria-valuemax"));
    const current = Number(await splitter.getAttribute("aria-valuenow"));
    expect(minimum).toBeLessThanOrEqual(current);
    expect(current).toBeLessThanOrEqual(maximum);
    await page.screenshot({ path: testInfo.outputPath(`settings-seamless-${scenario.name}.png`) });

    await splitter.hover();
    expect(
      await splitter.evaluate((node) => ({
        hover: node.matches(":hover"),
        focusVisible: node.matches(":focus-visible"),
      })),
    ).toEqual({ hover: true, focusVisible: false });
    await expect(grip).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await page.mouse.move(0, 0);
    await expect(grip).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

    await splitter.focus();
    expect(
      await splitter.evaluate((node) => ({
        hover: node.matches(":hover"),
        focusVisible: node.matches(":focus-visible"),
      })),
    ).toEqual({ hover: false, focusVisible: true });
    await expect(grip).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    if (fallback === "forced-colors") {
      await expect(splitter).toHaveCSS("outline-style", "none");
    }
    await splitter.evaluate((node) => (node as HTMLElement).blur());
    await expect(grip).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

    const documentNode = await session.send("DOM.getDocument");
    const splitterNode = await session.send("DOM.querySelector", {
      nodeId: documentNode.root.nodeId,
      selector: ".settings-splitter",
    });
    expect(
      await splitter.evaluate((node) => ({
        hover: node.matches(":hover"),
        focusVisible: node.matches(":focus-visible"),
      })),
    ).toEqual({ hover: false, focusVisible: false });
    await session.send("CSS.forcePseudoState", {
      nodeId: splitterNode.nodeId,
      forcedPseudoClasses: ["active"],
    });
    try {
      await expect(grip).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      if (scenario.name === "dark" || scenario.name === "iphone") {
        await page.screenshot({ path: testInfo.outputPath(`settings-grip-active-${scenario.name}.png`) });
      }
    } finally {
      await session.send("CSS.forcePseudoState", {
        nodeId: splitterNode.nodeId,
        forcedPseudoClasses: [],
      });
    }

    if (scenario.name === "iphone") {
      expect(sidebarBounds!.width / shellBounds!.width).toBeGreaterThanOrEqual(0.36);
      expect(sidebarBounds!.width / shellBounds!.width).toBeLessThanOrEqual(0.43);
    }

    if (scenario.name === "light") {
      const wallpaper = page.locator(".tienos-wallpaper");
      await wallpaper.evaluate((node) => ((node as HTMLElement).style.background = "rgb(0 0 0)"));
      const darkPixel = await readCenterPixel(shell);
      await wallpaper.evaluate((node) => ((node as HTMLElement).style.background = "rgb(255 255 255)"));
      await expect
        .poll(async () => {
          const lightPixel = await readCenterPixel(shell);
          return lightPixel.reduce((sum, channel, index) => sum + Math.abs(channel - darkPixel[index]), 0);
        })
        .toBeGreaterThan(10);
    }
  }
});

test("preserves migrated System Settings selection and separators", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("dark")));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  expect(
    await page
      .getByPlaceholder("Search")
      .evaluate((element) => getComputedStyle(element, "::placeholder").color),
  ).toBe("rgba(255, 255, 255, 0.55)");
  await expect(page.getByText("tienOS Account", { exact: true })).toHaveCSS("margin-top", "2px");
  await expect(page.locator(".settings-family")).toHaveCSS("column-gap", "9px");
  await expect(page.locator(".settings-family > span").first()).toHaveCSS("font-size", "15px");

  const selectedNavigation = page.locator(".settings-nav-item[data-selected]");
  await selectedNavigation.focus();
  await expect(selectedNavigation).toHaveCSS("outline-style", "solid");
  await expect(selectedNavigation).toHaveCSS("outline-width", "2px");
  await expect(selectedNavigation).toHaveCSS("outline-offset", "-2px");
  await expect(selectedNavigation).toHaveCSS("outline-color", "rgb(255, 255, 255)");

  const iconShadows = await Promise.all(
    [
      page.locator(".settings-icon").first(),
      page.locator(".settings-hero-icon"),
      page.locator(".settings-row-icon").first(),
    ].map((icon) => icon.evaluate((element) => getComputedStyle(element).boxShadow)),
  );
  for (const shadow of iconShadows) {
    expect(shadow).toContain("inset");
    expect(shadow).toContain("rgba(255, 255, 255, 0.2)");
    expect(shadow).toContain("rgba(0, 0, 0, 0.4)");
  }

  const hero = page.locator(".settings-hero");
  await expect(hero).toHaveCSS("padding-bottom", "19px");
  expect(
    await hero.locator("h2").evaluate((element) => parseFloat(getComputedStyle(element).letterSpacing)),
  ).toBeCloseTo(-0.69);

  await page.getByRole("button", { name: "Appearance" }).click();

  const settingsColor = await page
    .locator(".settings-window")
    .evaluate((element) => getComputedStyle(element).color);
  for (const select of await page.getByRole("combobox").all()) {
    await expect(select).toHaveCSS("color", settingsColor);
  }

  const darkWidget = page.getByRole("radio", { name: "Dark", exact: true }).last();
  await darkWidget.click();
  await expect(darkWidget).toHaveCSS("font-weight", "700");
  await expect(darkWidget).toHaveCSS("color", "rgba(255, 255, 255, 0.9)");
  await expect(darkWidget.locator("span")).toHaveCSS("border-color", "rgb(40, 99, 215)");
  await expect(darkWidget.locator("span")).not.toHaveCSS("box-shadow", "none");

  await page.getByRole("button", { name: "General" }).click();
  const separator = page.locator(".settings-row").first();
  expect(await separator.evaluate((element) => getComputedStyle(element, "::after").backgroundColor)).toBe(
    "rgba(255, 255, 255, 0.1)",
  );
});

test("renders the tienOS main screen and system menu", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await page.goto("/");

  await expect(page).toHaveTitle("tienOS");
  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeHidden();
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
  const wallpaperState = await page.locator(".tienos-wallpaper").evaluate((element) => {
    const styles = getComputedStyle(element);
    const matrix = new DOMMatrixReadOnly(styles.transform);
    return { scale: styles.scale, transformScale: matrix.a };
  });
  expect(wallpaperState.scale).toBe("none");
  expect(wallpaperState.transformScale).toBeCloseTo(1.02);
  await expect(page.locator("html")).toHaveCSS("overflow-x", "hidden");
  await expect(page.locator("html")).toHaveCSS("overflow-y", "hidden");
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  const popup = page.locator(".tienos-menu-popup").first();
  await expect(popup).toHaveCSS("border-radius", "14px");
  await expect(popup).toHaveCSS("padding", "4px");
  const reducedMotionState = await popup.evaluate((element) => {
    element.setAttribute("data-ending-style", "");
    const styles = getComputedStyle(element);
    const state = {
      transitionProperty: styles.transitionProperty,
      transform: styles.transform,
      transformAnimations: element
        .getAnimations()
        .filter((animation) =>
          (animation.effect as KeyframeEffect).getKeyframes().some((frame) => frame.transform !== undefined),
        ).length,
    };
    element.removeAttribute("data-ending-style");
    return state;
  });
  expect(reducedMotionState).toEqual({
    transitionProperty: "none",
    transform: "none",
    transformAnimations: 0,
  });
  await expect(page.getByText("About This OS", { exact: true }).locator("..")).toHaveCSS(
    "border-radius",
    "10px",
  );
  await expect(page.getByText("About This OS", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Wi-Fi connected" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Battery full" })).toBeVisible();
  await expectFontAwesomeIconToPaint(page.locator('[data-fa-icon="sparkle"]'), "sparkle");
  await expectFontAwesomeIconToPaint(
    popup.locator('[data-fa-icon="chevron-right"]').first(),
    "chevron-right",
  );
});

for (const viewport of startupViewports) {
  test(`matches the representative Light application on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.setFixedTime(new Date("2026-08-08T12:34:56Z"));
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("light")));
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-light\.jpg/);
    await expect(page).toHaveScreenshot(`light-wallpaper-${viewport.name}.png`, {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: viewport.name === "desktop" ? 25_000 : 11_000,
    });
  });
}

test("uses independently accessible Base UI scroll areas with transient scrollbars", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 520 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const sidebar = page.locator(".settings-sidebar[data-floating-panel]");
  await expect(sidebar.locator(":scope > .settings-sidebar-panel")).toBeVisible();

  const details = page.locator('.settings-scroll-viewport[aria-label="Settings details"]');
  const categories = page.locator('.settings-scroll-viewport[aria-label="Settings categories"]');
  const detailScrollbar = details.locator("..").locator(".settings-scrollbar");
  const detailThumb = detailScrollbar.locator(".settings-scroll-thumb");
  await expect(detailScrollbar).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const [trackWidth, thumbWidth] = await Promise.all([
    detailScrollbar.evaluate((node) => node.getBoundingClientRect().width),
    detailThumb.evaluate((node) => node.getBoundingClientRect().width),
  ]);
  expect(thumbWidth).toBe(trackWidth);
  await expect(detailThumb).toHaveCSS("border-width", "0px");
  await expect(details).toHaveAttribute("tabindex", "0");
  await expect(categories).toHaveAttribute("tabindex", "0");
  await expect(detailScrollbar).toHaveCSS("opacity", "0");

  await details.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => details.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(detailScrollbar).toHaveAttribute("data-scrolling", "");
  await expect(detailScrollbar).toHaveCSS("opacity", "1");
  await expect(detailScrollbar).not.toHaveAttribute("data-scrolling", "", { timeout: 1500 });
  await expect(detailScrollbar).toHaveCSS("opacity", "0");

  await detailScrollbar.hover();
  await expect(detailScrollbar).toHaveCSS("opacity", "1");
  const thumb = detailScrollbar.locator(".settings-scroll-thumb");
  const thumbBounds = await thumb.boundingBox();
  await page.mouse.move(thumbBounds!.x + thumbBounds!.width / 2, thumbBounds!.y + 4);
  await page.mouse.down();
  await page.mouse.move(thumbBounds!.x + thumbBounds!.width / 2, thumbBounds!.y + 24);
  await expect(detailScrollbar).toHaveCSS("opacity", "1");
  await page.mouse.up();
  await details.hover({ position: { x: 20, y: 20 } });
  await expect(detailScrollbar).toHaveCSS("opacity", "0");

  await details.focus();
  await expect(detailScrollbar).toHaveCSS("opacity", "1");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => details.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Appearance" }).click();
  await expect.poll(() => details.evaluate((node) => node.scrollTop)).toBe(0);
  for (const [name, option] of [
    ["Text highlight color", "Purple"],
    ["Folder color", "Blue"],
    ["Sidebar icon size", "Large"],
  ] as const) {
    const trigger = page.getByRole("combobox", { name });
    await trigger.click();
    await page.getByRole("option", { name: option }).click();
    await expect(trigger).toContainText(option);
  }

  const detailTop = await details.evaluate((node) => node.scrollTop);
  await categories.hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(() => categories.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await details.evaluate((node) => node.scrollTop)).toBe(detailTop);
});

test("supports adopted Appearance controls across input and accessibility modes", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    reducedMotion: "reduce",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-motion", value: "reduce" },
      { name: "prefers-reduced-transparency", value: "reduce" },
      { name: "prefers-contrast", value: "more" },
      { name: "forced-colors", value: "active" },
    ],
  });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("button", { name: "Appearance" }).click();

  const groups = {
    appearance: page.getByRole("radiogroup", { name: "Appearance mode" }),
    glass: page.getByRole("radiogroup", { name: "Liquid Glass style" }),
    accent: page.getByRole("radiogroup", { name: "Accent color" }),
    widgets: page.getByRole("radiogroup", { name: "Icon and widget style" }),
  };
  for (const group of Object.values(groups)) await expect(group).toBeVisible();

  const darkMode = groups.appearance.getByRole("radio", { name: "Dark" });
  await darkMode.click();
  await expect(darkMode).toBeChecked();
  await expect(darkMode).toHaveAttribute("aria-checked", "true");
  await darkMode.press("ArrowLeft");
  await expect(groups.appearance.getByRole("radio", { name: "Light" })).toBeChecked();
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

  const tintedGlass = groups.glass.getByRole("radio", { name: "Tinted" });
  await tintedGlass.tap();
  await expect(tintedGlass).toBeChecked();
  await tintedGlass.press("ArrowLeft");
  const clearGlass = groups.glass.getByRole("radio", { name: "Clear" });
  await expect(clearGlass).toBeChecked();
  await expect(clearGlass).toHaveCSS("outline-style", "solid");

  const purpleAccent = groups.accent.getByRole("radio", { name: "Purple" });
  await purpleAccent.click();
  await expect(purpleAccent).toBeChecked();
  await purpleAccent.press("ArrowRight");
  await expect(groups.accent.getByRole("radio", { name: "Pink" })).toBeChecked();

  const clearWidgets = groups.widgets.getByRole("radio", { name: "Clear" });
  await clearWidgets.click();
  await expect(clearWidgets).toBeChecked();
  await clearWidgets.press("ArrowRight");
  await expect(groups.widgets.getByRole("radio", { name: "Tinted" })).toBeChecked();

  const highlight = page.getByRole("combobox", { name: "Text highlight color" });
  await highlight.tap();
  await expect(page.getByRole("option", { name: "Purple" })).toBeVisible();
  await page.getByRole("heading", { name: "Theme" }).tap();
  await expect(page.getByRole("option", { name: "Purple" })).toBeHidden();

  await highlight.tap();
  const selectPopup = page.getByRole("listbox");
  await expect(selectPopup).toHaveCSS("backdrop-filter", "none");
  await page.keyboard.press("Escape");
  await expect(highlight).toBeFocused();
  await highlight.tap();
  await page.getByRole("option", { name: "Purple" }).tap();
  await expect(highlight).toContainText("Purple");

  const wallpaperTint = page.getByRole("switch", {
    name: "Tint window background with wallpaper color",
  });
  await expect(wallpaperTint).toBeChecked();
  await wallpaperTint.tap();
  await expect(wallpaperTint).not.toBeChecked();
  await expect(wallpaperTint).toHaveAttribute("aria-checked", "false");

  await context.close();
});

test("uses a visible high-contrast scrollbar palette in Light mode", async ({ page }) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-contrast", value: "more" },
    ],
  });
  await page.setViewportSize({ width: 700, height: 520 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const details = page.locator('.settings-scroll-viewport[aria-label="Settings details"]');
  const scrollbar = details.locator("..").locator(".settings-scrollbar");
  const thumb = scrollbar.locator(".settings-scroll-thumb");
  await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
  await expect(scrollbar).toHaveCSS("opacity", "0");
  await scrollbar.hover();
  await expect(scrollbar).toHaveCSS("opacity", "1");
  await expect(scrollbar).toHaveCSS("background-color", "rgba(15, 23, 42, 0.18)");
  await expect(thumb).toHaveCSS("background-color", "rgba(15, 23, 42, 0.82)");
});

test("Dock renders registered apps, reports, focuses, and layers the Settings window", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  const dock = page.getByRole("navigation", { name: "Dock" });
  const app = dock.getByRole("button", { name: "System Settings" });
  const calculatorApp = dock.getByRole("button", { name: "Calculator" });
  const calendarApp = dock.getByRole("button", { name: "Calendar" });
  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await expect(dock.getByRole("button")).toHaveCount(4);
  await expect(calculatorApp).toBeVisible();
  await expect(calendarApp).toBeVisible();
  await expect(dock.getByRole("button", { name: "Notes" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Dock preview (non-interactive)" })).toHaveCount(0);
  await expect(app).not.toHaveAttribute("aria-pressed");
  await expect(dock.getByRole("status")).toHaveText("System Settings is running");
  await expectFontAwesomeIconToPaint(app.locator('[data-fa-icon="gear"]'), "gear");
  await app.focus();
  await expect(app).toBeFocused();
  await expect(app).toHaveCSS("outline-style", "solid");
  await expect(app).toHaveCSS("outline-width", "2px");
  await page.mouse.click(1400, 400);
  await app.click();
  await expect(settingsWindow).toHaveCount(1);
  await expect(settingsWindow).toBeFocused();
  await page.getByRole("button", { name: "Close System Settings" }).click();
  await expect(dock.getByRole("status")).toHaveText("System Settings is not running");
  await app.focus();
  await app.press("Enter");
  await expect(settingsWindow).toHaveCount(1);
  await expect(settingsWindow).toBeFocused();
  await expect(dock.getByRole("status")).toHaveText("System Settings is running");

  const settingsZIndex = Number(
    await page.locator(".settings-rnd").evaluate((node) => getComputedStyle(node).zIndex),
  );
  const dockZIndex = Number(await dock.evaluate((node) => getComputedStyle(node).zIndex));
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  const portalZIndex = Number(
    await page
      .locator(".tienos-menu-popup:visible")
      .evaluate((node) => getComputedStyle(node.parentElement!).zIndex),
  );
  expect(settingsZIndex).toBeLessThan(dockZIndex);
  expect(dockZIndex).toBeLessThan(portalZIndex);
  await page.keyboard.press("Escape");

  const wallpaper = page.locator(".tienos-wallpaper");
  await wallpaper.evaluate((node) => ((node as HTMLElement).style.background = "rgb(0 0 0)"));
  const darkWallpaperPixels = (await readHorizontalPixels(dock, 30)).flat();
  await wallpaper.evaluate((node) => ((node as HTMLElement).style.background = "rgb(255 255 255)"));
  const lightWallpaperPixels = (await readHorizontalPixels(dock, 30)).flat();
  expect(
    lightWallpaperPixels.reduce(
      (difference, channel, index) => difference + Math.abs(channel - darkWallpaperPixels[index]),
      0,
    ),
  ).toBeGreaterThan(10);
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("dock-desktop-dark.png") });

  const darkBackground = await dock.evaluate((node) => getComputedStyle(node).backgroundColor);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
  await expect
    .poll(() => dock.evaluate((node) => getComputedStyle(node).backgroundColor))
    .not.toBe(darkBackground);
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("dock-desktop-light.png") });

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-motion", value: "reduce" },
      { name: "prefers-reduced-transparency", value: "reduce" },
      { name: "prefers-contrast", value: "more" },
    ],
  });
  await expect(dock).toHaveCSS("backdrop-filter", "none");
  await expect(dock).toHaveCSS("border-top-width", "2px");
  await expect(app).toHaveCSS("transition-property", "none");
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "forced-colors", value: "active" }],
  });
  await app.focus();
  await expect(app).toHaveCSS("outline-style", "solid");
  await expect(dock).toHaveCSS("backdrop-filter", "none");
  const dockBounds = await dock.boundingBox();
  expect(dockBounds!.x).toBeGreaterThanOrEqual(0);
  expect(dockBounds!.y + dockBounds!.height).toBeLessThanOrEqual(900);
});

test("Dock supports touch and compact viewport boundaries", async ({ browser }, testInfo) => {
  test.slow();
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date("2026-08-08T12:34:56Z"));
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--tienos-safe-area-bottom", "34px");
    window.dispatchEvent(new Event("resize"));
  });
  const dock = page.getByRole("navigation", { name: "Dock" });
  const app = dock.getByRole("button", { name: "System Settings" });
  const calculatorApp = dock.getByRole("button", { name: "Calculator" });
  await expect(app).toHaveCSS("width", "56px");
  await expect(app).toHaveCSS("height", "56px");
  await page.getByRole("button", { name: "Close System Settings" }).tap();
  await app.tap();
  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await expect(settingsWindow).toBeFocused();
  await expect(settingsWindow).toHaveCount(1);
  await expect
    .poll(() =>
      page.locator(".settings-rnd").evaluate((window) => {
        const visibility = window.getAttribute("data-window-visibility");
        return visibility === null || visibility === "visible";
      }),
    )
    .toBe(true);

  const expectCompactBounds = async (safeAreaBottom: number) => {
    await expect
      .poll(async () => {
        const [menuBounds, windowBounds, dockBounds] = await Promise.all([
          page.locator("[data-menu-bar-surface]").boundingBox(),
          settingsWindow.boundingBox(),
          dock.boundingBox(),
        ]);
        if (!menuBounds || !windowBounds || !dockBounds) return false;
        return (
          Math.round(page.viewportSize()!.height - dockBounds.y - dockBounds.height) === safeAreaBottom &&
          windowBounds.y >= menuBounds.y + menuBounds.height &&
          windowBounds.y + windowBounds.height <= dockBounds.y
        );
      })
      .toBe(true);

    const [menuBounds, windowBounds, dockBounds] = await Promise.all([
      page.locator("[data-menu-bar-surface]").boundingBox(),
      settingsWindow.boundingBox(),
      dock.boundingBox(),
    ]);
    expect(menuBounds!.y).toBeGreaterThanOrEqual(0);
    expect(dockBounds!.x).toBeGreaterThanOrEqual(0);
    expect(dockBounds!.x + dockBounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(dockBounds!.y + dockBounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(Math.round(page.viewportSize()!.height - dockBounds!.y - dockBounds!.height)).toBe(safeAreaBottom);
    expect(windowBounds!.y).toBeGreaterThanOrEqual(menuBounds!.y + menuBounds!.height);
    expect(windowBounds!.y + windowBounds!.height).toBeLessThanOrEqual(dockBounds!.y);
    await expect(page.locator(".settings-rnd")).toHaveCSS(
      "max-height",
      `${Math.floor(dockBounds!.y) - Math.ceil(menuBounds!.y + menuBounds!.height)}px`,
    );
  };
  await expectCompactBounds(34);
  await expect(page.getByRole("button", { name: "Close System Settings" })).toBeVisible();
  await expect(page.getByPlaceholder("Search")).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("dock-iphone-portrait.png") });
  await captureNativeThemeTransition(
    page,
    "iphone-auto-dark-to-light",
    "light",
    () => page.emulateMedia({ colorScheme: "light" }),
    true,
  );
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--tienos-safe-area-bottom", "21px");
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await expectCompactBounds(21);

  const session = await context.newCDPSession(page);
  const readLiveWindowClamp = async () => {
    const [menuBounds, windowBounds, dockBounds] = await Promise.all([
      page.locator("[data-menu-bar-surface]").boundingBox(),
      settingsWindow.boundingBox(),
      dock.boundingBox(),
    ]);
    expect(windowBounds!.y).toBeGreaterThanOrEqual(menuBounds!.y + menuBounds!.height);
    expect(windowBounds!.y + windowBounds!.height).toBeLessThanOrEqual(dockBounds!.y);
    return windowBounds!;
  };
  const beforeDrag = await settingsWindow.boundingBox();
  const dragHandle = await page.locator(".settings-sidebar-panel").boundingBox();
  const liveDragPositions: Array<{ x: number; y: number }> = [];
  await touchDrag(
    session,
    { x: dragHandle!.x + dragHandle!.width - 12, y: dragHandle!.y + 20 },
    { x: dragHandle!.x + dragHandle!.width + 48, y: 389 },
    async () => {
      const bounds = await readLiveWindowClamp();
      liveDragPositions.push({ x: bounds.x, y: bounds.y });
    },
  );
  const afterDrag = await settingsWindow.boundingBox();
  expect(liveDragPositions).toHaveLength(2);
  expect(liveDragPositions[0].x).toBeGreaterThan(beforeDrag!.x);
  expect(liveDragPositions[1].x).toBeGreaterThan(liveDragPositions[0].x);
  expect(Math.round(afterDrag!.x)).toBeGreaterThan(Math.round(beforeDrag!.x));
  expect(Math.round(afterDrag!.y)).toBe(Math.round(beforeDrag!.y));
  await readLiveWindowClamp();

  const resizeHandle = await page.locator('.settings-rnd div[style*="se-resize"]').boundingBox();
  const beforeResize = await settingsWindow.boundingBox();
  const liveResizeWidths: number[] = [];
  await touchDrag(
    session,
    { x: resizeHandle!.x + 5, y: resizeHandle!.y + 5 },
    { x: 843, y: 389 },
    async () => {
      const bounds = await readLiveWindowClamp();
      liveResizeWidths.push(bounds.width);
    },
  );
  const afterResize = await settingsWindow.boundingBox();
  expect(liveResizeWidths).toHaveLength(2);
  expect(liveResizeWidths[0]).toBeGreaterThan(beforeResize!.width);
  expect(liveResizeWidths[1]).toBeGreaterThan(liveResizeWidths[0]);
  expect(afterResize!.width).toBeGreaterThan(beforeResize!.width);
  expect(Math.round(afterResize!.height)).toBe(Math.round(beforeResize!.height));
  expect(Math.round(afterResize!.x)).toBe(Math.round(beforeResize!.x));
  expect(Math.round(afterResize!.y)).toBe(Math.round(beforeResize!.y));
  await expectCompactBounds(21);
  await expect(dock.getByRole("button")).toHaveCount(4);
  await expect(app).toHaveAccessibleName("System Settings");
  await expect(app).toHaveAttribute("title", "System Settings");
  await expect(calculatorApp).toHaveAccessibleName("Calculator");
  await expect(calculatorApp).toHaveAttribute("title", "Calculator");
  await expect(page.getByRole("button", { name: "Close System Settings" })).toBeVisible();
  await expect(page.locator('.settings-scroll-viewport[aria-label="Settings details"]')).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("dock-iphone-landscape.png") });
  await context.close();
});

test.describe("appearance modes", () => {
  test("persists Light and Dark while Auto follows live system changes", async ({ page }) => {
    test.slow();
    await page.clock.setFixedTime(new Date("2026-08-08T12:34:56Z"));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-default\.jpg/);

    await captureNativeThemeTransition(page, "auto-live-dark-to-light", "light", () =>
      page.emulateMedia({ colorScheme: "light" }),
    );
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-light\.jpg/);

    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    const settingsMenuItem = page.getByRole("menuitem", { name: "System Settings…" });
    await settingsMenuItem.hover();
    await expect(settingsMenuItem).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(settingsMenuItem.locator("kbd")).toHaveCSS("color", "rgb(255, 255, 255)");
    await settingsMenuItem.click();
    await page.getByRole("button", { name: "Appearance" }).click();
    const modes = page.getByRole("radiogroup", { name: "Appearance mode" });

    await captureNativeThemeTransition(
      page,
      "explicit-light-to-dark",
      "dark",
      () => modes.getByRole("radio", { name: "Dark" }).click(),
      true,
    );
    await expect(modes.getByRole("radio", { name: "Dark" })).toBeFocused();
    await captureNativeThemeTransition(
      page,
      "explicit-dark-to-light",
      "light",
      () => modes.getByRole("radio", { name: "Light" }).click(),
      true,
    );
    await armThemeAnimationPause(page);
    await modes.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await waitForThemeAnimations(page);
    expectProductionThemeAnimations(await pauseThemeAnimationsAtMidpoint(page));
    await modes.getByRole("radio", { name: "Light" }).evaluate((element: HTMLElement) => {
      element.focus();
      element.click();
    });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await waitForThemeAnimations(page);
    expectProductionThemeAnimations(await pauseThemeAnimationsAtMidpoint(page));
    await expect(page).toHaveScreenshot("rapid-light-dark-light-midpoint.png", {
      animations: "allow",
      caret: "hide",
      maxDiffPixelRatio: themeMidpointMaxDiffPixelRatio,
    });
    await finishThemeAnimations(page);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("tienos-appearance")))
      .toBe(JSON.stringify("light"));
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('[data-theme-transition-layer="old"]')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
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
      )
      .toBe(0);
    await expect(page).toHaveScreenshot("rapid-light-dark-light-final.png", {
      animations: "allow",
      caret: "hide",
      maxDiffPixelRatio: themeFinalMaxDiffPixelRatio,
    });
    await expect(modes.getByRole("radio", { name: "Light" })).toBeFocused();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "light");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");

    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    await page.getByRole("menuitem", { name: "System Settings…" }).click();
    await page.getByRole("button", { name: "Appearance" }).click();
    const reopenedModes = page.getByRole("radiogroup", { name: "Appearance mode" });
    await captureNativeThemeTransition(page, "auto-entry-light-to-dark", "dark", () =>
      reopenedModes.getByRole("radio", { name: "Auto" }).click(),
    );
    const details = page.locator('.settings-scroll-viewport[aria-label="Settings details"]');
    await page.setViewportSize({ width: 700, height: 520 });
    await expect
      .poll(async () => {
        const [menuBounds, windowBounds, dockBounds] = await Promise.all([
          page.locator("[data-menu-bar-surface]").boundingBox(),
          page.locator(".settings-rnd").boundingBox(),
          page.locator("[data-dock-surface]").boundingBox(),
        ]);
        if (!menuBounds || !windowBounds || !dockBounds) return false;
        return (
          windowBounds.x >= 0 &&
          windowBounds.y >= menuBounds.y + menuBounds.height &&
          windowBounds.x + windowBounds.width <= 700 &&
          windowBounds.y + windowBounds.height <= dockBounds.y
        );
      })
      .toBe(true);
    await details.evaluate((node) => {
      node.scrollTop = 80;
    });
    await page.getByPlaceholder("Search").fill("appearance");
    await page.getByPlaceholder("Search").evaluate((input: HTMLInputElement) => {
      input.setSelectionRange(2, 7);
    });
    const highlight = page.getByRole("combobox", { name: "Text highlight color" });
    await highlight.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    const preservedState = await page.evaluate(() => ({
      activeLabel: document.activeElement?.getAttribute("aria-label"),
      scrollTop: document.querySelector<HTMLElement>(
        '.settings-scroll-viewport[aria-label="Settings details"]',
      )?.scrollTop,
      selection: (() => {
        const input = document.querySelector<HTMLInputElement>('[placeholder="Search"]');
        return { start: input?.selectionStart, end: input?.selectionEnd, value: input?.value };
      })(),
      geometry: (() => {
        const rect = document.querySelector<HTMLElement>(".settings-window")?.getBoundingClientRect();
        return rect ? { height: rect.height, width: rect.width, x: rect.x, y: rect.y } : undefined;
      })(),
    }));
    expect(preservedState.scrollTop).toBeGreaterThan(0);
    await captureNativeThemeTransition(
      page,
      "auto-live-dark-to-light-with-portal",
      "light",
      () => page.emulateMedia({ colorScheme: "light" }),
      true,
    );
    await expect(page.getByRole("listbox")).toBeVisible();
    expect(
      await page.evaluate(() => ({
        activeLabel: document.activeElement?.getAttribute("aria-label"),
        scrollTop: document.querySelector<HTMLElement>(
          '.settings-scroll-viewport[aria-label="Settings details"]',
        )?.scrollTop,
        selection: (() => {
          const input = document.querySelector<HTMLInputElement>('[placeholder="Search"]');
          return { start: input?.selectionStart, end: input?.selectionEnd, value: input?.value };
        })(),
        geometry: (() => {
          const rect = document.querySelector<HTMLElement>(".settings-window")?.getBoundingClientRect();
          return rect ? { height: rect.height, width: rect.width, x: rect.x, y: rect.y } : undefined;
        })(),
      })),
    ).toEqual(preservedState);
    await page.keyboard.press("Escape");

    await reopenedModes.getByRole("radio", { name: "Dark" }).click();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "dark");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("tienos-appearance")))
      .toBe(JSON.stringify("dark"));
  });

  test("keeps the painted theme consistent when a wallpaper cannot decode", async ({ page }) => {
    test.slow();
    await page.clock.setFixedTime(new Date("2026-08-08T12:34:56Z"));
    await page.setViewportSize({ width: 700, height: 520 });
    await page.addInitScript(() => {
      localStorage.setItem("tienos-appearance", JSON.stringify("auto"));
      Object.defineProperty(document, "startViewTransition", { configurable: true, value: undefined });
      // The captured method is always invoked below with an explicit receiver.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const animate = HTMLElement.prototype.animate;
      HTMLElement.prototype.animate = function (keyframes, options) {
        if (this.dataset.themeTransitionLayer && typeof options === "object") {
          const animation = animate.call(this, keyframes, options);
          animation.pause();
          animation.currentTime = 0;
          return animation;
        }
        return animate.call(this, keyframes, options);
      };
    });
    await page.route("**/wallpapers/tienos-light.jpg", (route) => route.abort("failed"));
    const unhandledRejections: string[] = [];
    page.on("pageerror", (error) => unhandledRejections.push(error.message));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
    await expect(page.getByRole("region", { name: "System Settings" })).toBeVisible();
    await page.getByRole("button", { name: "Appearance" }).click();
    const details = page.locator('.settings-scroll-viewport[aria-label="Settings details"]');
    await details.evaluate((node) => {
      node.scrollTop = 80;
    });
    const highlight = page.getByRole("combobox", { name: "Text highlight color" });
    await highlight.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    const preservedFallbackState = await page.evaluate(() => ({
      activeText: document.activeElement?.textContent,
      scrollTop: document.querySelector<HTMLElement>(
        '.settings-scroll-viewport[aria-label="Settings details"]',
      )?.scrollTop,
      window: (() => {
        const rect = document.querySelector<HTMLElement>(".settings-window")?.getBoundingClientRect();
        return rect ? { height: rect.height, width: rect.width, x: rect.x, y: rect.y } : undefined;
      })(),
      portal: (() => {
        const rect = document.querySelector<HTMLElement>('[role="listbox"]')?.getBoundingClientRect();
        return rect ? { height: rect.height, width: rect.width, x: rect.x, y: rect.y } : undefined;
      })(),
    }));
    expect(preservedFallbackState.scrollTop).toBeGreaterThan(0);
    const oldWallpaperTransform = await page
      .locator(".tienos-wallpaper")
      .evaluate((node) => getComputedStyle(node).transform);
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    const fallbackLayer = page.locator('[data-theme-transition-layer="old"]');
    await expect(fallbackLayer).toBeVisible();
    const fallbackFrame = await fallbackLayer.evaluate(async (layer) => {
      const animation = layer.getAnimations()[0];
      animation.pause();
      await animation.ready;
      const timing = animation.effect?.getTiming();
      animation.currentTime = Number(timing?.duration) / 2;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const wallpaper = layer.querySelector<HTMLElement>(".tienos-wallpaper")!;
      const details = layer.querySelector<HTMLElement>(
        '.settings-scroll-viewport[aria-label="Settings details"]',
      )!;
      const styles = getComputedStyle(wallpaper);
      return {
        animationName: styles.animationName,
        duration: timing?.duration,
        easing: timing?.easing,
        keyframeOpacity: (animation.effect as KeyframeEffect | null)
          ?.getKeyframes()
          .map((keyframe) => Number(keyframe.opacity)),
        opacity: Number.parseFloat(getComputedStyle(layer).opacity),
        progress: animation.effect?.getComputedTiming().progress,
        transform: styles.transform,
        transitionProperty: styles.transitionProperty,
        scrollTop: details.scrollTop,
        window: (() => {
          const rect = layer.querySelector<HTMLElement>(".settings-window")?.getBoundingClientRect();
          return rect ? { height: rect.height, width: rect.width, x: rect.x, y: rect.y } : undefined;
        })(),
        portal: (() => {
          const rect = layer.querySelector<HTMLElement>('[role="listbox"]')?.getBoundingClientRect();
          return rect ? { height: rect.height, width: rect.width, x: rect.x, y: rect.y } : undefined;
        })(),
      };
    });
    expect(fallbackFrame.animationName).toBe("none");
    expect(fallbackFrame).toMatchObject({
      duration: 280,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      keyframeOpacity: [1, 0],
    });
    expect(fallbackFrame.progress).toBeGreaterThan(0);
    expect(fallbackFrame.progress).toBeLessThan(1);
    expect(fallbackFrame.transitionProperty).toBe("none");
    expect(fallbackFrame.transform).toBe(oldWallpaperTransform);
    expect(fallbackFrame.opacity).toBeGreaterThan(0);
    expect(fallbackFrame.opacity).toBeLessThan(1);
    expect(fallbackFrame.scrollTop).toBe(preservedFallbackState.scrollTop);
    expect(fallbackFrame.window).toEqual(preservedFallbackState.window);
    for (const property of ["x", "y", "width", "height"] as const) {
      expect(fallbackFrame.portal?.[property]).toBeCloseTo(
        preservedFallbackState.portal?.[property] ?? Number.NaN,
        1,
      );
    }
    expect(
      await page.evaluate(() => ({
        activeText: document.activeElement?.textContent,
        scrollTop: document.querySelector<HTMLElement>(
          '.settings-scroll-viewport[aria-label="Settings details"]',
        )?.scrollTop,
        window: (() => {
          const rect = document.querySelector<HTMLElement>(".settings-window")?.getBoundingClientRect();
          return rect ? { height: rect.height, width: rect.width, x: rect.x, y: rect.y } : undefined;
        })(),
        portal: (() => {
          const rect = document.querySelector<HTMLElement>('[role="listbox"]')?.getBoundingClientRect();
          return rect ? { height: rect.height, width: rect.width, x: rect.x, y: rect.y } : undefined;
        })(),
      })),
    ).toEqual(preservedFallbackState);
    await expect(page).toHaveScreenshot("fallback-wallpaper-failure-midpoint.png", {
      animations: "allow",
      caret: "hide",
      maxDiffPixelRatio: themeMidpointMaxDiffPixelRatio,
    });
    await page.getByRole("option", { name: "Purple" }).click();
    await expect(highlight).toContainText("Purple");
    await fallbackLayer.evaluate((layer) => layer.getAnimations()[0].finish());
    await expect(fallbackLayer).toHaveCount(0);
    await expect(page.locator(":root")).toHaveAttribute("data-wallpaper-fallback", "light");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", "none");
    await expect(page.getByRole("main", { name: "tienOS desktop" })).toHaveCSS(
      "background-color",
      "rgb(219, 234, 254)",
    );
    await expect(page).toHaveScreenshot("fallback-wallpaper-failure-final.png", {
      animations: "allow",
      caret: "hide",
      maxDiffPixelRatio: themeFinalMaxDiffPixelRatio,
    });

    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    await page.getByRole("menuitem", { name: "System Settings…" }).click();
    await page.getByRole("button", { name: "Appearance" }).click();

    const lightMode = page
      .getByRole("radiogroup", { name: "Appearance mode" })
      .getByRole("radio", { name: "Light" });
    await lightMode.click();

    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "light");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(":root")).toHaveAttribute("data-wallpaper-fallback", "light");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", "none");
    await expect(lightMode).toBeChecked();
    await expect(lightMode).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("tienos-appearance")))
      .toBe(JSON.stringify("light"));
    expect(unhandledRejections).toEqual([]);
  });

  test("retargets a pending Auto transition when the system theme changes", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("tienos-appearance", JSON.stringify("light"));
      const nativeDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode")?.value as (
        this: HTMLImageElement,
      ) => Promise<void>;
      let finishDarkDecode!: () => void;
      const darkWallpaperDecode: {
        finished: Promise<void>;
        rejectFollowing: boolean;
        release?: () => void;
        started: boolean;
      } = {
        finished: new Promise((resolve) => {
          finishDarkDecode = resolve;
        }),
        rejectFollowing: false,
        started: false,
      };
      HTMLImageElement.prototype.decode = function () {
        const decoded = nativeDecode.call(this);
        if (!this.src.endsWith("/wallpapers/tienos-default.jpg")) return decoded;
        darkWallpaperDecode.started = true;
        if (darkWallpaperDecode.release) {
          return darkWallpaperDecode.rejectFollowing
            ? Promise.reject(new Error("dark wallpaper decode failed"))
            : decoded;
        }
        return new Promise((_, reject) => {
          darkWallpaperDecode.release = () => {
            reject(new Error("stale dark wallpaper decode failed"));
            queueMicrotask(finishDarkDecode);
          };
        });
      };
      Object.defineProperty(window, "darkWallpaperDecode", { value: darkWallpaperDecode });
    });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    await page.getByRole("menuitem", { name: "System Settings…" }).click();
    await page.getByRole("button", { name: "Appearance" }).click();
    const autoMode = page
      .getByRole("radiogroup", { name: "Appearance mode" })
      .getByRole("radio", { name: "Auto" });

    await autoMode.click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as typeof window & { darkWallpaperDecode: { started: boolean } }).darkWallpaperDecode
              .started,
        ),
      )
      .toBe(true);
    await expect(autoMode).toBeFocused();
    await page.emulateMedia({ colorScheme: "light" });

    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-light\.jpg/);
    await expect(autoMode).toBeChecked();
    await expect(autoMode).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("tienos-appearance")))
      .toBe(JSON.stringify("auto"));

    await page.evaluate(async () => {
      const darkWallpaperDecode = (
        window as typeof window & {
          darkWallpaperDecode: { finished: Promise<void>; release?: () => void };
        }
      ).darkWallpaperDecode;
      darkWallpaperDecode.release?.();
      await darkWallpaperDecode.finished;
    });
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-light\.jpg/);
    await expect(autoMode).toBeFocused();

    const lightMode = page
      .getByRole("radiogroup", { name: "Appearance mode" })
      .getByRole("radio", { name: "Light" });
    await lightMode.click();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() => {
      (
        window as typeof window & {
          darkWallpaperDecode: { rejectFollowing: boolean };
        }
      ).darkWallpaperDecode.rejectFollowing = true;
    });
    await autoMode.click();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(":root")).toHaveAttribute("data-wallpaper-fallback", "dark");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", "none");
    await expect(autoMode).toBeChecked();
    await expect(autoMode).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("tienos-appearance")))
      .toBe(JSON.stringify("auto"));

    await page.evaluate(() => {
      (
        window as typeof window & {
          darkWallpaperDecode: { rejectFollowing: boolean };
        }
      ).darkWallpaperDecode.rejectFollowing = false;
    });
    await lightMode.click();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "light");
    await expect(page.locator(":root")).not.toHaveAttribute("data-wallpaper-fallback");
    await autoMode.click();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(":root")).not.toHaveAttribute("data-wallpaper-fallback");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-default\.jpg/);
    await expect(autoMode).toBeFocused();
  });

  test("preserves a pending explicit transition across system theme changes", async ({ page }) => {
    test.slow();
    await page.clock.setFixedTime(new Date("2026-08-08T12:34:56Z"));
    await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("auto")));
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
    const darkWallpaperGate = createDelayGate();
    let darkWallpaperIntercepted = false;
    await page.route("**/wallpapers/tienos-default.jpg", async (route) => {
      darkWallpaperIntercepted = true;
      await darkWallpaperGate.blocked;
      await route.continue();
    });
    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    await page.getByRole("menuitem", { name: "System Settings…" }).click();
    await page.getByRole("button", { name: "Appearance" }).click();
    const darkMode = page
      .getByRole("radiogroup", { name: "Appearance mode" })
      .getByRole("radio", { name: "Dark" });

    await darkMode.click();
    await expect.poll(() => darkWallpaperIntercepted).toBe(true);
    await expect(darkMode).toBeChecked();
    await expect(darkMode).toBeFocused();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("tienos-appearance")))
      .toBe(JSON.stringify("auto"));
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
    await expect(page).toHaveScreenshot("delayed-wallpaper-held.png", {
      animations: "allow",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    });

    await armThemeAnimationPause(page);
    darkWallpaperGate.release();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "dark");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await waitForThemeAnimations(page);
    expectProductionThemeAnimations(await pauseThemeAnimationsAtMidpoint(page));
    await expect(page).toHaveScreenshot("delayed-wallpaper-midpoint.png", {
      animations: "allow",
      caret: "hide",
      maxDiffPixelRatio: themeMidpointMaxDiffPixelRatio,
    });
    await finishThemeAnimations(page);
    await expect
      .poll(() =>
        page.evaluate(
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
      )
      .toBe(0);
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-default\.jpg/);
    await expect(darkMode).toBeChecked();
    await expect(darkMode).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("tienos-appearance")))
      .toBe(JSON.stringify("dark"));
    await expect(page).toHaveScreenshot("delayed-wallpaper-final.png", {
      animations: "allow",
      caret: "hide",
      maxDiffPixelRatio: themeFinalMaxDiffPixelRatio,
    });
  });

  test("bootstraps a persisted theme before the first desktop paint and rejects malformed storage", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem("tienos-appearance") === null) {
        localStorage.setItem("tienos-appearance", JSON.stringify("light"));
      }
      const themeApplications: Array<{ theme?: string; bodyPresent: boolean }> = [];
      new MutationObserver((records) => {
        for (const record of records) {
          if (record.target === document.documentElement && record.attributeName === "data-theme") {
            themeApplications.push({
              theme: document.documentElement.dataset.theme,
              bodyPresent: document.body !== null,
            });
          }
        }
      }).observe(document, { attributes: true, attributeFilter: ["data-theme"], subtree: true });
      Object.defineProperty(window, "tienosThemeApplications", { value: themeApplications });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect
      .poll(() =>
        page.evaluate(() =>
          (
            window as unknown as Window & {
              tienosThemeApplications: Array<{ theme?: string; bodyPresent: boolean }>;
            }
          ).tienosThemeApplications.at(0),
        ),
      )
      .toEqual({ theme: "light", bodyPresent: false });
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
    await expect(page.locator("link[rel=preload][as=image]")).toHaveAttribute(
      "href",
      "/wallpapers/tienos-light.jpg",
    );
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-light\.jpg/);

    await page.evaluate(() => localStorage.setItem("tienos-appearance", "{broken"));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
  });
});

test("Settings portal activity and traffic-light hit regions keep unambiguous ownership", async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const dockApp = page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: "System Settings" });
  const dockStatus = page.getByRole("navigation", { name: "Dock" }).getByRole("status");
  const window = page.getByRole("region", { name: "System Settings" });

  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("combobox", { name: "Text highlight color" }).click();
  const portal = page.locator("[data-settings-portal]");
  await expect(portal).toBeVisible();
  await portal.getByRole("option", { name: "Blue" }).click();
  await dockApp.click();
  await expect(dockStatus).toHaveText("System Settings is running and minimized");
  await dockApp.click();
  await expect(page.locator('[data-genie-window][data-window-visibility="visible"]')).toHaveCount(1);

  const minimize = page.getByRole("button", { name: "Minimize System Settings" });
  const close = page.getByRole("button", { name: "Close System Settings" });
  const fullscreen = page.getByRole("button", { name: "Toggle fullscreen System Settings" });
  const desktopDotGeometry = await page.locator("[data-sidebar-panel]").evaluate((panel) => {
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
  expect(desktopDotGeometry).toEqual([
    { center: 28, owner: "Close System Settings", size: 13 },
    { center: 48, owner: "Minimize System Settings", size: 13 },
    { center: 68, owner: "Toggle fullscreen System Settings", size: 13 },
  ]);
  const [red, yellow, green] = await Promise.all([
    close.boundingBox(),
    minimize.boundingBox(),
    fullscreen.boundingBox(),
  ]);
  expect(red).not.toBeNull();
  expect(yellow).not.toBeNull();
  expect(green).not.toBeNull();
  for (const box of [red!, yellow!, green!]) {
    expect(box.width).toBeCloseTo(44, 0);
    expect(box.height).toBeCloseTo(44, 0);
  }
  expect(yellow!.x - red!.x).toBeCloseTo(20, 0);
  expect(green!.x - yellow!.x).toBeCloseTo(20, 0);
  await expectTrafficOwnershipMap(page);
  const splitter = await page.getByRole("separator", { name: "Resize Settings sidebar" }).boundingBox();
  expect(splitter).not.toBeNull();
  expect(green!.x + green!.width).toBeLessThanOrEqual(splitter!.x);
  await page.screenshot({
    path: testInfo.outputPath("settings-traffic-lights-tight.png"),
    clip: { x: red!.x - 4, y: red!.y - 4, width: green!.x + green!.width - red!.x + 8, height: 52 },
  });
  await page.emulateMedia({ contrast: "more", reducedMotion: "no-preference" });
  await close.focus();
  await page.keyboard.press("Tab");
  await expect(minimize).toBeFocused();
  await expect(minimize.locator("[data-traffic-dot]")).toHaveCSS("outline-style", "solid");
  await expect(minimize.locator("[data-traffic-dot]")).toHaveCSS("outline-offset", "3px");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "no-preference" });
  const forcedColorIdentity = await page.locator("[data-traffic-dot]").evaluateAll((dots) =>
    dots.map((dot) => {
      const style = getComputedStyle(dot);
      return {
        background: style.backgroundColor,
        border: style.borderStyle,
        adjustment: style.forcedColorAdjust,
      };
    }),
  );
  expect(new Set(forcedColorIdentity.map(({ background }) => background)).size).toBe(3);
  expect(forcedColorIdentity.map(({ border, adjustment }) => ({ border, adjustment }))).toEqual(
    Array(3).fill({ border: "solid", adjustment: "none" }),
  );
  await fullscreen.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(fullscreen).toBeFocused();
  await expect(fullscreen.locator("[data-traffic-dot]")).toHaveCSS("outline-style", "solid");
  expect(
    await page
      .locator("[data-traffic-control]")
      .evaluateAll((controls) => controls.map((control) => getComputedStyle(control).outlineStyle)),
  ).toEqual(["none", "none", "none"]);
  expect(
    await page
      .locator("[data-traffic-dot]")
      .evaluateAll((dots) => dots.map((dot) => getComputedStyle(dot).outlineStyle)),
  ).toEqual(["none", "none", "solid"]);
  await page.emulateMedia({ forcedColors: "none", contrast: "no-preference", reducedMotion: "reduce" });
  await exerciseTrafficHitPoints(page, (x, y) => page.mouse.click(Math.ceil(x), Math.ceil(y)));
  await expect(window).toBeVisible();
});
