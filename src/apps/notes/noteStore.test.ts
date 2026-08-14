import { describe, expect, it } from "vitest";
import {
  createNote,
  loadNotes,
  NOTES_STORAGE_KEY,
  parseNotes,
  saveNotes,
  searchNotes,
  updateNote,
} from "./noteStore";

describe("Notes persistence", () => {
  it("round trips versioned note data", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
    };
    const note = updateNote(createNote(1, "one"), { title: "Trip", body: "Pack boots" }, 2);
    expect(saveNotes([note], adapter)).toBe(true);
    expect(loadNotes(adapter)).toEqual([note]);
    expect(storage.has(NOTES_STORAGE_KEY)).toBe(true);
  });

  it.each(["not json", '{"version":2,"notes":[]}', '{"version":1,"notes":[null,{"id":3}]}'])(
    "recovers safely from corrupt or unsupported data",
    (raw) => {
      expect(parseNotes(raw)).toEqual([]);
    },
  );

  it("recovers when storage access fails", () => {
    expect(
      loadNotes({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toEqual([]);
    expect(
      saveNotes([], {
        setItem: () => {
          throw new Error("full");
        },
      }),
    ).toBe(false);
  });

  it("keeps only the first valid note for each persisted ID", () => {
    const first = createNote(1, "duplicate");
    const second = updateNote(createNote(2, "duplicate"), { title: "Later", body: "" }, 3);
    expect(parseNotes(JSON.stringify({ version: 1, notes: [first, second] }))).toEqual([first]);
  });
});

describe("Notes operations", () => {
  it("creates, updates, and searches title and body without case sensitivity", () => {
    const first = updateNote(createNote(1, "a"), { title: "Groceries", body: "Coffee" }, 3);
    const second = updateNote(createNote(2, "b"), { title: "Ideas", body: "Build a BOAT" }, 4);
    expect(searchNotes([first, second], "coffee")).toEqual([first]);
    expect(searchNotes([first, second], "boat")).toEqual([second]);
    expect(searchNotes([first, second], "")).toEqual([second, first]);
  });
});
