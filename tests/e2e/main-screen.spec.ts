import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";

const spriteUrl = "/fontawesome/fontawesome-pro-solid.svg";
const startupViewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 320, height: 568 },
] as const;
const paintCriticalAssets = [
  { name: "Dark wallpaper", url: "**/wallpapers/tienos-default.jpg", colorScheme: "dark" },
  { name: "Light wallpaper", url: "**/wallpapers/tienos-light.jpg", colorScheme: "light" },
  { name: "icon sprite", url: "**/fontawesome/fontawesome-pro-solid.svg", colorScheme: "dark" },
] as const;

type DismissalFrame = {
  viewport: { width: number; height: number };
  fontFamily: string;
  desktop: { x: number; y: number; width: number; height: number; position: string } | null;
  menu: { x: number; y: number; width: number; height: number; position: string } | null;
  settings: {
    x: number;
    y: number;
    width: number;
    height: number;
    position: string;
    containerPosition: string | null;
  } | null;
};

function createDelayGate() {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { blocked, release };
}

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

async function expectBootIconToPaint(icon: Locator) {
  await expect(icon).toBeVisible();
  const geometry = await icon.evaluate((element) => {
    const iconBounds = element.getBoundingClientRect();
    const path = element.querySelector("path") as SVGGraphicsElement | null;
    const pathBounds = path?.getBBox();
    const styles = getComputedStyle(element);
    const pathStyles = path ? getComputedStyle(path) : null;
    return {
      icon: {
        x: iconBounds.x,
        y: iconBounds.y,
        width: iconBounds.width,
        height: iconBounds.height,
      },
      path: pathBounds
        ? { x: pathBounds.x, y: pathBounds.y, width: pathBounds.width, height: pathBounds.height }
        : null,
      display: styles.display,
      opacity: styles.opacity,
      visibility: styles.visibility,
      fill: pathStyles?.fill,
    };
  });
  expect(geometry.icon.width).toBeGreaterThan(0);
  expect(geometry.icon.height).toBeGreaterThan(0);
  expect(geometry.path?.width).toBeGreaterThan(0);
  expect(geometry.path?.height).toBeGreaterThan(0);
  expect(geometry.display).not.toBe("none");
  expect(geometry.opacity).not.toBe("0");
  expect(geometry.visibility).toBe("visible");
  expect(geometry.fill).not.toBe("none");
  return geometry.icon;
}

async function recordDismissalFrames(page: Page) {
  await page.addInitScript(() => {
    const observedWindow = window as typeof window & {
      dismissalFrames?: DismissalFrame[];
    };
    observedWindow.dismissalFrames = [];
    document.addEventListener("DOMContentLoaded", () => {
      const boot = document.getElementById("tienos-boot");
      if (!boot) return;
      new MutationObserver((_, observer) => {
        if (!boot.hasAttribute("data-complete")) return;
        observer.disconnect();
        let framesRemaining = 4;
        const sample = () => {
          const desktop = document.querySelector<HTMLElement>('main[aria-label="tienOS desktop"]');
          const menu = document.querySelector<HTMLElement>("[data-menu-bar-surface]");
          const settings = document.querySelector<HTMLElement>('[aria-label="System Settings"]');
          const desktopBounds = desktop?.getBoundingClientRect();
          const menuBounds = menu?.getBoundingClientRect();
          const settingsBounds = settings?.getBoundingClientRect();
          observedWindow.dismissalFrames?.push({
            viewport: { width: innerWidth, height: innerHeight },
            fontFamily: getComputedStyle(document.body).fontFamily,
            desktop: desktopBounds
              ? {
                  x: desktopBounds.x,
                  y: desktopBounds.y,
                  width: desktopBounds.width,
                  height: desktopBounds.height,
                  position: getComputedStyle(desktop!).position,
                }
              : null,
            menu: menuBounds
              ? {
                  x: menuBounds.x,
                  y: menuBounds.y,
                  width: menuBounds.width,
                  height: menuBounds.height,
                  position: getComputedStyle(menu!).position,
                }
              : null,
            settings: settingsBounds
              ? {
                  x: settingsBounds.x,
                  y: settingsBounds.y,
                  width: settingsBounds.width,
                  height: settingsBounds.height,
                  position: getComputedStyle(settings!).position,
                  containerPosition: settings?.parentElement
                    ? getComputedStyle(settings.parentElement).position
                    : null,
                }
              : null,
          });
          framesRemaining -= 1;
          if (framesRemaining > 0) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }).observe(boot, { attributes: true, attributeFilter: ["data-complete"] });
    });
  });
}

async function expectStyledDismissalFrames(
  page: Page,
  options: { settings: boolean; menu?: "application" | "fallback" },
) {
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { dismissalFrames?: unknown[] }).dismissalFrames?.length ?? 0,
      ),
    )
    .toBe(4);
  const frames = await page.evaluate(
    () =>
      (
        window as typeof window & {
          dismissalFrames?: DismissalFrame[];
        }
      ).dismissalFrames ?? [],
  );
  for (const frame of frames) expectDismissalFrameGeometry(frame, options);
}

