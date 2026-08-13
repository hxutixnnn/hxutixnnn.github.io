import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "../../components/FontAwesomeIcon";
import type { DesktopAppWindowProps } from "../../desktop/apps";
import { defaultCompactFrame, defaultDesktopFrame, type Frame } from "../../windows/geometry";
import { WindowFrame } from "../../windows/WindowFrame";
import { createNote, loadNotes, saveNotes, searchNotes, updateNote, type Note } from "./noteStore";

export function NotesApp({
  appId,
  frontmost,
  windowState,
  effects,
  onEffectsConsumed,
  onEvent,
  workspace,
  dockTargetRectProvider,
}: DesktopAppWindowProps) {
  const initialNotes = useMemo(loadNotes, []);
  const [notes, setNotes] = useState<readonly Note[]>(initialNotes);
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [deleted, setDeleted] = useState<{ note: Note; index: number } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [frame, setFrame] = useState<Frame>(() =>
    workspace.layout === "compact" ? defaultCompactFrame(workspace) : defaultDesktopFrame(workspace.viewport),
  );
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const filtered = useMemo(() => searchNotes(notes, query), [notes, query]);
  const selected = notes.find((note) => note.id === selectedId) ?? null;

  const addNote = useCallback(() => {
    const note = createNote();
    setNotes((current) => [note, ...current]);
    setSelectedId(note.id);
    setDeleted(null);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  useEffect(() => {
    setSaveFailed(!saveNotes(notes));
  }, [notes]);
  const retrySave = () => setSaveFailed(!saveNotes(notes));
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!frontmost || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "n") return;
      event.preventDefault();
      addNote();
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [addNote, frontmost]);
  const removeNote = () => {
    if (!selected) return;
    const index = notes.findIndex((note) => note.id === selected.id);
    setDeleted({ note: selected, index });
    const remaining = notes.filter((note) => note.id !== selected.id);
    setNotes(remaining);
    setSelectedId(remaining[0]?.id ?? null);
  };
  const undoDelete = () => {
    if (!deleted) return;
    setNotes((current) => [
      ...current.slice(0, deleted.index),
      deleted.note,
      ...current.slice(deleted.index),
    ]);
    setSelectedId(deleted.note.id);
    setDeleted(null);
  };
  const edit = (patch: Partial<Pick<Note, "title" | "body">>) => {
    if (!selected) return;
    setNotes((current) =>
      current.map((note) =>
        note.id === selected.id
          ? updateNote(note, { title: patch.title ?? note.title, body: patch.body ?? note.body })
          : note,
      ),
    );
  };

  return (
    <WindowFrame
      appId={appId}
      frontmost={frontmost}
      title="Notes"
      lifecycle={{ state: windowState, effects, dispatch: onEvent, effectsConsumed: onEffectsConsumed }}
      geometry={{ frame, workspace, onFrameChange: setFrame, transitionTargetRect: dockTargetRectProvider }}
      contentStyle={{
        gridTemplateColumns: workspace.layout === "compact" ? "42% minmax(0,1fr)" : "260px minmax(0,1fr)",
      }}
    >
      {(chrome) => (
        <>
          <aside className="settings-drag-handle flex min-h-0 flex-col border-r border-[var(--tienos-color-separator)] bg-[var(--tienos-color-sidebar)] p-2 [@media(prefers-reduced-transparency:reduce)]:bg-[var(--tienos-color-sidebar)] [@media(forced-colors:active)]:bg-[Canvas]">
            {chrome}
            <div className="mb-2 flex gap-2">
              <label className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--tienos-color-border)] bg-[var(--tienos-color-control)] px-3 [@media(pointer:coarse)]:min-h-[44px]">
                <FontAwesomeIcon name="magnifying-glass" />
                <span className="sr-only">Search notes</span>
                <input
                  aria-label="Search notes"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </label>
              <button
                type="button"
                aria-label="Create note"
                aria-keyshortcuts="Meta+N Control+N"
                onClick={addNote}
                className="min-h-9 min-w-9 touch-manipulation rounded-xl bg-[var(--tienos-color-accent)] text-white [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]"
              >
                ＋
              </button>
            </div>
            <div
              role="listbox"
              aria-label="Notes"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              {filtered.length ? (
                filtered.map((note) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={note.id === selectedId}
                    key={note.id}
                    onClick={() => setSelectedId(note.id)}
                    className="mb-1 min-h-14 w-full touch-manipulation rounded-xl px-3 py-2 text-left hover:bg-[var(--tienos-color-hover)] aria-selected:bg-[var(--tienos-color-accent)] aria-selected:text-white"
                  >
                    <strong className="block truncate">{note.title || "Untitled"}</strong>
                    <span className="block truncate text-xs opacity-70">
                      {note.body || "No additional text"}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-8 text-center text-[var(--tienos-color-text-secondary)]">
                  {query ? "No matching notes" : "No notes yet"}
                </p>
              )}
            </div>
          </aside>
          <section className="relative flex min-h-0 min-w-0 flex-col bg-[var(--tienos-color-content)]">
            {selected ? (
              <>
                <header className="settings-drag-handle flex min-h-14 items-center gap-2 border-b border-[var(--tienos-color-separator)] px-4">
                  <input
                    aria-label="Note title"
                    value={selected.title}
                    onChange={(e) => edit({ title: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
                  />
                  <button
                    type="button"
                    onClick={removeNote}
                    aria-label={`Delete ${selected.title || "Untitled"}`}
                    className="min-h-10 min-w-10 touch-manipulation rounded-xl text-red-500 hover:bg-[var(--tienos-color-hover)] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]"
                  >
                    Delete
                  </button>
                </header>
                <textarea
                  ref={editorRef}
                  aria-label="Note text"
                  value={selected.body}
                  onChange={(e) => edit({ body: e.target.value })}
                  placeholder="Start writing…"
                  className="min-h-0 flex-1 resize-none bg-transparent p-5 text-[15px] leading-6 outline-none [user-select:text]"
                />
              </>
            ) : (
              <div className="grid h-full place-content-center gap-3 text-center text-[var(--tienos-color-text-secondary)]">
                <span className="text-5xl">▤</span>
                <strong className="text-lg text-[var(--tienos-color-text-primary)]">Select a note</strong>
                <button
                  type="button"
                  onClick={addNote}
                  className="min-h-11 rounded-xl bg-[var(--tienos-color-accent)] px-5 text-white [@media(pointer:coarse)]:min-h-[44px]"
                >
                  Create a Note
                </button>
              </div>
            )}
            {(deleted || saveFailed) && (
              <div className="absolute right-4 bottom-4 flex max-w-[calc(100%-2rem)] flex-col items-end gap-2">
                {deleted && (
                  <div
                    role="status"
                    className="flex items-center gap-3 rounded-xl border border-[var(--tienos-color-border)] bg-[var(--tienos-color-menu)] p-3 shadow-lg"
                  >
                    <span>Note deleted</span>
                    <button
                      type="button"
                      onClick={undoDelete}
                      className="min-h-9 rounded-lg px-3 font-semibold text-[var(--tienos-color-accent)] [@media(pointer:coarse)]:min-h-[44px]"
                    >
                      Undo
                    </button>
                  </div>
                )}
                {saveFailed && (
                  <div
                    role="alert"
                    className="flex items-center gap-3 rounded-xl border border-red-500 bg-[var(--tienos-color-menu)] p-3 shadow-lg"
                  >
                    <span>Changes aren’t saved on this device.</span>
                    <button
                      type="button"
                      onClick={retrySave}
                      className="min-h-9 rounded-lg px-3 font-semibold text-[var(--tienos-color-accent)] [@media(pointer:coarse)]:min-h-[44px]"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </WindowFrame>
  );
}
