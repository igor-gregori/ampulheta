"""Gera public/icons/icon{16,32,48,128}.png a partir das formas de public/icons/icon.svg.

Só usa a biblioteca padrão. Rode com: python3 tools/make_icons.py
"""
import struct
import zlib
from pathlib import Path

BLACK = (0x0A, 0x0A, 0x0A)
WHITE = (0xFF, 0xFF, 0xFF)

# Mesmas formas do icon.svg, num quadro de 128 x 128.
SHAPES = [
    ("rect", (0, 0, 128, 128, 26), BLACK),
    ("rect", (30, 18, 68, 11, 5.5), WHITE),
    ("rect", (30, 99, 68, 11, 5.5), WHITE),
    ("poly", [(38, 29), (90, 29), (90, 40), (70, 64), (90, 88), (90, 99),
              (38, 99), (38, 88), (58, 64), (38, 40)], WHITE),
    ("poly", [(49, 42), (79, 42), (64, 59)], BLACK),
    ("poly", [(46, 95), (82, 95), (64, 78)], BLACK),
]


def in_poly(x, y, points):
    inside = False
    j = len(points) - 1
    for i, (xi, yi) in enumerate(points):
        xj, yj = points[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def in_rect(x, y, rect):
    rx, ry, w, h, r = rect
    if not (rx <= x <= rx + w and ry <= y <= ry + h):
        return False
    cx = min(max(x, rx + r), rx + w - r)
    cy = min(max(y, ry + r), ry + h - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def color_at(x, y):
    for kind, geometry, color in reversed(SHAPES):
        hit = in_rect(x, y, geometry) if kind == "rect" else in_poly(x, y, geometry)
        if hit:
            return color
    return None


def render(size, samples=6):
    scale = 128 / size
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            r = g = b = a = 0
            for sy in range(samples):
                for sx in range(samples):
                    x = (px + (sx + 0.5) / samples) * scale
                    y = (py + (sy + 0.5) / samples) * scale
                    c = color_at(x, y)
                    if c:
                        r += c[0]; g += c[1]; b += c[2]; a += 1
            n = samples * samples
            if a:
                row += bytes([r // a, g // a, b // a, round(255 * a / n)])
            else:
                row += bytes(4)
        rows.append(bytes(row))
    return b"".join(rows)


def png(size, pixels):
    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(pixels, 9)) + chunk(b"IEND", b""))


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "public" / "icons"
    for size in (16, 32, 48, 128):
        (out / f"icon{size}.png").write_bytes(png(size, render(size)))
        print(f"public/icons/icon{size}.png")
