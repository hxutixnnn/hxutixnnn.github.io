import { createHash } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";
import { fixtureBaseURL, fixturePort } from "./tests/e2e/fixtures/server";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const taskPort =
  process.env.TIENOS_E2E_PORT ??
  String(
    20_000 +
      (Number.parseInt(createHash("sha256").update(process.cwd()).digest("hex").slice(0, 6), 16) % 20_000),
  );
const baseURL = externalBaseURL ?? `http://127.0.0.1:${taskPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Two workers remain authoritative in CI; constrained local hosts may override to one.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  // Keep baseline locations stable while contract files are decomposed.
  snapshotPathTemplate: "{testDir}/main-screen.spec.ts-snapshots/{arg}-{projectName}-{platform}{ext}",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    ...(externalBaseURL
      ? []
      : [
          {
            command: `TIENOS_E2E_PORT=${taskPort} node scripts/e2e-preview.mjs`,
            url: baseURL,
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]),
    {
      command: `pnpm exec vite --host 127.0.0.1 --port ${fixturePort} --strictPort`,
      url: `${fixtureBaseURL}/tests/e2e/fixtures/multiple-apps.html`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
