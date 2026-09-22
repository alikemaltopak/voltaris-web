#!/usr/bin/env python3
"""
convert_step.py — tessellate a STEP file into meshes, finely.

The team's earlier conversion ran at tolerance=0.5 mm, which is why the chassis
came out faceted. CAD is exact; the resolution is decided here, at export.

    venv/bin/python convert_step.py <in.STEP> <out.stl> [linear] [angular]
    venv/bin/python convert_step.py <in.STEP> <out-dir> --split [lin] [ang] [coarse]

--split writes one STL per solid, named for what it is. That matters for the
shell: its four wheels carry 98% of the triangles at a tolerance the bodywork
needs, so they are tessellated on their own terms. A solid wider than --coarse
centimetres in every direction counts as bodywork and gets the fine setting;
wheels and mirrors get a much coarser one.

    --glass 70,72,52,56,55,53   split those faces of the bodywork into cam.stl

The face numbers come from `faces.py`-style listing of the solid. Cutting the
glazing out along real CAD face boundaries is what keeps the windows' edges
clean — the earlier model cut them with coordinate thresholds, which is why
every border came out as a zigzag.
"""
import os
import sys
import time

import cadquery as cq
from cadquery import exporters

# A solid this wide in every direction is bodywork rather than a fitting.
COARSE_ABOVE_MM = 400
DETAIL_LINEAR = 30
DETAIL_ANGULAR = 8


def export_shapes(shapes, dst, lin, ang):
    wp = cq.Workplane("XY")
    for s in shapes:
        wp = wp.add(s)
    exporters.export(wp, dst, tolerance=lin, angularTolerance=ang)


FLAGS_WITH_VALUE = {"--glass"}


def parse(argv):
    """Split argv into positional arguments and --flag values."""
    pos, flags, i = [], {}, 0
    while i < len(argv):
        a = argv[i]
        if a in FLAGS_WITH_VALUE:
            flags[a] = argv[i + 1]
            i += 2
        elif a.startswith("--"):
            flags[a] = True
            i += 1
        else:
            pos.append(a)
            i += 1
    return pos, flags


def name_for(bb, seen):
    """Name a solid from its size: bodywork, wheel or mirror."""
    dims = sorted([bb.xlen, bb.ylen, bb.zlen])
    kind = "govde" if dims[0] > COARSE_ABOVE_MM else ("tekerlek" if dims[2] > COARSE_ABOVE_MM else "ayna")
    seen[kind] = seen.get(kind, 0) + 1
    return kind, (kind if kind == "govde" else f"{kind}_{seen[kind]:02d}")


def main():
    pos, flags = parse(sys.argv[1:])
    src, dst = pos[0], pos[1]
    split = "--split" in flags
    glass = [int(x) for x in str(flags.get("--glass", "")).split(",") if x.strip()]
    lin = float(pos[2]) if len(pos) > 2 else 0.05
    ang = float(pos[3]) if len(pos) > 3 else 0.15

    t0 = time.time()
    print(f"okunuyor: {src}")
    result = cq.importers.importStep(src)
    solids = result.val().Solids()
    print(f"  {len(solids)} kati, {time.time() - t0:.0f}s")

    if not split:
        bb = result.val().BoundingBox()
        print(f"  boyut  X {bb.xlen:8.1f}  Y {bb.ylen:8.1f}  Z {bb.zlen:8.1f}")
        exporters.export(result, dst, tolerance=lin, angularTolerance=ang)
        print(f"tessellation lin={lin} ang={ang} -> {dst}")
        return

    os.makedirs(dst, exist_ok=True)
    seen = {}
    for solid in sorted(solids, key=lambda s: -s.BoundingBox().DiagonalLength):
        bb = solid.BoundingBox()
        kind, name = name_for(bb, seen)
        big = kind == "govde"
        l, a = (lin, ang) if big else (lin * DETAIL_LINEAR, ang * DETAIL_ANGULAR)

        groups = {name: solid}
        if big and glass:
            faces = solid.Faces()
            picked = set(glass)
            groups = {
                name: [f for i, f in enumerate(faces) if i not in picked],
                "cam": [faces[i] for i in glass],
            }

        for out_name, shapes in groups.items():
            out = f"{dst}/{out_name}.stl"
            export_shapes(shapes if isinstance(shapes, list) else [shapes], out, l, a)
            n = len(shapes) if isinstance(shapes, list) else 1
            print(f"  {out_name:14s} {n:3d} parca  X {bb.xlen:7.0f} Y {bb.ylen:7.0f} Z {bb.zlen:7.0f}"
                  f"  lin={l} ang={a}")
    print("bitti:", dst)


if __name__ == "__main__":
    main()
