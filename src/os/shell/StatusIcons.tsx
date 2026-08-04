type IconProps = { className?: string };

function base(width: number, height: number, strokeWidth = 1.6) {
  return {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function WifiIcon({ className }: IconProps) {
  return (
    <svg {...base(16, 12)} className={className}>
      <path d="M1.8 4.6a11.6 11.6 0 0 1 12.4 0" />
      <path d="M4.3 7.4a7 7 0 0 1 7.4 0" />
      <path d="M6.8 10.1a2.6 2.6 0 0 1 2.4 0" />
    </svg>
  );
}

export function BatteryIcon({ className }: IconProps) {
  return (
    <svg {...base(20, 12)} className={className}>
      <rect x="0.8" y="1.8" width="16" height="8.4" rx="2" />
      <rect x="2.6" y="3.4" width="9.6" height="5.2" rx="1" fill="currentColor" stroke="none" />
      <path d="M18.2 4.4v3.2" />
    </svg>
  );
}

export function ControlCenterIcon({ className }: IconProps) {
  return (
    <svg {...base(16, 12)} className={className}>
      <path d="M3 2h10M3 6h10M3 10h10" />
      <circle cx="5.6" cy="2" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="10.4" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="7.2" cy="10" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SpotlightIcon({ className }: IconProps) {
  return (
    <svg {...base(14, 14)} className={className}>
      <circle cx="6" cy="6" r="4.2" />
      <path d="m9.2 9.2 3.6 3.6" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base(22, 22)} className={className}>
      <path d="M5 7h12l-.8 11a2 2 0 0 1-2 1.9H7.8a2 2 0 0 1-2-1.9z" />
      <path d="M3.5 7h15M9 7V4.5a1.5 1.5 0 0 1 1.5-1.5h1A1.5 1.5 0 0 1 13 4.5V7" />
      <path d="M9.2 10.4v5M12.8 10.4v5" />
    </svg>
  );
}

export function CloseGlyph() {
  return (
    <svg {...base(8, 8, 2.2)}>
      <path d="m2 2 4 4M6 2l-4 4" />
    </svg>
  );
}

export function MinimizeGlyph() {
  return (
    <svg {...base(8, 8, 2.2)}>
      <path d="M1.5 4h5" />
    </svg>
  );
}

export function FullscreenGlyph() {
  return (
    <svg {...base(8, 8, 1.7)}>
      <path d="M2.6 1.6h3.8v3.8M5.4 6.4H1.6V2.6" />
      <path d="M1.6 5.6V6.4H2.4M6.4 2.4v-.8H5.6" />
    </svg>
  );
}

export function RestoreGlyph() {
  return (
    <svg {...base(8, 8, 1.7)}>
      <path d="M2.4 2.2h3.4v3.6H2.4z" />
      <path d="M5.6 5.8h.2V2.6H3.2" />
    </svg>
  );
}
