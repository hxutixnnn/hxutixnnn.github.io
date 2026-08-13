import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

afterEach(cleanup);

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
});
