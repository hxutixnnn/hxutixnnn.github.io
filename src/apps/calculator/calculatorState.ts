export type Operator = "add" | "subtract" | "multiply" | "divide";

export type CalculatorState = Readonly<{
  display: string;
  accumulator: number | null;
  pending: Operator | null;
  waitingForOperand: boolean;
  lastOperator: Operator | null;
  lastOperand: number | null;
  error: boolean;
}>;

export type CalculatorAction =
  | { type: "digit"; digit: string }
  | { type: "decimal" }
  | { type: "clear" }
  | { type: "all-clear" }
  | { type: "sign" }
  | { type: "percent" }
  | { type: "operator"; operator: Operator }
  | { type: "equals" };

export const initialCalculatorState: CalculatorState = {
  display: "0",
  accumulator: null,
  pending: null,
  waitingForOperand: false,
  lastOperator: null,
  lastOperand: null,
  error: false,
};

const MAX_DIGITS = 15;

function calculate(left: number, right: number, operator: Operator): number | null {
  const result =
    operator === "add"
      ? left + right
      : operator === "subtract"
        ? left - right
        : operator === "multiply"
          ? left * right
          : right === 0
            ? null
            : left / right;
  return result !== null && Number.isFinite(result) ? result : null;
}

function canonical(value: number): string {
  if (Object.is(value, -0)) return "0";
  const rounded = Number.parseFloat(value.toPrecision(MAX_DIGITS));
  const text = String(rounded);
  return text.length <= 18 ? text : rounded.toExponential(9).replace(/\.0+(?=e)|0+(?=e)/, "");
}

function errorState(): CalculatorState {
  return { ...initialCalculatorState, display: "Error", error: true, waitingForOperand: true };
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  if (state.error && action.type !== "clear" && action.type !== "all-clear") {
    if (action.type !== "digit" && action.type !== "decimal") return state;
    state = initialCalculatorState;
  }

  switch (action.type) {
    case "all-clear":
      return initialCalculatorState;
    case "clear":
      return state.display === "0" || state.waitingForOperand
        ? initialCalculatorState
        : { ...state, display: "0", waitingForOperand: true, error: false };
    case "digit": {
      if (!/^\d$/.test(action.digit)) return state;
      const digits = state.display.replace(/[-.]/g, "").length;
      if (!state.waitingForOperand && digits >= MAX_DIGITS) return state;
      return {
        ...state,
        display:
          state.waitingForOperand || state.display === "0" ? action.digit : state.display + action.digit,
        waitingForOperand: false,
        lastOperator: state.waitingForOperand ? null : state.lastOperator,
      };
    }
    case "decimal":
      if (state.waitingForOperand)
        return { ...state, display: "0.", waitingForOperand: false, lastOperator: null };
      return state.display.includes(".") ? state : { ...state, display: `${state.display}.` };
    case "sign":
      if (state.display === "0" || (state.waitingForOperand && state.pending !== null)) return state;
      return {
        ...state,
        display: state.display.startsWith("-") ? state.display.slice(1) : `-${state.display}`,
      };
    case "percent": {
      const current = Number(state.display);
      const value =
        (state.pending === "add" || state.pending === "subtract") && state.accumulator !== null
          ? (state.accumulator * current) / 100
          : current / 100;
      return { ...state, display: canonical(value), waitingForOperand: false };
    }
    case "operator": {
      const current = Number(state.display);
      let accumulator = state.accumulator;
      if (state.pending && accumulator !== null && !state.waitingForOperand) {
        accumulator = calculate(accumulator, current, state.pending);
        if (accumulator === null) return errorState();
      } else if (accumulator === null || !state.waitingForOperand) accumulator = current;
      return {
        ...state,
        display: canonical(accumulator),
        accumulator,
        pending: action.operator,
        waitingForOperand: true,
        lastOperator: null,
        lastOperand: null,
      };
    }
    case "equals": {
      const operator = state.pending ?? state.lastOperator;
      const left = state.pending && state.accumulator !== null ? state.accumulator : Number(state.display);
      const right = state.pending ? Number(state.display) : state.lastOperand;
      if (!operator || right === null) return state;
      const result = calculate(left, right, operator);
      if (result === null) return errorState();
      return {
        ...state,
        display: canonical(result),
        accumulator: null,
        pending: null,
        waitingForOperand: true,
        lastOperator: operator,
        lastOperand: right,
      };
    }
  }
}

export function formatCalculatorDisplay(display: string): string {
  if (display === "Error") return display;
  const [mantissa, exponent] = display.toLowerCase().split("e");
  const negative = mantissa.startsWith("-");
  const unsigned = negative ? mantissa.slice(1) : mantissa;
  const [integer, fraction] = unsigned.split(".");
  const grouped = Number(integer || "0").toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${negative ? "−" : ""}${grouped}${fraction !== undefined ? `.${fraction}` : ""}${exponent ? `e${exponent}` : ""}`;
}
