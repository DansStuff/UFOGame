"""
Low-poly corn field prop: a tight cluster of corn plants, plus a "picked"
variant with the same plants and no cobs (shown while the field is depleted).

Flat-shaded and faceted to match the CornCob model. The cobs reuse the cob's
CornKernel / CornHusk materials. Origin at the base, Z up, built in meters at
roughly real corn size (about 2-2.6 m tall); the game scales it with
CORN_FIELD_MODEL_SCALE in src/planetProps/constants.ts.

Usage inside Blender (Scripting tab, or via the Blender MCP):
    exec(open(r"<path>/corn_field.py").read())
    build_corn_fields()                       # both variants, default seed
    build_corn_fields(plants=6, seed=3)
"""

import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

UP = Vector((0, 0, 1))

PLANT_MATERIALS = {
    # name: (base color, roughness)
    "CornPlant_Stalk": ((0.36, 0.55, 0.18), 0.8),
    "CornPlant_Leaf": ((0.24, 0.48, 0.12), 0.8),
    "CornPlant_Tassel": ((0.82, 0.66, 0.32), 0.8),
}
# Shared with the CornCob model so the cobs match it.
COB_KERNEL, COB_HUSK = "CornKernel", "CornHusk"
SLOTS = ["CornPlant_Stalk", "CornPlant_Leaf", "CornPlant_Tassel", COB_KERNEL, COB_HUSK]
STALK, LEAF, TASSEL, KERNEL, HUSK = range(5)
# Cob length and thickness multiplier. Oversized on purpose so the plants read as corn from the ship.
COB_SIZE = 1.7
# Cobs are smooth tubes; the kernels are the CornKernelGrid texture on CornKernel (one kernel wide, two rows tall).
COB_SIDES = 8
COB_KERNELS_AROUND = 12


def _material(name):
    m = bpy.data.materials.get(name)
    if m is None:
        rgb, rough = PLANT_MATERIALS[name]
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs["Base Color"].default_value = (*rgb, 1)
        b.inputs["Roughness"].default_value = rough
        m.diffuse_color = (*rgb, 1)
    return m


# MARK: Plant layout (pure data, shared by both variants)

def _layout(plants, seed):
    rng = random.Random(seed)
    out = []
    for i in range(plants):
        if i == 0:
            pos = Vector((rng.uniform(-0.1, 0.1), rng.uniform(-0.1, 0.1), 0))
        else:
            a = (i - 1) / (plants - 1) * 2 * math.pi + rng.uniform(-0.35, 0.35)
            r = rng.uniform(0.5, 0.75)
            pos = Vector((math.cos(a) * r, math.sin(a) * r, 0))
        height = rng.uniform(2.0, 2.6) if i else 2.65
        lean_dir = rng.uniform(0, 2 * math.pi)
        plant = {
            "pos": pos,
            "height": height,
            "lean": Vector((math.cos(lean_dir), math.sin(lean_dir), 0)) * rng.uniform(0.05, 0.15),
            "yaw": rng.uniform(0, 2 * math.pi),
            "leaves": [],
            "tassel": [(rng.uniform(0, 2 * math.pi), rng.uniform(0.3, 0.75), rng.uniform(0.22, 0.32)) for _ in range(5)],
            "cobs": [],
        }
        yaw = plant["yaw"]
        for k in range(5):
            yaw += math.radians(rng.uniform(130, 170))
            plant["leaves"].append({
                "h": (0.22 + 0.13 * k + rng.uniform(-0.03, 0.03)) * height,
                "yaw": yaw,
                "len": rng.uniform(0.75, 1.0) * (1.0 - 0.1 * k),
                "width": rng.uniform(0.08, 0.1),
            })
        for c in range(rng.choice((1, 2, 2))):
            plant["cobs"].append({
                "h": (0.42 + 0.12 * c + rng.uniform(-0.02, 0.02)) * height,
                "yaw": plant["yaw"] + c * math.pi + rng.uniform(-0.5, 0.5),
                "tilt": math.radians(rng.uniform(25, 40)),
                "len": rng.uniform(0.34, 0.42) * COB_SIZE,
            })
        out.append(plant)
    return out


