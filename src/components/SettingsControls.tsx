import { Select } from "@base-ui/react/select";

const triggerClass =
  "flex min-h-7 min-w-28 items-center justify-between gap-2 rounded-[7px] border border-transparent bg-white/8 px-2 text-inherit hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-[var(--tienos-color-focus)] data-[popup-open]:border-[var(--tienos-color-accent)] contrast-more:border-[var(--tienos-color-border)]";
const itemClass =
  "flex min-h-8 cursor-default items-center gap-2 rounded-[8px] px-2 data-[highlighted]:bg-[var(--tienos-color-accent)] data-[highlighted]:text-[var(--tienos-color-text-on-accent)] data-[highlighted]:outline-none";

export function SettingsSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
}) {
  return (
    <Select.Root value={value} onValueChange={(next) => next && onValueChange(next)}>
      <Select.Trigger aria-label={label} className={triggerClass}>
        <Select.Value />
        <Select.Icon className="size-1.5 rotate-45 border-r border-b border-current text-[var(--tienos-color-text-secondary)]" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          data-settings-portal
          data-desktop-activity
          sideOffset={5}
          className="z-[60] outline-none"
        >
          <Select.Popup className="min-w-[var(--anchor-width)] rounded-[10px] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-menu)] p-1 text-[var(--tienos-color-text-primary)] shadow-[0_16px_36px_rgb(0_0_0/.3)] backdrop-blur-xl [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none">
            <Select.List>
              {options.map((option) => (
                <Select.Item key={option} value={option} className={itemClass}>
                  <Select.ItemIndicator className="w-3 text-center text-[9px]">●</Select.ItemIndicator>
                  <Select.ItemText>{option}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
