import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("tienOS root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const bootScreen = document.getElementById("tienos-boot");

if (bootScreen) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bootDuration = reducedMotion ? 180 : 1050;
  const fadeDuration = reducedMotion ? 80 : 240;

  window.setTimeout(() => {
    bootScreen.setAttribute("data-complete", "");
    window.setTimeout(() => bootScreen.remove(), fadeDuration);
  }, bootDuration);
}
