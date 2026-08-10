import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Switch } from "@base-ui/react/switch";
import { useState } from "react";
import { SettingsSelect } from "../../../components/SettingsControls";
import { useAppearanceStore, type AppearanceMode } from "../../../stores/appearance";

export function AppearancePane() {
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

  return (
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
            {["Multicolor", "Blue", "Purple", "Pink", "Red", "Orange", "Yellow", "Green", "Gray"].map(
              (color) => (
                <Radio.Root
                  key={color}
                  value={color}
                  aria-label={color}
                  className={`size-[30px] cursor-default rounded-full border-[3px] border-transparent data-[checked]:outline data-[checked]:outline-3 data-[checked]:outline-offset-2 data-[checked]:outline-[var(--tienos-color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tienos-color-focus)] ${color === "Multicolor" ? "bg-[conic-gradient(#f33,#fc3,#3c6,#08f,#b3c,#f33)]" : color === "Blue" ? "bg-[#1686ff]" : color === "Purple" ? "bg-[#9d3ba1]" : color === "Pink" ? "bg-[#ef3d91]" : color === "Red" ? "bg-[#e2343c]" : color === "Orange" ? "bg-[#f57814]" : color === "Yellow" ? "bg-[#ffbd22]" : color === "Green" ? "bg-[#55b83e]" : color === "Gray" ? "bg-[#999]" : ""}`}
                />
              ),
            )}
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
          <RadioGroup aria-label="Icon and widget style" value={widgetStyle} onValueChange={setWidgetStyle}>
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
  );
}
