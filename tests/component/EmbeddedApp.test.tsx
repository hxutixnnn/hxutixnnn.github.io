import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EmbeddedApp } from "@/apps/EmbeddedApp";
import type { AppDescriptor } from "@/apps/contract";

const app: AppDescriptor & {
  target: {
    kind: "embedded";
    url: `https://${string}`;
    presentation: "embedded";
    allowedOrigin: `https://${string}`;
  };
} = {
  schemaVersion: 1,
  id: "repo-demo",
  status: "active",
  category: "project",
  name: "Demo Project",
  summary: "A deployed project used to verify safe embedding behavior.",
  route: "/apps/repo-demo/",
  icon: "code",
  owner: "Nguyễn Hữu Tiền",
  tags: ["demo"],
  source: "https://github.com/hxutixnnn/demo-project",
  target: {
    kind: "embedded",
    url: "https://demo.example.com/app",
    presentation: "embedded",
    allowedOrigin: "https://demo.example.com",
  },
};

it("renders a responsive titled sandboxed frame with loading and safe fallbacks", () => {
  render(<EmbeddedApp app={app} />);

  const frame = screen.getByTitle("Demo Project deployed project");
  expect(frame).toHaveAttribute("src", "https://demo.example.com/app");
  expect(frame).toHaveAttribute("sandbox", "allow-forms allow-scripts");
  expect(frame).not.toHaveAttribute("sandbox", expect.stringContaining("allow-same-origin"));
  expect(screen.getByRole("status")).toHaveTextContent("Loading Demo Project…");
  expect(screen.getByRole("link", { name: /Open Demo Project in a new tab/ })).toHaveAttribute(
    "target",
    "_blank",
  );
  expect(screen.getByRole("link", { name: /View source/ })).toHaveAttribute(
    "href",
    "https://github.com/hxutixnnn/demo-project",
  );
  expect(screen.getByText(/cannot verify whether this cross-origin frame rendered/)).toBeInTheDocument();

  fireEvent.load(frame);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByText(/blank or shows a blocked-page message/)).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /open it in a new tab/i })[0]).toHaveAttribute(
    "href",
    "https://demo.example.com/app",
  );
});

it("explains framing failures and keeps the external fallback available", () => {
  vi.useFakeTimers();
  render(<EmbeddedApp app={app} />);
  void act(() => {
    vi.advanceTimersByTime(10_000);
  });
  expect(screen.getByRole("alert")).toHaveTextContent(/refuse framing/);
  expect(screen.getByRole("alert").querySelector("a")).toHaveAttribute(
    "href",
    "https://demo.example.com/app",
  );
});

afterEach(() => vi.useRealTimers());
