import * as React from "react";
import { cn } from "../../lib/utils/cn";

export type GlassCardProps = React.HTMLAttributes<HTMLDivElement>;

/** Glin GlassCard source-scaffold, with hover lift removed for the stationary Settings sidebar. */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-2xl border [border-color:var(--glass-border)] [border-top-color:var(--glass-refraction-top)] bg-[var(--glass-3-surface)] shadow-[var(--glass-3-shadow)] [backdrop-filter:saturate(var(--glass-saturate))_blur(var(--glass-3-blur))] [-webkit-backdrop-filter:saturate(var(--glass-saturate))_blur(var(--glass-3-blur))] [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none [@media(prefers-reduced-transparency:reduce)]:[-webkit-backdrop-filter:none]",
      className,
    )}
    {...props}
  />
));

GlassCard.displayName = "GlassCard";
