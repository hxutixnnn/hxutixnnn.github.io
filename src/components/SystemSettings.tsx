import { useMemo, useState } from "react";
import { Rnd } from "react-rnd";

type SystemSettingsProps = {
  onClose: () => void;
};

type SettingCategory = {
  icon: string;
  label: string;
  color: string;
};

const categories: SettingCategory[] = [
  { icon: "⌁", label: "Wi-Fi", color: "#2f8cff" },
  { icon: "ᛒ", label: "Bluetooth", color: "#1686ff" },
  { icon: "◎", label: "Network", color: "#1997ff" },
  { icon: "◉", label: "VPN", color: "#1488de" },
  { icon: "◉", label: "Battery", color: "#55c760" },
  { icon: "⚙", label: "General", color: "#8c8c91" },
  { icon: "◌", label: "Accessibility", color: "#238dff" },
  { icon: "◐", label: "Appearance", color: "#a4a4a8" },
  { icon: "✦", label: "Intelligence", color: "#ae72e8" },
  { icon: "▣", label: "Desktop & Dock", color: "#85858a" },
  { icon: "☀", label: "Displays", color: "#258cff" },
  { icon: "☷", label: "Menu Bar", color: "#85858a" },
  { icon: "⌕", label: "Spotlight", color: "#307ed2" },
  { icon: "❉", label: "Wallpaper", color: "#31a6c8" },
  { icon: "◖", label: "Sound", color: "#ec5965" },
  { icon: "⌨", label: "Keyboard", color: "#85858a" },
  { icon: "▱", label: "Trackpad", color: "#85858a" },
  { icon: "▤", label: "Printers & Scanners", color: "#85858a" },
  { icon: "⛨", label: "Privacy & Security", color: "#4389e9" },
];

const generalGroups = [
  [
    ["▱", "About"],
    ["⚙", "Software Update"],
    ["▰", "Storage"],
  ],
  [["✦", "Coverage & Warranty"]],
  [["◎", "Sharing & Continuity"]],
  [
    ["⌨", "AutoFill & Passwords"],
    ["▦", "Date & Time"],
    ["◉", "Language & Region"],
    ["☷", "Login Items & Extensions"],
    ["♙", "Sharing"],
    ["⌁", "Transfer or Reset"],
  ],
];

export function SystemSettings({ onClose }: SystemSettingsProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("General");
  const compact = window.innerWidth <= 700;
  const initialFrame = compact
    ? { x: 8, y: 46, width: window.innerWidth - 16, height: window.innerHeight - 54 }
    : {
        x: window.innerWidth * 0.106,
        y: window.innerHeight * 0.105,
        width: Math.min(1120, window.innerWidth * 0.788),
        height: Math.min(860, window.innerHeight * 0.727),
      };
  const filteredCategories = useMemo(
    () => categories.filter(({ label }) => label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const selectedCategory = categories.find(({ label }) => label === selected) ?? categories[5];

  return (
    <Rnd
      className="settings-rnd"
      default={initialFrame}
      bounds="window"
      minWidth={compact ? 304 : 680}
      minHeight={compact ? 360 : 520}
      disableDragging={compact}
      enableResizing={!compact}
      dragHandleClassName="settings-window"
      cancel=".settings-navigation,.settings-scroll-area,button,input"
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
            <span aria-hidden="true">⌕</span>
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
            <span className="settings-family-avatars" aria-hidden="true">
              <i>✦</i>
              <i>T</i>
              <i>+</i>
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
                <span className="settings-icon" style={{ background: category.color }} aria-hidden="true">
                  {category.icon}
                </span>
                <span>{category.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="settings-content">
          <div className="settings-history" aria-label="Navigation history">
            <button aria-label="Back" disabled>
              ‹
            </button>
            <span />
            <button aria-label="Forward" disabled>
              ›
            </button>
          </div>

          <div className="settings-scroll-area">
            <header className="settings-hero">
              <span
                className="settings-hero-icon"
                style={{ background: selectedCategory.color }}
                aria-hidden="true"
              >
                {selectedCategory.icon}
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
                        <span className="settings-row-icon" aria-hidden="true">
                          {icon}
                        </span>
                        <span>{label}</span>
                        <span className="settings-chevron" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="settings-empty-panel">
                <span
                  className="settings-icon"
                  style={{ background: selectedCategory.color }}
                  aria-hidden="true"
                >
                  {selectedCategory.icon}
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
