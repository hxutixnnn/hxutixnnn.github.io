import { useEffect, useRef, useState } from "react";
import type { CoreAppProps } from "@/apps/contract";
import {
  CATCH_LINE,
  GAME_DURATION_MS,
  createGameState,
  gameStatus,
  resetGame,
  startGame,
  stepGame,
} from "@/apps/airconsole/game";
import type { ArcadeGameState, GameInput } from "@/apps/airconsole/game";
import {
  createControllerCommandMessage,
  createControllerInputMessage,
  createControllerJoinMessage,
  createRoomTransport,
  makeRoomCode,
} from "@/apps/airconsole/transport";
import type { RoomTransport, TransportMode } from "@/apps/airconsole/transport";

type ArcadeMode = "lobby" | "host" | "controller";

function queryMode(): ArcadeMode {
  if (typeof window === "undefined") return "lobby";
  return new URLSearchParams(window.location.search).get("mode") === "controller" ? "controller" : "lobby";
}

function queryRoom(): string {
  if (typeof window === "undefined") return "PLAY";
  const room = new URLSearchParams(window.location.search).get("room")?.toUpperCase();
  return room && /^[A-Z2-9]{4}$/.test(room) ? room : makeRoomCode();
}

function transportLabel(mode: TransportMode): string {
  if (mode === "broadcast-channel") return "Same-origin tabs linked";
  if (mode === "storage") return "Storage relay ready";
  return "Solo mode only in this browser";
}

function formatTime(elapsedMs: number): string {
  return `${Math.max(0, Math.ceil((GAME_DURATION_MS - elapsedMs) / 1000))}s`;
}

function keyDirection(key: string): GameInput | null {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") return -1;
  if (key === "ArrowRight" || key.toLowerCase() === "d") return 1;
  return null;
}

function RoomBadge({ room }: { room: string }) {
  return (
    <div className="arcade-room-badge" aria-label={`Room code ${room}`}>
      <span>Room</span>
      <strong>{room}</strong>
    </div>
  );
}

function ModeButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" className="arcade-ghost-button" onClick={onClick}>
      {children}
    </button>
  );
}

function GameArena({ state }: { state: ArcadeGameState }) {
  return (
    <div
      className="arcade-arena"
      role="img"
      aria-label={`Spark catching arena. ${state.targets.length} sparks are falling.`}
    >
      <div className="arcade-arena__stars" aria-hidden="true" />
      <div className="arcade-arena__scanline" aria-hidden="true" />
      <div className="arcade-catch-line" style={{ top: `${CATCH_LINE}%` }} aria-hidden="true" />
      {state.targets.map((target) => (
        <span
          className="arcade-spark"
          key={target.id}
          style={{ left: `${target.x}%`, top: `${target.y}%` }}
          aria-hidden="true"
        >
          ✦
        </span>
      ))}
      <span className="arcade-player" style={{ left: `${state.playerX}%` }} aria-hidden="true">
        <span />
      </span>
    </div>
  );
}

function ControlPad({ onInput }: { onInput: (direction: GameInput) => void }) {
  function bind(direction: GameInput) {
    return {
      onPointerDown: () => onInput(direction),
      onPointerUp: () => onInput(0),
      onPointerCancel: () => onInput(0),
      onPointerLeave: () => onInput(0),
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter" || event.key === " ") onInput(direction);
      },
      onKeyUp: () => onInput(0),
    };
  }

  return (
    <div className="arcade-control-pad" aria-label="Controller movement">
      <button type="button" className="arcade-pad-button" aria-label="Move left" {...bind(-1)}>
        <span aria-hidden="true">←</span>
        <small>Left</small>
      </button>
      <button type="button" className="arcade-pad-button" aria-label="Move right" {...bind(1)}>
        <span aria-hidden="true">→</span>
        <small>Right</small>
      </button>
    </div>
  );
}