function expectDismissalFrameGeometry(
  frame: DismissalFrame,
  options: { settings: boolean; menu?: "application" | "fallback" },
) {
  expect(frame.fontFamily).not.toMatch(/(^|,\s*)(serif|"?Times New Roman"?|Times)(,|$)/i);
  expect(frame.desktop).toMatchObject({
    x: 0,
    y: 0,
    width: frame.viewport.width,
    position: "relative",
  });
  expect(frame.desktop?.height).toBeGreaterThanOrEqual(frame.viewport.height);
  if (options.menu === "fallback") {
    expect(frame.menu?.position).toBe("fixed");
    expect(frame.menu?.x).toBeCloseTo(6, 1);
    expect(frame.menu?.y).toBeCloseTo(6, 1);
    expect(frame.menu?.width).toBeCloseTo(frame.viewport.width - 12, 1);
    expect(frame.menu?.height).toBeGreaterThanOrEqual(40);
  } else {
    expect(frame.menu).toMatchObject({
      x: 0,
      y: 0,
      width: frame.viewport.width,
      position: "fixed",
    });
    expect(frame.menu?.height).toBeGreaterThanOrEqual(28);
  }
  if (options.settings) {
    expect(frame.settings?.position).toBe("relative");
    expect(frame.settings?.containerPosition).toBe("absolute");
    expect(frame.settings?.x).toBeGreaterThanOrEqual(8);
    expect(frame.settings?.y).toBeGreaterThanOrEqual(frame.menu?.height ?? 28);
    expect(frame.settings?.width).toBeGreaterThanOrEqual(Math.min(280, frame.viewport.width * 0.6));
    expect(frame.settings?.height).toBeGreaterThanOrEqual(Math.min(400, frame.viewport.height * 0.6));
    expect((frame.settings?.x ?? 0) + (frame.settings?.width ?? 0)).toBeLessThanOrEqual(
      frame.viewport.width - 8,
    );
    expect((frame.settings?.y ?? 0) + (frame.settings?.height ?? 0)).toBeLessThanOrEqual(
      frame.viewport.height - 8,
    );
  } else {
    expect(frame.settings).toBeNull();
  }
}

