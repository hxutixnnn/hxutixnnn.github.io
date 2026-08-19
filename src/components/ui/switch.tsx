import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/utils/cn";

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
  variant?: "liquid";
};

/** Glin Switch source-scaffold, narrowed to its Radix-backed Liquid Glass variant. */
export const Switch = React.forwardRef<React.ComponentRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, variant = "liquid", ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      data-variant={variant}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-white/25 [border-top-color:var(--glass-refraction-top)] bg-[var(--tienos-color-control)] shadow-inner backdrop-blur-[var(--glass-blur-lg)] backdrop-saturate-[var(--glass-saturate)] transition-colors data-[state=checked]:border-[var(--color-accent)]/30 data-[state=checked]:bg-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-0.5 rounded-full border border-white/40 bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] motion-reduce:transition-none" />
    </SwitchPrimitive.Root>
  ),
);

Switch.displayName = "Switch";
