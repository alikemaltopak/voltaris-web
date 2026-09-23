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
GLASS = ((0.030, 0.052, 0.062, 0.16), 0.0, 0.05)

# --- Interior -------------------------------------------------------------
# The cockpit floor sits at z = 0.19 and the roll cage tops out at 1.13, so
# there is about 0.9 m of headroom to seat a driver in.
FLOOR_Z = 0.19
SEAT_AT = (-0.05, 0.0, FLOOR_Z)

# Side profile of the bucket seat, from the top of the headrest down the back
# and out along the cushion. Each point carries the seat's half-width there and
# how far the bolsters rise out of the surface — which is all a racing seat is:
# a channel that grips at the shoulders, waist and thighs.
SEAT_SPINE = [
    # (x, z, half-width, bolster)
    (-0.28, 0.78, 0.145, 0.15),
    (-0.25, 0.67, 0.205, 0.17),
    (-0.21, 0.56, 0.225, 0.14),
    (-0.16, 0.39, 0.23, 0.09),
    (-0.10, 0.21, 0.225, 0.10),
    (-0.02, 0.09, 0.235, 0.13),
    (0.10, 0.05, 0.245, 0.14),
    (0.30, 0.04, 0.24, 0.12),
    (0.44, 0.06, 0.225, 0.07),
    (0.52, 0.02, 0.21, 0.02),
]
SEAT_RIB = 16  # samples across the seat

INTERIOR = {
    "Koltuk": ((0.020, 0.021, 0.024, 1), 0.0, 0.88),
    "Kokpit": ((0.035, 0.037, 0.042, 1), 0.25, 0.55),
    "Direksiyon": ((0.028, 0.030, 0.034, 1), 0.15, 0.62),
}
# The two lit panels in front of the driver.
DISPLAYS = {
    "Ekran_Multimedya": ((0.02, 0.09, 0.12, 1), (0.10, 0.62, 0.78, 1), 1.6),
    "Ekran_Gosterge": ((0.02, 0.08, 0.10, 1), (0.13, 0.70, 0.82, 1), 1.4),
}

# Which STL stem becomes which object, with the shell parts flagged for the
# quarter turn that lines them up with the chassis.
SHELL_STEMS = {"govde": "Govde", "cam": "Cam", "tekerlek": "Tekerlek", "ayna": "Ayna"}

# (base colour, emission colour, strength) for the lamps.
EMISSIVE = {
    "Far": ((0.55, 0.60, 0.68, 1), (0.85, 0.93, 1.0, 1), 3.0),
    "Stop": ((0.20, 0.02, 0.03, 1), (1.0, 0.035, 0.05, 1), 2.0),
}

# The CAD carries no lamps — all 94 faces of the shell are bodywork, wheel
# arches and fillets — so they are modelled here and laid onto the paint.
# Each one starts as a flat lozenge outside the car and is projected onto the
# bodywork, which is what keeps its outline smooth while it follows the
# curvature; cutting a patch out of the body mesh instead would leave the
# ragged triangle-scale border we spent so long removing elsewhere.
# (name, material, x to project from, centre (y, z), size (y, z))
LAMPS = [
    ("Far_01", "Far", 1.70, (0.45, 0.56), (0.34, 0.125)),
    ("Far_02", "Far", 1.70, (-0.45, 0.56), (0.34, 0.125)),
    ("Stop", "Stop", -2.80, (0.0, 0.62), (1.16, 0.085)),
]
LAMP_PROUD = 0.004  # metres the lens stands off the paint

# Livery. The mark was lifted from the last frame of the home page's assembly
# animation, which is the only copy of it in the project.
DECAL_IMAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "decals", "voltaris-logo.png")
DECAL_SIZE = 0.46          # metres square, on the door
DECAL_AT = (0.10, 0.50)    # (x along the car, z up)
DECAL_FROM = 1.5           # y to project from, each side


def args():
    a = sys.argv[sys.argv.index("--") + 1 :]
    preview = a[a.index("--preview") + 1] if "--preview" in a else None
    return a[0], a[1], preview


