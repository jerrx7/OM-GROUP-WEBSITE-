"""OM GROUP - River Sand page, "Other uses depend on the specification": two Blender stills.

  blender -b --factory-startup -P scripts/rsand3d/build-rsand.py -- <repo root> [--quick]          (env MODE = screed | trench | all (default all))

  _review/rsand3d/screed.png  a floor build-up: marble tile finish on grout, a sand-cement screed, the structural concrete slab (cut section, exposed aggregate),
                              transparent background with a soft floor shadow (the page's drafting-paper stage shows through). Frame 2.9 : 1.
  _review/rsand3d/trench.png  a trench cross-section looking along the pipe: clodded soil walls, a rounded-pebble filter zone, a concrete pipe with a dark bore. 16 : 9, opaque.
Drawings only: no recommended material or thickness (the page says so).
"""
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv; MODE = os.environ.get('MODE', 'all')
OUT = os.path.join(ROOT, '_review', 'rsand3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
U = 0.001
LK = float(os.environ.get('LK', '0.5')); WK = float(os.environ.get('WK', '0.30'))

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
                scene.cycles.device = 'GPU'; print('[rsand] Cycles device:', kind); return
    except Exception as e: print('[rsand] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()
def V(x, y, z): return Vector((x * U, -z * U, y * U))     # figure units (x right, y up, z toward the viewer, mm) -> blender metres

# ---------------------------------------------------------------- texture helpers
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
        X, Y = np.meshgrid(xs + .5 - cx, ys + .5 - cy); a = rng.uniform(0, 3.14); u = X * math.cos(a) + Y * math.sin(a); v = (-X * math.sin(a) + Y * math.cos(a)) * rng.uniform(.7, 1.4)
        th = np.arctan2(v, u); rr = r * (1 + .25 * np.sin(2 * th + rng.uniform(0, 6.3)) + .15 * np.sin(3 * th + rng.uniform(0, 6.3)))
        d = np.sqrt(u * u + v * v) / rr; m = np.clip((1 - d) * rr / 1.0, 0, 1)
        if m.max() > 0: fn(np.ix_(ys % N, xs % N), m, np.clip(d, 0, 1))
    return stamp
K = .35 if QUICK else 1.0

def slab_maps(N=1024, seed=41):
    """structural concrete, cut face: cement paste with many angular grey / tan / blue-grey aggregate stones (dark rims), air pits, sand specks"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.36, .35, .335)
    alb *= (1 + .10 * pnoise(rng, N, 1.1) + .05 * pnoise(rng, N, .45))[..., None]; alb *= (1 + .12 * pnoise(rng, N, .15))[..., None]
    h = .35 * pnoise(rng, N, .7) + .25 * pnoise(rng, N, 1.3)
    pal = [(.30, .31, .32), (.38, .385, .39), (.44, .43, .41), (.47, .44, .39), (.25, .255, .265), (.52, .50, .47), (.40, .37, .33)]
    def agg(ix, m, d, col):
        a = np.clip(m * 1.4, 0, 1)[..., None]; shade = (.82 + .30 * (1 - d))[..., None]
        alb[ix] = alb[ix] * (1 - a) + (col * shade) * a
        rim = (np.clip((d - .78) / .22, 0, 1) * m)[..., None]; alb[ix] *= (1 - .34 * rim)
        h[ix] += m * (.9 + .6 * (1 - d * d))
    for _ in range(int(900 * K)):
        col = np.array(pal[rng.integers(len(pal))]) * rng.uniform(.88, 1.12)
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(6, 17), lambda ix, m, d, col=col: agg(ix, m, d, col))
    for _ in range(int(2600 * K)):
        col = np.array(pal[rng.integers(len(pal))]) * rng.uniform(.9, 1.1)
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2.2, 6), lambda ix, m, d, col=col: agg(ix, m, d, col))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(1.0, 2.0) * c; alb[ix] *= (1 - .55 * m * c)[..., None]
    for _ in range(int(900 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.4, 4.5), pit)
    for _ in range(int(60 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(6, 12), pit)
    def speck(ix, m, d, g):
        a = (m * .7)[..., None]; alb[ix] = alb[ix] * (1 - a) + np.array([g, g * .97, g * .92]) * a
    for _ in range(int(2400 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(.9, 2.0), lambda ix, m, d, g=rng.uniform(.3, .7): speck(ix, m, d, g))
    return np.clip(alb, 0, 1), normal_from_height(h * .09, 1.0), np.clip(.82 + .08 * pnoise(rng, N, .6), .55, .95)

def screed_maps(N=1024, seed=51):
    """sand-cement screed: warm tan paste full of visible sand grains (light quartz, dark, orange), soft clumps, a few pits"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.44, .335, .215)
    alb *= (1 + .13 * pnoise(rng, N, 1.0) + .07 * pnoise(rng, N, .4))[..., None]; alb *= (1 + .10 * pnoise(rng, N, .14))[..., None]
    h = .5 * pnoise(rng, N, .9) + .35 * pnoise(rng, N, .4) + .3 * pnoise(rng, N, 1.5)
    def clump(ix, m, d, k):
        a = (m * .45)[..., None]; alb[ix] = alb[ix] * (1 - a) + alb[ix] * k * a; h[ix] += m * .25
    for _ in range(int(900 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(6, 16), lambda ix, m, d, k=rng.uniform(.8, 1.2): clump(ix, m, d, k))
    cols = [np.array(c) for c in ((.80, .68, .50), (.22, .15, .09), (.64, .33, .12), (.46, .42, .37), (.72, .52, .30), (.34, .22, .12))]
    def grain(ix, m, d, col, lift):
        a = (m * .92)[..., None]; shade = (.85 + .25 * (1 - d))[..., None]; alb[ix] = alb[ix] * (1 - a) + col * shade * a; h[ix] += m * lift
    for _ in range(int(11000 * K)):
        col = cols[rng.integers(len(cols))] * rng.uniform(.9, 1.1)
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(.9, 2.8), lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(.3, .9)))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.8, 1.6) * c; alb[ix] *= (1 - .45 * m * c)[..., None]
    for _ in range(int(600 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.2, 3.5), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .13, 1.0), np.clip(.88 + .06 * pnoise(rng, N, .6), .6, 1)

