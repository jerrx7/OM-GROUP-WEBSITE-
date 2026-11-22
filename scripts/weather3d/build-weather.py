"""OM GROUP - Plaster Sand page, "What the Weather Does to a Render": one wall section, six weather stills.

  blender -b --factory-startup -P scripts/weather3d/build-weather.py -- <repo root> [--quick]          (env VAR = rain | wind | sun | temp | wetdry | moist | all (default all))

  _review/weather3d/<variant>.png   2080 x 800 stills of the same cut through an external wall, seen from the weather side: the room (cream wall, skirting, floor), a thin pale inner skim,
                                    a dark concrete-block background, a sand-coloured render (drawn thicker than a real one), then the outside, with the render's outer face turning away on the right.
  _review/weather3d/layout.json     where the layers land in the frame (normalised 0..1, y down), so the page can put its outline, labels and arrows on top
Not to scale, not a measured result. The variants only change the weather: rain (wet face, streaks, splashes), wind (blown dust and leaves), sun (hard low sun, warm face), temperature (golden hour),
wetting and drying (wet below, drying above), moisture movement (damp rising from the ground, salts on the line).
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv; VAR = os.environ.get('VAR', 'all')
OUT = os.path.join(ROOT, '_review', 'weather3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
S = 0.01                                                    # 1 model unit = 1 cm
AR = 2.6; RW = 1040 if QUICK else 2080; RH = int(RW / AR)
K = .4 if QUICK else 1.0

def V(x, y, z): return Vector((x * S, -z * S, y * S))      # x right, y up, z toward the viewer (cm) -> blender metres

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
def streak(rng, N, ax, ay):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w); fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    F *= np.exp(-((fx * ax) ** 2 + (fy * ay) ** 2)); o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)

def render_maps(N=1024, seed=31):
    """sand-cement render, a touch orange (tile = 40 cm of drawing): soft trowel sweeps, dense sand grains, pits"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.62, .51, .39)
    alb *= (1 + .07 * pnoise(rng, N, 1.0) + .05 * pnoise(rng, N, .35))[..., None]; sw = streak(rng, N, 30, 12); alb *= (1 + .045 * sw + .06 * pnoise(rng, N, 1.3))[..., None]
    h = .5 * sw + .6 * pnoise(rng, N, 1.2) + .25 * pnoise(rng, N, .6)
    cols = [np.array(c) for c in ((.86, .76, .60), (.44, .34, .24), (.76, .6, .42), (.55, .5, .44), (.92, .86, .76))]
    def grain(ix, m, d, col, lift):
        a = (m * .85)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift
    for _ in range(int(14000 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.0, 3.0), lambda ix, m, d, col=cols[rng.integers(5)] * rng.uniform(.92, 1.08): grain(ix, m, d, col, rng.uniform(.25, .8)))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.6, 1.5) * c; alb[ix] *= (1 - .42 * m * c)[..., None]
    for _ in range(int(900 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.4, 4.2), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .13, 1.0), np.clip(.9 + .05 * pnoise(rng, N, .6), .7, 1)
