"""OM GROUP - plastering kit for the Plaster Sand page ("From Sand to a Plastered Wall", "Six Movements, One Surface").

  blender -b --factory-startup -P scripts/plaster3d/build-plaster-kit.py -- <repo root>
  then:   node scripts/plaster3d/export-web-assets.js          (plaster texture PNGs -> assets/plaster3d/*.webp)

Writes  assets/3d/plaster-kit.glb  with these named nodes (three.js units, y up, +z toward the viewer):
  Bricks   the wall: 20 courses of fired-clay bricks in running bond, two bricks deep (x 0..11.83, y 0..6.95, front face at z = 0), real bevels, one baked PBR set
  Mortar   the recessed raked joints behind the bricks (sand-cement)
  Trowel   steel plastering trowel: crowned blade, two neck posts, wooden handle. Blade in the xy plane, handle toward +z
  Hawk     aluminium hawk board with post and wooden handle (board centre at the origin)
  Float    wooden float
  Rule     aluminium straight edge (11.83 + 0.8 long)
  Mound    lumpy mortar mound (a dome 2.4 across), base on y = 0
  Load     a ribbon of mortar carried on the trowel blade
Also  _review/plaster3d/tex/pl-c{1,2,3}-{a,n}.png  the three plaster surface sets (rough coat, floated, sponge finish) that the page maps onto the plaster layer.
No mix, thickness or finish quality is shown: this is an illustration of the work, not a recorded job.
"""
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
GLB = os.path.join(ROOT, 'assets', '3d', 'plaster-kit.glb'); TEX = os.path.join(ROOT, '_review', 'plaster3d', 'tex'); os.makedirs(TEX, exist_ok=True)
K = .4 if QUICK else 1.0
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
def V(x, y, z): return Vector((x, -z, y))            # three.js (x right, y up, z toward the viewer) -> blender

# ---------------------------------------------------------------- texture helpers
def pnoise(rng, N, beta):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1; F *= f ** (-beta); F[0, 0] = 0
    o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)