def marble_maps(N=1024, seed=61):
    """polished pale grey marble: soft cloud, two sets of thin darker veins (integer frequencies, so it tiles)"""
    rng = np.random.default_rng(seed); yy, xx = np.mgrid[0:N, 0:N] / N
    t = pnoise(rng, N, 1.3); t2 = pnoise(rng, N, .9)
    alb = np.empty((N, N, 3)); alb[:] = (.50, .495, .485)
    alb *= (1 + .045 * pnoise(rng, N, 1.0) + .06 * pnoise(rng, N, .35))[..., None]
    v1 = np.abs(np.sin((xx * 2 + yy * 1 + .55 * t) * np.pi * 2)); v2 = np.abs(np.sin((xx * 3 - yy * 2 + .85 * t2) * np.pi * 2))
    vein = np.clip(1 - v1 / .05, 0, 1) ** 1.2; vein2 = np.clip(1 - v2 / .035, 0, 1) ** 1.2
    alb *= (1 - .55 * vein - .40 * vein2)[..., None]; alb *= (1 + .10 * pnoise(rng, N, .5))[..., None]
    alb *= (1 + .05 * pnoise(rng, N, 2.0))[..., None]
    return np.clip(alb, 0, 1), normal_from_height(.4 * pnoise(rng, N, 1.4), .5), np.clip(.20 + .06 * pnoise(rng, N, .8), .1, .4)