def block_maps(N=1024, seed=32):
    """dark concrete block: charcoal, sand-grain speckle, big air pits with a lit rim"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.25, .25, .255)
    alb *= (1 + .14 * pnoise(rng, N, 1.0) + .08 * pnoise(rng, N, .4))[..., None]; alb *= (1 + .16 * pnoise(rng, N, .14))[..., None]
    h = .5 * pnoise(rng, N, .8) + .3 * pnoise(rng, N, 1.5)
    def grain(ix, m, d, col, lift):
        a = (m * .85)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift
    for _ in range(int(9000 * K)):
        g = rng.uniform(.1, .62); stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.2, 3.6), lambda ix, m, d, g=g: grain(ix, m, d, np.array([g, g * .99, g * .97]), rng.uniform(.2, .7)))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(1.0, 2.2) * c; alb[ix] *= (1 - .6 * m * c)[..., None]
    for _ in range(int(900 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(3, 11), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .15, 1.0), np.clip(.8 + .1 * pnoise(rng, N, .6), .55, .95)
def plain_maps(N, base, seed, grain=.05, rough=.8, nstr=.04):
    rng = np.random.default_rng(seed); alb = np.empty((N, N, 3)); alb[:] = base
    alb *= (1 + grain * pnoise(rng, N, 1.0) + grain * .7 * pnoise(rng, N, .35))[..., None]; h = .4 * pnoise(rng, N, 1.2)
    return np.clip(alb, 0, 1), normal_from_height(h * nstr * 2, 1.0), np.full((N, N), rough) + .06 * pnoise(rng, N, .6)

# ---------------------------------------------------------------- scene helpers
def textured(name, maps, nstr=1.0, spec=.4, wet=None, damp=None):
    """wet / damp: an optional float expression key ('rain' 'wetdry' 'moist') that darkens and glosses the surface through a height-driven mask"""
    N = maps[0].shape[0]; a, n, r = maps
    ia = save_img(name + '_a', a, 'sRGB'); inn = save_img(name + '_n', n, 'Non-Color'); ir = save_img(name + '_r', r, 'Non-Color')
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N_, L_ = nt.nodes, nt.links; Pr = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img):
        t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t
    col = tex(ia).outputs['Color']; rgh = tex(ir).outputs['Color']
    if wet:
        g = N_.new('ShaderNodeNewGeometry'); sp = N_.new('ShaderNodeSeparateXYZ'); L_.new(g.outputs['Position'], sp.inputs['Vector'])
        mp = N_.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (9, 9, 1.2); L_.new(g.outputs['Position'], mp.inputs['Vector'])
        nz = N_.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 6; L_.new(mp.outputs['Vector'], nz.inputs['Vector'])
        zc = N_.new('ShaderNodeMath'); zc.operation = 'MULTIPLY'; zc.inputs[1].default_value = 100.0; L_.new(sp.outputs['Z'], zc.inputs[0])       # height in cm
        mk = N_.new('ShaderNodeMath'); mk.operation = 'MAXIMUM'; mk.use_clamp = True
        if wet == 'rain':                                             # wet everywhere, streaked by runnels
            e1 = N_.new('ShaderNodeMath'); e1.operation = 'MULTIPLY_ADD'; e1.inputs[1].default_value = .55; e1.inputs[2].default_value = .55; L_.new(nz.outputs['Fac'], e1.inputs[0]); L_.new(e1.outputs['Value'], mk.inputs[0]); mk.inputs[1].default_value = 0.0
        elif wet == 'wetdry':                                         # wet below, drying above (ragged line)
            e1 = N_.new('ShaderNodeMath'); e1.operation = 'SUBTRACT'; e1.inputs[1].default_value = 17.0; L_.new(zc.outputs['Value'], e1.inputs[0])
            e2 = N_.new('ShaderNodeMath'); e2.operation = 'MULTIPLY_ADD'; e2.inputs[1].default_value = -.11; e2.inputs[2].default_value = .5; L_.new(e1.outputs['Value'], e2.inputs[0])
            e3 = N_.new('ShaderNodeMath'); e3.operation = 'ADD'; L_.new(e2.outputs['Value'], e3.inputs[0]); e4 = N_.new('ShaderNodeMath'); e4.operation = 'MULTIPLY'; e4.inputs[1].default_value = .35; L_.new(nz.outputs['Fac'], e4.inputs[0]); L_.new(e4.outputs['Value'], e3.inputs[1])
            L_.new(e3.outputs['Value'], mk.inputs[0]); mk.inputs[1].default_value = 0.0
        else:                                                         # moist: damp rising from the ground to a ragged line
            e1 = N_.new('ShaderNodeMath'); e1.operation = 'SUBTRACT'; e1.inputs[1].default_value = 12.0; L_.new(zc.outputs['Value'], e1.inputs[0])
            e2 = N_.new('ShaderNodeMath'); e2.operation = 'MULTIPLY_ADD'; e2.inputs[1].default_value = -.22; e2.inputs[2].default_value = .55; L_.new(e1.outputs['Value'], e2.inputs[0])
            e3 = N_.new('ShaderNodeMath'); e3.operation = 'ADD'; L_.new(e2.outputs['Value'], e3.inputs[0]); e4 = N_.new('ShaderNodeMath'); e4.operation = 'MULTIPLY'; e4.inputs[1].default_value = .5; L_.new(nz.outputs['Fac'], e4.inputs[0]); L_.new(e4.outputs['Value'], e3.inputs[1])
            L_.new(e3.outputs['Value'], mk.inputs[0]); mk.inputs[1].default_value = 0.0
        # darker where wet, glossier too
        dk = N_.new('ShaderNodeMix'); dk.data_type = 'RGBA'; dk.blend_type = 'MULTIPLY'; dk.inputs[7].default_value = (.66, .62, .58, 1) if wet != 'moist' else (.55, .52, .5, 1)
        L_.new(mk.outputs['Value'], dk.inputs['Factor']); L_.new(col, dk.inputs[6]); col = dk.outputs[2]
        gl = N_.new('ShaderNodeMix'); gl.data_type = 'FLOAT'; gl.inputs[3].default_value = .16 if wet != 'moist' else .55
        L_.new(mk.outputs['Value'], gl.inputs['Factor']); L_.new(rgh, gl.inputs[2]); sepr = N_.new('ShaderNodeSeparateColor'); L_.new(rgh, sepr.inputs['Color']); L_.new(sepr.outputs['Red'], gl.inputs[2]); rgh = gl.outputs[0]
        m['wetmask'] = mk.name
    L_.new(col, Pr.inputs['Base Color'])
    if wet: L_.new(rgh, Pr.inputs['Roughness'])
    else: L_.new(rgh, Pr.inputs['Roughness'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L_.new(tex(inn).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], Pr.inputs['Normal'])
    try: Pr.inputs['Specular IOR Level'].default_value = spec
    except Exception: pass
    return m
def plain(name, col, rough, **kw):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Roughness'].default_value = rough
    for k, v in kw.items():
        try: p.inputs[k].default_value = v
        except Exception: pass
    return m
def box_uv(bm, tile, off=(0, 0)):
    uvl = (bm.loops.layers.uv.get('UVMap') or bm.loops.layers.uv.new('UVMap'))
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co / S                                              # back to cm
            u, v = (c.x, c.z) if ax == 1 else ((c.y, c.z) if ax == 0 else (c.x, c.z)); lp[uvl].uv = (u / tile + off[0], v / tile + off[1])
def box(name, x0, x1, y0, y1, z0, z1, mat, tile=40, bevel=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal(((x1 - x0) * S, (z1 - z0) * S, (y1 - y0) * S, 1)))
    if bevel: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel * S, segments=2, affect='EDGES', profile=.6)
    # box_uv uses blender coordinates: x, y(depth), z(up); map walls so that the picture runs along the long visible directions
    uvl = (bm.loops.layers.uv.get('UVMap') or bm.loops.layers.uv.new('UVMap'))
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co / S; u, v = ((c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z))); lp[uvl].uv = (u / tile, v / tile)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = bool(bevel)
    return ob

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
                scene.cycles.device = 'GPU'; print('[wx] Cycles device:', kind); return
    except Exception as e: print('[wx] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()

NS = 512 if QUICK else 1024
MAPS = {'render': render_maps(NS), 'block': block_maps(NS), 'skim': plain_maps(NS, (.66, .655, .64), 41, .04, .85), 'cream': plain_maps(NS, (.80, .73, .62), 42, .035, .8),
        'skirt': plain_maps(NS, (.74, .73, .70), 43, .03, .55), 'floor': plain_maps(NS, (.43, .385, .335), 44, .09, .45, .06), 'paving': block_maps(NS, 45)}

# ---------------------------------------------------------------- the variants
VARS = {
    'rain':   dict(wet='rain',   ground_wet=1.0, streaks='rain', drops=1, sky=('grey', .62), sun=0, haze=.0, bg=(.22, .27, .27, .75)),
    'wind':   dict(wet=None,     ground_wet=0.0, streaks='dust', drops=0, sky=('grey', 1.0), sun=1.4, haze=0, bg=(.18, .22, .14, 1.0)),
    'sun':    dict(wet=None,     ground_wet=0.0, streaks=None,   drops=0, sky=('sun', 38), sun=0, haze=0, bg=(.2, .27, .13, 1.3)),
    'temp':   dict(wet=None,     ground_wet=0.0, streaks=None,   drops=0, sky=('sun', 11), sun=0, haze=0, bg=(.22, .2, .1, 1.1)),
    'wetdry': dict(wet='wetdry', ground_wet=.7,  streaks=None,   drops=1, sky=('sun', 30), sun=0, haze=0, bg=(.16, .22, .13, 1.0)),
    'moist':  dict(wet='moist',  ground_wet=.35, streaks=None,   drops=0, sky=('grey', .9), sun=1.0, haze=0, bg=(.15, .2, .14, .9)),
}

def build(name):
    cfg = VARS[name]
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
    rr = random.Random(7 + len(name))
    H = 120.0                                                       # the wall is taller than the frame
    MR = textured('Render', MAPS['render'], 2.2, .4, cfg['wet']); MB = textured('Block', MAPS['block'], 2.0, .35, cfg['wet'] if cfg['wet'] == 'moist' else None)
    MS = textured('Skim', MAPS['skim'], .6, .3); MC = textured('Cream', MAPS['cream'], .5, .25); MK = textured('Skirt', MAPS['skirt'], .5, .4)
    # floor: tiles with grout
    MF = textured('Floor', MAPS['floor'], .6, .45)
    MP = textured('Paving', MAPS['paving'], 1.6, .4, 'rain' if cfg['ground_wet'] > .9 else None)
    gw = cfg['ground_wet']
    # the wall: inner skim, block, render (x 0 .. 32), solid down to y = -6, back 130 cm
    X_S, X_B, X_R = 0.0, 4.0, 26.0; X_E = 34.0
    box('Skim', X_S, X_B, -6, H, -130, 0, MS, 40, .15); box('Block', X_B, X_R, -6, H, -130, 0, MB, 11, .2); box('Render', X_R, X_E, -6, H, -130, 0, MR, 9, .25)
    # the room
    box('RoomFloor', -260, X_S, -6, 0, -90, 120, MF, 30); box('RoomBack', -260, X_S, 0, 160, -92, -90, MC, 60); box('Skirting', -260, X_S, 0, 8, -90, -88.2, MK, 30, .25)
    # outside: paving and a backdrop of trees (emission, blurred by the lens)
    box('Paving', X_E, 520, -6, 0, -400, 120, MP, 22)
    bg = cfg['bg']
    mb = bpy.data.materials.new('Trees')
    try: mb.use_nodes = True
    except Exception: pass
    nt = mb.node_tree; nodes, links = nt.nodes, nt.links; out = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
    for n in list(nodes):
        if n.type == 'BSDF_PRINCIPLED': nodes.remove(n)
    coord = nodes.new('ShaderNodeTexCoord'); mp = nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (.006, .006, .006); links.new(coord.outputs['Object'], mp.inputs['Vector'])
    nz = nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6.0; nz.inputs['Detail'].default_value = 8; nz.inputs['Roughness'].default_value = .6; links.new(mp.outputs['Vector'], nz.inputs['Vector'])
    cr = nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (bg[0] * .35, bg[1] * .35, bg[2] * .35, 1); cr.color_ramp.elements[1].color = (bg[0] * 1.9, bg[1] * 1.9, bg[2] * 1.5, 1); links.new(nz.outputs['Fac'], cr.inputs['Fac'])
    em = nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = bg[3]; links.new(cr.outputs['Color'], em.inputs['Color']); links.new(em.outputs['Emission'], out.inputs['Surface'])
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0); me = bpy.data.meshes.new('Trees'); bm.to_mesh(me); bm.free(); tr = bpy.data.objects.new('Trees', me); scene.collection.objects.link(tr)
    tr.data.materials.append(mb); tr.scale = (2400 * S, 700 * S, 1); tr.rotation_euler = (math.radians(90), 0, 0); tr.location = V(200, 100, -420)
    # weather objects
    if cfg['streaks'] == 'rain':
        sm = plain('Streak', (1, 1, 1), .2, **{'Alpha': .25, 'Emission Strength': .32, 'Emission Color': (.9, .95, 1, 1)})
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=.028 * S, radius2=.007 * S, depth=1.0 * S); cm = bpy.data.meshes.new('streak'); bm.to_mesh(cm); bm.free(); cm.materials.append(sm)
        for i in range(int(1500 * K)):
            o = bpy.data.objects.new('r%04d' % i, cm); scene.collection.objects.link(o); L = rr.uniform(14, 30)
            o.location = V(rr.uniform(X_E + 2, 300), rr.uniform(0, 90), rr.uniform(-380, 90)); o.scale = (1, 1, L); o.rotation_euler = (0, math.radians(-16 + rr.uniform(-2.5, 2.5)), 0)
    if cfg['streaks'] == 'dust':
        dm = plain('Dust', (.55, .48, .36), .9); lf = plain('Leaf', (.33, .26, .1), .75)
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0); dme = bpy.data.meshes.new('dust'); bm.to_mesh(dme); bm.free(); dme.materials.append(dm)
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0); lme = bpy.data.meshes.new('leaf'); bm.to_mesh(lme); bm.free(); lme.materials.append(lf)
        for i in range(int(900 * K)):
            o = bpy.data.objects.new('d%04d' % i, dme if rr.random() < .8 else lme); scene.collection.objects.link(o); L = rr.uniform(.8, 3.2) if o.data is dme else rr.uniform(.8, 1.6)
            sz = rr.uniform(.14, .34) if o.data is dme else rr.uniform(.25, .5)
            o.location = V(rr.uniform(X_E + 3, 260), rr.uniform(.5, 55), rr.uniform(-300, 90)); o.scale = (L * S, sz * S, sz * S * (1 if o.data is dme else 1.6)); o.rotation_euler = (rr.uniform(-.4, .4), rr.uniform(-.5, .5), rr.uniform(-.3, .3))
    if cfg['drops']:
        gl = plain('Water', (1, 1, 1), 0.0, **{'Transmission Weight': 1.0, 'IOR': 1.33})
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0); wme = bpy.data.meshes.new('drop'); bm.to_mesh(wme); bm.free(); wme.materials.append(gl)
        for p in wme.polygons: p.use_smooth = True
        nd = int((700 if name == 'rain' else 260) * K)
        for i in range(nd):
            o = bpy.data.objects.new('w%04d' % i, wme); scene.collection.objects.link(o)
            y = rr.uniform(.5, 90) if name == 'rain' else rr.uniform(.5, 17); z = rr.uniform(-125, -1); s = rr.choice([.18, .22, .3, .4, .55, .8, 1.1]) * (1 if name == 'rain' else .8)
            tail = 1 + (rr.uniform(.5, 4.0) if rr.random() < .35 else 0)
            o.location = V(X_E + s * .25, y, z); o.scale = (s * .45 * S, s * S, s * S * tail)
    # lights / world
    wd = bpy.data.worlds.new('W'); scene.world = wd
    try: wd.use_nodes = True
    except Exception: pass
    wn = wd.node_tree; wb = next(n for n in wn.nodes if n.type == 'BACKGROUND')
    kind, val = cfg['sky']
    if kind == 'sun':                                           # a grey sky and a hard warm sun at the given elevation
        wb.inputs['Color'].default_value = (.78, .8, .84, 1); wb.inputs['Strength'].default_value = .42
        ld = bpy.data.lights.new('Sun', 'SUN'); ld.energy = 5.0 if val > 20 else 4.2; ld.angle = math.radians(1.2); ld.color = (1.0, .96, .88) if val > 20 else (1.0, .66, .38)
        so = bpy.data.objects.new('Sun', ld); scene.collection.objects.link(so); so.rotation_euler = (math.radians(90 - val), math.radians(8), math.radians(62))
    else:
        wb.inputs['Color'].default_value = (.55, .6, .66, 1) if name == 'rain' else (.7, .74, .78, 1); wb.inputs['Strength'].default_value = val * (.5 if name == 'rain' else .7)
        if cfg['sun']:
            ld = bpy.data.lights.new('Sun', 'SUN'); ld.energy = cfg['sun'] * 2.2; ld.angle = math.radians(3); so = bpy.data.objects.new('Sun', ld); scene.collection.objects.link(so); so.rotation_euler = (math.radians(55), math.radians(15), math.radians(75))
    try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception: scene.view_settings.view_transform = 'AgX'
    scene.view_settings.exposure = {'rain': .25, 'wind': .15, 'sun': -.1, 'temp': .0, 'wetdry': -.05, 'moist': .1}[name]
    # a soft key from the camera side so the cut face reads even on a flat day
    kl = bpy.data.lights.new('Key', 'AREA'); kl.shape = 'RECTANGLE'; kl.size = 3.0; kl.size_y = 2.0; kl.energy = 330 if kind != 'sun' else 130; ko = bpy.data.objects.new('Key', kl); scene.collection.objects.link(ko)
    ko.location = V(70, 90, 260); ko.rotation_euler = (V(10, 14, 0) - ko.location).to_track_quat('-Z', 'Y').to_euler()
    # camera: from the weather side, looking at the section, the render's outer face turning away on the right
    cam = bpy.data.cameras.new('Cam'); cam.lens = 60; cam.sensor_width = 36; cam.clip_start = .05; cam.clip_end = 60
    cam.dof.use_dof = True; cam.dof.aperture_fstop = 5.6; cam.dof.focus_distance = 1.52
    co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
    co.location = V(92, 17.5, 150); tgt = V(24, 15.5, 0); co.rotation_euler = (tgt - co.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.resolution_x = RW; scene.render.resolution_y = RH; scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'; scene.render.film_transparent = False
    scene.cycles.samples = 48 if QUICK else 220; scene.cycles.use_denoising = True; scene.cycles.max_bounces = 6; scene.cycles.transmission_bounces = 6; scene.cycles.glossy_bounces = 4
    if name == 'rain':
        # a thin haze outside so the far trees sink into the rain
        vol = bpy.data.materials.new('Haze'); vol.use_nodes = True; vn = vol.node_tree
        for n in list(vn.nodes):
            if n.type == 'BSDF_PRINCIPLED': vn.nodes.remove(n)
        vs = vn.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Density'].default_value = .035; vs.inputs['Color'].default_value = (.85, .9, .95, 1); vo = next(n for n in vn.nodes if n.type == 'OUTPUT_MATERIAL'); vn.links.new(vs.outputs['Volume'], vo.inputs['Volume'])
        hz = box('Haze', 150, 520, 0, 140, -400, 130, vol, 100)
        for ms in list(hz.data.materials): pass
    scene.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True); print('[wx] rendered', name)
    # where things land in the frame (normalised, y down): the section's corners, the render, label anchors
    def pr(x, y, z): v = world_to_camera_view(scene, co, V(x, y, z)); return [round(v.x, 4), round(1 - v.y, 4)]
    lay = {'skim': [pr(X_S, H, 0)[0], pr(X_S, 0, 0)[0], pr(X_B, 0, 0)[0]], 'floorY': pr(X_B, 0, 0)[1], 'topY': pr(X_B, 40, 0)[1],
           'x': {'skim0': pr(X_S, 0, 0)[0], 'block0': pr(X_B, 0, 0)[0], 'render0': pr(X_R, 0, 0)[0], 'face0': pr(X_E, 0, 0)[0], 'faceFar': pr(X_E, 0, -90)[0]},
           'y': {'ground': pr(X_B, 0, 0)[1], 'ground_far': pr(X_E, 0, -90)[1], 'top': pr(X_B, 34, 0)[1], 'faceTop': pr(X_E, 34, -90)[1]}, 'inside': pr(-110, 14, -90), 'blockMid': pr((X_B + X_R) / 2, 14, 0), 'renderMid': pr((X_R + X_E) / 2, 14, 0)}
    return lay

lays = {}
for v in (VARS if VAR == 'all' else [VAR]): lays[v] = build(v)
lp = os.path.join(OUT, 'layout.json'); old = json.load(open(lp)) if os.path.exists(lp) else {}; old.update(lays); json.dump(old, open(lp, 'w'), indent=1)
print('[wx] done')
