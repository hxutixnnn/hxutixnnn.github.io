import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSingleWindowController } from "./useSingleWindowController";

describe("useSingleWindowController", () => {
  it("keeps effects queued after a consumer acknowledges an older batch", () => {
    const { result } = renderHook(() => useSingleWindowController());

    act(() => result.current.dispatch({ type: "LAUNCH" }));
    expect(result.current.effects).toHaveLength(1);
    const consumedCount = result.current.effects.length;

    act(() => {
      result.current.dispatch({ type: "ACTIVATE_FROM_MENU" });
      result.current.effectsConsumed(consumedCount);
    });

    expect(result.current.effects).toEqual([{ type: "FOCUS", generation: 0, epoch: 2 }]);
  });
});
