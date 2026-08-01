import { coreCatalogue } from "@/apps/catalog";
import type { CoreAppId } from "@/apps/contract";
import { AppIcon } from "./AppIcon";

export function DesktopIcons({ onOpen }: { onOpen: (id: CoreAppId) => void }) {
  return (
    <div className="desktop-icons" aria-label="Portfolio apps">
      {coreCatalogue.map((app) => (
        <button type="button" className="desktop-icon" key={app.id} onClick={() => onOpen(app.id)}>
          <AppIcon appId={app.id} />
          <span>{app.name}</span>
        </button>
      ))}
    </div>
  );
}

export function Launcher({
  running,
  selected,
  mobile,
  onOpen,
  onShowSwitcher,
}: {
  running: readonly CoreAppId[];
  selected: CoreAppId | null;
  mobile: boolean;
  onOpen: (id: CoreAppId) => void;
  onShowSwitcher: () => void;
}) {
  const apps = mobile && selected ? coreCatalogue.slice(0, 4) : coreCatalogue;
  return (
    <nav className={`launcher glass-surface${mobile ? " launcher--mobile" : ""}`} aria-label="App launcher">
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
            <AppIcon appId={app.id} size={mobile ? "small" : "normal"} />
            {!mobile && <span className="launcher__tooltip">{app.name}</span>}
            {running.includes(app.id) && <span className="running-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>
      {mobile && selected && (
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
