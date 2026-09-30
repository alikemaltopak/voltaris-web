#!/usr/bin/env python3
"""
make_hero_frame_sizes.py — smaller copies of the home page's scroll sequence.

The hero draws its frames into a box 58% of the screen tall, 16:9, capped at
the page width. On a phone that box is 390 CSS px wide, so even at 2x the
1600px frames carry four times the pixels anyone sees; on a 1x laptop, about
three times. HeroAssembly picks the smallest set that still covers the box at
the screen's pixel ratio, so each size here must exist for every folder.

Re-encoding the 1600px frames at their own size saves almost nothing (they
are already tight), so this only makes smaller sizes.

    python3 cad-assets/make_hero_frame_sizes.py [folder ...]

Default folders are the two the home page uses. Writes <folder>-800 and
<folder>-1200 beside each, with the same frame names.
"""
import os
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image

FRAMES = os.path.join(os.path.dirname(__file__), "..", "public", "frames")
SIZES = (800, 1200)
DEFAULT = ("ev-assembly-v9", "ev-assembly-light-v1")

# Quality measured on the dark and light sets against the 1600px source,
# composited over each theme's background: 43-45 dB PSNR, no visible change.
WEBP = dict(quality=82, method=6, alpha_quality=90)


def encode(job):
    src, dst, width = job
    image = Image.open(src).convert("RGBA")
    height = round(width * image.height / image.width)
    image.resize((width, height), Image.LANCZOS).save(dst, "WEBP", **WEBP)


def main():
    jobs = []
    for folder in sys.argv[1:] or DEFAULT:
        source = os.path.join(FRAMES, folder)
        names = sorted(n for n in os.listdir(source) if n.endswith(".webp"))
        for width in SIZES:
            out = f"{source}-{width}"
            os.makedirs(out, exist_ok=True)
            jobs += [(os.path.join(source, n), os.path.join(out, n), width) for n in names]
    with ProcessPoolExecutor() as pool:
        list(pool.map(encode, jobs, chunksize=8))
    print(f"{len(jobs)} kare yazildi")


if __name__ == "__main__":
    main()
