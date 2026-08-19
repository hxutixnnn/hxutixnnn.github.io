import { Menu } from "@base-ui/react/menu";
import { Menubar } from "@base-ui/react/menubar";
import { useHotkeys } from "react-hotkeys-hook";
import { useEffect, useState, type RefObject } from "react";
import { FontAwesomeIcon } from "./FontAwesomeIcon";
import type { DesktopCommand } from "../desktop/commands";

type MenuBarProps = {
  activeAppName?: string;
  onAction?: (command: DesktopCommand) => void;
  surfaceRef?: RefObject<HTMLElement | null>;
  onOpenSpotlight?: (trigger: HTMLElement) => void;
};

const triggerClassName =
  "tienos-menu-trigger rounded-full px-2 py-0.5 text-left font-medium transition-colors hover:bg-white/16 focus-visible:bg-white/16 data-[popup-open]:bg-white/16";
const itemClassName =
  "tienos-menu-item group flex min-h-7 w-full cursor-default items-center gap-3 rounded-[var(--tienos-radius-menu-item)] px-2 py-1 text-left text-[var(--tienos-color-menu-text-primary)] transition-[background-color] duration-[var(--tienos-motion-fast)] ease-[ease] hover:not-data-disabled:bg-[var(--tienos-color-accent)] hover:not-data-disabled:text-[var(--tienos-color-text-on-accent)] data-[disabled]:text-[var(--tienos-color-menu-text-disabled)] data-[highlighted]:bg-[var(--tienos-color-accent)] data-[highlighted]:text-[var(--tienos-color-text-on-accent)] data-[highlighted]:outline-none data-[highlighted]:focus-visible:outline-2 data-[highlighted]:focus-visible:-outline-offset-2 data-[highlighted]:focus-visible:outline-[var(--tienos-color-focus-on-accent)] contrast-more:shadow-[inset_0_0_0_1px_var(--tienos-color-border)] contrast-more:focus-visible:outline-2 contrast-more:focus-visible:-outline-offset-2 contrast-more:focus-visible:outline-[var(--tienos-color-focus)] [@media(forced-colors:active)]:[forced-color-adjust:none] [@media(forced-colors:active)]:data-[highlighted]:focus-visible:!outline-[var(--tienos-color-focus-on-accent)]";
const popupClassName =
  "tienos-menu-popup min-w-60 max-w-[calc(100vw-16px)] origin-[var(--transform-origin)] overflow-hidden rounded-[var(--tienos-radius-menu)] border border-white/30 [background:linear-gradient(145deg,var(--tienos-color-menu-highlight),transparent_44%),var(--tienos-color-menu)] p-[var(--tienos-space-1)] shadow-[0_24px_54px_rgb(0_0_0/.34),0_5px_16px_rgb(0_0_0/.12),inset_0_1px_rgb(255_255_255/.32),inset_0_-1px_rgb(0_0_0/.14)] backdrop-blur-[var(--tienos-blur-menu)] backdrop-saturate-[var(--tienos-saturate-menu)] data-[starting-style]:[transform:scale(.96)_translateY(-4px)] data-[starting-style]:opacity-0 data-[ending-style]:[transform:scale(.96)_translateY(-4px)] data-[ending-style]:opacity-0 data-[ending-style]:transition-[opacity,transform] data-[ending-style]:[transition-duration:var(--tienos-motion-fast),var(--tienos-motion-standard)] data-[ending-style]:[transition-timing-function:ease,ease] contrast-more:border-[var(--tienos-color-border)] contrast-more:[background:var(--tienos-color-menu)] [@media(prefers-reduced-transparency:reduce)]:[background:var(--tienos-color-menu)] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none motion-reduce:data-[starting-style]:transform-none motion-reduce:data-[ending-style]:transform-none motion-reduce:data-[ending-style]:transition-none [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:[background:Canvas] [@media(forced-colors:active)]:shadow-none [@media(forced-colors:active)]:backdrop-filter-none";
const separatorClassName =
  "mx-[var(--tienos-menu-separator-inset)] my-0.5 h-px border-0 bg-[var(--tienos-color-menu-separator)] [forced-color-adjust:none] [@media(forced-colors:active)]:border-t [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:bg-transparent";

function Shortcut({ children }: { children: string }) {
  return (
    <kbd className="ml-auto pl-6 text-[11px] text-[var(--tienos-color-menu-text-shortcut)] group-data-[highlighted]:text-[var(--tienos-color-text-on-accent)] group-hover:text-[var(--tienos-color-text-on-accent)]">
      {children}
    </kbd>
  );
}

