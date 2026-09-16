import sys
from pathlib import Path
import numpy as np
from PIL import Image

LOW = 6
HIGH = 26


def process(src: Path, dst: Path):
    img = Image.open(src).convert("RGB")
    arr = np.array(img).astype(np.float32)
    lum = arr.max(axis=2)  # max(R,G,B) per pixel, 0-255

    alpha = (lum - LOW) / (HIGH - LOW)
    alpha = np.clip(alpha, 0.0, 1.0)
    alpha_u8 = (alpha * 255).astype(np.uint8)

    rgba = np.dstack([arr.astype(np.uint8), alpha_u8])
    out = Image.fromarray(rgba, mode="RGBA")
    out.save(dst, optimize=True)


def main():
    src_dir = Path(sys.argv[1])
    dst_dir = Path(sys.argv[2])
    dst_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(src_dir.glob("*.jpg"))
    print(f"processing {len(files)} files")
    for i, f in enumerate(files):
        out_path = dst_dir / (f.stem + ".png")
        process(f, out_path)
        if (i + 1) % 40 == 0:
            print(f"  {i + 1}/{len(files)}")
    print("done")


if __name__ == "__main__":
    main()
