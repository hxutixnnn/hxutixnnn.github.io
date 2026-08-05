export const GAME_DURATION_MS = 30_000;
export const CATCH_LINE = 82;
export const PLAYER_SPEED = 42;
export const TARGET_SPEED = 28;
export const SPAWN_INTERVAL_MS = 780;

export type GamePhase = "ready" | "playing" | "finished";
export type GameInput = -1 | 0 | 1;

export type SparkTarget = {
  id: number;
  x: number;
  y: number;
};

export type ArcadeGameState = {
  phase: GamePhase;
  score: number;
  misses: number;
  elapsedMs: number;
  playerX: number;
  targets: readonly SparkTarget[];
  seed: number;
  nextTargetId: number;
  spawnInMs: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function nextRandom(seed: number): { value: number; seed: number } {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return { value: next / 4294967296, seed: next };
}

function createTarget(id: number, seed: number): { target: SparkTarget; seed: number } {
  const random = nextRandom(seed);
  return {
    target: { id, x: 8 + random.value * 84, y: -8 },
    seed: random.seed,
  };
}

export function createGameState(seed = 0x1a2b3c4d): ArcadeGameState {
  const first = createTarget(1, seed);
  return {
    phase: "ready",
    score: 0,
    misses: 0,
    elapsedMs: 0,
    playerX: 50,
    targets: [{ ...first.target, y: 14 }],
    seed: first.seed,
    nextTargetId: 2,
    spawnInMs: SPAWN_INTERVAL_MS,
  };
}

export function startGame(state: ArcadeGameState): ArcadeGameState {
  if (state.phase === "playing") return state;
  const nextState = state.phase === "finished" ? resetGame() : state;
  return { ...nextState, phase: "playing" };
}

export function resetGame(seed = Date.now()): ArcadeGameState {
  return createGameState(seed >>> 0);
}

export function stepGame(state: ArcadeGameState, input: GameInput, deltaMs: number): ArcadeGameState {
  if (state.phase !== "playing") return state;
  const elapsed = Math.min(Math.max(deltaMs, 0), 250);
  const nextPlayerX = clamp(state.playerX + input * PLAYER_SPEED * (elapsed / 1000), 8, 92);
  const nextElapsedMs = Math.min(GAME_DURATION_MS, state.elapsedMs + elapsed);
  let nextSeed = state.seed;
  let nextTargetId = state.nextTargetId;
  let spawnInMs = state.spawnInMs - elapsed;
  const scoreTargets: SparkTarget[] = [];
  let score = state.score;
  let misses = state.misses;

  for (const target of state.targets) {
    const nextY = target.y + TARGET_SPEED * (elapsed / 1000);
    const crossedCatchLine = target.y < CATCH_LINE && nextY >= CATCH_LINE;
    const caught = crossedCatchLine && Math.abs(target.x - nextPlayerX) <= 13;
    if (caught) score += 1;
    else if (nextY > 105) misses += 1;
    else scoreTargets.push({ ...target, y: nextY });
  }

  while (spawnInMs <= 0) {
    const created = createTarget(nextTargetId, nextSeed);
    scoreTargets.push(created.target);
    nextSeed = created.seed;
    nextTargetId += 1;
    spawnInMs += SPAWN_INTERVAL_MS;
  }

  return {
    ...state,
    phase: nextElapsedMs >= GAME_DURATION_MS ? "finished" : "playing",
    score,
    misses,
    elapsedMs: nextElapsedMs,
    playerX: nextPlayerX,
    targets: scoreTargets,
    seed: nextSeed,
    nextTargetId,
    spawnInMs,
  };
}

export function gameStatus(state: ArcadeGameState): string {
  if (state.phase === "ready") return "Ready when you are";
  if (state.phase === "finished")
    return `Round over — ${state.score} spark${state.score === 1 ? "" : "s"} caught`;
  return `${state.score} spark${state.score === 1 ? "" : "s"} caught`;
}
