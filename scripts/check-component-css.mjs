import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

// Component selectors belong in Tailwind utilities. CSS files are reserved for documented globals/tokens.
const failures = [];
for await (const file of glob("src/**/*.css")) {
  const css = await readFile(file, "utf8");
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const classSelectors = [...withoutComments.matchAll(/(^|[,{\s])\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/gm)];
  for (const match of classSelectors) failures.push(`${file}: authored .${match[2]} selector`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Component CSS audit passed: no authored class selectors in src CSS.");
}
