import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { DesktopAppWindowProps } from "../../desktop/apps";
import { defaultCompactFrame, defaultDesktopFrame, type Frame } from "../../windows/geometry";
import { WindowFrame } from "../../windows/WindowFrame";
import {
  CALENDAR_STORAGE_KEY,
  addDays,
  addMonths,
  dateKey,
  deleteEvent,
  monthGrid,
  parseCalendarStore,
  saveCalendarStore,
  upsertEvent,
  type CalendarEvent,
} from "./calendarModel";

const locale = typeof navigator === "undefined" ? "en-US" : navigator.language;
const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
const detailFormatter = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" });
const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
const controlClass =
  "min-h-8 touch-manipulation rounded-[var(--tienos-radius-control)] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-control)] px-3 py-[5px] text-inherit [@media(pointer:coarse)]:min-h-11 [@media(forced-colors:active)]:border-[ButtonText] [@media(forced-colors:active)]:bg-[ButtonFace] [@media(forced-colors:active)]:text-[ButtonText]";
const iconButtonClass =
  "inline-flex min-h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-[var(--tienos-color-border)] bg-[var(--tienos-color-control)] text-xl text-inherit [@media(pointer:coarse)]:min-h-11 [@media(forced-colors:active)]:border-[ButtonText] [@media(forced-colors:active)]:bg-[ButtonFace] [@media(forced-colors:active)]:text-[ButtonText]";
const inputClass =
  "mt-1 block min-h-9 w-full select-text rounded-[var(--tienos-radius-control)] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-control)] px-[9px] py-[7px] text-inherit [@media(forced-colors:active)]:border-[ButtonText] [@media(forced-colors:active)]:bg-[ButtonFace] [@media(forced-colors:active)]:text-[ButtonText]";

