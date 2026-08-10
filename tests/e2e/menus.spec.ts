import { expect, test, type Locator } from "@playwright/test";
import {} from "./drivers/contracts";

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
