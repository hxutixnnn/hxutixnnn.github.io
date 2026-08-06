import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { appById, appCatalogue } from "@/apps/catalog";
import type { AppId } from "@/apps/contract";
import { AppIcon } from "./AppIcon";
import { SpotlightIcon } from "./StatusIcons";

type SpotlightAction = {
  id: string;
  title: string;
  subtitle: string;
  run: () => void;
};

type SpotlightResult = { kind: "app"; appId: AppId } | ({ kind: "action" } & Omit<SpotlightAction, "id">);

function normalize(value: string): string {
  return value.toLocaleLowerCase().trim();
}

function rank(title: string, summary: string, query: string): number {
  const text = normalize(title);
  const full = normalize(`${title} ${summary}`);
  if (query === "") return 0;
  if (text.startsWith(query)) return 0;
  if (text.includes(query)) return 1;
  if (full.includes(query)) return 2;
  return Number.MAX_SAFE_INTEGER;
}

export function Spotlight({
  open,
  onOpenChange,
  onOpenApp,
  onOpenExternal,
  onNavigate,
  onAnnounce,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenApp: (appId: AppId) => void;
  onOpenExternal: (appId: AppId) => void;
  onNavigate: (url: string) => void;
  onAnnounce: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const actions: SpotlightAction[] = useMemo(
    () => [
      {
        id: "documents",
        title: "View portfolio as documents",
        subtitle: "Open the conventional reading view",
        run: () => onNavigate("/about/"),
      },
      {
        id: "blog",
        title: "Read the blog",
        subtitle: "Browse all posts",
        run: () => onNavigate("/blog/"),
      },
      {
        id: "resume",
        title: "Download résumé",
        subtitle: "resume.pdf",
        run: () => onNavigate("/resume.pdf"),
      },
    ],
    [onNavigate],
  );

  const results = useMemo<SpotlightResult[]>(() => {
    const q = normalize(query);
    const apps: SpotlightResult[] = appCatalogue
      .map((app) => ({ kind: "app" as const, appId: app.id, rank: rank(app.name, app.summary, q) }))
      .filter((item) => item.rank !== Number.MAX_SAFE_INTEGER)
      .sort((a, b) => a.rank - b.rank || a.appId.localeCompare(b.appId))
      .map((item) => ({ kind: item.kind, appId: item.appId }));
    const actionResults: SpotlightResult[] = actions
      .map((action) => ({ kind: "action" as const, ...action, rank: rank(action.title, action.subtitle, q) }))
      .filter((item) => item.rank !== Number.MAX_SAFE_INTEGER)
      .sort((a, b) => a.rank - b.rank)
      .map((item) => ({ kind: item.kind, title: item.title, subtitle: item.subtitle, run: item.run }));
    return [...apps, ...actionResults];
  }, [query, actions]);

  const clampedActive = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    selected?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  function activate(result: SpotlightResult) {
    if (result.kind === "app") {
      const app = appById.get(result.appId);
      onAnnounce(`${app?.name ?? "App"} opened`);
      if (app?.target?.kind === "external") onOpenExternal(result.appId);
      else onOpenApp(result.appId);
    } else {
      onAnnounce(`${result.title} opened`);
      result.run();
    }
    onOpenChange(false);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, Math.max(0, results.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = results[clampedActive];
      if (result) activate(result);
    }
  }

  function onOptionKeyDown(event: React.KeyboardEvent<HTMLLIElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const result = results[clampedActive];
      if (result) activate(result);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="spotlight-backdrop" />
        <Dialog.Popup className="spotlight-panel" aria-label="Spotlight search">
          <div className="spotlight-search">
            <SpotlightIcon className="spotlight-search__icon" />
            <input
              ref={inputRef}
              className="spotlight-search__input"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="spotlight-results"
              aria-activedescendant={
                results.length > 0 && clampedActive < results.length
                  ? `spotlight-opt-${clampedActive}`
                  : undefined
              }
              aria-autocomplete="list"
              aria-label="Search or ask"
              placeholder="Search or Ask"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="spotlight-search__shortcut" aria-hidden="true">
              ⌘ Space
            </kbd>
          </div>
          {results.length > 0 ? (
            <ul
              id="spotlight-results"
              className="spotlight-results"
              role="listbox"
              aria-label="Search results"
              ref={listRef}
            >
              {results.map((result, index) => (
                <li
                  key={result.kind === "app" ? `app-${result.appId}` : result.title}
                  id={`spotlight-opt-${index}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === clampedActive}
                  className={`spotlight-result${index === clampedActive ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => activate(result)}
                  onKeyDown={onOptionKeyDown}
                >
                  {result.kind === "app" ? (
                    <AppIcon appId={result.appId} size="small" />
                  ) : (
                    <span className="spotlight-result__glyph" aria-hidden="true">
                      ↗
                    </span>
                  )}
                  <span className="spotlight-result__text">
                    <strong>
                      {result.kind === "app"
                        ? (appById.get(result.appId)?.name ?? result.appId)
                        : result.title}
                    </strong>
                    <small>
                      {result.kind === "app"
                        ? (appById.get(result.appId)?.summary ?? "Portfolio app")
                        : result.subtitle}
                    </small>
                  </span>
                  {result.kind === "app" && appById.get(result.appId)?.target?.kind === "external" && (
                    <span className="spotlight-result__external">
                      <span aria-hidden="true">↗ </span>New tab
                    </span>
                  )}
                  {index === clampedActive && (
                    <span className="spotlight-result__open" aria-hidden="true">
                      ↵
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="spotlight-empty">No results for “{query}”.</p>
          )}
          <footer className="spotlight-hint">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
