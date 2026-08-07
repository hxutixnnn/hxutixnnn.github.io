import { expect, test, type CDPSession, type Locator } from "@playwright/test";
import sharp from "sharp";

const spriteUrl = "/fontawesome/fontawesome-pro-solid.svg";

async function expectFontAwesomeIconToPaint(icon: Locator, name: string) {
  await expect(icon).toHaveAttribute("data-fa-icon", name);
  await expect(icon.locator("use")).toHaveAttribute("href", `${spriteUrl}#fa-${name}`);
  await expect
    .poll(() =>
      icon.evaluate((element) => {
        const use = element.querySelector("use");
        if (!use || typeof (use as SVGGraphicsElement).getBBox !== "function") return false;
        const bounds = (use as SVGGraphicsElement).getBBox();
        return bounds.width > 0 && bounds.height > 0;
      }),
    )
    .toBe(true);
}

async function expectConventionalRoundedGeometry(element: Locator) {
  await expect(element).toBeVisible();
  const geometry = await element.evaluate((node) => {
    const styles = getComputedStyle(node);
    return {
      borderRadius: styles.borderRadius,
      clipPath: styles.clipPath,
      maskImage: styles.maskImage,
      webkitMaskImage: styles.getPropertyValue("-webkit-mask-image"),
    };
  });
  expect(geometry.borderRadius).not.toBe("0px");
  expect(geometry.clipPath).toBe("none");
  expect(geometry.maskImage).toBe("none");
  expect(geometry.webkitMaskImage).toBe("none");
}

async function touchDrag(session: CDPSession, from: { x: number; y: number }, to: { x: number; y: number }) {
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: to.x, y: to.y }],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function readCenterPixel(element: Locator) {
  const screenshot = await element.screenshot();
  const { data, info } = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
  const offset = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
  return Array.from(data.subarray(offset, offset + 3));
}

