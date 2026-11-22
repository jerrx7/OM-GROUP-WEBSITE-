"""OM GROUP - Concrete Sand page, "Fine against coarse, to scale": one Blender still.

  blender -b --factory-startup -P scripts/scale3d/build-scale.py -- <repo root> [--quick]

  _review/scale3d/scale.png   a heap of manufactured sand, then a 4.75, a 10, a 20 and a 40 mm crushed stone in a row, all in true proportion (1 unit = 1 mm),
                              transparent background with a soft floor shadow. Frame 3.3 : 1 (x from -212 to +70 mm). The page adds the ticks, the labels and the selection ring.
The stones are fractured-rock meshes scaled so that their middle dimension equals the nominal size. The sand is a displaced heap at its angle of repose with a grain texture.
"""
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'scale3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
U = 0.001
LK = float(os.environ.get('LK', '0.45')); WK = float(os.environ.get('WK', '0.30'))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.unit_settings.system = 'METRIC'; scene.render.engine = 'CYCLES'
def gpu_on():
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
            try: prefs.compute_device_type = kind
            except Exception: continue
            prefs.get_devices(); devs = [d for d in prefs.devices if d.type == kind]
            if devs:
                for d in prefs.devices: d.use = d.type == kind
                scene.cycles.device = 'GPU'; print('[scale] Cycles device:', kind); return
    except Exception as e: print('[scale] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()
def V(x, y, z): return Vector((x * U, -z * U, y * U))      # mm: x right, y up, z toward the viewer -> blender metres

def pnoise(rng, N, beta):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1; F *= f ** (-beta); F[0, 0] = 0
    o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)
def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2; dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2
    n = np.dstack([-dx * strength, -dy * strength, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True); return n * 0.5 + 0.5
def save_img(name, arr, cs):
    N = arr.shape[0]
    if arr.ndim == 2: arr = np.dstack([arr, arr, arr])
    rgba = np.ones((N, arr.shape[1], 4), dtype=np.float32); rgba[..., :3] = arr
    img = bpy.data.images.new(name, arr.shape[1], N, alpha=False); img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'; img.save(); img.colorspace_settings.name = cs; return img
def stamp_fn(rng, N):
    def stamp(cx, cy, r, fn):
        R = int(math.ceil(r * 1.4 + 2)); xs = np.arange(int(cx) - R, int(cx) + R + 1); ys = np.arange(int(cy) - R, int(cy) + R + 1)
        X, Y = np.meshgrid(xs + .5 - cx, ys + .5 - cy); a = rng.uniform(0, 3.14); u = X * math.cos(a) + Y * math.sin(a); v = (-X * math.sin(a) + Y * math.cos(a)) * rng.uniform(.65, 1.5)
        th = np.arctan2(v, u); rr = r * (1 + .25 * np.sin(2 * th + rng.uniform(0, 6.3)) + .15 * np.sin(3 * th + rng.uniform(0, 6.3)))
        d = np.sqrt(u * u + v * v) / rr; m = np.clip((1 - d) * rr / 1.0, 0, 1)
        if m.max() > 0: fn(np.ix_(ys % N, xs % N), m, np.clip(d, 0, 1))
    return stamp
K = .35 if QUICK else 1.0

def stone_maps(N=1024, seed=5):
    """igneous crushed stone: dark blue-grey matrix, bright quartz / feldspar specks, near-black biotite flecks, pits (periodic)"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.30, .31, .335)
    alb *= (1 + .16 * pnoise(rng, N, 1.2) + .09 * pnoise(rng, N, .5))[..., None]; alb *= (1 + .26 * pnoise(rng, N, .12))[..., None]
    h = .5 * pnoise(rng, N, 1.0) + .35 * pnoise(rng, N, .3) + .15 * pnoise(rng, N, 0.05)
    def fleck(ix, m, d, col, lift):
        a = (m * .92)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift * np.sqrt(np.clip(1 - d * d, 0, 1))
    for _ in range(int(2800 * K)):
        r = rng.uniform(1.0, 3.4) * (1.7 if rng.random() < .05 else 1); g = rng.uniform(.46, .76)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g * .99, g * .98]), rng.uniform(.2, .5)))
    for _ in range(int(2400 * K)):
        r = rng.uniform(1.4, 4.6); g = rng.uniform(.04, .12)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g, g * 1.05]), rng.uniform(.05, .25)))
    for _ in range(int(900 * K)):
        def pit(ix, m, d): h[ix] -= m * rng.uniform(.6, 1.2) * np.sqrt(np.clip(1 - d * d, 0, 1)); alb[ix] *= (1 - .38 * m)[..., None]
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2.5, 8), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .09, 1.0), np.clip(.58 + .08 * pnoise(rng, N, .6), .35, .9)

def sand_maps(N=1024, seed=15):
    """manufactured sand: warm grey angular grains (quartz-bright, grey, dark, tan), a fine relief, soft tonal drift"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.25, .235, .21)
    alb *= (1 + .10 * pnoise(rng, N, 1.0) + .06 * pnoise(rng, N, .4))[..., None]; alb *= (1 + .08 * pnoise(rng, N, .12))[..., None]
    h = .5 * pnoise(rng, N, .8) + .3 * pnoise(rng, N, 1.6)
    cols = [np.array(c) for c in ((.72, .68, .60), (.34, .33, .31), (.12, .12, .12), (.56, .47, .36), (.46, .43, .38), (.80, .76, .68), (.28, .25, .21))]
    def grain(ix, m, d, col, lift):
        a = (m * .95)[..., None]; shade = (.82 + .3 * (1 - d))[..., None]; alb[ix] = alb[ix] * (1 - a) + col * shade * a; h[ix] += m * lift
    for _ in range(int(26000 * K)):
        col = cols[rng.integers(len(cols))] * rng.uniform(.9, 1.1)
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2.2, 6.5), lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(.3, 1.0)))
    return np.clip(alb, 0, 1), normal_from_height(h * .16, 1.0), np.clip(.86 + .06 * pnoise(rng, N, .6), .6, 1)