def material(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]

    if name in INTERIOR:
        colour, metallic, rough = INTERIOR[name]
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        b = mat.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = colour
        b.inputs["Metallic"].default_value = metallic
        b.inputs["Roughness"].default_value = rough
        # Dash and trim are single sheets; culled backfaces would make them
        # vanish whenever the camera swings behind one.
        mat.use_backface_culling = False
        return mat

    if name in EMISSIVE or name in DISPLAYS:
        base, glow, strength = (EMISSIVE | DISPLAYS)[name]
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        b = mat.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = base
        b.inputs["Metallic"].default_value = 0.0
        b.inputs["Roughness"].default_value = 0.12
        b.inputs["Emission Color"].default_value = glow
        b.inputs["Emission Strength"].default_value = strength
        mat.use_backface_culling = False
        return mat

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


def lozenge(name, half_a, half_b, rings=9, segments=72, power=3.2):
    """A flat superellipse patch in local XY, dense enough to follow a curve."""
    verts, faces = [(0.0, 0.0, 0.0)], []
    for r in range(1, rings + 1):
        t = r / rings
        for s in range(segments):
            angle = 2 * math.pi * s / segments
            c, si = math.cos(angle), math.sin(angle)
            u = math.copysign(abs(c) ** (2 / power), c)
            v = math.copysign(abs(si) ** (2 / power), si)
            verts.append((u * half_a * t, v * half_b * t, 0.0))
    for s in range(segments):
        faces.append((0, 1 + s, 1 + (s + 1) % segments))
    for r in range(1, rings):
        inner, outer = 1 + (r - 1) * segments, 1 + r * segments
        for s in range(segments):
            n = (s + 1) % segments
            faces.append((inner + s, outer + s, outer + n, inner + n))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    return bpy.data.objects.new(name, mesh)


def mesh_object(name, verts, faces, material, thickness=0.0, smooth=True):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    select_only(obj)
    if thickness:
        solid = obj.modifiers.new("kalinlik", "SOLIDIFY")
        solid.thickness = thickness
        solid.offset = 0
        bpy.ops.object.modifier_apply(modifier=solid.name)
    if smooth:
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=SMOOTH_ANGLE)
        except AttributeError:
            bpy.ops.object.shade_smooth()
    obj.select_set(False)
    obj.data.materials.append(material)
    return obj


def bucket_seat():
    """A racing seat swept from its side profile.

    Built as one continuous shell rather than an assembly of boxes: a bucket
    seat is a single moulded shape, and boxes would leave seams exactly where
    the eye looks for a smooth channel.
    """
    verts, faces = [], []
    for i, (x, z, half, bolster) in enumerate(SEAT_SPINE):
        # Surface normal in the side plane, pointing into the cabin.
        prev = SEAT_SPINE[max(i - 1, 0)]
        nxt = SEAT_SPINE[min(i + 1, len(SEAT_SPINE) - 1)]
        tx, tz = nxt[0] - prev[0], nxt[1] - prev[1]
        length = math.hypot(tx, tz) or 1.0
        nx, nz = -tz / length, tx / length
        for j in range(SEAT_RIB):
            t = -1 + 2 * j / (SEAT_RIB - 1)
            rise = bolster * t**4  # flat down the middle, curling at the edges
            verts.append((x + nx * rise, half * t, z + nz * rise))
    for i in range(len(SEAT_SPINE) - 1):
        for j in range(SEAT_RIB - 1):
            a = i * SEAT_RIB + j
            faces.append((a, a + 1, a + SEAT_RIB + 1, a + SEAT_RIB))
    obj = mesh_object("Koltuk", verts, faces, material("Koltuk"), thickness=0.035)
    obj.location = SEAT_AT
    bake(obj)
    return obj


def dash_panel():
    """A dash with a rolled top edge, curving back towards the door tops."""
    # (x offset, z) up the face, the top rolling over towards the driver.
    profile = [(0.02, -0.12), (0.0, -0.06), (-0.005, 0.02), (-0.03, 0.085), (-0.075, 0.115), (-0.12, 0.12)]
    half, ribs, sweep = 0.40, 15, 0.10
    verts, faces = [], []
    for ox, z in profile:
        for j in range(ribs):
            t = -1 + 2 * j / (ribs - 1)
            verts.append((ox - sweep * t * t, half * t, z))
    for i in range(len(profile) - 1):
        for j in range(ribs - 1):
            a = i * ribs + j
            faces.append((a, a + 1, a + ribs + 1, a + ribs))
    obj = mesh_object("Kokpit_Panel", verts, faces, material("Kokpit"), thickness=0.022)
    obj.location = (0.78, 0, 0.60)
    bake(obj)
    return obj