# MARK: Mesh builders

def _stalk_center(plant, z):
    t = z / plant["height"]
    return plant["pos"] + plant["lean"] * (t * t) + UP * z


def _ring(bm, center, radius, sides, axis, phase=0.0):
    side = axis.orthogonal().normalized()
    other = axis.cross(side).normalized()
    return [bm.verts.new(center + (side * math.cos(phase + 2 * math.pi * i / sides)
                                   + other * math.sin(phase + 2 * math.pi * i / sides)) * radius)
            for i in range(sides)]


def _bridge(bm, a, b, mat):
    n = len(a)
    for i in range(n):
        f = bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
        f.material_index = mat


def textured_tube(bm, rings, ts, tip_point, length, max_radius, mat, kernels_around=None):
    """Smooth-shaded tube through `rings` (same vertex count each) closed by a cone to `tip_point`,
    UV-mapped for the kernel grid: u wraps `kernels_around` kernels, v keeps the kernels about square.
    The first ring is capped flat. Shared with the deck CornCob rebuild."""
    kernels_around = kernels_around or COB_KERNELS_AROUND
    uv = bm.loops.layers.uv.verify()
    n = len(rings[0])
    kernel = 2 * math.pi * max_radius / kernels_around
    v_of = lambda t: t * length / (2 * kernel)          # texture tile is two kernel rows tall
    u_of = lambda i: i / n * kernels_around
    for (ra, ta), (rb, tb) in zip(zip(rings, ts), zip(rings[1:], ts[1:])):
        for i in range(n):
            j = (i + 1) % n
            f = bm.faces.new((ra[i], ra[j], rb[j], rb[i]))
            f.material_index = mat; f.smooth = True
            for loop, (u, v) in zip(f.loops, ((u_of(i), v_of(ta)), (u_of(i + 1), v_of(ta)), (u_of(i + 1), v_of(tb)), (u_of(i), v_of(tb)))):
                loop[uv].uv = (u, v)
    tip = bm.verts.new(tip_point)
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((rings[-1][i], rings[-1][j], tip))
        f.material_index = mat; f.smooth = True
        for loop, (u, v) in zip(f.loops, ((u_of(i), v_of(ts[-1])), (u_of(i + 1), v_of(ts[-1])), (u_of(i + 0.5), v_of(1.0)))):
            loop[uv].uv = (u, v)
    cap = bm.faces.new(list(reversed(rings[0])))
    cap.material_index = mat
    for loop in cap.loops:
        loop[uv].uv = (0.5, 0.5)


_textured_tube = textured_tube


def _blade(bm, base, forward, bend, side, length, width, rise, droop, segs, mat, fold=0.25):
    """A pointed, V-folded strip (leaf or husk). bend is the direction it arcs toward."""
    rows = []
    for i in range(segs):
        t = i / segs
        p = base + forward * (length * t) + bend * (length * (rise * t - droop * t * t))
        w = width * min(1.0, 0.45 + 3.0 * t) * (1 - t) ** 0.7
        rows.append((bm.verts.new(p - side * w), bm.verts.new(p + bend * (w * fold)), bm.verts.new(p + side * w)))
    tip = bm.verts.new(base + forward * length + bend * (length * (rise - droop)))
    for (l0, m0, r0), (l1, m1, r1) in zip(rows, rows[1:]):
        bm.faces.new((l0, l1, m1, m0)).material_index = mat
        bm.faces.new((m0, m1, r1, r0)).material_index = mat
    l, m, r = rows[-1]
    bm.faces.new((l, tip, m)).material_index = mat
    bm.faces.new((m, tip, r)).material_index = mat


def _stalk(bm, plant):
    h = plant["height"]
    rings = []
    for i, (t, r) in enumerate(((0.0, 0.075), (0.35, 0.065), (0.7, 0.05), (1.0, 0.03))):
        rings.append(_ring(bm, _stalk_center(plant, t * h), r, 6, UP, phase=plant["yaw"]))
    for a, b in zip(rings, rings[1:]):
        _bridge(bm, a, b, STALK)
    bm.faces.new(rings[-1]).material_index = STALK


