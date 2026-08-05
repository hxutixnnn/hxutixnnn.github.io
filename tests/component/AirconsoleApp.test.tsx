import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import AirconsoleApp from "@/apps/core/AirconsoleApp";

afterEach(() => window.history.replaceState({}, "", "/"));

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
