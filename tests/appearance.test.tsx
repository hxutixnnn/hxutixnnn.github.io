import { StrictMode } from "react"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider, useTheme } from "@/components/theme-provider"
import { ThemePicker } from "@/components/theme-picker"

const STORAGE_KEY = "tien-home-appearance"
let systemDark = false
let systemListeners: Set<() => void>

function CurrentAppearance() {
  const { mode, resolvedMode, accent, setMode, setAccent } = useTheme()
  return (
    <>
      <output data-testid="appearance">
        {JSON.stringify({ mode, resolvedMode, accent })}
      </output>
      <button onClick={() => setMode("dark")}>Use dark</button>
      <button onClick={() => setMode("light")}>Use light</button>
      <button onClick={() => setMode("system")}>Use system</button>
      <button onClick={() => setAccent("violet")}>Use violet</button>
    </>
  )
}

function renderAppearance(picker = false) {
  return render(
    <StrictMode>
      <ThemeProvider>
        <CurrentAppearance />
        {picker && <ThemePicker />}
      </ThemeProvider>
    </StrictMode>
  )
}
function current() {
  return JSON.parse(screen.getByTestId("appearance").textContent!)
}
function changeSystem(dark: boolean) {
  act(() => {
    systemDark = dark
    systemListeners.forEach((listener) => listener())
  })
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ""
  document.documentElement.removeAttribute("style")
  delete document.documentElement.dataset.accent
  systemDark = false
  systemListeners = new Set()
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      media: query,
      get matches() {
        return query === "(prefers-color-scheme: dark)" && systemDark
      },
      onchange: null,
      addEventListener: (_event: string, listener: () => void) => {
        if (query === "(prefers-color-scheme: dark)")
          systemListeners.add(listener)
      },
      removeEventListener: (_event: string, listener: () => void) => {
        systemListeners.delete(listener)
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("appearance preferences", () => {
  it("uses system mode with the exact yellow preset by default", () => {
    renderAppearance()
    expect(current()).toEqual({
      mode: "system",
      resolvedMode: "light",
      accent: "yellow",
    })
    const root = document.documentElement
    expect(root.classList.contains("light")).toBe(true)
    expect(root.dataset.accent).toBe("yellow")
    expect(root.style.colorScheme).toBe("light")
    expect(root.style.getPropertyValue("--primary")).toBe(
      "oklch(0.852 0.199 91.936)"
    )
    expect(root.style.getPropertyValue("--primary-foreground")).toBe(
      "oklch(0.421 0.095 57.708)"
    )
  })

  it("restores saved preferences and keeps changes across remounts", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: "dark", accent: "blue" })
    )
    const view = renderAppearance()
    expect(current()).toEqual({
      mode: "dark",
      resolvedMode: "dark",
      accent: "blue",
    })
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "#93c5fd"
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Use violet" }))
    await user.click(screen.getByRole("button", { name: "Use light" }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      mode: "light",
      accent: "violet",
    })
    view.unmount()
    renderAppearance()
    expect(current()).toEqual({
      mode: "light",
      resolvedMode: "light",
      accent: "violet",
    })
    expect(
      document.documentElement.style.getPropertyValue("--site-accent-soft")
    ).toBe("#ede9fe")
    expect(
      document.documentElement.style.getPropertyValue("--site-accent-ink")
    ).toBe("#5b21b6")
  })

  it("follows system updates only while system mode is selected", async () => {
    const user = userEvent.setup()
    renderAppearance()
    changeSystem(true)
    expect(current().resolvedMode).toBe("dark")
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      "oklch(0.795 0.184 86.047)"
    )
    expect(document.documentElement.classList.contains("light")).toBe(false)
    await user.click(screen.getByRole("button", { name: "Use light" }))
    changeSystem(false)
    changeSystem(true)
    expect(current().resolvedMode).toBe("light")
    await user.click(screen.getByRole("button", { name: "Use system" }))
    expect(current().resolvedMode).toBe("dark")
  })

  it.each([
    "invalid JSON",
    "null",
    '"dark"',
    '{"mode":"sepia","accent":"orange"}',
  ])("recovers from malformed preference %s", (raw) => {
    localStorage.setItem(STORAGE_KEY, raw)
    systemDark = true
    renderAppearance()
    expect(current()).toEqual({
      mode: "system",
      resolvedMode: "dark",
      accent: "yellow",
    })
  })

  it("preserves valid fields when another stored field is unknown", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: "dark", accent: "unknown" })
    )
    renderAppearance()
    expect(current()).toEqual({
      mode: "dark",
      resolvedMode: "dark",
      accent: "yellow",
    })
  })

  it("still changes appearance when the browser blocks localStorage access", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError")
    })
    const user = userEvent.setup()
    renderAppearance()
    await user.click(screen.getByRole("button", { name: "Use dark" }))
    await user.click(screen.getByRole("button", { name: "Use violet" }))
    expect(current()).toEqual({
      mode: "dark",
      resolvedMode: "dark",
      accent: "violet",
    })
    expect(document.documentElement.dataset.accent).toBe("violet")
  })

  it("restores preferences and works when writes exceed the storage quota", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: "dark", accent: "rose" })
    )
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError")
    })
    const user = userEvent.setup()
    renderAppearance()
    expect(current().accent).toBe("rose")
    await user.click(screen.getByRole("button", { name: "Use light" }))
    expect(current().resolvedMode).toBe("light")
    expect(document.documentElement.style.colorScheme).toBe("light")
  })

  it("synchronizes another tab's preference and resets when storage is cleared", () => {
    renderAppearance()
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify({ mode: "dark", accent: "emerald" }),
          storageArea: localStorage,
        })
      )
    )
    expect(current()).toEqual({
      mode: "dark",
      resolvedMode: "dark",
      accent: "emerald",
    })
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: null,
          newValue: null,
          storageArea: localStorage,
        })
      )
    )
    expect(current()).toEqual({
      mode: "system",
      resolvedMode: "light",
      accent: "yellow",
    })
  })

  it("releases system preference listeners on unmount", () => {
    const view = renderAppearance()
    expect(systemListeners.size).toBe(1)
    view.unmount()
    expect(systemListeners.size).toBe(0)
  })
})

describe("appearance picker", () => {
  it("opens from the keyboard, changes modes and accents, and restores focus on Escape", async () => {
    const user = userEvent.setup()
    renderAppearance(true)
    const trigger = screen.getByRole("button", { name: "Appearance" })
    trigger.focus()
    await user.keyboard("{Enter}")
    expect(
      await screen.findByRole("dialog", { name: "Appearance" })
    ).toBeTruthy()
    const darkButton = screen.getByRole("button", { name: "Dark", exact: true })
    await user.click(darkButton)
    expect(darkButton.getAttribute("aria-pressed")).toBe("true")
    expect(
      screen
        .getByRole("button", { name: "System", exact: true })
        .getAttribute("aria-pressed")
    ).toBe("false")
    const blue = screen.getByRole("radio", {
      name: "Blue",
      exact: true,
    }) as HTMLInputElement
    await user.click(blue)
    expect(blue.checked).toBe(true)
    expect(current()).toEqual({
      mode: "dark",
      resolvedMode: "dark",
      accent: "blue",
    })
    await user.keyboard("{ArrowRight}")
    expect(
      (screen.getByRole("radio", { name: "Violet" }) as HTMLInputElement)
        .checked
    ).toBe(true)
    expect(current().accent).toBe("violet")
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Appearance" })).toBeNull()
    )
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