export function CalendarApp({
  appId,
  frontmost,
  windowState,
  effects,
  onEffectsConsumed,
  onEvent,
  workspace,
  dockTargetRectProvider,
}: DesktopAppWindowProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const [events, setEvents] = useState<readonly CalendarEvent[]>(() =>
    typeof localStorage === "undefined"
      ? []
      : parseCalendarStore(localStorage.getItem(CALENDAR_STORAGE_KEY)).events,
  );
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [frame, setFrame] = useState<Frame>(() =>
    workspace.layout === "compact" ? defaultCompactFrame(workspace) : defaultDesktopFrame(workspace.viewport),
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const cells = useMemo(() => monthGrid(month), [month]);
  const selectedKey = dateKey(selected);
  const selectedEvents = events
    .filter((event) => event.date === selectedKey)
    .sort((a, b) => (a.time ?? "24:00").localeCompare(b.time ?? "24:00"));
  const commit = (next: readonly CalendarEvent[]) => {
    setEvents(next);
    if (typeof localStorage !== "undefined") saveCalendarStore(localStorage, next);
  };
  const choose = useCallback((date: Date) => {
    setSelected(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  }, []);
  const keyboardNavigate = (event: KeyboardEvent<HTMLDivElement>) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: Date | undefined;
    if (event.key in offsets) next = addDays(selected, offsets[event.key]);
    else if (event.key === "Home") next = addDays(selected, -selected.getDay());
    else if (event.key === "End") next = addDays(selected, 6 - selected.getDay());
    else if (event.key === "PageUp") next = addMonths(selected, -1);
    else if (event.key === "PageDown") next = addMonths(selected, 1);
    if (!next) return;
    event.preventDefault();
    choose(next);
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>("[tabindex='0']")?.focus());
  };
  const formEvent = editing ?? (creating ? { id: "", date: selectedKey, title: "", time: undefined } : null);

  return (
    <WindowFrame
      appId={appId}
      frontmost={frontmost}
      title="Calendar"
      lifecycle={{ state: windowState, effects, dispatch: onEvent, effectsConsumed: onEffectsConsumed }}
      geometry={{ frame, workspace, onFrameChange: setFrame, transitionTargetRect: dockTargetRectProvider }}
    >
      {(chrome) => (
        <div className="calendar-shell grid h-full min-h-0 grid-rows-[auto_1fr] bg-[var(--tienos-color-detail)]">
          <header className="flex min-h-[70px] items-center gap-2 border-b border-[var(--tienos-color-separator)] px-5 pt-4 max-[700px]:px-3">
            {chrome}
            <button className={controlClass} type="button" onClick={() => choose(today)}>
              Today
            </button>
            <div className="ml-auto flex gap-1">
              <button
                className={iconButtonClass}
                type="button"
                aria-label="Previous month"
                onClick={() => choose(addMonths(month, -1))}
              >
                ‹
              </button>
              <button
                className={iconButtonClass}
                type="button"
                aria-label="Next month"
                onClick={() => choose(addMonths(month, 1))}
              >
                ›
              </button>
            </div>
          </header>
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_260px] max-[700px]:grid-cols-1 max-[700px]:grid-rows-[minmax(300px,1fr)_minmax(150px,.55fr)]">
            <section
              className="flex min-h-0 flex-col p-4 max-[430px]:p-2"
              aria-label={monthFormatter.format(month)}
            >
              <h1 className="mb-3 text-[25px] font-semibold tracking-tight">
                {monthFormatter.format(month)}
              </h1>
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-[var(--tienos-color-text-secondary)]">
                {cells.slice(0, 7).map(({ date }) => (
                  <span key={date.getDay()}>{dayFormatter.format(date)}</span>
                ))}
              </div>
              <div
                ref={gridRef}
                role="grid"
                tabIndex={-1}
                aria-label="Calendar days"
                onKeyDown={keyboardNavigate}
                className="mt-1 grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px overflow-hidden rounded-[var(--tienos-radius-content)] border border-[var(--tienos-color-separator)] bg-[var(--tienos-color-separator)]"
              >
                {cells.map((cell) => {
                  const active = cell.key === selectedKey;
                  const count = events.filter((event) => event.date === cell.key).length;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      role="gridcell"
                      tabIndex={active ? 0 : -1}
                      aria-selected={active}
                      aria-label={`${detailFormatter.format(cell.date)}${count ? `, ${count} events` : ""}`}
                      onClick={() => choose(cell.date)}
                      className={`relative min-h-10 touch-manipulation bg-[var(--tienos-color-content)] p-1 text-left hover:brightness-110 ${cell.inMonth ? "" : "text-[var(--tienos-color-text-tertiary)]"} ${active ? "ring-2 ring-inset ring-[var(--tienos-color-accent)]" : ""}`}
                    >
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full ${cell.key === todayKey ? "bg-[#ff3b30] font-semibold text-white" : ""}`}
                      >
                        {cell.date.getDate()}
                      </span>
                      {count > 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute right-2 bottom-1 size-1.5 rounded-full bg-[var(--tienos-color-accent)]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
            <aside
              className="min-h-0 overflow-auto border-l border-[var(--tienos-color-separator)] bg-[var(--tienos-color-sidebar)] p-4 max-[700px]:border-t max-[700px]:border-l-0"
              aria-label="Selected day events"
            >
              <div className="flex items-center gap-2">
                <div>
                  <h2 className="font-semibold">{detailFormatter.format(selected)}</h2>
                  <p className="text-[11px] text-[var(--tienos-color-text-secondary)]">
                    {selectedEvents.length || "No"} event{selectedEvents.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  className={`${iconButtonClass} ml-auto`}
                  aria-label="Create event"
                  onClick={() => {
                    setEditing(null);
                    setCreating(true);
                  }}
                >
                  ＋
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {selectedEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className="w-full rounded-[var(--tienos-radius-control)] border-l-4 border-[var(--tienos-color-accent)] bg-[var(--tienos-color-content)] p-2 text-left"
                      onClick={() => {
                        setCreating(false);
                        setEditing(event);
                      }}
                    >
                      <strong className="block truncate">{event.title}</strong>
                      <span className="text-[11px] text-[var(--tienos-color-text-secondary)]">
                        {event.time || "All day"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {formEvent && (
                <EventEditor
                  event={formEvent}
                  onCancel={() => {
                    setEditing(null);
                    setCreating(false);
                  }}
                  onSave={(event) => {
                    commit(upsertEvent(events, event));
                    setEditing(null);
                    setCreating(false);
                  }}
                  onDelete={
                    editing
                      ? () => {
                          commit(deleteEvent(events, editing.id));
                          setEditing(null);
                        }
                      : undefined
                  }
                />
              )}
            </aside>
          </div>
        </div>
      )}
    </WindowFrame>
  );
}

function EventEditor({
  event,
  onSave,
  onCancel,
  onDelete,
}: {
  event: CalendarEvent;
  onSave: (event: CalendarEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [time, setTime] = useState(event.time ?? "");
  return (
    <form
      className="mt-4 space-y-2 rounded-[var(--tienos-radius-content)] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-content)] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = title.trim();
        if (clean)
          onSave({ ...event, id: event.id || crypto.randomUUID(), title: clean, time: time || undefined });
      }}
    >
      <label className="block text-[11px] font-medium">
        Title
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </label>
      <label className="block text-[11px] font-medium">
        Time (optional)
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className={`${controlClass} bg-[var(--tienos-color-accent)] text-white`} type="submit">
          Save
        </button>
        <button className={controlClass} type="button" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button className={`${controlClass} ml-auto text-[#ff453a]`} type="button" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
