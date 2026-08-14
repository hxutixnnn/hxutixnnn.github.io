import { describe, expect, it, vi } from "vitest";
import {
  addMonths,
  addMonthsClamped,
  dateKey,
  deleteEvent,
  monthGrid,
  parseCalendarStore,
  saveCalendarStore,
  upsertEvent,
  weekStartForLocale,
} from "./calendarModel";

describe("calendar model", () => {
  it("builds stable six-week grids across year and leap-day boundaries", () => {
    const january = monthGrid(new Date(2025, 0, 15, 12));
    expect(january).toHaveLength(42);
    expect(january[0].key).toBe("2024-12-29");
    expect(january[41].key).toBe("2025-02-08");
    expect(dateKey(addMonths(new Date(2024, 1, 29, 12), 12))).toBe("2025-02-01");
    expect(monthGrid(new Date(2024, 1, 1, 12)).filter((day) => day.inMonth)).toHaveLength(29);
  });

  it("starts grids on the locale's first weekday", () => {
    expect(weekStartForLocale("en-US")).toBe(0);
    expect(weekStartForLocale("en-GB")).toBe(1);
    expect(monthGrid(new Date(2025, 0, 15, 12), weekStartForLocale("en-GB"))[0].key).toBe("2024-12-30");
  });

  it("supports standardized and legacy locale week-info APIs", () => {
    class StandardLocale {
      getWeekInfo() {
        return { firstDay: 6 };
      }
    }
    class LegacyLocale {
      weekInfo = { firstDay: 7 };
    }
    expect(weekStartForLocale("standard", StandardLocale)).toBe(6);
    expect(weekStartForLocale("legacy", LegacyLocale)).toBe(0);
  });

  it("preserves the day when changing months and clamps shorter months", () => {
    expect(dateKey(addMonthsClamped(new Date(2025, 0, 15, 12), 1))).toBe("2025-02-15");
    expect(dateKey(addMonthsClamped(new Date(2025, 0, 31, 12), 1))).toBe("2025-02-28");
    expect(dateKey(addMonthsClamped(new Date(2024, 2, 31, 12), -1))).toBe("2024-02-29");
  });

  it("creates, updates, and deletes events immutably", () => {
    const original = [{ id: "1", date: "2025-01-01", title: "Start" }];
    const created = upsertEvent(original, { id: "2", date: "2025-01-02", title: "Meet", time: "09:30" });
    const updated = upsertEvent(created, { id: "1", date: "2025-01-01", title: "Changed" });
    expect(updated.map((event) => event.title)).toEqual(["Changed", "Meet"]);
    expect(deleteEvent(updated, "1")).toEqual([created[1]]);
    expect(original[0].title).toBe("Start");
  });

  it("recovers from corrupt, unsupported, and partly invalid persistence", () => {
    expect(parseCalendarStore("not json").events).toEqual([]);
    expect(parseCalendarStore('{"version":2,"events":[]}').events).toEqual([]);
    const parsed = parseCalendarStore(
      JSON.stringify({
        version: 1,
        events: [
          { id: "ok", date: "2024-02-29", title: "Leap" },
          { id: "bad", date: "2023-02-29", title: "Impossible" },
        ],
      }),
    );
    expect(parsed.events.map(({ id }) => id)).toEqual(["ok"]);
    const storage = {
      setItem: vi.fn(() => {
        throw new Error("full");
      }),
    };
    expect(saveCalendarStore(storage, parsed.events)).toBe(false);
    expect(saveCalendarStore({ setItem: vi.fn() }, parsed.events)).toBe(true);
  });
});
