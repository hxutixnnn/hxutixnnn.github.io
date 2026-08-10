import { FontAwesomeIcon } from "../../../components/FontAwesomeIcon";
import type { SettingsPaneMetadata } from "../settingsPanes";

type PlaceholderPaneProps = {
  pane: SettingsPaneMetadata;
};

export function PlaceholderPane({ pane }: PlaceholderPaneProps) {
  return (
    <div className="mt-3.5 grid min-h-60 content-center place-items-center gap-3.5 rounded-[15px] bg-[var(--tienos-color-content)] text-[var(--tienos-color-text-secondary)]">
      <span
        className={`settings-icon grid size-5 shrink-0 place-items-center rounded-[7px] border border-white/20 text-[11px] text-white shadow-[inset_0_1px_rgb(255_255_255/0.2),0_1px_2px_rgb(0_0_0/0.4)] ${pane.colorClass}`}
      >
        <FontAwesomeIcon name={pane.icon} />
      </span>
      <p>{pane.label} controls are ready for configuration.</p>
    </div>
  );
}
