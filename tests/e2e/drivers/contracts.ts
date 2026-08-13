import { expect, type CDPSession, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";

export const spriteUrl = "/fontawesome/fontawesome-pro-solid.svg";
// Full-page, backdrop-filtered captures have small compositor-specific edge variance on Linux.
// Semantic assertions remain exact; final frames keep a tighter budget than blended midpoints.
export const themeMidpointMaxDiffPixelRatio = 0.06;
export const themeFinalMaxDiffPixelRatio = 0.05;
export const startupViewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 320, height: 568 },
] as const;
export const paintCriticalAssets = [
  { name: "Dark wallpaper", url: "**/wallpapers/tienos-default.jpg", colorScheme: "dark" },
  { name: "Light wallpaper", url: "**/wallpapers/tienos-light.jpg", colorScheme: "light" },
  { name: "icon sprite", url: "**/fontawesome/fontawesome-pro-solid.svg", colorScheme: "dark" },
] as const;

export type DismissalFrame = {
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

export function createDelayGate() {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { blocked, release };
}

export const trafficHitPoints = [
  { x: -1, owner: null },
  { x: 1, owner: "Close System Settings" },
  { x: 22, owner: "Close System Settings" },
  { x: 31, owner: "Close System Settings" },
  { x: 32, owner: "Minimize System Settings" },
  { x: 42, owner: "Minimize System Settings" },
  { x: 51, owner: "Minimize System Settings" },
  { x: 52, owner: "Toggle fullscreen System Settings" },
  { x: 62, owner: "Toggle fullscreen System Settings" },
  { x: 83, owner: "Toggle fullscreen System Settings" },
  { x: 85, owner: null },
] as const;
export const trafficActionPoints = [
  ...trafficHitPoints
    .filter(({ owner, x }) => owner !== null && x !== 51)
    .map((point) => ({ ...point, y: 22 })),
  { x: 50, y: 22, owner: "Minimize System Settings" },
  { x: 22, y: 1, owner: "Close System Settings" },
  { x: 42, y: 43, owner: "Minimize System Settings" },
  { x: 62, y: 1, owner: "Toggle fullscreen System Settings" },
  { x: 110, y: 22, owner: null },
  { x: 42, y: 100, owner: null },
] as const;

export async function expectTrafficOwnershipMap(page: Page) {
  const map = await page.evaluate((points) => {
    const close = document.querySelector<HTMLButtonElement>('button[aria-label="Close System Settings"]')!;
    const box = close.getBoundingClientRect();
    const ownerAt = (x: number, y: number) =>
      document
        .elementFromPoint(box.left + x, box.top + y)
        ?.closest("button")
        ?.getAttribute("aria-label") ?? null;
    return {
      rows: [1, 22, 43].map((y) => points.map(({ x }) => ownerAt(x, y))),
      verticalOutside: [ownerAt(22, -2), ownerAt(62, 45)],
    };
  }, trafficHitPoints);
  expect(map.rows).toEqual(Array(3).fill(trafficHitPoints.map(({ owner }) => owner)));
  expect(map.verticalOutside).toEqual([null, null]);
}

export async function exerciseTrafficHitPoints(
  page: Page,
  activate: (x: number, y: number) => Promise<void>,
) {
  const dock = page.getByRole("navigation", { name: "Dock" });
  const dockApp = dock.getByRole("button", { name: "System Settings" });
  for (const point of trafficActionPoints) {
    await expect(page.locator('[data-genie-window][data-window-visibility="visible"]')).toHaveCount(1);
    const close = page.getByRole("button", { name: "Close System Settings" });
    const origin = await close.boundingBox();
    expect(origin).not.toBeNull();
    await activate(origin!.x + point.x, origin!.y + point.y);
    if (point.owner === "Close System Settings") {
      await expect(page.getByRole("region", { name: "System Settings" })).toHaveCount(0);
      await dockApp.click();
      await expect(page.locator('[data-genie-window][data-window-visibility="visible"]')).toHaveCount(1);
    } else if (point.owner === "Minimize System Settings") {
      await expect(dock.locator("#system-settings-dock-status"), JSON.stringify(point)).toHaveText(
        "System Settings is running and minimized",
      );
      await dockApp.click();
      await expect(page.locator('[data-genie-window][data-window-visibility="visible"]')).toHaveCount(1);
    } else if (point.owner === "Toggle fullscreen System Settings") {
      const fullscreen = page.getByRole("button", { name: "Toggle fullscreen System Settings" });
      await expect(fullscreen).toHaveAttribute("aria-pressed", "true");
      await fullscreen.click();
      await expect(fullscreen).toHaveAttribute("aria-pressed", "false");
    } else {
      await expect(page.getByRole("region", { name: "System Settings" })).toBeVisible();
      await expect(dock.locator("#system-settings-dock-status")).toHaveText("System Settings is running");
    }
  }
}

export async function armThemeAnimationPause(page: Page) {
  await page.evaluate(() => {
    if (document.querySelector("[data-test-theme-transition-pause]")) return;
    const style = document.createElement("style");
    style.dataset.testThemeTransitionPause = "";
    style.textContent =
      "::view-transition-group(root),::view-transition-old(root),::view-transition-new(root){animation-play-state:paused!important}";
    document.head.append(style);
  });
}

export async function waitForThemeAnimations(page: Page) {
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
    .toBeGreaterThanOrEqual(3);
}

export async function pauseThemeAnimationsAtMidpoint(page: Page) {
  return page.evaluate(() => {
    const animations = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.effect !== null &&
          "pseudoElement" in animation.effect &&
          typeof animation.effect.pseudoElement === "string" &&
          animation.effect.pseudoElement.startsWith("::view-transition"),
      );
    for (const animation of animations) {
      animation.pause();
      animation.currentTime = Number(animation.effect?.getTiming().duration) / 2;
    }
    void document.documentElement.offsetWidth;
    const describe = (
      pseudo: "::view-transition-old(root)" | "::view-transition-new(root)",
      animationName: "tienos-theme-fade-out" | "tienos-theme-fade-in",
    ) => {
      const animation = animations.find(
        (candidate) =>
          candidate.effect !== null &&
          "pseudoElement" in candidate.effect &&
          candidate.effect.pseudoElement === pseudo &&
          candidate instanceof CSSAnimation &&
          candidate.animationName === animationName,
      ) as CSSAnimation | undefined;
      const styles = getComputedStyle(document.documentElement, pseudo);
      return {
        animationName: animation?.animationName,
        computedName: styles.animationName,
        duration: Number(animation?.effect?.getTiming().duration),
        computedDuration: styles.animationDuration,
        computedEasing: styles.animationTimingFunction,
        keyframeOpacity: (animation?.effect as KeyframeEffect | null)
          ?.getKeyframes()
          .map((keyframe) => Number(keyframe.opacity)),
        opacity: Number.parseFloat(styles.opacity),
        progress: animation?.effect?.getComputedTiming().progress,
      };
    };
    return {
      animationCount: animations.length,
      old: describe("::view-transition-old(root)", "tienos-theme-fade-out"),
      next: describe("::view-transition-new(root)", "tienos-theme-fade-in"),
    };
  });
}

