import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../../src/App";
import { desktopApps, type DesktopAppDescriptor } from "../../../src/desktop/apps";
import "../../../src/styles.css";

const AuxiliaryWindow: DesktopAppDescriptor["Window"] = ({
  appId,
  frontmost,
  windowState,
  onEvent,
}) => (
  <section
    role="region"
    aria-label="Auxiliary"
    data-desktop-activity={appId}
    data-window-active={windowState.active}
    data-window-frontmost={frontmost}
    data-window-visibility={windowState.visibility}
  >
    <h2>Auxiliary</h2>
    <button type="button" onClick={() => onEvent({ type: "CLOSE" })}>
      Close Auxiliary
    </button>
  </section>
);

const apps = [
  ...desktopApps,
  { id: "auxiliary", name: "Auxiliary", icon: "sparkle", Window: AuxiliaryWindow },
] as const satisfies readonly DesktopAppDescriptor[];

const root = document.getElementById("root");
if (!root) throw new Error("Fixture root is missing");

createRoot(root).render(
  <StrictMode>
    <App apps={apps} />
  </StrictMode>,
);
