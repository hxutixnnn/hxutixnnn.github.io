import { Menu } from "@base-ui/react/menu";
import { Menubar } from "@base-ui/react/menubar";
import { useHotkeys } from "react-hotkeys-hook";
import { useEffect, useState } from "react";

type MenuBarProps = {
  onAction?: (label: string) => void;
};

const triggerClassName =
  "tienos-menu-trigger rounded-full px-2 py-0.5 text-left font-medium text-white/90 transition-colors";
const itemClassName =
  "tienos-menu-item flex min-h-7 w-full items-center gap-3 px-2 py-1 text-left text-white/90";
const popupClassName = "tienos-menu-popup min-w-60";
const separatorClassName = "tienos-menu-separator my-0.5";

function Shortcut({ children }: { children: string }) {
  return <kbd className="ml-auto pl-6 text-[11px] text-white/45">{children}</kbd>;
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
    <header className="fixed inset-x-0 top-0 z-40 flex items-center px-2 pt-[env(safe-area-inset-top)] sm:px-3">
      <Menubar aria-label="tienOS menu bar" className="tienos-menubar flex h-9 flex-1 items-center gap-0.5">
        <Menu.Root open={systemMenuOpen} onOpenChange={setSystemMenuOpen} triggerId={systemMenuTriggerId}>
          <Menu.Trigger
            id={systemMenuTriggerId}
            aria-label="Open tienOS menu"
            aria-keyshortcuts="Meta+Shift+O"
            className={`${triggerClassName} px-2 text-base leading-none`}
          >
            <span aria-hidden="true">✦</span>
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
                <span className="ml-auto text-base leading-none text-white/50" aria-hidden="true">
                  ›
                </span>
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
      <div className="flex items-center gap-2 px-2 text-[13px] font-medium text-white/75">
        <span aria-label="Wi-Fi connected">⌁</span>
        <span aria-label="Battery full">▰</span>
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
