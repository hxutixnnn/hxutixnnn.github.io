import { useEffect, useRef, useState } from "react";
import type { AppDescriptor, EmbeddedTarget } from "./contract";
import { isSafeEmbeddedTarget } from "./launch";

type EmbeddedAppDescriptor = AppDescriptor & { target: EmbeddedTarget };
type FrameState = "loading" | "unverified" | "error";

export function EmbeddedApp({ app }: { app: EmbeddedAppDescriptor }) {
  const target = app.target;
  const [frameState, setFrameState] = useState<FrameState>("loading");
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = globalThis.setTimeout(() => setFrameState("error"), 10_000);
    return () => {
      if (timeoutRef.current !== null) globalThis.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [app.id, target.url]);

  function finishFrame(state: Exclude<FrameState, "loading">) {
    if (timeoutRef.current !== null) globalThis.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setFrameState(state);
  }

  const safe = isSafeEmbeddedTarget(target);
  const fallbackLabel = `Open ${app.name} in a new tab`;

  return (
    <article className="embedded-app" data-embedded-app={app.id}>
      <header className="embedded-app__header">
        <div>
          <span className="embedded-app__eyebrow">Deployed project</span>
          <h1>{app.name}</h1>
          <p>{app.summary}</p>
        </div>
        <nav className="embedded-app__actions" aria-label={`${app.name} project links`}>
          {safe && (
            <a className="primary-link" href={target.url} target="_blank" rel="noopener noreferrer">
              {fallbackLabel}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {app.source && (
            <a href={app.source} target="_blank" rel="noopener noreferrer">
              View source<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </nav>
      </header>

      {safe ? (
        <>
          <div className="embedded-app__frame" aria-busy={frameState === "loading"}>
            {frameState === "loading" && (
              <p className="embedded-app__status" role="status">
                Loading {app.name}…
              </p>
            )}
            <iframe
              title={`${app.name} deployed project`}
              src={target.url}
              loading="eager"
              referrerPolicy="no-referrer"
              sandbox="allow-forms allow-scripts"
              onLoad={() => finishFrame("unverified")}
              onError={() => finishFrame("error")}
            />
          </div>
          {frameState === "error" ? (
            <p className="embedded-app__error" role="alert">
              This project could not be displayed here. It may refuse framing or be temporarily unavailable.{" "}
              <a href={target.url} target="_blank" rel="noopener noreferrer">
                {fallbackLabel}
              </a>
              .
            </p>
          ) : (
            <p className="embedded-app__hint">
              Tien OS cannot verify whether this cross-origin frame rendered. If it is blank or shows a
              blocked-page message,{" "}
              <a href={target.url} target="_blank" rel="noopener noreferrer">
                open it in a new tab
              </a>
              .
            </p>
          )}
        </>
      ) : (
        <p className="embedded-app__error" role="alert">
          This project has no approved HTTPS deployment target, so it cannot be embedded safely.
        </p>
      )}
    </article>
  );
}
