import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(cleanup);

describe("tienOS main screen", () => {
  it("renders the default System Settings window with the desktop", () => {
    render(<App />);

    expect(screen.getByRole("main", { name: "tienOS desktop" })).toBeVisible();
    expect(screen.getByRole("region", { name: "System Settings" })).toBeVisible();
    expect(screen.queryByText("A new desktop is under way.")).not.toBeInTheDocument();
  });

  it("opens, raises, and reports the single Settings window from the Dock", async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByRole, queryByRole } = render(<App />);

    const dock = getByRole("navigation", { name: "Dock" });
    const app = getByRole("button", { name: "System Settings" });
    expect(dock.querySelectorAll("button")).toHaveLength(1);
    expect(app).toHaveAttribute("aria-pressed", "true");

    await user.click(app);
    expect(getAllByRole("region", { name: "System Settings" })).toHaveLength(1);
    expect(getByRole("region", { name: "System Settings" })).toHaveFocus();

    await user.click(getByRole("button", { name: "Close System Settings" }));
    expect(queryByRole("region", { name: "System Settings" })).not.toBeInTheDocument();
    expect(app).toHaveAttribute("aria-pressed", "false");

    app.focus();
    await user.keyboard("{Enter}");
    expect(getAllByRole("region", { name: "System Settings" })).toHaveLength(1);
    expect(app).toHaveAttribute("aria-pressed", "true");
  });
});
