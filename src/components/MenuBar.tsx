import { Menu } from "@base-ui/react/menu";
import { Menubar } from "@base-ui/react/menubar";
import { useHotkeys } from "react-hotkeys-hook";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "./FontAwesomeIcon";

type MenuBarProps = {
  onAction?: (label: string) => void;
};

const triggerClassName =
  "tienos-menu-trigger rounded-full px-2 py-0.5 text-left font-medium transition-colors hover:bg-white/16 focus-visible:bg-white/16 data-[popup-open]:bg-white/16";
const itemClassName =
  "tienos-menu-item group flex min-h-7 w-full cursor-default items-center gap-3 rounded-[var(--tienos-radius-menu-item)] px-2 py-1 text-left text-[var(--tienos-color-text-primary)] transition-[background-color] duration-[var(--tienos-motion-fast)] ease-[ease] hover:not-data-disabled:bg-[var(--tienos-color-accent)] hover:not-data-disabled:text-[var(--tienos-color-text-on-accent)] data-[disabled]:text-[var(--tienos-color-text-tertiary)] data-[highlighted]:bg-[var(--tienos-color-accent)] data-[highlighted]:text-[var(--tienos-color-text-on-accent)] data-[highlighted]:outline-none data-[highlighted]:focus-visible:outline-2 data-[highlighted]:focus-visible:-outline-offset-2 data-[highlighted]:focus-visible:outline-[var(--tienos-color-focus-on-accent)] contrast-more:shadow-[inset_0_0_0_1px_var(--tienos-color-border)] contrast-more:focus-visible:outline-2 contrast-more:focus-visible:-outline-offset-2 contrast-more:focus-visible:outline-[var(--tienos-color-focus)] [@media(forced-colors:active)]:data-[highlighted]:focus-visible:!outline-[var(--tienos-color-focus-on-accent)]";
const popupClassName =
  "tienos-menu-popup min-w-60 origin-[var(--transform-origin)] overflow-hidden rounded-[var(--tienos-radius-menu)] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-menu)] p-[var(--tienos-space-1)] shadow-[0_22px_50px_rgb(0_0_0/0.3),inset_0_1px_rgb(255_255_255/0.12)] backdrop-blur-[24px] backdrop-saturate-[1.3] data-[starting-style]:[transform:scale(.96)_translateY(-4px)] data-[starting-style]:opacity-0 data-[ending-style]:[transform:scale(.96)_translateY(-4px)] data-[ending-style]:opacity-0 data-[ending-style]:transition-[opacity,transform] data-[ending-style]:[transition-duration:var(--tienos-motion-fast),var(--tienos-motion-standard)] data-[ending-style]:[transition-timing-function:ease,ease] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none";
const separatorClassName = "my-0.5 h-px border-0 bg-[var(--tienos-color-separator)]";

function Shortcut({ children }: { children: string }) {
  return (
    <kbd className="ml-auto pl-6 text-[11px] text-[var(--tienos-color-text-tertiary)] group-data-[highlighted]:text-[var(--tienos-color-text-on-accent)] group-hover:text-[var(--tienos-color-text-on-accent)]">
      {children}
    </kbd>
  );
}

