import sys
import time
from pathlib import Path
from rembg import remove, new_session
from PIL import Image

src_dir = Path(sys.argv[1])
dst_dir = Path(sys.argv[2])
dst_dir.mkdir(parents=True, exist_ok=True)

session = new_session("isnet-general-use")
files = sorted(src_dir.glob("*.jpg"))
print(f"processing {len(files)} files", flush=True)

t_start = time.time()
for i, f in enumerate(files):
    out_path = dst_dir / (f.stem + ".png")
    img = Image.open(f)
    out = remove(img, session=session)
    out.save(out_path, optimize=True)
    if (i + 1) % 20 == 0 or i == 0:
        elapsed = time.time() - t_start
        rate = (i + 1) / elapsed
        eta = (len(files) - (i + 1)) / rate if rate > 0 else 0
        print(f"  {i + 1}/{len(files)}  elapsed={elapsed:.0f}s  eta={eta:.0f}s", flush=True)

print(f"done in {time.time() - t_start:.0f}s", flush=True)