def pebble_maps(N=1024, seed=71):
    """river pebble: smooth, creamy-tan, soft mottling, faint dark and pale flecks"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.60, .50, .37)
    alb *= (1 + .10 * pnoise(rng, N, 1.2) + .07 * pnoise(rng, N, .5))[..., None]; alb *= (1 + .10 * pnoise(rng, N, .15))[..., None]
    h = .3 * pnoise(rng, N, 1.1) + .2 * pnoise(rng, N, 2.0)
    def fleck(ix, m, d, col):
        a = (m * .8)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a
    for _ in range(int(1800 * K)):
        g = rng.uniform(.18, .34); stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.0, 2.6), lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g * .92, g * .8])))
    for _ in range(int(1400 * K)):
        g = rng.uniform(.72, .9); stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.0, 2.4), lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g * .94, g * .84])))
    return np.clip(alb, 0, 1), normal_from_height(h * .05, 1.0), np.clip(.50 + .10 * pnoise(rng, N, .6), .3, .75)

def soil_maps(N=1024, seed=81):
    """trench soil: orange-brown clay with clods, dark organic flecks and pale grit"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.235, .155, .10)
    alb *= (1 + .24 * pnoise(rng, N, 1.0) + .12 * pnoise(rng, N, .4))[..., None]; alb *= (1 + .22 * pnoise(rng, N, .12))[..., None]
    h = .5 * pnoise(rng, N, .9) + .35 * pnoise(rng, N, .35) + .3 * pnoise(rng, N, 1.5)
    def grain(ix, m, d, col, lift):
        a = (m * .9)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift
    for _ in range(int(5600 * K)):
        c = rng.choice([0, 1, 2, 3]); col = [np.array([.36, .24, .16]), np.array([.11, .07, .045]), np.array([.45, .40, .34]), np.array([.28, .19, .12])][c]
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.0, 4.2), lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(.2, .7)))
    return np.clip(alb, 0, 1), normal_from_height(h * .14, 1.0), np.clip(.90 + .05 * pnoise(rng, N, .6), .6, 1)

