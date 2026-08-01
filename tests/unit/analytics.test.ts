import { afterEach, expect, it, vi } from "vitest";

type AnalyticsWindow = Window & { dataLayer?: unknown[][]; gtag?: (...args: unknown[]) => void };

const scriptSelector = 'script[src^="https://www.googletagmanager.com/gtag/js"]';

afterEach(() => {
  document.querySelector(scriptSelector)?.remove();
  delete document.body.dataset.analyticsId;
  delete (window as AnalyticsWindow).dataLayer;
  delete (window as AnalyticsWindow).gtag;
  vi.resetModules();
});

it("defers configured analytics until a valid app lifecycle event", async () => {
  document.body.dataset.analyticsId = "G-TEST123";

  await import("@/scripts/analytics");

  expect(document.querySelector(scriptSelector)).not.toBeInTheDocument();

  window.dispatchEvent(new CustomEvent("tien:analytics", { detail: { event: "app_open", appId: "about" } }));

  expect(document.querySelector(scriptSelector)).toHaveAttribute(
    "src",
    "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
  );
  expect((window as AnalyticsWindow).dataLayer).toHaveLength(3);
});
