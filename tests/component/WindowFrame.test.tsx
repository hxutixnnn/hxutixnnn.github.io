import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { WindowFrame } from "@/os/shell/WindowFrame";
import type { WindowState } from "@/os/domain/windows";

const windowState: WindowState = {
  id: "window-1",
  appId: "about",
  status: "open",
  rect: { x: 40, y: 30, width: 600, height: 480 },
  z: 2,
};

it("uses a labelled modeless region with named native controls", async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  const requestMinimize = vi.fn();
  const finishMinimize = vi.fn();
  const { rerender } = render(
    <WindowFrame
      window={windowState}
      title="About"
      viewport={{ width: 1200, height: 700 }}
      mobile={false}
      focused
      minimizing={false}
      resizable
      registerFrame={() => undefined}
      onFocus={() => undefined}
      onClose={close}
      onRequestMinimize={requestMinimize}
      onMinimizeAnimationEnd={finishMinimize}
      onToggleMaximize={() => undefined}
      onMove={() => undefined}
      onResize={() => undefined}
      onSnap={() => undefined}
    >
      <p>About content</p>
    </WindowFrame>,
  );
  const region = screen.getByRole("region", { name: "About" });
  expect(region).not.toHaveAttribute("aria-modal");
  expect(screen.getByRole("button", { name: "Close About" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Minimize About" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Maximize About" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Close About" }));
  await user.click(screen.getByRole("button", { name: "Minimize About" }));
  expect(close).toHaveBeenCalledOnce();
  expect(requestMinimize).toHaveBeenCalledOnce();
  expect(finishMinimize).not.toHaveBeenCalled();

  rerender(
    <WindowFrame
      window={windowState}
      title="About"
      viewport={{ width: 1200, height: 700 }}
      mobile={false}
      focused
      minimizing
      resizable
      registerFrame={() => undefined}
      onFocus={() => undefined}
      onClose={close}
      onRequestMinimize={requestMinimize}
      onMinimizeAnimationEnd={finishMinimize}
      onToggleMaximize={() => undefined}
      onMove={() => undefined}
      onResize={() => undefined}
      onSnap={() => undefined}
    >
      <p>About content</p>
    </WindowFrame>,
  );
  expect(screen.getByRole("region", { name: "About" })).toHaveClass("is-minimizing");
});

it("removes maximize and resize affordances in mobile mode", () => {
  const { container } = render(
    <WindowFrame
      window={windowState}
      title="About"
      viewport={{ width: 390, height: 700 }}
      mobile
      focused
      minimizing={false}
      resizable
      registerFrame={() => undefined}
      onFocus={() => undefined}
      onClose={() => undefined}
      onRequestMinimize={() => undefined}
      onMinimizeAnimationEnd={() => undefined}
      onToggleMaximize={() => undefined}
      onMove={() => undefined}
      onResize={() => undefined}
      onSnap={() => undefined}
    >
      <p>About content</p>
    </WindowFrame>,
  );
  expect(container.querySelectorAll(".resize-handle")).toHaveLength(0);
});
