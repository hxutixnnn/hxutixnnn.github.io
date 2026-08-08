const duration = 280;
const easing = "cubic-bezier(0.22, 1, 0.36, 1)";

let generation = 0;
let cleanupActive: (() => void) | undefined;

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
};

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransition;
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
    target.style.setProperty("animation", "none", "important");
    target.style.setProperty("animation-name", "none", "important");
    target.style.setProperty("transition", "none", "important");
  });
}

function copyRenderedState(source: Element, copy: Element) {
  const sources = [source, ...source.querySelectorAll("*")];
  const copies = [copy, ...copy.querySelectorAll("*")];
  sources.forEach((node, index) => {
    const target = copies[index];
    if (!target) return;
    target.scrollLeft = node.scrollLeft;
    target.scrollTop = node.scrollTop;
    if (node instanceof HTMLInputElement && target instanceof HTMLInputElement) {
      target.checked = node.checked;
      target.indeterminate = node.indeterminate;
      target.value = node.value;
    } else if (node instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) {
      target.value = node.value;
    } else if (node instanceof HTMLSelectElement && target instanceof HTMLSelectElement) {
      target.selectedIndex = node.selectedIndex;
    }
  });
}

function suppressDescendantTransitions() {
  document.documentElement.dataset.themeTransaction = "";
  return () => delete document.documentElement.dataset.themeTransaction;
}

function commitWithoutDescendantTransitions(commit: () => void) {
  const restore = suppressDescendantTransitions();
  try {
    commit();
    void document.documentElement.offsetWidth;
  } finally {
    restore();
  }
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
  copyRenderedState(document.body, scene);
  return layer;
}

function clearActive() {
  cleanupActive?.();
  cleanupActive = undefined;
}

export function cancelResolvedThemeTransition() {
  generation += 1;
  clearActive();
}

/** Atomically changes all theme-owned document state behind one document-wide composition. */
export async function transitionResolvedTheme(commit: () => void, isCurrent = () => true) {
  const request = ++generation;
  clearActive();

  const canCommit = () => request === generation && isCurrent();
  const commitIfCurrent = () => {
    if (!canCommit()) return false;
    commit();
    return true;
  };

  if (!animationIsSafe() || !document.querySelector('main[aria-label="tienOS desktop"]')) {
    if (canCommit()) commitWithoutDescendantTransitions(commit);
    return;
  }

  const transitionDocument = document as TransitionDocument;
  if (typeof transitionDocument.startViewTransition === "function") {
    let transition: ViewTransition;
    let restoreTransitions: (() => void) | undefined;
    try {
      transition = transitionDocument.startViewTransition(() => {
        if (!canCommit()) return;
        restoreTransitions = suppressDescendantTransitions();
        try {
          commit();
          void document.documentElement.offsetWidth;
        } catch (error) {
          restoreTransitions();
          restoreTransitions = undefined;
          throw error;
        }
      });
    } catch {
      if (canCommit()) commitWithoutDescendantTransitions(commit);
      return;
    }
    const restore = () => {
      restoreTransitions?.();
      restoreTransitions = undefined;
    };
    void transition.ready.then(restore, restore);
    const cleanup = () => {
      restore();
      transition.skipTransition();
    };
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
    if (!canCommit()) return;
    commitWithoutDescendantTransitions(() => {
      committed = commitIfCurrent();
    });
    if (!committed) return;
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
    if (!committed && canCommit()) commitWithoutDescendantTransitions(commit);
  } finally {
    cleanup();
    if (request === generation) cleanupActive = undefined;
  }
}
