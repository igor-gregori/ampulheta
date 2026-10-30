"""Gera dist/ampulheta-<versão>.zip para enviar à Chrome Web Store.

Empacota a pasta build/, gerada pelo Vite. Rode com: npm run package
"""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
SKIP_SUFFIXES = {".svg"}


def main():
    version = json.loads((BUILD / "manifest.json").read_text())["version"]
    out = ROOT / "dist" / f"ampulheta-{version}.zip"
    out.parent.mkdir(exist_ok=True)

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(p for p in BUILD.rglob("*") if p.is_file()):
            if path.suffix in SKIP_SUFFIXES:
                continue
            archive.write(path, path.relative_to(BUILD).as_posix())

    print(f"{out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
