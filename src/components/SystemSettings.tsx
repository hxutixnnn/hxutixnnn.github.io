import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { Rnd } from "react-rnd";
import { FontAwesomeIcon, type FontAwesomeIconName } from "./FontAwesomeIcon";

type SystemSettingsProps = {
  onClose: () => void;
};

type SettingCategory = {
  icon: FontAwesomeIconName;
  label: string;
  color: string;
};

type GeneralSetting = [icon: FontAwesomeIconName, label: string];

const categories: SettingCategory[] = [
  { icon: "gear", label: "General", color: "#8c8c91" },
  { icon: "circle-half-stroke", label: "Appearance", color: "#a4a4a8" },
  { icon: "desktop", label: "Desktop & Dock", color: "#85858a" },
  { icon: "display", label: "Displays", color: "#258cff" },
  { icon: "bars", label: "Menu Bar", color: "#85858a" },
  { icon: "magnifying-glass", label: "Spotlight", color: "#307ed2" },
  { icon: "image", label: "Wallpaper", color: "#31a6c8" },
  { icon: "sparkles", label: "Notifications", color: "#ec5965" },
  { icon: "volume-high", label: "Sound", color: "#ec5965" },
  { icon: "key", label: "Lock Screen", color: "#85858a" },
  { icon: "keyboard", label: "Keyboard", color: "#85858a" },
  { icon: "computer-mouse", label: "Trackpad", color: "#85858a" },
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
const desktopMinimum = { width: 680, height: 520 };

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
  viewportRef?: RefObject<HTMLDivElement | null>;
};

