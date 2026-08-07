import { expect, test, type Locator } from "@playwright/test";

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

test("applies design-system tokens to component styles", async ({ page }) => {
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
    windowRadius: "26px",
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
  await expect(menuItem).toHaveCSS("transition-duration", "0.777s");
  expect(
    await popup.evaluate((element) => {
      element.setAttribute("data-ending-style", "");
      const duration = getComputedStyle(element).transitionDuration;
      element.removeAttribute("data-ending-style");
      return duration;
    }),
  ).toBe("0.777s, 0.888s");

  await menuItem.click();
  await page.locator(":root").evaluate((root) => {
    (root as HTMLElement).style.setProperty("--tienos-color-accent-hover", "rgb(1 2 3)");
  });
  const selectedNavItem = page.locator(".settings-nav-item[data-selected]");
  await selectedNavItem.hover();
  await expect(selectedNavItem).toHaveCSS("background-color", "rgb(1, 2, 3)");
});

test("keeps keyboard focus visible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  await page.keyboard.press("Tab");
  const trigger = page.getByRole("menuitem", { name: "Open tienOS menu" });
  await expect(trigger).toHaveCSS("outline-style", "solid");
  await expect(trigger).toHaveCSS("outline-width", "2px");

  await trigger.click();
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
  await page.route(/\/assets\/.*\.js$/, (route) => route.abort("failed"));

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
});

test("renders the tienOS main screen and system menu", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("tienOS");
  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeVisible();
  await expect(bootScreen).toBeHidden();
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
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
  await expectFontAwesomeIconToPaint(page.locator('[data-fa-icon="chevron-right"]'), "chevron-right");
});

test("reveals the static desktop without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  const bootScreen = page.getByRole("status", { name: "Starting tienOS" });
  await expect(bootScreen).toBeVisible();
  await expect(bootScreen).toBeHidden();
  await expect(page.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Wi-Fi connected" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Battery full" })).toBeVisible();

  await context.close();
});

test("opens System Settings from the system menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  await expect(page.getByRole("region", { name: "System Settings" })).toBeVisible();
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
  expect(roundedBounds(heroBounds)).toMatchObject({ x: 340, y: 150, width: 459, height: 164 });
  expect(roundedBounds(firstGroupBounds)).toMatchObject({ x: 340, y: 324, width: 459, height: 128 });
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

test("drags and resizes the System Settings window with react-rnd", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  const initial = await settingsWindow.boundingBox();
  expect(initial).not.toBeNull();

  await page.mouse.move(initial!.x + initial!.width * 0.7, initial!.y + 16);
  await page.mouse.down();
  await page.mouse.move(initial!.x + initial!.width * 0.7 + 30, initial!.y + 36, { steps: 4 });
  await page.mouse.up();

  const dragged = await settingsWindow.boundingBox();
  expect(Math.round(dragged!.x - initial!.x)).toBe(30);
  expect(Math.round(dragged!.y - initial!.y)).toBe(20);

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
});

test("fits and fixes an open System Settings window on compact screens", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
  await page.getByRole("menuitem", { name: "System Settings…" }).click();

  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await page.setViewportSize({ width: 320, height: 320 });

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
  await page.mouse.move(compactBounds!.x + compactBounds!.width * 0.7, compactBounds!.y + 16);
  await page.mouse.down();
  await page.mouse.move(compactBounds!.x + compactBounds!.width * 0.7 - 40, compactBounds!.y - 20, {
    steps: 4,
  });
  await page.mouse.up();

  const fixedBounds = await settingsWindow.boundingBox();
  expect(fixedBounds).toEqual(compactBounds);
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
