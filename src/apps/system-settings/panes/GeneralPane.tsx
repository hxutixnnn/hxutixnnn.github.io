import { FontAwesomeIcon, type FontAwesomeIconName } from "../../../components/FontAwesomeIcon";

type GeneralSetting = [icon: FontAwesomeIconName, label: string];

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

export function GeneralPane() {
  return (
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
  );
}
