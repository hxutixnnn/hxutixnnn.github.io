import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type { DesktopAppWindowProps } from "../../desktop/apps";
import { defaultCompactFrame, defaultDesktopFrame, type Frame } from "../../windows/geometry";
import { WindowFrame } from "../../windows/WindowFrame";
import {
  CALENDAR_STORAGE_KEY,
  addDays,
  addMonths,
  addMonthsClamped,
  dateKey,
  deleteEvent,
  fromDateKey,
  monthGrid,
  parseCalendarStore,
  saveCalendarStore,
  upsertEvent,
  weekStartForLocale,
  type CalendarEvent,
} from "./calendarModel";

const locale = typeof navigator === "undefined" ? "en-US" : navigator.language;
const weekStartsOn = weekStartForLocale(locale);
const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
const detailFormatter = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" });
const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
const controlClass =
  "min-h-8 touch-manipulation rounded-[var(--tienos-radius-control)] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-control)] px-3 py-[5px] text-inherit [@media(pointer:coarse)]:min-h-11 [@media(forced-colors:active)]:border-[ButtonText] [@media(forced-colors:active)]:bg-[ButtonFace] [@media(forced-colors:active)]:text-[ButtonText]";
const iconButtonClass =
  "inline-flex min-h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-[var(--tienos-color-border)] bg-[var(--tienos-color-control)] text-xl text-inherit [@media(pointer:coarse)]:min-h-11 [@media(forced-colors:active)]:border-[ButtonText] [@media(forced-colors:active)]:bg-[ButtonFace] [@media(forced-colors:active)]:text-[ButtonText]";
const inputClass =
  "mt-1 block min-h-9 w-full select-text rounded-[var(--tienos-radius-control)] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-control)] px-[9px] py-[7px] text-inherit [@media(forced-colors:active)]:border-[ButtonText] [@media(forced-colors:active)]:bg-[ButtonFace] [@media(forced-colors:active)]:text-[ButtonText]";

type PendingCalendarAction =
  | Readonly<{ type: "navigate"; date: Date }>
  | Readonly<{ type: "open-editor"; event: CalendarEvent }>
  | Readonly<{ type: "close" }>;

function readStoredEvents(): readonly CalendarEvent[] {
  try {
    return parseCalendarStore(globalThis.localStorage.getItem(CALENDAR_STORAGE_KEY)).events;
  } catch {
    return [];
  }
}

