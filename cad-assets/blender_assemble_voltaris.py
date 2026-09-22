"""
blender_assemble_voltaris.py — build the real car from the team's own CAD.

    blender -b -P blender_assemble_voltaris.py -- <stl-dir> <out.glb> [--preview <dir>]

<stl-dir> holds sasi_fine.stl, rollcage_fine.stl and a kabuk_parts/ directory
of one STL per solid, as convert_step.py --split writes them.

The three STEP exports do not share one convention:

  * Sasi and Rollbar already agree with each other — X runs along the car, Y is
    up, Z is across (both span Z -720..720). They need no transform at all, so
    the 9 KB "montaj" file is unnecessary.
  * Kabuk uses a different frame: Z runs along the car (nose at 0, tail at
    -3202), X is across, Y is up. The mirrors sit at the Z=0 end, which is how
    we know that end is the nose; assembling it the other way round pushes the
    roll cage out through the roof, which is how the choice was checked.

So the shell is turned a quarter turn to join the other two, then the whole
assembly is stood upright for Blender (the CAD is Y-up, Blender is Z-up),
scaled from millimetres to metres and dropped onto the ground plane.

The shell STEP is seven solids: the bodywork, four wheels and two mirrors.
Wheels arrive as one solid each, tyre and rim together, so they are split by
distance from the wheel axis — a criterion the geometry actually has, unlike
the coordinate-plane cuts that left the earlier model with torn edges.
"""

import glob
import math
import os
import sys

import bpy
from mathutils import Vector

MM = 0.001
SMOOTH_ANGLE = math.radians(35)

# Fraction of the wheel radius where the tyre gives way to the rim.
RIM_EDGE = 0.72

DECIMATE = {"Govde": 0.62, "Tekerlek": 0.3, "RollCage": 0.5}
PLANAR_ANGLE = math.radians(1.5)

# Deep metallic turquoise, the site's --accent (#22d3ee) taken down to a
# believable paint value. (r, g, b, metallic, roughness)
MATERIALS = {
    "Govde_Boya": ((0.006, 0.228, 0.299, 1), 0.65, 0.22),
    "Lastik": ((0.016, 0.017, 0.019, 1), 0.0, 0.88),
    "Jant": ((0.62, 0.64, 0.67, 1), 1.0, 0.24),
    "Sasi_Metal": ((0.22, 0.24, 0.27, 1), 0.9, 0.42),
}

# Tinted glazing. Kept as blended alpha rather than real transmission: every
# glTF viewer honours alpha, while KHR_materials_transmission is patchier, and
# at this size the difference is not visible.
GLASS = ((0.020, 0.043, 0.055, 0.30), 0.0, 0.06)

# Which STL stem becomes which object, with the shell parts flagged for the
# quarter turn that lines them up with the chassis.
SHELL_STEMS = {"govde": "Govde", "cam": "Cam", "tekerlek": "Tekerlek", "ayna": "Ayna"}


def args():
    a = sys.argv[sys.argv.index("--") + 1 :]
    preview = a[a.index("--preview") + 1] if "--preview" in a else None
    return a[0], a[1], preview


def material(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    colour, metallic, rough = GLASS if name == "Cam" else MATERIALS[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = colour
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if name == "Cam":
        b.inputs["Alpha"].default_value = colour[3]
        mat.blend_method = "BLEND"
        mat.use_backface_culling = False
    return mat


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def bake(obj):
    select_only(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)


def world_bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return (
        Vector((min(p[i] for p in pts) for i in range(3))),
        Vector((max(p[i] for p in pts) for i in range(3))),
    )


def clean(obj):
    """Weld the tessellation seams, face the normals outwards, shade by angle."""
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0001)
    bpy.ops.mesh.dissolve_degenerate(threshold=0.0001)
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=SMOOTH_ANGLE)
    except AttributeError:
        bpy.ops.object.shade_smooth()
    obj.select_set(False)


def decimate(obj):
    """Flatten first, collapse second.

    Collapsing straight away frays the panel boundaries — it eats into the flat
    underbody and leaves a saw-tooth along the rear valance. Dissolving the
    coplanar faces first clears most of the budget without touching an edge,
    so the collapse that follows has far less to do.
    """
    for key, ratio in DECIMATE.items():
        if not obj.name.startswith(key):
            continue
        select_only(obj)
        flat = obj.modifiers.new("flat", "DECIMATE")
        flat.decimate_type = "DISSOLVE"
        flat.angle_limit = PLANAR_ANGLE
        flat.delimit = {"SHARP"}
        bpy.ops.object.modifier_apply(modifier=flat.name)

        mod = obj.modifiers.new("slim", "DECIMATE")
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.select_set(False)
        return


def object_name(stem):
    """govde -> Govde, tekerlek_03 -> Tekerlek_03, as convert_step.py names them."""
    kind, _, suffix = stem.partition("_")
    name = SHELL_STEMS.get(kind, kind.title())
    return f"{name}_{suffix}" if suffix else name


def paint_wheel(obj):
    """Tyre outside, rim inside, split on distance from the wheel axis."""
    obj.data.materials.clear()
    obj.data.materials.append(material("Lastik"))
    obj.data.materials.append(material("Jant"))

    axis = min(range(3), key=lambda i: obj.dimensions[i])
    other = [i for i in range(3) if i != axis]
    centre = sum((Vector(c) for c in obj.bound_box), Vector()) / 8

    def radius(p):
        return math.hypot(p[other[0]] - centre[other[0]], p[other[1]] - centre[other[1]])

    outer = max(radius(v.co) for v in obj.data.vertices)
    for poly in obj.data.polygons:
        poly.material_index = 0 if radius(poly.center) > RIM_EDGE * outer else 1


