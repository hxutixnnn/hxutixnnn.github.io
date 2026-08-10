import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { FontAwesomeIcon } from "../../components/FontAwesomeIcon";
import {
  clamp,
  defaultCompactFrame,
  defaultDesktopFrame,
  sidebarBounds,
  type Frame,
  type Rect,
  type Workspace,
} from "../../windows/geometry";
import { WindowFrame } from "../../windows/WindowFrame";
import {
  initialSingleWindowState,
  type SingleWindowState,
  type WindowEffect,
  type WindowEvent,
} from "../../windows/singleWindowMachine";

type SystemSettingsProps = {
  windowState?: SingleWindowState;
  effects?: readonly WindowEffect[];
  onEffectsConsumed?: () => void;
  onEvent?: (event: WindowEvent) => void;
  workspace?: Workspace;
  dockTargetRectProvider?: () => Rect | null;
};

const ignoreWindowEvent = () => undefined;

import { defaultSettingsPaneId, findSettingsPane, settingsPanes, type SettingsPaneId } from "./settingsPanes";

function readClientViewport() {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function createFallbackWorkspace(): Workspace {
  const viewport = readClientViewport();
  return {
    viewport,
    menuBottom: 30,
    dockTop: viewport.height,
    safeAreaBottom: 0,
    layout: viewport.width <= 700 ? "compact" : "desktop",
  };
}

type SettingsScrollAreaProps = {
  children: ReactNode;
  className: string;
  label: string;
  contentClassName?: string;
  viewportRef?: RefObject<HTMLDivElement | null>;
};

function SettingsScrollArea({
  children,
  className,
  contentClassName = "",
  label,
  viewportRef,
}: SettingsScrollAreaProps) {
  return (
    <ScrollArea.Root className={`group/scroll relative overflow-hidden ${className}`}>
      <ScrollArea.Viewport
        ref={(element) => {
          if (viewportRef) viewportRef.current = element;
        }}
        className="settings-scroll-viewport h-full w-full overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:-outline-offset-2 focus-visible:rounded-[var(--tienos-radius-content)] focus-visible:outline-2 focus-visible:outline-[var(--tienos-color-focus)]"
        aria-label={label}
        tabIndex={0}
      >
        <ScrollArea.Content className={contentClassName}>{children}</ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        className="settings-scrollbar absolute inset-y-[5px] right-[3px] z-[2] w-2 rounded-full bg-[var(--tienos-color-scrollbar-track)] opacity-0 transition-opacity duration-[180ms] ease-out data-[has-overflow-y]:data-[scrolling]:duration-0 data-[has-overflow-y]:data-[scrolling]:opacity-100 data-[has-overflow-y]:hover:opacity-100 data-[has-overflow-y]:active:opacity-100 group-has-[:focus]/scroll:data-[has-overflow-y]:opacity-100 motion-reduce:transition-none"
        orientation="vertical"
        keepMounted
      >
        <ScrollArea.Thumb className="settings-scroll-thumb min-h-6 w-full rounded-[inherit] bg-[var(--tienos-color-scrollbar-thumb)] hover:brightness-110 active:brightness-125" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

export function SystemSettingsApp({
  windowState = initialSingleWindowState,
  effects = [],
  onEffectsConsumed,
  onEvent = ignoreWindowEvent,
  workspace: workspaceProp,
  dockTargetRectProvider,
}: SystemSettingsProps) {
  const [fallbackWorkspace] = useState(createFallbackWorkspace);
  const workspace = workspaceProp ?? fallbackWorkspace;
  const [query, setQuery] = useState("");
  const emit = useCallback((event: WindowEvent) => onEvent(event), [onEvent]);
  const [selected, setSelected] = useState<SettingsPaneId>(defaultSettingsPaneId);
  const viewport = workspace.viewport;
  const compact = workspace.layout === "compact";
  const [sidebarPercent, setSidebarPercent] = useState(() => (compact ? 40 : 30.8));
  const [frame, setFrame] = useState(() =>
    compact ? defaultCompactFrame(workspace) : defaultDesktopFrame(viewport),
  );
  const updateFrame = useCallback((next: Frame) => {
    setFrame((current) =>
      current.x === next.x &&
      current.y === next.y &&
      current.width === next.width &&
      current.height === next.height
        ? current
        : next,
    );
  }, []);
  const detailsViewportRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef(compact);

  useEffect(() => {
    if (compactRef.current === compact) return;
    compactRef.current = compact;
    setSidebarPercent(compact ? 40 : 30.8);
  }, [compact]);
  useEffect(() => {
    if (detailsViewportRef.current) detailsViewportRef.current.scrollTop = 0;
  }, [selected]);
  const filteredCategoryGroups = useMemo(
    () =>
      (["system", "personal"] as const).map((group) =>
        settingsPanes.filter(
          (pane) => pane.group === group && pane.label.toLowerCase().includes(query.toLowerCase()),
        ),
      ),
    [query],
  );
  const selectedCategory = findSettingsPane(selected);
  const SelectedPane = selectedCategory.Component;
  const splitBounds = useMemo(
    () => sidebarBounds(frame.width, workspace.layout),
    [frame.width, workspace.layout],
  );
  const clampSplit = useCallback(
    (value: number) => clamp(value, splitBounds.minimum, splitBounds.maximum),
    [splitBounds],
  );
  const resolvedSidebarPercent = clampSplit(sidebarPercent);
  const resizeSidebar = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveSidebar = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = { left: frame.x, width: frame.width };
    setSidebarPercent(clampSplit(((event.clientX - bounds.left) / bounds.width) * 100));
  };
  const resizeSidebarWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = event.key === "ArrowLeft" ? -2 : event.key === "ArrowRight" ? 2 : 0;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    setSidebarPercent(
      event.key === "Home"
        ? splitBounds.minimum
        : event.key === "End"
          ? splitBounds.maximum
          : clampSplit(resolvedSidebarPercent + direction),
    );
  };
  const settingsWindow = (
    <WindowFrame
      title="System Settings"
      lifecycle={{ state: windowState, effects, dispatch: emit, effectsConsumed: onEffectsConsumed }}
      geometry={{
        frame,
        workspace,
        onFrameChange: updateFrame,
        transitionTargetRect: () => dockTargetRectProvider?.() ?? null,
      }}
      detailViewportRef={detailsViewportRef}
      contentStyle={{ gridTemplateColumns: `${resolvedSidebarPercent}% 8px minmax(0, 1fr)` }}
    >
      {(chrome) => (
        <>
          <aside
            className="settings-sidebar relative z-20 min-h-0 min-w-0 p-[8px_4px_8px_8px] max-[700px]:p-[7px_3px_7px_7px]"
            data-floating-panel=""
          >
            <div
              data-sidebar-panel=""
              className="settings-sidebar-panel settings-drag-handle flex h-full min-h-0 flex-col overflow-visible rounded-[calc(var(--tienos-radius-window)_-_8px)] border border-white/20 [background:linear-gradient(145deg,rgb(255_255_255/0.13),transparent_46%),var(--tienos-color-sidebar)] p-[10px_9px_8px] shadow-[0_12px_30px_rgb(0_0_0/0.2),inset_0_1px_0_rgb(255_255_255/0.25),inset_0_-1px_0_rgb(0_0_0/0.1)] backdrop-blur-[24px] backdrop-saturate-[1.35] contrast-more:border-[var(--tienos-color-border)] contrast-more:[background:var(--tienos-color-sidebar)] [@media(prefers-reduced-transparency:reduce)]:[background:var(--tienos-color-sidebar)] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:[background:Canvas] [@media(forced-colors:active)]:shadow-none [@media(forced-colors:active)]:backdrop-filter-none max-[700px]:rounded-[11px] max-[700px]:p-[7px_6px]"
            >
              {chrome}

              <Field.Root
                data-settings-search=""
                className="settings-search flex h-7 items-center gap-[7px] rounded-[11px] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-control)] px-[10px] text-[var(--tienos-color-text-secondary)] data-[focused]:outline data-[focused]:outline-2 data-[focused]:outline-[var(--tienos-color-focus)] [&_input]:min-w-0 [&_input]:w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-[var(--tienos-color-text-primary)] [&_input]:outline-none [&_input::placeholder]:text-[var(--tienos-color-text-secondary)] max-[700px]:px-[8px]"
              >
                <FontAwesomeIcon name="magnifying-glass" className="text-xs" />
                <Field.Label className="sr-only">Search settings</Field.Label>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                />
              </Field.Root>

              <div className="flex items-center gap-[11px] p-[13px_7px_10px] max-[700px]:hidden [&_strong]:block [&_span]:mt-[2px] [&_span]:block [&_span]:text-xs [&_span]:text-[var(--tienos-color-text-secondary)]">
                <div className="settings-avatar grid size-[34px] place-items-center rounded-[50%] bg-[linear-gradient(145deg,#59677c,#192334)] text-[17px] font-bold">
                  T
                </div>
                <div>
                  <strong>Tien Nguyen</strong>
                  <span>tienOS Account</span>
                </div>
              </div>

              <button
                data-inset-focus=""
                className="settings-family flex h-8 w-full items-center gap-[9px] border-0 bg-transparent px-[7px] text-left text-[var(--tienos-color-text-primary)] hover:bg-[var(--tienos-color-hover)] contrast-more:shadow-[inset_0_0_0_1px_var(--tienos-color-border)] contrast-more:focus-visible:outline-2 contrast-more:focus-visible:-outline-offset-2 contrast-more:focus-visible:outline-[var(--tienos-color-focus)] max-[700px]:hidden"
              >
                <span className="grid h-[22px] w-[42px] place-items-center rounded-lg bg-[#465268] text-[15px] text-white">
                  <FontAwesomeIcon name="people-group" />
                </span>
                <span>Family</span>
              </button>

              <SettingsScrollArea
                className="settings-navigation mt-2.5 min-h-0 flex-1 max-[700px]:mt-3"
                label="Settings categories"
              >
                <nav aria-label="Settings categories">
                  {filteredCategoryGroups.map(
                    (group, groupIndex) =>
                      group.length > 0 && (
                        <div
                          className="[&+&]:mt-3 [&+&]:border-t [&+&]:border-[var(--tienos-color-separator)] [&+&]:pt-3"
                          role="group"
                          aria-label={groupIndex === 0 ? "System" : "Personal"}
                          key={groupIndex}
                        >
                          {group.map((category) => (
                            <button
                              key={category.id}
                              data-inset-focus=""
                              className="settings-nav-item flex min-h-[33.5px] w-full min-w-0 items-center gap-2.5 rounded-[10px] border-0 bg-transparent p-[4px_8px] text-left text-[var(--tienos-color-text-primary)] hover:bg-[var(--tienos-color-hover)] data-[selected]:bg-[var(--tienos-color-accent)] data-[selected]:text-white data-[selected]:hover:bg-[var(--tienos-color-accent-hover)] data-[selected]:focus-visible:outline-2 data-[selected]:focus-visible:-outline-offset-2 data-[selected]:focus-visible:outline-solid data-[selected]:focus-visible:outline-[var(--tienos-color-focus-on-accent)] contrast-more:shadow-[inset_0_0_0_1px_var(--tienos-color-border)] contrast-more:focus-visible:outline-2 contrast-more:focus-visible:-outline-offset-2 contrast-more:focus-visible:outline-[var(--tienos-color-focus)] contrast-more:data-[selected]:focus-visible:outline-[var(--tienos-color-focus-on-accent)] max-[700px]:gap-1.5 max-[700px]:p-1"
                              aria-label={category.label}
                              data-selected={selected === category.id || undefined}
                              onClick={() => setSelected(category.id)}
                            >
                              <span
                                className={`settings-icon grid size-5 shrink-0 place-items-center rounded-[7px] border border-white/20 text-[11px] text-white shadow-[inset_0_1px_rgb(255_255_255/0.2),0_1px_2px_rgb(0_0_0/0.4)] ${category.colorClass}`}
                              >
                                <FontAwesomeIcon name={category.icon} />
                              </span>
                              <span className="min-w-0 truncate">{category.label}</span>
                            </button>
                          ))}
                        </div>
                      ),
                  )}
                </nav>
              </SettingsScrollArea>
            </div>
          </aside>

          {/* The ARIA separator pattern is keyboard interactive despite having no native HTML element. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            className="settings-splitter group relative z-10 touch-none select-none border-0 bg-transparent p-0 outline-none [@media(forced-colors:active)]:focus-visible:!outline-none"
            role="separator"
            aria-label="Resize Settings sidebar"
            aria-orientation="vertical"
            aria-valuemin={Math.round(splitBounds.minimum)}
            aria-valuemax={Math.round(splitBounds.maximum)}
            aria-valuenow={Math.round(resolvedSidebarPercent)}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            onPointerDown={resizeSidebar}
            onPointerMove={moveSidebar}
            onKeyDown={resizeSidebarWithKeyboard}
          >
            <span
              data-splitter-grip=""
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent shadow-none transition-[background-color,box-shadow] group-hover:bg-[var(--tienos-color-focus)] group-hover:shadow-[0_0_8px_var(--tienos-color-focus)] group-focus-visible:bg-[var(--tienos-color-focus)] group-focus-visible:shadow-[0_0_0_2px_var(--tienos-color-window),0_0_0_4px_var(--tienos-color-focus)] group-active:bg-[var(--tienos-color-focus)] group-active:shadow-[0_0_10px_var(--tienos-color-focus)] motion-reduce:transition-none [@media(forced-colors:active)]:bg-transparent [@media(forced-colors:active)]:group-hover:bg-[CanvasText] [@media(forced-colors:active)]:group-focus-visible:bg-[CanvasText] [@media(forced-colors:active)]:group-focus-visible:shadow-none [@media(forced-colors:active)]:group-active:bg-[CanvasText] [@media(forced-colors:active)]:group-active:shadow-none"
            />
          </div>

          <div className="settings-detail flex min-h-0 min-w-0 flex-col bg-transparent p-[8px_20px_0] max-[700px]:p-[12px_10px_0]">
            <div
              className="settings-history settings-drag-handle -ml-3 mb-[9px] flex h-[35px] shrink-0 touch-none select-none items-center self-start overflow-hidden rounded-[22px] border border-[var(--tienos-color-border)] [&_button]:grid [&_button]:h-full [&_button]:w-[36px] [&_button]:place-items-center [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[12px] [&_button]:text-[var(--tienos-color-text-tertiary)] [&>span]:h-6 [&>span]:w-px [&>span]:bg-[var(--tienos-color-separator)] max-[700px]:ml-[4px] max-[700px]:h-[36px] max-[700px]:[&_button]:w-[38px]"
              aria-label="Navigation history"
            >
              <button aria-label="Back" disabled>
                <FontAwesomeIcon name="chevron-left" />
              </button>
              <span />
              <button aria-label="Forward" disabled>
                <FontAwesomeIcon name="chevron-right" />
              </button>
            </div>

            <SettingsScrollArea
              className="settings-scroll-area min-h-0 flex-1"
              contentClassName="pb-6"
              label="Settings details"
              viewportRef={detailsViewportRef}
            >
              {!selectedCategory.hideHero && (
                <header className="settings-hero rounded-[var(--tienos-radius-content)] border border-white/[.015] bg-[var(--tienos-color-content)] p-[23px_32px_19px] text-center max-[700px]:p-[24px_14px] max-[700px]:[&_h2]:text-[22px] [&_h2]:m-0 [&_h2]:text-[23px] [&_h2]:leading-none [&_h2]:tracking-[-0.03em] [&_p]:mx-auto [&_p]:mt-px [&_p]:mb-0 [&_p]:max-w-[600px] [&_p]:text-[var(--tienos-color-text-secondary)] [&_p]:leading-[var(--tienos-leading-body)]">
                  <span
                    className={`settings-hero-icon mx-auto mb-[4px] grid size-[54px] place-items-center rounded-[18px] border border-white/20 text-[28px] text-white shadow-[inset_0_1px_rgb(255_255_255/0.2),0_1px_2px_rgb(0_0_0/0.4)] ${selectedCategory.colorClass}`}
                  >
                    <FontAwesomeIcon name={selectedCategory.icon} />
                  </span>
                  <h2>{selectedCategory.label}</h2>
                  <p>
                    {selected === "general"
                      ? "Manage your overall setup and preferences for tienOS, including updates, language, sharing, and more."
                      : `Manage ${selectedCategory.label.toLowerCase()} preferences for this tienOS desktop.`}
                  </p>
                </header>
              )}

              <SelectedPane pane={selectedCategory} />
            </SettingsScrollArea>
          </div>
        </>
      )}
    </WindowFrame>
  );

  return settingsWindow;
}
