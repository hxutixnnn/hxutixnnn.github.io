import type { Rect } from "../geometry";
import type { WindowTransitionDestination } from "../singleWindowMachine";

export type GenieSettlement = Readonly<{
  generation: number;
  destination: WindowTransitionDestination;
}>;

export type GenieTransitionDriver = {
  start(generation: number, destination: WindowTransitionDestination, options?: { defer?: boolean }): void;
  reverse(generation: number, destination: WindowTransitionDestination): void;
  retarget(): void;
  settle(generation: number, destination: WindowTransitionDestination): void;
  cancel(generation?: number): void;
  dispose(): void;
};

export type GenieDriverOptions = Readonly<{
  element: () => HTMLElement | null;
  targetRect: () => Rect | null;
  onSettled: (settlement: GenieSettlement) => void;
  reducedMotion?: () => boolean;
}>;

/** Executes the existing CSS/WAAPI genie effect without owning lifecycle destination truth. */
export function createGenieTransitionDriver(options: GenieDriverOptions): GenieTransitionDriver {
  let runId = 0;
  let generation = -1;
  let deferredFrame: number | null = null;
  let trackingFrame: number | null = null;
  let paintedFrame: number | null = null;
  let fallbackTimer: number | null = null;
  let started = false;
  let disposed = false;

  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const clearFrames = () => {
    if (deferredFrame !== null) cancelAnimationFrame(deferredFrame);
    if (trackingFrame !== null) cancelAnimationFrame(trackingFrame);
    if (paintedFrame !== null) cancelAnimationFrame(paintedFrame);
    deferredFrame = trackingFrame = paintedFrame = null;
    if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    fallbackTimer = null;
  };

  const retarget = () => {
    const element = options.element();
    const sourceElement = element?.parentElement;
    const target = options.targetRect();
    if (!element || !sourceElement || !target) return;
    const source = sourceElement.getBoundingClientRect();
    element.style.setProperty(
      "--genie-x",
      `${target.x + target.width / 2 - (source.x + source.width / 2)}px`,
    );
    element.style.setProperty(
      "--genie-y",
      `${target.y + target.height / 2 - (source.y + source.height / 2)}px`,
    );
    element.style.setProperty("--genie-scale-x", `${Math.max(0.06, target.width / source.width)}`);
    element.style.setProperty("--genie-scale-y", `${Math.max(0.06, target.height / source.height)}`);
  };

  const report = (run: number, settledGeneration: number, destination: WindowTransitionDestination) => {
    if (disposed || run !== runId || settledGeneration !== generation) return;
    if (trackingFrame !== null) cancelAnimationFrame(trackingFrame);
    trackingFrame = null;
    if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    fallbackTimer = null;
    options.onSettled({ generation: settledGeneration, destination });
  };

  const waitForSettlement = async (
    run: number,
    settledGeneration: number,
    destination: WindowTransitionDestination,
    settledFrameTarget: number,
  ) => {
    await nextFrame();
    let settledFrames = 0;
    while (!disposed && run === runId) {
      const element = options.element();
      if (!element) return;
      const active = element.getAnimations().filter((animation) => animation.playState === "running");
      if (active.length) {
        settledFrames = 0;
        await Promise.allSettled(active.map((animation) => animation.finished));
        continue;
      }
      if (++settledFrames === settledFrameTarget) {
        report(run, settledGeneration, destination);
        return;
      }
      await nextFrame();
    }
  };

  const begin = (
    nextGeneration: number,
    destination: WindowTransitionDestination,
    reverse: boolean,
    defer: boolean,
  ) => {
    const previousGeneration = generation;
    const previousStarted = started;
    generation = nextGeneration;
    const run = ++runId;
    clearFrames();
    retarget();

    const physicallyStart = () => {
      started = true;
      paintedFrame = requestAnimationFrame(() => undefined);
      const reverseHasPhysicalSource =
        reverse && previousGeneration === nextGeneration - 1 && previousStarted;
      const reduce = options.reducedMotion?.() ?? false;
      if (reduce || (reverse && !reverseHasPhysicalSource)) {
        requestAnimationFrame(() => report(run, nextGeneration, destination));
      } else {
        void waitForSettlement(run, nextGeneration, destination, reverse ? 3 : 2);
        if (destination === "visible") {
          fallbackTimer = window.setTimeout(() => report(run, nextGeneration, destination), 600);
        }
      }
      const track = () => {
        if (run !== runId || disposed) return;
        retarget();
        trackingFrame = requestAnimationFrame(track);
      };
      trackingFrame = requestAnimationFrame(track);
    };

    if (defer) deferredFrame = requestAnimationFrame(physicallyStart);
    else physicallyStart();
  };

  return {
    start(nextGeneration, destination, options = {}) {
      begin(nextGeneration, destination, false, options.defer ?? false);
    },
    reverse(nextGeneration, destination) {
      begin(nextGeneration, destination, true, false);
    },
    retarget,
    settle(settledGeneration, destination) {
      report(runId, settledGeneration, destination);
    },
    cancel(cancelGeneration) {
      if (cancelGeneration !== undefined && cancelGeneration < generation) return;
      ++runId;
      clearFrames();
      // Keep physical-source identity so an immediately following reverse can continue
      // from the current CSS progress rather than snapping to its destination.
    },
    dispose() {
      disposed = true;
      ++runId;
      clearFrames();
    },
  };
}
