/* global fetch, AbortSignal, setTimeout */
import { spawn } from "node:child_process";

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? signal}`));
    });
  });

const port = process.env.TIENOS_E2E_PORT;
if (!port) throw new Error("TIENOS_E2E_PORT is required");
const origin = `http://127.0.0.1:${port}`;
if (process.env.TIENOS_E2E_SKIP_BUILD !== "1") await run("pnpm", ["build"]);
const child = spawn(
  "pnpm",
  ["exec", "vite", "preview", "--host", "127.0.0.1", "--port", port, "--strictPort"],
  {
    stdio: "inherit",
    env: process.env,
  },
);
let owned = true;
const stop = (signal = "SIGTERM") => {
  if (owned && child.exitCode === null) child.kill(signal);
};
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(signal));
child.once("exit", (code) => {
  owned = false;
  process.exit(code ?? 1);
});

for (let attempt = 0; attempt < 240; attempt += 1) {
  if (child.exitCode !== null) throw new Error(`task-owned preview exited with ${child.exitCode}`);
  try {
    const response = await fetch(origin, { signal: AbortSignal.timeout(500) });
    const html = await response.text();
    if (response.ok && /<main\b[^>]*aria-label="tienOS desktop"/.test(html)) break;
  } catch {
    // The task-owned preview may still be starting.
  }
  if (attempt === 239) {
    stop();
    throw new Error(`task-owned preview did not expose the canonical tienOS desktop marker at ${origin}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
await new Promise(() => {});
