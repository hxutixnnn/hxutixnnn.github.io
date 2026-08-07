const spriteUrl = "/fontawesome/fontawesome-pro-solid.svg";

export type FontAwesomeIconName =
  | "arrow-right-arrow-left"
  | "bars"
  | "battery-full"
  | "battery-half"
  | "bluetooth"
  | "calendar-days"
  | "chevron-left"
  | "chevron-right"
  | "circle-half-stroke"
  | "circle-info"
  | "computer-mouse"
  | "desktop"
  | "display"
  | "gear"
  | "hard-drive"
  | "image"
  | "key"
  | "keyboard"
  | "language"
  | "magnifying-glass"
  | "network-wired"
  | "people-group"
  | "puzzle-piece"
  | "rotate"
  | "scanner"
  | "share-nodes"
  | "shield-check"
  | "shield-halved"
  | "sparkle"
  | "sparkles"
  | "universal-access"
  | "user-group"
  | "volume-high"
  | "wifi";

type FontAwesomeIconProps = {
  name: FontAwesomeIconName;
  className?: string;
};

/** Decorative icon. Meaning is supplied by its control's accessible name or adjacent text. */
export function FontAwesomeIcon({ name, className }: FontAwesomeIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className ? `fa-icon ${className}` : "fa-icon"}
      data-fa-icon={name}
      focusable="false"
    >
      <use href={`${spriteUrl}#fa-${name}`} />
    </svg>
  );
}
