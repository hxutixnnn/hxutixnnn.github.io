import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelResolvedThemeTransition, transitionResolvedTheme } from "./theme-transition";

const nativeAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("resolved theme transitions", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main aria-label="tienOS desktop"></main>';
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
  });

  afterEach(() => {
    cancelResolvedThemeTransition();
    Reflect.deleteProperty(document, "startViewTransition");
    delete document.documentElement.dataset.themeTransaction;
    if (nativeAnimate) Object.defineProperty(HTMLElement.prototype, "animate", nativeAnimate);
    else Reflect.deleteProperty(HTMLElement.prototype, "animate");
    vi.restoreAllMocks();
  });

  it("rejects a stale native update at the browser-controlled commit boundary", async () => {
    const ready = deferred();
    const finished = deferred();
    let update!: () => void;
    const skipTransition = vi.fn(finished.resolve);
    Object.assign(document, {
      startViewTransition: (callback: () => void) => {
        update = callback;
        return { ready: ready.promise, finished: finished.promise, skipTransition };
      },
    });
    const commit = vi.fn();

    const pending = transitionResolvedTheme(commit);
    cancelResolvedThemeTransition();
    update();
    ready.resolve();
    await pending;

    expect(skipTransition).toHaveBeenCalledOnce();
    expect(commit).not.toHaveBeenCalled();
  });

  it("suppresses descendant transitions through native snapshot capture", async () => {
    const ready = deferred();
    const finished = deferred();
    let update!: () => void;
    Object.assign(document, {
      startViewTransition: (callback: () => void) => {
        update = callback;
        return { ready: ready.promise, finished: finished.promise, skipTransition: vi.fn() };
      },
    });
    const transactionStates: boolean[] = [];
    const pending = transitionResolvedTheme(() => {
      transactionStates.push("themeTransaction" in document.documentElement.dataset);
    });

    update();
    expect(document.documentElement).toHaveAttribute("data-theme-transaction");
    ready.resolve();
    await ready.promise;
    await Promise.resolve();
    expect(document.documentElement).not.toHaveAttribute("data-theme-transaction");
    finished.resolve();
    await pending;

    expect(transactionStates).toEqual([true]);
  });

  it("preserves property-backed state in the inert fallback snapshot", async () => {
    document.body.innerHTML = `
      <main aria-label="tienOS desktop">
        <div id="viewport" style="animation: drift 2s infinite; transition: opacity 2s"><input><textarea></textarea><select><option>A</option><option>B</option></select></div>
      </main>`;
    const viewport = document.querySelector<HTMLElement>("#viewport")!;
    const input = document.querySelector<HTMLInputElement>("input")!;
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    const select = document.querySelector<HTMLSelectElement>("select")!;
    viewport.scrollTop = 84;
    viewport.scrollLeft = 12;
    input.value = "draft";
    input.checked = true;
    input.indeterminate = true;
    textarea.value = "notes";
    select.selectedIndex = 1;
    const finished = deferred();
    const cancel = vi.fn(finished.resolve);
    const animate = vi.fn(() => ({ finished: finished.promise, cancel }));
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });

    const pending = transitionResolvedTheme(vi.fn());
    const layer = document.querySelector<HTMLElement>('[data-theme-transition-layer="old"]')!;
    const snapshotViewport = layer.querySelector<HTMLElement>("#viewport")!;
    const snapshotInput = layer.querySelector<HTMLInputElement>("input")!;

    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer).toHaveAttribute("inert");
    expect(snapshotViewport).toMatchObject({ scrollTop: 84, scrollLeft: 12 });
    expect(snapshotViewport.style.getPropertyValue("animation")).toBe("none");
    expect(snapshotViewport.style.getPropertyPriority("animation")).toBe("important");
    expect(snapshotViewport.style.getPropertyValue("animation-name")).toBe("none");
    expect(snapshotViewport.style.getPropertyValue("transition")).toBe("none");
    expect(snapshotInput).toMatchObject({ value: "draft", checked: true, indeterminate: true });
    expect(layer.querySelector<HTMLTextAreaElement>("textarea")).toHaveValue("notes");
    expect(layer.querySelector<HTMLSelectElement>("select")).toHaveValue("B");

    finished.resolve();
    await pending;
    expect(layer).not.toBeInTheDocument();
  });
});
