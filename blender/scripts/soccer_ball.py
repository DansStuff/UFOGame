"""
Subdivided truncated icosahedron ("soccer ball" / Goldberg polyhedron GP(n, n)).

    subdivisions = 1  -> classic truncated icosahedron (12 pentagons, 20 hexagons)
    subdivisions = n  -> 12 pentagons + 30*n^2 - 10 hexagons (30*n^2 + 2 faces total)

Why it works: subdividing a truncated icosahedron's hexagons directly doesn't
give you more hexagons. Instead, split each icosahedron triangle into an n x n
triangular grid (a geodesic sphere), then truncate every vertex at 1/3 of each
edge. Each old vertex becomes a pentagon (the 12 original corners) or a hexagon,
and each small triangle becomes a hexagon. For n = 1 this is exactly the
truncated icosahedron.

Usage inside Blender (Scripting tab, or via the Blender MCP):
    exec(open(r"<path>/soccer_ball.py").read())
    create_soccer_ball(subdivisions=3, radius=1.0)
"""

import math


def _icosahedron():
    p = (1 + math.sqrt(5)) / 2
    verts = [(-1, p, 0), (1, p, 0), (-1, -p, 0), (1, -p, 0),
             (0, -1, p), (0, 1, p), (0, -1, -p), (0, 1, -p),
             (p, 0, -1), (p, 0, 1), (-p, 0, -1), (-p, 0, 1)]
    faces = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
             (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
             (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
             (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    return verts, faces  # faces are CCW seen from outside


def _norm(v, r=1.0):
    l = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
    return (v[0] / l * r, v[1] / l * r, v[2] / l * r)


def _lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def _dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _slerp(a, b, t):
    """Point a fraction t of the way along the great-circle arc a->b (unit vectors)."""
    omega = math.acos(max(-1.0, min(1.0, _dot(a, b))))
    if omega < 1e-12:
        return a
    s = math.sin(omega)
    wa, wb = math.sin((1 - t) * omega) / s, math.sin(t * omega) / s
    return (a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb)


def _even_point(A, B, C, i, j, n):
    """Grid point (i, j) of spherical triangle ABC, spaced by equal angles.

    Each grid line is a great circle through points spaced at equal angles along
    two edges. An interior point is where its three grid lines cross (averaged,
    since on a sphere they don't meet at exactly one point).
    """
    k = n - i - j
    if i == n:
        return B
    if j == n:
        return C
    if k == n:
        return A
    if j == 0:
        return _slerp(A, B, i / n)
    if i == 0:
        return _slerp(A, C, j / n)
    if k == 0:
        return _slerp(B, C, j / n)
    lines = [
        _cross(_slerp(A, B, i / n), _slerp(C, B, i / n)),  # constant i
        _cross(_slerp(A, C, j / n), _slerp(B, C, j / n)),  # constant j
        _cross(_slerp(B, A, k / n), _slerp(C, A, k / n)),  # constant k
    ]
    centre = (A[0] + B[0] + C[0], A[1] + B[1] + C[1], A[2] + B[2] + C[2])
    acc = [0.0, 0.0, 0.0]
    for p, q in ((0, 1), (1, 2), (2, 0)):
        x = _norm(_cross(lines[p], lines[q]))
        if _dot(x, centre) < 0:
            x = (-x[0], -x[1], -x[2])
        acc = [acc[m] + x[m] for m in range(3)]
    return _norm(acc)


def _geodesic(n, even_spacing=True):
    """Class-I geodesic sphere: every icosahedron face split into n*n triangles.

    even_spacing=True spaces grid points by equal angles on the sphere, which
    removes most of the squashing near the 12 pentagons. False lays them out
    evenly on the flat icosahedron face and then projects them (cheaper, more
    distorted).
    """
    iv, ifaces = _icosahedron()
    iv = [_norm(p) for p in iv]
    verts, index, tris = [], {}, []

    def vid(p):
        p = _norm(p)
        key = (round(p[0], 9), round(p[1], 9), round(p[2], 9))
        if key not in index:
            index[key] = len(verts)
            verts.append(p)
        return index[key]

    for a, b, c in ifaces:
        A, B, C = iv[a], iv[b], iv[c]
        grid = {}
        for i in range(n + 1):
            for j in range(n + 1 - i):
                if even_spacing:
                    p = _even_point(A, B, C, i, j, n)
                else:
                    p = tuple(A[k] + (B[k] - A[k]) * i / n + (C[k] - A[k]) * j / n for k in range(3))
                grid[i, j] = vid(p)
        for i in range(n):
            for j in range(n - i):
                tris.append((grid[i, j], grid[i + 1, j], grid[i, j + 1]))
                if i + j < n - 1:
                    tris.append((grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]))
    return verts, tris


def soccer_ball_geometry(subdivisions=1, radius=1.0, spherical=True, even_spacing=True):
    """Return (verts, faces) for GP(n, n).

    spherical=True pushes every final vertex onto the sphere (round, faces very
    slightly bent); False keeps the cut points on the flat triangle edges.
    even_spacing: see _geodesic.
    """
    n = max(1, int(subdivisions))
    gverts, tris = _geodesic(n, even_spacing)

    verts, edge_pt = [], {}

    def ep(u, v):  # point on edge u->v, 1/3 of the way from u
        if (u, v) not in edge_pt:
            p = _lerp(gverts[u], gverts[v], 1 / 3)
            edge_pt[u, v] = len(verts)
            verts.append(p)
        return edge_pt[u, v]

    faces = []
    # each small triangle -> hexagon
    for a, b, c in tris:
        faces.append([ep(a, b), ep(b, a), ep(b, c), ep(c, b), ep(c, a), ep(a, c)])

    # each geodesic vertex -> pentagon (valence 5) or hexagon (valence 6)
    next_tri = {}  # (vertex, first neighbour) -> second neighbour, walking CCW
    for a, b, c in tris:
        next_tri[a, b] = c
        next_tri[b, c] = a
        next_tri[c, a] = b
    start = {}
    for (v, nb) in next_tri:
        start.setdefault(v, nb)
    for v, first in start.items():
        ring, nb = [], first
        while True:
            ring.append(ep(v, nb))
            nb = next_tri[v, nb]
            if nb == first:
                break
        faces.append(ring)

    if spherical:
        verts = [_norm(p, radius) for p in verts]
    else:
        s = radius / max(math.sqrt(p[0] ** 2 + p[1] ** 2 + p[2] ** 2) for p in verts)
        verts = [(p[0] * s, p[1] * s, p[2] * s) for p in verts]
    return verts, faces


def create_soccer_ball(subdivisions=1, radius=1.0, spherical=True, even_spacing=True,
                       name=None, location=(0, 0, 0)):
    """Build the mesh in the current Blender scene and return the new object."""
    import bpy

    verts, faces = soccer_ball_geometry(subdivisions, radius, spherical, even_spacing)
    name = name or f"SoccerBall_GP{subdivisions}_{subdivisions}"
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.collection.objects.link(obj)
    return obj


if __name__ == "__main__":
    try:
        import bpy  # noqa: F401
        create_soccer_ball(subdivisions=1)
    except ImportError:
        for s in range(1, 6):
            v, f = soccer_ball_geometry(s)
            sizes = {}
            for face in f:
                sizes[len(face)] = sizes.get(len(face), 0) + 1
            e = len(v) + len(f) - 2  # Euler
            print(f"n={s}: {len(v)} verts, {len(f)} faces {sizes}, edges(Euler)={e}")
