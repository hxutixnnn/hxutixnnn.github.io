import { useRef, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { appById, coreCatalogue } from "@/apps/catalog";
import type { CoreAppId } from "@/apps/contract";
import type { WindowId, WindowState } from "../domain/windows";
import { AppIcon } from "./AppIcon";
import { TrashIcon } from "./StatusIcons";

function dockTooltip(label: string) {
  return (
    <Tooltip.Portal>
      <Tooltip.Positioner side="top" align="center" sideOffset={10}>
        <Tooltip.Popup className="dock-tooltip">{label}</Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Portal>
  );
}

export function Dock({
  running,
  selected,
  minimized,
  bounceToken,
  onOpen,
  onRestoreMinimized,
  onTrash,
}: {
  running: readonly CoreAppId[];
  selected: CoreAppId | null;
  minimized: readonly WindowState[];
  bounceToken: string | null;
  onOpen: (id: CoreAppId) => void;
  onRestoreMinimized: (id: WindowId) => void;
  onTrash: () => void;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  const [scales, setScales] = useState<number[]>([]);

  function magnify(event: React.MouseEvent) {
    const dock = dockRef.current;
    if (!dock) return;
    const buttons = [...dock.querySelectorAll<HTMLElement>("[data-dock-button]")];
    const next = buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
      const falloff = Math.max(0, 1 - distance / 96);
      return 1 + falloff * 0.42;
    });
    setScales(next);
  }

  function clearMagnify() {
    setScales([]);
  }

  return (
    <nav
      className="dock glass-surface"
      aria-label="App dock"
      ref={dockRef}
      onMouseMove={magnify}
      onMouseLeave={clearMagnify}
    >
      <div className="dock__apps" role="toolbar" aria-label="Dock apps">
        {coreCatalogue.map((app, index) => {
          const scale = scales[index] ?? 1;
          const isBouncing = bounceToken?.startsWith(`${app.id}:`) ?? false;
          return (
            <Tooltip.Root key={app.id}>
              <Tooltip.Trigger
                type="button"
                data-dock-button
                data-launcher-id={app.id}
                className={`dock__app${selected === app.id ? " is-selected" : ""}${isBouncing ? " is-bouncing" : ""}`}
                aria-label={`${running.includes(app.id) ? "Switch to" : "Open"} ${app.name}`}
                aria-pressed={selected === app.id}
                onClick={() => onOpen(app.id)}
                style={{
                  transform: scale === 1 ? undefined : `translateY(${-(scale - 1) * 20}px) scale(${scale})`,
                }}
              >
                <AppIcon appId={app.id} size="small" />
                {running.includes(app.id) && <span className="running-dot" aria-hidden="true" />}
              </Tooltip.Trigger>
              {dockTooltip(app.name)}
            </Tooltip.Root>
          );
        })}
      </div>

      {minimized.length > 0 && (
        <>
          <span className="dock-divider" aria-hidden="true" />
          <div className="dock__minimized" role="toolbar" aria-label="Minimized windows">
            {minimized.map((window) => {
              const app = appById.get(window.appId);
              const title = app?.name ?? window.appId;
              return (
                <Tooltip.Root key={window.id}>
                  <Tooltip.Trigger
                    type="button"
                    data-dock-button
                    className="dock__app dock__mini"
                    aria-label={`Restore ${title}`}
                    onClick={() => onRestoreMinimized(window.id)}
                  >
                    <AppIcon appId={window.appId} size="small" />
                  </Tooltip.Trigger>
                  {dockTooltip(title)}
                </Tooltip.Root>
              );
            })}
          </div>
        </>
      )}

      <span className="dock-divider" aria-hidden="true" />
      <Tooltip.Root>
        <Tooltip.Trigger
          type="button"
          data-dock-button
          className="dock__app dock__trash"
          aria-label="Trash"
          onClick={onTrash}
        >
          <TrashIcon className="dock__trash-icon" />
        </Tooltip.Trigger>
        {dockTooltip("Trash")}
      </Tooltip.Root>
    </nav>
  );
}

export function MobileDockBar({
  running,
  selected,
  onOpen,
  onShowSwitcher,
}: {
  running: readonly CoreAppId[];
  selected: CoreAppId | null;
  onOpen: (id: CoreAppId) => void;
  onShowSwitcher: () => void;
}) {
  const apps = selected ? coreCatalogue.slice(0, 4) : coreCatalogue;
  return (
    <nav className="launcher glass-surface launcher--mobile" aria-label="App launcher">
      <div className="launcher__apps" role="toolbar" aria-label="Pinned apps">
        {apps.map((app) => (
          <button
            type="button"
            key={app.id}
            data-launcher-id={app.id}
            className={selected === app.id ? "is-selected" : ""}
            aria-label={`${running.includes(app.id) ? "Switch to" : "Open"} ${app.name}`}
            aria-pressed={selected === app.id}
            onClick={() => onOpen(app.id)}
          >
            <AppIcon appId={app.id} size="small" />
            {running.includes(app.id) && <span className="running-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>
      {selected && (
        <button
          type="button"
          className="switcher-button"
          onClick={onShowSwitcher}
          aria-label="Show running apps"
        >
          <span aria-hidden="true">▦</span>
        </button>
      )}
    </nav>
  );
}

export function MobileLauncher({ onOpen }: { onOpen: (id: CoreAppId) => void }) {
  return (
    <main className="mobile-home" aria-label="Tien OS apps">
      <header>
        <span>Personal system</span>
        <h1>Good to see you.</h1>
        <p>Open a section, or use the document link below for a conventional portfolio.</p>
      </header>
      <div className="mobile-app-grid">
        {coreCatalogue.map((app) => (
          <button type="button" key={app.id} data-launcher-id={app.id} onClick={() => onOpen(app.id)}>
            <AppIcon appId={app.id} />
            <span>{app.name}</span>
          </button>
        ))}
      </div>
      <a className="mobile-document-escape" href="/about/">
        View as documents
      </a>
    </main>
  );
}
