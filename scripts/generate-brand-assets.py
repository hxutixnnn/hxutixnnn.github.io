#!/usr/bin/env python3
"""Generate the original Tien OS PNG/ICO brand assets with Python stdlib only."""

from __future__ import annotations

import binascii
import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def chunk(kind: bytes, data: bytes) -> bytes:
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", binascii.crc32(payload) & 0xFFFFFFFF)


def png(width: int, height: int, pixels: bytes, color_type: int) -> bytes:
    channels = 4 if color_type == 6 else 3
    rows = b"".join(b"\0" + pixels[y * width * channels : (y + 1) * width * channels] for y in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(rows, 9))
        + chunk(b"IEND", b"")
    )


def clamp(value: float) -> int:
    return max(0, min(255, round(value)))


def blend(base: tuple[float, float, float], color: tuple[float, float, float], alpha: float) -> tuple[float, float, float]:
    return tuple(base[index] * (1 - alpha) + color[index] * alpha for index in range(3))


def rounded_square(x: int, y: int, size: int, inset: int, radius: int) -> bool:
    left, top, right, bottom = inset, inset, size - inset - 1, size - inset - 1
    cx = min(max(x, left + radius), right - radius)
    cy = min(max(y, top + radius), bottom - radius)
    return left <= x <= right and top <= y <= bottom and (x - cx) ** 2 + (y - cy) ** 2 <= radius**2


def mark_png(size: int) -> bytes:
    pixels = bytearray()
    inset = max(1, round(size * 0.045))
    radius = max(2, round(size * 0.22))
    for y in range(size):
        for x in range(size):
            if not rounded_square(x, y, size, inset, radius):
                pixels.extend((0, 0, 0, 0))
                continue
            nx, ny = x / size, y / size
            base = (35 + nx * 42, 74 + ny * 18, 186 + nx * 35)
            glow = max(0.0, 1 - math.hypot(nx - 0.2, ny - 0.12) / 0.62)
            base = blend(base, (84, 226, 255), glow * 0.78)
            violet = max(0.0, 1 - math.hypot(nx - 0.88, ny - 0.78) / 0.68)
            base = blend(base, (147, 80, 242), violet * 0.72)
            # A translucent lens sweeps through the lower half.
            lens = abs(math.hypot((nx - 0.42) / 0.8, (ny - 1.05) / 0.52) - 0.68)
            if lens < 0.045:
                base = blend(base, (244, 249, 255), (0.045 - lens) / 0.045 * 0.42)
            top_bar = 0.24 <= ny <= 0.36 and 0.22 <= nx <= 0.78
            stem = 0.43 <= nx <= 0.57 and 0.32 <= ny <= 0.74
            foot = 0.35 <= nx <= 0.65 and 0.67 <= ny <= 0.78
            if top_bar or stem or foot:
                base = (249, 250, 255)
            pixels.extend((*map(clamp, base), 255))
    return png(size, size, bytes(pixels), 6)


def banner_png() -> bytes:
    width, height = 1200, 630
    pixels = bytearray()
    for y in range(height):
        for x in range(width):
            nx, ny = x / width, y / height
            base = (12 + 18 * ny, 24 + 24 * nx, 70 + 70 * nx)
            cyan = max(0.0, 1 - math.hypot((nx - 0.12) / 0.52, (ny - 0.1) / 0.72))
            base = blend(base, (44, 211, 236), cyan * 0.84)
            violet = max(0.0, 1 - math.hypot((nx - 0.84) / 0.58, (ny - 0.22) / 0.8))
            base = blend(base, (116, 68, 230), violet * 0.82)
            rose = max(0.0, 1 - math.hypot((nx - 0.62) / 0.8, (ny - 1.0) / 0.62))
            base = blend(base, (232, 76, 154), rose * 0.45)
            # Two bright glass rims create depth without a wallpaper asset.
            rim1 = abs(math.hypot((nx - 0.18) / 0.58, (ny - 0.96) / 0.72) - 0.74)
            rim2 = abs(math.hypot((nx - 0.92) / 0.46, (ny - 0.45) / 0.62) - 0.72)
            if rim1 < 0.006 or rim2 < 0.006:
                base = blend(base, (238, 248, 255), 0.48)
            # Large geometric T monogram at left-center.
            top_bar = 0.14 <= nx <= 0.46 and 0.28 <= ny <= 0.37
            stem = 0.275 <= nx <= 0.325 and 0.34 <= ny <= 0.72
            foot = 0.22 <= nx <= 0.38 and 0.67 <= ny <= 0.75
            if top_bar or stem or foot:
                base = blend(base, (250, 251, 255), 0.92)
            # Status lights are a subtle signature rather than copied window controls.
            for index, color in enumerate(((109, 226, 255), (177, 156, 255), (255, 143, 202))):
                if (nx - (0.74 + index * 0.045)) ** 2 + (ny - 0.78) ** 2 < 0.00012:
                    base = color
            pixels.extend(map(clamp, base))
    return png(width, height, bytes(pixels), 2)


def ico(images: list[tuple[int, bytes]]) -> bytes:
    header = struct.pack("<HHH", 0, 1, len(images))
    entries, payload = bytearray(), bytearray()
    offset = 6 + 16 * len(images)
    for size, image in images:
        entries.extend(struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(image), offset))
        payload.extend(image)
        offset += len(image)
    return header + bytes(entries) + bytes(payload)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    outputs = {
        "favicon-16x16.png": mark_png(16),
        "favicon-32x32.png": mark_png(32),
        "apple-touch-icon.png": mark_png(180),
        "apple-touch-icon-precomposed.png": mark_png(180),
        "android-chrome-192x192.png": mark_png(192),
        "android-chrome-512x512.png": mark_png(512),
        "banner.png": banner_png(),
    }
    for name, data in outputs.items():
        (PUBLIC / name).write_bytes(data)
    (PUBLIC / "favicon.ico").write_bytes(ico([(16, outputs["favicon-16x16.png"]), (32, outputs["favicon-32x32.png"])]))


if __name__ == "__main__":
    main()
