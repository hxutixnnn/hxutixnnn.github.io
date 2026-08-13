import { useCallback, useEffect, useReducer, useState } from "react";
import type { DesktopAppWindowProps } from "../../desktop/apps";
import { defaultCompactFrame, type Frame } from "../../windows/geometry";
import { WindowFrame } from "../../windows/WindowFrame";
import {
  calculatorReducer,
  formatCalculatorDisplay,
  initialCalculatorState,
  type CalculatorAction,
  type Operator,
} from "./calculatorState";

const keys: readonly Readonly<{
  label: string;
  action: CalculatorAction;
  kind?: "utility" | "operator";
  keyboard?: string;
}>[] = [
  { label: "AC", action: { type: "all-clear" }, kind: "utility", keyboard: "Escape" },
  { label: "+/−", action: { type: "sign" }, kind: "utility" },
  { label: "%", action: { type: "percent" }, kind: "utility", keyboard: "%" },
  { label: "÷", action: { type: "operator", operator: "divide" }, kind: "operator", keyboard: "/" },
  { label: "7", action: { type: "digit", digit: "7" } },
  { label: "8", action: { type: "digit", digit: "8" } },
  { label: "9", action: { type: "digit", digit: "9" } },
  { label: "×", action: { type: "operator", operator: "multiply" }, kind: "operator", keyboard: "*" },
  { label: "4", action: { type: "digit", digit: "4" } },
  { label: "5", action: { type: "digit", digit: "5" } },
  { label: "6", action: { type: "digit", digit: "6" } },
  { label: "−", action: { type: "operator", operator: "subtract" }, kind: "operator", keyboard: "-" },
  { label: "1", action: { type: "digit", digit: "1" } },
  { label: "2", action: { type: "digit", digit: "2" } },
  { label: "3", action: { type: "digit", digit: "3" } },
  { label: "+", action: { type: "operator", operator: "add" }, kind: "operator", keyboard: "+" },
  { label: "0", action: { type: "digit", digit: "0" } },
  { label: ".", action: { type: "decimal" }, keyboard: "." },
  { label: "=", action: { type: "equals" }, kind: "operator", keyboard: "Enter" },
];

const CALCULATOR_MINIMUM = { width: 320, height: 460 } as const;

const operatorByKey: Record<string, Operator> = {
  "+": "add",
  "-": "subtract",
  "*": "multiply",
  "/": "divide",
};

export function CalculatorApp({
  appId,
  frontmost,
  windowState,
  effects,
  onEffectsConsumed,
  onEvent,
  workspace,
  dockTargetRectProvider,
}: DesktopAppWindowProps) {
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculatorState);
  const [frame, setFrame] = useState<Frame>(() =>
    workspace.layout === "compact"
      ? defaultCompactFrame(workspace)
      : {
          width: 360,
          height: Math.min(570, workspace.viewport.height - workspace.menuBottom - 20),
          x: Math.max(12, (workspace.viewport.width - 360) / 2),
          y: Math.max(workspace.menuBottom, (workspace.viewport.height - 570) / 2),
        },
  );
  const updateFrame = useCallback(
    (next: Frame) =>
      setFrame((current) =>
        current.x === next.x &&
        current.y === next.y &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next,
      ),
    [],
  );

  useEffect(() => {
    if (!frontmost || windowState.visibility !== "visible") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      let action: CalculatorAction | undefined;
      if (/^\d$/.test(event.key)) action = { type: "digit", digit: event.key };
      else if (event.key === "." || event.key === ",") action = { type: "decimal" };
      else if (operatorByKey[event.key]) action = { type: "operator", operator: operatorByKey[event.key] };
      else if (event.key === "Enter" || event.key === "=") action = { type: "equals" };
      else if (event.key === "%") action = { type: "percent" };
      else if (event.key === "Escape") action = { type: "all-clear" };
      else if (event.key === "Backspace" || event.key === "Delete") action = { type: "clear" };
      if (action) {
        event.preventDefault();
        dispatch(action);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [frontmost, windowState.visibility]);

  const shown = formatCalculatorDisplay(state.display);
  return (
    <WindowFrame
      appId={appId}
      frontmost={frontmost}
      title="Calculator"
      minimumSize={CALCULATOR_MINIMUM}
      lifecycle={{
        state: windowState,
        effects,
        dispatch: onEvent,
        effectsConsumed: onEffectsConsumed ? () => onEffectsConsumed() : undefined,
      }}
      geometry={{
        frame,
        workspace,
        onFrameChange: updateFrame,
        transitionTargetRect: dockTargetRectProvider,
      }}
      contentStyle={{ minWidth: 0 }}
    >
      {(chrome) => (
        <div className="flex h-full min-h-0 flex-col p-4 pt-5 max-[430px]:p-3">
          {chrome}
          <div className="mb-3 flex min-h-20 flex-1 items-end justify-end overflow-hidden rounded-[18px] border border-white/10 bg-[var(--tienos-color-detail)] px-4 py-3 shadow-inner [@media(forced-colors:active)]:border-[CanvasText] [@media(forced-colors:active)]:bg-[Canvas]">
            <output
              aria-live="polite"
              aria-atomic="true"
              aria-label="Calculator display"
              className="block w-full select-text overflow-hidden text-right text-[clamp(2.25rem,12cqw,4.5rem)] font-light leading-none tracking-tight tabular-nums text-[var(--tienos-color-text-primary)]"
            >
              {shown}
            </output>
          </div>
          <div
            role="group"
            aria-label="Calculator keypad"
            className="grid min-h-0 flex-[3] grid-cols-4 grid-rows-5 gap-2"
          >
            {keys.map((key) => (
              <button
                key={key.label}
                type="button"
                aria-label={key.label === "+/−" ? "Toggle positive or negative" : key.label}
                aria-keyshortcuts={key.keyboard}
                data-calculator-key={key.label}
                onClick={() => dispatch(key.action)}
                className={`min-h-11 touch-manipulation rounded-full border border-white/15 text-[clamp(1.25rem,5cqh,1.75rem)] font-medium shadow-[inset_0_1px_0_rgb(255_255_255/.2),0_2px_6px_rgb(0_0_0/.18)] transition-[filter,transform] hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tienos-color-focus)] motion-reduce:transition-none [@media(forced-colors:active)]:border-[ButtonText] ${key.label === "0" ? "col-span-2 text-left pl-[25%]" : ""} ${key.kind === "operator" ? "bg-[var(--tienos-color-accent)] text-[var(--tienos-color-text-on-accent)]" : key.kind === "utility" ? "bg-[color-mix(in_srgb,var(--tienos-color-control),white_18%)] text-[var(--tienos-color-text-primary)]" : "bg-[var(--tienos-color-control)] text-[var(--tienos-color-text-primary)]"}`}
              >
                {key.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </WindowFrame>
  );
}
