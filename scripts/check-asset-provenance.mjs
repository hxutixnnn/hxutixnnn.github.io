import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { parse } from "yaml";

const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, "src/assets/provenance.yml");
const assetExtensions = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".mp4",
  ".ogg",
  ".otf",
  ".pdf",
  ".png",
  ".svg",
  ".ttf",
  ".wav",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
]);

function extension(path) {
  const dot = path.lastIndexOf(".");
  return dot < 0 ? "" : path.slice(dot).toLowerCase();
}

async function walk(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      [
        ".astro",
        ".git",
        ".research-tmp",
        "coverage",
        "dist",
        "node_modules",
        "playwright-report",
        "test-results",
      ].includes(entry.name)
    )
      continue;
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      const projectPath = relative(root, path);
      if (projectPath === "CLAUDE.md" && (await readlink(path)) === "AGENTS.md") continue;
      throw new Error(`Asset scan does not allow symlinks: ${projectPath}`);
    }
    if (entry.isDirectory()) results.push(...(await walk(path)));
    else if (assetExtensions.has(extension(entry.name)))
      results.push(relative(root, path).replaceAll("\\", "/"));
  }
  return results;
}

const manifest = parse(await readFile(manifestPath, "utf8"));
if (manifest?.version !== 1 || !Array.isArray(manifest.assets))
  throw new Error("provenance.yml must contain version: 1 and an assets list");
const registered = new Map();
for (const item of manifest.assets) {
  for (const field of ["path", "author", "source", "license", "copyright", "modified", "sha256"]) {
    if (typeof item?.[field] !== "string" || item[field].trim() === "")
      throw new Error(`Asset entry is missing ${field}: ${JSON.stringify(item)}`);
  }
  if (!/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error(`Invalid SHA-256 for ${item.path}`);
  if (registered.has(item.path)) throw new Error(`Duplicate provenance entry: ${item.path}`);
  registered.set(item.path, item);
}

const discovered = (await walk(root)).sort();
const missing = discovered.filter((path) => !registered.has(path));
const stale = [...registered.keys()].filter((path) => !discovered.includes(path));
if (missing.length || stale.length) {
  throw new Error(
    `Asset provenance mismatch. Unregistered: ${missing.join(", ") || "none"}. Missing files: ${stale.join(", ") || "none"}.`,
  );
}

for (const path of discovered) {
  const absolute = resolve(root, path);
  if (!(await lstat(absolute)).isFile()) throw new Error(`Registered asset is not a regular file: ${path}`);
  const digest = createHash("sha256")
    .update(await readFile(absolute))
    .digest("hex");
  if (digest !== registered.get(path).sha256)
    throw new Error(
      `Checksum mismatch for ${path}: expected ${registered.get(path).sha256}, received ${digest}`,
    );
}

console.log(`Asset provenance verified for ${discovered.length} files.`);
