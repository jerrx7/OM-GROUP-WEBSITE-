"""OM GROUP - Concrete Sand page, "Inside concrete" seven-factor widget: the cut face of concrete as three Blender stills.

  blender -b --factory-startup -P scripts/csx3d/build-csx.py -- <repo root> [--quick]
  needs _review/csx/layout.json (stone boxes and sand-grain circles of the old drawing: {"sand": [[cx, cy, r], ...], "stones": [{"cx","cy","w","h"}, ...]}, 440 x 250 units)

  _review/csx/base.png    the face as it is: fractured grey stones standing proud of a warm cement paste full of fine sand, 120 loose sand grains in the gaps
  _review/csx/sand.png    the same frame with the sand grains lit orange (factor 1, particle packing)
  _review/csx/paste.png   the same frame with the paste tinted warm orange (factor 4, paste demand)
Frame 440 x 250 units (1 unit = 1 mm of model), orthographic, straight down, key light low from the upper left so the stones throw shadows to the lower right.
Not to scale and not a measured result (the page says so).
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'csx'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
LAY = json.load(open(os.path.join(OUT, 'layout.json')))
U = 0.001; FW, FH = 440.0, 250.0
LK = float(os.environ.get('LK', '1.0')); WK = float(os.environ.get('WK', '0.35'))

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
                scene.cycles.device = 'GPU'; print('[csx] Cycles device:', kind); return
    except Exception as e: print('[csx] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()
def P(x, y, z=0.0): return Vector((x * U, (FH - y) * U, z * U))        # drawing units (x right, y down, origin top left) -> blender metres

# ---------------------------------------------------------------- textures
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
K = .4 if QUICK else 1.0

def paste_maps(N=1024, seed=71):
    """cement paste with the fine sand in it: warm light grey-tan, soft tonal drift, a dense scatter of sand specks (tan, quartz-white, grey, dark), pits (tile = 30 units)"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.60, .545, .46)
    alb *= (1 + .08 * pnoise(rng, N, 1.0) + .05 * pnoise(rng, N, .4))[..., None]; alb *= (1 + .10 * pnoise(rng, N, .14))[..., None]
    h = .45 * pnoise(rng, N, .9) + .3 * pnoise(rng, N, 1.6)
    cols = [np.array(c) for c in ((.78, .72, .60), (.86, .84, .78), (.50, .46, .40), (.30, .28, .25), (.68, .56, .40), (.56, .55, .52))]
    def grain(ix, m, d, col, lift):
        a = (m * .92)[..., None]; shade = (.84 + .3 * (1 - d))[..., None]; alb[ix] = alb[ix] * (1 - a) + col * shade * a; h[ix] += m * lift
    for _ in range(int(9000 * K)):
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2.6, 8.0), lambda ix, m, d, col=cols[rng.integers(len(cols))] * rng.uniform(.9, 1.1): grain(ix, m, d, col, rng.uniform(.3, 1.0)))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.8, 1.6) * c; alb[ix] *= (1 - .5 * m * c)[..., None]
    for _ in range(int(500 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2.5, 7), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .16, 1.0), np.clip(.86 + .06 * pnoise(rng, N, .6), .6, 1)

