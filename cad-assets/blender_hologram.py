"""
blender_hologram.py — the car as a lit x-ray: shell transparent, structure inside.

    blender -b -P blender_hologram.py -- <model.glb> <out-dir> [samples] [width] [--turntable N]

A photographic render lives or dies on the quality of the painted surface, and
this shell's lower flank is genuinely wrinkled in CAD. A hologram asks nothing
of the paint. It asks for structure — and structure is exactly what the team's
own files carry: chassis, roll cage, wheels and the shell over the top.

Each material is a Fresnel mix of emission and transparency: face-on the
surface almost disappears, edge-on it lights up. That is what makes a curved
body read as a glowing outline rather than a tinted sheet of glass, and it is
why the chassis stays visible straight through the bodywork.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

# (emission colour, strength, how much of the surface stays solid face-on)
LAYERS = {
    # The skin is barely lit — it is there to be seen through, and a large
    # surface at any real emission washes the whole frame white. The structure
    # is what should glow.
    "Govde": ((0.06, 0.62, 0.58), 0.30, 0.055),
    "Cam": ((0.20, 0.70, 0.70), 0.25, 0.035),
    "Ayna": ((0.06, 0.62, 0.58), 0.35, 0.08),
    "Panel": ((0.30, 0.95, 0.90), 1.2, 0.35),
    "Logo": ((1.0, 0.42, 0.34), 2.6, 0.80),
    # The powertrain is the point of an x-ray, so it is the brightest thing
    # in it: warm for the pack, white-hot for the motors.
    "Batarya_Hucre": ((1.0, 0.72, 0.22), 4.0, 0.98),
    "Batarya_Kutu": ((1.0, 0.60, 0.18), 1.6, 0.42),
    "Batarya_Fan": ((1.0, 0.75, 0.30), 2.4, 0.90),
    "Motor": ((1.0, 0.86, 0.45), 5.0, 0.98),
    "Sasi": ((0.25, 1.0, 0.82), 3.4, 0.92),
    "RollCage": ((0.12, 1.0, 0.88), 3.8, 0.95),
    "Tekerlek": ((0.10, 0.80, 0.90), 0.9, 0.30),
    "Koltuk": ((0.16, 0.92, 0.88), 1.6, 0.62),
    "Direksiyon": ((0.16, 0.92, 0.88), 2.0, 0.75),
    "Kokpit": ((0.16, 0.92, 0.88), 1.4, 0.55),
    "Ekran": ((0.55, 1.0, 1.0), 5.0, 0.95),
    "Far": ((0.70, 1.0, 1.0), 4.0, 0.85),
    "Stop": ((1.0, 0.40, 0.36), 3.6, 0.85),
}
DEFAULT = ((0.15, 0.95, 0.90), 2.0, 0.20)

# The shell also gets a wire cage over it, which is what reads as "scanned"
# rather than "tinted".
WIRE_ON = ("Govde", "Tekerlek")
WIRE_THICKNESS = 0.004


def args():
    raw = sys.argv[sys.argv.index("--") + 1 :]
    turns = int(raw[raw.index("--turntable") + 1]) if "--turntable" in raw else 0
    pos, skip = [], False
    for item in raw:
        if skip:
            skip = False
        elif item.startswith("--"):
            skip = True
        else:
            pos.append(item)
    return (
        pos[0],
        pos[1],
        int(pos[2]) if len(pos) > 2 else 140,
        int(pos[3]) if len(pos) > 3 else 2000,
        turns,
    )


def layer_for(name):
    for key, spec in LAYERS.items():
        if name.startswith(key):
            return spec
    return DEFAULT


def hologram_material(name, colour, strength, solidity):
    """Tinted glass that also glows.

    Built on Principled rather than a hand-wired Fresnel mix: transmission
    already carries the "see through the bodywork" half, the emission carries
    the glow, and solidity decides how much of each. One well-trodden node
    beats four clever ones that render black when a link is subtly wrong.
    """
    mat = bpy.data.materials.new(f"holo_{name}")
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour, 1)
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Roughness"].default_value = 0.08
    # Structure stays opaque; skin goes to glass.
    b.inputs["Transmission Weight"].default_value = max(0.0, 1.0 - solidity * 1.6)
    b.inputs["IOR"].default_value = 1.04  # barely refracts, so nothing warps
    b.inputs["Emission Color"].default_value = (*colour, 1)
    b.inputs["Emission Strength"].default_value = strength
    return mat


def wire_copy(obj, colour):
    """A thin lattice sitting on the surface, for the scanned look."""
    wire = obj.copy()
    wire.data = obj.data.copy()
    wire.name = f"{obj.name}_tel"
    bpy.context.collection.objects.link(wire)
    bpy.context.view_layer.objects.active = wire
    modifier = wire.modifiers.new("tel", "WIREFRAME")
    modifier.thickness = WIRE_THICKNESS
    modifier.use_replace = True
    modifier.use_even_offset = False  # the source of the runaway spikes
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    mat = bpy.data.materials.new(f"tel_{obj.name}")
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new("ShaderNodeOutputMaterial")
    out.is_active_output = True
    glow = tree.nodes.new("ShaderNodeEmission")
    glow.inputs["Color"].default_value = (*colour, 1)
    glow.inputs["Strength"].default_value = 2.6
    tree.links.new(out.inputs["Surface"], glow.outputs["Emission"])
    wire.data.materials.clear()
    wire.data.materials.append(mat)
    return wire


def main():
    src, out_dir, samples, width, turns = args()
    os.makedirs(out_dir, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)

    body = [o for o in bpy.data.objects if o.type == "MESH"]
    extra = []
    for obj in body:
        colour, strength, solidity = layer_for(obj.name)
        obj.data.materials.clear()
        obj.data.materials.append(hologram_material(obj.name, colour, strength, solidity))
        if obj.name.startswith(WIRE_ON):
            extra.append(wire_copy(obj, colour))
    meshes = body + extra

    # Framed on the car alone. A wireframe modifier run over a mesh with any
    # degenerate face throws spikes kilometres wide, and averaging those in put
    # the camera 4.7 km from the subject, pointing at nothing.
    pts = [o.matrix_world @ Vector(c) for o in body for c in o.bound_box]
    lo = Vector((min(p[i] for p in pts) for i in range(3)))
    hi = Vector((max(p[i] for p in pts) for i in range(3)))
    centre = (lo + hi) / 2

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = "GPU"
    except Exception:
        scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    # Emission through many transparent layers needs the bounces to get there.
    # max_bounces caps every other bounce type, so a low value here starves
    # transmission: a ray entering the shell, leaving it, entering the glass
    # and leaving again has already spent four, and anything beyond returns
    # black. An x-ray is nothing but stacked transmission.
    scene.cycles.transparent_max_bounces = 64
    scene.cycles.max_bounces = 32
    scene.cycles.transmission_bounces = 32
    scene.render.resolution_x = width
    scene.render.resolution_y = int(width * 9 / 16)
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world = bpy.data.worlds.new("w")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.015, 0.017, 0.020, 1)

    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 95
    cam_data.clip_start, cam_data.clip_end = 0.05, 200
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam

    if turns:
        plan = [(f"frame_{i + 1:04d}", 90 + 360 * i / turns, 18) for i in range(turns)]
    else:
        plan = [("holo-ceyrek", 55, 22), ("holo-yan", 90, 10), ("holo-ust", 60, 48), ("holo-arka", 140, 20)]

    for name, az, el in plan:
        if turns and os.path.exists(f"{out_dir}/{name}.png"):
            continue
        a, e = math.radians(az), math.radians(el)
        dist = 11.0
        cam.location = centre + Vector(
            (dist * math.cos(e) * math.cos(a), -dist * math.cos(e) * math.sin(a), dist * math.sin(e))
        )
        cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = f"{out_dir}/{name}.png"
        bpy.ops.render.render(write_still=True)
        print("render:", scene.render.filepath)


main()