NS = 512 if QUICK else 1024
def textured(name, maps, nstr=1.0, tint=True, spec=.5):
    a, n, r = maps
    imgs = (save_img(name + '_a', a, 'sRGB'), save_img(name + '_n', n, 'Non-Color'), save_img(name + '_r', r, 'Non-Color'))
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N_, L_ = nt.nodes, nt.links; P = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img):
        t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t
    col = tex(imgs[0]).outputs['Color']
    if tint:
        oi = N_.new('ShaderNodeObjectInfo'); mp = N_.new('ShaderNodeMapRange'); mp.inputs['To Min'].default_value = .5; mp.inputs['To Max'].default_value = 1.15; L_.new(oi.outputs['Random'], mp.inputs['Value'])
        mt = N_.new('ShaderNodeMix'); mt.data_type = 'RGBA'; mt.blend_type = 'MULTIPLY'; mt.inputs['Factor'].default_value = 1.0
        L_.new(col, mt.inputs[6]); L_.new(mp.outputs['Result'], mt.inputs[7]); col = mt.outputs[2]
    L_.new(col, P.inputs['Base Color']); L_.new(tex(imgs[2]).outputs['Color'], P.inputs['Roughness'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L_.new(tex(imgs[1]).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], P.inputs['Normal'])
    try: P.inputs['Specular IOR Level'].default_value = spec
    except Exception: pass
    return m
STONE = textured('Stone', stone_maps(NS), 1.1, True, .55)
SAND = textured('Sand', sand_maps(NS), 1.3, False, .35)
GRAIN = bpy.data.materials.new('Grain')
try: GRAIN.use_nodes = True
except Exception: pass
gp = next(x for x in GRAIN.node_tree.nodes if x.type == 'BSDF_PRINCIPLED'); gp.inputs['Base Color'].default_value = (.25, .235, .21, 1); gp.inputs['Roughness'].default_value = .9

def make_rock(seed):
    rng = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    sx, sy, sz = rng.uniform(1.0, 1.25), rng.uniform(.70, .95), rng.uniform(.85, 1.15); planes = []
    for _ in range(rng.randint(15, 20)):
        n = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized(); planes.append((n, rng.uniform(.50, .68)))
    for v in bm.verts:
        p = v.co.copy()
        for n, off in planes:
            d = p.dot(n) - off
            if d > 0: p -= n * d
        v.co = Vector((p.x * sx, p.y * sy, p.z * sz))
    rm = math.sqrt(sum(v.co.length_squared for v in bm.verts) / len(bm.verts))
    for v in bm.verts: v.co /= rm * 1.12
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    sharp = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(18)]
    try: bmesh.ops.bevel(bm, geom=sharp, offset=.009, segments=1, affect='EDGES', profile=.5)
    except Exception as ex: print('[scale] bevel', ex)
    for f in bm.faces: f.smooth = False
    return bm

