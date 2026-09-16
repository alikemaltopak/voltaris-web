import cadquery as cq
from cadquery import exporters

files = {
    "sasi": "Sasi_duzenleme_cakışma_yok_kare_As_Machined.STEP",
    "rollbar": "Rollbar_RollCage.STEP",
}

for name, path in files.items():
    print(f"--- {name} ({path}) ---")
    result = cq.importers.importStep(path)
    bb = result.val().BoundingBox()
    print(f"  solids: {len(result.vals())}")
    print(f"  bbox X: {bb.xmin:.1f} .. {bb.xmax:.1f}  (len {bb.xlen:.1f})")
    print(f"  bbox Y: {bb.ymin:.1f} .. {bb.ymax:.1f}  (len {bb.ylen:.1f})")
    print(f"  bbox Z: {bb.zmin:.1f} .. {bb.zmax:.1f}  (len {bb.zlen:.1f})")

    stl_path = f"{name}.stl"
    exporters.export(result, stl_path, tolerance=0.5, angularTolerance=0.3)
    print(f"  -> {stl_path} exported")
