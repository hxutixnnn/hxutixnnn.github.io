"use client"

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

export type ThemeMode = "light" | "dark" | "system"
export type ResolvedMode = "light" | "dark"
export type ThemeAccent = "yellow" | "emerald" | "blue" | "violet" | "rose"

type Appearance = { mode: ThemeMode; accent: ThemeAccent }
export interface ThemeProviderProps {
  children: ReactNode
}
export interface ThemeContextValue extends Appearance {
  resolvedMode: ResolvedMode
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: ThemeAccent) => void
}

const STORAGE_KEY = "tien-home-appearance"
const SYSTEM_QUERY = "(prefers-color-scheme: dark)"
const DEFAULT_APPEARANCE: Appearance = { mode: "system", accent: "yellow" }
const MODES: ThemeMode[] = ["light", "dark", "system"]
const ACCENTS: ThemeAccent[] = ["yellow", "emerald", "blue", "violet", "rose"]
const VARIABLES = [
  "--primary",
  "--primary-foreground",
  "--ring",
  "--site-accent-soft",
  "--site-accent-ink",
] as const
// Each palette supplies primary, foreground, focus ring, tinted surface, and readable ink.
const PALETTES: Record<
  ThemeAccent,
  Record<ResolvedMode, readonly [string, string, string, string, string]>
> = {
  yellow: {
    light: [
      "oklch(0.852 0.199 91.936)",
      "oklch(0.421 0.095 57.708)",
      "oklch(0.708 0 0)",
      "#fef9c3",
      "#713f12",
    ],
    dark: [
      "oklch(0.795 0.184 86.047)",
      "oklch(0.421 0.095 57.708)",
      "oklch(0.556 0 0)",
      "#352c12",
      "#fde68a",
    ],
  },
  emerald: {
    light: ["#047857", "#ffffff", "#059669", "#d1fae5", "#065f46"],
    dark: ["#6ee7b7", "#022c22", "#34d399", "#12372b", "#a7f3d0"],
  },
  blue: {
    light: ["#1d4ed8", "#ffffff", "#2563eb", "#dbeafe", "#1e40af"],
    dark: ["#93c5fd", "#172554", "#60a5fa", "#172c46", "#bfdbfe"],
  },
  violet: {
    light: ["#6d28d9", "#ffffff", "#7c3aed", "#ede9fe", "#5b21b6"],
    dark: ["#c4b5fd", "#2e1065", "#a78bfa", "#2d2147", "#ddd6fe"],
  },
  rose: {
    light: ["#be123c", "#ffffff", "#e11d48", "#ffe4e6", "#9f1239"],
    dark: ["#fda4af", "#4c0519", "#fb7185", "#421e2b", "#fecdd3"],
  },
}

function parseAppearance(raw: string | null): Appearance {
  if (!raw) return DEFAULT_APPEARANCE
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== "object") return DEFAULT_APPEARANCE
    const candidate = value as Record<string, unknown>
    return {
      mode: MODES.includes(candidate.mode as ThemeMode)
        ? (candidate.mode as ThemeMode)
        : DEFAULT_APPEARANCE.mode,
      accent: ACCENTS.includes(candidate.accent as ThemeAccent)
        ? (candidate.accent as ThemeAccent)
        : DEFAULT_APPEARANCE.accent,
    }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

function readAppearance(): Appearance {
  try {
    return parseAppearance(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_APPEARANCE
  }
}

function systemIsDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(SYSTEM_QUERY).matches
  )
}
function subscribeToSystem(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {}
  const query = window.matchMedia(SYSTEM_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [appearance, setAppearance] = useState<Appearance>(readAppearance)
  const isSystemDark = useSyncExternalStore(
    subscribeToSystem,
    systemIsDark,
    () => false
  )
  const resolvedMode: ResolvedMode =
    appearance.mode === "system"
      ? isSystemDark
        ? "dark"
        : "light"
      : appearance.mode

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedMode)
    root.dataset.accent = appearance.accent
    root.style.colorScheme = resolvedMode
    PALETTES[appearance.accent][resolvedMode].forEach((value, index) =>
      root.style.setProperty(VARIABLES[index], value)
    )
  }, [appearance.accent, resolvedMode])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
    } catch {
      /* Preferences still work for this visit when storage is blocked. */
    }
  }, [appearance])

  useEffect(() => {
    const syncAppearance = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      try {
        if (event.storageArea !== window.localStorage) return
      } catch {
        return
      }
      setAppearance(parseAppearance(event.newValue))
    }
    window.addEventListener("storage", syncAppearance)
    return () => window.removeEventListener("storage", syncAppearance)
  }, [])

  const setMode = useCallback((mode: ThemeMode) => {
    if (MODES.includes(mode))
      setAppearance((current) =>
        current.mode === mode ? current : { ...current, mode }
      )
  }, [])
  const setAccent = useCallback((accent: ThemeAccent) => {
    if (ACCENTS.includes(accent))
      setAppearance((current) =>
        current.accent === accent ? current : { ...current, accent }
      )
  }, [])
  const value = useMemo(
    () => ({ ...appearance, resolvedMode, setMode, setAccent }),
    [appearance, resolvedMode, setMode, setAccent]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
