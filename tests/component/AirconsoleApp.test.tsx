import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import AirconsoleApp from "@/apps/core/AirconsoleApp";

class MockBroadcastChannel {
  static channels = new Map<string, Set<MockBroadcastChannel>>();
  static messages: unknown[] = [];

  listeners = new Set<(event: MessageEvent<unknown>) => void>();

  constructor(private readonly name: string) {
    const channels = MockBroadcastChannel.channels.get(name) ?? new Set();
    channels.add(this);
    MockBroadcastChannel.channels.set(name, channels);
  }

  addEventListener(_type: string, listener: (event: MessageEvent<unknown>) => void) {
    this.listeners.add(listener);
  }

  postMessage(data: unknown) {
    MockBroadcastChannel.messages.push(data);
    if (MockBroadcastChannel.messages.length > 100) throw new Error("Broadcast message storm");
    for (const channel of MockBroadcastChannel.channels.get(this.name) ?? []) {
      if (channel === this) continue;
      for (const listener of channel.listeners) listener(new MessageEvent("message", { data }));
    }
  }

  close() {
    MockBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

afterEach(() => {
  window.history.replaceState({}, "", "/");
  MockBroadcastChannel.channels.clear();
  MockBroadcastChannel.messages = [];
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("launches the original lobby and starts a playable host round", async () => {
  const user = userEvent.setup();
  render(<AirconsoleApp appId="airconsole" announce={vi.fn()} navigate={vi.fn()} openExternal={vi.fn()} />);

  expect(screen.getByRole("heading", { name: "Relay Arcade" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Host a round" }));
  expect(screen.getByRole("heading", { name: "Catch the sparks" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Start round" }));

  expect(screen.getByText(/spark.*caught/i)).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "ArrowRight" });
  fireEvent.keyUp(window, { key: "ArrowRight" });
});

it("renders controller mode with accessible movement controls", () => {
  window.history.replaceState({}, "", "/apps/airconsole/?mode=controller&room=Q2RT");
  render(<AirconsoleApp appId="airconsole" announce={vi.fn()} navigate={vi.fn()} openExternal={vi.fn()} />);

  expect(screen.getByRole("heading", { name: "Controller console" })).toBeInTheDocument();
  expect(screen.getByLabelText("Room code")).toHaveValue("Q2RT");
  expect(screen.getByRole("button", { name: "Move left" })).toBeEnabled();
});

it("leases one host and reconnects after it leaves", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  window.history.replaceState({}, "", "/apps/airconsole/?mode=controller&room=Q2RT");
  render(<AirconsoleApp appId="airconsole" announce={vi.fn()} navigate={vi.fn()} openExternal={vi.fn()} />);

  expect(screen.getByText(/Looking for a host/)).toBeInTheDocument();

  window.history.replaceState({}, "", "/apps/airconsole/?room=Q2RT");
  const activeHost = render(
    <AirconsoleApp appId="airconsole" announce={vi.fn()} navigate={vi.fn()} openExternal={vi.fn()} />,
  );
  fireEvent.click(activeHost.getByRole("button", { name: "Host a round" }));

  expect(activeHost.getByText("Controller linked")).toBeInTheDocument();
  expect(screen.getByText(/Host connected/)).toBeInTheDocument();

  window.history.replaceState({}, "", "/apps/airconsole/?room=Q2RT");
  const replacementHost = render(
    <AirconsoleApp appId="airconsole" announce={vi.fn()} navigate={vi.fn()} openExternal={vi.fn()} />,
  );
  fireEvent.click(replacementHost.getByRole("button", { name: "Host a round" }));
  const messagesBeforeOverlap = MockBroadcastChannel.messages.length;

  await act(() => vi.advanceTimersByTime(3_000));

  expect(replacementHost.getByText("Solo keyboard ready")).toBeInTheDocument();
  expect(MockBroadcastChannel.messages.length - messagesBeforeOverlap).toBeLessThan(10);

  activeHost.unmount();
  await act(() => vi.advanceTimersByTime(5_000));

  expect(replacementHost.getByText("Controller linked")).toBeInTheDocument();
});
