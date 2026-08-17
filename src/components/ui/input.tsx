import * as React from "react";
import { cn } from "../../lib/utils/cn";

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  variant?: "ghost";
};

/** Glin Input source-scaffold, narrowed to the ghost treatment used by tienOS. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "ghost", type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-variant={variant}
      className={cn(
        "w-full rounded-xl border border-transparent bg-transparent font-medium text-[var(--color-foreground)] transition-[background-color,border-color,box-shadow,color] duration-[var(--tienos-motion-standard)] focus-visible:border-white/10 focus-visible:bg-[var(--glass-1-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
