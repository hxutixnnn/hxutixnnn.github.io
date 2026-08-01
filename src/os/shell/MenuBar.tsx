import { useEffect, useRef, useState } from "react";
import { SystemMark } from "./AppIcon";

type MenuName = "system" | "app";
type MenuCommand = { label: string; shortcut?: string; onSelect: () => void; disabled?: boolean };

function PopupMenu({
  label,
  commands,
  onClose,
}: {
  label: string;
  commands: readonly MenuCommand[];
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
  }, []);

  function moveFocus(current: HTMLButtonElement, direction: 1 | -1) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [])];
    const index = items.indexOf(current);
    items[(index + direction + items.length) % items.length]?.focus();
  }

  return (
    <div className="menu-popup glass-surface" role="menu" aria-label={label} ref={menuRef}>
      {commands.map((command) => (
        <button
          type="button"
          role="menuitem"
          key={command.label}
          disabled={command.disabled}
          onClick={() => {
            command.onSelect();
            onClose();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
            } else if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              const items = menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
              (event.key === "Home" ? items?.[0] : items?.[items.length - 1])?.focus();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            } else if (event.key.length === 1) {
              const match = [
                ...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []),
              ].find((item) => item.textContent?.trim().toLowerCase().startsWith(event.key.toLowerCase()));
              match?.focus();
            }
          }}
        >
          <span>{command.label}</span>
          {command.shortcut && <kbd>{command.shortcut}</kbd>}
        </button>
      ))}
    </div>
  );
}

export function MenuBar({
  activeTitle,
  hasActiveWindow,
  onOpenAbout,
  onClose,
  onMinimize,
  onMaximize,
  documentUrl,
}: {
  activeTitle: string;
  hasActiveWindow: boolean;
  onOpenAbout: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  documentUrl: string;
}) {
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const systemButton = useRef<HTMLButtonElement>(null);
  const appButton = useRef<HTMLButtonElement>(null);
  const buttons = [systemButton, appButton];
  const time = new Intl.DateTimeFormat("en", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(
    new Date(),
  );

  function closeMenu(restore = true) {
    const current = openMenu;
    setOpenMenu(null);
    if (restore)
      requestAnimationFrame(() => (current === "system" ? systemButton : appButton).current?.focus());
  }

  function topKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number, menu: MenuName) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.current?.focus();
      if (openMenu) setOpenMenu(next === 0 ? "system" : "app");
    } else if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpenMenu(menu);
    } else if (event.key === "Escape") {
      closeMenu(false);
    }
  }

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

  return (
    <header className="menu-bar glass-surface">
      <nav className="menu-bar__menus" aria-label="System and current app menus">
        <div role="menubar" aria-label="Tien OS menu bar">
          <div className="menu-anchor">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={openMenu === "system"}
              aria-label="Tien OS menu"
              ref={systemButton}
              onClick={() => setOpenMenu(openMenu === "system" ? null : "system")}
              onKeyDown={(event) => topKeyDown(event, 0, "system")}
            >
              <SystemMark />
            </button>
            {openMenu === "system" && (
              <PopupMenu label="Tien OS" commands={systemCommands} onClose={closeMenu} />
            )}
          </div>
          <div className="menu-anchor">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={openMenu === "app"}
              ref={appButton}
              className="menu-bar__active-app"
              onClick={() => setOpenMenu(openMenu === "app" ? null : "app")}
              onKeyDown={(event) => topKeyDown(event, 1, "app")}
            >
              {activeTitle}
            </button>
            {openMenu === "app" && (
              <PopupMenu label={activeTitle} commands={appCommands} onClose={closeMenu} />
            )}
          </div>
        </div>
      </nav>
      <div className="menu-bar__status" aria-label={`Local time ${time}`}>
        <span className="status-spark" aria-hidden="true" />
        <time>{time}</time>
      </div>
    </header>
  );
}
