import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NotesApp } from "./NotesApp";
import { initialSingleWindowState } from "../../windows/singleWindowMachine";

const workspace = {
  viewport: { width: 1000, height: 700 },
  menuBottom: 36,
  dockTop: 620,
  safeAreaBottom: 0,
  layout: "desktop" as const,
};
const props = {
  appId: "notes",
  frontmost: true,
  windowState: initialSingleWindowState,
  effects: [],
  onEffectsConsumed: () => {},
  onEvent: () => {},
  workspace,
  dockTargetRectProvider: () => null,
};

describe("Notes app", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("supports accessible create, edit, search, delete and undo", async () => {
    render(<NotesApp {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Create a Note" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Note title" }), {
      target: { value: "Daily plan" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Note text" }), {
      target: { value: "Walk by the lake" },
    });
    expect(screen.getByRole("option", { name: /Daily plan/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.change(screen.getByRole("textbox", { name: "Search notes" }), { target: { value: "lake" } });
    expect(screen.getByRole("option", { name: /Daily plan/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Daily plan" }));
    expect(screen.getByRole("status")).toHaveTextContent("Note deleted");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("option", { name: /Daily plan/ })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("tienos.notes")).toContain("Daily plan"));
  });

  it("creates a note with the platform keyboard shortcut", () => {
    render(<NotesApp {...props} />);
    fireEvent.keyDown(document, { key: "n", metaKey: true });
    expect(screen.getByRole("textbox", { name: "Note text" })).toBeInTheDocument();
  });
});
