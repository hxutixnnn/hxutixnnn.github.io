#!/usr/bin/env node
/** Reproducibly generate browser icons from the canonical tienOS sparkle mark. */
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const publicDir = resolve(import.meta.dirname, "../public");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <title>tienOS</title>
  <rect width="512" height="512" rx="128" fill="#07121d"/>
  <path fill="#fff" transform="translate(102.4 102.4) scale(.6)" d="M278.5 15.6C275 6.2 266 0 256 0s-19 6.2-22.5 15.6L174.2 174.2 15.6 233.5C6.2 237 0 246 0 256s6.2 19 15.6 22.5l158.6 59.4 59.4 158.6C237 505.8 246 512 256 512s19-6.2 22.5-15.6l59.4-158.6 158.6-59.4C505.8 275 512 266 512 256s-6.2-19-15.6-22.5L337.8 174.2 278.5 15.6z"/>
</svg>\n`;

async function render(size) {
  return sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = Buffer.alloc(16 * images.length);
  let offset = header.length + entries.length;
  images.forEach(({ size, data }, index) => {
    const at = index * 16;
    entries[at] = size === 256 ? 0 : size;
    entries[at + 1] = size === 256 ? 0 : size;
    entries.writeUInt16LE(1, at + 4);
    entries.writeUInt16LE(32, at + 6);
    entries.writeUInt32LE(data.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, entries, ...images.map(({ data }) => data)]);
}

const sizes = [16, 32, 180, 192, 512];
const rendered = new Map(await Promise.all(sizes.map(async (size) => [size, await render(size)])));
await Promise.all([
  writeFile(resolve(publicDir, "favicon.svg"), svg),
  writeFile(resolve(publicDir, "favicon-16x16.png"), rendered.get(16)),
  writeFile(resolve(publicDir, "favicon-32x32.png"), rendered.get(32)),
  writeFile(resolve(publicDir, "apple-touch-icon.png"), rendered.get(180)),
  writeFile(resolve(publicDir, "icon-192.png"), rendered.get(192)),
  writeFile(resolve(publicDir, "icon-512.png"), rendered.get(512)),
  writeFile(
    resolve(publicDir, "favicon.ico"),
    ico([16, 32].map((size) => ({ size, data: rendered.get(size) }))),
  ),
]);
