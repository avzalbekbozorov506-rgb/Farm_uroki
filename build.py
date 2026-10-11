#!/usr/bin/env python3
"""Собирает site/ в один самодостаточный файл dist/index.html (CSS и JS внутри)."""
import pathlib, re, sys
root = pathlib.Path(__file__).parent
site = root / "site"
html = (site / "index.html").read_text(encoding="utf-8")
css = (site / "style.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "</style>")
for name in ("data.js", "app.js"):
    js = (site / name).read_text(encoding="utf-8")
    if "</script" in js.lower():
        sys.exit(f"{name}: содержит </script>")
    html = html.replace(f'<script src="{name}"></script>', "<script>\n" + js + "</script>")
if re.search(r'(href|src)="(?!https?:|#)[^"]+\.(css|js)"', html):
    sys.exit("остались внешние ссылки на локальные файлы")
out = root / "dist" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"{out} — {len(html.encode())} байт")
