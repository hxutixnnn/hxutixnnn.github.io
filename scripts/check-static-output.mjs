import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { gzipSync } from "node:zlib";
import baseCatalog from "../src/apps/catalog.json" with { type: "json" };
import repositories from "../src/apps/repositories.json" with { type: "json" };
import socialProfiles from "../src/apps/social-links.json" with { type: "json" };
import { mapRepositoriesToApps, mapSocialProfilesToApps } from "../src/apps/catalog-mapping.mjs";
import { repositoryCatalogConfig } from "../src/apps/catalog.config.mjs";

const catalog = [
  ...baseCatalog,
  ...mapRepositoriesToApps(repositories, repositoryCatalogConfig),
  ...mapSocialProfilesToApps(socialProfiles, repositoryCatalogConfig.displayOwner),
];

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const expectedRoutes = [
  "/",
  "/about/",
  "/blog/",
  "/resources/",
  "/til/",
  "/uses/",
  "/works/",
  "/tags/",
  "/hello-world/",
  "/use-pnpm-with-gatsby/",
  "/how-to-fix-android-emulator-request-audio-permission-on-launch/",
  "/how-to-fix-expo-eas-build-fastlane-bitcode-error/",
  "/versioning-the-right-way/",
  "/tags/android-studio/",
  "/tags/emulator/",
  "/tags/fix/",
  "/tags/gatsby/",
  "/tags/pnpm/",
  "/tags/build-in-public/",
  "/tags/guide/",
  "/tags/versioning/",
  "/tags/eas-build/",
  "/tags/expo/",
  "/tags/react-native/",
  "/tags/ios/",
  ...catalog.map((app) => app.route),
];

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function routeFile(route) {
  if (route === "/") return resolve(dist, "index.html");
  return resolve(dist, route.slice(1), "index.html");
}

for (const route of expectedRoutes) {
  const path = routeFile(route);
  if (!(await exists(path))) throw new Error(`Missing static route ${route}: ${path}`);
  const html = await readFile(path, "utf8");
  if (html.length < 400 || !/<h1[ >]/i.test(html))
    throw new Error(`Route is not useful static HTML: ${route}`);
  if (!html.includes('<link rel="canonical"') && !html.includes("<link rel=canonical"))
    throw new Error(`Missing canonical metadata: ${route}`);
}

for (const required of [
  "rss.xml",
  "sitemap-index.xml",
  "sitemap-0.xml",
  "sitemap/sitemap-index.xml",
  "sitemap/sitemap-0.xml",
  "robots.txt",
  "manifest.webmanifest",
  "resume.pdf",
  "404.html",
]) {
  if (!(await exists(resolve(dist, required)))) throw new Error(`Missing production artifact: ${required}`);
}
if (await exists(resolve(dist, "CNAME"))) throw new Error("Pages artifact must not contain CNAME");

const rootHtml = await readFile(resolve(dist, "index.html"), "utf8");
const remoteSubresources = [
  ...rootHtml.matchAll(/<(?:script|img|link)[^>]+(?:src|href)=["'](https?:\/\/[^"']+)/gi),
]
  .map((match) => match[1])
  .filter((url) => new URL(url).origin !== "https://hxutixnnn.github.io");
if (remoteSubresources.length > 0)
  throw new Error(`Initial shell has third-party subresources: ${remoteSubresources.join(", ")}`);

const rss = await readFile(resolve(dist, "rss.xml"), "utf8");
if ((rss.match(/<item>/g) ?? []).length !== 5 || !rss.includes("https://hxutixnnn.github.io/"))
  throw new Error("RSS does not contain all five canonical posts");
const robots = await readFile(resolve(dist, "robots.txt"), "utf8");
if (
  !robots.includes("User-agent: *") ||
  !robots.includes("https://hxutixnnn.github.io/sitemap/sitemap-index.xml")
)
  throw new Error("robots.txt behavior is incomplete");
const sitemap = await readFile(resolve(dist, "sitemap-0.xml"), "utf8");
for (const route of ["/about/", "/blog/", "/apps/about/", "/versioning-the-right-way/"]) {
  if (!sitemap.includes(`https://hxutixnnn.github.io${route}`))
    throw new Error(`Sitemap is missing ${route}`);
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
const files = await walk(dist);
const htmlFiles = files.filter((path) => extname(path) === ".html");
for (const htmlPath of htmlFiles) {
  const html = await readFile(htmlPath, "utf8");
  const localReferences = [...html.matchAll(/(?:href|src)=["'](\/[^"'#?]*)(?:[?#][^"']*)?["']/gi)].map(
    (match) => decodeURIComponent(match[1]),
  );
  for (const reference of localReferences) {
    if (reference === "/") continue;
    const relativePath = reference.slice(1);
    const candidate =
      reference.endsWith("/") || extname(relativePath) === ""
        ? resolve(dist, relativePath, "index.html")
        : resolve(dist, relativePath);
    if (!(await exists(candidate)))
      throw new Error(`Broken internal reference ${reference} in ${htmlPath.slice(dist.length + 1)}`);
  }
}
const js = files.filter((path) => extname(path) === ".js");
const css = files.filter((path) => extname(path) === ".css");
const gzipTotal = async (paths) =>
  paths.reduce(
    async (total, path) => (await total) + gzipSync(await readFile(path)).byteLength,
    Promise.resolve(0),
  );
const jsGzip = await gzipTotal(js);
const cssGzip = await gzipTotal(css);
if (jsGzip > 160 * 1024)
  throw new Error(`JavaScript budget exceeded: ${(jsGzip / 1024).toFixed(1)} KiB gzip`);
if (cssGzip > 30 * 1024) throw new Error(`CSS budget exceeded: ${(cssGzip / 1024).toFixed(1)} KiB gzip`);
const bannerSize = (await stat(resolve(dist, "banner.png"))).size;
if (bannerSize > 250 * 1024)
  throw new Error(`Image/wallpaper budget exceeded: ${(bannerSize / 1024).toFixed(1)} KiB`);

console.log(
  `Static output verified: ${expectedRoutes.length} HTML routes, ${(jsGzip / 1024).toFixed(1)} KiB JS gzip, ${(cssGzip / 1024).toFixed(1)} KiB CSS gzip, ${(bannerSize / 1024).toFixed(1)} KiB banner.`,
);