def panel(name, size, at, rotation, slot):
    """A flat panel — dashboard face, screen or trim."""
    w, h = size
    verts = [(0, -w / 2, -h / 2), (0, w / 2, -h / 2), (0, w / 2, h / 2), (0, -w / 2, h / 2)]
    obj = mesh_object(name, verts, [(0, 1, 2, 3)], material(slot), smooth=False)
    obj.location = at
    obj.rotation_euler = rotation
    bake(obj)
    return obj


def steering_wheel():
    """Rim, hub and three spokes, tilted back the way a wheel sits."""
    made = []
    bpy.ops.mesh.primitive_torus_add(major_radius=0.135, minor_radius=0.017, major_segments=40, minor_segments=10)
    rim = bpy.context.object
    rim.name = "Direksiyon"
    rim.data.materials.append(material("Direksiyon"))
    made.append(rim)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.042, depth=0.05, vertices=20)
    hub = bpy.context.object
    hub.name = "Direksiyon_Gobek"
    hub.rotation_euler = (0, 0, 0)
    hub.data.materials.append(material("Direksiyon"))
    made.append(hub)

    for k in range(3):
        angle = math.radians(90 + k * 120)
        bpy.ops.mesh.primitive_cube_add(size=1)
        spoke = bpy.context.object
        spoke.name = f"Direksiyon_Kol_{k}"
        spoke.scale = (0.09, 0.022, 0.012)
        spoke.location = (math.cos(angle) * 0.075, math.sin(angle) * 0.075, 0)
        spoke.rotation_euler = (0, 0, angle)
        spoke.data.materials.append(material("Direksiyon"))
        made.append(spoke)

    for obj in made:
        select_only(obj)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        obj.select_set(False)

    # Join, then stand the wheel up and rake it back.
    select_only(made[0])
    for obj in made[1:]:
        obj.select_set(True)
    bpy.ops.object.join()
    wheel = bpy.context.object
    wheel.name = wheel.data.name = "Direksiyon"
    wheel.rotation_euler = (0, math.radians(68), 0)
    wheel.location = (0.61, 0, 0.66)
    bake(wheel)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=SMOOTH_ANGLE)
    except AttributeError:
        pass
    return wheel


def add_interior():
    """Seat, wheel, dash and the two lit screens in front of the driver."""
    made = [bucket_seat(), steering_wheel()]

    # The dash sits just under the windscreen base, which the shell puts at
    # x = 0.80, z = 0.82.
    made.append(dash_panel())
    made.append(
        panel("Ekran_Multimedya", (0.26, 0.135), (0.755, 0.0, 0.595), (0, math.radians(-8), 0), "Ekran_Multimedya")
    )
    # The cluster rides on the column, just behind the wheel.
    made.append(
        panel("Ekran_Gosterge", (0.19, 0.08), (0.695, 0.0, 0.735), (0, math.radians(-42), 0), "Ekran_Gosterge")
    )
    return made


def decal_material():
    if "Logo" in bpy.data.materials:
        return bpy.data.materials["Logo"]
    mat = bpy.data.materials.new("Logo")
    mat.use_nodes = True
    tree = mat.node_tree
    bsdf = tree.nodes["Principled BSDF"]
    tex = tree.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(DECAL_IMAGE)
    tex.image.colorspace_settings.name = "sRGB"
    tree.links.new(bsdf.inputs["Base Color"], tex.outputs["Color"])
    tree.links.new(bsdf.inputs["Alpha"], tex.outputs["Alpha"])
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.34
    mat.blend_method = "BLEND"
    return mat


