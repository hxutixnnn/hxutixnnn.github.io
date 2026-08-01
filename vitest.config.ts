import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/{unit,component}/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/os/**/*.{ts,tsx}", "src/apps/**/*.{ts,tsx}"],
      exclude: ["src/apps/core/**"],
      thresholds: {
        lines: 68,
        functions: 65,
        branches: 55,
        statements: 65,
      },
    },
  },
});