function persistEvents(events: readonly CalendarEvent[]) {
  try {
    return saveCalendarStore(globalThis.localStorage, events);
  } catch {
    return false;
  }
}

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
  const [today, setToday] = useState(() => new Date());
  const todayKey = dateKey(today);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const [events, setEvents] = useState<readonly CalendarEvent[]>(readStoredEvents);
  const [draft, setDraft] = useState<CalendarEvent | null>(null);
  const [draftBaseline, setDraftBaseline] = useState<CalendarEvent | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingCalendarAction | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [frame, setFrame] = useState<Frame>(() =>
    workspace.layout === "compact" ? defaultCompactFrame(workspace) : defaultDesktopFrame(workspace.viewport),
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cells = useMemo(() => monthGrid(month, weekStartsOn), [month]);
  const selectedKey = dateKey(selected);
  const selectedEvents = events
    .filter((event) => event.date === selectedKey)
    .sort((a, b) => (a.time ?? "24:00").localeCompare(b.time ?? "24:00"));
  const commit = (next: readonly CalendarEvent[]) => {
    if (!persistEvents(next)) {
      setSaveError("Calendar couldn’t save your changes. Your draft is still here; try again.");
      requestAnimationFrame(() => titleInputRef.current?.focus());
      return false;
    }
    setEvents(next);
    setSaveError(null);
    return true;
  };
  const draftModified =
    draft !== null &&
    draftBaseline !== null &&
    (draft.title !== draftBaseline.title || (draft.time ?? "") !== (draftBaseline.time ?? ""));
  const pendingClose = pendingAction?.type === "close";

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshAtMidnight = () => {
      const now = new Date();
      setToday(now);
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refreshAtMidnight, nextMidnight.getTime() - now.getTime() + 1);
    };
    refreshAtMidnight();
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (pendingAction) keepEditingRef.current?.focus();
  }, [pendingAction]);
  const closeEditor = () => {
    setDraft(null);
    setDraftBaseline(null);
    setPendingAction(null);
    setSaveError(null);
  };
  const focusSelectedDay = () =>
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>("[tabindex='0']")?.focus());
  const openEditor = (event: CalendarEvent, focus = false) => {
    setDraft(event);
    setDraftBaseline(event);
    setPendingAction(null);
    setSaveError(null);
    if (focus) requestAnimationFrame(() => titleInputRef.current?.focus());
  };
  const applyNavigation = (date: Date) => {
    setSelected(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  };
  const saveDraft = () => {
    if (!draft) return false;
    const title = draft.title.trim();
    if (!title) return false;
    const saved = commit(
      upsertEvent(events, {
        ...draft,
        id: draft.id || crypto.randomUUID(),
        title,
        time: draft.time || undefined,
      }),
    );
    if (!saved) return false;
    closeEditor();
    return true;
  };
  const continuePendingAction = (action: PendingCalendarAction, focusDestination = true) => {
    if (action.type === "navigate") {
      applyNavigation(action.date);
      if (focusDestination) focusSelectedDay();
    } else if (action.type === "open-editor") {
      openEditor(action.event, true);
    } else {
      onEvent({ type: "CLOSE" });
    }
  };
  const requestDraftAction = (action: PendingCalendarAction, focusDestination = false) => {
    if (action.type === "open-editor" && draft?.id && draft.id === action.event.id) {
      titleInputRef.current?.focus();
      return false;
    }
    if (draftModified) {
      setPendingAction(action);
      return false;
    }
    closeEditor();
    continuePendingAction(action, focusDestination);
    return true;
  };
  const requestNavigation = (date: Date, focusDestination = false) =>
    requestDraftAction({ type: "navigate", date }, focusDestination);
  const requestEditor = (event: CalendarEvent) => requestDraftAction({ type: "open-editor", event });
  const dispatchWindowEvent = (event: Parameters<typeof onEvent>[0]) => {
    if (event.type === "CLOSE") requestDraftAction({ type: "close" });
    else onEvent(event);
  };
  const discardAndContinue = () => {
    if (!pendingAction) return;
    const action = pendingAction;
    closeEditor();
    continuePendingAction(action);
  };
  const saveAndContinue = () => {
    if (!pendingAction) return;
    const action = pendingAction;
    if (saveDraft()) continuePendingAction(action);
  };
  const keepEditing = () => {
    setPendingAction(null);
    titleInputRef.current?.focus();
  };
  const keyboardNavigate = (event: KeyboardEvent<HTMLDivElement>) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: Date | undefined;
    if (event.key in offsets) next = addDays(selected, offsets[event.key]);
    else if (event.key === "Home") next = addDays(selected, -((selected.getDay() - weekStartsOn + 7) % 7));
    else if (event.key === "End") next = addDays(selected, 6 - ((selected.getDay() - weekStartsOn + 7) % 7));
    else if (event.key === "PageUp") next = addMonthsClamped(selected, -1);
    else if (event.key === "PageDown") next = addMonthsClamped(selected, 1);
    if (!next) return;
    event.preventDefault();
    requestNavigation(next, true);
  };

  return (
    <WindowFrame
      appId={appId}
      frontmost={frontmost}
      title="Calendar"
      lifecycle={{
        state: windowState,
        effects,
        dispatch: dispatchWindowEvent,
        effectsConsumed: onEffectsConsumed,
      }}
      geometry={{ frame, workspace, onFrameChange: setFrame, transitionTargetRect: dockTargetRectProvider }}
    >
      {(chrome) => (
        <div className="calendar-shell grid h-full min-h-0 grid-rows-[auto_1fr] bg-[var(--tienos-color-detail)]">
          <header className="flex min-h-[70px] items-center gap-2 border-b border-[var(--tienos-color-separator)] px-5 pt-4 max-[700px]:px-3">
            {chrome}
            <button className={controlClass} type="button" onClick={() => requestNavigation(today)}>
              Today
            </button>
            <div className="ml-auto flex gap-1">
              <button
                className={iconButtonClass}
                type="button"
                aria-label="Previous month"
                onClick={() => requestNavigation(addMonths(month, -1))}
              >
                ‹
              </button>
              <button
                className={iconButtonClass}
                type="button"
                aria-label="Next month"
                onClick={() => requestNavigation(addMonths(month, 1))}
              >
                ›
              </button>
            </div>
          </header>
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_260px] max-[700px]:block max-[700px]:overflow-y-auto">
            <section
              className="flex min-h-0 flex-col p-4 max-[700px]:h-[65%] max-[700px]:min-h-[360px] max-[430px]:p-2"
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
                  const isToday = cell.key === todayKey;
                  const count = events.filter((event) => event.date === cell.key).length;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      role="gridcell"
                      tabIndex={active ? 0 : -1}
                      aria-selected={active}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${detailFormatter.format(cell.date)}${count ? `, ${count} events` : ""}`}
                      onClick={() => requestNavigation(cell.date)}
                      className={`relative min-h-10 touch-manipulation bg-[var(--tienos-color-content)] p-1 text-left hover:brightness-110 [@media(pointer:coarse)]:min-h-11 ${cell.inMonth ? "" : "text-[var(--tienos-color-text-tertiary)]"} ${active ? "ring-2 ring-inset ring-[var(--tienos-color-accent)]" : ""}`}
                    >
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full ${isToday ? "bg-[#ff3b30] font-semibold text-white [@media(forced-colors:active)]:[outline:2px_solid_CanvasText] [@media(forced-colors:active)]:outline-offset-1" : ""}`}
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
              className="min-h-0 overflow-auto border-l border-[var(--tienos-color-separator)] bg-[var(--tienos-color-sidebar)] p-4 max-[700px]:min-h-[150px] max-[700px]:overflow-visible max-[700px]:border-t max-[700px]:border-l-0"
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
                  onClick={() => requestEditor({ id: "", date: selectedKey, title: "", time: undefined })}
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
                      onClick={() => requestEditor(event)}
                    >
                      <strong className="block truncate">{event.title}</strong>
                      <span className="text-[11px] text-[var(--tienos-color-text-secondary)]">
                        {event.time || "All day"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {saveError && (
                <p
                  role="alert"
                  className="mt-4 rounded-[var(--tienos-radius-control)] border border-[#ff453a] bg-[var(--tienos-color-content)] p-3 text-sm"
                >
                  {saveError}
                </p>
              )}
              {pendingAction && draft && (
                <div
                  role="alertdialog"
                  aria-labelledby="calendar-navigation-prompt-title"
                  aria-describedby="calendar-navigation-prompt-description"
                  className="mt-4 space-y-3 rounded-[var(--tienos-radius-content)] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-content)] p-3 shadow-[var(--tienos-shadow-window)]"
                >
                  <h3 id="calendar-navigation-prompt-title" className="font-semibold">
                    Save changes before {pendingClose ? "closing" : "navigating"}?
                  </h3>
                  <p
                    id="calendar-navigation-prompt-description"
                    className="text-[11px] text-[var(--tienos-color-text-secondary)]"
                  >
                    This event stays on {detailFormatter.format(fromDateKey(draft.date) ?? selected)}.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button ref={keepEditingRef} className={controlClass} type="button" onClick={keepEditing}>
                      Keep Editing
                    </button>
                    <button className={controlClass} type="button" onClick={discardAndContinue}>
                      Discard and {pendingClose ? "Close" : "Navigate"}
                    </button>
                    <button
                      className={`${controlClass} bg-[var(--tienos-color-accent)] text-white`}
                      type="button"
                      disabled={!draft.title.trim()}
                      onClick={saveAndContinue}
                    >
                      Save and {pendingClose ? "Close" : "Navigate"}
                    </button>
                  </div>
                </div>
              )}
              {draft && (
                <EventEditor
                  event={draft}
                  titleInputRef={titleInputRef}
                  onChange={(event) => {
                    setDraft(event);
                    setSaveError(null);
                  }}
                  onCancel={closeEditor}
                  onSave={saveDraft}
                  onDelete={
                    draft.id
                      ? () => {
                          if (commit(deleteEvent(events, draft.id))) closeEditor();
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
  titleInputRef,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  event: CalendarEvent;
  titleInputRef: RefObject<HTMLInputElement | null>;
  onChange: (event: CalendarEvent) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <form
      className="mt-4 space-y-2 rounded-[var(--tienos-radius-content)] border border-[var(--tienos-color-border)] bg-[var(--tienos-color-content)] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <label className="block text-[11px] font-medium">
        Title
        <input
          ref={titleInputRef}
          required
          value={event.title}
          onChange={(e) => onChange({ ...event, title: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className="block text-[11px] font-medium">
        Time (optional)
        <input
          type="time"
          value={event.time ?? ""}
          onChange={(e) => onChange({ ...event, time: e.target.value || undefined })}
          className={inputClass}
        />
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
