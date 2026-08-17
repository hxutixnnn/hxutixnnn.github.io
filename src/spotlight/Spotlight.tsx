import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AppId, DesktopAppDescriptor } from "../desktop/apps";
import { FontAwesomeIcon } from "../components/FontAwesomeIcon";
import { searchDesktopApps } from "./searchDesktopApps";

type SpotlightProps = {
  apps: readonly DesktopAppDescriptor[];
  open: boolean;
  onDismiss: () => void;
  onLaunch: (appId: AppId) => void;
};

export function Spotlight({ apps, open, onDismiss, onLaunch }: SpotlightProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef(new Map<AppId, HTMLButtonElement>());
  const listId = useId();
  const results = useMemo(() => searchDesktopApps(apps, query), [apps, query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useLayoutEffect(() => {
    const selectedResult = results[selected];
    if (!open || !selectedResult) return;
    optionRefs.current.get(selectedResult.app.id)?.scrollIntoView?.({ block: "nearest" });
  }, [open, results, selected]);

  useEffect(() => {
    if (!open) return;
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !overlayRef.current?.contains(event.target)) {
        inputRef.current?.focus();
      }
    };
    const dismissFromEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
    };
    document.addEventListener("focusin", containFocus, true);
    document.addEventListener("keydown", dismissFromEscape, true);
    return () => {
      document.removeEventListener("focusin", containFocus, true);
      document.removeEventListener("keydown", dismissFromEscape, true);
    };
  }, [onDismiss, open]);

  if (!open) return null;
  const launch = (appId: AppId) => {
    onLaunch(appId);
  };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Tab") {
      event.preventDefault();
      inputRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setSelected((value) => (value + 1) % results.length);
    }
    if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setSelected((value) => (value - 1 + results.length) % results.length);
    }
    if (event.key === "Enter" && results[selected]) {
      event.preventDefault();
      launch(results[selected].app.id);
    }
  };
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[max(12vh,3.5rem)] sm:pt-[18vh]"
      data-shell-overlay="spotlight"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dismiss Spotlight"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onDismiss}
      />
      <section
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label="Spotlight"
        className="tienos-spotlight relative w-full max-w-[42rem] overflow-hidden rounded-[var(--tienos-radius-window)] border border-white/30 bg-[var(--tienos-color-menu)] shadow-[0_28px_80px_rgb(0_0_0/.42),inset_0_1px_rgb(255_255_255/.35)] backdrop-blur-[var(--tienos-blur-spotlight)] backdrop-saturate-[var(--tienos-saturate-spotlight)] contrast-more:border-[var(--tienos-color-border)] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:bg-[Canvas] [@media(forced-colors:active)]:shadow-none motion-safe:animate-[spotlight-in_var(--tienos-motion-standard)_ease-out]"
      >
        <div className="flex min-h-16 items-center gap-4 border-b border-white/15 px-5">
          <FontAwesomeIcon
            name="magnifying-glass"
            className="text-2xl text-[var(--tienos-color-menu-text-secondary)]"
          />
          <input
            ref={inputRef}
            role="combobox"
            aria-label="Search apps"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[selected] ? `${listId}-${results[selected].app.id}` : undefined}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-xl text-[var(--tienos-color-menu-text-primary)] placeholder:text-[var(--tienos-color-menu-text-secondary)]"
            placeholder="Spotlight Search"
            value={query}
            onKeyDown={handleKeyDown}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
          />
        </div>
        <div
          id={listId}
          role="listbox"
          aria-label="Applications"
          className="max-h-[min(22rem,52vh)] overflow-y-auto p-2"
        >
          {results.map(({ app }, index) => (
            <button
              ref={(element) => {
                if (element) optionRefs.current.set(app.id, element);
                else optionRefs.current.delete(app.id);
              }}
              id={`${listId}-${app.id}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === selected}
              key={app.id}
              className="flex min-h-12 w-full items-center gap-3 rounded-[var(--tienos-radius-menu-item)] px-3 text-left text-[var(--tienos-color-menu-text-primary)] aria-selected:bg-[var(--tienos-color-accent)] aria-selected:text-[var(--tienos-color-text-on-accent)] [@media(pointer:coarse)]:min-h-14"
              onPointerMove={() => setSelected(index)}
              onClick={() => launch(app.id)}
            >
              <span className="grid size-8 place-items-center rounded-lg bg-white/15 shadow-sm">
                <FontAwesomeIcon name={app.icon} className="text-lg" />
              </span>
              <span className="font-medium">{app.name}</span>
              <span className="ml-auto text-[11px] opacity-70">Application</span>
            </button>
          ))}
          {!results.length && (
            <p className="m-0 px-3 py-8 text-center text-[var(--tienos-color-menu-text-secondary)]">
              No applications found
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
