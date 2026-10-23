"""Gera dist/ampulheta-<versão>.zip para enviar à Chrome Web Store.

Inclui só os arquivos que a extensão usa (nada de testes, docs ou ferramentas).
Rode com: python3 tools/package.py   (ou npm run package)
"""
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = ["manifest.json", "background.js"]
FOLDERS = ["popup", "dashboard", "blocked", "options", "shared", "icons"]
SKIP_SUFFIXES = {".svg"}


def main():
    version = json.loads((ROOT / "manifest.json").read_text())["version"]
    out = ROOT / "dist" / f"ampulheta-{version}.zip"
    out.parent.mkdir(exist_ok=True)

    paths = [ROOT / name for name in FILES]
    for folder in FOLDERS:
        paths += sorted(p for p in (ROOT / folder).rglob("*") if p.is_file())

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            if path.suffix in SKIP_SUFFIXES:
                continue
            archive.write(path, path.relative_to(ROOT).as_posix())

    print(f"{out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