def add_decals(body):
    """Lay the mark on both doors, following the curve of the panel."""
    made = []
    for side, name in ((1, "Logo_Sol"), (-1, "Logo_Sag")):
        rows = cols = 11
        half = DECAL_SIZE / 2
        verts, faces, uvs = [], [], []
        for i in range(rows):
            for j in range(cols):
                u, v = j / (cols - 1), i / (rows - 1)
                verts.append(((u - 0.5) * DECAL_SIZE, (v - 0.5) * DECAL_SIZE, 0.0))
                # The patch's local axes land differently on each flank: on
                # the +Y side its Y points at the floor and its X reads back to
                # front, so that copy is turned about both to keep the wordmark
                # upright and running forwards.
                uvs.append((1 - u, 1 - v) if side > 0 else (u, v))
        for i in range(rows - 1):
            for j in range(cols - 1):
                a = i * cols + j
                faces.append((a, a + 1, a + cols + 1, a + cols))

        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        layer = mesh.uv_layers.new(name="UVMap")
        for poly in mesh.polygons:
            for loop in poly.loop_indices:
                layer.data[loop].uv = uvs[mesh.loops[loop].vertex_index]
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = (DECAL_AT[0], side * DECAL_FROM, DECAL_AT[1])
        # Local +Z away from the car, so the projection runs inwards.
        obj.rotation_euler = (math.radians(-90 * side), 0, 0)

        select_only(obj)
        wrap = obj.modifiers.new("lay", "SHRINKWRAP")
        wrap.target = body
        wrap.wrap_method = "PROJECT"
        wrap.use_project_z = True
        wrap.use_negative_direction = True
        wrap.use_positive_direction = False
        wrap.offset = 0.0015
        bpy.ops.object.modifier_apply(modifier=wrap.name)
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=SMOOTH_ANGLE)
        except AttributeError:
            pass
        obj.select_set(False)
        bake(obj)
        obj.data.materials.append(decal_material())
        made.append(obj)
        _ = half
    return made


def add_lamps(body):
    """Lay the headlights and tail bar onto the bodywork."""
    made = []
    for name, slot, from_x, (cy, cz), (width, height) in LAMPS:
        obj = lozenge(name, height / 2, width / 2)
        bpy.context.collection.objects.link(obj)
        obj.location = (from_x, cy, cz)
        # Turn the patch so its local +Z faces away from the car; the
        # projection then runs along local -Z, straight into the bodywork.
        # The rotation stays live until the modifier is applied, because
        # Shrinkwrap projects along the object's own axes — baking it first
        # leaves the projection pointing at the sky.
        obj.rotation_euler = (0, math.radians(90 if from_x > 0 else -90), 0)

        select_only(obj)
        wrap = obj.modifiers.new("lay", "SHRINKWRAP")
        wrap.target = body
        wrap.wrap_method = "PROJECT"
        wrap.use_project_z = True
        wrap.use_negative_direction = True
        wrap.use_positive_direction = False
        wrap.offset = LAMP_PROUD
        bpy.ops.object.modifier_apply(modifier=wrap.name)
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=SMOOTH_ANGLE)
        except AttributeError:
            bpy.ops.object.shade_smooth()
        obj.select_set(False)
        bake(obj)

        obj.data.materials.clear()
        obj.data.materials.append(material(slot))
        made.append(obj)
    return made


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

    # After the car is in its final frame, so the lamp positions can be given
    # in the metres-and-nose-forward coordinates the numbers above use.
    everything += add_lamps(next(o for o in everything if o.name == "Govde"))

    # Centre the finished car over the origin so a viewer can orbit it without
    # having to know where the CAD happened to put it. Height stays put: the
    # tyres are already on z = 0.
    lo, hi = world_bounds(everything)
    middle = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, 0))
    for obj in everything:
        obj.location -= middle
        bake(obj)

    # After the centring, not before: the interior is laid out by hand against
    # the finished car's coordinates, so it must not be shifted again.
    everything += add_interior()
    everything += add_decals(next(o for o in everything if o.name == "Govde"))

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
        export_texcoords=True,
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
        "kokpit": (Vector((0.70, -0.52, 0.40)), 1.6),
    }
    for name, (d, dist) in views.items():
        d = d.normalized()
        cam.location = c + d * r * dist
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"{out_dir}/{name}.png"
        bpy.ops.render.render(write_still=True)
        print("render:", sc.render.filepath)


main()
