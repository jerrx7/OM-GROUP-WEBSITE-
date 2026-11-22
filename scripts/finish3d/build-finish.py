"""OM GROUP - Plaster Sand page, "Decorative and textured rendering": five macro stills of plaster finishes.

  blender -b --factory-startup -P scripts/finish3d/build-finish.py -- <repo root> [--quick]          (env FIN = plain | scraped | textured | deco | lime | all (default all))

  _review/finish3d/<finish>.png   1280 x 600 (320 x 150 mm of wall, seen straight on), a low sun raking from the upper left so the relief throws small shadows.
  The surface is a displaced grid (macro relief: float sweeps, scrape gouges, dabs, the two incised bands) with a baked albedo / roughness / normal set on top (sand grains, pits, pigment).
Not a measured result and not a specification: a drawn sample of each finish, as the page says.
"""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv; FIN = os.environ.get('FIN', 'all')
OUT = os.path.join(ROOT, '_review', 'finish3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
K = .4 if QUICK else 1.0; FW, FH, TILE = 320.0, 150.0, 135.0        # frame mm, texture tile mm
U = 0.001
LK = float(os.environ.get('LK', '1.0'))

def pnoise(rng, N, beta):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1; F *= f ** (-beta); F[0, 0] = 0
    o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)
def streak(rng, N, ax, ay):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w); fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    F *= np.exp(-((fx * ax) ** 2 + (fy * ay) ** 2)); o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)
def blur(a, s):
    F = np.fft.rfft2(a); fy = np.fft.fftfreq(a.shape[0])[:, None]; fx = np.fft.rfftfreq(a.shape[1])[None, :]
    return np.fft.irfft2(F * np.exp(-((fx * s) ** 2 + (fy * s) ** 2) * 2 * math.pi ** 2), s=a.shape)
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
        X, Y = np.meshgrid(xs + .5 - cx, ys + .5 - cy); a = rng.uniform(0, 3.14); u = X * math.cos(a) + Y * math.sin(a); v = (-X * math.sin(a) + Y * math.cos(a)) * rng.uniform(.7, 1.4)
        th = np.arctan2(v, u); rr = r * (1 + .25 * np.sin(2 * th + rng.uniform(0, 6.3)) + .15 * np.sin(3 * th + rng.uniform(0, 6.3)))
        d = np.sqrt(u * u + v * v) / rr; m = np.clip((1 - d) * rr / 1.0, 0, 1)
        if m.max() > 0: fn(np.ix_(ys % N, xs % N), m, np.clip(d, 0, 1))
    return stamp

SPEC = {   # base colour, macro amplitude (mm), micro normal strength, gloss, grains (count, radius lo, hi), pits
    'plain':    dict(base=(.69, .665, .62), amp=.7,  ns=1.1, rough=.92, grains=(14000, 1.6, 4.4), pits=(500, 2, 6)),
    'scraped':  dict(base=(.72, .68, .62), amp=1.5, ns=1.5, rough=.95, grains=(16000, 2.0, 7.5), pits=(900, 2, 8)),
    'textured': dict(base=(.64, .60, .54), amp=3.4, ns=1.2, rough=.96, grains=(12000, 1.8, 5.0), pits=(400, 2, 7)),
    'deco':     dict(base=(.80, .71, .58), amp=.9,  ns=1.0, rough=.88, grains=(11000, 1.5, 4.0), pits=(300, 2, 5)),
    'lime':     dict(base=(.80, .785, .74), amp=.35, ns=.8, rough=.82, grains=(9000, 1.2, 3.0), pits=(700, 1.5, 4)),
}

