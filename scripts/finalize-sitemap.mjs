import { cp, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url);
const legacyDirectory = new URL("./sitemap/", dist);

async function exists(url) {
  try {
    await stat(url);
    return true;
  } catch {
    return false;
  }
}

await mkdir(legacyDirectory, { recursive: true });
for (const file of ["sitemap-index.xml", "sitemap-0.xml"]) {
  const source = new URL(file, dist);
  if (!(await exists(source))) throw new Error(`Astro sitemap output is missing ${join("dist", file)}`);
  await cp(source, new URL(file, legacyDirectory));
}
console.log("Preserved legacy sitemap routes under dist/sitemap/.");
