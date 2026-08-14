export type CalendarEvent = Readonly<{ id: string; date: string; title: string; time?: string }>;
export type CalendarStore = Readonly<{ version: 1; events: readonly CalendarEvent[] }>;

export const CALENDAR_STORAGE_KEY = "tienos.calendar.events";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function dateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  return `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromDateKey(key: string): Date | null {
  if (!datePattern.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const value = new Date(year, month - 1, day, 12);
  return value.getFullYear() === year && value.getMonth() === month - 1 && value.getDate() === day
    ? value
    : null;
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

export function addMonthsClamped(date: Date, amount: number): Date {
  const targetMonth = addMonths(date, amount);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 12).getDate();
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(date.getDate(), lastDay), 12);
}

export type CalendarCell = Readonly<{ date: Date; key: string; inMonth: boolean }>;

type WeekInfo = Readonly<{ firstDay?: number }>;
type LocaleWithWeekInfo = Readonly<{
  getWeekInfo?: () => WeekInfo;
  weekInfo?: WeekInfo;
}>;
type LocaleConstructor = new (tag: string) => LocaleWithWeekInfo;

export function weekStartForLocale(locale: string, Locale: LocaleConstructor = Intl.Locale): number {
  try {
    const localeInfo = new Locale(locale);
    const weekInfo =
      typeof localeInfo.getWeekInfo === "function" ? localeInfo.getWeekInfo() : localeInfo.weekInfo;
    const firstDay = weekInfo?.firstDay;
    return typeof firstDay === "number" ? firstDay % 7 : 0;
  } catch {
    return 0;
  }
}

export function monthGrid(month: Date, weekStartsOn = 0): readonly CalendarCell[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const leading = (first.getDay() - weekStartsOn + 7) % 7;
  const start = addDays(first, -leading);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { date, key: dateKey(date), inMonth: date.getMonth() === first.getMonth() };
  });
}

function validEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    event.id.length > 0 &&
    typeof event.title === "string" &&
    event.title.trim().length > 0 &&
    typeof event.date === "string" &&
    fromDateKey(event.date) !== null &&
    (event.time === undefined || (typeof event.time === "string" && timePattern.test(event.time)))
  );
}

export function parseCalendarStore(raw: string | null): CalendarStore {
  if (!raw) return { version: 1, events: [] };
  try {
    const value = JSON.parse(raw) as { version?: unknown; events?: unknown };
    if (value.version !== 1 || !Array.isArray(value.events)) return { version: 1, events: [] };
    return { version: 1, events: value.events.filter(validEvent) };
  } catch {
    return { version: 1, events: [] };
  }
}

export function saveCalendarStore(storage: Pick<Storage, "setItem">, events: readonly CalendarEvent[]) {
  try {
    storage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify({ version: 1, events } satisfies CalendarStore));
    return true;
  } catch {
    return false;
  }
}

export function upsertEvent(
  events: readonly CalendarEvent[],
  event: CalendarEvent,
): readonly CalendarEvent[] {
  const index = events.findIndex(({ id }) => id === event.id);
  return index < 0
    ? [...events, event]
    : events.map((current) => (current.id === event.id ? event : current));
}

export function deleteEvent(events: readonly CalendarEvent[], id: string): readonly CalendarEvent[] {
  return events.filter((event) => event.id !== id);
}
