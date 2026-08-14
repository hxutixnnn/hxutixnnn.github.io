import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialSingleWindowState } from "../../windows/singleWindowMachine";
import { CalendarApp } from "./CalendarApp";
import { CALENDAR_STORAGE_KEY, dateKey, parseCalendarStore } from "./calendarModel";

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

  it("exposes today independently from the selected day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 14, 12));
    render(<CalendarApp {...props} />);

    const today = screen.getByRole("gridcell", { current: "date" });
    const cells = screen.getAllByRole("gridcell");
    expect(today).toHaveAttribute("aria-selected", "true");
    fireEvent.click(cells[cells.indexOf(today) + 1]);

    expect(screen.getByRole("gridcell", { current: "date" })).toBe(today);
    expect(today).toHaveAttribute("aria-selected", "false");
  });

  it("preserves and clamps the selected day during keyboard month navigation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 31, 12));
    render(<CalendarApp {...props} />);
    fireEvent.keyDown(screen.getByRole("gridcell", { selected: true }), { key: "PageDown" });
    expect(screen.getByRole("gridcell", { selected: true })).toHaveTextContent("28");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("February 2025");
  });

  it("preserves a modified draft when keyboard navigation is cancelled", async () => {
    const user = userEvent.setup();
    render(<CalendarApp {...props} />);
    await user.click(screen.getByRole("button", { name: "Create event" }));
    await user.type(screen.getByLabelText("Title"), "Keyboard draft");

    const originalSelection = screen.getByRole("gridcell", { selected: true }).getAttribute("aria-label");
    fireEvent.keyDown(screen.getByRole("gridcell", { selected: true }), { key: "ArrowRight" });
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "Keep Editing" })).toHaveFocus();
    expect(screen.getByRole("gridcell", { selected: true })).toHaveAttribute("aria-label", originalSelection);
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Keyboard draft");
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(screen.getByRole("gridcell", { selected: true })).toHaveAttribute("aria-label", originalSelection);
  });

  it("discards an edited draft only after pointer navigation confirmation", async () => {
    const user = userEvent.setup();
    render(<CalendarApp {...props} />);
    const originalMonth = screen.getByRole("heading", { level: 1 }).textContent;
    await user.click(screen.getByRole("button", { name: "Create event" }));
    await user.type(screen.getByLabelText("Title"), "Discard me");
    await user.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(originalMonth ?? "");
    expect(screen.getByLabelText("Title")).toHaveValue("Discard me");
    await user.click(screen.getByRole("button", { name: "Discard and Navigate" }));

    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(originalMonth ?? "");
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("gridcell", { selected: true })).toHaveFocus());
    expect(parseCalendarStore(localStorage.getItem(CALENDAR_STORAGE_KEY)).events).toEqual([]);
  });

  it("saves an edited event on its original date before pointer navigation", async () => {
    const eventDate = dateKey(new Date());
    localStorage.setItem(
      CALENDAR_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        events: [{ id: "existing", date: eventDate, title: "Original title" }],
      }),
    );
    const user = userEvent.setup();
    render(<CalendarApp {...props} />);
    const originalMonth = screen.getByRole("heading", { level: 1 }).textContent;
    await user.click(screen.getByText("Original title"));
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Updated title");
    await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: "Save and Navigate" }));

    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(originalMonth ?? "");
    await waitFor(() => expect(screen.getByRole("gridcell", { selected: true })).toHaveFocus());
    expect(parseCalendarStore(localStorage.getItem(CALENDAR_STORAGE_KEY)).events).toMatchObject([
      { id: "existing", date: eventDate, title: "Updated title" },
    ]);
  });

  it("closes an untouched editor during navigation without prompting", async () => {
    const user = userEvent.setup();
    render(<CalendarApp {...props} />);
    const originalMonth = screen.getByRole("heading", { level: 1 }).textContent;
    await user.click(screen.getByRole("button", { name: "Create event" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(originalMonth ?? "");
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

  it("treats pointer and keyboard reselection of the open event as a focus no-op", async () => {
    const eventDate = dateKey(new Date());
    localStorage.setItem(
      CALENDAR_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        events: [{ id: "same", date: eventDate, title: "Original" }],
      }),
    );
    const user = userEvent.setup();
    render(<CalendarApp {...props} />);
    const eventCard = screen.getByRole("button", { name: /Original/ });
    await user.click(eventCard);
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Preserved draft");

    await user.click(eventCard);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Preserved draft");
    expect(screen.getByLabelText("Title")).toHaveFocus();

    eventCard.focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Preserved draft");
    expect(screen.getByLabelText("Title")).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(parseCalendarStore(localStorage.getItem(CALENDAR_STORAGE_KEY)).events).toMatchObject([
      { id: "same", title: "Preserved draft" },
    ]);
  });

  it.each([
    { scenario: "untouched", title: "", decision: null, closes: true, saves: false },
    { scenario: "keep", title: "Keep draft", decision: "Keep Editing", closes: false, saves: false },
    {
      scenario: "discard",
      title: "Discard draft",
      decision: "Discard and Close",
      closes: true,
      saves: false,
    },
    {
      scenario: "save",
      title: "Save draft",
      decision: "Save and Close",
      closes: true,
      saves: true,
    },
  ])(
    "handles the $scenario close decision through the draft guard",
    async ({ title, decision, closes, saves }) => {
      const onEvent = vi.fn();
      const user = userEvent.setup();
      render(<CalendarApp {...props} onEvent={onEvent} />);
      await user.click(screen.getByRole("button", { name: "Create event" }));
      if (title) await user.type(screen.getByLabelText("Title"), title);

      await user.click(screen.getByRole("button", { name: "Close Calendar" }));
      if (decision) {
        expect(onEvent).not.toHaveBeenCalledWith({ type: "CLOSE" });
        expect(screen.getByRole("alertdialog")).toHaveAccessibleName("Save changes before closing?");
        await user.click(screen.getByRole("button", { name: decision }));
      } else {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      }

      if (closes) expect(onEvent).toHaveBeenCalledWith({ type: "CLOSE" });
      else {
        expect(onEvent).not.toHaveBeenCalledWith({ type: "CLOSE" });
        expect(screen.getByLabelText("Title")).toHaveValue(title);
        expect(screen.getByLabelText("Title")).toHaveFocus();
      }
      expect(parseCalendarStore(localStorage.getItem(CALENDAR_STORAGE_KEY)).events).toHaveLength(
        saves ? 1 : 0,
      );
      if (saves)
        expect(parseCalendarStore(localStorage.getItem(CALENDAR_STORAGE_KEY)).events[0]?.title).toBe(title);
    },
  );

  it.each([
    { exit: "save", trigger: "Save", decision: null },
    { exit: "navigation", trigger: "Next month", decision: "Save and Navigate" },
    { exit: "close", trigger: "Close Calendar", decision: "Save and Close" },
  ])("retains the dirty editor when $exit persistence fails", async ({ trigger, decision }) => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const onEvent = vi.fn();
    const user = userEvent.setup();
    render(<CalendarApp {...props} onEvent={onEvent} />);
    const originalMonth = screen.getByRole("heading", { level: 1 }).textContent;
    await user.click(screen.getByRole("button", { name: "Create event" }));
    await user.type(screen.getByLabelText("Title"), "Unsaved after failure");

    await user.click(screen.getByRole("button", { name: trigger }));
    if (decision) await user.click(screen.getByRole("button", { name: decision }));

    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t save your changes");
    expect(screen.getByLabelText("Title")).toHaveValue("Unsaved after failure");
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());
    expect(screen.getByRole("region", { name: "Calendar" })).toBeVisible();
    expect(onEvent).not.toHaveBeenCalledWith({ type: "CLOSE" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(originalMonth ?? "");
    expect(parseCalendarStore(localStorage.getItem(CALENDAR_STORAGE_KEY)).events).toEqual([]);
  });

  it("guards editor switching and restores focus for every decision", async () => {
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
    expect(screen.getByRole("alertdialog")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Keep Editing" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Unsaved");
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());

    await user.click(screen.getByText("Second"));
    await user.click(screen.getByRole("button", { name: "Discard and Navigate" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Second");
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Saved Second");
    await user.click(screen.getByRole("button", { name: "Create event" }));
    expect(screen.getByRole("alertdialog")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save and Navigate" }));
    expect(screen.getByLabelText("Title")).toHaveValue("");
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());
    expect(parseCalendarStore(localStorage.getItem(CALENDAR_STORAGE_KEY)).events).toMatchObject([
      { id: "one", title: "First" },
      { id: "two", title: "Saved Second" },
    ]);
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
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("February 2025");
  });
});