def maps(kind, N=1024):
    sp = SPEC[kind]; rng = np.random.default_rng({'plain': 61, 'scraped': 62, 'textured': 63, 'deco': 64, 'lime': 65}[kind]); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = sp['base']
    alb *= (1 + .06 * pnoise(rng, N, 1.0) + .04 * pnoise(rng, N, .35))[..., None]
    if kind == 'deco': alb *= (1 + .05 * pnoise(rng, N, .25))[..., None]
    # macro relief
    if kind == 'plain':
        macro = .9 * streak(rng, N, 22, 9) + .5 * pnoise(rng, N, 1.6)
        macro = blur(macro, 2)
    elif kind == 'scraped':
        gouge = streak(rng, N, 2.5, 110); gouge2 = streak(rng, N, 18, 60)
        macro = .9 * gouge + .35 * gouge2 + .5 * pnoise(rng, N, 1.5); macro = np.where(macro > .3, macro * 1.25, macro * .8)
    elif kind == 'textured':
        macro = np.zeros((N, N))
        def dab(ix, m, d, hgt): macro[ix] += (m / m.max()) ** .6 * hgt * (1 - .5 * d)
        for _ in range(int(700 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(26, 62), lambda ix, m, d, h=rng.uniform(.6, 1.2): dab(ix, m, d, h))
        macro = macro / (macro.max() + 1e-9) * 2.0 + .3 * pnoise(rng, N, 1.3); macro = blur(macro, 1.2)
    elif kind == 'deco':
        macro = blur(.6 * pnoise(rng, N, 1.8) + .5 * streak(rng, N, 30, 24), 1.5)
    else:
        macro = blur(.5 * streak(rng, N, 18, 18) + .5 * pnoise(rng, N, 1.9), 3)
    macro = (macro - macro.mean()) / (macro.std() + 1e-9)
    h = macro * .5 + .25 * pnoise(rng, N, .8)
    # grains, pits
    cols = [np.array(c) for c in ((.88, .83, .72), (.42, .37, .31), (.74, .62, .46), (.55, .52, .47), (.94, .9, .82))]
    def grain(ix, m, d, col, lift):
        a = (m * .85)[..., None]; shade = (.86 + .26 * (1 - d))[..., None]; alb[ix] = alb[ix] * (1 - a) + col * shade * a; h[ix] += m * lift
    n, lo, hi = sp['grains']
    for _ in range(int(n * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(lo, hi), lambda ix, m, d, col=cols[rng.integers(5)] * rng.uniform(.92, 1.08): grain(ix, m, d, col, rng.uniform(.3, .9)))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.7, 1.6) * c; alb[ix] *= (1 - .45 * m * c)[..., None]
    n, lo, hi = sp['pits']
    for _ in range(int(n * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(lo, hi), pit)
    if kind == 'lime':                                                  # a few hairline shrinkage cracks, faint
        for _ in range(int(14 * K)):
            x, y = rng.uniform(0, N), rng.uniform(0, N); a = rng.uniform(0, 6.3)
            for s in range(int(rng.uniform(60, 220))):
                a += rng.normal(0, .18); x += math.cos(a) * 1.6; y += math.sin(a) * 1.6; xi, yi = int(x) % N, int(y) % N
                h[yi, xi] -= .8; alb[yi, xi] *= .86
    rough = np.clip(sp['rough'] + .05 * pnoise(rng, N, .6), .5, 1)
    return np.clip(alb, 0, 1), h, macro, rough

# ---------------------------------------------------------------- scene
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
                scene.cycles.device = 'GPU'; print('[fin] Cycles device:', kind); return
    except Exception as e: print('[fin] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()

def build(kind):
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    sp = SPEC[kind]; alb, h, macro, rough = maps(kind, 512 if QUICK else 1024); N = alb.shape[0]
    ia = save_img(kind + '_a', alb, 'sRGB'); inn = save_img(kind + '_n', normal_from_height(h * .09 * sp['ns'], 1.0), 'Non-Color'); ir = save_img(kind + '_r', rough, 'Non-Color')
    m = bpy.data.materials.new('Plaster')
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N_, L_ = nt.nodes, nt.links; Pr = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uvn = N_.new('ShaderNodeUVMap'); uvn.uv_map = 'UVMap'
    def tex(img):
        t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uvn.outputs['UV'], t.inputs['Vector']); return t
    L_.new(tex(ia).outputs['Color'], Pr.inputs['Base Color']); L_.new(tex(ir).outputs['Color'], Pr.inputs['Roughness'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0; L_.new(tex(inn).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], Pr.inputs['Normal'])
    try: Pr.inputs['Specular IOR Level'].default_value = .3
    except Exception: pass
    # the displaced grid: macro relief sampled from the baked map, tiled across the frame; the deco bands are cut into it
    nx, ny = (320, 150) if QUICK else (640, 300); PAD = 6.0
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); vs = {}
    for i in range(nx + 1):
        for j in range(ny + 1):
            x = -PAD + (FW + 2 * PAD) * i / nx; y = -PAD + (FH + 2 * PAD) * j / ny
            u = x / TILE; v = y / TILE; iu = int((u % 1) * N) % N; iv = int((v % 1) * N) % N
            z = macro[iv, iu] * sp['amp'] * .5
            if kind == 'deco':
                for gy in (FH / 3, 2 * FH / 3):
                    d = abs(y - gy); z -= 2.4 * max(0.0, 1 - max(0.0, d - 1.6) / 1.4) if d < 3.0 else 0.0
                    z += .5 * max(0.0, 1 - abs(d - 4.4) / 1.4)           # a small raised lip beside each groove
            vs[(i, j)] = bm.verts.new(Vector((x * U, y * U, z * U)))
    for i in range(nx):
        for j in range(ny):
            f = bm.faces.new((vs[(i, j)], vs[(i + 1, j)], vs[(i + 1, j + 1)], vs[(i, j + 1)]))
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x / (TILE * U), lp.vert.co.y / (TILE * U))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('Wall'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('Wall', me); scene.collection.objects.link(ob); ob.data.materials.append(m)
    for p in ob.data.polygons: p.use_smooth = True
    # a low sun from the upper left rakes the relief; a soft fill from the other side
    def sun(name, rot, energy, ang, col=(1, 1, 1)):
        ld = bpy.data.lights.new(name, 'SUN'); ld.energy = energy; ld.angle = math.radians(ang); ld.color = col; o = bpy.data.objects.new(name, ld); scene.collection.objects.link(o); o.rotation_euler = rot
    el = {'plain': 38, 'scraped': 30, 'textured': 34, 'deco': 36, 'lime': 42}[kind]
    sun('Key', (math.radians(90 - el), 0, math.radians(-52)), 3.4 * LK, 3.5, (1.0, .96, .9)); sun('Fill', (math.radians(25), math.radians(8), math.radians(60)), .5 * LK, 25, (.92, .95, 1.0))
    wd = bpy.data.worlds.new('W'); scene.world = wd
    try: wd.use_nodes = True
    except Exception: pass
    bg = next(n for n in wd.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.9, .9, .92, 1); bg.inputs['Strength'].default_value = .35
    try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception: scene.view_settings.view_transform = 'AgX'
    cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = FW * U; cam.clip_start = .01; cam.clip_end = 5
    co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co; co.location = Vector((FW / 2 * U, FH / 2 * U, .5)); co.rotation_euler = (0, 0, 0)
    W = 640 if QUICK else 1600; scene.render.resolution_x = W; scene.render.resolution_y = int(W * FH / FW); scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'; scene.render.film_transparent = False
    scene.cycles.samples = 48 if QUICK else 256; scene.cycles.use_denoising = True
    scene.render.filepath = os.path.join(OUT, kind + '.png'); bpy.ops.render.render(write_still=True); print('[fin] rendered', kind)

for k in (SPEC if FIN == 'all' else [FIN]): build(k)
print('[fin] done')
