"""OM GROUP - Plaster Sand page, "Why plaster cracks" (10 causes) and "What can go wrong" (10 defects): 20 Blender stills of a plastered wall surface.

  blender -b --factory-startup -P scripts/wall3d/build-wall.py -- <repo root> [--quick]          (env ONLY = comma list of keys, e.g. ck:water,df:hair; default all)

  needs _review/wall_variants.json  per key: cracks [{f: fine?, pts: [[x, y], ...]}], bl (coarse grain blobs), dy (chalk dust specks), pw (powder specks), st (stain ellipses), op (an opening rect),
                                    sub2 (x of a second substrate), wt (a water drop position), tmLines (y of trowel sweeps) - all in the old drawing's 440 x 230 units (1 unit = 1 mm here)
  _review/wall3d/<key with : -> _>.png   1320 x 690 stills of the wall face seen straight on, a low sun raking from the upper left.
The surface is one unique texture set per image (albedo, roughness, normal) over a displaced grid; cracks are V-grooves rasterised from the old drawing's own paths, so the pictures stay faithful to what the page described.
Illustrations of patterns only: not a diagnosis and no cause is shown from a picture (the page says so).
"""
import bpy, bmesh, math, json, os, sys, zlib
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
ONLY = [k for k in os.environ.get('ONLY', '').split(',') if k]
OUT = os.path.join(ROOT, '_review', 'wall3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
VAR = json.load(open(os.path.join(ROOT, '_review', 'wall_variants.json')))
FW, FH = 440.0, 230.0; U = 0.001; PXU = 2.0 if QUICK else 3.0           # texture pixels per drawing unit
TW, TH = int(FW * PXU), int(FH * PXU)
K = .45 if QUICK else 1.0
LK = float(os.environ.get('LK', '1.0'))

def pnoise2(rng, H, W, beta):
    w = rng.standard_normal((H, W)); F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(H)[:, None]; fx = np.fft.rfftfreq(W)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1; F *= f ** (-beta); F[0, 0] = 0
    o = np.fft.irfft2(F, s=(H, W)); return (o - o.mean()) / (o.std() + 1e-9)
def streak2(rng, H, W, ax, ay):
    w = rng.standard_normal((H, W)); F = np.fft.rfft2(w); fy = np.fft.fftfreq(H)[:, None]; fx = np.fft.rfftfreq(W)[None, :]
    F *= np.exp(-((fx * ax) ** 2 + (fy * ay) ** 2)); o = np.fft.irfft2(F, s=(H, W)); return (o - o.mean()) / (o.std() + 1e-9)
def blur(a, s):
    F = np.fft.rfft2(a); fy = np.fft.fftfreq(a.shape[0])[:, None]; fx = np.fft.rfftfreq(a.shape[1])[None, :]
    return np.fft.irfft2(F * np.exp(-((fx * s) ** 2 + (fy * s) ** 2) * 2 * math.pi ** 2), s=a.shape)
def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2; dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2
    n = np.dstack([-dx * strength, dy * strength, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True); return n * 0.5 + 0.5     # image y runs down: flip so +v is up
def save_img(name, arr, cs):
    Hh = arr.shape[0]
    if arr.ndim == 2: arr = np.dstack([arr, arr, arr])
    arr = arr[::-1]                                               # blender images start at the bottom row
    rgba = np.ones((Hh, arr.shape[1], 4), dtype=np.float32); rgba[..., :3] = arr
    img = bpy.data.images.new(name, arr.shape[1], Hh, alpha=False); img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'; img.save(); img.colorspace_settings.name = cs; return img
def stamp_fn(rng, H, W):
    def stamp(cx, cy, r, fn):
        R = int(math.ceil(r * 1.4 + 2)); xs = np.arange(int(cx) - R, int(cx) + R + 1); ys = np.arange(int(cy) - R, int(cy) + R + 1)
        xs = xs[(xs >= 0) & (xs < W)]; ys = ys[(ys >= 0) & (ys < H)]
        if len(xs) == 0 or len(ys) == 0: return
        X, Y = np.meshgrid(xs + .5 - cx, ys + .5 - cy); a = rng.uniform(0, 3.14); u = X * math.cos(a) + Y * math.sin(a); v = (-X * math.sin(a) + Y * math.cos(a)) * rng.uniform(.7, 1.4)
        th = np.arctan2(v, u); rr = r * (1 + .25 * np.sin(2 * th + rng.uniform(0, 6.3)) + .15 * np.sin(3 * th + rng.uniform(0, 6.3)))
        d = np.sqrt(u * u + v * v) / rr; m = np.clip((1 - d) * rr / 1.0, 0, 1)
        if m.max() > 0: fn(np.ix_(ys, xs), m, np.clip(d, 0, 1))
    return stamp

def seg_dist(X, Y, a, b):
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy + 1e-9
    t = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1); return np.hypot(X - (ax + t * dx), Y - (ay + t * dy))
def crack_field(cracks, jitter_rng):
    """rasterise the crack paths: returns depth (0..1, 1 on the centre line), plus a distance field used for the dark rim"""
    D = np.full((TH, TW), 1e9, dtype=np.float32); Wd = np.zeros((TH, TW), dtype=np.float32)
    for c in cracks:
        pts = c['pts']; fine = c['f']; w = .55 if fine else 1.15                              # half-width in units
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]; pad = w + 4
            x0 = int(max(0, min(a[0], b[0]) - pad) * PXU); x1 = int(min(FW, max(a[0], b[0]) + pad) * PXU) + 1; y0 = int(max(0, min(a[1], b[1]) - pad) * PXU); y1 = int(min(FH, max(a[1], b[1]) + pad) * PXU) + 1
            x1 = min(x1, TW); y1 = min(y1, TH)
            if x1 <= x0 or y1 <= y0: continue
            Xs, Ys = np.meshgrid((np.arange(x0, x1) + .5) / PXU, (np.arange(y0, y1) + .5) / PXU)
            d = seg_dist(Xs, Ys, a, b); sub = D[y0:y1, x0:x1]; take = d < sub; sub[take] = d[take]; Wd[y0:y1, x0:x1][take] = w
    return D, Wd

