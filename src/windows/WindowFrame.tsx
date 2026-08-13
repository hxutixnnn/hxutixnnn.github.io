import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { Rnd, type RndResizeCallback } from "react-rnd";
import {
  clampFrame,
  defaultCompactFrame,
  defaultDesktopFrame,
  DESKTOP_MINIMUM,
  frameFromResize,
  fullscreenFrame,
  restoreNormalFrame,
  workspaceBottomBoundary,
  type Frame,
  type Rect,
  type Workspace,
} from "./geometry";
import type { SingleWindowState, WindowEffect, WindowEvent } from "./singleWindowMachine";
import { createGenieTransitionDriver, type GenieTransitionDriver } from "./transitions/genie";

export type WindowFrameLifecyclePort = Readonly<{
  state: SingleWindowState;
  effects: readonly WindowEffect[];
  dispatch(event: WindowEvent): void;
  effectsConsumed?(count: number): void;
}>;

export type WindowFrameGeometryPort = Readonly<{
  frame: Frame;
  workspace: Workspace;
  onFrameChange(frame: Frame): void;
  transitionTargetRect(): Rect | null;
}>;

export type WindowFrameProps = Readonly<{
  appId?: string;
  title: string;
  lifecycle: WindowFrameLifecyclePort;
  geometry: WindowFrameGeometryPort;
  detailViewportRef?: RefObject<HTMLElement | null>;
  contentStyle?: CSSProperties;
  children: ReactNode | ((chrome: ReactNode) => ReactNode);
}>;

const touchResizeHandleStyle: CSSProperties = { touchAction: "none", userSelect: "none" };
const resizeHandleStyles = {
  top: touchResizeHandleStyle,
  right: touchResizeHandleStyle,
  bottom: touchResizeHandleStyle,
  left: touchResizeHandleStyle,
  topRight: touchResizeHandleStyle,
  bottomRight: touchResizeHandleStyle,
  bottomLeft: touchResizeHandleStyle,
  topLeft: touchResizeHandleStyle,
};

function applyFrameDuringResize(element: HTMLElement, frame: Frame) {
  const bounds = element.getBoundingClientRect();
  const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform);
  element.style.width = `${frame.width}px`;
  element.style.height = `${frame.height}px`;
  element.style.transform = `translate(${transform.e + frame.x - bounds.x}px, ${transform.f + frame.y - bounds.y}px)`;
}

