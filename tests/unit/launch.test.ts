import { expect, it, vi } from "vitest";
import { openExternalTarget } from "@/apps/launch";
import type { ExternalTarget } from "@/apps/contract";

const target: ExternalTarget = {
  kind: "external",
  url: "https://example.com/demo",
  presentation: "new-tab",
  allowedOrigin: "https://example.com",
};

it("opens reviewed external targets in a protected new tab", () => {
  const opened = { opener: window } as unknown as Window;
  const openWindow = vi.fn(() => opened);
  expect(openExternalTarget(target, openWindow)).toBe(true);
  expect(openWindow).toHaveBeenCalledWith("https://example.com/demo", "_blank", "noopener,noreferrer");
  expect(opened.opener).toBeNull();
});

it("does not launch a destination outside its allowed origin", () => {
  const openWindow = vi.fn();
  expect(openExternalTarget({ ...target, url: "https://unreviewed.example/demo" }, openWindow)).toBe(false);
  expect(openWindow).not.toHaveBeenCalled();
});