export default function AirconsoleApp({ announce }: CoreAppProps) {
  const [mode, setMode] = useState<ArcadeMode>(queryMode);
  const [room, setRoom] = useState(queryRoom);
  const [roomDraft, setRoomDraft] = useState(room);
  const [game, setGame] = useState<ArcadeGameState>(() => createGameState());
  const [remoteGame, setRemoteGame] = useState<ArcadeGameState | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>("unavailable");
  const [controllerOnline, setControllerOnline] = useState(false);
  const transportRef = useRef<RoomTransport | null>(null);
  const inputRef = useRef<GameInput>(0);
  const gameRef = useRef(game);
  const clientIdRef = useRef<string | null>(null);

  function updateLocation(nextMode: ArcadeMode, nextRoom = room) {
    const url = new URL(window.location.href);
    if (nextMode === "lobby") url.searchParams.delete("mode");
    else url.searchParams.set("mode", nextMode);
    url.searchParams.set("room", nextRoom);
    window.history.replaceState({ mode: nextMode, room: nextRoom }, "", url);
    setControllerOnline(false);
    setRemoteGame(null);
    if (nextMode === "lobby") setTransportMode("unavailable");
    setMode(nextMode);
  }

  function changeRoom(nextRoom: string) {
    const cleanRoom = nextRoom
      .toUpperCase()
      .replace(/[^A-Z2-9]/g, "")
      .slice(0, 4);
    setRoomDraft(cleanRoom);
    if (/^[A-Z2-9]{4}$/.test(cleanRoom)) {
      setRoom(cleanRoom);
      updateLocation(mode, cleanRoom);
    }
  }

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    transportRef.current?.close();
    transportRef.current = null;
    if (mode === "lobby") return;

    const transport = createRoomTransport(room, (message) => {
      if (mode === "host") {
        if (message.type === "controller:join") {
          setControllerOnline(true);
          transport.send({ type: "host:presence", room });
          transport.send({ type: "host:state", room, state: gameRef.current });
          announce("A controller joined the room");
        } else if (message.type === "controller:input") {
          inputRef.current = message.direction;
        } else if (message.type === "controller:command") {
          if (message.command === "start") setGame((current) => startGame(current));
          if (message.command === "reset") setGame(resetGame());
        }
      } else if (message.type === "host:presence" || message.type === "host:state") {
        setControllerOnline(true);
        if (message.type === "host:state") setRemoteGame(message.state);
      }
    });
    transportRef.current = transport;
    const transportStatusTimer = window.setTimeout(() => setTransportMode(transport.mode), 0);
    if (mode === "controller") {
      const clientId = clientIdRef.current ?? `controller-${Math.random().toString(36).slice(2)}`;
      clientIdRef.current = clientId;
      transport.send(createControllerJoinMessage(room, clientId));
    }

    return () => {
      window.clearTimeout(transportStatusTimer);
      transport.close();
      if (transportRef.current === transport) transportRef.current = null;
    };
  }, [announce, mode, room]);

  useEffect(() => {
    if (mode !== "host") return;
    const timer = window.setInterval(() => {
      setGame((current) => stepGame(current, inputRef.current, 100));
    }, 100);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (mode === "host") {
      transportRef.current?.send({ type: "host:state", room, state: game });
    }
  }, [game, mode, room]);

  useEffect(() => {
    if (mode !== "host") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = keyDirection(event.key);
      if (direction === null) return;
      event.preventDefault();
      inputRef.current = direction;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (keyDirection(event.key) !== null) inputRef.current = 0;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mode]);

  function enterHost() {
    updateLocation("host");
    announce(`Room ${room} ready — host controls are live`);
  }

  function enterController() {
    updateLocation("controller");
    announce(`Controller mode for room ${room}`);
  }

  function openControllerTab() {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", "controller");
    url.searchParams.set("room", room);
    const opened = window.open(url.href, "_blank", "noopener,noreferrer");
    if (opened) {
      opened.opener = null;
      announce(`Controller tab opened for room ${room}`);
    } else {
      enterController();
    }
  }

  function startRound() {
    setGame((current) => startGame(current));
    announce("Round started — catch the falling sparks");
  }

  function resetRound() {
    setGame(resetGame());
    announce("New round ready");
  }

  function sendControllerInput(direction: GameInput) {
    transportRef.current?.send(createControllerInputMessage(room, direction));
  }

  function sendControllerCommand(command: "start" | "reset") {
    transportRef.current?.send(createControllerCommandMessage(room, command));
    announce(command === "start" ? "Start signal sent" : "Reset signal sent");
  }

  if (mode === "controller") {
    const controllerGame = remoteGame;
    return (
      <article className="app-document arcade-app">
        <header className="arcade-header">
          <div>
            <span className="arcade-kicker">Relay Arcade / controller</span>
            <h1>Controller console</h1>
            <p>Steer the shuttle from this tab while the host screen catches the sparks.</p>
          </div>
          <RoomBadge room={room} />
        </header>
        <section className="arcade-controller-card" aria-labelledby="controller-status-title">
          <div className="arcade-status-row">
            <span className={`arcade-status-dot${controllerOnline ? " is-online" : ""}`} aria-hidden="true" />
            <p id="controller-status-title">
              {controllerOnline ? "Host connected" : "Looking for a host"} · {transportLabel(transportMode)}
            </p>
          </div>
          <ControlPad onInput={sendControllerInput} />
          <div className="arcade-controller-actions">
            <button
              type="button"
              className="arcade-primary-button"
              onClick={() => sendControllerCommand("start")}
            >
              Start round
            </button>
            <button
              type="button"
              className="arcade-ghost-button"
              onClick={() => sendControllerCommand("reset")}
            >
              Reset
            </button>
          </div>
          <div className="arcade-controller-score" aria-live="polite">
            <span>Live host score</span>
            <strong>{controllerGame?.score ?? "—"}</strong>
            <small>{controllerGame ? gameStatus(controllerGame) : "Join the room to see the score"}</small>
          </div>
        </section>
        <section className="arcade-room-join" aria-labelledby="join-room-title">
          <h2 id="join-room-title">Switch room</h2>
          <p>Enter the four-character code shown on the host screen.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (/^[A-Z2-9]{4}$/.test(roomDraft)) changeRoom(roomDraft);
            }}
          >
            <label htmlFor="controller-room">Room code</label>
            <div className="arcade-room-input-row">
              <input
                id="controller-room"
                value={roomDraft}
                maxLength={4}
                onChange={(event) => setRoomDraft(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
              />
              <button type="submit" className="arcade-ghost-button">
                Join
              </button>
            </div>
          </form>
        </section>
        <footer className="arcade-footer-actions">
          <ModeButton onClick={() => updateLocation("lobby")}>Back to lobby</ModeButton>
          <p className="arcade-local-note">Local room: tabs must share this origin and browser profile.</p>
        </footer>
      </article>
    );
  }

  if (mode === "host") {
    return (
      <article className="app-document arcade-app">
        <header className="arcade-header arcade-header--compact">
          <div>
            <span className="arcade-kicker">Relay Arcade / host station</span>
            <h1>Catch the sparks</h1>
          </div>
          <div className="arcade-header-tools">
            <RoomBadge room={room} />
            <ModeButton onClick={openControllerTab}>Open controller tab</ModeButton>
          </div>
        </header>
        <section className="arcade-scoreboard" aria-label="Round scoreboard">
          <div>
            <span>Score</span>
            <strong>{game.score}</strong>
          </div>
          <div>
            <span>Missed</span>
            <strong>{game.misses}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{formatTime(game.elapsedMs)}</strong>
          </div>
          <p className="arcade-connection-copy">
            <span className={`arcade-status-dot${controllerOnline ? " is-online" : ""}`} aria-hidden="true" />
            {controllerOnline ? "Controller linked" : "Solo keyboard ready"}
          </p>
        </section>
        <div className="arcade-progress-wrap">
          <label htmlFor="round-progress">Round progress</label>
          <progress id="round-progress" max={GAME_DURATION_MS} value={game.elapsedMs} />
        </div>
        <GameArena state={game} />
        <section className="arcade-game-copy" aria-live="polite">
          <div>
            <p className="arcade-game-status">{gameStatus(game)}</p>
            <p>Move the shuttle under each spark before it slips past the catch line.</p>
          </div>
          {game.phase === "playing" ? (
            <ControlPad onInput={(direction) => (inputRef.current = direction)} />
          ) : (
            <button
              type="button"
              className="arcade-primary-button"
              onClick={game.phase === "finished" ? resetRound : startRound}
            >
              {game.phase === "finished" ? "Play again" : "Start round"}
            </button>
          )}
        </section>
        <footer className="arcade-footer-actions">
          <ModeButton onClick={() => updateLocation("lobby")}>Back to lobby</ModeButton>
          <p className="arcade-local-note">{transportLabel(transportMode)} · Keyboard: ← → or A / D</p>
        </footer>
      </article>
    );
  }

  return (
    <article className="app-document arcade-app">
      <header className="arcade-header">
        <div>
          <span className="arcade-kicker">A tiny party-console experiment</span>
          <h1>Relay Arcade</h1>
          <p>A pocket-sized game station for a shared screen and a phone-shaped controller.</p>
        </div>
        <div className="arcade-logo" aria-hidden="true">
          <span>✦</span>
        </div>
      </header>
      <section className="arcade-lobby-grid" aria-labelledby="lobby-title">
        <div className="arcade-lobby-card">
          <p className="arcade-card-kicker">Host a local round</p>
          <h2 id="lobby-title">Make a room, then catch the light.</h2>
          <p>
            Put the game on a big screen, keep this tab as the host, and steer with the keys or another tab.
          </p>
          <div className="arcade-room-picker">
            <RoomBadge room={room} />
            <button
              type="button"
              className="arcade-ghost-button"
              onClick={() => {
                const nextRoom = makeRoomCode();
                setRoom(nextRoom);
                setRoomDraft(nextRoom);
                updateLocation("lobby", nextRoom);
                announce(`New room code ${nextRoom}`);
              }}
            >
              New code
            </button>
          </div>
          <div className="arcade-lobby-actions">
            <button type="button" className="arcade-primary-button" onClick={enterHost}>
              Host a round
            </button>
            <button type="button" className="arcade-ghost-button" onClick={openControllerTab}>
              Open controller tab
            </button>
          </div>
        </div>
        <div className="arcade-lobby-side">
          <div className="arcade-feature-card">
            <span aria-hidden="true">01</span>
            <div>
              <h2>Catch sparks</h2>
              <p>Slide the shuttle left and right. Every clean catch adds to the score.</p>
            </div>
          </div>
          <div className="arcade-feature-card">
            <span aria-hidden="true">02</span>
            <div>
              <h2>Share control</h2>
              <p>Open controller mode in a second same-origin tab and pass it to a friend.</p>
            </div>
          </div>
        </div>
      </section>
      <aside className="arcade-local-note arcade-local-note--box">
        <strong>Local room limitation</strong>
        <p>
          No server is involved: room play works between tabs on this site in one browser profile. Use solo
          keyboard play when you are on another device.
        </p>
      </aside>
      <footer className="arcade-footer-actions">
        <ModeButton onClick={enterController}>Use controller mode here</ModeButton>
        <p className="arcade-local-note">Built as an original Tien OS core app.</p>
      </footer>
    </article>
  );
}