test("applies design-system tokens to component styles", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("dark")));
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

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
  const popupState = await popup.evaluate((element) => {
    element.setAttribute("data-ending-style", "");
    const styles = getComputedStyle(element);
    const transition = {
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
  expect(popupState.transition).toEqual({ duration: "0.777s, 0.888s", timing: "ease, ease" });
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
    await expectConventionalRoundedGeometry(element);
  }

  const circles = [page.locator(".settings-light").first(), page.locator(".settings-avatar")];
  for (const circle of circles) {
    await expect(circle).toHaveCSS("border-radius", "50%");
    const box = await circle.boundingBox();
    expect(box?.width).toBe(box?.height);
  }
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

test("uses opaque menu surfaces with reduced transparency", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("dark")));
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  const popup = page.locator(".tienos-menu-popup").first();
  await expect(popup).toHaveCSS("background-color", "rgb(20, 27, 36)");
  await expect(popup).toHaveCSS("backdrop-filter", "none");
  await page.getByRole("menuitem", { name: "System Settings…" }).click();
  await expect(page.locator(".settings-window")).toHaveCSS("backdrop-filter", "none");
  await expect(page.locator(".settings-sidebar-panel")).toHaveCSS("backdrop-filter", "none");
  await expect(page.locator("[data-menu-bar-surface]")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("restores the pre-PR-16 menu bar while Settings carries layered glass", async ({ page }, testInfo) => {
  for (const theme of ["dark", "light"] as const) {
    await page.addInitScript(
      (mode) => localStorage.setItem("tienos-appearance", JSON.stringify(mode)),
      theme,
    );
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
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
    await expect(shell).toHaveCSS("backdrop-filter", "blur(32px) saturate(1.4)");
    await expect(sidebar).toHaveCSS("backdrop-filter", "blur(24px) saturate(1.35)");
    await expect(shell).toHaveCSS("background-image", /linear-gradient/);
    await expect(sidebar).toHaveCSS("background-image", /linear-gradient/);
    await expect(detail).toHaveCSS("background-image", /linear-gradient/);
    await page.screenshot({ path: testInfo.outputPath(`settings-glass-${theme}.png`) });
  }

  const shell = page.locator(".settings-window");
  const wallpaper = page.locator(".tienos-wallpaper");
  await wallpaper.evaluate((node) => ((node as HTMLElement).style.background = "rgb(0 0 0)"));
  const darkPixel = await readCenterPixel(shell);
  await wallpaper.evaluate((node) => ((node as HTMLElement).style.background = "rgb(255 255 255)"));
  const lightPixel = await readCenterPixel(shell);
  expect(
    lightPixel.reduce((sum, channel, index) => sum + Math.abs(channel - darkPixel[index]), 0),
  ).toBeGreaterThan(10);
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

  const darkWidget = page.getByRole("button", { name: "Dark", exact: true }).last();
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

test("keeps the splash over the desktop until delayed styles are ready", async ({ page }) => {
  let releaseStyles!: () => void;
  const stylesMayLoad = new Promise<void>((resolve) => {
    releaseStyles = resolve;
  });
  let stylesheetIntercepted = false;

  await page.route(/\/assets\/.*\.css$/, async (route) => {
    stylesheetIntercepted = true;
    await stylesMayLoad;
    await route.continue();
  });

  const navigation = page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => stylesheetIntercepted).toBe(true);
  await page.waitForTimeout(700);

  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeVisible();
  await expect(page.locator(":root")).toHaveCSS("font-size", "16px");

  releaseStyles();
  await navigation;
  await expect(bootScreen).toBeHidden();
  await expect(page.locator(":root")).toHaveCSS("font-size", "13px");
});

test("keeps the splash over the desktop until paint-critical assets are ready", async ({ page }) => {
  let releaseWallpaper!: () => void;
  const wallpaperMayLoad = new Promise<void>((resolve) => {
    releaseWallpaper = resolve;
  });
  let releaseSprite!: () => void;
  const spriteMayLoad = new Promise<void>((resolve) => {
    releaseSprite = resolve;
  });
  let wallpaperIntercepted = false;
  let spriteIntercepted = false;

  await page.route("**/wallpapers/tienos-default.jpg", async (route) => {
    wallpaperIntercepted = true;
    await wallpaperMayLoad;
    await route.continue();
  });
  await page.route("**/fontawesome/fontawesome-pro-solid.svg", async (route) => {
    spriteIntercepted = true;
    await spriteMayLoad;
    await route.continue();
  });

  const navigation = page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => wallpaperIntercepted).toBe(true);
  await expect.poll(() => spriteIntercepted).toBe(true);
  await page.waitForTimeout(700);

  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeVisible();
  await expect(page.locator("#root")).toHaveAttribute("inert", "");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.evaluate(() => {
    const observedWindow = window as typeof window & { iconPaintedAtDismissal?: boolean };
    const boot = document.getElementById("tienos-boot");
    new MutationObserver((_, observer) => {
      if (!boot?.hasAttribute("data-complete")) return;
      const use = document.querySelector<SVGGraphicsElement>('[data-fa-icon="sparkle"] use');
      const bounds = use?.getBBox();
      observedWindow.iconPaintedAtDismissal = Boolean(bounds && bounds.width > 0 && bounds.height > 0);
      observer.disconnect();
    }).observe(boot!, { attributes: true, attributeFilter: ["data-complete"] });
  });

  releaseWallpaper();
  await expect(bootScreen).toBeVisible();
  releaseSprite();
  await navigation;
  await expect(bootScreen).toBeHidden();
  await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
  await expect(page.locator(":root")).toHaveCSS("font-size", "13px");
  await expect(page.locator(".tienos-wallpaper")).not.toHaveCSS("background-image", "none");
  expect(
    await page.evaluate(
      () => (window as typeof window & { iconPaintedAtDismissal?: boolean }).iconPaintedAtDismissal,
    ),
  ).toBe(true);
  await expectFontAwesomeIconToPaint(page.locator('[data-fa-icon="sparkle"]'), "sparkle");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menuitem", { name: "Open tienOS menu" })).toBeFocused();
});

test("releases the static desktop when a critical asset stalls", async ({ page }) => {
  await page.route("**/wallpapers/tienos-default.jpg", async () => {
    await new Promise(() => {});
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
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menuitem", { name: "Open tienOS menu" })).toBeFocused();
});

test("reveals the static desktop when the application module fails", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("light")));
  await page.route(/\/assets\/.*\.js$/, (route) => route.abort("failed"));

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
  await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
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
});

test("renders the tienOS main screen and system menu", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page).toHaveTitle("tienOS");
  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeVisible();
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

test("reveals the static desktop without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "reduce" });
  const page = await context.newPage();

  await page.goto("/");
  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeVisible();
  await expect(bootScreen).toBeHidden();
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Wi-Fi connected" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Battery full" })).toBeVisible();
  const wallpaper = page.locator(".tienos-wallpaper");
  const vignette = page.locator(".tienos-vignette");
  await expect(wallpaper).toHaveCSS("filter", "saturate(1.08)");
  await expect(wallpaper).not.toHaveCSS("transform", "none");
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

