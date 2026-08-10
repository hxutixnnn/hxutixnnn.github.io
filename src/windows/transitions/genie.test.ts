import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGenieTransitionDriver, type GenieSettlement } from "./genie";

let frames: FrameRequestCallback[];
let frameId = 0;

function flushFrame(time = 0) {
  const callbacks = frames.splice(0);
  callbacks.forEach((callback) => callback(time));
}

function fixture(reducedMotion = false) {
  const parent = document.createElement("div");
  const element = document.createElement("section");
  parent.append(element);
  document.body.append(parent);
  vi.spyOn(parent, "getBoundingClientRect").mockReturnValue({
    x: 10,
    y: 20,
    width: 400,
    height: 300,
    top: 20,
    right: 410,
    bottom: 320,
    left: 10,
    toJSON: () => undefined,
  });
  Object.defineProperty(element, "getAnimations", { value: () => [] });
  const settled: GenieSettlement[] = [];
  const target = { x: 100, y: 500, width: 50, height: 40 };
  const driver = createGenieTransitionDriver({
    element: () => element,
    targetRect: () => target,
    reducedMotion: () => reducedMotion,
    onSettled: (result) => settled.push(result),
  });
  return { driver, element, settled, target };
}

beforeEach(() => {
  frames = [];
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return ++frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("genie transition driver", () => {
  it("starts and retargets from the live destination rect", () => {
    const { driver, element, target } = fixture();
    driver.start(1, "minimized");
    expect(element.style.getPropertyValue("--genie-y")).toBe("350px");
    target.y = 420;
    driver.retarget();
    expect(element.style.getPropertyValue("--genie-y")).toBe("270px");
  });

  it("reverses a same-tick physical run without reporting its stale destination", () => {
    const { driver, settled } = fixture(true);
    driver.start(1, "minimized");
    driver.reverse(2, "visible");
    flushFrame();
    expect(settled).toEqual([{ generation: 2, destination: "visible" }]);
  });

  it("continues a midpoint reversal and rejects stale settlement", () => {
    const { driver, settled } = fixture();
    driver.start(4, "minimized");
    flushFrame();
    driver.reverse(5, "visible");
    driver.settle(4, "minimized");
    expect(settled).toEqual([]);
    driver.settle(5, "visible");
    expect(settled).toEqual([{ generation: 5, destination: "visible" }]);
  });

  it("cancels pending work and cleanup rejects completion", () => {
    const { driver, settled } = fixture(true);
    driver.start(1, "minimized", { defer: true });
    driver.cancel(2);
    flushFrame();
    expect(settled).toEqual([]);
    driver.dispose();
    driver.settle(1, "minimized");
    expect(settled).toEqual([]);
  });

  it("settles reduced motion deterministically on the next frame", () => {
    const { driver, settled } = fixture(true);
    driver.start(8, "minimized");
    expect(settled).toEqual([]);
    flushFrame();
    expect(settled).toEqual([{ generation: 8, destination: "minimized" }]);
  });
});
