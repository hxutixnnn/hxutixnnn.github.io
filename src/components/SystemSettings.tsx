import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { Rnd, type RndResizeCallback } from "react-rnd";
import { FontAwesomeIcon, type FontAwesomeIconName } from "./FontAwesomeIcon";
import { useAppearanceStore, type AppearanceMode } from "../stores/appearance";

type SystemSettingsProps = {
  onClose: () => void;
};

type SettingCategory = {
  icon: FontAwesomeIconName;
  label: string;
  colorClass: string;
};

type GeneralSetting = [icon: FontAwesomeIconName, label: string];

const categories: SettingCategory[] = [
  { icon: "gear", label: "General", colorClass: "bg-[#8c8c91]" },
  { icon: "circle-half-stroke", label: "Appearance", colorClass: "bg-[#a4a4a8]" },
  { icon: "desktop", label: "Desktop & Dock", colorClass: "bg-[#85858a]" },
  { icon: "display", label: "Displays", colorClass: "bg-[#258cff]" },
  { icon: "bars", label: "Menu Bar", colorClass: "bg-[#85858a]" },
  { icon: "magnifying-glass", label: "Spotlight", colorClass: "bg-[#307ed2]" },
  { icon: "image", label: "Wallpaper", colorClass: "bg-[#31a6c8]" },
  { icon: "sparkles", label: "Notifications", colorClass: "bg-[#ec5965]" },
  { icon: "volume-high", label: "Sound", colorClass: "bg-[#ec5965]" },
  { icon: "key", label: "Lock Screen", colorClass: "bg-[#85858a]" },
  { icon: "keyboard", label: "Keyboard", colorClass: "bg-[#85858a]" },
  { icon: "computer-mouse", label: "Trackpad", colorClass: "bg-[#85858a]" },
];

const generalGroups: GeneralSetting[][] = [
  [
    ["circle-info", "About"],
    ["rotate", "Software Update"],
    ["hard-drive", "Storage"],
  ],
  [["shield-check", "Coverage & Warranty"]],
  [["share-nodes", "Sharing & Continuity"]],
  [
    ["key", "AutoFill & Passwords"],
    ["calendar-days", "Date & Time"],
    ["language", "Language & Region"],
    ["puzzle-piece", "Login Items & Extensions"],
    ["user-group", "Sharing"],
    ["arrow-right-arrow-left", "Transfer or Reset"],
  ],
];

const compactBreakpoint = 700;
const iphoneBreakpoint = 430;
const iphoneWindowTop = 46;
const splitterWidth = 8;
const desktopMinimum = { width: 680, height: 520 };
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

type Viewport = {
  width: number;
  height: number;
};

type SettingsFrame = Viewport & {
  x: number;
  y: number;
};

function readViewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
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

function compactFrame(viewport: Viewport, menuBottom: number): SettingsFrame {
  const measuredTop = Math.ceil(menuBottom);
  const top = viewport.width <= iphoneBreakpoint ? Math.max(iphoneWindowTop, measuredTop) : measuredTop;
  return {
    x: 8,
    y: top,
    width: Math.max(0, viewport.width - 16),
    height: Math.max(0, viewport.height - top - 8),
  };
}

function desktopFrame(viewport: Viewport): SettingsFrame {
  const width = Math.min(
    viewport.width,
    Math.max(Math.min(desktopMinimum.width, viewport.width), viewport.width * 0.788),
    1120,
  );
  const height = Math.min(
    viewport.height,
    Math.max(Math.min(desktopMinimum.height, viewport.height), viewport.height * 0.727),
    860,
  );

  return {
    x: clamp(viewport.width * 0.106, 0, viewport.width - width),
    y: clamp(viewport.height * 0.105, 0, viewport.height - height),
    width,
    height,
  };
}

function clampFrame(frame: SettingsFrame, viewport: Viewport, menuBottom = 0): SettingsFrame {
  const top = Math.ceil(menuBottom);
  const availableHeight = Math.max(0, viewport.height - top);
  const width = clamp(frame.width, Math.min(desktopMinimum.width, viewport.width), viewport.width);
  const height = clamp(frame.height, Math.min(desktopMinimum.height, availableHeight), availableHeight);

  return {
    x: clamp(frame.x, 0, viewport.width - width),
    y: clamp(frame.y, top, viewport.height - height),
    width,
    height,
  };
}