def main():
    stl_dir, out, preview = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)

    shell, frame = [], []

    for path in sorted(glob.glob(f"{stl_dir}/kabuk_parts/*.stl")):
        bpy.ops.wm.stl_import(filepath=path)
        obj = bpy.context.selected_objects[0]
        stem = os.path.splitext(os.path.basename(path))[0]
        obj.name = obj.data.name = object_name(stem)
        shell.append(obj)

    for stem, name in [("sasi_fine", "Sasi"), ("rollcage_fine", "RollCage")]:
        bpy.ops.wm.stl_import(filepath=f"{stl_dir}/{stem}.stl")
        obj = bpy.context.selected_objects[0]
        obj.name = obj.data.name = name
        frame.append(obj)

    # (x, y, z) -> (z, y, -x): the shell's length axis becomes X, so it lines
    # up with the chassis.
    for obj in shell:
        obj.rotation_euler = (0, math.radians(90), 0)
        bake(obj)

    # Slide the shell along the car until it sits centred on the chassis: the
    # bodywork is 3.20 m against the chassis 2.97 m, so it overhangs each end
    # by about 12 cm.
    flo, fhi = world_bounds(frame)
    klo, khi = world_bounds(shell)
    shift = (flo.x + fhi.x) / 2 - (klo.x + khi.x) / 2
    for obj in shell:
        obj.location.x += shift
        bake(obj)

    everything = shell + frame

    # The CAD is Y-up; Blender is Z-up. A quarter turn about X stands it up
    # without mirroring it.
    for obj in everything:
        obj.rotation_euler = (math.radians(90), 0, 0)
        obj.scale = (MM, MM, MM)
        bake(obj)

    lo, _ = world_bounds(everything)
    for obj in everything:
        obj.location -= Vector((0, 0, lo.z))
        bake(obj)

    before = sum(len(o.data.polygons) for o in everything)
    for obj in everything:
        clean(obj)
        decimate(obj)
        if obj.name.startswith("Tekerlek"):
            paint_wheel(obj)
        else:
            obj.data.materials.clear()
            if obj.name == "Cam":
                slot = "Cam"
            elif obj.name in ("Sasi", "RollCage"):
                slot = "Sasi_Metal"
            else:
                slot = "Govde_Boya"
            obj.data.materials.append(material(slot))

    lo, hi = world_bounds(everything)
    after = sum(len(o.data.polygons) for o in everything)
    print(f"arac: {hi.x - lo.x:.3f} m uzun, {hi.y - lo.y:.3f} m genis, {hi.z - lo.z:.3f} m yuksek")
    for obj in sorted(everything, key=lambda o: o.name):
        print(f"   {obj.name:14s} {len(obj.data.polygons):8,} ucgen")
    print(f"toplam: {before:,} -> {after:,} ucgen")

    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_apply=True,
        export_normals=True,
        export_texcoords=False,
        export_yup=True,
    )
    print(f"yazildi: {out}  ({os.path.getsize(out) / 1e6:.1f} MB)")

    if preview:
        render_previews(everything, preview)


def render_previews(objs, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    lo, hi = world_bounds(objs)
    c = (lo + hi) / 2
    r = (hi - lo).length / 2

    bpy.ops.mesh.primitive_plane_add(size=r * 40, location=(c.x, c.y, lo.z))
    floor = bpy.context.object
    fm = bpy.data.materials.new("floor")
    fm.use_nodes = True
    fb = fm.node_tree.nodes["Principled BSDF"]
    fb.inputs["Base Color"].default_value = (0.021, 0.024, 0.028, 1)
    fb.inputs["Roughness"].default_value = 0.4
    floor.data.materials.append(fm)

    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 1400, 900
    sc.view_settings.view_transform = "AgX"
    sc.world = bpy.data.worlds.new("w")
    sc.world.use_nodes = True
    sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.012, 0.014, 0.017, 1)

    for n, off, e in [
        ("key", Vector((r * 1.6, -r * 1.8, r * 2.2)), 260),
        ("fill", Vector((-r * 2.2, r * 1.4, r * 1.1)), 70),
        ("rim", Vector((-r * 1.2, -r * 2.4, r * 0.9)), 120),
    ]:
        light = bpy.data.lights.new(n, type="AREA")
        light.energy = e * r * r
        light.size = r * 1.6
        o = bpy.data.objects.new(n, light)
        bpy.context.collection.objects.link(o)
        o.location = c + off
        o.rotation_euler = (-off).to_track_quat("-Z", "Y").to_euler()

    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 62
    cam_data.clip_start, cam_data.clip_end = 0.01, r * 60
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    sc.camera = cam

    views = {
        "uc-ceyrek": (Vector((0.80, -0.56, 0.22)), 5.6),
        "yan": (Vector((0.02, -1.0, 0.10)), 6.0),
        "arka-ceyrek": (Vector((-0.78, -0.58, 0.26)), 5.6),
        "ust": (Vector((0.30, -0.35, 1.0)), 5.8),
    }
    for name, (d, dist) in views.items():
        d = d.normalized()
        cam.location = c + d * r * dist
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"{out_dir}/{name}.png"
        bpy.ops.render.render(write_still=True)
        print("render:", sc.render.filepath)


main()