NET = {'water': (52, 1.05, .85), 'prop': (62, .9, .75), 'rapid': (24, .5, .8), 'curing': (19, .45, .85), 'crazing': (11, .4, .92), 'hair': (66, .5, .55), 'thick': (74, .9, .5), 'grading': (84, .7, .35), 'ceil': (80, .6, .3)}
def chaikin(pts, n=2):
    for _ in range(n):
        out = [pts[0]]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]; out += [[.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]]
        out.append(pts[-1]); pts = out
    return pts
def meander(pts, rng):
    out = []; ph = rng.uniform(0, 6.3)
    for i, p in enumerate(pts):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) + 1e-9
        o = 1.1 * math.sin(i * .9 + ph) + rng.normal(0, .35); out.append([p[0] - dy / L * o, p[1] + dx / L * o])
    return out
def voronoi_cracks(rng, cell, wid, cov):
    """a domain-warped Voronoi edge network: returns (inner, rim) fields like crack_field; some edges are missing (cov = share kept)"""
    yy, xx = (np.mgrid[0:TH, 0:TW] + .5) / PXU
    k = (cell / 50.0) ** .5 * 3
    wx = xx + 7 * blur(pnoise2(rng, TH, TW, 1.6), 5) * k; wy = yy + 7 * blur(pnoise2(rng, TH, TW, 1.6), 5) * k
    gx, gy = int(FW / cell) + 5, int(FH / cell) + 5
    sx = (np.arange(gx)[None, :] + rng.uniform(.15, .85, (gy, gx))) * cell - 2 * cell; sy = (np.arange(gy)[:, None] + rng.uniform(.15, .85, (gy, gx))) * cell - 2 * cell
    ci = np.clip(((wx + 2 * cell) / cell).astype(int), 1, gx - 2); cj = np.clip(((wy + 2 * cell) / cell).astype(int), 1, gy - 2)
    ds = []
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1): ds.append(np.hypot(wx - sx[cj + dj, ci + di], wy - sy[cj + dj, ci + di]))
    ds = np.sort(np.stack(ds), axis=0); e = (ds[1] - ds[0]) * .5                          # distance to the nearest cell edge
    keep = 1 / (1 + np.exp(-(blur(pnoise2(rng, TH, TW, 1.3), 3) * 3.0 + (cov - .5) * 5)))
    w = wid * (.55 + .9 * np.clip(blur(pnoise2(rng, TH, TW, 1.1), 3) * .8 + .5, 0, 1)) * keep
    inner = np.clip(1 - e / np.maximum(w, .05), 0, 1) * (keep > .25); rim = np.clip(1 - e / (w * 3.4 + .7), 0, 1) * keep
    return inner.astype(np.float32), rim.astype(np.float32)

