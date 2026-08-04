import { useEffect, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import { Switch } from "@base-ui/react/switch";
import { loadSettings, saveSettings } from "../store/persistence";
import type { OsSettings } from "../store/persistence";
import { ControlCenterIcon } from "./StatusIcons";

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="cc-row">
      <span className="cc-row__label" id={`cc-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {label}
      </span>
      <Switch.Root
        className="cc-switch"
        checked={checked}
        onCheckedChange={onChange}
        aria-labelledby={`cc-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Switch.Thumb className="cc-switch__thumb" />
      </Switch.Root>
    </div>
  );
}

function LevelSlider({
  label,
  value,
  onChange,
  onCommitted,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCommitted: (value: number) => void;
}) {
  return (
    <div className="cc-level">
      <Slider.Root
        className="cc-slider"
        value={value}
        min={0}
        max={1}
        step={0.01}
        onValueChange={onChange}
        onValueCommitted={onCommitted}
      >
        <Slider.Label className="cc-level__label">{label}</Slider.Label>
        <Slider.Control className="cc-slider__control">
          <Slider.Track className="cc-slider__track">
            <Slider.Indicator className="cc-slider__indicator" />
            <Slider.Thumb className="cc-slider__thumb" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}

export function ControlCenter({
  mobile,
  announce,
}: {
  mobile: boolean;
  announce: (message: string) => void;
}) {
  const [settings, setSettings] = useState<OsSettings>(() => loadSettings());

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--os-brightness", String(settings.brightness));
    root.style.setProperty("--os-volume", String(settings.volume));
    root.dataset.appearance = settings.appearance;
    root.dataset.focus = settings.focus ? "on" : "off";
    saveSettings(settings);
  }, [settings]);

  if (mobile) return null;

  function update(patch: Partial<OsSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        className="menu-bar__icon-button"
        aria-label="Control Center"
        data-control-center-trigger
      >
        <ControlCenterIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="cc-positioner" side="bottom" align="end" sideOffset={6}>
          <Popover.Popup className="cc-panel glass-surface" aria-label="Control Center">
            <div className="cc-grid">
              <ToggleRow label="Wi-Fi" checked={settings.wifi} onChange={(wifi) => update({ wifi })} />
              <ToggleRow
                label="Bluetooth"
                checked={settings.bluetooth}
                onChange={(bluetooth) => update({ bluetooth })}
              />
              <ToggleRow
                label="AirDrop"
                checked={settings.airdrop}
                onChange={(airdrop) => update({ airdrop })}
              />
              <ToggleRow label="Focus" checked={settings.focus} onChange={(focus) => update({ focus })} />
              <ToggleRow
                label="Appearance"
                checked={settings.appearance === "light"}
                onChange={(light) => update({ appearance: light ? "light" : "dark" })}
              />
            </div>
            <div className="cc-levels">
              <LevelSlider
                label="Brightness"
                value={settings.brightness}
                onChange={(brightness) => update({ brightness })}
                onCommitted={(brightness) => announce(`Brightness ${Math.round(brightness * 100)} percent`)}
              />
              <LevelSlider
                label="Volume"
                value={settings.volume}
                onChange={(volume) => update({ volume })}
                onCommitted={(volume) => announce(`Volume ${Math.round(volume * 100)} percent`)}
              />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
