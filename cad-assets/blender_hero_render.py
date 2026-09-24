"""
blender_hero_render.py — ray-traced studio stills of the finished car.

    blender -b -P blender_hero_render.py -- <model.glb> <out-dir> [samples] [width]

The viewer on the site renders in real time, which puts a ceiling on how the
paint can look: its reflections come from a handful of light cards baked into a
256-pixel environment. Cycles traces the light properly, so the body reflects
the actual shape of the softboxes — the long highlight down a car's flank is
the reflection of a tall panel beside it, and that is most of what separates a
press shot from a screenshot.

The studio matches the one in the viewer (dark cove, turntable, lit rim) so the
stills and the page look like the same car in the same room.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

FLOOR_Z = -0.1
PODIUM_R = 2.15
COVE_R = 20.0
ACCENT = (0.02, 0.62, 0.78, 1)

# (name, azimuth from the nose, elevation, distance, lens, target height)
SHOTS = [
    ("hero", 58, 6, 11.4, 105, 0.60),
    ("yan", 92, 4, 13.0, 120, 0.62),
    ("arka-ceyrek", 133, 7, 10.9, 100, 0.62),
    ("burun", 26, 9, 10.4, 95, 0.58),
]


def args():
    a = sys.argv[sys.argv.index("--") + 1 :]
    only = a[4] if len(a) > 4 else None
    return a[0], a[1], int(a[2]) if len(a) > 2 else 200, int(a[3]) if len(a) > 3 else 2400, only


def principled(mat):
    if not mat or not mat.use_nodes:
        return None
    return next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)


def dress_materials():
    """Give the glTF materials what a ray tracer can actually use."""
    for mat in bpy.data.materials:
        b = principled(mat)
        if not b:
            continue
        name = mat.name.split(".")[0]

        if name == "Govde_Boya":
            b.inputs["Metallic"].default_value = 0.78
            b.inputs["Roughness"].default_value = 0.25
            b.inputs["Coat Weight"].default_value = 1.0
            b.inputs["Coat Roughness"].default_value = 0.03
            # Metallic flake: a fine noise in the normal, far too small to see
            # as texture but enough to break the paint into glitter up close.
            tree = mat.node_tree
            noise = tree.nodes.new("ShaderNodeTexNoise")
            noise.inputs["Scale"].default_value = 900
            noise.inputs["Detail"].default_value = 2
            bump = tree.nodes.new("ShaderNodeBump")
            bump.inputs["Strength"].default_value = 0.06
            tree.links.new(bump.inputs["Height"], noise.outputs["Fac"])
            tree.links.new(b.inputs["Normal"], bump.outputs["Normal"])

        elif name == "Cam":
            # Real glass instead of the blended alpha the browser needs.
            mat.blend_method = "OPAQUE"
            b.inputs["Base Color"].default_value = (0.42, 0.50, 0.55, 1)
            b.inputs["Transmission Weight"].default_value = 0.92
            b.inputs["Roughness"].default_value = 0.02
            b.inputs["IOR"].default_value = 1.46

        elif name == "Jant":
            b.inputs["Metallic"].default_value = 1.0
            b.inputs["Roughness"].default_value = 0.16

        elif name == "Lastik":
            b.inputs["Roughness"].default_value = 0.92
            b.inputs["Base Color"].default_value = (0.012, 0.013, 0.015, 1)

        elif name in ("Far", "Stop"):
            b.inputs["Coat Weight"].default_value = 1.0
            b.inputs["Coat Roughness"].default_value = 0.02


def surface(name, colour, rough, metal=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = colour
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return mat


def glow(name, colour, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.remove(tree.nodes["Principled BSDF"])
    em = tree.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = colour
    em.inputs["Strength"].default_value = strength
    tree.links.new(tree.nodes["Material Output"].inputs["Surface"], em.outputs["Emission"])
    return mat


def build_studio():
    # Seamless cove: floor and wall meet with no corner, which is what gives
    # the background its soft vertical gradient.
    points = [(COVE_R, FLOOR_Z)]
    for i in range(1, 22):
        t = i / 21
        points.append((COVE_R + 6.0 * (1 - math.cos(t * math.pi / 2)), FLOOR_Z + 12 * t))
    verts, faces = [], []
    seg = 96
    for r, z in points:
        for s in range(seg):
            a = 2 * math.pi * s / seg
            verts.append((r * math.cos(a), r * math.sin(a), z))
    for i in range(len(points) - 1):
        for s in range(seg):
            n = (s + 1) % seg
            faces.append((i * seg + s, i * seg + n, (i + 1) * seg + n, (i + 1) * seg + s))
    mesh = bpy.data.meshes.new("Cove")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    cove = bpy.data.objects.new("Cove", mesh)
    bpy.context.collection.objects.link(cove)
    cove.data.materials.append(surface("cove", (0.035, 0.038, 0.044, 1), 0.55))

    bpy.ops.mesh.primitive_circle_add(radius=COVE_R + 0.05, vertices=128, fill_type="NGON", location=(0, 0, FLOOR_Z))
    bpy.context.object.data.materials.append(surface("floor", (0.030, 0.033, 0.038, 1), 0.28, 0.25))

    bpy.ops.mesh.primitive_cylinder_add(radius=PODIUM_R, depth=-FLOOR_Z, location=(0, 0, FLOOR_Z / 2))
    bpy.context.object.data.materials.append(surface("podium", (0.045, 0.048, 0.055, 1), 0.16, 0.5))

    bpy.ops.mesh.primitive_torus_add(major_radius=PODIUM_R + 0.02, minor_radius=0.022, location=(0, 0, -0.012))
    bpy.context.object.data.materials.append(glow("ring", ACCENT, 26))


def area_light(name, location, look_at, energy, size_x, size_y, colour=(1, 1, 1)):
    light = bpy.data.lights.new(name, type="AREA")
    light.shape = "RECTANGLE"
    light.size, light.size_y = size_x, size_y
    light.energy = energy
    light.color = colour
    obj = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(look_at) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
    return obj


def light_studio():
    # A long panel overhead lays the highlight down the roof and shoulder, and
    # the tall panels each side are what the flanks reflect. Their shape is
    # visible in the paint, so it is the shape that matters, not the wattage.
    area_light("key", (1.2, -1.4, 4.2), (0, 0, 0.6), 820, 6.0, 1.6)
    area_light("flank_l", (0.4, -3.6, 1.9), (0, 0, 0.7), 380, 5.5, 2.6)
    area_light("flank_r", (0.2, 3.6, 2.0), (0, 0, 0.7), 260, 5.5, 2.6)
    area_light("rim", (-3.6, 2.2, 1.7), (0, 0, 0.7), 320, 2.4, 1.8, (0.80, 0.90, 1.0))
    area_light("nose", (4.4, -1.0, 1.1), (0.8, 0, 0.5), 160, 2.0, 1.4)
    # Washes the far wall so the car has a lit backdrop to stand against
    # instead of a flat void.
    area_light("backdrop", (-7.0, 6.0, 4.0), (-16, 12, 2.0), 4200, 9.0, 7.0, (0.86, 0.92, 1.0))


def main():
    src, out_dir, samples, width, only = args()
    os.makedirs(out_dir, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    dress_materials()
    build_studio()
    light_studio()

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = "GPU"
    except Exception:
        scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 10
    scene.cycles.transmission_bounces = 12
    scene.render.resolution_x = width
    scene.render.resolution_y = int(width * 9 / 16)
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -1.15
    scene.world = bpy.data.worlds.new("w")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.004, 0.005, 0.006, 1)

    cam_data = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam

    for name, az, el, dist, lens, aim in SHOTS:
        if only and name != only:
            continue
        cam_data.lens = lens
        a, e = math.radians(az), math.radians(el)
        cam.location = (
            dist * math.cos(e) * math.cos(a),
            -dist * math.cos(e) * math.sin(a),
            dist * math.sin(e) + aim,
        )
        target = Vector((0.05, 0, aim))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = f"{out_dir}/{name}.png"
        bpy.ops.render.render(write_still=True)
        print("render:", scene.render.filepath)


main()
