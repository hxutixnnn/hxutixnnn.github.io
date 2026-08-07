import { useEffect, useMemo, useRef, useState } from "react";
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
  { icon: "wifi", label: "Wi-Fi", color: "#2f8cff" },
  { icon: "bluetooth", label: "Bluetooth", color: "#1686ff" },
  { icon: "network-wired", label: "Network", color: "#1997ff" },
  { icon: "shield-halved", label: "VPN", color: "#1488de" },
  { icon: "battery-half", label: "Battery", color: "#55c760" },
  { icon: "gear", label: "General", color: "#8c8c91" },
  { icon: "universal-access", label: "Accessibility", color: "#238dff" },
  { icon: "circle-half-stroke", label: "Appearance", color: "#a4a4a8" },
  { icon: "sparkles", label: "Intelligence", color: "#ae72e8" },
  { icon: "desktop", label: "Desktop & Dock", color: "#85858a" },
  { icon: "display", label: "Displays", color: "#258cff" },
  { icon: "bars", label: "Menu Bar", color: "#85858a" },
  { icon: "magnifying-glass", label: "Spotlight", color: "#307ed2" },
  { icon: "image", label: "Wallpaper", color: "#31a6c8" },
  { icon: "volume-high", label: "Sound", color: "#ec5965" },
  { icon: "keyboard", label: "Keyboard", color: "#85858a" },
  { icon: "computer-mouse", label: "Trackpad", color: "#85858a" },
  { icon: "scanner", label: "Printers & Scanners", color: "#85858a" },
  { icon: "shield-halved", label: "Privacy & Security", color: "#4389e9" },
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
  const [viewport, setViewport] = useState(readViewport);
  const compact = viewport.width <= compactBreakpoint;
  const [frame, setFrame] = useState(() => (compact ? compactFrame(viewport) : desktopFrame(viewport)));
  const compactRef = useRef(compact);

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
  const filteredCategories = useMemo(
    () => categories.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const selectedCategory = categories.find(({ label }) => label === selected) ?? categories[5];

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
        <aside className="settings-sidebar">
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

          <nav className="settings-navigation" aria-label="Settings categories">
            {filteredCategories.map((category) => (
              <button
                key={category.label}
                className="settings-nav-item"
                data-selected={selected === category.label || undefined}
                onClick={() => setSelected(category.label)}
              >
                <span className="settings-icon" style={{ background: category.color }}>
                  <FontAwesomeIcon name={category.icon} />
                </span>
                <span>{category.label}</span>
              </button>
            ))}
          </nav>
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

          <div className="settings-scroll-area">
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

            {selected === "General" ? (
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
          </div>
        </div>
      </section>
    </Rnd>
  );
}
