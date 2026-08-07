import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("tienOS root element is missing.");
}

type BootController = {
  started: () => void;
  ready: () => void;
};

const bootController = (window as Window & { tienosBoot?: BootController }).tienosBoot;
bootController?.started();

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

const desktopAssetsReady = Promise.allSettled([loadWallpaper(), loadIconSprite()]).then(() => undefined);

createRoot(root).render(
  <StrictMode>
    <App desktopAssetsReady={desktopAssetsReady} onDesktopReady={bootController?.ready} />
  </StrictMode>,
);