export function WindowFrame({
  appId,
  title,
  lifecycle,
  geometry,
  detailViewportRef,
  contentStyle,
  children,
}: WindowFrameProps) {
  const { state, effects, dispatch, effectsConsumed } = lifecycle;
  const { workspace, frame, onFrameChange } = geometry;
  const compact = workspace.layout === "compact";
  const fullscreen = state.fullscreen;
  const visibility = state.visibility;
  const bottomBoundary = workspaceBottomBoundary(workspace);
  const availableHeight = Math.max(0, bottomBoundary - Math.ceil(workspace.menuBottom));
  const minimumHeight = compact
    ? Math.min(frame.height, availableHeight)
    : Math.min(DESKTOP_MINIMUM.height, availableHeight);
  const rndRef = useRef<Rnd>(null);
  const windowRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const normalFrameRef = useRef<Frame | null>(null);
  const normalScrollTopRef = useRef<number | null>(null);
  const compactRef = useRef(compact);
  const focusEpochRef = useRef(-1);
  const [dragBoundaryElement, setDragBoundaryElement] = useState<HTMLElement | null>(null);
  const targetProviderRef = useRef(geometry.transitionTargetRect);
  const driverRef = useRef<GenieTransitionDriver | null>(null);

  useLayoutEffect(() => {
    targetProviderRef.current = geometry.transitionTargetRect;
  }, [geometry.transitionTargetRect]);

  useLayoutEffect(() => {
    const driver = createGenieTransitionDriver({
      element: () => windowRef.current,
      targetRect: () => targetProviderRef.current(),
      reducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onSettled: ({ generation, destination }) =>
        dispatch({ type: "TRANSITION_SETTLED", generation, destination }),
    });
    driverRef.current = driver;
    return () => {
      driver.dispose();
      driverRef.current = null;
    };
  }, [dispatch]);

  useLayoutEffect(() => {
    if (!effects.length) return;
    const hasCurrentRestore = effects.some(
      (effect) =>
        effect.type === "START_TRANSITION" &&
        effect.generation === state.generation &&
        effect.direction === "restore",
    );
    for (const effect of effects) {
      const current = effect.generation === state.generation;
      const reversiblePrior =
        effect.type === "START_TRANSITION" && effect.generation === state.generation - 1 && hasCurrentRestore;
      if (!current && !reversiblePrior) continue;
      if (effect.type === "CANCEL_TRANSITION") driverRef.current?.cancel(effect.generation);
      else if (effect.type === "FOCUS") {
        if (visibility !== "visible" || effect.epoch <= focusEpochRef.current) continue;
        focusEpochRef.current = effect.epoch;
        (restoreFocusRef.current?.isConnected ? restoreFocusRef.current : windowRef.current)?.focus({
          preventScroll: true,
        });
      } else {
        const destination = effect.direction === "minimize" ? "minimized" : "visible";
        if (effect.direction === "restore") driverRef.current?.reverse(effect.generation, destination);
        else driverRef.current?.start(effect.generation, destination, { defer: effect.defer });
      }
    }
    effectsConsumed?.(effects.length);
  }, [effects, effectsConsumed, state.generation, visibility]);

  useLayoutEffect(() => {
    const modeChanged = compactRef.current !== compact;
    compactRef.current = compact;
    if (visibility !== "visible") driverRef.current?.retarget();
    if (fullscreen) onFrameChange(fullscreenFrame(workspace));
    else if (compact) onFrameChange(defaultCompactFrame(workspace));
    else onFrameChange(clampFrame(modeChanged ? defaultDesktopFrame(workspace.viewport) : frame, workspace));
    // frame is deliberately projected through the controlled geometry port only when policy inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, fullscreen, visibility, workspace]);

  useLayoutEffect(() => {
    const element = rndRef.current?.resizableElement.current;
    if (!element) return;
    const activate = () => dispatch({ type: "WINDOW_INTERACTION" });
    element.addEventListener("pointerdown", activate, true);
    return () => element.removeEventListener("pointerdown", activate, true);
  }, [dispatch]);

  useLayoutEffect(() => {
    if (fullscreen) {
      if (normalFrameRef.current === null) {
        normalFrameRef.current = frame;
        normalScrollTopRef.current = detailViewportRef?.current?.scrollTop ?? null;
      }
      const maximized = fullscreenFrame(workspace);
      rndRef.current?.updateSize({ width: maximized.width, height: maximized.height });
      rndRef.current?.updatePosition({ x: maximized.x, y: maximized.y });
      onFrameChange(maximized);
      return;
    }
    if (normalFrameRef.current === null) return;
    const restored = restoreNormalFrame(normalFrameRef.current, workspace);
    rndRef.current?.updateSize({ width: restored.width, height: restored.height });
    rndRef.current?.updatePosition({ x: restored.x, y: restored.y });
    onFrameChange(restored);
    normalFrameRef.current = null;
  }, [detailViewportRef, frame, fullscreen, onFrameChange, workspace]);

  useLayoutEffect(() => {
    if (!fullscreen || normalScrollTopRef.current === null) return;
    // Restoration is performed after leaving fullscreen below.
  }, [fullscreen]);
  useLayoutEffect(() => {
    if (fullscreen || normalScrollTopRef.current === null) return;
    if (detailViewportRef?.current) detailViewportRef.current.scrollTop = normalScrollTopRef.current;
    normalScrollTopRef.current = null;
  }, [detailViewportRef, frame, fullscreen]);

  const updateFrameFromResize: RndResizeCallback = (_, direction, element, __, position) => {
    const next = frameFromResize(
      direction,
      { width: element.offsetWidth, height: element.offsetHeight },
      position,
      workspace,
    );
    applyFrameDuringResize(element, next);
    onFrameChange(next);
  };
  const commitFrameFromResize: RndResizeCallback = (_, __, element) => {
    const bounds = element.getBoundingClientRect();
    onFrameChange(
      clampFrame(
        { x: bounds.x, y: bounds.y, width: element.offsetWidth, height: element.offsetHeight },
        workspace,
      ),
    );
  };
  const move = useCallback(
    (position: { x: number; y: number }) =>
      onFrameChange(clampFrame({ ...frame, x: position.x, y: position.y }, workspace)),
    [frame, onFrameChange, workspace],
  );

  const chrome = (
    <div
      className="settings-drag-handle relative z-20 mx-[-4px] mb-[29px] h-[13px] w-[132px] shrink-0 touch-none select-none max-[700px]:mb-5 max-[700px]:h-[11px]"
      aria-label="Window controls"
    >
      {(["close", "minimize", "fullscreen"] as const).map((control, index) => (
        <button
          key={control}
          type="button"
          className={`settings-light settings-light-${control} absolute top-[-15.5px] size-[44px] touch-manipulation max-[700px]:top-[-15px]`}
          style={{ left: index * 20 }}
          data-traffic-control={control}
          aria-label={
            control === "close"
              ? `Close ${title}`
              : control === "minimize"
                ? `Minimize ${title}`
                : `Toggle fullscreen ${title}`
          }
          aria-pressed={control === "fullscreen" ? fullscreen : undefined}
          title={
            control === "close"
              ? "Close"
              : control === "minimize"
                ? "Minimize"
                : fullscreen
                  ? "Exit Fullscreen"
                  : "Enter Fullscreen"
          }
          onClick={() =>
            dispatch({
              type: control === "close" ? "CLOSE" : control === "minimize" ? "MINIMIZE" : "TOGGLE_FULLSCREEN",
            })
          }
        >
          <span
            data-traffic-dot={control}
            className={`pointer-events-none absolute top-1/2 left-1/2 size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/10 max-[700px]:top-[20.5px] max-[700px]:size-[11px] ${control === "close" ? "bg-[#ff5f57]" : control === "minimize" ? "bg-[#febc2e]" : "bg-[#28c840]"}`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div
        ref={setDragBoundaryElement}
        data-settings-drag-boundary
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0"
        style={{
          top: Math.ceil(workspace.menuBottom),
          bottom: Math.max(0, workspace.viewport.height - bottomBoundary),
        }}
      />
      <Rnd
        ref={rndRef}
        className={`settings-rnd z-30 ${visibility === "minimized" ? "invisible pointer-events-none" : ""}`}
        data-window-visibility={visibility}
        size={{ width: frame.width, height: frame.height }}
        position={{ x: frame.x, y: frame.y }}
        bounds={dragBoundaryElement ?? undefined}
        minWidth={compact ? frame.width : Math.min(DESKTOP_MINIMUM.width, workspace.viewport.width)}
        minHeight={minimumHeight}
        maxWidth={workspace.viewport.width}
        maxHeight={availableHeight}
        disableDragging={compact || fullscreen || visibility !== "visible"}
        enableResizing={!compact && !fullscreen && visibility === "visible"}
        dragHandleClassName="settings-drag-handle"
        cancel=".settings-navigation,.settings-scroll-area,button,input,select,label"
        resizeHandleStyles={resizeHandleStyles}
        onDrag={(_, position) => move(position)}
        onDragStop={(_, position) => move(position)}
        onResize={updateFrameFromResize}
        onResizeStop={commitFrameFromResize}
      >
        <section
          ref={windowRef}
          style={contentStyle}
          data-genie-window
          data-desktop-activity={appId}
          data-window-active={state.active}
          data-window-visibility={visibility}
          data-fullscreen={fullscreen || undefined}
          className="settings-window relative grid h-full w-full overflow-hidden rounded-[var(--tienos-radius-window)] border border-white/25 [background:linear-gradient(135deg,rgb(255_255_255/0.16),transparent_36%,rgb(4_10_20/0.16)),var(--tienos-color-window)] text-[var(--tienos-color-text-primary)] shadow-[var(--tienos-shadow-window),0_10px_32px_rgb(2_8_23/0.24),inset_0_1px_0_rgb(255_255_255/0.3),inset_0_-1px_0_rgb(0_0_0/0.16)] backdrop-blur-[32px] backdrop-saturate-[1.4] contrast-more:border-[var(--tienos-color-border)] contrast-more:[background:var(--tienos-color-window)] [@media(prefers-reduced-transparency:reduce)]:[background:var(--tienos-color-window)] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:[background:Canvas] [@media(forced-colors:active)]:shadow-none [@media(forced-colors:active)]:backdrop-filter-none max-[700px]:rounded-[18px]"
          aria-label={title}
          aria-hidden={visibility !== "visible" || undefined}
          inert={visibility !== "visible"}
          onFocusCapture={(event) => {
            if (event.target instanceof HTMLElement && event.target !== windowRef.current)
              restoreFocusRef.current = event.target;
            dispatch({ type: "WINDOW_INTERACTION" });
          }}
          tabIndex={-1}
        >
          {typeof children === "function" ? children(chrome) : children}
        </section>
      </Rnd>
    </>
  );
}
