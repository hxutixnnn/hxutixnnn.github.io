export const NOTES_STORAGE_KEY = "tienos.notes";
export const NOTES_STORAGE_VERSION = 1;

export type Note = Readonly<{
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}>;

export type NotesDocument = Readonly<{ version: 1; notes: readonly Note[] }>;

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const note = value as Record<string, unknown>;
  return (
    typeof note.id === "string" &&
    note.id.length > 0 &&
    typeof note.title === "string" &&
    typeof note.body === "string" &&
    typeof note.createdAt === "number" &&
    Number.isFinite(note.createdAt) &&
    typeof note.updatedAt === "number" &&
    Number.isFinite(note.updatedAt)
  );
}

export function parseNotes(raw: string | null): readonly Note[] {
  if (!raw) return [];
  try {
    const document = JSON.parse(raw) as Partial<NotesDocument>;
    if (document.version !== NOTES_STORAGE_VERSION || !Array.isArray(document.notes)) return [];
    const seenIds = new Set<string>();
    return document.notes.filter((note): note is Note => {
      if (!isNote(note) || seenIds.has(note.id)) return false;
      seenIds.add(note.id);
      return true;
    });
  } catch {
    return [];
  }
}

export function loadNotes(storage: Pick<Storage, "getItem"> = localStorage): readonly Note[] {
  try {
    return parseNotes(storage.getItem(NOTES_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveNotes(notes: readonly Note[], storage: Pick<Storage, "setItem"> = localStorage): boolean {
  try {
    storage.setItem(NOTES_STORAGE_KEY, JSON.stringify({ version: NOTES_STORAGE_VERSION, notes }));
    return true;
  } catch {
    return false;
  }
}

export function createNote(now = Date.now(), id: string = crypto.randomUUID()): Note {
  return { id, title: "New Note", body: "", createdAt: now, updatedAt: now };
}

export function updateNote(note: Note, patch: Pick<Note, "title" | "body">, now = Date.now()): Note {
  return { ...note, ...patch, updatedAt: now };
}

export function searchNotes(notes: readonly Note[], query: string): readonly Note[] {
  const needle = query.trim().toLocaleLowerCase();
  return [...notes]
    .filter((note) => !needle || `${note.title}\n${note.body}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
