"use client"

import { useId } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ComputerIcon,
  Moon02Icon,
  PaletteIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  useTheme,
  type ThemeAccent,
  type ThemeMode,
} from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export interface ThemePickerProps {
  className?: string
}

const MODES = [
  { value: "light", label: "Light", icon: Sun03Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
  { value: "system", label: "System", icon: ComputerIcon },
] satisfies { value: ThemeMode; label: string; icon: typeof Sun03Icon }[]
const ACCENTS = [
  { value: "yellow", label: "Yellow", color: "oklch(0.852 0.199 91.936)" },
  { value: "emerald", label: "Emerald", color: "#34d399" },
  { value: "blue", label: "Blue", color: "#60a5fa" },
  { value: "violet", label: "Violet", color: "#a78bfa" },
  { value: "rose", label: "Rose", color: "#fb7185" },
] satisfies { value: ThemeAccent; label: string; color: string }[]

export function ThemePicker({ className }: ThemePickerProps) {
  const { mode, accent, setMode, setAccent } = useTheme()
  const paletteId = useId()
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "rail-button inline-flex size-11 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
        aria-label="Appearance"
      >
        <HugeiconsIcon
          icon={PaletteIcon}
          size={21}
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={14}
        className="w-[270px] max-w-[calc(100vw-2rem)] gap-5 p-5 motion-reduce:animate-none motion-reduce:duration-0"
      >
        <PopoverHeader>
          <PopoverTitle className="text-sm font-semibold">
            Appearance
          </PopoverTitle>
          <PopoverDescription className="text-xs leading-5">
            Make yourself at home.
          </PopoverDescription>
        </PopoverHeader>
        <fieldset className="min-w-0">
          <legend className="mb-2.5 text-xs font-medium">Mode</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={mode === option.value}
                onClick={() => setMode(option.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mode === option.value
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HugeiconsIcon
                  icon={option.icon}
                  size={18}
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="mb-3 text-xs font-medium">Accent color</legend>
          <div className="grid grid-cols-5 gap-1">
            {ACCENTS.map((option) => (
              <label
                key={option.value}
                className="relative flex cursor-pointer flex-col items-center gap-2 rounded-lg px-0.5 py-1"
              >
                <input
                  className="peer sr-only"
                  type="radio"
                  name={paletteId}
                  value={option.value}
                  checked={accent === option.value}
                  onChange={() => setAccent(option.value)}
                />
                <span
                  aria-hidden="true"
                  className="flex size-7 items-center justify-center rounded-full border border-black/10 ring-offset-2 ring-offset-popover peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring"
                  style={{ backgroundColor: option.color }}
                >
                  {accent === option.value && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="text-black"
                    >
                      <path
                        d="m3 8 3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground peer-checked:text-foreground">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </PopoverContent>
    </Popover>
  )
}
