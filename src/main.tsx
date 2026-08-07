import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("tienOS root element is missing.");
}

const bootScreen = document.getElementById("tienos-boot");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const bootDuration = reducedMotion ? 120 : 420;
const fadeDuration = reducedMotion ? 80 : 160;

function revealDesktop() {
  if (!bootScreen) return;

  const remainingBootTime = Math.max(0, bootDuration - performance.now());
  window.setTimeout(() => {
    bootScreen.setAttribute("data-complete", "");
    window.setTimeout(() => bootScreen.remove(), fadeDuration);
  }, remainingBootTime);
}

createRoot(root).render(
  <StrictMode>
    <App onDesktopReady={revealDesktop} />
  </StrictMode>,
);
