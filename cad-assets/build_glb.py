import trimesh
import numpy as np

sasi = trimesh.load("sasi.stl")
rollbar = trimesh.load("rollbar.stl")

# Combined bounding box (in the shared CAD coordinate system, millimetres)
combined = trimesh.util.concatenate([sasi, rollbar])
center = combined.bounding_box.centroid
print("Combined bbox (mm):", combined.bounds)
print("Center (mm):", center)

MM_TO_M = 0.001

def prep(mesh, color):
    m = mesh.copy()
    m.apply_translation(-center)
    m.apply_scale(MM_TO_M)
    # CAD Y-up/Z-up varies; STEP here uses Z as the vehicle's vertical-ish
    # axis in places but our bbox showed Y as the tall axis (30..970) and
    # Z as the symmetric width axis (-720..720) -> already close to
    # three.js's Y-up convention, so no axis swap needed.
    m.visual.vertex_colors = color
    return m

sasi_m = prep(sasi, [150, 150, 158, 255])
rollbar_m = prep(rollbar, [90, 150, 170, 255])

scene = trimesh.Scene()
scene.add_geometry(sasi_m, node_name="Sasi", geom_name="Sasi")
scene.add_geometry(rollbar_m, node_name="Rollbar", geom_name="Rollbar")

out = "voltaris-chassis.glb"
scene.export(out)
print("exported", out)

import os
print("size MB:", os.path.getsize(out) / 1e6)