function MenuPopup({ children }: { children: React.ReactNode }) {
  return (
    <Menu.Portal>
      <Menu.Positioner data-menu-activity sideOffset={6} className="z-50 outline-none">
        <Menu.Popup className={popupClassName}>{children}</Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function MenuBar({
  activeAppName = "Navigator",
  onAction,
  onOpenSpotlight,
  surfaceRef,
}: MenuBarProps) {
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const systemMenuTriggerId = "tienos-system-menu-trigger";

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useHotkeys(
    "mod+shift+o",
    (event) => {
      event.preventDefault();
      setSystemMenuOpen(true);
    },
    { enableOnFormTags: true },
  );

  const announce = (command: DesktopCommand) => {
    setSystemMenuOpen(false);
    onAction?.(command);
  };

  return (
    <header
      ref={surfaceRef}
      data-menu-bar-surface=""
      className="fixed inset-x-0 top-0 z-40 flex items-center px-2 pt-[env(safe-area-inset-top)] sm:px-3"
    >
      <Menubar
        aria-label="tienOS menu bar"
        className="flex h-9 flex-1 items-center gap-0.5 bg-transparent text-[var(--tienos-color-text-on-wallpaper)] [text-shadow:0_1px_3px_rgb(0_0_0/0.4)]"
      >
        <Menu.Root open={systemMenuOpen} onOpenChange={setSystemMenuOpen} triggerId={systemMenuTriggerId}>
          <Menu.Trigger
            id={systemMenuTriggerId}
            aria-label="Open tienOS menu"
            aria-keyshortcuts="Meta+Shift+O"
            className={`${triggerClassName} px-2 text-base leading-none`}
          >
            <FontAwesomeIcon name="sparkle" className="text-[15px]" />
          </Menu.Trigger>
          <MenuPopup>
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "about-this-os" })}>
              <span>About This OS</span>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item
              className={itemClassName}
              onClick={() => announce({ type: "activate-app", appId: "system-settings" })}
            >
              <span>System Settings…</span>
              <Shortcut>⌘,</Shortcut>
            </Menu.Item>
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "app-store" })}>
              <span>App Store</span>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger className={itemClassName}>
                <span>Recent Items</span>
                <FontAwesomeIcon
                  name="chevron-right"
                  className="ml-auto text-[10px] text-[var(--tienos-color-menu-text-secondary)] group-data-[highlighted]:text-[var(--tienos-color-text-on-accent)] group-hover:text-[var(--tienos-color-text-on-accent)]"
                />
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner
                  data-menu-activity
                  side="right"
                  align="start"
                  sideOffset={3}
                  className="z-50 outline-none"
                >
                  <Menu.Popup className={popupClassName}>
                    <Menu.Item className={itemClassName} disabled>
                      No Recent Items
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "force-quit" })}>
              <span>Force Quit</span>
              <Shortcut>⌥⌘⎋</Shortcut>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "sleep" })}>
              <span>Sleep</span>
            </Menu.Item>
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "restart" })}>
              <span>Restart…</span>
            </Menu.Item>
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "shut-down" })}>
              <span>Shut Down…</span>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "lock-screen" })}>
              <span>Lock Screen</span>
              <Shortcut>⌃⌘Q</Shortcut>
            </Menu.Item>
          </MenuPopup>
        </Menu.Root>

        <Menu.Root>
          <Menu.Trigger className={triggerClassName}>{activeAppName}</Menu.Trigger>
          <MenuPopup>
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "about-navigator" })}>
              <span>About {activeAppName}</span>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "navigator-preferences" })}>
              <span>Preferences…</span>
              <Shortcut>⌘,</Shortcut>
            </Menu.Item>
            <Menu.Item className={itemClassName} onClick={() => announce({ type: "hide-navigator" })}>
              <span>Hide {activeAppName}</span>
              <Shortcut>⌘H</Shortcut>
            </Menu.Item>
          </MenuPopup>
        </Menu.Root>
      </Menubar>
      <div className="flex items-center gap-2 px-2 text-[13px] font-medium text-white/75">
        <button
          type="button"
          aria-label="Open Spotlight"
          aria-keyshortcuts="Meta+Space"
          className="grid min-h-7 min-w-7 place-items-center rounded-full hover:bg-white/16 focus-visible:bg-white/16"
          onClick={(event) => onOpenSpotlight?.(event.currentTarget)}
        >
          <FontAwesomeIcon name="magnifying-glass" className="text-[13px]" />
        </button>
        <span role="img" aria-label="Wi-Fi connected">
          <FontAwesomeIcon name="wifi" className="text-[13px]" />
        </span>
        <span role="img" aria-label="Battery full">
          <FontAwesomeIcon name="battery-full" className="text-[13px]" />
        </span>
        <time className="whitespace-nowrap" dateTime={now.toISOString()}>
          {formatDateTime(now)}
        </time>
      </div>
    </header>
  );
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
