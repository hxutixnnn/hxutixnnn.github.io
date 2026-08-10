import type { ComponentType, Dispatch, SetStateAction } from "react";
import type { FontAwesomeIconName } from "../../components/FontAwesomeIcon";
import { AppearancePane } from "./panes/AppearancePane";
import type { AppearanceDemoSettings } from "./panes/AppearancePane";
import { GeneralPane } from "./panes/GeneralPane";
import { PlaceholderPane } from "./panes/PlaceholderPane";

export type SettingsPaneMetadata = Readonly<{
  id: string;
  icon: FontAwesomeIconName;
  label: string;
  colorClass: string;
  group: "system" | "personal";
  hideHero?: boolean;
}>;

type SettingsPaneProps = {
  pane: SettingsPaneMetadata;
  demoSettings: AppearanceDemoSettings;
  onDemoSettingsChange: Dispatch<SetStateAction<AppearanceDemoSettings>>;
};
type SettingsPaneDescriptor = SettingsPaneMetadata &
  Readonly<{ Component: ComponentType<SettingsPaneProps> }>;

export const settingsPanes = [
  {
    id: "general",
    icon: "gear",
    label: "General",
    colorClass: "bg-[#8c8c91]",
    group: "system",
    Component: GeneralPane,
  },
  {
    id: "appearance",
    icon: "circle-half-stroke",
    label: "Appearance",
    colorClass: "bg-[#a4a4a8]",
    group: "system",
    hideHero: true,
    Component: AppearancePane,
  },
  {
    id: "desktop-dock",
    icon: "desktop",
    label: "Desktop & Dock",
    colorClass: "bg-[#85858a]",
    group: "system",
    Component: PlaceholderPane,
  },
  {
    id: "displays",
    icon: "display",
    label: "Displays",
    colorClass: "bg-[#258cff]",
    group: "system",
    Component: PlaceholderPane,
  },
  {
    id: "menu-bar",
    icon: "bars",
    label: "Menu Bar",
    colorClass: "bg-[#85858a]",
    group: "system",
    Component: PlaceholderPane,
  },
  {
    id: "spotlight",
    icon: "magnifying-glass",
    label: "Spotlight",
    colorClass: "bg-[#307ed2]",
    group: "system",
    Component: PlaceholderPane,
  },
  {
    id: "wallpaper",
    icon: "image",
    label: "Wallpaper",
    colorClass: "bg-[#31a6c8]",
    group: "system",
    Component: PlaceholderPane,
  },
  {
    id: "notifications",
    icon: "sparkles",
    label: "Notifications",
    colorClass: "bg-[#ec5965]",
    group: "personal",
    Component: PlaceholderPane,
  },
  {
    id: "sound",
    icon: "volume-high",
    label: "Sound",
    colorClass: "bg-[#ec5965]",
    group: "personal",
    Component: PlaceholderPane,
  },
  {
    id: "lock-screen",
    icon: "key",
    label: "Lock Screen",
    colorClass: "bg-[#85858a]",
    group: "personal",
    Component: PlaceholderPane,
  },
  {
    id: "keyboard",
    icon: "keyboard",
    label: "Keyboard",
    colorClass: "bg-[#85858a]",
    group: "personal",
    Component: PlaceholderPane,
  },
  {
    id: "trackpad",
    icon: "computer-mouse",
    label: "Trackpad",
    colorClass: "bg-[#85858a]",
    group: "personal",
    Component: PlaceholderPane,
  },
] as const satisfies readonly SettingsPaneDescriptor[];

export type SettingsPaneId = (typeof settingsPanes)[number]["id"];
export const settingsPaneIds: readonly SettingsPaneId[] = settingsPanes.map(({ id }) => id);
export const defaultSettingsPaneId: SettingsPaneId = "general";

export function findSettingsPane(id: SettingsPaneId): SettingsPaneDescriptor {
  return settingsPanes.find((pane) => pane.id === id) ?? settingsPanes[0];
}
