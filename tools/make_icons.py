"""Gera public/icons/icon{16,32,48,128}.png a partir das formas de public/icons/icon.svg.

Só usa a biblioteca padrão. Rode com: python3 tools/make_icons.py
"""
import struct
import zlib
from pathlib import Path

BLACK = (0x0A, 0x0A, 0x0A)
WHITE = (0xFF, 0xFF, 0xFF)
AMBER = (0xF5, 0xA5, 0x24)

# Mesmas formas do icon.svg, num quadro de 128 x 128.
SHAPES = [
    ("rect", (0, 0, 128, 128, 28), BLACK),
    ("line", ([(28, 104), (64, 24), (100, 104)], 13), WHITE),
    ("poly", [(44, 104), (64, 76), (84, 104)], AMBER),
    ("line", ([(44, 104), (64, 76), (84, 104), (44, 104)], 5), AMBER),
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


def in_line(x, y, line):
    """Traço com pontas e cantos arredondados, como stroke-linecap: round."""
    points, width = line
    for (ax, ay), (bx, by) in zip(points, points[1:]):
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
        if (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= (width / 2) ** 2:
            return True
    return False


HIT_TESTS = {"rect": in_rect, "poly": in_poly, "line": in_line}


def color_at(x, y):
    for kind, geometry, color in reversed(SHAPES):
        if HIT_TESTS[kind](x, y, geometry):
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