function frameFromResize(
  direction: Parameters<RndResizeCallback>[1],
  element: HTMLElement,
  position: Parameters<RndResizeCallback>[4],
  viewport: Viewport,
  menuBottom: number,
): SettingsFrame {
  const top = direction.toLowerCase().startsWith("top")
    ? Math.max(position.y, Math.ceil(menuBottom))
    : position.y;
  const bottom = position.y + element.offsetHeight;

  return clampFrame(
    {
      x: position.x,
      y: top,
      width: element.offsetWidth,
      height: direction.toLowerCase().startsWith("top") ? Math.max(0, bottom - top) : element.offsetHeight,
    },
    viewport,
    menuBottom,
  );
}

function applyFrameDuringResize(element: HTMLElement, frame: SettingsFrame) {
  const bounds = element.getBoundingClientRect();
  const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform);
  element.style.width = `${frame.width}px`;
  element.style.height = `${frame.height}px`;
  element.style.transform = `translate(${transform.e + frame.x - bounds.x}px, ${transform.f + frame.y - bounds.y}px)`;
}

export function SystemSettings({ onClose }: SystemSettingsProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("General");
  const appearanceMode = useAppearanceStore((state) => state.mode);
  const setAppearanceMode = useAppearanceStore((state) => state.setMode);
  const [glassStyle, setGlassStyle] = useState("Clear");
  const [accentColor, setAccentColor] = useState("Multicolor");
  const [textHighlightColor, setTextHighlightColor] = useState("Automatic");
  const [widgetStyle, setWidgetStyle] = useState("Default");
  const [folderColor, setFolderColor] = useState("Automatic");
  const [sidebarIconSize, setSidebarIconSize] = useState("Medium");
  const [wallpaperTint, setWallpaperTint] = useState(true);
  const [viewport, setViewport] = useState(readViewport);
  const compact = viewport.width <= compactBreakpoint;
  const [menuBottom, setMenuBottom] = useState(0);
  const [sidebarPercent, setSidebarPercent] = useState(() => (compact ? 40 : 30.8));
  const [frame, setFrame] = useState(() => (compact ? compactFrame(viewport, 0) : desktopFrame(viewport)));
  const windowRef = useRef<HTMLElement>(null);
  const compactRef = useRef(compact);
  const detailsViewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const menuBar = document.querySelector<HTMLElement>("[data-menu-bar-surface]");
    const updateGeometry = () => {
      const nextViewport = readViewport();
      const nextMenuBottom = menuBar?.getBoundingClientRect().bottom ?? 0;
      const nextCompact = nextViewport.width <= compactBreakpoint;
      const modeChanged = compactRef.current !== nextCompact;
      compactRef.current = nextCompact;

      setViewport(nextViewport);
      setMenuBottom(nextMenuBottom);
      if (modeChanged) setSidebarPercent(nextCompact ? 40 : 30.8);
      setFrame((currentFrame) => {
        if (nextCompact) return compactFrame(nextViewport, nextMenuBottom);
        const nextFrame = modeChanged ? desktopFrame(nextViewport) : currentFrame;
        return clampFrame(nextFrame, nextViewport, nextMenuBottom);
      });
    };

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateGeometry);
    if (menuBar) observer?.observe(menuBar);
    window.addEventListener("resize", updateGeometry);
    updateGeometry();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateGeometry);
    };
  }, []);
  useEffect(() => {
    if (detailsViewportRef.current) detailsViewportRef.current.scrollTop = 0;
  }, [selected]);
  const filteredCategoryGroups = useMemo(
    () =>
      [categories.slice(0, 7), categories.slice(7)].map((group) =>
        group.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase())),
      ),
    [query],
  );
  const selectedCategory = categories.find(({ label }) => label === selected) ?? categories[0];
  const splitBounds = useMemo(() => {
    const width = Math.max(1, frame.width);
    const availableWidth = Math.max(0, width - splitterWidth);
    const requestedSidebar = compact ? 112 : 180;
    const requestedDetails = compact ? 170 : 360;
    const scale = Math.min(1, availableWidth / (requestedSidebar + requestedDetails));
    const minimumSidebar = requestedSidebar * scale;
    const minimumDetails = requestedDetails * scale;
    return {
      minimum: (minimumSidebar / width) * 100,
      maximum: ((availableWidth - minimumDetails) / width) * 100,
    };
  }, [compact, frame.width]);
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
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || !windowRef.current) return;
    const bounds = windowRef.current.getBoundingClientRect();
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
  const availableHeight = Math.max(0, viewport.height - Math.ceil(menuBottom));
  const minimumHeight = compact
    ? Math.min(frame.height, availableHeight)
    : Math.min(desktopMinimum.height, availableHeight);
  const updateFrameFromResize: RndResizeCallback = (_, direction, element, __, position) => {
    const nextFrame = frameFromResize(direction, element, position, viewport, menuBottom);
    applyFrameDuringResize(element, nextFrame);
    setFrame(nextFrame);
  };
  const commitFrameFromResize: RndResizeCallback = (_, __, element) => {
    const bounds = element.getBoundingClientRect();
    setFrame(
      clampFrame(
        { x: bounds.x, y: bounds.y, width: element.offsetWidth, height: element.offsetHeight },
        viewport,
        menuBottom,
      ),
    );
  };

  return (
    <Rnd
      className="settings-rnd z-30"
      size={{ width: frame.width, height: frame.height }}
      position={{ x: frame.x, y: frame.y }}
      bounds="window"
      minWidth={compact ? frame.width : Math.min(desktopMinimum.width, viewport.width)}
      minHeight={minimumHeight}
      maxWidth={viewport.width}
      maxHeight={availableHeight}
      disableDragging={compact}
      enableResizing={!compact}
      dragHandleClassName="settings-drag-handle"
      cancel=".settings-navigation,.settings-scroll-area,button,input,select,label"
      resizeHandleStyles={resizeHandleStyles}
      onDrag={(_, position) =>
        setFrame((currentFrame) =>
          clampFrame({ ...currentFrame, x: position.x, y: position.y }, viewport, menuBottom),
        )
      }
      onDragStop={(_, position) =>
        setFrame((currentFrame) =>
          clampFrame({ ...currentFrame, x: position.x, y: position.y }, viewport, menuBottom),
        )
      }
      onResize={updateFrameFromResize}
      onResizeStop={commitFrameFromResize}
    >
      <section
        ref={windowRef}
        style={{ gridTemplateColumns: `${resolvedSidebarPercent}% 8px minmax(0, 1fr)` }}
        className="settings-window relative grid h-full w-full overflow-hidden rounded-[var(--tienos-radius-window)] border border-white/25 [background:linear-gradient(135deg,rgb(255_255_255/0.16),transparent_36%,rgb(4_10_20/0.16)),var(--tienos-color-window)] text-[var(--tienos-color-text-primary)] shadow-[var(--tienos-shadow-window),0_10px_32px_rgb(2_8_23/0.24),inset_0_1px_0_rgb(255_255_255/0.3),inset_0_-1px_0_rgb(0_0_0/0.16)] backdrop-blur-[32px] backdrop-saturate-[1.4] contrast-more:border-[var(--tienos-color-border)] contrast-more:[background:var(--tienos-color-window)] [@media(prefers-reduced-transparency:reduce)]:[background:var(--tienos-color-window)] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:[background:Canvas] [@media(forced-colors:active)]:shadow-none [@media(forced-colors:active)]:backdrop-filter-none max-[700px]:rounded-[18px]"
        aria-label="System Settings"
      >
        <aside
          className="settings-sidebar min-h-0 min-w-0 p-[8px_4px_8px_8px] max-[700px]:p-[7px_3px_7px_7px]"
          data-floating-panel=""
        >
          <div
            data-sidebar-panel=""
            className="settings-sidebar-panel settings-drag-handle flex h-full min-h-0 flex-col overflow-hidden rounded-[calc(var(--tienos-radius-window)_-_8px)] border border-white/20 [background:linear-gradient(145deg,rgb(255_255_255/0.13),transparent_46%),var(--tienos-color-sidebar)] p-[10px_9px_8px] shadow-[0_12px_30px_rgb(0_0_0/0.2),inset_0_1px_0_rgb(255_255_255/0.25),inset_0_-1px_0_rgb(0_0_0/0.1)] backdrop-blur-[24px] backdrop-saturate-[1.35] contrast-more:border-[var(--tienos-color-border)] contrast-more:[background:var(--tienos-color-sidebar)] [@media(prefers-reduced-transparency:reduce)]:[background:var(--tienos-color-sidebar)] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:[background:Canvas] [@media(forced-colors:active)]:shadow-none [@media(forced-colors:active)]:backdrop-filter-none max-[700px]:rounded-[11px] max-[700px]:p-[7px_6px]"
          >
            <div
              className="settings-drag-handle mx-0.5 mb-[29px] flex touch-none select-none gap-2.5 max-[700px]:mb-5 max-[700px]:gap-[7px]"
              aria-label="Window controls"
            >
              <button
                className="settings-light size-[13px] rounded-[50%] border-0 bg-[#ff5f57] max-[700px]:size-[11px]"
                aria-label="Close System Settings"
                onClick={onClose}
              />
              <button
                className="settings-light size-[13px] rounded-full border-0 bg-[#febc2e] max-[700px]:size-[11px]"
                aria-label="Minimize System Settings"
              />
              <button
                className="settings-light size-[13px] rounded-full border-0 bg-[#28c840] max-[700px]:size-[11px]"
                aria-label="Expand System Settings"
              />
            </div>

            <label
              data-settings-search=""
              className="settings-search flex h-7 items-center gap-[7px] rounded-[11px] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-control)] px-[10px] text-[var(--tienos-color-text-secondary)] [&_input]:min-w-0 [&_input]:w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-[var(--tienos-color-text-primary)] [&_input::placeholder]:text-[var(--tienos-color-text-secondary)] max-[700px]:px-[8px]"
            >
              <FontAwesomeIcon name="magnifying-glass" className="text-xs" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
            </label>

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
                            key={category.label}
                            data-inset-focus=""
                            className="settings-nav-item flex min-h-[33.5px] w-full min-w-0 items-center gap-2.5 rounded-[10px] border-0 bg-transparent p-[4px_8px] text-left text-[var(--tienos-color-text-primary)] hover:bg-[var(--tienos-color-hover)] data-[selected]:bg-[var(--tienos-color-accent)] data-[selected]:text-white data-[selected]:hover:bg-[var(--tienos-color-accent-hover)] data-[selected]:focus-visible:outline-2 data-[selected]:focus-visible:-outline-offset-2 data-[selected]:focus-visible:outline-solid data-[selected]:focus-visible:outline-[var(--tienos-color-focus-on-accent)] contrast-more:shadow-[inset_0_0_0_1px_var(--tienos-color-border)] contrast-more:focus-visible:outline-2 contrast-more:focus-visible:-outline-offset-2 contrast-more:focus-visible:outline-[var(--tienos-color-focus)] contrast-more:data-[selected]:focus-visible:outline-[var(--tienos-color-focus-on-accent)] max-[700px]:gap-1.5 max-[700px]:p-1"
                            aria-label={category.label}
                            data-selected={selected === category.label || undefined}
                            onClick={() => setSelected(category.label)}
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
          className="settings-splitter group relative z-10 touch-none select-none border-0 bg-transparent p-0 outline-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-white/10 before:transition-[width,background-color] hover:before:w-0.5 hover:before:bg-[var(--tienos-color-focus)] focus-visible:before:w-0.5 focus-visible:before:bg-[var(--tienos-color-focus)] active:before:w-1 active:before:bg-[var(--tienos-color-focus)] motion-reduce:before:transition-none [@media(forced-colors:active)]:before:bg-[CanvasText]"
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
        />

        <div className="settings-detail flex min-h-0 min-w-0 flex-col [background:linear-gradient(160deg,rgb(255_255_255/0.07),transparent_42%),var(--tienos-color-detail)] p-[8px_20px_0] shadow-[inset_1px_0_0_rgb(255_255_255/0.08)] contrast-more:[background:var(--tienos-color-detail)] [@media(prefers-reduced-transparency:reduce)]:[background:var(--tienos-color-detail)] [@media(forced-colors:active)]:[background:Canvas] [@media(forced-colors:active)]:shadow-none max-[700px]:p-[12px_10px_0]">
          <div
            className="settings-history settings-drag-handle -ml-3 mb-[9px] flex h-[35px] shrink-0 touch-none select-none items-center self-start overflow-hidden rounded-[22px] border border-[var(--tienos-color-border)] [&_button]:grid [&_button]:h-full [&_button]:w-[36px] [&_button]:place-items-center [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[12px] [&_button]:text-[var(--tienos-color-text-tertiary)] [&>span]:h-6 [&>span]:w-px [&>span]:bg-[var(--tienos-color-separator)] max-[700px]:h-[36px] max-[700px]:[&_button]:w-[38px]"
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
            {selected !== "Appearance" && (
              <header className="settings-hero rounded-[var(--tienos-radius-content)] border border-white/[.015] bg-[var(--tienos-color-content)] p-[23px_32px_19px] text-center max-[700px]:p-[24px_14px] max-[700px]:[&_h2]:text-[22px] [&_h2]:m-0 [&_h2]:text-[23px] [&_h2]:leading-none [&_h2]:tracking-[-0.03em] [&_p]:mx-auto [&_p]:mt-px [&_p]:mb-0 [&_p]:max-w-[600px] [&_p]:text-[var(--tienos-color-text-secondary)] [&_p]:leading-[var(--tienos-leading-body)]">
                <span
                  className={`settings-hero-icon mx-auto mb-[4px] grid size-[54px] place-items-center rounded-[18px] border border-white/20 text-[28px] text-white shadow-[inset_0_1px_rgb(255_255_255/0.2),0_1px_2px_rgb(0_0_0/0.4)] ${selectedCategory.colorClass}`}
                >
                  <FontAwesomeIcon name={selectedCategory.icon} />
                </span>
                <h2>{selectedCategory.label}</h2>
                <p>
                  {selected === "General"
                    ? "Manage your overall setup and preferences for tienOS, including updates, language, sharing, and more."
                    : `Manage ${selectedCategory.label.toLowerCase()} preferences for this tienOS desktop.`}
                </p>
              </header>
            )}

            {selected === "Appearance" ? (
              <div className="grid gap-3 [&_h2]:m-0 [&_h2]:text-[22px] [&_h3]:m-0 [&_h3]:p-[10px_12px_0] [&_h3]:text-[17px]">
                <h2>Appearance</h2>
                <section
                  className="overflow-hidden rounded-[var(--tienos-radius-content)] border border-white/[.03] bg-[var(--tienos-color-content)] p-3.5"
                  aria-label="Appearance style"
                >
                  <div
                    className="flex justify-end gap-3 max-[520px]:flex-col max-[520px]:items-start"
                    role="group"
                    aria-label="Appearance mode"
                  >
                    {(["auto", "light", "dark"] satisfies AppearanceMode[]).map((mode) => (
                      <button
                        key={mode}
                        className={`grid gap-1 border-0 bg-transparent text-center text-[var(--tienos-color-text-secondary)] aria-pressed:font-bold aria-pressed:text-[var(--tienos-color-text-primary)] [&>span]:h-[54px] [&>span]:w-[86px] [&>span]:rounded-lg [&>span]:border-2 [&>span]:border-transparent aria-pressed:[&>span]:border-[var(--tienos-color-accent)] aria-pressed:[&>span]:shadow-[0_0_0_2px_var(--tienos-color-accent)] ${mode === "auto" ? "[&>span]:bg-[linear-gradient(145deg,#70bde8,#20386f_55%,#15181e_56%)]" : mode === "light" ? "[&>span]:bg-[linear-gradient(145deg,#aee6ff,#f5f5f5)]" : "[&>span]:bg-[linear-gradient(145deg,#253f9b,#080b18)]"}`}
                        aria-pressed={appearanceMode === mode}
                        onClick={() => setAppearanceMode(mode)}
                      >
                        <span aria-hidden="true" />
                        {mode[0].toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3.5 flex items-center justify-between border-t border-[var(--tienos-color-separator)] pt-3.5 max-[520px]:flex-col max-[520px]:items-start [&_strong]:block [&_span]:block [&>div>span]:text-[var(--tienos-color-text-secondary)]">
                    <div>
                      <strong>Liquid Glass</strong>
                      <span>Choose your preferred look for Liquid Glass.</span>
                    </div>
                    <div
                      className="flex justify-end gap-3 max-[520px]:flex-col max-[520px]:items-start"
                      role="group"
                      aria-label="Liquid Glass style"
                    >
                      {["Clear", "Tinted"].map((style) => (
                        <button
                          key={style}
                          className="grid gap-1 border-0 bg-transparent text-center text-[var(--tienos-color-text-secondary)] aria-pressed:font-bold aria-pressed:text-[var(--tienos-color-text-primary)] [&>span]:h-[50px] [&>span]:w-[88px] [&>span]:rounded-[9px] [&>span]:border-2 [&>span]:border-transparent [&>span]:bg-[linear-gradient(135deg,rgb(255_240_180/.8),rgb(69_181_255/.55))] aria-pressed:[&>span]:border-[var(--tienos-color-accent)] aria-pressed:[&>span]:shadow-[0_0_0_2px_var(--tienos-color-accent)]"
                          aria-pressed={glassStyle === style}
                          onClick={() => setGlassStyle(style)}
                        >
                          <span aria-hidden="true" />
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <h3>Theme</h3>
                <section
                  className="overflow-hidden rounded-[var(--tienos-radius-content)] border border-white/[.03] bg-[var(--tienos-color-content)] p-3.5"
                  aria-label="Theme"
                >
                  <div className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t [&_select]:rounded-[7px] [&_select]:border-0 [&_select]:bg-white/8 [&_select]:p-[5px_22px_5px_8px]">
                    <span>Color</span>
                    <div
                      className="flex flex-wrap gap-2.5 max-[520px]:py-2"
                      role="group"
                      aria-label="Accent color"
                    >
                      {[
                        "Multicolor",
                        "Blue",
                        "Purple",
                        "Pink",
                        "Red",
                        "Orange",
                        "Yellow",
                        "Green",
                        "Gray",
                      ].map((color) => (
                        <button
                          key={color}
                          className={`size-[30px] rounded-full border-[3px] border-transparent aria-pressed:outline aria-pressed:outline-3 aria-pressed:outline-offset-2 aria-pressed:outline-[var(--tienos-color-accent)] ${color === "Multicolor" ? "bg-[conic-gradient(#f33,#fc3,#3c6,#08f,#b3c,#f33)]" : color === "Blue" ? "bg-[#1686ff]" : color === "Purple" ? "bg-[#9d3ba1]" : color === "Pink" ? "bg-[#ef3d91]" : color === "Red" ? "bg-[#e2343c]" : color === "Orange" ? "bg-[#f57814]" : color === "Yellow" ? "bg-[#ffbd22]" : color === "Green" ? "bg-[#55b83e]" : color === "Gray" ? "bg-[#999]" : ""}`}
                          aria-label={color}
                          aria-pressed={accentColor === color}
                          onClick={() => setAccentColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                  <label className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t [&_select]:rounded-[7px] [&_select]:border-0 [&_select]:bg-white/8 [&_select]:p-[5px_22px_5px_8px] [&_select]:text-inherit">
                    <span>Text highlight color</span>
                    <select
                      aria-label="Text highlight color"
                      value={textHighlightColor}
                      onChange={(event) => setTextHighlightColor(event.target.value)}
                    >
                      {["Automatic", "Blue", "Purple", "Pink", "Red", "Orange", "Yellow", "Green"].map(
                        (color) => (
                          <option key={color}>{color}</option>
                        ),
                      )}
                    </select>
                  </label>
                </section>
                <section
                  className="overflow-hidden rounded-[var(--tienos-radius-content)] border border-white/[.03] bg-[var(--tienos-color-content)] p-3.5"
                  aria-label="Icon and widget style"
                >
                  <div className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t [&>[role=group]]:flex [&>[role=group]]:gap-3 max-[520px]:[&>[role=group]]:flex-wrap">
                    <span>Icon &amp; widget style</span>
                    <div role="group" aria-label="Icon and widget style">
                      {["Default", "Dark", "Clear", "Tinted"].map((style) => (
                        <button
                          key={style}
                          className="grid gap-1 border-0 bg-transparent text-center text-[var(--tienos-color-text-secondary)] aria-pressed:font-bold aria-pressed:text-[var(--tienos-color-text-primary)] aria-pressed:[&>span]:border-[var(--tienos-color-accent)] aria-pressed:[&>span]:shadow-[0_0_0_2px_var(--tienos-color-accent)]"
                          aria-pressed={widgetStyle === style}
                          onClick={() => setWidgetStyle(style)}
                        >
                          <span
                            className={`block size-[34px] rounded-[9px] border-2 border-transparent ${style === "Default" ? "bg-[#1686ff]" : style === "Dark" ? "bg-[#222]" : style === "Clear" ? "bg-[#aaa]" : style === "Tinted" ? "bg-[#35b9ef]" : ""}`}
                          />
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t [&_select]:rounded-[7px] [&_select]:border-0 [&_select]:bg-white/8 [&_select]:p-[5px_22px_5px_8px] [&_select]:text-inherit">
                    <span>Folder color</span>
                    <select
                      aria-label="Folder color"
                      value={folderColor}
                      onChange={(event) => setFolderColor(event.target.value)}
                    >
                      {["Automatic", "Blue", "Purple", "Pink", "Red", "Orange", "Yellow", "Green"].map(
                        (color) => (
                          <option key={color}>{color}</option>
                        ),
                      )}
                    </select>
                  </label>
                </section>
                <h3>Windows</h3>
                <section
                  className="overflow-hidden rounded-[var(--tienos-radius-content)] border border-white/[.03] bg-[var(--tienos-color-content)] p-3.5"
                  aria-label="Windows"
                >
                  <label className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t [&_select]:rounded-[7px] [&_select]:border-0 [&_select]:bg-white/8 [&_select]:p-[5px_22px_5px_8px] [&_select]:text-inherit">
                    <span>Sidebar icon size</span>
                    <select
                      aria-label="Sidebar icon size"
                      value={sidebarIconSize}
                      onChange={(event) => setSidebarIconSize(event.target.value)}
                    >
                      {["Small", "Medium", "Large"].map((size) => (
                        <option key={size}>{size}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t [&_select]:rounded-[7px] [&_select]:border-0 [&_select]:bg-white/8 [&_select]:p-[5px_22px_5px_8px]">
                    <span>Tint window background with wallpaper color</span>
                    <input
                      type="checkbox"
                      checked={wallpaperTint}
                      onChange={(event) => setWallpaperTint(event.target.checked)}
                    />
                  </label>
                </section>
              </div>
            ) : selected === "General" ? (
              <div className="grid gap-[10px] pt-[10px]">
                {generalGroups.map((group, groupIndex) => (
                  <div
                    className="settings-group overflow-hidden rounded-[var(--tienos-radius-content)] border border-white/[.018] bg-[var(--tienos-color-content)]"
                    key={groupIndex}
                  >
                    {group.map(([icon, label]) => (
                      <button
                        data-inset-focus=""
                        className="settings-row relative flex h-[42px] w-full items-center gap-3 border-0 bg-transparent p-[8px_18px] text-left text-[var(--tienos-color-text-primary)] after:absolute after:right-[18px] after:bottom-0 after:left-[50px] after:h-px after:bg-[var(--tienos-color-separator)] after:content-[''] last:after:hidden hover:bg-[var(--tienos-color-hover)] contrast-more:shadow-[inset_0_0_0_1px_var(--tienos-color-border)] contrast-more:focus-visible:outline-2 contrast-more:focus-visible:-outline-offset-2 contrast-more:focus-visible:outline-[var(--tienos-color-focus)] [@media(forced-colors:active)]:focus-visible:-outline-offset-2 max-[700px]:p-[8px_12px]"
                        key={label}
                      >
                        <span className="settings-row-icon grid size-[22px] place-items-center rounded-md border border-white/20 bg-[#292a2c] text-xs text-white shadow-[inset_0_1px_rgb(255_255_255/0.2),0_1px_2px_rgb(0_0_0/0.4)]">
                          <FontAwesomeIcon name={icon} />
                        </span>
                        <span>{label}</span>
                        <FontAwesomeIcon
                          name="chevron-right"
                          className="settings-chevron ml-auto text-[10px] text-[var(--tienos-color-text-tertiary)]"
                        />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3.5 grid min-h-60 content-center place-items-center gap-3.5 rounded-[15px] bg-[var(--tienos-color-content)] text-[var(--tienos-color-text-secondary)]">
                <span
                  className={`settings-icon grid size-5 shrink-0 place-items-center rounded-[7px] border border-white/20 text-[11px] text-white shadow-[inset_0_1px_rgb(255_255_255/0.2),0_1px_2px_rgb(0_0_0/0.4)] ${selectedCategory.colorClass}`}
                >
                  <FontAwesomeIcon name={selectedCategory.icon} />
                </span>
                <p>{selectedCategory.label} controls are ready for configuration.</p>
              </div>
            )}
          </SettingsScrollArea>
        </div>
      </section>
    </Rnd>
  );
}
