import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MenuBar } from "./MenuBar";

describe("MenuBar", () => {
  it("renders the system menu with the approved menu structure", async () => {
    const onAction = vi.fn();
    render(<MenuBar onAction={onAction} />);

    fireEvent.click(screen.getByRole("menuitem", { name: "Open tienOS menu" }));

    expect(await screen.findByText("About This OS")).toBeVisible();
    expect(screen.getByText("System Settings…")).toBeVisible();
    expect(screen.getByText("Recent Items")).toBeVisible();
    expect(screen.getByText("Lock Screen")).toBeVisible();
  });

  it("opens the system menu with the registered keyboard shortcut", async () => {
    render(<MenuBar />);

    fireEvent.keyDown(document, {
      code: "KeyO",
      key: "o",
      metaKey: true,
      shiftKey: true,
    });

    expect(await screen.findByText("About This OS")).toBeVisible();
  });
});
