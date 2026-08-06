import { expect, it, vi } from "vitest";
import { getEmbeddedFrameSource, isSafeEmbeddedTarget, openExternalTarget } from "@/apps/launch";
import type { EmbeddedTarget, ExternalTarget } from "@/apps/contract";

const target: ExternalTarget = {
  kind: "external",
  url: "https://example.com/demo",
  presentation: "new-tab",
  allowedOrigin: "https://example.com",
};

const embedded: EmbeddedTarget = {
  kind: "embedded",
  url: "https://example.com/demo",
  presentation: "embedded",
  allowedOrigin: "https://example.com",
};

it("opens reviewed external targets in a protected new tab", () => {
  const opened = { opener: window } as unknown as Window;
  const openWindow = vi.fn(() => opened);
  expect(openExternalTarget(target, openWindow)).toBe(true);
  expect(openWindow).toHaveBeenCalledWith("https://example.com/demo", "_blank", "noopener,noreferrer");
  expect(opened.opener).toBeNull();
});

it("accepts only exact-origin HTTPS embedded targets without same-origin privileges", () => {
  expect(isSafeEmbeddedTarget(embedded)).toBe(true);
  expect(isSafeEmbeddedTarget({ ...embedded, url: "http://example.com/demo" as EmbeddedTarget["url"] })).toBe(
    false,
  );
  expect(isSafeEmbeddedTarget({ ...embedded, allowedOrigin: "https://other.example.com" })).toBe(false);
});

it("builds frame-src from unique reviewed exact origins", () => {
  expect(
    getEmbeddedFrameSource([
      embedded,
      { ...embedded, url: "https://example.com/other" },
      {
        ...embedded,
        url: "https://second.example/demo",
        allowedOrigin: "https://second.example",
      },
      { ...embedded, url: "https://unreviewed.example/demo" },
    ]),
  ).toBe("https://example.com https://second.example");
  expect(getEmbeddedFrameSource([])).toBe("'none'");
});

it("does not launch a destination outside its allowed origin", () => {
  const openWindow = vi.fn();
  expect(openExternalTarget({ ...target, url: "https://unreviewed.example/demo" }, openWindow)).toBe(false);
  expect(openWindow).not.toHaveBeenCalled();
});
