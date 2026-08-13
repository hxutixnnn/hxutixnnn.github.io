import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { useAppearanceStore, wallpaperByTheme, type ResolvedTheme } from "./stores/appearance";

const root = document.getElementById("root");

if (!root) {
  throw new Error("tienOS root element is missing.");
}
const applicationRoot = root;

type BootController = {
  failed: () => void;
  isFinished: () => boolean;
  released: Promise<void>;
  ready: () => void;
};

const bootController = (window as Window & { tienosBoot?: BootController }).tienosBoot;

async function loadWallpaper() {
  const resolvedTheme: ResolvedTheme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  const wallpaper = new Image();
  wallpaper.src = wallpaperByTheme[resolvedTheme];
  await wallpaper.decode();
}

async function loadIconSprite() {
  const response = await fetch("/fontawesome/fontawesome-pro-solid.svg");
  if (!response.ok) throw new Error(`Icon sprite failed to load: ${response.status}`);
  await response.arrayBuffer();
}

function waitForApplicationStyles() {
  return new Promise<void>((resolve) => {
    const check = () => {
      if (
        getComputedStyle(document.documentElement).getPropertyValue("--tienos-app-styles-ready").trim() ===
        "1"
      ) {
        resolve();
        return;
      }
      if (!bootController?.isFinished()) window.requestAnimationFrame(check);
    };
    check();
  });
}

function waitForIconPaint() {
  return new Promise<void>((resolve) => {
    const checkGeometry = () => {
      if (bootController?.isFinished()) {
        resolve();
        return;
      }

      const use = document.querySelector<SVGGraphicsElement>('[data-fa-icon="sparkle"] use');
      if (use && typeof use.getBBox === "function") {
        try {
          const bounds = use.getBBox();
          if (bounds.width > 0 && bounds.height > 0) {
            resolve();
            return;
          }
        } catch {
          // Geometry can be unavailable until the external sprite finishes painting.
        }
      }
      window.requestAnimationFrame(checkGeometry);
    };
    checkGeometry();
  });
}

const applicationStylesReady = waitForApplicationStyles();
const assetReadiness = Promise.all([applicationStylesReady, loadWallpaper(), loadIconSprite()])
  .then(waitForIconPaint)
  .catch(() => bootController?.failed());
const desktopAssetsReady = bootController
  ? Promise.race([assetReadiness, bootController.released])
  : assetReadiness;
const desktopReady = (bootController?.released ?? assetReadiness).then(() =>
  useAppearanceStore.getState().markDesktopReady(),
);

void desktopReady;

async function mountApplication() {
  const stylesReady = bootController
    ? await Promise.race([applicationStylesReady.then(() => true), bootController.released.then(() => false)])
    : await applicationStylesReady.then(() => true);

  if (!stylesReady || bootController?.isFinished()) return;

  createRoot(applicationRoot).render(
    <StrictMode>
      <App desktopAssetsReady={desktopAssetsReady} onDesktopReady={bootController?.ready} />
    </StrictMode>,
  );
}

void mountApplication();
