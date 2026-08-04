import { useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { SystemMark } from "./AppIcon";
import { ControlCenter } from "./ControlCenter";
import { BatteryIcon, SpotlightIcon, WifiIcon } from "./StatusIcons";

type MenuCommand = { label: string; onSelect: () => void; disabled?: boolean; shortcut?: string };

function BaseMenu({
  commands,
  anchor,
  open,
  onOpenChange,
  label,
}: {
  commands: readonly MenuCommand[];
  anchor: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
}) {
  return (
    <Menu.Root open={open} onOpenChange={onOpenChange}>
      {anchor}
      <Menu.Portal>
        <Menu.Positioner className="menu-positioner" side="bottom" align="start" sideOffset={6}>
          <Menu.Popup className="menu-popup glass-surface" aria-label={label}>
            {commands.map((command) => (
              <Menu.Item
                key={command.label}
                disabled={command.disabled}
                onClick={command.onSelect}
                className="menu-popup__item"
              >
                <span>{command.label}</span>
                {command.shortcut && <kbd>{command.shortcut}</kbd>}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function formatStatusTime(now: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("weekday")} ${value("month")} ${value("day")} ${value("hour")}:${value("minute")} ${value("dayPeriod")}`
    .replace(/\s+/g, " ")
    .trim();
}

export function MenuBar({
  activeTitle,
  hasActiveWindow,
  mobile,
  onOpenAbout,
  onClose,
  onMinimize,
  onMaximize,
  documentUrl,
  onOpenSpotlight,
  announce,
}: {
  activeTitle: string;
  hasActiveWindow: boolean;
  mobile: boolean;
  onOpenAbout: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  documentUrl: string;
  onOpenSpotlight: () => void;
  announce: (message: string) => void;
}) {
  const topLevel = useRef<Array<HTMLButtonElement | null>>([]);
  const [openMenu, setOpenMenu] = useState<0 | 1 | null>(null);
  const time = formatStatusTime(new Date());

  const systemCommands: MenuCommand[] = [
    { label: "About Tien OS", onSelect: onOpenAbout },
    { label: "View portfolio as documents", onSelect: () => window.location.assign("/about/") },
  ];
  const appCommands: MenuCommand[] = [
    { label: `About ${activeTitle}`, onSelect: onOpenAbout },
    { label: "Minimize", shortcut: "⌘M", onSelect: onMinimize, disabled: !hasActiveWindow },
    { label: "Maximize or restore", onSelect: onMaximize, disabled: !hasActiveWindow },
    { label: "Close", shortcut: "⌘W", onSelect: onClose, disabled: !hasActiveWindow },
    { label: "Open document view", onSelect: () => window.location.assign(documentUrl) },
  ];

  function moveTopLevel(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + 2) % 2;
      topLevel.current[next]?.focus();
      setOpenMenu(next === 0 ? 0 : 1);
    }
  }

  const systemAnchor = (
    <Menu.Trigger
      ref={(element: HTMLButtonElement | null) => {
        topLevel.current[0] = element;
      }}
      className="menu-bar__icon-button menu-bar__system"
      aria-label="Tien OS menu"
      role="menuitem"
      onKeyDown={(event) => moveTopLevel(event, 0)}
    >
      <SystemMark />
    </Menu.Trigger>
  );

  const appAnchor = (
    <Menu.Trigger
      ref={(element: HTMLButtonElement | null) => {
        topLevel.current[1] = element;
      }}
      className="menu-bar__active-app"
      role="menuitem"
      onKeyDown={(event) => moveTopLevel(event, 1)}
    >
      {activeTitle}
    </Menu.Trigger>
  );

  return (
    <header className="menu-bar">
      <nav className="menu-bar__menus" aria-label="System and current app menus">
        <div role="menubar" aria-label="Tien OS menu bar">
          <BaseMenu
            commands={systemCommands}
            anchor={systemAnchor}
            open={openMenu === 0}
            onOpenChange={(open) => setOpenMenu(open ? 0 : null)}
            label="Tien OS menu"
          />
          <BaseMenu
            commands={appCommands}
            anchor={appAnchor}
            open={openMenu === 1}
            onOpenChange={(open) => setOpenMenu(open ? 1 : null)}
            label={activeTitle}
          />
        </div>
      </nav>
      {!mobile && (
        <div className="menu-bar__status" aria-label={`Local time ${time}`}>
          <span className="menu-bar__status-icon" aria-hidden="true">
            <WifiIcon />
          </span>
          <span className="menu-bar__status-icon" aria-hidden="true">
            <BatteryIcon />
          </span>
          <time>{time}</time>
          <ControlCenter mobile={false} announce={announce} />
          <button
            type="button"
            className="menu-bar__icon-button"
            aria-label="Spotlight search"
            data-spotlight-opener
            onClick={onOpenSpotlight}
          >
            <SpotlightIcon />
          </button>
        </div>
      )}
    </header>
  );
}
