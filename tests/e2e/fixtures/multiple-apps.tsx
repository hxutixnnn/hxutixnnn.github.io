import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../../src/App";
import { desktopApps, type DesktopAppDescriptor } from "../../../src/desktop/apps";
import "../../../src/styles.css";

const AuxiliaryWindow: DesktopAppDescriptor["Window"] = ({ appId, frontmost, windowState, onEvent }) => (
  <section
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
  ...Array.from({ length: 12 }, (_, index) => ({
    id: `zulu-${String(index + 1).padStart(2, "0")}`,
    name: `Zulu ${String(index + 1).padStart(2, "0")}`,
    icon: "sparkle" as const,
    Window: AuxiliaryWindow,
  })),
] as const satisfies readonly DesktopAppDescriptor[];

const root = document.getElementById("root");
if (!root) throw new Error("Fixture root is missing");

createRoot(root).render(
  <StrictMode>
    <App apps={apps} />
  </StrictMode>,
);
