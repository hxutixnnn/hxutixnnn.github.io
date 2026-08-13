import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialSingleWindowState } from "../../windows/singleWindowMachine";
import { CalendarApp } from "./CalendarApp";
import { CALENDAR_STORAGE_KEY, parseCalendarStore } from "./calendarModel";

const workspace = {
  viewport: { width: 900, height: 700 },
  menuBottom: 36,
  dockTop: 630,
  safeAreaBottom: 0,
  layout: "desktop" as const,
};
const props = {
  appId: "calendar",
  frontmost: true,
  windowState: initialSingleWindowState,
  effects: [],
  onEffectsConsumed() {},
  onEvent() {},
  workspace,
  dockTargetRectProvider: () => null,
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CalendarApp", () => {
  beforeEach(() => localStorage.clear());

  it("supports roving keyboard navigation in the day grid", () => {
    render(<CalendarApp {...props} />);
    const selected = screen.getByRole("gridcell", { selected: true });
    const day = Number(selected.textContent);
    fireEvent.keyDown(selected, { key: "ArrowRight" });
    expect(screen.getByRole("gridcell", { selected: true })).toHaveTextContent(String(day + 1));
  });

  it("creates, edits, deletes, and restores a persisted event", async () => {
    const user = userEvent.setup();
    const view = render(<CalendarApp {...props} />);
    await user.click(screen.getByRole("button", { name: "Create event" }));
    await user.type(screen.getByLabelText("Title"), "Planning");
    await user.type(screen.getByLabelText("Time (optional)"), "09:30");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Planning")).toBeVisible();
    expect(parseCalendarStore(localStorage.getItem(CALENDAR_STORAGE_KEY)).events[0]?.title).toBe("Planning");
    view.unmount();
    render(<CalendarApp {...props} />);
    await user.click(screen.getByText("Planning"));
    const title = screen.getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Roadmap");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Roadmap")).toBeVisible();
    await user.click(screen.getByText("Roadmap"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByText("Roadmap")).not.toBeInTheDocument();
  });

  it("resets the editor draft when switching events and create mode", async () => {
    const currentDate = new Date();
    const eventDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
    localStorage.setItem(
      CALENDAR_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        events: [
          { id: "one", date: eventDate, title: "First" },
          { id: "two", date: eventDate, title: "Second" },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<CalendarApp {...props} />);
    await user.click(screen.getByText("First"));
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Unsaved");
    await user.click(screen.getByText("Second"));
    expect(screen.getByLabelText("Title")).toHaveValue("Second");
    await user.click(screen.getByRole("button", { name: "Create event" }));
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });

  it("remains usable when local storage access is denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => render(<CalendarApp {...props} />)).not.toThrow();
    expect(screen.getByRole("grid", { name: "Calendar days" })).toBeVisible();
  });

  it("updates Today navigation after local midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 31, 23, 59, 59, 500));
    render(<CalendarApp {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("December 2024");
    act(() => vi.advanceTimersByTime(1_000));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("February 2025");
  });
});
