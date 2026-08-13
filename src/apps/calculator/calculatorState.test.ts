import { describe, expect, it } from "vitest";
import {
  calculatorReducer,
  formatCalculatorDisplay,
  initialCalculatorState,
  type CalculatorAction,
} from "./calculatorState";

const run = (...actions: CalculatorAction[]) => actions.reduce(calculatorReducer, initialCalculatorState);
const digit = (value: string): CalculatorAction => ({ type: "digit", digit: value });
const op = (operator: "add" | "subtract" | "multiply" | "divide"): CalculatorAction => ({
  type: "operator",
  operator,
});

it("calculates all standard operations and chains using the displayed result", () => {
  expect(run(digit("8"), op("add"), digit("2"), op("multiply"), digit("3"), { type: "equals" }).display).toBe(
    "30",
  );
  expect(run(digit("9"), op("subtract"), digit("4"), { type: "equals" }).display).toBe("5");
  expect(run(digit("8"), op("divide"), digit("4"), { type: "equals" }).display).toBe("2");
});

it("supports decimal entry without duplicate points and formats grouping", () => {
  const state = run(
    { type: "decimal" },
    { type: "decimal" },
    digit("5"),
    op("add"),
    digit("1"),
    { type: "decimal" },
    digit("2"),
    { type: "equals" },
  );
  expect(state.display).toBe("1.7");
  expect(formatCalculatorDisplay("-1234567.50")).toBe("−1,234,567.50");
});

it("repeats equals with the previous operation", () => {
  expect(run(digit("2"), op("add"), digit("3"), { type: "equals" }, { type: "equals" }).display).toBe("8");
});

it("uses macOS contextual percent semantics", () => {
  expect(
    run(
      digit("2"),
      digit("0"),
      digit("0"),
      op("add"),
      digit("1"),
      digit("0"),
      { type: "percent" },
      { type: "equals" },
    ).display,
  ).toBe("220");
  expect(
    run(
      digit("5"),
      digit("0"),
      digit("0"),
      op("multiply"),
      digit("8"),
      { type: "percent" },
      { type: "equals" },
    ).display,
  ).toBe("40");
  expect(
    run(
      digit("5"),
      digit("0"),
      digit("0"),
      op("divide"),
      digit("8"),
      { type: "percent" },
      {
        type: "equals",
      },
    ).display,
  ).toBe("6250");
});

it("toggles the sign of a completed result without changing next-input behavior", () => {
  const negative = run(digit("2"), op("add"), digit("3"), { type: "equals" }, { type: "sign" });
  expect(negative.display).toBe("-5");
  expect(negative.waitingForOperand).toBe(true);
  expect(calculatorReducer(negative, digit("2")).display).toBe("2");
});

describe("error recovery", () => {
  it("reports division by zero and recovers with clear or a digit", () => {
    const errored = run(digit("8"), op("divide"), digit("0"), { type: "equals" });
    expect(errored).toMatchObject({ display: "Error", error: true });
    expect(calculatorReducer(errored, digit("7"))).toMatchObject({ display: "7", error: false });
    expect(calculatorReducer(errored, { type: "all-clear" })).toEqual(initialCalculatorState);
  });
});
