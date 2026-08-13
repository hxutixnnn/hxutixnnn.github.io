import { desktopApps, type DesktopAppDescriptor } from "../desktop/apps";

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

export const multipleDesktopApps = [
  ...desktopApps,
  { id: "auxiliary", name: "Auxiliary", icon: "sparkle", Window: AuxiliaryWindow },
] as const satisfies readonly DesktopAppDescriptor[];