def pipe_maps(N=1024, seed=91):
    """cast concrete pipe: pale grey, fine pores, faint form lines"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.46, .455, .44)
    alb *= (1 + .08 * pnoise(rng, N, 1.1) + .05 * pnoise(rng, N, .45))[..., None]; alb *= (1 + .10 * pnoise(rng, N, .15))[..., None]
    h = .45 * pnoise(rng, N, .7) + .3 * pnoise(rng, N, 1.4)
    def pore(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.8, 1.6) * c; alb[ix] *= (1 - .45 * m * c)[..., None]
    for _ in range(int(2200 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.0, 3.4), pore)
    def fleck(ix, m, d, g):
        a = (m * .8)[..., None]; alb[ix] = alb[ix] * (1 - a) + np.array([g, g * .98, g * .95]) * a
    for _ in range(int(300 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.0, 2.6), lambda ix, m, d, g=rng.uniform(.3, .5): fleck(ix, m, d, g))
    return np.clip(alb, 0, 1), normal_from_height(h * .07, 1.0), np.clip(.80 + .08 * pnoise(rng, N, .6), .55, .95)

NS = 512 if QUICK else 1024
def make_set(name, fn, cs_extra=None):
    a, n, r = fn(NS)
    return (save_img(name + '_a', a, 'sRGB'), save_img(name + '_n', n, 'Non-Color'), save_img(name + '_r', r, 'Non-Color'))

def textured(name, imgs, nstr=1.0, tint=None, spec=.35, coat=0.0):
    a, n, r = imgs
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N_, L_ = nt.nodes, nt.links; P = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img):
        t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t
    col = tex(a).outputs['Color']
    if tint is not None:
        oi = N_.new('ShaderNodeObjectInfo'); mp = N_.new('ShaderNodeMapRange'); mp.inputs['To Min'].default_value = .78; mp.inputs['To Max'].default_value = 1.18; L_.new(oi.outputs['Random'], mp.inputs['Value'])
        mx = N_.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0; mx.inputs[7].default_value = (*tint, 1)
        mx2 = N_.new('ShaderNodeMix'); mx2.data_type = 'RGBA'; mx2.blend_type = 'MULTIPLY'; mx2.inputs['Factor'].default_value = 1.0
        L_.new(col, mx.inputs[6]); L_.new(mx.outputs[2], mx2.inputs[6]); L_.new(mp.outputs['Result'], mx2.inputs[7]); col = mx2.outputs[2]
    L_.new(col, P.inputs['Base Color']); L_.new(tex(r).outputs['Color'], P.inputs['Roughness'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L_.new(tex(n).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], P.inputs['Normal'])
    for key, v in (('Specular IOR Level', spec), ('Coat Weight', coat)):
        try: P.inputs[key].default_value = v
        except Exception: pass
    if coat:
        try: P.inputs['Coat Roughness'].default_value = .04
        except Exception: pass
    return m

def plain(name, col, rough):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Roughness'].default_value = rough; return m

# ---------------------------------------------------------------- mesh helpers
def box_uv(ob, tile):
    me = ob.data; me.uv_layers.new(name='UVMap'); bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv['UVMap']
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co + ob.location
            u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z)); lp[uvl].uv = (u / tile, v / tile)
    bm.to_mesh(me); bm.free()
def finish(ob, mat, bevel=0.0, smooth=True, tile=0.5, seg=2):
    bpy.context.view_layer.objects.active = ob
    if mat is not None: ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = smooth
    if bevel > 0:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel * U; bv.segments = seg; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(35); bv.profile = .6
        bpy.ops.object.modifier_apply(modifier=bv.name)
        wn = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 100; bpy.ops.object.modifier_apply(modifier=wn.name)
    if tile: box_uv(ob, tile)
    return ob
def block(name, x0, x1, y0, y1, z0, z1, mat, bevel=1.2, tile=0.5, seg=2):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal(((x1 - x0) * U, (z1 - z0) * U, (y1 - y0) * U, 1)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return finish(ob, mat, bevel, tile=tile, seg=seg)
def area(name, loc, w, h, energy, color=(1, 1, 1), look=(0, 0, 0)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = V(*loc); ob.rotation_euler = (V(*look) - ob.location).to_track_quat('-Z', 'Y').to_euler(); return ob
def world_and_view(wk, transparent):
    world = bpy.data.worlds.new('W'); scene.world = world
    try: world.use_nodes = True
    except Exception: pass
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.93, .93, .94, 1); bg.inputs['Strength'].default_value = wk
    try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception: scene.view_settings.view_transform = 'AgX'
    scene.cycles.use_denoising = True; scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'; scene.render.resolution_percentage = 100
def clear():
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)

def make_rock(seed, mat, sub=2, planes=(10, 14), lo=.5, hi=.74, prefix='rk'):
    rng = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    sx, sy, sz = rng.uniform(1.0, 1.3), rng.uniform(.65, .95), rng.uniform(.85, 1.15); pl = []
    for _ in range(rng.randint(*planes)):
        n = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized(); pl.append((n, rng.uniform(lo, hi)))
    for v in bm.verts:
        p = v.co.copy()
        for n, off in pl:
            d = p.dot(n) - off
            if d > 0: p -= n * d
        v.co = Vector((p.x * sx, p.y * sy, p.z * sz))
    rm = math.sqrt(sum(v.co.length_squared for v in bm.verts) / len(bm.verts))
    for v in bm.verts: v.co /= rm * 1.12
    for f in bm.faces: f.smooth = False
    me = bpy.data.meshes.new('%s_%d' % (prefix, seed)); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co; u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z)); lp[uvl].uv = (u * .36 + (.137 * f.index) % 1, v * .36 + .3 * (f.index % 7) / 7)
    b2.to_mesh(me); b2.free(); return me

def make_pebble(seed, mat):
    """a smooth river pebble: a subdivided sphere, flattened a little, with soft low-frequency lumps"""
    rng = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    sx, sy, sz = rng.uniform(1.0, 1.18), rng.uniform(.84, 1.0), rng.uniform(.70, .90)
    ph = [rng.uniform(0, 6.3) for _ in range(6)]
    for v in bm.verts:
        p = v.co.copy(); k = 1 + .10 * math.sin(p.x * 2.3 + ph[0]) * math.sin(p.y * 2.1 + ph[1]) + .08 * math.sin(p.z * 2.7 + ph[2] + p.x * 1.3) + .05 * math.sin(p.y * 4.1 + ph[3]) * math.cos(p.x * 3.7 + ph[4])
        v.co = Vector((p.x * sx, p.y * sy, p.z * sz)) * k
    for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new('pb%d' % seed); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co; u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z)); lp[uvl].uv = (u * .5 + .31 * seed % 1, v * .5 + (.17 * seed) % 1)
    b2.to_mesh(me); b2.free(); return me

# ================================================================ 1. the floor build-up
def build_screed():
    clear()
    SLAB = textured('Slab', make_set('slab', slab_maps), 1.6)
    SCR = textured('Screed', make_set('screed', screed_maps), 1.5)
    MAR = textured('Marble', make_set('marble', marble_maps), .5, spec=.5, coat=.3)
    GROUT = plain('Grout', (.52, .51, .49), .9)
    BW, BD = 800, 460; z0, z1 = -BD / 2, BD / 2
    y_slab, y_scr, y_til = 118, 188, 224
    objs = []
    objs.append(block('Slab', 0, BW, 0, y_slab, z0, z1, SLAB, bevel=2.0, tile=.6))
    objs.append(block('Screed', 0, BW, y_slab, y_scr, z0, z1, SCR, bevel=1.6, tile=.5))
    objs.append(block('Grout', 0, BW, y_scr - 1, y_til - 3, z0, z1, GROUT, bevel=0, tile=0, seg=1))
    nx, nz, gap = 4, 2, 5; tw = (BW - (nx - 1) * gap) / nx; td = (BD - (nz - 1) * gap) / nz
    for i in range(nx):
        for k in range(nz):
            xa = i * (tw + gap); za = z0 + k * (td + gap)
            objs.append(block('Tile%d%d' % (i, k), xa, xa + tw, y_scr + 2, y_til, za, za + td, MAR, bevel=2.4, tile=.36, seg=3))
    # yaw the whole build-up about its vertical centre, so the left end face shows beside the front
    pivot = bpy.data.objects.new('Pivot', None); scene.collection.objects.link(pivot); pivot.location = V(BW / 2, 0, 0); bpy.context.view_layer.update()
    for ob in objs: ob.parent = pivot; ob.matrix_parent_inverse = pivot.matrix_world.inverted()
    pivot.rotation_euler = (0, 0, math.radians(float(os.environ.get('YAW', '26'))))
    bpy.context.view_layer.update()
    # floor shadow catcher
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=6.0); me = bpy.data.meshes.new('Ground'); bm.to_mesh(me); bm.free()
    ground = bpy.data.objects.new('Ground', me); scene.collection.objects.link(ground); ground.location = V(BW / 2, -.5, 0); ground.is_shadow_catcher = True
    area('Key', (-350, 1500, 600), 1.5, 1.1, 190 * LK, (1.0, .985, .965), (BW / 2, 100, 0))
    area('Fill', (1500, 500, 800), 1.4, 1.0, 36 * LK, (.95, .97, 1.0), (BW / 2, 100, 0))
    area('Top', (BW / 2, 1200, 100), 1.6, 1.2, 26 * LK, (1, 1, 1), (BW / 2, 100, 0))
    world_and_view(WK, True)
    PITCH = math.radians(float(os.environ.get('PITCH', '22'))); cp, sp = math.cos(PITCH), math.sin(PITCH)
    FW = float(os.environ.get('FW', '1560')); FH = FW * 380 / 1100                       # frame: 1100 x 380 (2.9 : 1)
    cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = FW * U; cam.clip_start = .05; cam.clip_end = 30
    co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
    cx = BW / 2 + (0.5 - float(os.environ.get('BX', '0.355'))) * FW; ty = float(os.environ.get('TY', '105'))
    co.location = V(cx, ty / cp + 9000 * sp, 9000 * cp); co.rotation_euler = (math.radians(90) - PITCH, 0, 0)
    W = 1100 if QUICK else 2400; scene.render.resolution_x = W; scene.render.resolution_y = int(W * 380 / 1100)
    scene.cycles.samples = 64 if QUICK else 360
    scene.render.filepath = os.path.join(OUT, 'screed.png'); bpy.ops.render.render(write_still=True)
    print('[rsand] screed done')

# ================================================================ 2. the trench
def gridmesh(name, origin, du, dv, nu, nv, amp, nz, mat, skip=None, normal=(0, 0, 1), tile=.5):
    """a displaced grid: origin + du*a + dv*b (figure mm), displaced along `normal` by noise nz (array) * amp"""
    bm = bmesh.new(); vs = {}
    nvec = Vector(normal)
    for i in range(nu + 1):
        for j in range(nv + 1):
            if skip is not None and not (i < nu and j < nv) and False: pass
            p = Vector(origin) + Vector(du) * (i / nu) + Vector(dv) * (j / nv) + nvec * (amp * nz[i, j])
            vs[(i, j)] = bm.verts.new(V(*p))
    for i in range(nu):
        for j in range(nv):
            if skip is not None:
                c = Vector(origin) + Vector(du) * ((i + .5) / nu) + Vector(dv) * ((j + .5) / nv)
                if skip(c): continue
            bm.faces.new((vs[(i, j)], vs[(i + 1, j)], vs[(i + 1, j + 1)], vs[(i, j + 1)]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.materials.append(mat); box_uv(ob, tile); return ob

def pack2d(rng, rect, hole, radii_plan, gap=.84):
    xs, ys, rs = [], [], []; out = []
    (x0, x1, y0, y1) = rect; (hx, hy, hr) = hole
    for r, tries in radii_plan:
        for _ in range(tries):
            x = rng.uniform(x0 + r, x1 - r); y = rng.uniform(y0 + r, y1 - r)
            if math.hypot(x - hx, y - hy) < hr + r * .92: continue
            if xs:
                dx = np.array(xs) - x; dy = np.array(ys) - y; need = (np.array(rs) + r) * gap
                if np.any(dx * dx + dy * dy < need * need): continue
            xs.append(x); ys.append(y); rs.append(r); out.append((x, y, r))
    return out

def build_trench():
    clear()
    SOIL = textured('Soil', make_set('soil', soil_maps), 1.6)
    PIPE = textured('Pipe', make_set('pipe', pipe_maps), 1.0)
    PIPEIN = plain('PipeIn', (.05, .048, .045), .9)
    PEBIMG = make_set('pebble', pebble_maps)
    tints = [(1.00, .92, .76), (.98, .78, .55), (.92, .70, .42), (.80, .76, .68), (.76, .56, .38), (1.0, .97, .88), (.88, .82, .72), (.72, .72, .70), (.62, .60, .56), (.95, .86, .70)]
    PM = [textured('Peb%d' % i, PEBIMG, .8, tint=t, spec=.4) for i, t in enumerate(tints)]
    BED = plain('Bed', (.14, .10, .06), .95)
    rng = np.random.default_rng(7); rr = random.Random(11)
    PX, PY0, PY1 = 500, -340, 310                      # pit half-width and its vertical span (mm), centred on x = 0
    PCY = -30; PRO, PRI = 190, 146                    # pipe: outer / inner radius, centre height
    ZF = 0                                           # soil face plane
    # soil face with the pit left open
    cell = 7; nx = int(1900 / cell); ny = int(1100 / cell)
    nz = pnoise(rng, 512, 1.2); nz = nz[:nx + 1, :ny + 1] * .9 + (pnoise(rng, 512, .6)[:nx + 1, :ny + 1] * .3)
    face = gridmesh('Face', (-950, -550, 0), (1900, 0, 0), (0, 1100, 0), nx, ny, 9.0, nz, SOIL, skip=lambda c: abs(c.x) < PX - 6 and PY0 + 6 < c.y < PY1 - 6, tile=.55)
    # the four pit walls (soil), going back to the pit floor
    DEP = 260
    def wall(name, o, du, dv, nu, nv, n):
        z = pnoise(rng, 256, 1.2)[:nu + 1, :nv + 1]; return gridmesh(name, o, du, dv, nu, nv, 7.0, z, SOIL, normal=n, tile=.55)
    wall('WallT', (-PX, PY1, 0), (2 * PX, 0, 0), (0, 0, -DEP), 140, 36, (0, -1, 0))
    wall('WallB', (-PX, PY0, 0), (2 * PX, 0, 0), (0, 0, -DEP), 140, 36, (0, 1, 0))
    wall('WallL', (-PX, PY0, 0), (0, PY1 - PY0, 0), (0, 0, -DEP), 90, 36, (1, 0, 0))
    wall('WallR', (PX, PY0, 0), (0, PY1 - PY0, 0), (0, 0, -DEP), 90, 36, (-1, 0, 0))
    # soil clods and a few pale stones on the face
    clod_m = [make_rock(300 + s, SOIL, 2, (8, 12), .5, .8, 'cl') for s in range(8)]
    for i in range(520):
        x = rr.uniform(-940, 940); y = rr.uniform(-540, 540)
        if abs(x) < PX + 14 and PY0 - 14 < y < PY1 + 14: continue
        r = rr.choice([10, 14, 18, 24, 32, 44]) * rr.uniform(.8, 1.25)
        ob = bpy.data.objects.new('cl%03d' % i, clod_m[i % len(clod_m)]); scene.collection.objects.link(ob)
        ob.location = V(x, y, ZF + r * .1 - 2); ob.rotation_euler = (rr.uniform(0, 6.28), rr.uniform(0, 6.28), rr.uniform(0, 6.28)); ob.scale = (r * U, r * U * rr.uniform(.6, .9), r * U)
    # the filter bed and the pebbles (rounded river pebbles), three layers deep so the gaps read dark
    bed = block('Bed', -PX - 40, PX + 40, PY0 - 40, PY1 + 40, -DEP - 4, -DEP, BED, bevel=0, tile=0, seg=1)
    cb = bmesh.new(); bmesh.ops.create_cone(cb, cap_ends=True, segments=48, radius1=(PRO + 3) * U, radius2=(PRO + 3) * U, depth=60 * U * 10, matrix=Matrix.Translation(V(0, PCY, -DEP)) @ Matrix.Rotation(math.radians(90), 4, 'X'))
    cme = bpy.data.meshes.new('cut'); cb.to_mesh(cme); cb.free(); cut = bpy.data.objects.new('cut', cme); scene.collection.objects.link(cut)
    bm_ = bed.modifiers.new('hole', 'BOOLEAN'); bm_.object = cut; bm_.operation = 'DIFFERENCE'; bpy.context.view_layer.objects.active = bed; bpy.ops.object.modifier_apply(modifier=bm_.name); bpy.data.objects.remove(cut, do_unlink=True)
    block('Backing', -1400, 1400, -800, 800, -DEP - 80, -DEP - 76, plain('Back', (.10, .07, .045), 1.0), bevel=0, tile=0, seg=1)   # nothing but dark soil shows through a hairline gap
    pm = [make_pebble(s, PM[s % len(PM)]) for s in range(14)]
    k_i = 0
    def fill(layer_z, plan, tag):
        nonlocal k_i
        pts = pack2d(rng_py, (-PX + 6, PX - 6, PY0 + 6, PY1 - 6), (0, PCY, PRO + 4), plan)
        for (x, y, r) in pts:
            ob = bpy.data.objects.new('%s%04d' % (tag, k_i), pm[k_i % len(pm)]); scene.collection.objects.link(ob); k_i += 1
            ob.location = V(x, y, layer_z - r * .30 + rr.uniform(-5, 5)); ob.rotation_euler = (rr.uniform(0, 6.28), rr.uniform(0, 6.28), rr.uniform(0, 6.28))
            ob.scale = (r * U, r * U, r * U)
    rng_py = random.Random(5)
    plan = [(25, 500), (22, 700), (19, 900), (16, 1200), (14, 1500), (12, 1800), (10, 2200)] if not QUICK else [(25, 200), (20, 400), (16, 700), (12, 900)]
    fill(-96, plan, 'F')
    rng_py = random.Random(9); fill(-150, plan, 'G')
    rng_py = random.Random(13); fill(-205, [(24, 300), (18, 500), (14, 700)] if not QUICK else [(24, 100), (16, 200)], 'H')
    # the concrete pipe: a revolved profile along z (front rim at z = -66, running back)
    zf, zb = -66, -1100
    prof = [(PRI, zb), (PRI, zf - 4), (PRI + 4, zf), (PRO - 5, zf), (PRO, zf - 5), (PRO, zb)]
    SEG = 120 if not QUICK else 60; bm = bmesh.new(); rings = []
    for (r, z) in prof:
        rings.append([bm.verts.new(V(r * math.cos(2 * math.pi * k / SEG), PCY + r * math.sin(2 * math.pi * k / SEG), z)) for k in range(SEG)])
    for a in range(len(prof) - 1):
        for k in range(SEG): bm.faces.new((rings[a][k], rings[a][(k + 1) % SEG], rings[a + 1][(k + 1) % SEG], rings[a + 1][k]))
    me = bpy.data.meshes.new('Pipe'); bm.to_mesh(me); bm.free(); pipe = bpy.data.objects.new('Pipe', me); scene.collection.objects.link(pipe)
    for p in pipe.data.polygons: p.use_smooth = True
    pipe.data.materials.append(PIPE); pipe.data.materials.append(PIPEIN)
    for p in pipe.data.polygons:
        if p.index < SEG: p.material_index = 1          # the bore (first profile segment)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        for lp in f.loops:
            c = lp.vert.co; lp[uvl].uv = ((c.x + .5 * c.z) / .52, (c.y + .7 * c.z) / .52)   # blender metres: the pipe runs along y
    b2.to_mesh(me); b2.free()
    cap = block('BoreCap', -PRI - 6, PRI + 6, PCY - PRI - 6, PCY + PRI + 6, -302, -300, plain('Dark', (.02, .02, .02), 1.0), bevel=0, tile=0, seg=1)
    # lights and camera: a perspective view straight down the pipe
    area('Key', (-700, 800, 1000), 1.1, .9, 170 * LK, (1.0, .985, .965), (0, 0, -100))
    area('Fill', (900, 300, 1100), 1.4, 1.0, 55 * LK, (.95, .97, 1.0), (0, 0, -100))
    area('Top', (0, 1000, 300), 1.6, 1.2, 40 * LK, (1, 1, 1), (0, 0, -150))
    world_and_view(WK, False)
    cam = bpy.data.cameras.new('Cam'); cam.type = 'PERSP'; cam.lens = 35; cam.sensor_width = 36; cam.clip_start = .05; cam.clip_end = 30
    co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
    co.location = V(0, 0, 1555); co.rotation_euler = (math.radians(90), 0, 0)
    W = 1000 if QUICK else 2000; scene.render.resolution_x = W; scene.render.resolution_y = int(W * 9 / 16)
    scene.cycles.samples = 64 if QUICK else 360
    scene.render.filepath = os.path.join(OUT, 'trench.png'); bpy.ops.render.render(write_still=True)
    print('[rsand] trench done')

if MODE in ('screed', 'all'): build_screed()
if MODE in ('trench', 'all'): build_trench()
print('[rsand] done')
