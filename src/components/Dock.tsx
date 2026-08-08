import { FontAwesomeIcon } from "./FontAwesomeIcon";

type DockProps = {
  settingsOpen: boolean;
  onActivateSettings: () => void;
};

/** The single-app tienOS Dock. App activation opens or raises its one window. */
export function Dock({ settingsOpen, onActivateSettings }: DockProps) {
  const statusId = "system-settings-dock-status";

  return (
    <nav
      aria-label="Dock"
      data-dock-surface
      className="dock-surface fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-1/2 z-[45] flex -translate-x-1/2 items-center rounded-[20px] border border-white/30 [background:linear-gradient(145deg,rgb(255_255_255/0.24),rgb(255_255_255/0.08)_42%,rgb(8_15_26/0.25)),var(--tienos-color-dock)] p-[7px] shadow-[0_18px_45px_rgb(0_0_0/0.4),0_3px_10px_rgb(0_0_0/0.24),inset_0_1px_0_rgb(255_255_255/0.48),inset_0_-1px_0_rgb(0_0_0/0.2)] backdrop-blur-[28px] backdrop-saturate-[1.55] contrast-more:border-2 contrast-more:border-[var(--tienos-color-border)] contrast-more:bg-[var(--tienos-color-dock)] [@media(prefers-reduced-transparency:reduce)]:bg-[var(--tienos-color-dock)] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:bg-[Canvas] [@media(forced-colors:active)]:shadow-none [@media(forced-colors:active)]:backdrop-filter-none"
    >
      <button
        type="button"
        aria-label="System Settings"
        aria-describedby={statusId}
        title="System Settings"
        onClick={onActivateSettings}
        className="group relative flex size-[56px] touch-manipulation items-center justify-center rounded-[14px] border border-white/30 bg-[linear-gradient(145deg,#f4f5f7,#aeb4bd)] text-[#30343a] shadow-[0_5px_12px_rgb(0_0_0/0.3),inset_0_1px_1px_white] transition-transform duration-[var(--tienos-motion-fast)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tienos-color-focus)] active:translate-y-0 motion-reduce:transition-none [@media(forced-colors:active)]:border-[ButtonText] [@media(forced-colors:active)]:bg-[ButtonFace] [@media(forced-colors:active)]:text-[ButtonText]"
      >
        <FontAwesomeIcon name="gear" className="size-8 drop-shadow-[0_1px_0_rgb(255_255_255/0.55)]" />
        <span
          data-running-indicator
          aria-hidden="true"
          className={`absolute -bottom-[6px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--tienos-color-dock-indicator)] shadow-[0_0_4px_rgb(255_255_255/0.45)] transition-opacity motion-reduce:transition-none [@media(forced-colors:active)]:bg-[CanvasText] ${settingsOpen ? "opacity-100" : "opacity-0"}`}
        />
      </button>
      <span id={statusId} role="status" className="sr-only">
        System Settings is {settingsOpen ? "running" : "not running"}
      </span>
    </nav>
  );
}
