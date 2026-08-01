import { useState, type PropsWithChildren } from "react";
import { Rnd, type HandleStyles } from "react-rnd";
import type { Rect, Viewport, WindowState } from "../domain/windows";

const resizeHandleClasses = {
  top: "resize-handle resize-handle--n",
  topRight: "resize-handle resize-handle--ne",
  right: "resize-handle resize-handle--e",
  bottomRight: "resize-handle resize-handle--se",
  bottom: "resize-handle resize-handle--s",
  bottomLeft: "resize-handle resize-handle--sw",
  left: "resize-handle resize-handle--w",
  topLeft: "resize-handle resize-handle--nw",
} as const;

// Keep the full hit targets inside the window boundary. The upstream defaults
// straddle each edge, which makes the exact center fall outside hit testing.
const resizeHandleStyles: HandleStyles = {
  top: { top: 0 },
  topRight: { top: 0, right: 0 },
  right: { right: 0 },
  bottomRight: { right: 0, bottom: 0 },
  bottom: { bottom: 0 },
  bottomLeft: { bottom: 0, left: 0 },
  left: { left: 0 },
  topLeft: { top: 0, left: 0 },
};

export function WindowFrame({
  window,
  title,
  viewport,
  mobile,
  focused,
  resizable,
  registerFrame,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onResize,
  children,
}: PropsWithChildren<{
  window: WindowState;
  title: string;
  viewport: Viewport;
  mobile: boolean;
  focused: boolean;
  resizable: boolean;
  registerFrame: (element: HTMLElement | null) => void;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (rect: Rect) => void;
}>) {
  const [draftRect, setDraftRect] = useState<Rect | null>(null);
  const titleId = `title-${window.id}`;
  const frame = (
    <section
      className={`window-frame glass-surface${focused ? " is-focused" : ""}${mobile ? " is-mobile" : ""}`}
      aria-labelledby={titleId}
      data-window-id={window.id}
      data-app-id={window.appId}
      tabIndex={-1}
      ref={registerFrame}
      onPointerDown={onFocus}
    >
      <header className="window-titlebar" onDoubleClick={mobile ? undefined : onToggleMaximize}>
        <div className="window-controls" aria-label={`${title} window controls`}>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="window-control window-control--close"
          >
            <span aria-hidden="true">×</span>
          </button>
          <button
            type="button"
            onClick={onMinimize}
            aria-label={`Minimize ${title}`}
            className="window-control window-control--minimize"
          >
            <span aria-hidden="true">−</span>
          </button>
          {!mobile && (
            <button
              type="button"
              onClick={onToggleMaximize}
              aria-label={`${window.status === "maximized" ? "Restore" : "Maximize"} ${title}`}
              className="window-control window-control--maximize"
            >
              <span aria-hidden="true">◇</span>
            </button>
          )}
        </div>
        <h2 id={titleId}>{title}</h2>
        <a
          className="window-document-link"
          href={`/apps/${window.appId}/`}
          aria-label={`Open ${title} detail document`}
        >
          <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div className="window-content">{children}</div>
    </section>
  );

  if (mobile) return frame;

  const maximized = window.status === "maximized";
  const activeRect = draftRect ?? window.rect;
  const size = maximized ? { width: viewport.width, height: viewport.height } : activeRect;
  const position = maximized ? { x: 0, y: 0 } : activeRect;
  return (
    <Rnd
      className="window-positioner"
      style={{ zIndex: window.z }}
      size={{ width: size.width, height: size.height }}
      position={{ x: position.x, y: position.y }}
      minWidth={360}
      minHeight={280}
      maxWidth={viewport.width}
      maxHeight={viewport.height}
      bounds="parent"
      dragHandleClassName="window-titlebar"
      cancel=".window-controls,.window-document-link,.window-content,button,a,input,textarea,select"
      disableDragging={maximized}
      enableResizing={resizable && !maximized}
      resizeHandleClasses={resizeHandleClasses}
      resizeHandleStyles={resizeHandleStyles}
      onDragStart={onFocus}
      onDragStop={(_event, data) => onMove(data.x, data.y)}
      onResizeStart={onFocus}
      onResize={(_event, _direction, element, _delta, nextPosition) =>
        setDraftRect({
          x: nextPosition.x,
          y: nextPosition.y,
          width: element.offsetWidth,
          height: element.offsetHeight,
        })
      }
      onResizeStop={(_event, _direction, element, _delta, nextPosition) => {
        onResize({
          x: nextPosition.x,
          y: nextPosition.y,
          width: element.offsetWidth,
          height: element.offsetHeight,
        });
        setDraftRect(null);
      }}
    >
      {frame}
    </Rnd>
  );
}