def stone(seed, nominal, x):
    """a fractured stone of the given nominal size (its middle dimension), resting on its most stable face, centre at x"""
    bm = make_rock(seed)
    pts = [v.co.copy() for v in bm.verts]
    rr = random.Random(seed * 7 + 1); best = None
    for _ in range(160):
        R = Matrix.Rotation(rr.uniform(0, 6.283), 3, 'X') @ Matrix.Rotation(rr.uniform(0, 6.283), 3, 'Y') @ Matrix.Rotation(rr.uniform(0, 6.283), 3, 'Z')
        zs = [(R @ p).z for p in pts]; low = min(zs); com = sum(zs) / len(zs) - low
        near = [i for i, z in enumerate(zs) if z - low < .035]                 # vertices touching the floor: a wide footprint is stable
        if len(near) < 3: continue
        xs_ = [(R @ pts[i]).x for i in near]; ys_ = [(R @ pts[i]).y for i in near]
        span = (max(xs_) - min(xs_)) * (max(ys_) - min(ys_))
        sc = com - .6 * span
        if best is None or sc < best[0]: best = (sc, R)
    R = best[1]
    for v in bm.verts: v.co = R @ v.co
    dims = sorted([max(v.co[i] for v in bm.verts) - min(v.co[i] for v in bm.verts) for i in range(3)])
    s = nominal / ((dims[0] + dims[1] + dims[2]) / 3)      # the mean of the three dimensions is the nominal size
    zmin = min(v.co.z for v in bm.verts)
    for v in bm.verts: v.co = Vector((v.co.x * s, v.co.y * s, (v.co.z - zmin) * s)) * U
    me = bpy.data.meshes.new('st%d' % seed); bm.to_mesh(me); bm.free(); me.materials.append(STONE)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co / (nominal * U) * 1.0; u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z))
            lp[uvl].uv = (u * .36 + (.137 * f.index) % 1, v * .36 + .31 * (f.index % 7) / 7)
    b2.to_mesh(me); b2.free()
    ob = bpy.data.objects.new('stone%g' % nominal, me); scene.collection.objects.link(ob); ob.location = Vector((x * U, 0, 0))
    for p in ob.data.polygons: p.use_smooth = False
    return ob