def streak(rng, N, ax, ay):
    """noise stretched along x (a trowel drag): white noise low-passed hard in x, lightly in y (periodic)"""
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    F *= np.exp(-((fx * ax) ** 2 + (fy * ay) ** 2)); o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)
def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2; dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2
    n = np.dstack([-dx * strength, -dy * strength, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True); return n * 0.5 + 0.5      # OpenGL convention (+y = increasing v), as glTF / three
def save_img(name, arr, cs='sRGB', to_png=False):
    N = arr.shape[0]
    if arr.ndim == 2: arr = np.dstack([arr, arr, arr])
    rgba = np.ones((N, arr.shape[1], 4), dtype=np.float32); rgba[..., :3] = arr
    img = bpy.data.images.new(name, arr.shape[1], N, alpha=False); img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'; img.save(); img.colorspace_settings.name = cs; return img
def stamp_fn(rng, N):
    def stamp(cx, cy, r, fn):
        R = int(math.ceil(r * 1.4 + 2)); xs = np.arange(int(cx) - R, int(cx) + R + 1); ys = np.arange(int(cy) - R, int(cy) + R + 1)
        X, Y = np.meshgrid(xs + .5 - cx, ys + .5 - cy); a = rng.uniform(0, 3.14); u = X * math.cos(a) + Y * math.sin(a); v = (-X * math.sin(a) + Y * math.cos(a)) * rng.uniform(.7, 1.4)
        th = np.arctan2(v, u); rr = r * (1 + .25 * np.sin(2 * th + rng.uniform(0, 6.3)) + .15 * np.sin(3 * th + rng.uniform(0, 6.3)))
        d = np.sqrt(u * u + v * v) / rr; m = np.clip((1 - d) * rr / 1.0, 0, 1)
        if m.max() > 0: fn(np.ix_(ys % N, xs % N), m, np.clip(d, 0, 1))
    return stamp

def brick_maps(N=1024, seed=11):
    """fired clay brick face: terracotta with tonal drift (orange to brown), darker firing marks, sand-faced grain, small pits"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.50, .22, .125)
    drift = pnoise(rng, N, .5); alb[..., 0] *= 1 + .13 * drift; alb[..., 1] *= 1 + .26 * drift; alb[..., 2] *= 1 + .22 * drift
    alb *= (1 + .10 * pnoise(rng, N, 1.1) + .06 * pnoise(rng, N, .4))[..., None]
    sm = streak(rng, N, 30, 3); alb *= (1 + .07 * sm)[..., None]                     # faint horizontal firing streaks
    dark = np.clip(pnoise(rng, N, .25), 0, None); alb *= (1 - .22 * np.clip(dark - .3, 0, 1))[..., None]      # darker burnt patches
    h = .35 * pnoise(rng, N, .9) + .25 * pnoise(rng, N, .35) + .2 * pnoise(rng, N, 1.6)
    def grain(ix, m, d, col, lift):
        a = (m * .85)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift
    for _ in range(int(7000 * K)):
        c = rng.choice(4); col = [np.array([.72, .55, .42]), np.array([.20, .09, .055]), np.array([.62, .32, .18]), np.array([.36, .14, .08])][c]
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(.9, 2.8), lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(.2, .6)))
    def pit(ix, m, d):
        cc = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.8, 1.8) * cc; alb[ix] *= (1 - .5 * m * cc)[..., None]
    for _ in range(int(500 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.2, 4.2), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .12, 1.0), np.clip(.78 + .1 * pnoise(rng, N, .6), .55, .95)

def mortar_maps(N=1024, seed=12):
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.50, .475, .44)
    alb *= (1 + .12 * pnoise(rng, N, 1.0) + .07 * pnoise(rng, N, .4))[..., None]
    h = .5 * pnoise(rng, N, .9) + .3 * pnoise(rng, N, 1.6)
    cols = [np.array(c) for c in ((.76, .72, .64), (.25, .23, .2), (.58, .52, .42), (.4, .38, .35))]
    def grain(ix, m, d, col, lift):
        a = (m * .9)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift
    for _ in range(int(9000 * K)):
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(.9, 2.6), lambda ix, m, d, col=cols[rng.integers(4)] * rng.uniform(.9, 1.1): grain(ix, m, d, col, rng.uniform(.3, .8)))
    return np.clip(alb, 0, 1), normal_from_height(h * .14, 1.0), np.clip(.9 + .05 * pnoise(rng, N, .6), .7, 1)

def wood_maps(N=512, seed=13):
    """pale beech / plywood grain running along u (x)"""
    rng = np.random.default_rng(seed); yy, xx = np.mgrid[0:N, 0:N] / N
    g = pnoise(rng, N, .6); ring = np.sin((yy * 22 + .6 * g + .1 * pnoise(rng, N, 1.3)) * np.pi * 2)
    alb = np.empty((N, N, 3)); alb[:] = (.64, .47, .30)
    alb *= (1 + .16 * ring + .08 * streak(rng, N, 40, 2))[..., None]
    alb *= (1 + .08 * pnoise(rng, N, .5))[..., None]
    h = .3 * ring + .2 * streak(rng, N, 40, 2)
    return np.clip(alb, 0, 1), normal_from_height(h * .1, 1.0), np.clip(.58 + .08 * streak(rng, N, 30, 3), .35, .8)

def plaster_maps(kind, N=1024, seed=21):
    """c1 = rough coat just laid (broad trowel drags and scored lines), c2 = floated (flatter, soft sweeps), c3 = sponge finish (fine even pitted grain)"""
    rng = np.random.default_rng({'c1': 21, 'c2': 22, 'c3': 23}[kind]); stamp = stamp_fn(rng, N)
    base = {'c1': (.60, .575, .54), 'c2': (.64, .62, .585), 'c3': (.68, .66, .625)}[kind]
    alb = np.empty((N, N, 3)); alb[:] = base
    alb *= (1 + .06 * pnoise(rng, N, 1.0) + .04 * pnoise(rng, N, .35))[..., None]
    long = streak(rng, N, {'c1': 26, 'c2': 40, 'c3': 8}[kind], {'c1': 11, 'c2': 14, 'c3': 8}[kind])
    lump = pnoise(rng, N, 1.3)
    amp = {'c1': .07, 'c2': .035, 'c3': .02}[kind]
    alb *= (1 + amp * long + (.07 if kind == 'c1' else .03) * lump)[..., None]
    h = {'c1': .55, 'c2': .25, 'c3': .1}[kind] * long + (.7 if kind == 'c1' else .25) * lump + .25 * pnoise(rng, N, .6)
    if kind == 'c1':                                                    # scored key lines and loose crumbs
        for _ in range(int(70 * K)):
            y = int(rng.uniform(0, N)); x0 = int(rng.uniform(0, N)); L = int(rng.uniform(60, 220)); xs = (np.arange(L) + x0) % N
            for dy, dv in ((0, -.8), (1, .4)): h[(y + dy) % N, xs] += dv; alb[(y + dy) % N, xs] *= (.92 if dy == 0 else 1.02)
    cols = [np.array(c) for c in ((.84, .8, .72), (.34, .31, .27), (.7, .64, .55), (.5, .47, .42))]
    def grain(ix, m, d, col, lift):
        a = (m * .85)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift
    n_grain = {'c1': 12000, 'c2': 9000, 'c3': 15000}[kind]
    for _ in range(int(n_grain * K)):
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(.9, {'c1': 3.0, 'c2': 2.4, 'c3': 2.0}[kind]), lambda ix, m, d, col=cols[rng.integers(4)] * rng.uniform(.92, 1.08): grain(ix, m, d, col, rng.uniform(.25, .7)))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.6, 1.4) * c; alb[ix] *= (1 - .38 * m * c)[..., None]
    for _ in range(int({'c1': 500, 'c2': 260, 'c3': 1300}[kind] * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.2, {'c1': 4, 'c2': 3, 'c3': 3.4}[kind]), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * {'c1': .1, 'c2': .07, 'c3': .09}[kind], 1.0), np.clip(.9 + .05 * pnoise(rng, N, .6), .7, 1)

NS = 512 if QUICK else 1024
for k in ('c1', 'c2', 'c3'):
    a, n, r = plaster_maps(k, NS); save_img('pl-%s-a' % k, a); save_img('pl-%s-n' % k, n, 'Non-Color')

def textured(name, maps, nstr=1.0, spec=.35, metal=0.0, rough=None):
    a, n, r = maps
    ia = save_img(name + '_a', a); inn = save_img(name + '_n', n, 'Non-Color'); ir = save_img(name + '_r', r, 'Non-Color')
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N_, L_ = nt.nodes, nt.links; P = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img):
        t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t
    L_.new(tex(ia).outputs['Color'], P.inputs['Base Color'])
    # glTF wants roughness in G and metalness in B of one image; keep roughness in the green channel of a copy
    rr = np.dstack([np.ones_like(r), r, np.full_like(r, metal)]); irm = save_img(name + '_rm', rr, 'Non-Color')
    sep = N_.new('ShaderNodeSeparateColor'); L_.new(tex(irm).outputs['Color'], sep.inputs['Color']); L_.new(sep.outputs['Green'], P.inputs['Roughness']); L_.new(sep.outputs['Blue'], P.inputs['Metallic'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L_.new(tex(inn).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], P.inputs['Normal'])
    try: P.inputs['Specular IOR Level'].default_value = spec
    except Exception: pass
    return m
def plain(name, col, rough, metal=0.0):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal; return m
BRICK = textured('Brick', brick_maps(NS), 1.5, .4); MORT = textured('MortarJoint', mortar_maps(NS), 1.4, .25)
WOOD = textured('Wood', wood_maps(512), 1.0, .4)
STEEL = plain('Steel', (.78, .80, .83), .22, 1.0); ALU = plain('Aluminium', (.86, .87, .89), .34, 1.0); BRASS = plain('Brass', (.80, .62, .30), .35, 1.0)
MOUND = plain('Mound', (.55, .52, .47), .55)

# ---------------------------------------------------------------- mesh helpers
def new_obj(name, bm, mats=()):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    for m in mats: ob.data.materials.append(m)
    return ob
def box_uv(bm, tile, offset=(0, 0), world=Vector((0, 0, 0))):
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co + world
            u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z)); lp[uvl].uv = (u / tile + offset[0], v / tile + offset[1])
def cube_bm(x0, x1, y0, y1, z0, z1, bevel=0.0, seg=1):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal(((x1 - x0), (z1 - z0), (y1 - y0), 1)))
    if bevel > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=seg, affect='EDGES', profile=.55)
    return bm
def smooth(ob):
    for p in ob.data.polygons: p.use_smooth = True
def cyl_bm(r1, r2, depth, center, axis='x', seg=24):
    bm = bmesh.new(); m = Matrix.Translation(center)
    if axis == 'x': m = m @ Matrix.Rotation(math.radians(90), 4, 'Y')
    if axis == 'z': m = m @ Matrix.Rotation(math.radians(90), 4, 'X')
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=depth, matrix=m, calc_uvs=True); return bm
def join(name, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.view_layer.objects.active; o.name = name; o.data.name = name; return o

# ---------------------------------------------------------------- the wall
WX, WY, BL, BH, J, BD = 11.83, 6.95, .94, .30, .05, .6
rr = random.Random(7); bricks = []
def add_brick(x0, x1, y0, z0):
    bm = cube_bm(x0, x1, y0, y0 + BH, z0, z0 + BD, .018, 1)
    box_uv(bm, 1.9, (rr.random(), rr.random())); return bm
all_bm = bmesh.new()
for c in range(20):
    y0 = c * (BH + J); odd = c % 2
    for layer in (0, 1):
        z0 = -BD if layer == 0 else -2 * BD
        xs = []
        if not odd: xs = [(k * (BL + J), k * (BL + J) + BL) for k in range(12)]
        else:
            h = (BL - J) / 2; xs = [(0, h)] + [(h + J + k * (BL + J), h + J + k * (BL + J) + BL) for k in range(11)] + [(h + J + 11 * (BL + J), h + J + 11 * (BL + J) + h)]
        if layer == 1: xs = [(a + (BL + J) / 2 * (1 if (c % 2 == 0) else 0), b + (BL + J) / 2 * (1 if (c % 2 == 0) else 0)) for a, b in xs] if False else xs
        for (a, b) in xs:
            if layer == 0 or True:
                bm = add_brick(a, b, y0, z0)
                tmp = bpy.data.meshes.new('t'); bm.to_mesh(tmp); bm.free(); all_bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
bricks = new_obj('Bricks', all_bm, (BRICK,)); smooth(bricks)
# raked joints: the mortar sits .06 behind the brick faces
mb = cube_bm(.04, WX - .04, .04, WY - J - .04, -2 * BD + .04, -.06, 0, 1); box_uv(mb, 1.5); mortar = new_obj('Mortar', mb, (MORT,))      # the block is inset on every side: a face shared with the bricks z-fights (flickers) when the camera moves

# ---------------------------------------------------------------- the tools
def trowel():
    bm = bmesh.new(); L, Wd, T = 3.4, 1.3, .035
    # crowned blade: a rounded rectangle with a slight longitudinal crown, the front corners rounded
    nx, ny = 44, 14; verts = {}
    def outline(u, v):      # u in -1..1 along the blade, v in -1..1 across; returns x,y with rounded front corners
        x = u * L / 2; y = v * Wd / 2
        if u > .55:
            k = (u - .55) / .45; y *= math.sqrt(max(0.0, 1 - k ** 2.2)) * .92 + .08 * (1 - k)
            x = (.55 + .45 * math.sin(k * math.pi / 2 * .96)) * L / 2
        return x, y
    for i in range(nx + 1):
        for j in range(ny + 1):
            u = -1 + 2 * i / nx; v = -1 + 2 * j / ny; x, y = outline(u, v)
            crown = .07 * (1 - v * v) * (1 - .3 * max(0, u))                 # the blade is slightly arched across
            verts[(i, j)] = (bm.verts.new(V(x, y, crown + T / 2)), bm.verts.new(V(x, y, crown - T / 2)))
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((verts[(i, j)][0], verts[(i + 1, j)][0], verts[(i + 1, j + 1)][0], verts[(i, j + 1)][0]))
            bm.faces.new((verts[(i, j)][1], verts[(i, j + 1)][1], verts[(i + 1, j + 1)][1], verts[(i + 1, j)][1]))
    for i in range(nx):
        for (j, flip) in ((0, False), (ny, True)):
            a, b = verts[(i, j)], verts[(i + 1, j)]; bm.faces.new((a[0], b[0], b[1], a[1]) if not flip else (a[0], a[1], b[1], b[0]))
    for j in range(ny):
        for (i, flip) in ((0, True), (nx, False)):
            a, b = verts[(i, j)], verts[(i, j + 1)]; bm.faces.new((a[0], b[0], b[1], a[1]) if not flip else (a[0], a[1], b[1], b[0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    blade = new_obj('t_blade', bm, (STEEL,)); smooth(blade)
    parts = [blade]
    for x in (-.55, .55):                                                       # neck posts rising from the blade to the handle bracket
        b = cyl_bm(.045, .045, .46, V(x, 0, .26), 'z', 12); parts.append(new_obj('t_post', b, (STEEL,)))
    br = cube_bm(-.75, .75, -.12, .12, .46, .52, .02, 1); parts.append(new_obj('t_brk', br, (STEEL,)))
    hd = cyl_bm(.15, .17, 1.55, V(0, 0, .72), 'x', 28); parts.append(new_obj('t_handle', hd, (WOOD,)))
    fe = cyl_bm(.17, .17, .22, V(.82, 0, .72), 'x', 24); parts.append(new_obj('t_ferrule', fe, (BRASS,)))
    for p in parts[1:]: smooth(p)
    return join('Trowel', parts)
def hawk():
    parts = []
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((3.4, 3.4, .1, 1))); bmesh.ops.bevel(bm, geom=list(bm.edges), offset=.05, segments=3, affect='EDGES', profile=.55)
    parts.append(new_obj('h_board', bm, (ALU,)))
    parts.append(new_obj('h_post', cyl_bm(.09, .09, .5, V(0, -.3, 0), 'y', 14), (STEEL,)))
    parts.append(new_obj('h_handle', cyl_bm(.12, .14, 1.4, V(0, -1.2, 0), 'y', 24), (WOOD,)))
    for p in parts: smooth(p)
    # blender: the board lies in xz-of-three = xy of blender; rebuild so it is flat in three's xz plane (blender xy) -> cube already flat in blender xy
    return join('Hawk', parts)
def float_():
    parts = []
    bm = cube_bm(-1.4, 1.4, -.85, .85, -.07, .07, .05, 3); parts.append(new_obj('f_plate', bm, (WOOD,)))
    parts.append(new_obj('f_head', cube_bm(-.12, .12, -.12, .12, .07, .5, .03, 2), (WOOD,)))
    parts.append(new_obj('f_grip', cyl_bm(.11, .11, 1.0, V(0, 0, .58), 'x', 20), (WOOD,)))
    for p in parts: smooth(p)
    return join('Float', parts)
def rule():
    L = WX + .8; bm = cube_bm(-L / 2, L / 2, -.17, .17, -.03, .03, .012, 1)
    bm2 = cube_bm(-L / 2, L / 2, .12, .17, -.03, .17, .01, 1); bm3 = cube_bm(-L / 2, L / 2, -.17, -.12, -.03, .17, .01, 1)
    parts = [new_obj('r_web', bm, (ALU,)), new_obj('r_f1', bm2, (ALU,)), new_obj('r_f2', bm3, (ALU,))]
    return join('Rule', parts)
def mound():
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=5, radius=1.0)
    rng = np.random.default_rng(5); ph = [rng.uniform(0, 6.3) for _ in range(8)]
    for v in bm.verts:
        p = v.co.copy(); y = max(p.z, -.05)
        k = 1 + .16 * math.sin(p.x * 3.1 + ph[0]) * math.sin(p.y * 2.7 + ph[1]) + .09 * math.sin(p.x * 6.3 + p.y * 5.1 + ph[2]) + .05 * math.sin(p.z * 9 + ph[3] + p.x * 7)
        q = Vector((p.x * 1.2 * k, p.y * 1.2 * k, max(p.z, 0.0) * .72 * k)); v.co = q
    for f in bm.faces: f.smooth = True
    ob = new_obj('Mound', bm, (MOUND,))
    # rotate so z (blender up) is the dome's height: already; ob origin at the base centre
    return ob
def load():
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1.0)
    for v in bm.verts:
        p = v.co.copy(); v.co = Vector((p.x * 1.15, p.y * .36, max(p.z, -.2) * .28 * (1 + .12 * math.sin(p.x * 6)) ))
    for f in bm.faces: f.smooth = True
    return new_obj('Load', bm, (MOUND,))
T = trowel(); H = hawk(); F = float_(); R = rule(); M = mound(); Ld = load()

# ---------------------------------------------------------------- export
bpy.ops.object.select_all(action='DESELECT')
for o in (bricks, mortar, T, H, F, R, M, Ld): o.select_set(True)
os.makedirs(os.path.dirname(GLB), exist_ok=True)
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False, export_yup=True, export_image_format='WEBP', export_image_quality=82)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[plaster] gltf option retry', e)
print('[plaster] wrote', GLB, os.path.getsize(GLB))
