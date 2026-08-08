#!/usr/bin/env node
/** Reproducibly generate browser icons from the canonical tienOS T mark. */
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const publicDir = resolve(import.meta.dirname, "../public");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <title>tienOS</title>
  <defs>
    <linearGradient id="brand" x1=".08" y1=".06" x2=".92" y2=".94">
      <stop stop-color="#54e2ff"/><stop offset=".48" stop-color="#315bd4"/><stop offset="1" stop-color="#9350f2"/>
    </linearGradient>
  </defs>
  <rect x="24" y="24" width="464" height="464" rx="112" fill="url(#brand)"/>
  <path fill="#fafaff" d="M112 128h288v72H292v184h-72V200H112z"/>
  <path fill="#fafaff" d="M176 344h160v40H176z"/>
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
