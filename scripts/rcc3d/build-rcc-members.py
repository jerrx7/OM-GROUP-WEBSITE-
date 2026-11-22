"""OM GROUP - RCC members (20mm page, "20mm Aggregate and Reinforcement Clearance"): slab, beam, column.

Builds all three structural-member models in Blender, headless:
  blender -b --factory-startup -P scripts/rcc3d/build-rcc-members.py -- <repo root> [--quick]

Each member is a short, saw-cut specimen of reinforced concrete seen on its cut face:
  - concrete body (bevelled box, PBR concrete: cement paste, sand, pores)
  - exposed aggregate: real fractured stones cut flat at the face (+ one whole, raised stone that the page highlights)
  - reinforcement: ribbed longitudinal bars (real geometry, bar ends proud of the face), stirrup loop (beam, column),
    distribution rods (slab) - all embedded in the concrete, none floating
Dimension anchors (t = member size, S = clear bar spacing, C = cover) and the highlight stone are written to meta so the web scene
can project them with the same camera.

Output
  assets/3d/rcc-{slab,beam,column}.glb          the models (PBR, named nodes)
  assets/3d/rcc-members.json                    geometry, camera frames, dimension anchors (read by assets/rcc3d/rcc-members.js)
  _review/rcc3d/{member}-poster.png / -shadow.png   Cycles stills (loading state / no WebGL) and the soft shadow
  _review/rcc3d/rcc-{member}.blend              sources

Units: metres. Section coordinates (x right, y up) in mm; the cut face is the plane z = 0, the member runs back to z = -DEPTH.
Blender axes: X right, -Y toward the viewer, Z up. glTF/three.js (+Y up) maps (x,y,z) -> (x, z, -y); helpers take three.js-style coordinates.
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd())
QUICK = '--quick' in argv
ONLY = [a.split('=')[1] for a in argv if a.startswith('--only=')]
OUT = os.path.join(ROOT, '_review', 'rcc3d'); TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True); os.makedirs(os.path.join(ROOT, 'assets', '3d'), exist_ok=True)

DEPTH = 0.070                       # how far the specimen runs behind the cut face
BAR_OUT = 0.0065                    # bars stand this far proud of the cut face
STAGE = (700.0, 500.0)              # stage units (the web stage is 700 x 500); the model frames below are in these units
PITCH, YAW = 9.0, 8.0               # camera: looks down 9 degrees and from 8 degrees to the right (shows the top and right sides)

def V(x, y, z): return Vector((x, -z, y))           # three.js -> blender
mm = lambda v: v / 1000.0

# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'; scene.render.engine = 'CYCLES'

def gpu_on():
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
            try: prefs.compute_device_type = kind
            except Exception: continue
            prefs.get_devices()
            devs = [d for d in prefs.devices if d.type == kind]
            if devs:
                for d in prefs.devices: d.use = d.type == kind
                scene.cycles.device = 'GPU'; print('[rcc3d] Cycles device:', kind); return
    except Exception as e: print('[rcc3d] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()

# ---------------------------------------------------------------- textures (numpy, periodic)
def pnoise(rng, N, beta):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1; F *= f ** (-beta); F[0, 0] = 0
    o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)

def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * .5; dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * .5
    n = np.dstack([-dx * strength, dy * strength, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5

def save_img(name, arr, cs):
    if arr.ndim == 2: arr = np.dstack([arr, arr, arr])
    N, M = arr.shape[0], arr.shape[1]
    rgba = np.ones((N, M, 4), dtype=np.float32); rgba[..., :3] = arr
    img = bpy.data.images.new(name, M, N, alpha=False); img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'; img.save(); img.colorspace_settings.name = cs
    return img

def stamp_fn(rng, N):
    def stamp(cx, cy, r, aspect, ang, fn):
        R = int(math.ceil(r * max(aspect, 1 / aspect) * 1.3 + 2))
        xs = np.arange(int(cx) - R, int(cx) + R + 1); ys = np.arange(int(cy) - R, int(cy) + R + 1)
        X, Y = np.meshgrid(xs + .5 - cx, ys + .5 - cy); ca, sa = math.cos(ang), math.sin(ang)
        u = X * ca + Y * sa; v = (-X * sa + Y * ca) * aspect; th = np.arctan2(v, u); ph = rng.uniform(0, 6.3, 2)
        rr = r * (1 + .22 * (.6 * np.sin(2 * th + ph[0]) + .4 * np.sin(3 * th + ph[1])))
        d = np.sqrt(u * u + v * v) / rr; m = np.clip((1 - d) * rr / 1.1, 0, 1)
        if m.max() > 0: fn(np.ix_(ys % N, xs % N), m, np.clip(d, 0, 1))
    return stamp

def concrete_maps(N=1024, seed=5):
    """A clean, newly cast concrete face: cement paste with soft mottling, sand grains, a few pores. Periodic, so it tiles."""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    base = np.array([.585, .575, .555])
    alb = np.empty((N, N, 3)); alb[:] = base
    alb *= (1 + .045 * pnoise(rng, N, 1.2) + .035 * pnoise(rng, N, .5) + .03 * pnoise(rng, N, 2.0))[..., None]
    alb *= (1 + .02 * pnoise(rng, N, 1.8))[..., None] * np.array([1.0, .995, .985])
    h = .5 * pnoise(rng, N, .9) + .35 * pnoise(rng, N, .3) + .2 * pnoise(rng, N, 1.6)
    k = .4 if QUICK else 1.0
    def grain(ix, m, d, col, lift):
        a = (m * .75)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift * np.sqrt(np.clip(1 - d * d, 0, 1))
    for _ in range(int(16000 * k)):                           # sand: light and dark mineral grains
        r = rng.uniform(1.4, 3.6); g = rng.choice([rng.uniform(.66, .8), rng.uniform(.28, .4), rng.uniform(.5, .6)], p=[.3, .25, .45])
        tint = np.array([g * 1.01, g * .995, g * .965])
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, rng.uniform(.7, 1.4), rng.uniform(0, 3.14), lambda ix, m, d, t=tint: grain(ix, m, d, t, rng.uniform(.05, .3)))
    for _ in range(int(1400 * k)):                            # pores (air voids)
        r = rng.uniform(1.6, 6.5)
        def pit(ix, m, d): h[ix] -= m * rng.uniform(.7, 1.3) * np.sqrt(np.clip(1 - d * d, 0, 1)); alb[ix] *= (1 - .32 * m)[..., None]
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, rng.uniform(.75, 1.3), rng.uniform(0, 3.14), pit)
    alb = np.clip(alb, 0, 1); nrm = normal_from_height(h * .55, 1.0)
    return alb, nrm, np.clip(.84 + .05 * pnoise(rng, N, .6) + .03 * np.clip(-h, -2, 2), .6, 1)

STONE_TONES = [(.50, .50, .495), (.36, .36, .36), (.57, .555, .52), (.31, .31, .31), (.44, .43, .41), (.62, .60, .57), (.40, .385, .365), (.35, .35, .35),
               (.52, .50, .46), (.27, .27, .28), (.47, .47, .46), (.58, .57, .55), (.39, .39, .37), (.45, .44, .43), (.32, .32, .31), (.55, .54, .52)]
def stone_maps(N=1024, seed=11):
    """Cut faces of crushed stone: a 4 x 4 atlas of different rocks (grey granite, dark basalt, buff limestone ...); every stone samples its own cell."""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); cell = N // 4
    for ci in range(16):
        r0, c0 = (ci // 4) * cell, (ci % 4) * cell; alb[r0:r0 + cell, c0:c0 + cell] = np.array(STONE_TONES[ci])
    alb *= (1 + .16 * pnoise(rng, N, 1.0) + .09 * pnoise(rng, N, .45))[..., None]
    h = .5 * pnoise(rng, N, 1.3) + .3 * pnoise(rng, N, .5)
    k = .4 if QUICK else 1.0
    def fleck(ix, m, d, col, base):
        a = (m * .8)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * .1
    for _ in range(int(9000 * k)):
        r = rng.uniform(1.6, 4.8); x, y = rng.uniform(0, N, 2); base = alb[int(y) % N, int(x) % N]
        g = rng.choice([1.45, .5, .8], p=[.3, .3, .4]) * rng.uniform(.85, 1.15)
        stamp(x, y, r, rng.uniform(.7, 1.4), rng.uniform(0, 3.14), lambda ix, m, d, col=np.clip(base * g, 0, 1), b=base: fleck(ix, m, d, col, b))
    alb = np.clip(alb, 0, 1); nrm = normal_from_height(h * .35, 1.0)
    return alb, nrm, np.clip(.8 + .07 * pnoise(rng, N, .6), .55, 1)

def rebar_maps(W=256, Hh=512, seed=3):
    """Hot-rolled reinforcing steel: dark rust-brown with mill-scale and light rust bloom. U wraps around the bar, V runs along it."""
    rng = np.random.default_rng(seed)
    base = np.array([.27, .145, .095])
    alb = np.empty((Hh, W, 3)); alb[:] = base
    n1 = pnoise(rng, W, 1.0)[:Hh] if W >= Hh else np.tile(pnoise(rng, W, 1.0), (Hh // W, 1))
    n2 = np.tile(pnoise(rng, W, 1.7), (Hh // W, 1)); n3 = np.tile(pnoise(rng, W, .5), (Hh // W, 1))
    alb *= (1 + .22 * n1 + .12 * n2)[..., None]
    rust = np.clip(n3 * .5 + .2, 0, 1)[..., None]; alb = alb * (1 - .32 * rust) + np.array([.55, .27, .12]) * .32 * rust
    mill = np.clip(n2 - .9, 0, 1)[..., None]; alb = alb * (1 - .5 * mill) + np.array([.17, .17, .19]) * .5 * mill
    h = .6 * n2 + .3 * n3 + .5 * np.tile(pnoise(rng, W, 2.4), (Hh // W, 1))
    nrm = normal_from_height(h * .22, 1.0)
    return np.clip(alb, 0, 1), nrm, np.clip(.56 + .12 * n2, .35, .9)

conc_a, conc_n, conc_r = concrete_maps()
stone_a, stone_n, stone_r = stone_maps()
bar_a, bar_n, bar_r = rebar_maps()
IMG = {k: save_img(k, v, cs) for k, v, cs in [('conc_albedo', conc_a, 'sRGB'), ('conc_normal', conc_n, 'Non-Color'), ('conc_rough', conc_r, 'Non-Color'),
                                              ('stone_albedo', stone_a, 'sRGB'), ('stone_normal', stone_n, 'Non-Color'),
                                              ('bar_albedo', bar_a, 'sRGB'), ('bar_normal', bar_n, 'Non-Color'), ('bar_rough', bar_r, 'Non-Color')]}

# ---------------------------------------------------------------- materials
def pbr(name, color, metal, rough, alb=None, nrm=None, nstr=0.4, rimg=None):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N, L = nt.nodes, nt.links; P = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    P.inputs['Base Color'].default_value = (*color, 1); P.inputs['Metallic'].default_value = metal; P.inputs['Roughness'].default_value = rough
    uv = N.new('ShaderNodeUVMap'); uv.uv_map = ''      # empty = the active UV map
    def tex(img):
        t = N.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Linear'; L.new(uv.outputs['UV'], t.inputs['Vector']); return t
    if alb is not None: L.new(tex(alb).outputs['Color'], P.inputs['Base Color'])
    if rimg is not None: L.new(tex(rimg).outputs['Color'], P.inputs['Roughness'])
    if nrm is not None:
        nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L.new(tex(nrm).outputs['Color'], nm.inputs['Color']); L.new(nm.outputs['Normal'], P.inputs['Normal'])
    return m

MAT = {
    'concrete': pbr('ConcreteSection', (.5, .5, .5), 0.0, .86, IMG['conc_albedo'], IMG['conc_normal'], .55, IMG['conc_rough']),
    'cut': pbr('AggregateCut', (.4, .4, .4), 0.0, .78, IMG['stone_albedo'], IMG['stone_normal'], .5),
    'stone': pbr('AggregateStone', (.4, .4, .4), 0.0, .84, IMG['stone_albedo'], IMG['stone_normal'], 1.0),
    'rebar': pbr('RebarSteel', (.26, .14, .09), .55, .56, IMG['bar_albedo'], IMG['bar_normal'], .4, IMG['bar_rough']),
    'rebar_end': pbr('RebarEndFace', (.17, .095, .065), .35, .62),
}

# ---------------------------------------------------------------- mesh helpers
def to_blender(bm):
    """The builders work in three.js axes (x right, y up, z toward the viewer); Blender meshes need (x, -z, y)."""
    from mathutils import Matrix
    bmesh.ops.transform(bm, matrix=Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1))), verts=list(bm.verts))

def to_obj(name, bm, mats, parent=None, smooth=True):
    to_blender(bm); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    for m in mats: me.materials.append(m)
    for p in me.polygons: p.use_smooth = smooth
    if parent: ob.parent = parent
    return ob

def box_uv(me, tile, offset=(0, 0)):
    if not me.uv_layers: me.uv_layers.new(name='UVMap')
    bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co
            u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z))
            lp[uvl].uv = (u / tile + offset[0], v / tile + offset[1])
    bm.to_mesh(me); bm.free()

def bar_mesh(R, z0, z1, seed, ribs=True, name='bar', axis='z'):
    """A ribbed reinforcing bar from z0 (back) to z1 (front end) along three.js z (or along x when axis == 'x'). Longitudinal ribs on two sides,
    oblique cross-ribs, chamfered ends, flat end faces (material 1)."""
    rng = random.Random(seed); NT = 28 if ribs else 18; dz = 0.0013 if ribs else 0.05; nz = max(8, int((z1 - z0) / dz)); ph = rng.uniform(0, 6.28)
    bm = bmesh.new(); rings = []; info = {}
    def rad(th, z):
        r = R
        if ribs:
            lon = math.exp(-((math.sin(th) / 0.13) ** 2) * .5)                      # two narrow longitudinal ribs (th = 0, pi)
            pos = ((z * 1000.0 + ph + th * 1.1) % 9.5) / 9.5                          # cross ribs: oblique, every ~9.5 mm
            cr = max(0.0, 1.0 - abs(pos - .5) / .17) ** 1.4
            r = R * (1 + .095 * lon + .075 * cr * (1 - .5 * lon))
        e = min(z - z0, z1 - z)                                                      # chamfer the last 1.3 mm of each end
        if e < 0.0013: r *= .80 + .20 * max(0, e) / 0.0013
        return r
    def vert(r, th, z):
        x, y = r * math.cos(th), r * math.sin(th)
        v = bm.verts.new((z, x, y) if axis == 'x' else (x, y, z)); info[v] = (th, z); return v
    for i in range(nz + 1):
        z = z0 + (z1 - z0) * i / nz
        rings.append([vert(rad(2 * math.pi * j / NT, z), 2 * math.pi * j / NT, z) for j in range(NT)])
    for i in range(nz):
        for j in range(NT):
            f = bm.faces.new((rings[i][j], rings[i][(j + 1) % NT], rings[i + 1][(j + 1) % NT], rings[i + 1][j])); f.material_index = 0
    ca = bm.faces.new(rings[-1]); ca.material_index = 1
    cb = bm.faces.new(rings[0][::-1]); cb.material_index = 1
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        if f.material_index != 0:
            for lp in f.loops: lp[uvl].uv = (.5, .5)
            continue
        us = []
        for lp in f.loops: th, z = info[lp.vert]; us.append(((th / (2 * math.pi)) % 1.0, (z * 14.0) % 1.0))
        if max(u for u, v in us) - min(u for u, v in us) > .5: us = [(u + 1.0 if u < .5 else u, v) for u, v in us]
        for lp, uv in zip(f.loops, us): lp[uvl].uv = uv
    to_blender(bm); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = p.material_index == 0
    me.materials.append(MAT['rebar']); me.materials.append(MAT['rebar_end'])
    return me

def rounded_rect_path(hw, hh, rad, n=7):
    pts = []
    for (cx, cy, a0) in ((hw - rad, hh - rad, 0), (-hw + rad, hh - rad, 90), (-hw + rad, -hh + rad, 180), (hw - rad, -hh + rad, 270)):
        for k in range(n + 1):
            a = math.radians(a0 + 90.0 * k / n); pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return pts

def loop_mesh(path, r, zc, name='stirrup'):
    """Closed wire loop (bent stirrup, radius r) in the plane z = zc, following `path` (x, y metres, counter-clockwise)."""
    NT = 14; bm = bmesh.new(); n = len(path); rings = []
    for i in range(n):
        p = Vector(path[i]); a = Vector(path[(i - 1) % n]); b = Vector(path[(i + 1) % n]); t = (b - a).normalized(); nrm = Vector((t.y, -t.x))   # outward normal (ccw path)
        ring = []
        for j in range(NT):
            ph = 2 * math.pi * j / NT; o = nrm * (r * math.cos(ph)); ring.append(bm.verts.new((p.x + o.x, p.y + o.y, zc + r * math.sin(ph))))
        rings.append(ring)
    for i in range(n):
        for j in range(NT): bm.faces.new((rings[i][j], rings[(i + 1) % n][j], rings[(i + 1) % n][(j + 1) % NT], rings[i][(j + 1) % NT]))
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops: c = lp.vert.co; lp[uvl].uv = ((c.x * 14.0) % 1.0, (c.y * 14.0) % 1.0)
    to_blender(bm); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(MAT['rebar']); return me

def rock_mesh(seed, subdiv=3):
    """A fractured, angular aggregate particle (icosphere pushed back onto random cleavage planes), mean radius ~ 1."""
    rng = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    sx, sy, sz = rng.uniform(.95, 1.35), rng.uniform(.7, 1.0), rng.uniform(.82, 1.15)
    planes = []
    for _ in range(rng.randint(12, 17)):
        n = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized(); planes.append((n, rng.uniform(.5, .78)))
    s1, s2, s3 = rng.uniform(0, 9), rng.uniform(0, 9), rng.uniform(0, 9)
    for v in bm.verts:
        p = v.co.copy(); p *= 1 + .06 * math.sin(p.x * 3.1 + s1) * math.cos(p.y * 2.6 + s2) + .045 * math.sin(p.z * 4.3 + s3)
        for n, off in planes:
            d = p.dot(n) - off
            if d > 0: p -= n * d
        v.co = Vector((p.x * sx, p.y * sy, p.z * sz))
    rm = math.sqrt(sum(v.co.length_squared for v in bm.verts) / len(bm.verts))
    for v in bm.verts: v.co /= rm * 1.04
    return bm

def uv_cube(bm, off, scale=.62):
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co
            u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z)); lp[uvl].uv = (u * scale + off[0], v * scale + off[1])

# ---------------------------------------------------------------- members (section coordinates in mm; y up)
def member_spec(kind):
    """Everything about the cross-section: outline, bars, stirrup, rods, dimension anchors, highlight stone. All lengths in mm."""
    if kind == 'slab':
        w, h = 360.0, 84.0
        bars = [dict(x=x, y=-15.5, r=5.5, role='bottom') for x in range(-160, 161, 40)] + [dict(x=x, y=16.0, r=5.0, role='top') for x in (-150, -90, -30, 30, 90, 150)]
        rods = [dict(y=-24.0, r=3.0), dict(y=24.0, r=3.0)]
        stir = None
        hl = dict(x=-20.0, y=-15.5, r=11.0, seed=14, note='gap between two bottom bars')
        # t: member thickness (left side), S: clear gap between the bottom bars either side of the highlighted stone, C: cover to the top rod (right side)
        dims = [dict(id='t', a=[-w / 2, -h / 2], b=[-w / 2, h / 2], dir='v', side='left', off=40),
                dict(id='s', a=[-40 + 5.5, -15.5], b=[0 - 5.5, -15.5], dir='h', side='bottom', off=52, fromy=-h / 2),
                dict(id='c', a=[w / 2, h / 2 - 15.0], b=[w / 2, h / 2], dir='v', side='right', off=34)]
        frame = dict(scale=1.5, cx=350.0, cy=222.0)
    elif kind == 'beam':
        w, h = 150.0, 250.0
        bars = [dict(x=x, y=-97.0, r=5.5, role='bottom') for x in (-45, 0, 45)] + [dict(x=x, y=97.0, r=5.0, role='top') for x in (-50, 50)]
        rods = []
        stir = dict(hw=w / 2 - 14.0, hh=h / 2 - 14.0, rad=9.0, r=3.0)
        hl = dict(x=-22.5, y=-95.0, r=10.0, seed=22, note='gap between two bottom bars')
        dims = [dict(id='t', a=[-w / 2, -h / 2], b=[w / 2, -h / 2], dir='h', side='bottom', off=66),
                dict(id='s', a=[-45 + 5.5, -97.0], b=[0 - 5.5, -97.0], dir='h', side='bottom', off=30, fromy=-h / 2),
                dict(id='c', a=[-w / 2, h / 2 - 11.0], b=[-w / 2, h / 2], dir='v', side='left', off=40, ext=[[-(w / 2 - 14.0 - 9.0), h / 2 - 11.0], [-w / 2, h / 2]])]
        frame = dict(scale=1.28, cx=350.0, cy=215.0)
    else:
        w, h = 190.0, 190.0
        pts = [(-66, -66), (66, -66), (-66, 66), (66, 66), (0, -66), (0, 66), (-66, 0), (66, 0)]
        bars = [dict(x=x, y=y, r=6.5, role='main') for x, y in pts]
        rods = []
        stir = dict(hw=w / 2 - 15.0, hh=h / 2 - 15.0, rad=6.0, r=3.0)
        hl = dict(x=-33.0, y=61.0, r=10.0, seed=31, note='gap between two top bars')
        dims = [dict(id='t', a=[-w / 2, -h / 2], b=[w / 2, -h / 2], dir='h', side='bottom', off=44),
                dict(id='s', a=[-66 + 6.5, 66.0], b=[0 - 6.5, 66.0], dir='h', side='top', off=44, fromy=h / 2),
                dict(id='c', a=[-w / 2, h / 2 - 12.0], b=[-w / 2, h / 2], dir='v', side='left', off=40, ext=[[-(w / 2 - 15.0 - 6.0), h / 2 - 12.0], [-w / 2, h / 2]])]
        frame = dict(scale=1.5, cx=350.0, cy=248.0)
    return dict(kind=kind, w=w, h=h, bars=bars, rods=rods, stir=stir, hl=hl, dims=dims, frame=frame)

def inside_stirrup_dist(sp, x, y):
    """Signed distance (mm) from a point to the stirrup centre line (positive = outside the loop's line)."""
    s = sp['stir']
    if not s: return 1e9
    hw, hh, rad = s['hw'] - s['rad'], s['hh'] - s['rad'], s['rad']
    dx, dy = abs(x) - hw, abs(y) - hh
    d = math.hypot(max(dx, 0), max(dy, 0)) + min(max(dx, dy), 0) - rad
    return abs(d)

def scatter_stones(sp, rng):
    """Cut aggregate sections: Poisson-like scatter that keeps clear of the bars, the stirrup, the highlighted stone and the edges."""
    w, h = sp['w'], sp['h']; out = []
    target = int(w * h / (580.0 if sp['kind'] == 'slab' else 700.0))
    tries = 0
    while len(out) < target and tries < 9000:
        tries += 1
        r = rng.choice([4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0]) * rng.uniform(.9, 1.1)
        x = rng.uniform(-w / 2 + r + 2.5, w / 2 - r - 2.5); y = rng.uniform(-h / 2 + r + 2.5, h / 2 - r - 2.5)
        ok = True
        for b in sp['bars']:
            if math.hypot(x - b['x'], y - b['y']) < r + b['r'] + 3.0: ok = False; break
        if not ok: continue
        for rd in sp['rods']:
            if abs(y - rd['y']) < r + rd['r'] + 2.5: ok = False; break
        if not ok: continue
        if sp['stir'] and inside_stirrup_dist(sp, x, y) < r + sp['stir']['r'] + 2.5: continue
        if math.hypot(x - sp['hl']['x'], y - sp['hl']['y']) < r + sp['hl']['r'] + 8.0: continue
        for o in out:
            if math.hypot(x - o[0], y - o[1]) < r + o[2] + 2.2: ok = False; break
        if ok: out.append((x, y, r))
    return out

# ---------------------------------------------------------------- build one member
def build_member(kind):
    sp = member_spec(kind); rng = random.Random({'slab': 5, 'beam': 6, 'column': 7}[kind]); created = []
    root = bpy.data.objects.new('RCC_' + kind.capitalize(), None); scene.collection.objects.link(root); created.append(root)
    w, h = sp['w'], sp['h']
    # --- concrete (bevelled box); the cut face is z = 0
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * mm(w), v.co.y * mm(h), (v.co.z - .5) * DEPTH))
    ob = to_obj('Concrete', bm, [MAT['concrete']], root); ob.location = V(0, 0, 0); created.append(ob)
    bpy.context.view_layer.objects.active = ob
    bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = .0016; bv.segments = 3; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40); bv.profile = .55
    bpy.ops.object.modifier_apply(modifier=bv.name)
    for p in ob.data.polygons: p.use_smooth = False
    box_uv(ob.data, 0.20, (rng.random(), rng.random()))
    # --- exposed aggregate, cut flat at the face (one mesh)
    sb = bmesh.new(); stones = scatter_stones(sp, rng)
    for i, (x, y, r) in enumerate(stones):
        rb = rock_mesh(rng.randint(1, 9999), 2); rr = mm(r)
        ang = rng.uniform(0, 6.28); co, si = math.cos(ang), math.sin(ang)
        for v in rb.verts:                                     # scale, random orientation (about all axes via a rotation matrix), position
            p = v.co * rr; v.co = Vector((p.x * co - p.y * si, p.x * si + p.y * co, p.z))
        ge = bmesh.ops.bisect_plane(rb, geom=list(rb.verts) + list(rb.edges) + list(rb.faces), plane_co=Vector((0, 0, rng.uniform(-.1, .1) * rr)), plane_no=Vector((0, 0, 1)), clear_outer=True)
        cut = [e for e in ge['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if not cut: rb.free(); continue
        fl = bmesh.ops.holes_fill(rb, edges=cut, sides=0)
        zc = max(v.co.z for e in cut for v in e.verts)
        faces_cut = fl['faces']
        for f in rb.faces: f.material_index = 0
        ci = rng.randrange(16); off = (((ci % 4) + .5) / 4, ((ci // 4) + .5) / 4); uv_cube(rb, off, 14.0)          # each stone samples its own cell of the stone atlas
        for v in rb.verts: v.co = Vector((v.co.x + mm(x), v.co.y + mm(y), v.co.z - zc + 0.00018))   # cut face sits 0.18 mm proud of the concrete
        to_blender(rb)
        me_tmp = bpy.data.meshes.new('t'); rb.to_mesh(me_tmp); rb.free(); sb.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    me = bpy.data.meshes.new('AggregateSections'); sb.to_mesh(me); sb.free()
    ag = bpy.data.objects.new('AggregateSections', me); scene.collection.objects.link(ag); ag.parent = root; ag.location = V(0, 0, 0); me.materials.append(MAT['cut']); created.append(ag)
    for p in me.polygons: p.use_smooth = False
    # --- the whole, raised stone that the page highlights (fractured faces, half out of its pocket)
    hl = sp['hl']; rb = rock_mesh(hl['seed']); rr = mm(hl['r'])
    for v in rb.verts: v.co = v.co * rr
    uv_cube(rb, (.375, .125), 9.0); to_blender(rb)
    hme = bpy.data.meshes.new('HighlightStone'); rb.to_mesh(hme); rb.free()
    ho = bpy.data.objects.new('AggregateHighlight', hme); scene.collection.objects.link(ho); ho.parent = root; hme.materials.append(MAT['stone'])
    for p in hme.polygons: p.use_smooth = False
    hz = -mm(hl['r']) * 0.15; ho.location = V(mm(hl['x']), mm(hl['y']), hz); created.append(ho)
    hl['z'] = hz; hl['rmm'] = hl['r']
    # --- reinforcement: bars (end proud of the face), stirrup, rods
    steel = []
    for i, b in enumerate(sp['bars']):
        me = bar_mesh(mm(b['r']), -.006, BAR_OUT, 100 + i, True, 'Bar%02d' % i)      # only the part near the face is visible; the rest is buried in opaque concrete
        o = bpy.data.objects.new('Rebar_%02d' % (i + 1), me); scene.collection.objects.link(o); o.parent = root; o.location = V(mm(b['x']), mm(b['y']), 0); created.append(o)
    if sp['stir']:
        s = sp['stir']; path = [(mm(px), mm(py)) for px, py in rounded_rect_path(s['hw'], s['hh'], s['rad'], 8)]
        me = loop_mesh(path, mm(s['r']), -mm(s['r']) * .22, 'Stirrup')
        o = bpy.data.objects.new('Stirrup', me); scene.collection.objects.link(o); o.parent = root; o.location = V(0, 0, 0); created.append(o)
    for i, rd in enumerate(sp['rods']):
        me = bar_mesh(mm(rd['r']), -mm(w) / 2 + .004, mm(w) / 2 - .004, 300 + i, False, 'Rod%d' % i, axis='x')
        o = bpy.data.objects.new('DistributionRod_%d' % (i + 1), me); scene.collection.objects.link(o); o.parent = root
        o.location = V(0, mm(rd['y']), -mm(rd['r']) * .22); created.append(o)
    sp['stones'] = len(stones)
    return sp, root, created

# ---------------------------------------------------------------- lights / camera / render
def area(name, loc, w, h, energy, color=(1, 1, 1), look=(0, 0, 0), shadow=True):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
    try: ld.use_shadow = shadow
    except Exception: pass
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = V(*loc)
    ob.rotation_euler = (V(*look) - ob.location).to_track_quat('-Z', 'Y').to_euler(); return ob

LK = float(os.environ.get('LK', '0.12'))
area('Key', (-.26, .46, 1.2), .5, .4, 240 * LK, (1.0, .985, .965), look=(0, 0, -.03))
area('Fill', (.9, .1, 1.0), 1.0, .8, 70 * LK, (.97, .98, 1.0), shadow=False, look=(0, 0, -.03))
area('Top', (0, 1.1, .3), .9, .5, 55 * LK, (1, 1, 1), shadow=False, look=(0, 0, -.03))
area('Rim', (.7, .35, -.55), .6, .3, 40 * LK, (1, .98, .95), shadow=False, look=(0, 0, -.03))
world = bpy.data.worlds.new('Studio'); scene.world = world
try: world.use_nodes = True
except Exception: pass
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.93, .92, .9, 1); bg.inputs['Strength'].default_value = float(os.environ.get('WK', '0.08'))
VT = os.environ.get('VT', 'Khronos PBR Neutral')
try: scene.view_settings.view_transform = VT
except Exception as e: print('[rcc3d] view transform', e); scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = float(os.environ.get('EXP', '0'))
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'
scene.render.film_transparent = True; scene.render.resolution_percentage = 100

# backdrop that only catches the soft shadow (a wall behind the specimen)
bd_me = bpy.data.meshes.new('Backdrop'); bb = bmesh.new(); bmesh.ops.create_grid(bb, x_segments=1, y_segments=1, size=2.0); bb.to_mesh(bd_me); bb.free()
bd = bpy.data.objects.new('Backdrop', bd_me); scene.collection.objects.link(bd); bd.rotation_euler = (math.radians(90), 0, 0); bd.location = V(0, 0, -DEPTH - float(os.environ.get('BG', '.014')))
bd.is_shadow_catcher = True

cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.clip_start = .05; cam.clip_end = 20
cam_ob = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(cam_ob); scene.camera = cam_ob

def aim_camera(sp):
    f = sp['frame']; s = f['scale']; W_m = STAGE[0] / s / 1000.0          # world width of the stage frame, metres
    c0 = Vector((0, 0, -.025))                                             # look at the middle of the specimen (three.js coords)
    pt, yw = math.radians(PITCH), math.radians(YAW)
    d = Vector((math.sin(yw) * math.cos(pt), math.sin(pt), math.cos(yw) * math.cos(pt)))   # direction from the target to the camera (three.js)
    pos = c0 + d * 6.0
    cam_ob.location = V(pos.x, pos.y, pos.z)
    cam_ob.rotation_euler = (V(*c0) - cam_ob.location).to_track_quat('-Z', 'Y').to_euler()
    cam.ortho_scale = W_m
    fx = f['cx'] / STAGE[0]; fy = f['cy'] / STAGE[1]; r = STAGE[1] / STAGE[0]
    cam.shift_x = 0.5 - fx; cam.shift_y = (fy - 0.5) * r
    f['W_m'] = W_m; f['target'] = [c0.x, c0.y, c0.z]; f['dir'] = [d.x, d.y, d.z]
    scene.render.resolution_x = int(1400 if QUICK else 2100); scene.render.resolution_y = int(round(scene.render.resolution_x * STAGE[1] / STAGE[0]))

def render(path, samples):
    scene.cycles.samples = samples; scene.render.filepath = path; bpy.ops.render.render(write_still=True)

meta = {'stage': list(STAGE), 'pitch': PITCH, 'yaw': YAW, 'depth': DEPTH, 'barOut': BAR_OUT, 'members': {}}
for kind in ('slab', 'beam', 'column'):
    if ONLY and kind not in ONLY: continue
    sp, root, created = build_member(kind)
    aim_camera(sp)
    # ---- export the model
    bpy.ops.object.select_all(action='DESELECT')
    for o in created: o.select_set(True)
    bpy.context.view_layer.objects.active = root
    GLB = os.path.join(ROOT, 'assets', '3d', 'rcc-%s.glb' % kind)
    opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
                export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_image_format='WEBP', export_image_quality=70)
    for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
        try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
        except TypeError as e: print('[rcc3d] gltf option retry', e)
    print('[rcc3d]', kind, 'GLB', os.path.getsize(GLB), 'bytes;', sp['stones'], 'cut stones')
    # ---- stills: poster (object + shadow) and the shadow alone
    bd.hide_render = False
    for o in created:
        if o.type == 'MESH': o.hide_render = False; o.visible_camera = True
    render(os.path.join(OUT, kind + '-poster.png'), 48 if QUICK else 320)
    for o in created:
        if o.type == 'MESH': o.visible_camera = False
    render(os.path.join(OUT, kind + '-shadow.png'), 24 if QUICK else 160)
    for o in created:
        if o.type == 'MESH': o.visible_camera = True
    f = sp['frame']
    meta['members'][kind] = {'w': sp['w'], 'h': sp['h'], 'bars': sp['bars'], 'rods': sp['rods'], 'stirrup': sp['stir'], 'highlight': sp['hl'], 'dims': sp['dims'],
                             'frame': f, 'stones': sp['stones']}
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'rcc-%s.blend' % kind), copy=True)
    # remove this member before the next
    for o in created: bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes):
        if me.users == 0: bpy.data.meshes.remove(me)

mp = os.path.join(ROOT, 'assets', '3d', 'rcc-members.json')
if ONLY and os.path.exists(mp):
    old = json.load(open(mp)); old['members'].update(meta['members']); meta = old
with open(mp, 'w') as fh: json.dump(meta, fh, indent=1)
print('[rcc3d] done')