async function expectCapturedFramesToMatchStableReveal(
  frames: Buffer[],
  stableFrame: Buffer,
  theme: "dark" | "light" = "dark",
) {
  const decoded = await Promise.all(
    [...frames, stableFrame].map(async (frame) => {
      const { data, info } = await sharp(frame).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      return { data, width: info.width, height: info.height, channels: info.channels };
    }),
  );
  const stable = decoded.at(-1)!;
  const captured = decoded
    .slice(0, -1)
    .filter((frame) => frame.width === stable.width && frame.height === stable.height);
  expect(captured.length).toBeGreaterThanOrEqual(2);

  const pixel = (frame: (typeof decoded)[number], x: number, y: number) => {
    const offset = (y * frame.width + x) * frame.channels;
    return [frame.data[offset], frame.data[offset + 1], frame.data[offset + 2]];
  };
  const isOpaqueSplash = (frame: (typeof decoded)[number]) => {
    const corners = [
      pixel(frame, 2, 2),
      pixel(frame, frame.width - 3, 2),
      pixel(frame, 2, frame.height - 3),
      pixel(frame, frame.width - 3, frame.height - 3),
    ];
    const logoCenter = pixel(frame, Math.floor(frame.width / 2), Math.floor(frame.height / 2 - 38));
    const background = theme === "light" ? [248, 250, 252] : [5, 5, 5];
    return (
      corners.every((color) => color.every((channel, index) => Math.abs(channel - background[index]) <= 3)) &&
      (theme === "light"
        ? logoCenter.every((channel) => channel <= 60)
        : logoCenter.every((channel) => channel >= 180))
    );
  };
  const bootIndex = captured.findLastIndex(isOpaqueSplash);
  expect(bootIndex).toBeGreaterThanOrEqual(0);
  const boot = captured[bootIndex];
  const revealFrames = [...captured.slice(bootIndex + 1), stable];
  expect(revealFrames.length).toBeGreaterThanOrEqual(2);

  let priorOpacity = 1;
  let exposedFrames = 0;
  for (const frame of revealFrames) {
    let numerator = 0;
    let denominator = 0;
    for (let offset = 0; offset < frame.data.length; offset += frame.channels * 97) {
      for (let channel = 0; channel < 3; channel += 1) {
        const bootDelta = boot.data[offset + channel] - stable.data[offset + channel];
        numerator += (frame.data[offset + channel] - stable.data[offset + channel]) * bootDelta;
        denominator += bootDelta * bootDelta;
      }
    }
    const opacity = Math.max(0, Math.min(1, numerator / denominator));
    let residual = 0;
    let samples = 0;
    for (let offset = 0; offset < frame.data.length; offset += frame.channels * 97) {
      for (let channel = 0; channel < 3; channel += 1) {
        const expected =
          stable.data[offset + channel] +
          opacity * (boot.data[offset + channel] - stable.data[offset + channel]);
        residual += Math.abs(frame.data[offset + channel] - expected);
        samples += 1;
      }
    }
    expect(opacity).toBeLessThanOrEqual(priorOpacity + 0.03);
    expect(residual / samples).toBeLessThan(8);
    if (opacity < 0.98) exposedFrames += 1;
    priorOpacity = opacity;
  }
  expect(exposedFrames).toBeGreaterThanOrEqual(1);
  expect(priorOpacity).toBeLessThan(0.01);
}

async function expectConventionalRoundedGeometry(element: Locator, { allowFullRectangleClip = false } = {}) {
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
  if (allowFullRectangleClip) {
    expect(geometry.clipPath.replaceAll("0px", "0")).toMatch(/^polygon\(0 0, 100% 0, 100% 100%, 0 100%\)$/);
  } else {
    expect(geometry.clipPath).toBe("none");
  }
  expect(geometry.maskImage).toBe("none");
  expect(geometry.webkitMaskImage).toBe("none");
}

async function touchDrag(
  session: CDPSession,
  from: { x: number; y: number },
  to: { x: number; y: number },
  whileDragging?: () => Promise<void>,
) {
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }],
  });
  await whileDragging?.();
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: to.x, y: to.y }],
  });
  try {
    await whileDragging?.();
  } finally {
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
}

async function readCenterPixel(element: Locator) {
  const screenshot = await element.screenshot({ animations: "disabled" });
  const { data, info } = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
  const offset = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
  return Array.from(data.subarray(offset, offset + 3));
}

async function readHorizontalPixels(element: Locator, distanceFromCenter: number) {
  const screenshot = await element.screenshot({ animations: "disabled" });
  const { data, info } = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
  const y = Math.max(1, info.height - 7);
  const center = Math.floor(info.width / 2);
  return [-distanceFromCenter, distanceFromCenter].map((offsetFromCenter) => {
    const x = center + offsetFromCenter;
    const offset = (y * info.width + x) * info.channels;
    return Array.from(data.subarray(offset, offset + 3));
  });
}