function MenuPopup({ children }: { children: React.ReactNode }) {
  return (
    <Menu.Portal>
      <Menu.Positioner sideOffset={6} className="z-50 outline-none">
        <Menu.Popup className={popupClassName}>{children}</Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function MenuBar({ onAction }: MenuBarProps) {
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

  const announce = (label: string) => {
    setSystemMenuOpen(false);
    onAction?.(label);
  };

  return (
    <header
      data-menu-bar-surface=""
      className="fixed top-[max(6px,env(safe-area-inset-top))] right-[6px] left-[6px] z-40 flex h-[40px] items-center overflow-hidden rounded-[14px] border border-white/20 bg-[linear-gradient(135deg,rgb(255_255_255/0.16),rgb(255_255_255/0.07)_48%,rgb(7_18_29/0.14))] px-2 text-[var(--tienos-color-text-on-wallpaper)] shadow-[inset_0_1px_0_rgb(255_255_255/0.32),inset_0_-1px_0_rgb(0_0_0/0.12),0_8px_24px_rgb(2_8_23/0.16),0_2px_6px_rgb(2_8_23/0.1)] backdrop-blur-[14px] backdrop-saturate-[1.45] before:pointer-events-none before:absolute before:inset-px before:rounded-[12px] before:bg-[linear-gradient(180deg,rgb(255_255_255/0.13),transparent_45%)] before:content-[''] after:pointer-events-none after:absolute after:right-3 after:bottom-0 after:left-3 after:h-px after:bg-white/10 after:content-[''] sm:top-[max(10px,env(safe-area-inset-top))] sm:right-[12px] sm:left-[12px] sm:rounded-[18px] sm:px-3 sm:before:rounded-[16px] contrast-more:border-[var(--tienos-color-border)] contrast-more:bg-[var(--tienos-color-menu)] [@media(prefers-reduced-transparency:reduce)]:bg-[var(--tienos-color-menu)] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:bg-[Canvas] [@media(forced-colors:active)]:shadow-none [@media(forced-colors:active)]:backdrop-filter-none"
    >
      <Menubar
        aria-label="tienOS menu bar"
        className="relative z-10 flex h-9 flex-1 items-center gap-0.5 bg-transparent [text-shadow:0_1px_3px_rgb(0_0_0/0.32)] [@media(forced-colors:active)]:[text-shadow:none]"
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
            <Menu.Item className={itemClassName} onClick={() => announce("About This OS")}>
              <span>About This OS</span>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item className={itemClassName} onClick={() => announce("System Settings…")}>
              <span>System Settings…</span>
              <Shortcut>⌘,</Shortcut>
            </Menu.Item>
            <Menu.Item className={itemClassName} onClick={() => announce("App Store")}>
              <span>App Store</span>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger className={itemClassName}>
                <span>Recent Items</span>
                <FontAwesomeIcon
                  name="chevron-right"
                  className="ml-auto text-[10px] text-[var(--tienos-color-text-secondary)] group-data-[highlighted]:text-[var(--tienos-color-text-on-accent)] group-hover:text-[var(--tienos-color-text-on-accent)]"
                />
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner side="right" align="start" sideOffset={3} className="z-50 outline-none">
                  <Menu.Popup className={popupClassName}>
                    <Menu.Item className={itemClassName} disabled>
                      No Recent Items
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item className={itemClassName} onClick={() => announce("Force Quit")}>
              <span>Force Quit</span>
              <Shortcut>⌥⌘⎋</Shortcut>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item className={itemClassName} onClick={() => announce("Sleep")}>
              <span>Sleep</span>
            </Menu.Item>
            <Menu.Item className={itemClassName} onClick={() => announce("Restart…")}>
              <span>Restart…</span>
            </Menu.Item>
            <Menu.Item className={itemClassName} onClick={() => announce("Shut Down…")}>
              <span>Shut Down…</span>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item className={itemClassName} onClick={() => announce("Lock Screen")}>
              <span>Lock Screen</span>
              <Shortcut>⌃⌘Q</Shortcut>
            </Menu.Item>
          </MenuPopup>
        </Menu.Root>

        <Menu.Root>
          <Menu.Trigger className={triggerClassName}>Navigator</Menu.Trigger>
          <MenuPopup>
            <Menu.Item className={itemClassName} onClick={() => announce("About Navigator")}>
              <span>About Navigator</span>
            </Menu.Item>
            <Menu.Separator className={separatorClassName} />
            <Menu.Item className={itemClassName} onClick={() => announce("Preferences…")}>
              <span>Preferences…</span>
              <Shortcut>⌘,</Shortcut>
            </Menu.Item>
            <Menu.Item className={itemClassName} onClick={() => announce("Hide Navigator")}>
              <span>Hide Navigator</span>
              <Shortcut>⌘H</Shortcut>
            </Menu.Item>
          </MenuPopup>
        </Menu.Root>
      </Menubar>
      <div className="relative z-10 flex items-center gap-2 px-2 text-[13px] font-medium text-[color-mix(in_srgb,var(--tienos-color-text-on-wallpaper)_82%,transparent)]">
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
