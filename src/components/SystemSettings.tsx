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
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { Switch } from "@base-ui/react/switch";
import { FontAwesomeIcon, type FontAwesomeIconName } from "./FontAwesomeIcon";
import {
  clamp,
  defaultCompactFrame,
  defaultDesktopFrame,
  sidebarBounds,
  type Frame,
  type Rect,
  type Workspace,
} from "../windows/geometry";
import { SettingsSelect } from "./SettingsControls";
import { useAppearanceStore, type AppearanceMode } from "../stores/appearance";
import { WindowFrame } from "../windows/WindowFrame";
import {
  initialSingleWindowState,
  type SingleWindowState,
  type WindowEffect,
  type WindowEvent,
} from "../windows/singleWindowMachine";

type SystemSettingsProps = {
  windowState?: SingleWindowState;
  effects?: readonly WindowEffect[];
  onEffectsConsumed?: () => void;
  onEvent?: (event: WindowEvent) => void;
  workspace?: Workspace;
  dockTargetRectProvider?: () => Rect | null;
};

const ignoreWindowEvent = () => undefined;

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

export function SystemSettings({
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
  const [selected, setSelected] = useState("General");
  const appearanceMode = useAppearanceStore((state) => state.mode);
  const pendingAppearanceMode = useAppearanceStore((state) => state.pendingMode);
  const setAppearanceMode = useAppearanceStore((state) => state.setMode);
  const [glassStyle, setGlassStyle] = useState("Clear");
  const [accentColor, setAccentColor] = useState("Multicolor");
  const [textHighlightColor, setTextHighlightColor] = useState("Automatic");
  const [widgetStyle, setWidgetStyle] = useState("Default");
  const [folderColor, setFolderColor] = useState("Automatic");
  const [sidebarIconSize, setSidebarIconSize] = useState("Medium");
  const [wallpaperTint, setWallpaperTint] = useState(true);
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
      [categories.slice(0, 7), categories.slice(7)].map((group) =>
        group.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase())),
      ),
    [query],
  );
  const selectedCategory = categories.find(({ label }) => label === selected) ?? categories[0];
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
                    <RadioGroup
                      className="flex justify-end gap-3 max-[520px]:flex-col max-[520px]:items-start"
                      aria-label="Appearance mode"
                      value={pendingAppearanceMode ?? appearanceMode}
                      onValueChange={(mode) => void setAppearanceMode(mode)}
                    >
                      {(["auto", "light", "dark"] satisfies AppearanceMode[]).map((mode) => (
                        <Radio.Root
                          key={mode}
                          value={mode}
                          aria-label={mode[0].toUpperCase() + mode.slice(1)}
                          className={`grid cursor-default gap-1 bg-transparent text-center text-[var(--tienos-color-text-secondary)] data-[checked]:font-bold data-[checked]:text-[var(--tienos-color-text-primary)] focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tienos-color-focus)] [&>span]:h-[54px] [&>span]:w-[86px] [&>span]:rounded-lg [&>span]:border-2 [&>span]:border-transparent data-[checked]:[&>span]:border-[var(--tienos-color-accent)] data-[checked]:[&>span]:shadow-[0_0_0_2px_var(--tienos-color-accent)] ${mode === "auto" ? "[&>span]:bg-[linear-gradient(145deg,#70bde8,#20386f_55%,#15181e_56%)]" : mode === "light" ? "[&>span]:bg-[linear-gradient(145deg,#aee6ff,#f5f5f5)]" : "[&>span]:bg-[linear-gradient(145deg,#253f9b,#080b18)]"}`}
                        >
                          <span aria-hidden="true" />
                          {mode[0].toUpperCase() + mode.slice(1)}
                        </Radio.Root>
                      ))}
                    </RadioGroup>
                    <div className="mt-3.5 flex items-center justify-between border-t border-[var(--tienos-color-separator)] pt-3.5 max-[520px]:flex-col max-[520px]:items-start [&_strong]:block [&_span]:block [&>div>span]:text-[var(--tienos-color-text-secondary)]">
                      <div>
                        <strong>Liquid Glass</strong>
                        <span>Choose your preferred look for Liquid Glass.</span>
                      </div>
                      <RadioGroup
                        className="flex justify-end gap-3 max-[520px]:flex-col max-[520px]:items-start"
                        aria-label="Liquid Glass style"
                        value={glassStyle}
                        onValueChange={setGlassStyle}
                      >
                        {["Clear", "Tinted"].map((style) => (
                          <Radio.Root
                            key={style}
                            value={style}
                            aria-label={style}
                            className="grid cursor-default gap-1 bg-transparent text-center text-[var(--tienos-color-text-secondary)] data-[checked]:font-bold data-[checked]:text-[var(--tienos-color-text-primary)] focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tienos-color-focus)] [&>span]:h-[50px] [&>span]:w-[88px] [&>span]:rounded-[9px] [&>span]:border-2 [&>span]:border-transparent [&>span]:bg-[linear-gradient(135deg,rgb(255_240_180/.8),rgb(69_181_255/.55))] data-[checked]:[&>span]:border-[var(--tienos-color-accent)] data-[checked]:[&>span]:shadow-[0_0_0_2px_var(--tienos-color-accent)]"
                          >
                            <span aria-hidden="true" />
                            {style}
                          </Radio.Root>
                        ))}
                      </RadioGroup>
                    </div>
                  </section>

                  <h3>Theme</h3>
                  <section
                    className="overflow-hidden rounded-[var(--tienos-radius-content)] border border-white/[.03] bg-[var(--tienos-color-content)] p-3.5"
                    aria-label="Theme"
                  >
                    <div className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t [&_select]:rounded-[7px] [&_select]:border-0 [&_select]:bg-white/8 [&_select]:p-[5px_22px_5px_8px]">
                      <span>Color</span>
                      <RadioGroup
                        className="flex flex-wrap gap-2.5 max-[520px]:py-2"
                        aria-label="Accent color"
                        value={accentColor}
                        onValueChange={setAccentColor}
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
                          <Radio.Root
                            key={color}
                            value={color}
                            aria-label={color}
                            className={`size-[30px] cursor-default rounded-full border-[3px] border-transparent data-[checked]:outline data-[checked]:outline-3 data-[checked]:outline-offset-2 data-[checked]:outline-[var(--tienos-color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tienos-color-focus)] ${color === "Multicolor" ? "bg-[conic-gradient(#f33,#fc3,#3c6,#08f,#b3c,#f33)]" : color === "Blue" ? "bg-[#1686ff]" : color === "Purple" ? "bg-[#9d3ba1]" : color === "Pink" ? "bg-[#ef3d91]" : color === "Red" ? "bg-[#e2343c]" : color === "Orange" ? "bg-[#f57814]" : color === "Yellow" ? "bg-[#ffbd22]" : color === "Green" ? "bg-[#55b83e]" : color === "Gray" ? "bg-[#999]" : ""}`}
                          />
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t">
                      <span>Text highlight color</span>
                      <SettingsSelect
                        label="Text highlight color"
                        value={textHighlightColor}
                        onValueChange={setTextHighlightColor}
                        options={["Automatic", "Blue", "Purple", "Pink", "Red", "Orange", "Yellow", "Green"]}
                      />
                    </div>
                  </section>
                  <section
                    className="overflow-hidden rounded-[var(--tienos-radius-content)] border border-white/[.03] bg-[var(--tienos-color-content)] p-3.5"
                    aria-label="Icon and widget style"
                  >
                    <div className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t [&>[role=radiogroup]]:flex [&>[role=radiogroup]]:gap-3 max-[520px]:[&>[role=radiogroup]]:flex-wrap">
                      <span>Icon &amp; widget style</span>
                      <RadioGroup
                        aria-label="Icon and widget style"
                        value={widgetStyle}
                        onValueChange={setWidgetStyle}
                      >
                        {["Default", "Dark", "Clear", "Tinted"].map((style) => (
                          <Radio.Root
                            key={style}
                            value={style}
                            aria-label={style}
                            className="grid cursor-default gap-1 bg-transparent text-center text-[var(--tienos-color-text-secondary)] data-[checked]:font-bold data-[checked]:text-[var(--tienos-color-text-primary)] data-[checked]:[&>span]:border-[var(--tienos-color-accent)] data-[checked]:[&>span]:shadow-[0_0_0_2px_var(--tienos-color-accent)] focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tienos-color-focus)]"
                          >
                            <span
                              className={`block size-[34px] rounded-[9px] border-2 border-transparent ${style === "Default" ? "bg-[#1686ff]" : style === "Dark" ? "bg-[#222]" : style === "Clear" ? "bg-[#aaa]" : style === "Tinted" ? "bg-[#35b9ef]" : ""}`}
                            />
                            {style}
                          </Radio.Root>
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t">
                      <span>Folder color</span>
                      <SettingsSelect
                        label="Folder color"
                        value={folderColor}
                        onValueChange={setFolderColor}
                        options={["Automatic", "Blue", "Purple", "Pink", "Red", "Orange", "Yellow", "Green"]}
                      />
                    </div>
                  </section>
                  <h3>Windows</h3>
                  <section
                    className="overflow-hidden rounded-[var(--tienos-radius-content)] border border-white/[.03] bg-[var(--tienos-color-content)] p-3.5"
                    aria-label="Windows"
                  >
                    <div className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t">
                      <span>Sidebar icon size</span>
                      <SettingsSelect
                        label="Sidebar icon size"
                        value={sidebarIconSize}
                        onValueChange={setSidebarIconSize}
                        options={["Small", "Medium", "Large"]}
                      />
                    </div>
                    <div className="flex min-h-12 items-center justify-between gap-3 border-[var(--tienos-color-separator)] max-[520px]:flex-col max-[520px]:items-start [&+&]:border-t">
                      <label htmlFor="wallpaper-tint">Tint window background with wallpaper color</label>
                      <Switch.Root
                        id="wallpaper-tint"
                        checked={wallpaperTint}
                        onCheckedChange={setWallpaperTint}
                        className="relative h-6 w-10 rounded-full bg-[var(--tienos-color-control)] shadow-inner transition-colors data-[checked]:bg-[var(--tienos-color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tienos-color-focus)]"
                      >
                        <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[checked]:translate-x-[18px] motion-reduce:transition-none" />
                      </Switch.Root>
                    </div>
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
        </>
      )}
    </WindowFrame>
  );

  return settingsWindow;
}