async function readBackgroundsBehind(popup: Locator, foregrounds: Locator[]) {
  const popupBounds = await popup.boundingBox();
  expect(popupBounds).not.toBeNull();
  const foregroundHandles = await Promise.all(foregrounds.map((foreground) => foreground.elementHandle()));
  for (const handle of foregroundHandles) expect(handle).not.toBeNull();
  const foregroundBounds = await Promise.all(foregroundHandles.map((handle) => handle.boundingBox()));
  for (const bounds of foregroundBounds) expect(bounds).not.toBeNull();
  await Promise.all(
    foregroundHandles.map((handle) =>
      handle.evaluate((node) => (node as HTMLElement).style.setProperty("visibility", "hidden", "important")),
    ),
  );
  const screenshot = await popup.screenshot({ animations: "disabled" }).finally(async () => {
    await Promise.all(
      foregroundHandles.map((handle) =>
        handle.evaluate((node) => (node as HTMLElement).style.removeProperty("visibility")),
      ),
    );
  });
  const { data, info } = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
  return foregroundBounds.map((bounds) => {
    const x = Math.max(
      0,
      Math.min(info.width - 1, Math.floor(bounds!.x + bounds!.width / 2 - popupBounds!.x)),
    );
    const y = Math.max(
      0,
      Math.min(info.height - 1, Math.floor(bounds!.y + bounds!.height / 2 - popupBounds!.y)),
    );
    const offset = (y * info.width + x) * info.channels;
    return pixelColor(Array.from(data.subarray(offset, offset + 3)));
  });
}

type Rgba = { red: number; green: number; blue: number; alpha: number };

function parseColor(value: string): Rgba {
  const channels = value.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3) throw new Error(`Unsupported computed color: ${value}`);
  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
    alpha: channels[3] ?? 1,
  };
}

function composite(foreground: Rgba, background: Rgba): Rgba {
  return {
    red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
    green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
    blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
    alpha: 1,
  };
}