test("matches the System Settings reference geometry", async ({ page }) => {
  await page.setViewportSize({ width: 918, height: 922 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const windowBounds = await page.getByRole("region", { name: "System Settings" }).boundingBox();
  const heroBounds = await page.locator(".settings-hero").boundingBox();
  const firstGroupBounds = await page.locator(".settings-group").first().boundingBox();

  const roundedBounds = (bounds: typeof windowBounds) =>
    bounds && Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, Math.round(value)]));

  expect(roundedBounds(windowBounds)).toMatchObject({ x: 97, y: 97, width: 723, height: 670 });
  expect(roundedBounds(heroBounds)).toMatchObject({ x: 348, y: 150, width: 451, height: 161 });
  expect(roundedBounds(firstGroupBounds)).toMatchObject({ x: 348, y: 321, width: 451, height: 128 });
});

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
  await page.getByRole("combobox", { name: "Text highlight color" }).selectOption("Purple");
  await page.getByRole("combobox", { name: "Folder color" }).selectOption("Blue");
  await page.getByRole("combobox", { name: "Sidebar icon size" }).selectOption("Large");
  await expect(page.getByRole("combobox", { name: "Text highlight color" })).toHaveValue("Purple");
  await expect(page.getByRole("combobox", { name: "Folder color" })).toHaveValue("Blue");
  await expect(page.getByRole("combobox", { name: "Sidebar icon size" })).toHaveValue("Large");

  const detailTop = await details.evaluate((node) => node.scrollTop);
  await categories.hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(() => categories.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await details.evaluate((node) => node.scrollTop)).toBe(detailTop);
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

test("drags and resizes the System Settings window with react-rnd", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  const initial = await settingsWindow.boundingBox();
  expect(initial).not.toBeNull();

  const dragHandle = await page.locator(".settings-sidebar-panel").boundingBox();
  await page.mouse.move(dragHandle!.x + dragHandle!.width - 12, dragHandle!.y + 20);
  await page.mouse.down();
  await page.mouse.move(dragHandle!.x + dragHandle!.width + 18, dragHandle!.y + 40, { steps: 4 });
  await page.mouse.up();

  const dragged = await settingsWindow.boundingBox();
  expect(Math.round(dragged!.x - initial!.x)).toBe(30);
  expect(Math.round(dragged!.y - initial!.y)).toBe(20);

  const movedHandle = await page.locator(".settings-sidebar-panel").boundingBox();
  await page.mouse.move(movedHandle!.x + movedHandle!.width - 12, movedHandle!.y + 20);
  await page.mouse.down();
  await page.mouse.move(movedHandle!.x + movedHandle!.width - 12, -100, { steps: 6 });
  await page.mouse.up();
  const menuBar = await page.locator('header:has([aria-label="tienOS menu bar"])').boundingBox();
  const topClamped = await settingsWindow.boundingBox();
  expect(topClamped!.y).toBeGreaterThanOrEqual(menuBar!.y + menuBar!.height);

  const southeastHandle = page.locator('.settings-rnd div[style*="se-resize"]');
  const handle = await southeastHandle.boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x + handle!.width / 2 + 40, handle!.y + handle!.height / 2 + 30, {
    steps: 4,
  });
  await page.mouse.up();

  const resized = await settingsWindow.boundingBox();
  expect(Math.round(resized!.width - dragged!.width)).toBe(40);
  expect(Math.round(resized!.height - dragged!.height)).toBe(30);

  const northHandle = page.locator('.settings-rnd div[style*="cursor: row-resize"][style*="top: -5px"]');
  const northHandleBounds = await northHandle.boundingBox();
  await page.mouse.move(
    northHandleBounds!.x + northHandleBounds!.width / 2,
    northHandleBounds!.y + northHandleBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(northHandleBounds!.x + northHandleBounds!.width / 2, -100, { steps: 6 });
  const resizingAtBoundary = await settingsWindow.boundingBox();
  expect(resizingAtBoundary!.y).toBeGreaterThanOrEqual(menuBar!.y + menuBar!.height);
  expect(Math.round(resizingAtBoundary!.y + resizingAtBoundary!.height)).toBe(
    Math.round(resized!.y + resized!.height),
  );
  await page.mouse.up();

  const resizedFromTop = await settingsWindow.boundingBox();
  expect(resizedFromTop!.y).toBeGreaterThanOrEqual(menuBar!.y + menuBar!.height);
  expect(Math.round(resizedFromTop!.y + resizedFromTop!.height)).toBe(
    Math.round(resized!.y + resized!.height),
  );
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
      const bounds = await settingsWindow.boundingBox();
      return (
        bounds && {
          x: Math.round(bounds.x),
          y: Math.round(bounds.y),
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        }
      );
    })
    .toEqual({ x: 8, y: 46, width: 304, height: 266 });

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
  const splitterBounds = await splitter.boundingBox();
  await page.mouse.move(splitterBounds!.x + 4, splitterBounds!.y + 120);
  await page.mouse.down();
  await page.mouse.move(splitterBounds!.x + 64, splitterBounds!.y + 120);
  await page.mouse.up();
  expect(Number(await splitter.getAttribute("aria-valuenow"))).toBeGreaterThan(initialValue);

  await splitter.focus();
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
  await expect
    .poll(async () => Number(await splitter.getAttribute("aria-valuenow")))
    .toBeGreaterThanOrEqual(36);
  const shell = await page.locator(".settings-window").boundingBox();
  const sidebar = await page.locator(".settings-sidebar").boundingBox();
  expect(Math.round(shell!.width)).toBe(374);
  expect(sidebar!.width / shell!.width).toBeGreaterThanOrEqual(0.36);
  expect(sidebar!.width / shell!.width).toBeLessThanOrEqual(0.43);
  await expect(page.locator(".settings-nav-item").first()).toHaveCSS("min-height", "33.5px");
});

