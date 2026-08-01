import { useEffect, useRef } from "react";
import { appById } from "@/apps/catalog";
import { AppIcon } from "./AppIcon";
import type { WindowState } from "../domain/windows";

export function MobileSwitcher({
  windows,
  onSwitch,
  onCloseWindow,
  onDismiss,
}: {
  windows: readonly WindowState[];
  onSwitch: (window: WindowState) => void;
  onCloseWindow: (window: WindowState) => void;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const dismiss = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dismiss.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
      if (event.key === "Tab") {
        const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? [])];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => event.target === event.currentTarget && onDismiss()}
    >
      <div
        className="mobile-switcher glass-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="switcher-title"
        ref={dialog}
      >
        <header>
          <div>
            <span>Running now</span>
            <h2 id="switcher-title">App switcher</h2>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Close app switcher" ref={dismiss}>
            Done
          </button>
        </header>
        {windows.length === 0 ? (
          <p>No apps are running.</p>
        ) : (
          <ul>
            {windows.map((window) => {
              const app = appById.get(window.appId);
              return (
                <li key={window.id}>
                  <button type="button" className="switcher-app" onClick={() => onSwitch(window)}>
                    <AppIcon appId={window.appId} size="small" />
                    <span>
                      <strong>{app?.name}</strong>
                      <small>{window.status}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="switcher-close"
                    aria-label={`Close ${app?.name}`}
                    onClick={() => onCloseWindow(window)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