function contrastRatio(first: Rgba, second: Rgba) {
  const luminance = ({ red, green, blue }: Rgba) => {
    const linearize = (channel: number) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
  };
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function pixelColor([red, green, blue]: number[]): Rgba {
  return { red, green, blue, alpha: 1 };
}

async function expectColorContrast(
  foreground: Locator,
  foregroundProperty: "color" | "background-color",
  background: Rgba,
  minimum: number,
) {
  const value = parseColor(
    await foreground.evaluate(
      (node, property) => getComputedStyle(node).getPropertyValue(property),
      foregroundProperty,
    ),
  );
  expect(contrastRatio(composite(value, background), background)).toBeGreaterThanOrEqual(minimum);
}

async function expectLocalRenderedContrasts(
  popup: Locator,
  entries: {
    foreground: Locator;
    minimum: number;
    label: string;
    property?: "color" | "background-color";
  }[],
) {
  const foregroundColors = await Promise.all(
    entries.map(async ({ foreground, property = "color" }) =>
      parseColor(
        await foreground.evaluate(
          (node, cssProperty) => getComputedStyle(node).getPropertyValue(cssProperty),
          property,
        ),
      ),
    ),
  );
  const backgrounds = await readBackgroundsBehind(
    popup,
    entries.map(({ foreground }) => foreground),
  );
  entries.forEach(({ minimum, label }, index) => {
    expect(
      contrastRatio(composite(foregroundColors[index], backgrounds[index]), backgrounds[index]),
      label,
    ).toBeGreaterThanOrEqual(minimum);
  });
}

async function expectLocalSeparatorTreatment(
  popup: Locator,
  separators: Locator[],
  label: string,
  expectedCount: number,
  treatment: "subtle" | "explicit" = "subtle",
) {
  expect(separators, `${label} separator count`).toHaveLength(expectedCount);
  if (separators.length === 0) return;
  const separatorHandles = await Promise.all(separators.map((separator) => separator.elementHandle()));
  for (const handle of separatorHandles) expect(handle).not.toBeNull();
  const renderedScreenshot = await popup.screenshot({ animations: "disabled" });
  const popupBounds = await popup.boundingBox();
  expect(popupBounds).not.toBeNull();
  const separatorBounds = await Promise.all(separatorHandles.map((handle) => handle.boundingBox()));
  for (const bounds of separatorBounds) expect(bounds).not.toBeNull();
  await Promise.all(
    separatorHandles.map((handle) =>
      handle.evaluate((node) => (node as HTMLElement).style.setProperty("visibility", "hidden", "important")),
    ),
  );
  const backgroundScreenshot = await popup.screenshot({ animations: "disabled" }).finally(async () => {
    await Promise.all(
      separatorHandles.map((handle) =>
        handle.evaluate((node) => (node as HTMLElement).style.removeProperty("visibility")),
      ),
    );
  });
  const [rendered, backgrounds] = await Promise.all(
    [renderedScreenshot, backgroundScreenshot].map((screenshot) =>
      sharp(screenshot).raw().toBuffer({ resolveWithObject: true }),
    ),
  );
  separatorBounds.forEach((bounds, separatorIndex) => {
    expect(bounds!.height, `${label} separator ${separatorIndex + 1} should be a hairline`).toBe(1);
    const inset = bounds!.x - popupBounds!.x;
    if (treatment === "subtle") {
      expect(inset, `${label} separator ${separatorIndex + 1} should be inset`).toBeGreaterThanOrEqual(12);
      expect(
        popupBounds!.x + popupBounds!.width - (bounds!.x + bounds!.width),
        `${label} separator ${separatorIndex + 1} should have symmetric trailing inset`,
      ).toBeCloseTo(inset, 0);
    }
    for (const horizontalOffset of [-55, 55]) {
      const x = Math.max(
        0,
        Math.min(
          rendered.info.width - 1,
          Math.floor(bounds!.x + bounds!.width / 2 + horizontalOffset - popupBounds!.x),
        ),
      );
      const firstY = Math.max(0, Math.floor(bounds!.y - popupBounds!.y) - 1);
      const lastY = Math.min(
        rendered.info.height - 1,
        Math.ceil(bounds!.y + bounds!.height - popupBounds!.y) + 1,
      );
      const renderedContrasts = Array.from({ length: lastY - firstY + 1 }, (_, index) => {
        const y = firstY + index;
        const renderedOffset = (y * rendered.info.width + x) * rendered.info.channels;
        const backgroundOffset = (y * backgrounds.info.width + x) * backgrounds.info.channels;
        const separatorColor = pixelColor(
          Array.from(rendered.data.subarray(renderedOffset, renderedOffset + 3)),
        );
        const backgroundColor = pixelColor(
          Array.from(backgrounds.data.subarray(backgroundOffset, backgroundOffset + 3)),
        );
        return contrastRatio(separatorColor, backgroundColor);
      });
      const peakContrast = Math.max(...renderedContrasts);
      const assertion = expect(
        peakContrast,
        `${label} separator ${separatorIndex + 1} at ${horizontalOffset < 0 ? "left" : "right"}`,
      );
      if (treatment === "explicit") assertion.toBeGreaterThanOrEqual(3);
      else {
        assertion.toBeGreaterThanOrEqual(1.08);
        assertion.toBeLessThan(2);
      }
    }
  });
}

async function setResolvedTheme(page: Page, theme: "dark" | "light") {
  await page.evaluate((mode) => localStorage.setItem("tienos-appearance", JSON.stringify(mode)), theme);
  await page.reload();
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden({ timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

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
            styles.setProperty("animation", "none", "important");
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

test("supports menu popup keyboard navigation, activation, focus return, and dismissal", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  const systemTrigger = page.getByRole("menuitem", { name: "Open tienOS menu" });
  await systemTrigger.focus();
  await systemTrigger.press("ArrowDown");
  const systemPopup = page.locator(".tienos-menu-popup:visible");
  await expect(systemPopup).toHaveCount(1);
  await expect(systemPopup).toHaveCSS("background-image", /linear-gradient/);
  await expect(systemPopup).toHaveCSS("backdrop-filter", "blur(18px) saturate(1.5)");
  await expect(page.getByRole("menuitem", { name: "About This OS" })).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("Enter");
  await expect(systemPopup).toBeHidden();
  await expect(systemTrigger).toBeFocused();

  await systemTrigger.press("ArrowDown");
  const aboutThisOS = page.getByRole("menuitem", { name: "About This OS" });
  await expect(aboutThisOS).toHaveAttribute("data-highlighted", "");
  await aboutThisOS.press("ArrowDown");
  const systemSettings = page.getByRole("menuitem", { name: "System Settings…" });
  await expect(systemSettings).toHaveAttribute("data-highlighted", "");
  await systemSettings.press("ArrowDown");
  const appStore = page.getByRole("menuitem", { name: "App Store" });
  await expect(appStore).toHaveAttribute("data-highlighted", "");
  await appStore.press("ArrowDown");
  const recentItems = page.getByRole("menuitem", { name: "Recent Items" });
  await expect(recentItems).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("ArrowRight");
  const submenuPopup = page.locator(".tienos-menu-popup:visible").last();
  await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(2);
  await expect(submenuPopup).toHaveCSS("background-image", /linear-gradient/);
  await expect(submenuPopup).toHaveCSS("backdrop-filter", "blur(18px) saturate(1.5)");
  await expect(page.getByRole("menuitem", { name: "No Recent Items" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(1);
  await expect(recentItems).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("Escape");
  await expect(systemPopup).toBeHidden();
  await expect(systemTrigger).toBeFocused();

  await systemTrigger.press("ArrowDown");
  await page.getByRole("heading", { name: "General" }).click();
  await expect(systemPopup).toBeHidden();

  const navigatorTrigger = page.getByRole("menuitem", { name: "Navigator" });
  await navigatorTrigger.focus();
  await navigatorTrigger.press("ArrowDown");
  const navigatorPopup = page.locator(".tienos-menu-popup:visible");
  await expect(navigatorPopup).toHaveCount(1);
  await expect(navigatorPopup).toHaveCSS("background-image", /linear-gradient/);
  await expect(navigatorPopup).toHaveCSS("backdrop-filter", "blur(18px) saturate(1.5)");
  await expect(page.getByRole("menuitem", { name: "About Navigator" })).toHaveAttribute(
    "data-highlighted",
    "",
  );
  await page.keyboard.press("Enter");
  await expect(navigatorPopup).toBeHidden();
  await expect(navigatorTrigger).toBeFocused();

  await navigatorTrigger.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(navigatorPopup).toBeHidden();
  await expect(navigatorTrigger).toBeFocused();
  await navigatorTrigger.click();
  await page.getByRole("heading", { name: "General" }).click();
  await expect(navigatorPopup).toBeHidden();
});

test("supports compact touch menu popups, submenu collision, activation, and dismissal", async ({
  browser,
}) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 320, height: 320 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();

  const expectCompactGlass = async (popup: Locator) => {
    await expect(popup).toBeVisible();
    await expect(popup).toHaveCSS("border-radius", "14px");
    await expect(popup).toHaveCSS("background-image", /linear-gradient/);
    await expect(popup).toHaveCSS("backdrop-filter", "blur(18px) saturate(1.5)");
    const bounds = await popup.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(7);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(313);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(320);
  };

  const systemTrigger = page.getByRole("menuitem", { name: "Open tienOS menu" });
  await systemTrigger.tap();
  await expectCompactGlass(page.locator(".tienos-menu-popup:visible"));
  await page.getByRole("menuitem", { name: "Recent Items" }).tap();
  await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(2);
  await expectCompactGlass(page.locator(".tienos-menu-popup:visible").last());
  await page.getByRole("heading", { name: "General" }).tap();
  await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(0);

  await systemTrigger.tap();
  await page.getByRole("menuitem", { name: "About This OS" }).tap();
  await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(0);
  await expect(systemTrigger).toBeFocused();

  const navigatorTrigger = page.getByRole("menuitem", { name: "Navigator" });
  await navigatorTrigger.tap();
  await expectCompactGlass(page.locator(".tienos-menu-popup:visible"));
  await page.getByRole("menuitem", { name: "About Navigator" }).tap();
  await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(0);
  await expect(navigatorTrigger).toBeFocused();

  await navigatorTrigger.tap();
  await page.getByRole("heading", { name: "General" }).tap();
  await expect(page.locator(".tienos-menu-popup:visible")).toHaveCount(0);
  await context.close();
});

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

test("drags and resizes the System Settings window with react-rnd", async ({ page }) => {
  test.slow();
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

test("Dock renders, reports, focuses, and layers the single Settings window", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  const dock = page.getByRole("navigation", { name: "Dock" });
  const app = dock.getByRole("button", { name: "System Settings" });
  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await expect(dock.getByRole("button")).toHaveCount(1);
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
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--tienos-safe-area-bottom", "34px");
    window.dispatchEvent(new Event("resize"));
  });
  const dock = page.getByRole("navigation", { name: "Dock" });
  const app = dock.getByRole("button", { name: "System Settings" });
  await expect(app).toHaveCSS("width", "56px");
  await expect(app).toHaveCSS("height", "56px");
  await page.getByRole("button", { name: "Close System Settings" }).tap();
  await app.tap();
  const settingsWindow = page.getByRole("region", { name: "System Settings" });
  await expect(settingsWindow).toBeFocused();
  await expect(settingsWindow).toHaveCount(1);

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
  await expect(dock.getByRole("button")).toHaveCount(1);
  await expect(app).toHaveAccessibleName("System Settings");
  await expect(app).toHaveAttribute("title", "System Settings");
  await expect(page.getByRole("button", { name: "Close System Settings" })).toBeVisible();
  await expect(page.locator('.settings-scroll-viewport[aria-label="Settings details"]')).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath("dock-iphone-landscape.png") });
  await context.close();
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
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-default\.jpg/);

    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-light\.jpg/);

    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    const settingsMenuItem = page.getByRole("menuitem", { name: "System Settings…" });
    await settingsMenuItem.hover();
    await expect(settingsMenuItem).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(settingsMenuItem.locator("kbd")).toHaveCSS("color", "rgb(255, 255, 255)");
    await settingsMenuItem.click();
    await page.getByRole("button", { name: "Appearance" }).click();
    const modes = page.getByRole("radiogroup", { name: "Appearance mode" });

    await modes.getByRole("radio", { name: "Light" }).click();
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(modes.getByRole("radio", { name: "Light" })).toBeFocused();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "light");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");

    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    await page.getByRole("menuitem", { name: "System Settings…" }).click();
    await page.getByRole("button", { name: "Appearance" }).click();
    await page
      .getByRole("radiogroup", { name: "Appearance mode" })
      .getByRole("radio", { name: "Auto" })
      .click();
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");

    await page
      .getByRole("radiogroup", { name: "Appearance mode" })
      .getByRole("radio", { name: "Dark" })
      .click();
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
    await page.addInitScript(() => localStorage.setItem("tienos-appearance", JSON.stringify("auto")));
    await page.route("**/wallpapers/tienos-light.jpg", (route) => route.abort("failed"));
    const unhandledRejections: string[] = [];
    page.on("pageerror", (error) => unhandledRejections.push(error.message));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden();
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(":root")).toHaveAttribute("data-wallpaper-fallback", "light");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", "none");
    await expect(page.getByRole("main", { name: "tienOS desktop" })).toHaveCSS(
      "background-color",
      "rgb(219, 234, 254)",
    );

    await page.getByRole("menuitem", { name: "Open tienOS menu" }).click();
    await page.getByRole("menuitem", { name: "System Settings…" }).click();
    await page.getByRole("button", { name: "Appearance" }).click();

    const lightMode = page
      .getByRole("radiogroup", { name: "Appearance mode" })
      .getByRole("radio", { name: "Light" });
    await lightMode.click();

    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "auto");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", "none");
    await expect(
      page.getByRole("radiogroup", { name: "Appearance mode" }).getByRole("radio", { name: "Auto" }),
    ).toBeChecked();
    await expect(lightMode).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("tienos-appearance")))
      .toBe(JSON.stringify("auto"));
    expect(unhandledRejections).toEqual([]);
  });

  test("retargets a pending Auto transition when the system theme changes", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("tienos-appearance", JSON.stringify("light"));
      const nativeDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode")?.value as (
        this: HTMLImageElement,
      ) => Promise<void>;
      let finishDarkDecode!: () => void;
      const darkWallpaperDecode: { finished: Promise<void>; release?: () => void; started: boolean } = {
        finished: new Promise((resolve) => {
          finishDarkDecode = resolve;
        }),
        started: false,
      };
      HTMLImageElement.prototype.decode = function () {
        const decoded = nativeDecode.call(this);
        if (!this.src.endsWith("/wallpapers/tienos-default.jpg")) return decoded;
        darkWallpaperDecode.started = true;
        return new Promise((resolve, reject) => {
          darkWallpaperDecode.release = () =>
            void decoded.then((value) => {
              resolve(value);
              queueMicrotask(finishDarkDecode);
            }, reject);
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
  });

  test("preserves a pending explicit transition across system theme changes", async ({ page }) => {
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

    darkWallpaperGate.release();
    await expect(page.locator(":root")).toHaveAttribute("data-appearance", "dark");
    await expect(page.locator(":root")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".tienos-wallpaper")).toHaveCSS("background-image", /tienos-default\.jpg/);
    await expect(darkMode).toBeChecked();
    await expect(darkMode).toBeFocused();
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const dockApp = page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: "System Settings" });
  const controlNames = [
    "Close System Settings",
    "Minimize System Settings",
    "Toggle fullscreen System Settings",
  ];
  const hitOwners = await page.evaluate((names) => {
    return names.map((name) => {
      const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
      const box = button.getBoundingClientRect();
      return [2, 22, 42].flatMap((offsetX) =>
        [2, 22, 42].map((offsetY) =>
          document
            .elementFromPoint(box.left + offsetX, box.top + offsetY)
            ?.closest("button")
            ?.getAttribute("aria-label"),
        ),
      );
    });
  }, controlNames);
  expect(hitOwners).toEqual(controlNames.map((name) => Array<string>(9).fill(name)));
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
    { center: 69, owner: "Minimize System Settings", size: 11 },
    { center: 113, owner: "Toggle fullscreen System Settings", size: 11 },
  ]);
  const compactHeaderClearance = await page.evaluate(() => {
    const fullscreen = document.querySelector<HTMLElement>(
      'button[aria-label="Toggle fullscreen System Settings"]',
    )!;
    const history = document.querySelector<HTMLElement>(".settings-history")!;
    return history.getBoundingClientRect().left - fullscreen.getBoundingClientRect().right;
  });
  expect(compactHeaderClearance).toBeGreaterThanOrEqual(0);

  await page
    .getByRole("button", { name: "Toggle fullscreen System Settings" })
    .tap({ position: { x: 22, y: 20.5 } });
  await expect(page.getByRole("button", { name: "Toggle fullscreen System Settings" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({ path: testInfo.outputPath("settings-touch-fullscreen.png") });
  await page.getByRole("button", { name: "Minimize System Settings" }).tap({ position: { x: 22, y: 20.5 } });
  await expect(page.getByRole("region", { name: "System Settings" })).toBeHidden();
  await dockApp.tap();
  await expect(page.getByRole("region", { name: "System Settings" })).toBeVisible();
  await page.waitForTimeout(450);
  await page.getByRole("button", { name: "Close System Settings" }).tap({ position: { x: 22, y: 20.5 } });
  await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(0);

  await dockApp.tap();
  await expect(page.getByRole("region", { name: "System Settings" })).toBeVisible();
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
  await expect(window).toHaveAttribute("data-window-visibility", "minimizing");
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

test("keyboard minimize and close preserve descendant focus and single-window state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  const dockApp = page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: "System Settings" });
  const dockStatus = page.getByRole("navigation", { name: "Dock" }).getByRole("status");
  const window = page.getByRole("region", { name: "System Settings" });
  const search = page.getByPlaceholder("Search");

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

test("Settings portal activity and traffic-light hit regions keep unambiguous ownership", async ({
  page,
}) => {
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
    { center: 72, owner: "Minimize System Settings", size: 13 },
    { center: 116, owner: "Toggle fullscreen System Settings", size: 13 },
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
  expect(red!.x + red!.width).toBeLessThanOrEqual(yellow!.x);
  expect(yellow!.x + yellow!.width).toBeLessThanOrEqual(green!.x);
  await minimize.click({ position: { x: yellow!.width / 2, y: yellow!.height / 2 } });
  await expect(dockStatus).toHaveText("System Settings is running and minimized");
  await expect(page.locator('button[aria-label="Toggle fullscreen System Settings"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await dockApp.click();
  await expect(page.locator('[data-genie-window][data-window-visibility="visible"]')).toHaveCount(1);

  await fullscreen.click({ position: { x: green!.width / 2, y: green!.height / 2 } });
  await expect(fullscreen).toHaveAttribute("aria-pressed", "true");
  await fullscreen.click();

  await close.click({ position: { x: red!.width / 2, y: red!.height / 2 } });
  await expect(window).toHaveCount(0);
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
