import { describe, expect, it } from "vitest";
import { GAME_DURATION_MS, createGameState, gameStatus, startGame, stepGame } from "@/apps/airconsole/game";
import {
  createControllerInputMessage,
  isControllerMessage,
  isRoomMessage,
  makeRoomCode,
  roomChannelName,
} from "@/apps/airconsole/transport";

describe("Relay Arcade game state", () => {
  it("starts ready, moves the shuttle, and catches a spark at the line", () => {
    const ready = createGameState(7);
    expect(ready.phase).toBe("ready");
    const playing = startGame({ ...ready, targets: [{ id: 1, x: 50, y: 80 }], spawnInMs: 10_000 });
    const next = stepGame(playing, 1, 100);

    expect(next.phase).toBe("playing");
    expect(next.playerX).toBeGreaterThan(50);
    expect(next.score).toBe(1);
    expect(next.misses).toBe(0);
    expect(gameStatus(next)).toContain("spark caught");
  });

  it("counts missed sparks and finishes at the round duration", () => {
    const playing = startGame({
      ...createGameState(8),
      targets: [{ id: 1, x: 10, y: 104 }],
      spawnInMs: 10_000,
    });
    const missed = stepGame(playing, 0, 100);
    const finished = stepGame({ ...missed, targets: [], elapsedMs: GAME_DURATION_MS - 100 }, 0, 100);

    expect(missed.misses).toBe(1);
    expect(finished.phase).toBe("finished");
    expect(gameStatus(finished)).toMatch(/Round over/);
  });
});

describe("Relay Arcade controller messages", () => {
  it("creates room-safe controller messages and validates their shape", () => {
    const message = createControllerInputMessage("ab2c", -1);

    expect(roomChannelName("ab2c")).toBe("tien-relay-arcade:AB2C");
    expect(isRoomMessage(message)).toBe(true);
    expect(isControllerMessage(message)).toBe(true);
    expect(isRoomMessage({ type: "controller:input", room: "AB2C", direction: 2 })).toBe(false);
    expect(makeRoomCode(() => 0)).toBe("AAAA");
  });
});
