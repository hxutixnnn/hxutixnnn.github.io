import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, test } from "vitest";

const temporaryDirectories: string[] = [];
const audit = resolve("scripts/check-component-css.mjs");

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

async function runAudit(css: string) {
  const directory = await mkdtemp(join(tmpdir(), "tienos-css-audit-"));
  temporaryDirectories.push(directory);
  const stylesheet = join(directory, "fixture.css");
  await writeFile(stylesheet, css);
  return spawnSync(process.execPath, [audit, stylesheet], { encoding: "utf8" });
}

describe("component CSS audit CLI", () => {
  test("accepts global element and attribute contracts", async () => {
    const result = await runAudit(
      ":root { color-scheme: dark; } [data-theme='light'] body { color: CanvasText; }",
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Component CSS audit passed");
  });

  test.each([".component", ":where(.component)", "[data-state].component"])(
    "rejects authored selector %s",
    async (selector) => {
      const result = await runAudit(`${selector} { color: red; }`);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("authored .component selector");
    },
  );

  test("rejects component classes in scope preludes", async () => {
    const result = await runAudit("@scope (.component) { button { color: red; } }");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("authored .component selector");
  });
});