def heap(cx):
    """a sand heap at its angle of repose (33 deg), ragged skirt, fine ripple; grid in mm"""
    rng = np.random.default_rng(3); n = 220 if QUICK else 340; Rb = 50.0; ext = 64.0
    nz = pnoise(rng, 512, 2.4)[:n + 1, :n + 1]; nz2 = pnoise(rng, 512, 1.6)[:n + 1, :n + 1]
    bm = bmesh.new(); grid = {}
    th_noise = [rng.normal(0, 1) for _ in range(6)]; ph = [rng.uniform(0, 6.3) for _ in range(6)]
    for i in range(n + 1):
        for j in range(n + 1):
            x = -ext + 2 * ext * i / n; z = -ext + 2 * ext * j / n
            th = math.atan2(z, x); Re = Rb * (1 + .09 * math.sin(2 * th + ph[0]) + .06 * math.sin(3 * th + ph[1]) + .04 * math.sin(5 * th + ph[2]))
            r = math.hypot(x, z * 1.0)
            t = max(0.0, 1 - (math.sqrt(r * r + 36.0) - 6.0) / Re)      # a softly rounded apex
            h = 33.0 / 52.0 * Re * (t ** 1.05) * (1 + .06 * nz2[i, j] * (1 - t * .3)) + .55 * nz[i, j] * min(1, t * 6) * min(1.0, (1 - t) * 3) * (1 if t > 0 else 0)
            h = max(0.0, h)
            grid[(i, j)] = bm.verts.new(Vector(((cx + x) * U, -z * U, h * U)))
    for i in range(n):
        for j in range(n):
            vs = [grid[(i, j)], grid[(i + 1, j)], grid[(i + 1, j + 1)], grid[(i, j + 1)]]
            if max(v.co.z for v in vs) <= 1e-9: continue
            bm.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('Heap'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('Heap', me); scene.collection.objects.link(ob)
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.materials.append(SAND)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        for lp in f.loops: c = lp.vert.co; lp[uvl].uv = ((c.x - cx * U) / .055, c.y / .055)       # top-down projection, 55 mm per tile
    b2.to_mesh(me); b2.free()
    # loose grains rolled out around the skirt
    gm = bmesh.new(); bmesh.ops.create_icosphere(gm, subdivisions=1, radius=1.0)
    gme = bpy.data.meshes.new('grain'); gm.to_mesh(gme); gm.free(); gme.materials.append(GRAIN)
    for p in gme.polygons: p.use_smooth = False
    rr = random.Random(9)
    for k in range(170 if not QUICK else 60):
        a = rr.uniform(0, 6.283); d = Rb * (1.0 + abs(rr.gauss(0, .16)))
        x = cx + d * math.cos(a); z = d * math.sin(a) * rr.uniform(.9, 1.0); r = rr.uniform(.28, .75)
        g = bpy.data.objects.new('g%03d' % k, gme); scene.collection.objects.link(g); g.location = V(x, r * .6, z)
        g.scale = (r * U, r * U * rr.uniform(.7, 1), r * U * rr.uniform(.8, 1.1)); g.rotation_euler = (rr.uniform(0, 6), rr.uniform(0, 6), rr.uniform(0, 6))
    return ob

# ---------------------------------------------------------------- scene
heap(-150)
stone(41, 4.75, -80); stone(43, 10.0, -54); stone(47, 20.0, -20); stone(50, 40.0, 28)

bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.2); me = bpy.data.meshes.new('Floor'); bm.to_mesh(me); bm.free()
floor = bpy.data.objects.new('Floor', me); scene.collection.objects.link(floor); floor.location = V(-70, -.02, 0); floor.is_shadow_catcher = True
def area(name, loc, w, h, energy, color=(1, 1, 1), look=(-70, 15, 0)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = V(*loc); ob.rotation_euler = (V(*look) - ob.location).to_track_quat('-Z', 'Y').to_euler(); return ob
area('Key', (-520, 640, 420), .30, .24, 130 * LK, (1.0, .985, .965))
area('Fill', (700, 380, 560), 1.2, .8, 22 * LK, (.95, .97, 1.0))
area('Top', (-60, 900, -120), 1.4, 1.0, 16 * LK)
world = bpy.data.worlds.new('W'); scene.world = world
try: world.use_nodes = True
except Exception: pass
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.93, .93, .94, 1); bg.inputs['Strength'].default_value = WK
try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
except Exception: scene.view_settings.view_transform = 'AgX'
scene.cycles.use_denoising = True; scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'

PITCH = math.radians(float(os.environ.get('PITCH', '16'))); cp, sp = math.cos(PITCH), math.sin(PITCH)
FW = 282.0; FH = FW / 3.3; XC = -71.0
cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = FW * U; cam.clip_start = .02; cam.clip_end = 10
co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
Ty = (0.20 * FH) / cp                       # the floor line (y = 0, z = 0) lands 20 % of the frame height below the centre
co.location = V(XC, Ty + 3000 * sp, 3000 * cp); co.rotation_euler = (math.radians(90) - PITCH, 0, 0)
W = 1100 if QUICK else 2400; scene.render.resolution_x = W; scene.render.resolution_y = int(W / 3.3); scene.render.resolution_percentage = 100
scene.cycles.samples = 64 if QUICK else 400
scene.render.filepath = os.path.join(OUT, 'scale.png'); bpy.ops.render.render(write_still=True)
print('[scale] done')
