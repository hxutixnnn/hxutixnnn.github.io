import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("tienOS root element is missing.");
}

type BootController = {
  failed: () => void;
  isFinished: () => boolean;
  released: Promise<void>;
  ready: () => void;
};

const bootController = (window as Window & { tienosBoot?: BootController }).tienosBoot;

async function loadWallpaper() {
  const wallpaper = new Image();
  wallpaper.src = "/wallpapers/tienos-default.jpg";
  await wallpaper.decode();
}

async function loadIconSprite() {
  const response = await fetch("/fontawesome/fontawesome-pro-solid.svg");
  if (!response.ok) throw new Error(`Icon sprite failed to load: ${response.status}`);
  await response.arrayBuffer();
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

const assetReadiness = Promise.all([loadWallpaper(), loadIconSprite()])
  .then(waitForIconPaint)
  .catch(() => bootController?.failed());
const desktopAssetsReady = bootController
  ? Promise.race([assetReadiness, bootController.released])
  : assetReadiness;

createRoot(root).render(
  <StrictMode>
    <App desktopAssetsReady={desktopAssetsReady} onDesktopReady={bootController?.ready} />
  </StrictMode>,
);
