"""Resize/compress raster assets (run manually after updating sources).

City theme: PNG → WebP (sprites max 320 px, playfield max width 960 px).
Default planar HUD sprites in src/assets: recompress existing WebP max 384 px.
"""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
ASSETS = os.path.normpath(os.path.join(ROOT, 'src', 'assets'))
CITY = os.path.join(ASSETS, 'themes', 'city')

SPRITE_MAX = 320
BG_MAX_W = 960


def main() -> None:
    for name in ('city-pizza.png', 'city-coffee.png', 'city-cone.png'):
        path = os.path.join(CITY, name)
        if not os.path.isfile(path):
            continue
        im = Image.open(path).convert('RGBA')
        im.thumbnail((SPRITE_MAX, SPRITE_MAX), Image.Resampling.LANCZOS)
        out = os.path.join(CITY, name.replace('.png', '.webp'))
        im.save(out, 'WEBP', quality=82, method=6)

    bg_png = os.path.join(CITY, 'city-playfield-bg.png')
    if os.path.isfile(bg_png):
        bg = Image.open(bg_png).convert('RGB')
        w, h = bg.size
        tw = min(BG_MAX_W, w)
        th = max(1, int(round(h * tw / w)))
        bg = bg.resize((tw, th), Image.Resampling.LANCZOS)
        bg.save(os.path.join(CITY, 'city-playfield-bg.webp'), 'WEBP', quality=74, method=6)

    for f in ('city-pizza.png', 'city-coffee.png', 'city-cone.png', 'city-playfield-bg.png'):
        p = os.path.join(CITY, f)
        if os.path.isfile(p):
            os.remove(p)

    for fn in ('money.webp', 'trump.webp', 'poop.webp'):
        path = os.path.join(ASSETS, fn)
        if not os.path.isfile(path):
            continue
        im = Image.open(path).convert('RGBA')
        im.thumbnail((384, 384), Image.Resampling.LANCZOS)
        im.save(path, 'WEBP', quality=85, method=6)

    print('City PNG→WebP if present; planar WebP rethumb to 384px.')


if __name__ == '__main__':
    main()