def make_maps(key, v):
    rng = np.random.default_rng(zlib.crc32(key.encode())); H, W = TH, TW; stamp = stamp_fn(rng, H, W)
    kind = key.split(':')[1]
    base = {'rapid': (.84, .81, .76), 'curing': (.85, .82, .78), 'powder': (.88, .86, .83), 'stain': (.82, .79, .74)}.get(kind, (.80, .77, .72))
    alb = np.empty((H, W, 3)); alb[:] = base
    alb *= (1 + .05 * pnoise2(rng, H, W, 1.0) + .035 * pnoise2(rng, H, W, .35))[..., None]
    sweeps = streak2(rng, H, W, 26 * 1024 / W, 10 * 1024 / H) * .6 + .4 * pnoise2(rng, H, W, 1.6)
    alb *= (1 + .035 * sweeps)[..., None]
    h = .6 * blur(sweeps, 2) + .25 * pnoise2(rng, H, W, .8)                                   # mm-ish units before scaling
    macro = 1.3 * blur(pnoise2(rng, H, W, 1.8), 6)                                             # soft waviness of the plaster face
    rough_base = .9
    cols = [np.array(c) for c in ((.88, .83, .73), (.62, .57, .5), (.78, .66, .5), (.68, .63, .56), (.93, .9, .83))]
    def grain(ix, m, d, col, lift):
        a = (m * .85)[..., None]; shade = (.86 + .26 * (1 - d))[..., None]; alb[ix] = alb[ix] * (1 - a) + col * shade * a; h[ix] += m * lift
    n_gr = int(60000 * K) if kind != 'rough' else int(26000 * K)
    gr_lo, gr_hi = (.35 * PXU, 1.05 * PXU)
    if kind == 'rough': gr_lo, gr_hi = (.7 * PXU, 2.2 * PXU)
    for _ in range(n_gr): stamp(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(gr_lo, gr_hi), lambda ix, m, d, col=cols[rng.integers(5)] * rng.uniform(.92, 1.08): grain(ix, m, d, col, rng.uniform(.3, .9)))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.7, 1.6) * c; alb[ix] *= (1 - .42 * m * c)[..., None]
    for _ in range(int(900 * K)): stamp(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(.5, 1.6) * PXU, pit)
    # feature layers
    for (cx, cy, r) in v['bl']:                                                              # coarse aggregate showing / rough lumps
        stamp(cx * PXU, cy * PXU, r * PXU * (1.2 if kind == 'grading' else .9), lambda ix, m, d: (grain(ix, m, d, np.array([.55, .5, .44]) * rng.uniform(.85, 1.1), 1.4)))
    for (cx, cy, r) in v['dy']:                                                              # chalky dust specks
        stamp(cx * PXU, cy * PXU, r * PXU * 1.4, lambda ix, m, d: (alb.__setitem__(ix, alb[ix] * (1 - .5 * m[..., None]) + np.array([.95, .93, .88]) * .5 * m[..., None])))
    for (cx, cy, r) in v['pw']:                                                              # powdery surface: loose pale dust
        stamp(cx * PXU, cy * PXU, r * PXU * 1.6, lambda ix, m, d: (alb.__setitem__(ix, alb[ix] * (1 - .6 * m[..., None]) + np.array([.97, .96, .93]) * .6 * m[..., None])))
    yy, xx = (np.mgrid[0:H, 0:W] + .5) / PXU
    for (cx, cy, rx, ry) in v['st']:                                                         # tonal stains
        e = np.exp(-(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) * 1.6) * (.7 + .3 * pnoise2(rng, H, W, 1.2))
        alb *= (1 - .26 * e)[..., None] * np.array([1, .96, .9])[None, None, :] + (e * 0)[..., None]
    for ly in v['tmLines']:                                                                  # trowel sweeps (or a wavy surface when the drawing was a guide check)
        amp = 7.0 if kind == 'work' else 17.0; per = 240.0 if kind == 'work' else 440.0
        yc = ly - amp * np.sin(2 * math.pi * xx / per) * (1 if kind == 'work' else .55)
        if kind == 'work':
            d = np.abs(yy - yc); h += 4.5 * np.exp(-(d / 3.6) ** 2); alb *= (1 - .08 * np.exp(-(d / 3.6) ** 2))[..., None]
        else: macro += 4.0 * np.exp(-((yy - yc) / 24.0) ** 2)
    if v['wt']:                                                                              # a wet, darker streak below the drop
        wx, wy = v['wt']; e = np.exp(-(((xx - wx) / 34) ** 2 + ((yy - wy - 40) / 70) ** 2)); alb *= (1 - .22 * e)[..., None]
    if v['sub2']:                                                                            # a second substrate on the right: a slightly cooler, smoother face
        edge = 1 / (1 + np.exp(-(xx - v['sub2']) / .8)); alb *= (1 - .06 * edge)[..., None] * np.array([.98, 1.0, 1.03])[None, None, :]; h -= .5 * edge
    # cracks: V-grooves
    inner = np.zeros((H, W), dtype=np.float32); rim = np.zeros((H, W), dtype=np.float32)
    if kind in NET:
        cell, wid, cov = NET[kind]; i2, r2 = voronoi_cracks(rng, cell, wid, cov); inner = np.maximum(inner, i2); rim = np.maximum(rim, r2)
    if v['cracks'] and kind not in ('water', 'prop', 'rapid', 'curing', 'crazing', 'hair'):
        cr = [{'f': c['f'], 'pts': meander(chaikin(c['pts'], 2), rng)} for c in v['cracks'] if len(c['pts']) > 1]
        Dd, Wd = crack_field(cr, rng); i3 = np.clip(1 - Dd / np.maximum(Wd * .9, .3), 0, 1); r3 = np.clip(1 - Dd / (Wd * 3.2 + .8), 0, 1)
        inner = np.maximum(inner, i3); rim = np.maximum(rim, r3)
    if inner.max() > 0:
        h -= 4.6 * inner ** .7 + .8 * rim ** 2
        alb *= ((1 - .5 * inner ** .7 - .1 * rim)[..., None]) * np.array([1, .97, .94])[None, None, :]
        macro -= .3 * blur(rim, 2)
    rough = np.clip(rough_base + .05 * pnoise2(rng, H, W, .6) - (0 if kind != 'water' else 0), .55, 1)
    if kind == 'powder': rough = np.clip(rough + .06, .6, 1)
    if kind == 'curing': alb *= (1 + .03 * pnoise2(rng, H, W, .4))[..., None]
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
                scene.cycles.device = 'GPU'; print('[wall] Cycles device:', kind); return
    except Exception as e: print('[wall] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()

def build(key):
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    for m in list(bpy.data.images): bpy.data.images.remove(m)
    v = VAR[key]; kind = key.split(':')[1]; tag = key.replace(':', '_')
    alb, h, macro, rough = make_maps(key, v)
    ia = save_img(tag + '_a', alb, 'sRGB'); inn = save_img(tag + '_n', normal_from_height(h * .09, 1.0), 'Non-Color'); ir = save_img(tag + '_r', rough, 'Non-Color')
    m = bpy.data.materials.new('Wall')
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N_, L_ = nt.nodes, nt.links; Pr = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uvn = N_.new('ShaderNodeUVMap'); uvn.uv_map = 'UVMap'
    def tex(img):
        t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; t.extension = 'EXTEND'; L_.new(uvn.outputs['UV'], t.inputs['Vector']); return t
    L_.new(tex(ia).outputs['Color'], Pr.inputs['Base Color']); L_.new(tex(ir).outputs['Color'], Pr.inputs['Roughness'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0; L_.new(tex(inn).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], Pr.inputs['Normal'])
    try: Pr.inputs['Specular IOR Level'].default_value = .3
    except Exception: pass
    # the displaced grid: the soft waviness of the face, crack grooves and, where the drawing had one, the opening
    nx, ny = (330, 173) if QUICK else (660, 345)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); vs = {}
    op = v['op']
    for i in range(nx + 1):
        for j in range(ny + 1):
            u = i / nx; w = j / ny; x = u * FW; y = w * FH                                   # y runs down in the drawing
            px = min(TW - 1, int(u * TW)); py = min(TH - 1, int(w * TH))
            z = macro[py, px] * .6 + h[py, px] * .35
            if op:
                ox, oy, ow, oh = op; dx = min(x - ox, ox + ow - x); dy = min(y - oy, oy + oh - y)
                if dx > 0 and dy > 0: z -= 7.0 * min(1.0, min(dx, dy) / 1.5)                   # a recessed opening with a reveal
            vs[(i, j)] = bm.verts.new(Vector((x * U, (FH - y) * U, z * U)))
    for i in range(nx):
        for j in range(ny):
            f = bm.faces.new((vs[(i, j)], vs[(i + 1, j)], vs[(i + 1, j + 1)], vs[(i, j + 1)]))
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x / (FW * U), lp.vert.co.y / (FH * U))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('Wall'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('Wall', me); scene.collection.objects.link(ob); ob.data.materials.append(m)
    for p in ob.data.polygons: p.use_smooth = True
    # a drop of water (excessive mixing water)
    if v['wt']:
        wx, wy = v['wt']; gm = bpy.data.materials.new('Water'); gm.use_nodes = True
        gp = next(n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); gp.inputs['Roughness'].default_value = 0.0
        for nm_, val in (('Transmission Weight', 1.0), ('IOR', 1.33)):
            try: gp.inputs[nm_].default_value = val
            except Exception: pass
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1.0)
        for vv in bm.verts:
            q = vv.co.copy(); vv.co = Vector((q.x * 8.0, q.y * 14.0 + (q.y > 0) * 5.0 * q.y, q.z * 5.0))        # a teardrop in the wall plane: round below, drawn out above (y = up the wall, z = out of it)
        me2 = bpy.data.meshes.new('drop'); bm.to_mesh(me2); bm.free(); for_p = me2.polygons
        for p in for_p: p.use_smooth = True
        me2.materials.append(gm); d = bpy.data.objects.new('Drop', me2); scene.collection.objects.link(d)
        d.scale = (U, U, U); d.location = Vector((wx * U, (FH - wy) * U, 3.0 * U))
    # light: a low sun from the upper left; some views add a shadow band from a card above the wall (like a window frame)
    def sun(name, rot, energy, ang, col=(1, 1, 1)):
        ld = bpy.data.lights.new(name, 'SUN'); ld.energy = energy; ld.angle = math.radians(ang); ld.color = col; o = bpy.data.objects.new(name, ld); scene.collection.objects.link(o); o.rotation_euler = rot; return o
    el = {'rapid': 24, 'hair': 28, 'uneven': 22, 'work': 28, 'hollow': 38, 'debond': 30, 'ceil': 34}.get(kind, 33)
    sun('Key', (math.radians(90 - el), 0, math.radians(-50)), 3.3 * LK, 1.6 if kind in ('rapid', 'hair') else 3.5, (1.0, .96, .9)); sun('Fill', (math.radians(25), math.radians(8), math.radians(60)), .5 * LK, 25, (.92, .95, 1.0))
    if kind in ('rapid', 'hair'):                                                            # the diagonal light/shadow band of a window
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); me3 = bpy.data.meshes.new('Card'); bm.to_mesh(me3); bm.free()
        c = bpy.data.objects.new('Card', me3); scene.collection.objects.link(c); c.visible_camera = False; c.scale = (160 * U, 640 * U, 3 * U); c.rotation_euler = (0, 0, math.radians(38)); c.location = Vector((FW * (.82 if kind == 'hair' else .12) * U, FH * .5 * U, 70 * U))
    wd = bpy.data.worlds.new('W'); scene.world = wd
    try: wd.use_nodes = True
    except Exception: pass
    bg = next(n for n in wd.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.9, .9, .92, 1); bg.inputs['Strength'].default_value = .35
    try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception: scene.view_settings.view_transform = 'AgX'
    cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = FW * U; cam.clip_start = .01; cam.clip_end = 5
    co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co; co.location = Vector((FW / 2 * U, FH / 2 * U, .6)); co.rotation_euler = (0, 0, 0)
    W = 660 if QUICK else 1320; scene.render.resolution_x = W; scene.render.resolution_y = int(round(W * FH / FW)); scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'; scene.render.film_transparent = False
    scene.cycles.samples = 48 if QUICK else 256; scene.cycles.use_denoising = True
    scene.render.filepath = os.path.join(OUT, tag + '.png'); bpy.ops.render.render(write_still=True); print('[wall] rendered', key)

for k in (ONLY or list(VAR.keys())): build(k)
print('[wall] done')