test("keeps compact splitter bounds valid across intermediate phone widths", async ({ page }) => {
  for (const width of [431, 500, 563]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

    const splitter = page.getByRole("separator", { name: "Resize Settings sidebar" });
    const minimum = Number(await splitter.getAttribute("aria-valuemin"));
    const maximum = Number(await splitter.getAttribute("aria-valuemax"));
    const current = Number(await splitter.getAttribute("aria-valuenow"));
    const shell = await page.locator(".settings-window").boundingBox();
    const sidebar = await page.locator(".settings-sidebar").boundingBox();

    expect(minimum).toBeLessThanOrEqual(maximum);
    expect(current).toBeGreaterThanOrEqual(minimum);
    expect(current).toBeLessThanOrEqual(maximum);
    expect(sidebar!.width / shell!.width).toBeGreaterThanOrEqual(0.39);
    expect(sidebar!.width / shell!.width).toBeLessThanOrEqual(0.41);
  }
});

test("keeps labeled sidebar and immediate keyboard resizing after compact recomputation", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 700 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  const splitter = page.getByRole("separator", { name: "Resize Settings sidebar" });
  await splitter.focus();
  await page.keyboard.press("End");
  await expect(splitter).toHaveAttribute("aria-valuenow", await splitter.getAttribute("aria-valuemax"));

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
  const expectedAvailableHeight = `${500 - Math.ceil(menuBottom)}px`;
  await expect(frame).toHaveCSS("min-height", expectedAvailableHeight);
  await expect(frame).toHaveCSS("max-height", expectedAvailableHeight);
  const constrainedBounds = await settingsWindow.boundingBox();
  expect(constrainedBounds!.y).toBeGreaterThanOrEqual(menuBottom);
  expect(constrainedBounds!.y + constrainedBounds!.height).toBeLessThanOrEqual(500);
});

test("keeps the default menu corners on a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 320 });
  await page.goto("/");
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();

  const popup = page.locator(".tienos-menu-popup").first();
  await expect(popup).toHaveCSS("border-radius", "14px");
  await expect(page.getByText("About This OS", { exact: true }).locator("..")).toHaveCSS(
    "border-radius",
    "10px",
  );
});

test.describe("appearance modes", () => {
  test("persists Light and Dark while Auto follows live system changes", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");

    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    const settingsMenuItem = page.getByRole("menuitem", { name: "System Settings…" });
    await settingsMenuItem.hover();
    await expect(settingsMenuItem).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(settingsMenuItem.locator("kbd")).toHaveCSS("color", "rgb(255, 255, 255)");
    await settingsMenuItem.click();
    await page.getByRole("button", { name: "Appearance" }).click();
    const modes = page.getByRole("group", { name: "Appearance mode" });

    await modes.getByRole("button", { name: "Light" }).click();
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "light");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");

    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    await page.getByRole("menuitem", { name: "System Settings…" }).click();
    await page.getByRole("button", { name: "Appearance" }).click();
    await page.getByRole("group", { name: "Appearance mode" }).getByRole("button", { name: "Auto" }).click();
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");

    await page.getByRole("group", { name: "Appearance mode" }).getByRole("button", { name: "Dark" }).click();
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

    await page.evaluate(() => localStorage.setItem("tienos-appearance", "{broken"));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
  });
});
