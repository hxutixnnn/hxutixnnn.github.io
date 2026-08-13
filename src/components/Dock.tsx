import type { RefObject } from "react";
import type { DesktopAppDescriptor } from "../desktop/apps";
import type { SingleWindowState } from "../windows/singleWindowMachine";
import { FontAwesomeIcon } from "./FontAwesomeIcon";

type DockProps = {
  apps: readonly DesktopAppDescriptor[];
  windowStates: Readonly<Record<string, Pick<SingleWindowState, "presence" | "visibility">>>;
  onActivate: (app: DesktopAppDescriptor) => void;
  surfaceRef?: RefObject<HTMLElement | null>;
  primaryTargetRef?: RefObject<HTMLButtonElement | null>;
};

/** Projects registered apps into launch controls; window policy remains shell-owned. */
export function Dock({ apps, windowStates, onActivate, surfaceRef, primaryTargetRef }: DockProps) {
  return (
    <nav
      ref={surfaceRef}
      aria-label="Dock"
      data-dock-surface
      className="dock-surface fixed bottom-[max(10px,var(--tienos-safe-area-bottom))] left-1/2 z-[45] flex -translate-x-1/2 items-center rounded-[20px] border border-white/30 [background:linear-gradient(145deg,rgb(255_255_255/0.24),rgb(255_255_255/0.08)_42%,rgb(8_15_26/0.25)),var(--tienos-color-dock)] p-[7px] shadow-[0_18px_45px_rgb(0_0_0/0.4),0_3px_10px_rgb(0_0_0/0.24),inset_0_1px_0_rgb(255_255_255/0.48),inset_0_-1px_0_rgb(0_0_0/0.2)] backdrop-blur-[28px] backdrop-saturate-[1.55] contrast-more:border-2 contrast-more:border-[var(--tienos-color-border)] contrast-more:bg-[var(--tienos-color-dock)] [@media(prefers-reduced-transparency:reduce)]:bg-[var(--tienos-color-dock)] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:bg-[Canvas] [@media(forced-colors:active)]:shadow-none [@media(forced-colors:active)]:backdrop-filter-none"
    >
      {apps.map((app, index) => {
        const windowState = windowStates[app.id];
        const isOpen = windowState.presence === "open";
        const isMinimized = windowState.visibility === "minimized";
        const statusId = `${app.id}-dock-status`;
        return (
          <div key={app.id}>
            <button
              ref={index === 0 ? primaryTargetRef : undefined}
              type="button"
              data-dock-app={app.id}
              data-dock-settings={app.id === "system-settings" ? "" : undefined}
              aria-label={app.name}
              aria-describedby={statusId}
              title={app.name}
              onClick={() => onActivate(app)}
              className="group relative flex size-[56px] touch-manipulation items-center justify-center rounded-[14px] border border-white/30 bg-[linear-gradient(145deg,#f4f5f7,#aeb4bd)] text-[#30343a] shadow-[0_5px_12px_rgb(0_0_0/0.3),inset_0_1px_1px_white] transition-transform duration-[var(--tienos-motion-fast)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tienos-color-focus)] active:translate-y-0 motion-reduce:transition-none [@media(forced-colors:active)]:border-[ButtonText] [@media(forced-colors:active)]:bg-[ButtonFace] [@media(forced-colors:active)]:text-[ButtonText]"
            >
              <FontAwesomeIcon
                name={app.icon}
                className="size-8 drop-shadow-[0_1px_0_rgb(255_255_255/0.55)]"
              />
              <span
                data-running-indicator
                aria-hidden="true"
                className={`absolute -bottom-[6px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--tienos-color-dock-indicator)] shadow-[0_0_4px_rgb(255_255_255/0.45)] transition-opacity motion-reduce:transition-none [@media(forced-colors:active)]:bg-[CanvasText] ${isOpen ? "opacity-100" : "opacity-0"}`}
              />
            </button>
            <span id={statusId} role="status" className="sr-only">
              {app.name} is {isOpen ? (isMinimized ? "running and minimized" : "running") : "not running"}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