def stone_maps(N=1024, seed=5):
    """fractured grey stone: blue-grey matrix with a brown weathering drift, quartz / feldspar specks, near-black flecks, pits, a coarse crystalline relief"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.52, .51, .495)
    alb *= (1 + .16 * pnoise(rng, N, 1.2) + .09 * pnoise(rng, N, .5))[..., None]; alb *= (1 + .24 * pnoise(rng, N, .12))[..., None]
    drift = np.clip(pnoise(rng, N, .5), -2, 2); alb[..., 0] *= 1 + .06 * drift; alb[..., 2] *= 1 - .08 * drift
    h = .5 * pnoise(rng, N, 1.0) + .35 * pnoise(rng, N, .3) + .15 * pnoise(rng, N, 0.05)
    def fleck(ix, m, d, col, lift):
        a = (m * .92)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift * np.sqrt(np.clip(1 - d * d, 0, 1))
    for _ in range(int(3200 * K)):
        r = rng.uniform(1.0, 3.6) * (1.8 if rng.random() < .05 else 1); g = rng.uniform(.5, .8)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g * .99, g * .97]), rng.uniform(.2, .55)))
    for _ in range(int(2600 * K)):
        r = rng.uniform(1.4, 4.8); g = rng.uniform(.05, .13)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g, g * 1.04]), rng.uniform(.05, .25)))
    for _ in range(int(1000 * K)):
        def pit(ix, m, d): h[ix] -= m * rng.uniform(.6, 1.3) * np.sqrt(np.clip(1 - d * d, 0, 1)); alb[ix] *= (1 - .4 * m)[..., None]
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2.5, 8), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .12, 1.0), np.clip(.6 + .08 * pnoise(rng, N, .6), .35, .9)

NS = 512 if QUICK else 1024
def textured(name, maps, nstr, spec, tint_obj=None, mixname=None):
    a, n, r = maps
    ia = save_img(name + '_a', a, 'sRGB'); inn = save_img(name + '_n', n, 'Non-Color'); ir = save_img(name + '_r', r, 'Non-Color')
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N_, L_ = nt.nodes, nt.links; Pr = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img):
        t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t
    col = tex(ia).outputs['Color']
    if tint_obj:                                                          # per-object tone from the object's random number: lo..hi per channel
        oi = N_.new('ShaderNodeObjectInfo'); mp = N_.new('ShaderNodeMapRange'); mp.inputs['To Min'].default_value = tint_obj[0]; mp.inputs['To Max'].default_value = tint_obj[1]; L_.new(oi.outputs['Random'], mp.inputs['Value'])
        mt = N_.new('ShaderNodeMix'); mt.data_type = 'RGBA'; mt.blend_type = 'MULTIPLY'; mt.inputs['Factor'].default_value = 1.0; L_.new(col, mt.inputs[6]); L_.new(mp.outputs['Result'], mt.inputs[7]); col = mt.outputs[2]
    if mixname:                                                           # the highlight: multiply (or mix) a colour in, switched per render
        hm = N_.new('ShaderNodeMix'); hm.data_type = 'RGBA'; hm.blend_type = 'MIX'; hm.name = mixname; hm.inputs['Factor'].default_value = 0.0; hm.inputs[7].default_value = (1, .3, .08, 1)
        L_.new(col, hm.inputs[6]); col = hm.outputs[2]
    L_.new(col, Pr.inputs['Base Color']); L_.new(tex(ir).outputs['Color'], Pr.inputs['Roughness'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L_.new(tex(inn).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], Pr.inputs['Normal'])
    try: Pr.inputs['Specular IOR Level'].default_value = spec
    except Exception: pass
    return m

PASTE = textured('Paste', paste_maps(NS), 1.6, .3, None, 'hiP')
STONE = textured('Stone', stone_maps(NS), 1.3, .5, (.62, 1.18), None)
GRAIN = textured('Grain', paste_maps(NS, 99), 1.2, .45, (.85, 1.3), 'hiG')

# ---------------------------------------------------------------- geometry
def make_rock(seed, mat, sub, planes, lo, hi):
    rng = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    sx, sy, sz = rng.uniform(1.0, 1.25), rng.uniform(.8, 1.0), rng.uniform(.85, 1.1); pl = []
    for _ in range(rng.randint(*planes)):
        n = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized(); pl.append((n, rng.uniform(lo, hi)))
    for v in bm.verts:
        p = v.co.copy()
        for n, off in pl:
            d = p.dot(n) - off
            if d > 0: p -= n * d
        v.co = Vector((p.x * sx, p.y * sy, p.z * sz))
    rm = math.sqrt(sum(v.co.length_squared for v in bm.verts) / len(bm.verts))
    for v in bm.verts: v.co /= rm * 1.1
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    if sub >= 3:
        sharp = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(18)]
        try: bmesh.ops.bevel(bm, geom=sharp, offset=.012, segments=1, affect='EDGES', profile=.5)
        except Exception as ex: print('[csx] bevel', ex)
    for f in bm.faces: f.smooth = False
    me = bpy.data.meshes.new('rk%d' % seed); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co; u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z))
            lp[uvl].uv = (u * .36 + (.137 * f.index) % 1, v * .36 + .31 * (f.index % 7) / 7)
    b2.to_mesh(me); b2.free(); return me

def build():
    # the paste: a displaced sheet a little larger than the frame
    n = 150 if QUICK else 300; rng = np.random.default_rng(3); nz = pnoise(rng, 512, 1.6)[:n + 1, :n + 1]
    bm = bmesh.new(); X0, X1, Y0, Y1 = -20, FW + 20, -20, FH + 20; vs = {}
    for i in range(n + 1):
        for j in range(n + 1):
            x = X0 + (X1 - X0) * i / n; y = Y0 + (Y1 - Y0) * j / n; vs[(i, j)] = bm.verts.new(P(x, y, .5 * nz[i, j]))
    for i in range(n):
        for j in range(n): bm.faces.new((vs[(i, j)], vs[(i + 1, j)], vs[(i + 1, j + 1)], vs[(i, j + 1)]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('Paste'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('Paste', me); scene.collection.objects.link(ob); ob.data.materials.append(PASTE)
    for p in ob.data.polygons: p.use_smooth = True
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        for lp in f.loops: c = lp.vert.co; lp[uvl].uv = (c.x / (30 * U), c.y / (30 * U))
    b2.to_mesh(me); b2.free()
    rr = random.Random(11); rocks = [make_rock(300 + s, STONE, 3, (15, 21), .46, .64) for s in range(7)]
    stones = LAY['stones']
    for i, s in enumerate(stones):
        o = bpy.data.objects.new('stone%d' % i, rocks[i % len(rocks)]); scene.collection.objects.link(o)
        sx = sy = (s['w'] + s['h']) / 4 * 1.16; sx *= rr.uniform(.92, 1.1); sy *= rr.uniform(.9, 1.05); t = min(sx, sy) * .85                           # the stone's half-height: it stands about half out of the paste
        o.scale = (sx * U, sy * U, t * U); o.rotation_euler = (rr.uniform(-.18, .18), rr.uniform(-.18, .18), rr.uniform(0, 6.28)); o.location = P(s['cx'], s['cy'], -t * .22)
    gm = [make_rock(900 + k, GRAIN, 2, (5, 8), .5, .72) for k in range(10)]
    placed = 0
    for k, (cx, cy, r) in enumerate(LAY['sand']):
        if any(abs(cx - s['cx']) < s['w'] / 2 * .98 + r and abs(cy - s['cy']) < s['h'] / 2 * .98 + r and ((cx - s['cx']) / (s['w'] / 2 + r)) ** 2 + ((cy - s['cy']) / (s['h'] / 2 + r)) ** 2 < 1.0 for s in stones): continue
        o = bpy.data.objects.new('g%03d' % k, gm[k % len(gm)]); scene.collection.objects.link(o); rg = r * 2.1 * rr.uniform(.9, 1.3)
        o.scale = (rg * U, rg * U * rr.uniform(.8, 1.0), rg * U * rr.uniform(.75, 1.0)); o.rotation_euler = (rr.uniform(0, 6), rr.uniform(0, 6), rr.uniform(0, 6)); o.location = P(cx, cy, rg * .2); placed += 1
    print('[csx] stones', len(stones), 'grains', placed)

build()
# light: a low key from the upper left (shadows fall to the lower right), a soft fill, a pale world
def sun(name, rot, energy, ang):
    ld = bpy.data.lights.new(name, 'SUN'); ld.energy = energy; ld.angle = math.radians(ang); ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.rotation_euler = rot
sun('Key', (math.radians(48), math.radians(10), math.radians(-32)), 3.6 * LK, 4.5)
sun('Fill', (math.radians(20), math.radians(-14), math.radians(40)), .6 * LK, 18)
world = bpy.data.worlds.new('W'); scene.world = world
try: world.use_nodes = True
except Exception: pass
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.93, .93, .94, 1); bg.inputs['Strength'].default_value = WK
try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
except Exception: scene.view_settings.view_transform = 'AgX'
scene.cycles.use_denoising = True; scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'
cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = FW * U; cam.clip_start = .01; cam.clip_end = 5
co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co; co.location = P(FW / 2, FH / 2, 800); co.rotation_euler = (0, 0, 0)
W = 880 if QUICK else 1760; scene.render.resolution_x = W; scene.render.resolution_y = int(W * FH / FW); scene.render.resolution_percentage = 100
scene.cycles.samples = 64 if QUICK else 320

def node(mat, name): return mat.node_tree.nodes[name]
def render(name, hiG, hiP):
    gm_, pm_ = node(GRAIN, 'hiG'), node(PASTE, 'hiP')
    gm_.inputs['Factor'].default_value = hiG; gm_.inputs[7].default_value = (1.0, .36, .08, 1)
    pm_.inputs['Factor'].default_value = hiP * .36; pm_.inputs[7].default_value = (1.0, .5, .26, 1)
    scene.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True); print('[csx] rendered', name)
ONLY = os.environ.get('ONLY', '')
for nm_, a_, b_ in (('base', 0.0, 0.0), ('sand', .8, 0.0), ('paste', 0.0, 1.0)):
    if not ONLY or ONLY == nm_: render(nm_, a_, b_)
print('[csx] done')