def _leaves(bm, plant):
    for leaf in plant["leaves"]:
        d = Vector((math.cos(leaf["yaw"]), math.sin(leaf["yaw"]), 0))
        side = UP.cross(d).normalized()
        base = _stalk_center(plant, leaf["h"]) + d * 0.04
        _blade(bm, base, d, UP, side, leaf["len"], leaf["width"], rise=0.65, droop=0.85, segs=4, mat=LEAF)


def _tassel(bm, plant):
    top = _stalk_center(plant, plant["height"])
    spikes = [(0.0, 0.0, 0.3)] + plant["tassel"]
    for yaw, tilt, length in spikes:
        d = (UP * math.cos(tilt) + Vector((math.cos(yaw), math.sin(yaw), 0)) * math.sin(tilt)).normalized()
        rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        ret = bmesh.ops.create_cone(bm, cap_ends=False, segments=3, radius1=0.014, radius2=0.0,
                                    depth=length, matrix=Matrix.Translation(top + d * (length / 2)) @ rot)
        for f in {f for v in ret["verts"] for f in v.link_faces}:
            f.material_index = TASSEL


def _cob(bm, plant, cob):
    out = Vector((math.cos(cob["yaw"]), math.sin(cob["yaw"]), 0))
    axis = (UP * math.cos(cob["tilt"]) + out * math.sin(cob["tilt"])).normalized()
    s = COB_SIZE
    base = _stalk_center(plant, cob["h"]) + out * (0.05 + 0.04 * s)
    L = cob["len"]
    # chunky, like the cargo CornCob, so full and picked fields read apart from the ship
    profile = ((0.0, 0.055), (0.25, 0.075), (0.5, 0.078), (0.75, 0.066), (0.95, 0.04))
    rings = [_ring(bm, base + axis * (L * t), r * s, COB_SIDES, axis) for t, r in profile]
    _textured_tube(bm, rings, [t for t, _ in profile], base + axis * L, L,
                   max(r for _, r in profile) * s, KERNEL)
    # three husk leaves wrapping the lower cob and flaring open
    side0 = axis.orthogonal().normalized()
    for k in range(3):
        rad = (Matrix.Rotation(2 * math.pi * k / 3 + 0.4, 3, axis) @ side0).normalized()
        side = axis.cross(rad).normalized()
        _blade(bm, base + rad * (0.065 * s), axis, rad, side, L * 0.85, 0.07 * s,
               rise=0.0, droop=-0.35, segs=3, mat=HUSK, fold=-0.3)


def build_corn_field(name, with_cobs=True, plants=7, seed=11, location=(0, 0, 0), collection=None):
    layout = _layout(plants, seed)
    bm = bmesh.new()
    for plant in layout:
        _stalk(bm, plant)
        _leaves(bm, plant)
        _tassel(bm, plant)
        if with_cobs:
            for cob in plant["cobs"]:
                _cob(bm, plant, cob)
    me = bpy.data.meshes.get(name) or bpy.data.meshes.new(name)
    # Set the slots before writing faces: clearing them afterwards resets every face to slot 0.
    me.materials.clear()
    for s in SLOTS:
        me.materials.append(_material(s))
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.get(name) or bpy.data.objects.new(name, me)
    obj.data = me
    obj.location = location
    if collection is not None and obj.name not in collection.objects:
        collection.objects.link(obj)
    return obj


def build_corn_fields(plants=7, seed=11, origin=(25, -38, 0), spacing=4.0, collection_name="CornField"):
    """Builds CornField (with cobs) and CornField_Picked (no cobs) side by side."""
    col = bpy.data.collections.get(collection_name)
    if col is None:
        col = bpy.data.collections.new(collection_name)
        bpy.context.scene.collection.children.link(col)
    o = Vector(origin)
    full = build_corn_field("CornField", True, plants, seed, o, col)
    picked = build_corn_field("CornField_Picked", False, plants, seed, o + Vector((spacing, 0, 0)), col)
    return full, picked