export async function finishThemeAnimations(page: Page) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (
        animation.effect !== null &&
        "pseudoElement" in animation.effect &&
        typeof animation.effect.pseudoElement === "string" &&
        animation.effect.pseudoElement.startsWith("::view-transition")
      )
        animation.finish();
    }
    document.querySelector("[data-test-theme-transition-pause]")?.remove();
  });
}

export function expectProductionThemeAnimations(
  state: Awaited<ReturnType<typeof pauseThemeAnimationsAtMidpoint>>,
) {
  expect(state.animationCount).toBeGreaterThanOrEqual(3);
  expect(state.old).toMatchObject({
    animationName: "tienos-theme-fade-out",
    computedName: "tienos-theme-fade-out",
    duration: 280,
    computedDuration: "0.28s",
    computedEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
    keyframeOpacity: [1, 0],
  });
  expect(state.next).toMatchObject({
    animationName: "tienos-theme-fade-in",
    computedName: "tienos-theme-fade-in",
    duration: 280,
    computedDuration: "0.28s",
    computedEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
    keyframeOpacity: [0, 1],
  });
  expect(state.old.progress).toBeGreaterThan(0);
  expect(state.old.progress).toBeLessThan(1);
  expect(state.next.progress).toBeGreaterThan(0);
  expect(state.next.progress).toBeLessThan(1);
  expect(state.old.opacity).toBeGreaterThan(0);
  expect(state.old.opacity).toBeLessThan(1);
  expect(state.next.opacity).toBeGreaterThan(0);
  expect(state.next.opacity).toBeLessThan(1);
}

