import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import App from "@/App"
import { ThemeProvider } from "@/components/theme-provider"

function renderResume() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, "", "/")
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
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

describe("public resume", () => {
  it("preserves the live introduction, portrait sidebar, and existing section destinations", () => {
    renderResume()
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Interfaces that work.Tools that help you build."
    )
    const profile = screen.getByRole("complementary", { name: "About Tien" })
    expect(
      within(profile)
        .getByRole("img", { name: "Tien Huu Nguyen" })
        .getAttribute("width")
    ).toBe("256")
    for (const id of ["main", "work", "about", "contact"]) {
      expect(document.getElementById(id)).toBeTruthy()
    }
  })

  it("shows the engineering positioning with one formal current employment entry", () => {
    renderResume()
    expect(screen.getByText("SOFTWARE ENGINEER · AI & INNOVATION")).toBeTruthy()
    const experience = screen.getByRole("region", { name: "Experience" })
    expect(within(experience).getAllByRole("article")).toHaveLength(1)
    expect(
      within(experience).getByRole("heading", {
        name: "Senior Software Developer, UI/UX",
      })
    ).toBeTruthy()
    expect(
      within(experience).getByText("May 2023").getAttribute("datetime")
    ).toBe("2023-05")
    expect(within(experience).getByText(/Present/)).toBeTruthy()
  })

  it("distinguishes exploratory work, preparation, and external versus internal recognition", () => {
    renderResume()
    const prototype = screen.getByRole("article", {
      name: "Image-to-structured-HTML",
    })
    expect(within(prototype).getByText("Exploration")).toBeTruthy()
    expect(
      within(prototype).getByText(/where the approach failed/)
    ).toBeTruthy()
    const sharing = screen.getByRole("region", { name: "Sharing what I learn" })
    expect(
      within(sharing).getByText(
        /Prepared internal presentations and demonstrations/
      )
    ).toBeTruthy()
    const external = screen.getByRole("article", {
      name: "Parallel Bug Bounty",
    })
    expect(within(external).getByText("EXTERNAL BUILD EVENT")).toBeTruthy()
    expect(within(external).getByText(/Solo builder/)).toBeTruthy()
    const internal = screen.getByRole("article", {
      name: "AI-powered camera attendance",
    })
    expect(within(internal).getByText("INTERNAL HACKATHON")).toBeTruthy()
    expect(
      within(internal).getByText(/Member of the winning team/)
    ).toBeTruthy()
  })

  it("retains the personal projects, portrait, and public contact destinations", () => {
    renderResume()
    expect(
      screen.getByRole("img", { name: "Tien Huu Nguyen" }).getAttribute("src")
    ).toBe("/avatar.jpg")
    const projects = screen.getByRole("region", { name: "Personal projects" })
    expect(
      within(projects)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"))
    ).toEqual([
      "https://ui.nguyenhuutien.com",
      "https://github.com/hxutixnnn/lite-agent-skills",
      "https://github.com/hxutixnnn/harness-skills",
    ])
    const contact = screen.getByRole("navigation", { name: "Social profiles" })
    expect(
      within(contact)
        .getByRole("link", { name: "LinkedIn" })
        .getAttribute("href")
    ).toBe("https://www.linkedin.com/in/hxutixnnn")
    expect(
      within(contact).getByRole("link", { name: "GitHub" }).getAttribute("href")
    ).toBe("https://github.com/hxutixnnn")
    expect(
      within(contact).getByRole("link", { name: "X" }).getAttribute("href")
    ).toBe("https://x.com/hxutixnnn")
  })
})

describe("resume navigation and print action", () => {
  it("gives every local link a destination, including the original project anchor", () => {
    renderResume()
    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href")
      if (href?.startsWith("#")) {
        expect(document.getElementById(href.slice(1))).not.toBeNull()
      }
    }
    expect(document.getElementById("lately")).toBeTruthy()
    expect(document.getElementById("main")?.getAttribute("tabindex")).toBe("-1")
  })

  it("restores a deep link and updates the current navigation item when the hash changes", async () => {
    window.history.replaceState(null, "", "#ai")
    renderResume()
    const nav = screen.getByRole("navigation", {
      name: "Resume sections",
    })
    const ai = within(nav).getByRole("link", { name: "AI & experiments" })
    const experience = within(nav).getByRole("link", { name: "Experience" })
    expect(ai.getAttribute("aria-current")).toBe("location")
    await userEvent.setup().click(experience)
    await waitFor(() =>
      expect(experience.getAttribute("aria-current")).toBe("location")
    )
    expect(ai.getAttribute("aria-current")).toBeNull()
    expect(window.location.hash).toBe("#experience")
  })

  it("opens the browser print flow from the CV action", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {})
    renderResume()
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Print / save CV" }))
    expect(print).toHaveBeenCalledTimes(1)
    expect(
      screen
        .getByRole("link", { name: "nguyenhuutien.com" })
        .getAttribute("href")
    ).toBe("https://nguyenhuutien.com")
  })
})
