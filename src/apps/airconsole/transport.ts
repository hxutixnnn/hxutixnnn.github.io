import type { ArcadeGameState, GameInput } from "./game";

export type ControllerCommand = "start" | "reset";

export type RoomMessage =
  | { type: "controller:join"; room: string; clientId: string; senderId?: string }
  | { type: "controller:input"; room: string; direction: GameInput; senderId?: string }
  | { type: "controller:command"; room: string; command: ControllerCommand; senderId?: string }
  | { type: "host:presence"; room: string; senderId?: string }
  | { type: "host:state"; room: string; state: ArcadeGameState; senderId?: string };

export type TransportMode = "broadcast-channel" | "storage" | "unavailable";

export type RoomTransport = {
  mode: TransportMode;
  send: (message: RoomMessage) => void;
  close: () => void;
};

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const STORAGE_PREFIX = "tien-relay-arcade:";

export function roomChannelName(room: string): string {
  return `${STORAGE_PREFIX}${room.toUpperCase()}`;
}

export function makeRoomCode(random = Math.random): string {
  return Array.from({ length: 4 }, () => ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)]).join("");
}

export function createControllerInputMessage(room: string, direction: GameInput): RoomMessage {
  return { type: "controller:input", room, direction };
}

export function createControllerJoinMessage(room: string, clientId: string): RoomMessage {
  return { type: "controller:join", room, clientId };
}

export function createControllerCommandMessage(room: string, command: ControllerCommand): RoomMessage {
  return { type: "controller:command", room, command };
}

export function isControllerMessage(message: RoomMessage): boolean {
  return message.type.startsWith("controller:");
}

export function isRoomMessage(value: unknown): value is RoomMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<RoomMessage>;
  if (typeof message.room !== "string" || typeof message.type !== "string") return false;
  if (message.type === "controller:join") return typeof message.clientId === "string";
  if (message.type === "controller:input")
    return message.direction === -1 || message.direction === 0 || message.direction === 1;
  if (message.type === "controller:command")
    return message.command === "start" || message.command === "reset";
  if (message.type === "host:presence") return true;
  if (message.type === "host:state") return Boolean(message.state && typeof message.state === "object");
  return false;
}

function makeSenderId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createRoomTransport(room: string, onMessage: (message: RoomMessage) => void): RoomTransport {
  if (typeof window === "undefined") {
    return { mode: "unavailable", send: () => undefined, close: () => undefined };
  }

  const senderId = makeSenderId();
  const channelName = roomChannelName(room);
  const storageKey = `${channelName}:message`;
  let channel: BroadcastChannel | null = null;
  let mode: TransportMode = "unavailable";

  const receive = (value: unknown) => {
    if (!isRoomMessage(value) || value.room.toUpperCase() !== room.toUpperCase()) return;
    if (value.senderId === senderId) return;
    onMessage(value);
  };

  try {
    if (typeof window.BroadcastChannel === "function") {
      channel = new window.BroadcastChannel(channelName);
      channel.addEventListener("message", (event: MessageEvent<unknown>) => receive(event.data));
      mode = "broadcast-channel";
    }
  } catch {
    channel = null;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey || !event.newValue) return;
    try {
      const packet = JSON.parse(event.newValue) as { message?: unknown };
      receive(packet.message);
    } catch {
      // A malformed storage packet is ignored so the game remains playable solo.
    }
  };

  if (!channel) {
    try {
      window.addEventListener("storage", onStorage);
      window.localStorage.setItem(`${channelName}:probe`, "ok");
      window.localStorage.removeItem(`${channelName}:probe`);
      mode = "storage";
    } catch {
      window.removeEventListener("storage", onStorage);
    }
  }

  return {
    get mode() {
      return mode;
    },
    send(message) {
      const stamped = { ...message, senderId } as RoomMessage;
      if (channel) {
        try {
          channel.postMessage(stamped);
          return;
        } catch {
          // Fall through to the storage transport if BroadcastChannel closes unexpectedly.
        }
      }
      if (mode !== "storage") return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ id: makeSenderId(), message: stamped }));
      } catch {
        // Local play must not fail when storage is blocked by browser privacy settings.
      }
    },
    close() {
      channel?.close();
      window.removeEventListener("storage", onStorage);
    },
  };
}
