import { readFile, readdir, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const canonicalOrigin = "https://hxutixnnn.github.io";

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

function outputPath(reference) {
  const pathname = decodeURIComponent(new URL(reference, canonicalOrigin).pathname);
  if (pathname === "/") return resolve(dist, "index.html");
  const relativePath = pathname.slice(1);
  return pathname.endsWith("/") || extname(relativePath) === ""
    ? resolve(dist, relativePath, "index.html")
    : resolve(dist, relativePath);
}

const indexPath = resolve(dist, "index.html");
if (!(await exists(indexPath))) throw new Error("Missing canonical static route: /");
if (await exists(resolve(dist, "CNAME"))) throw new Error("Pages artifact must not contain CNAME");

const indexHtml = await readFile(indexPath, "utf8");
if (
  indexHtml.length < 800 ||
  !/<div id=["']root["']>\s*<main[\s>]/i.test(indexHtml) ||
  !/<h1[\s>][\s\S]*?tienOS desktop[\s\S]*?<\/h1>/i.test(indexHtml) ||
  !indexHtml.includes("Navigator")
) {
  throw new Error("Canonical route is not useful static HTML");
}
const canonicalHref = indexHtml.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
if (canonicalHref !== `${canonicalOrigin}/`) {
  throw new Error("Canonical route does not use the GitHub Pages domain");
}

const remoteSubresources = [
  ...indexHtml.matchAll(/<(?:script|img|link)[^>]+(?:src|href)=["'](https?:\/\/[^"']+)/gi),
]
  .map((match) => match[1])
  .filter((url) => new URL(url).origin !== canonicalOrigin);
if (remoteSubresources.length > 0) {
  throw new Error(`Initial shell has third-party subresources: ${remoteSubresources.join(", ")}`);
}

const files = await walk(dist);
const htmlFiles = files.filter((path) => extname(path) === ".html");
for (const htmlPath of htmlFiles) {
  const html = await readFile(htmlPath, "utf8");
  const localReferences = [...html.matchAll(/(?:href|src)=["'](\/[^"'#?]*)(?:[?#][^"']*)?["']/gi)].map(
    (match) => match[1],
  );
  for (const reference of localReferences) {
    if (!(await exists(outputPath(reference)))) {
      throw new Error(`Broken internal reference ${reference} in ${relative(dist, htmlPath)}`);
    }
  }
}

const cssFiles = files.filter((path) => extname(path) === ".css");
for (const cssPath of cssFiles) {
  const css = await readFile(cssPath, "utf8");
  const remoteReferences = [...css.matchAll(/url\(["']?(https?:\/\/[^)'"\s]+)/gi)].map((match) => match[1]);
  if (remoteReferences.length > 0) {
    throw new Error(`Stylesheet has third-party subresources: ${remoteReferences.join(", ")}`);
  }
  const localReferences = [...css.matchAll(/url\(["']?(\/[^)'"?#\s]*)/gi)].map((match) => match[1]);
  for (const reference of localReferences) {
    if (!(await exists(outputPath(reference)))) {
      throw new Error(`Broken internal reference ${reference} in ${relative(dist, cssPath)}`);
    }
  }
}

const gzipTotal = async (paths) =>
  paths.reduce(
    async (total, path) => (await total) + gzipSync(await readFile(path)).byteLength,
    Promise.resolve(0),
  );
const jsGzip = await gzipTotal(files.filter((path) => extname(path) === ".js"));
const cssGzip = await gzipTotal(cssFiles);
if (jsGzip > 160 * 1024) {
  throw new Error(`JavaScript budget exceeded: ${(jsGzip / 1024).toFixed(1)} KiB gzip`);
}
if (cssGzip > 30 * 1024) {
  throw new Error(`CSS budget exceeded: ${(cssGzip / 1024).toFixed(1)} KiB gzip`);
}

const wallpaperPaths = [
  resolve(dist, "wallpapers/tienos-default.jpg"),
  resolve(dist, "wallpapers/tienos-light.jpg"),
];
for (const wallpaperPath of wallpaperPaths) {
  if (!(await exists(wallpaperPath))) throw new Error(`Missing tienOS wallpaper: ${wallpaperPath}`);
}
const wallpaperSizes = await Promise.all(wallpaperPaths.map(async (path) => (await stat(path)).size));
if (wallpaperSizes.some((size) => size > 250 * 1024)) {
  throw new Error(
    `Per-wallpaper budget exceeded: ${wallpaperSizes.map((size) => `${(size / 1024).toFixed(1)} KiB`).join(", ")}`,
  );
}
const wallpaperTotal = wallpaperSizes.reduce((total, size) => total + size, 0);
if (wallpaperTotal > 400 * 1024) {
  throw new Error(`Wallpaper output budget exceeded: ${(wallpaperTotal / 1024).toFixed(1)} KiB`);
}

console.log(
  `Static output verified: useful HTML fallback, ${(jsGzip / 1024).toFixed(1)} KiB JS gzip, ${(cssGzip / 1024).toFixed(1)} KiB CSS gzip, ${(wallpaperTotal / 1024).toFixed(1)} KiB wallpapers.`,
);