function SettingsScrollArea({ children, className, label, viewportRef }: SettingsScrollAreaProps) {
  return (
    <ScrollArea.Root className={`settings-base-scroll-area ${className}`}>
      <ScrollArea.Viewport
        ref={(element) => {
          if (viewportRef) viewportRef.current = element;
        }}
        className="settings-scroll-viewport"
        aria-label={label}
        tabIndex={0}
      >
        <ScrollArea.Content className="settings-scroll-content">{children}</ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="settings-scrollbar" orientation="vertical" keepMounted>
        <ScrollArea.Thumb className="settings-scroll-thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

function compactFrame(viewport: Viewport): SettingsFrame {
  return {
    x: 8,
    y: 46,
    width: Math.max(0, viewport.width - 16),
    height: Math.max(0, viewport.height - 54),
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

function clampFrame(frame: SettingsFrame, viewport: Viewport): SettingsFrame {
  const width = clamp(frame.width, Math.min(desktopMinimum.width, viewport.width), viewport.width);
  const height = clamp(frame.height, Math.min(desktopMinimum.height, viewport.height), viewport.height);

  return {
    x: clamp(frame.x, 0, viewport.width - width),
    y: clamp(frame.y, 0, viewport.height - height),
    width,
    height,
  };
}

export function SystemSettings({ onClose }: SystemSettingsProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("General");
  const [appearanceMode, setAppearanceMode] = useState("Auto");
  const [glassStyle, setGlassStyle] = useState("Clear");
  const [accentColor, setAccentColor] = useState("Multicolor");
  const [textHighlightColor, setTextHighlightColor] = useState("Automatic");
  const [widgetStyle, setWidgetStyle] = useState("Default");
  const [folderColor, setFolderColor] = useState("Automatic");
  const [sidebarIconSize, setSidebarIconSize] = useState("Medium");
  const [wallpaperTint, setWallpaperTint] = useState(true);
  const [viewport, setViewport] = useState(readViewport);
  const compact = viewport.width <= compactBreakpoint;
  const [frame, setFrame] = useState(() => (compact ? compactFrame(viewport) : desktopFrame(viewport)));
  const compactRef = useRef(compact);
  const detailsViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateViewport = () => {
      const nextViewport = readViewport();
      const nextCompact = nextViewport.width <= compactBreakpoint;
      const modeChanged = compactRef.current !== nextCompact;
      compactRef.current = nextCompact;

      setViewport(nextViewport);
      setFrame((currentFrame) => {
        if (nextCompact) {
          return compactFrame(nextViewport);
        }

        return modeChanged ? desktopFrame(nextViewport) : clampFrame(currentFrame, nextViewport);
      });
    };

    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
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

  return (
    <Rnd
      className="settings-rnd"
      size={{ width: frame.width, height: frame.height }}
      position={{ x: frame.x, y: frame.y }}
      bounds="window"
      minWidth={compact ? frame.width : Math.min(desktopMinimum.width, viewport.width)}
      minHeight={compact ? frame.height : Math.min(desktopMinimum.height, viewport.height)}
      maxWidth={viewport.width}
      maxHeight={viewport.height}
      disableDragging={compact}
      enableResizing={!compact}
      dragHandleClassName="settings-window"
      cancel=".settings-navigation,.settings-scroll-area,button,input"
      onDragStop={(_, position) =>
        setFrame((currentFrame) => clampFrame({ ...currentFrame, x: position.x, y: position.y }, viewport))
      }
      onResizeStop={(_, __, element, ___, position) =>
        setFrame(
          clampFrame(
            {
              x: position.x,
              y: position.y,
              width: element.offsetWidth,
              height: element.offsetHeight,
            },
            viewport,
          ),
        )
      }
    >
      <section className="settings-window" aria-label="System Settings">
        <aside className="settings-sidebar" data-floating-panel="">
          <div className="settings-sidebar-panel">
            <div className="settings-traffic-lights" aria-label="Window controls">
              <button
                className="settings-light settings-light-close"
                aria-label="Close System Settings"
                onClick={onClose}
              />
              <button
                className="settings-light settings-light-minimize"
                aria-label="Minimize System Settings"
              />
              <button className="settings-light settings-light-expand" aria-label="Expand System Settings" />
            </div>

            <label className="settings-search">
              <FontAwesomeIcon name="magnifying-glass" className="settings-search-icon" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
            </label>

            <div className="settings-account">
              <div className="settings-avatar">T</div>
              <div>
                <strong>Tien Nguyen</strong>
                <span>tienOS Account</span>
              </div>
            </div>

            <button className="settings-family">
              <span className="settings-family-avatars">
                <FontAwesomeIcon name="people-group" />
              </span>
              <span>Family</span>
            </button>

            <SettingsScrollArea className="settings-navigation" label="Settings categories">
              <nav aria-label="Settings categories">
                {filteredCategoryGroups.map(
                  (group, groupIndex) =>
                    group.length > 0 && (
                      <div
                        className="settings-nav-group"
                        role="group"
                        aria-label={groupIndex === 0 ? "System" : "Personal"}
                        key={groupIndex}
                      >
                        {group.map((category) => (
                          <button
                            key={category.label}
                            className="settings-nav-item"
                            aria-label={category.label}
                            data-selected={selected === category.label || undefined}
                            onClick={() => setSelected(category.label)}
                          >
                            <span className="settings-icon" style={{ background: category.color }}>
                              <FontAwesomeIcon name={category.icon} />
                            </span>
                            <span>{category.label}</span>
                          </button>
                        ))}
                      </div>
                    ),
                )}
              </nav>
            </SettingsScrollArea>
          </div>
        </aside>

        <div className="settings-content">
          <div className="settings-history" aria-label="Navigation history">
            <button aria-label="Back" disabled>
              <FontAwesomeIcon name="chevron-left" />
            </button>
            <span />
            <button aria-label="Forward" disabled>
              <FontAwesomeIcon name="chevron-right" />
            </button>
          </div>

          <SettingsScrollArea
            className="settings-scroll-area"
            label="Settings details"
            viewportRef={detailsViewportRef}
          >
            {selected !== "Appearance" && (
              <header className="settings-hero">
                <span className="settings-hero-icon" style={{ background: selectedCategory.color }}>
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
              <div className="appearance-settings">
                <h2>Appearance</h2>
                <section className="appearance-panel appearance-overview" aria-label="Appearance style">
                  <div className="appearance-choice-row" role="group" aria-label="Appearance mode">
                    {["Auto", "Light", "Dark"].map((mode) => (
                      <button
                        key={mode}
                        className={`appearance-preview appearance-preview-${mode.toLowerCase()}`}
                        aria-pressed={appearanceMode === mode}
                        onClick={() => setAppearanceMode(mode)}
                      >
                        <span aria-hidden="true" />
                        {mode}
                      </button>
                    ))}
                  </div>
                  <div className="appearance-liquid-glass">
                    <div>
                      <strong>Liquid Glass</strong>
                      <span>Choose your preferred look for Liquid Glass.</span>
                    </div>
                    <div className="appearance-choice-row" role="group" aria-label="Liquid Glass style">
                      {["Clear", "Tinted"].map((style) => (
                        <button
                          key={style}
                          className="appearance-glass-choice"
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
                <section className="appearance-panel appearance-theme" aria-label="Theme">
                  <div className="appearance-setting-row">
                    <span>Color</span>
                    <div className="appearance-colors" role="group" aria-label="Accent color">
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
                          className={`appearance-color appearance-color-${color.toLowerCase()}`}
                          aria-label={color}
                          aria-pressed={accentColor === color}
                          onClick={() => setAccentColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                  <label className="appearance-setting-row">
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
                <section className="appearance-panel" aria-label="Icon and widget style">
                  <div className="appearance-setting-row appearance-widget-row">
                    <span>Icon &amp; widget style</span>
                    <div role="group" aria-label="Icon and widget style">
                      {["Default", "Dark", "Clear", "Tinted"].map((style) => (
                        <button
                          key={style}
                          aria-pressed={widgetStyle === style}
                          onClick={() => setWidgetStyle(style)}
                        >
                          <span className={`appearance-widget appearance-widget-${style.toLowerCase()}`} />
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="appearance-setting-row">
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
                <section className="appearance-panel" aria-label="Windows">
                  <label className="appearance-setting-row">
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
                  <label className="appearance-setting-row">
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
              <div className="settings-groups">
                {generalGroups.map((group, groupIndex) => (
                  <div className="settings-group" key={groupIndex}>
                    {group.map(([icon, label]) => (
                      <button className="settings-row" key={label}>
                        <span className="settings-row-icon">
                          <FontAwesomeIcon name={icon} />
                        </span>
                        <span>{label}</span>
                        <FontAwesomeIcon name="chevron-right" className="settings-chevron" />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="settings-empty-panel">
                <span className="settings-icon" style={{ background: selectedCategory.color }}>
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
