import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialSingleWindowState } from "../../windows/singleWindowMachine";
import { CalculatorApp } from "./CalculatorApp";

afterEach(cleanup);

const workspace = {
  viewport: { width: 1000, height: 800 },
  menuBottom: 36,
  dockTop: 730,
  safeAreaBottom: 0,
  layout: "desktop" as const,
};
function renderCalculator() {
  return render(
    <CalculatorApp
      appId="calculator"
      frontmost
      windowState={initialSingleWindowState}
      effects={[]}
      onEffectsConsumed={vi.fn()}
      onEvent={vi.fn()}
      workspace={workspace}
      dockTargetRectProvider={() => null}
    />,
  );
}

describe("CalculatorApp", () => {
  it("provides an accessible live, copyable output and touch controls", () => {
    renderCalculator();
    const output = screen.getByRole("status", { name: "Calculator display" });
    expect(output).toHaveTextContent("0");
    expect(output).toHaveClass("select-text");
    expect(screen.getByRole("group", { name: "Calculator keypad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7" })).toHaveClass("touch-manipulation");
  });

  it("accepts keyboard arithmetic only while frontmost", () => {
    const view = renderCalculator();
    const calculator = screen.getByRole("region", { name: "Calculator" });
    calculator.focus();
    fireEvent.keyDown(calculator, { key: "4" });
    fireEvent.keyDown(calculator, { key: "*" });
    fireEvent.keyDown(calculator, { key: "5" });
    fireEvent.keyDown(calculator, { key: "Enter" });
    expect(screen.getByRole("status", { name: "Calculator display" })).toHaveTextContent("20");
    view.rerender(
      <CalculatorApp
        appId="calculator"
        frontmost={false}
        windowState={initialSingleWindowState}
        effects={[]}
        onEffectsConsumed={vi.fn()}
        onEvent={vi.fn()}
        workspace={workspace}
        dockTargetRectProvider={() => null}
      />,
    );
    fireEvent.keyDown(calculator, { key: "9" });
    expect(screen.getByRole("status", { name: "Calculator display" })).toHaveTextContent("20");
  });

  it("ignores keyboard input owned by shell and other interactive surfaces", () => {
    renderCalculator();
    const display = screen.getByRole("status", { name: "Calculator display" });
    const calculator = screen.getByRole("region", { name: "Calculator" });
    calculator.focus();
    fireEvent.keyDown(calculator, { key: "7" });
    expect(display).toHaveTextContent("7");

    const input = document.createElement("input");
    const menu = document.createElement("button");
    const dialog = document.createElement("div");
    const otherApp = document.createElement("button");
    menu.dataset.menuActivity = "";
    dialog.setAttribute("role", "dialog");
    otherApp.dataset.desktopActivity = "notes";
    document.body.append(input, menu, dialog, otherApp);

    for (const surface of [input, menu, dialog, otherApp]) {
      surface.focus();
      fireEvent.keyDown(surface, { key: "9" });
    }

    expect(display).toHaveTextContent("7");
    input.remove();
    menu.remove();
    dialog.remove();
    otherApp.remove();
  });

  it("switches the touch clear key between entry clear and all-clear", () => {
    renderCalculator();
    fireEvent.click(screen.getByRole("button", { name: "9" }));
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.click(screen.getByRole("button", { name: "0" }));
    fireEvent.click(screen.getByRole("button", { name: "C" }));
    expect(screen.getByRole("status", { name: "Calculator display" })).toHaveTextContent("0");
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "=" }));
    expect(screen.getByRole("status", { name: "Calculator display" })).toHaveTextContent("11");
    fireEvent.click(screen.getByRole("button", { name: "AC" }));
    expect(screen.getByRole("status", { name: "Calculator display" })).toHaveTextContent("0");
  });
});
