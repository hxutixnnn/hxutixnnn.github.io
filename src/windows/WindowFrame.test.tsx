import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultDesktopFrame, workspaceFromMeasurements } from "./geometry";
import { initialSingleWindowState, type SingleWindowState, type WindowEvent } from "./singleWindowMachine";
import { WindowFrame } from "./WindowFrame";

const workspace = workspaceFromMeasurements({ width: 1000, height: 800 }, 30, 740, 0);
const frame = defaultDesktopFrame(workspace.viewport);

afterEach(cleanup);

function renderFrame(state: SingleWindowState = initialSingleWindowState) {
  const dispatch = vi.fn<(event: WindowEvent) => void>();
  render(
    <WindowFrame
      title="Example"
      lifecycle={{ state, effects: [], dispatch }}
      geometry={{ frame, workspace, onFrameChange: vi.fn(), transitionTargetRect: () => null }}
    >
      {(chrome) => (
        <div data-settings-portal="">
          {chrome}
          <button>Content action</button>
        </div>
      )}
    </WindowFrame>,
  );
  return dispatch;
}

describe("WindowFrame", () => {
  it("projects semantic chrome and typed pointer, keyboard, and focus activation", () => {
    const dispatch = renderFrame();
    const fullscreen = screen.getByRole("button", { name: "Toggle fullscreen Example" });
    expect(fullscreen).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Close Example" }));
    fireEvent.click(screen.getByRole("button", { name: "Minimize Example" }));
    fireEvent.keyDown(fullscreen, { key: "Enter" });
    fireEvent.click(fullscreen);
    fireEvent.pointerDown(screen.getByRole("region", { name: "Example" }));
    fireEvent.focus(screen.getByRole("button", { name: "Content action" }));
    expect(dispatch.mock.calls.flat()).toEqual(
      expect.arrayContaining([
        { type: "CLOSE" },
        { type: "MINIMIZE" },
        { type: "TOGGLE_FULLSCREEN" },
        { type: "WINDOW_INTERACTION" },
      ]),
    );
  });

  it.each(["minimizing", "minimized", "restoring"] as const)(
    "makes %s projection inert and aria-hidden while retaining one frame",
    (visibility) => {
      renderFrame({ ...initialSingleWindowState, visibility, active: false });
      const region = document.querySelector<HTMLElement>('[data-genie-window][aria-label="Example"]')!;
      expect(region).toHaveAttribute("aria-hidden", "true");
      expect(region).toHaveAttribute("inert");
      expect(document.querySelectorAll("[data-genie-window]")).toHaveLength(1);
      expect(document.querySelector(".settings-rnd")).toHaveAttribute("data-window-visibility", visibility);
    },
  );
});