export async function captureNativeThemeTransition(
  page: Page,
  name: string,
  expectedTheme: "light" | "dark",
  changeTheme: () => Promise<unknown>,
  pixelBaseline = false,
) {
  await armThemeAnimationPause(page);
  await changeTheme();
  await expect(page.locator(":root")).toHaveAttribute("data-theme", expectedTheme);

  await waitForThemeAnimations(page);
  const animationState = await pauseThemeAnimationsAtMidpoint(page);
  expectProductionThemeAnimations(animationState);
  const midpoint = await page.evaluate(() => {
    const visibleSurfaces = [
      ".tienos-wallpaper",
      "[data-menu-bar-surface]",
      "[data-dock-surface]",
      ".settings-window",
      ".tienos-menu-popup",
      "[role=listbox]",
    ].filter((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      return element && element.getBoundingClientRect().width > 0;
    });
    return {
      theme: document.documentElement.dataset.theme,
      transactionOpen: document.documentElement.hasAttribute("data-theme-transaction"),
      visibleSurfaces,
    };
  });
  expect(midpoint.theme).toBe(expectedTheme);
  expect(midpoint.transactionOpen).toBe(false);
  expect(midpoint.visibleSurfaces).toEqual(
    expect.arrayContaining([".tienos-wallpaper", "[data-menu-bar-surface]", "[data-dock-surface]"]),
  );
  if (pixelBaseline) {
    await expect(page).toHaveScreenshot(`${name}-midpoint.png`, {
      animations: "allow",
      caret: "hide",
      maxDiffPixelRatio: themeMidpointMaxDiffPixelRatio,
    });
  }

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
  await expect(page.locator('[data-theme-transition-layer="old"]')).toHaveCount(0);
  if (pixelBaseline) {
    await expect(page).toHaveScreenshot(`${name}-final.png`, {
      animations: "allow",
      caret: "hide",
      maxDiffPixelRatio: themeFinalMaxDiffPixelRatio,
    });
  }
}

export async function expectFontAwesomeIconToPaint(icon: Locator, name: string) {
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

export async function expectBootIconToPaint(icon: Locator) {
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

export async function recordDismissalFrames(page: Page) {
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

export async function expectStyledDismissalFrames(
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

export function expectDismissalFrameGeometry(
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

export async function expectCapturedFramesToMatchStableReveal(
  frames: { data: Buffer; timestamp: number }[],
  stableFrame: Buffer,
  theme: "dark" | "light" = "dark",
) {
  const orderedFrames = [...frames].sort((left, right) => left.timestamp - right.timestamp);
  const decoded = await Promise.all(
    [...orderedFrames.map((frame) => frame.data), stableFrame].map(async (frame) => {
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

export async function expectConventionalRoundedGeometry(
  element: Locator,
  { allowFullRectangleClip = false } = {},
) {
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

export async function touchDrag(
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

export async function readCenterPixel(element: Locator) {
  const screenshot = await element.screenshot({ animations: "disabled" });
  const { data, info } = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
  const offset = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
  return Array.from(data.subarray(offset, offset + 3));
}

export async function readHorizontalPixels(element: Locator, distanceFromCenter: number) {
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

export async function readBackgroundsBehind(popup: Locator, foregrounds: Locator[]) {
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

export type Rgba = { red: number; green: number; blue: number; alpha: number };

export function parseColor(value: string): Rgba {
  const channels = value.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3) throw new Error(`Unsupported computed color: ${value}`);
  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
    alpha: channels[3] ?? 1,
  };
}

export function composite(foreground: Rgba, background: Rgba): Rgba {
  return {
    red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
    green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
    blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
    alpha: 1,
  };
}

export function contrastRatio(first: Rgba, second: Rgba) {
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

export function pixelColor([red, green, blue]: number[]): Rgba {
  return { red, green, blue, alpha: 1 };
}

export async function expectColorContrast(
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

export async function expectLocalRenderedContrasts(
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

export async function expectLocalSeparatorTreatment(
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

export async function setResolvedTheme(page: Page, theme: "dark" | "light") {
  await page.evaluate((mode) => localStorage.setItem("tienos-appearance", JSON.stringify(mode)), theme);
  await page.reload();
  await expect(page.getByRole("status", { name: "Starting tienOS" })).toBeHidden({ timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}
