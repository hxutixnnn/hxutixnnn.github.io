const duration = 280;
const easing = "cubic-bezier(0.22, 1, 0.36, 1)";

let generation = 0;
let cleanupActive: (() => void) | undefined;

type ViewTransition = {
  finished: Promise<void>;
  skipTransition: () => void;
};

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition;
};

function animationIsSafe() {
  if (document.visibilityState === "hidden") return false;
  return ![
    "(prefers-reduced-motion: reduce)",
    "(prefers-reduced-transparency: reduce)",
    "(prefers-contrast: more)",
    "(forced-colors: active)",
  ].some((query) => window.matchMedia?.(query).matches);
}

function freezeRenderedStyles(source: Element, copy: Element) {
  const sources = [source, ...source.querySelectorAll("*")];
  const copies = [copy, ...copy.querySelectorAll("*")];
  sources.forEach((node, index) => {
    const target = copies[index] as HTMLElement | SVGElement | undefined;
    if (!target) return;
    const computed = getComputedStyle(node);
    const declarations = Array.from(computed).map(
      (property) => `${property}:${computed.getPropertyValue(property)};`,
    );
    target.setAttribute("style", declarations.join(""));
  });
}

function makeFallbackLayer() {
  const layer = document.createElement("div");
  layer.dataset.themeTransitionLayer = "old";
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("inert", "");
  layer.style.cssText =
    "position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147483647;contain:strict;opacity:1";
  const scene = document.body.cloneNode(true) as HTMLElement;
  scene.querySelectorAll("[data-theme-transition-layer]").forEach((node) => node.remove());
  freezeRenderedStyles(document.body, scene);
  layer.append(scene);
  document.body.append(layer);
  return layer;
}

function clearActive() {
  cleanupActive?.();
  cleanupActive = undefined;
}

/** Atomically changes all theme-owned document state behind one document-wide composition. */
export async function transitionResolvedTheme(commit: () => void) {
  const request = ++generation;
  clearActive();

  if (!animationIsSafe() || !document.querySelector('main[aria-label="tienOS desktop"]')) {
    commit();
    return;
  }

  const transitionDocument = document as TransitionDocument;
  if (typeof transitionDocument.startViewTransition === "function") {
    let transition: ViewTransition;
    try {
      transition = transitionDocument.startViewTransition(commit);
    } catch {
      commit();
      return;
    }
    const cleanup = () => transition.skipTransition();
    cleanupActive = cleanup;
    const visibilityCleanup = () => {
      if (document.visibilityState === "hidden") cleanup();
    };
    document.addEventListener("visibilitychange", visibilityCleanup);
    try {
      await transition.finished;
    } catch {
      // Skipped and interrupted transitions reject in some implementations.
    } finally {
      document.removeEventListener("visibilitychange", visibilityCleanup);
      if (request === generation) cleanupActive = undefined;
    }
    return;
  }

  let layer: HTMLElement | undefined;
  let animation: Animation | undefined;
  let committed = false;
  const cleanup = () => {
    animation?.cancel();
    layer?.remove();
    layer = undefined;
  };
  cleanupActive = cleanup;
  try {
    layer = makeFallbackLayer();
    commit();
    committed = true;
    animation = layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing, fill: "forwards" });
    const visibilityCleanup = () => {
      if (document.visibilityState === "hidden") cleanup();
    };
    document.addEventListener("visibilitychange", visibilityCleanup);
    try {
      await animation.finished;
    } finally {
      document.removeEventListener("visibilitychange", visibilityCleanup);
    }
  } catch {
    if (!committed) commit();
  } finally {
    cleanup();
    if (request === generation) cleanupActive = undefined;
  }
}
