"""OM GROUP - Plaster Sand page, "Control the Layer. Do Not Use Plaster to Conceal Every Defect.": five Blender stills of a cut through a plastered wall.

  blender -b --factory-startup -P scripts/thick3d/build-thickness.py -- <repo root> [--quick]          (env VIEW = unev | guides | minor | spec | excess | all (default all))

  _review/thick3d/<view>.png   1640 x 600 transparent stills: a 80 mm deep slab of wall (dark concrete block, wavy top) with the plaster layer on it, the cut face toward the viewer, soft floor shadow.
                               unev = plaster follows the wall, guides = flat plane at the screeds (two screed strips at the ends), minor = shallow flat layer, spec = specified flat layer, excess = thick build-up.
  _review/thick3d/layout.json  where the reference plane lands in the frame (normalised), for the page's dashed line
The profiles are read from the page's old drawing (viewBox units: x 20..400, y down, base at y 180); 1 unit = 1 mm here, heights are 180 - y. Drawn out of scale; no thickness figure is implied.
"""
import bpy, bmesh, math, json, os, sys
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv; VIEW = os.environ.get('VIEW', 'all')
OUT = os.path.join(ROOT, '_review', 'thick3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
PROF = json.load(open(os.path.join(ROOT, '_review', 'thick3d_layout.json')))
K = .4 if QUICK else 1.0; S = 0.001; D = 80.0; X0, X1 = 20.0, 400.0
LK = float(os.environ.get('LK', '1.0'))
VIEWS = ['unev', 'guides', 'minor', 'spec', 'excess']

def pnoise(rng, N, beta):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1; F *= f ** (-beta); F[0, 0] = 0
    o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)
def streak(rng, N, ax, ay):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w); fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    F *= np.exp(-((fx * ax) ** 2 + (fy * ay) ** 2)); o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)
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

def block_maps(N):
    """dark concrete block: charcoal with sand speckle and air pits (tile 120 mm)"""
    rng = np.random.default_rng(71); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.19, .19, .195)
    alb *= (1 + .14 * pnoise(rng, N, 1.0) + .08 * pnoise(rng, N, .4))[..., None]; alb *= (1 + .14 * pnoise(rng, N, .14))[..., None]
    h = .5 * pnoise(rng, N, .8) + .3 * pnoise(rng, N, 1.5)
    def grain(ix, m, d, col, lift):
        a = (m * .85)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift
    for _ in range(int(11000 * K)):
        g = rng.uniform(.08, .5); stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.6, 4.5), lambda ix, m, d, g=g: grain(ix, m, d, np.array([g, g * .99, g * .97]), rng.uniform(.2, .7)))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(1.0, 2.2) * c; alb[ix] *= (1 - .45 * m * c)[..., None]
    for _ in range(int(450 * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(4, 12), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .15, 1.0), np.clip(.8 + .1 * pnoise(rng, N, .6), .55, .95)

def plaster_maps(N, top):
    """plaster: warm cream paste full of sand grains. top=True: the trowelled upper face (soft float sweeps); False: the cut face (grains, pits, a few chips)"""
    rng = np.random.default_rng(72 if top else 73); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.74, .69, .60) if not top else (.72, .68, .61)
    alb *= (1 + .06 * pnoise(rng, N, 1.0) + .04 * pnoise(rng, N, .35))[..., None]
    sw = streak(rng, N, 26, 10) if top else .5 * pnoise(rng, N, 1.2)
    alb *= (1 + (.05 if top else .03) * sw)[..., None]
    h = .5 * sw + .25 * pnoise(rng, N, .7)
    cols = [np.array(c) for c in ((.92, .85, .72), (.45, .38, .30), (.78, .62, .44), (.6, .55, .48), (.96, .93, .86))]
    def grain(ix, m, d, col, lift):
        a = (m * .88)[..., None]; shade = (.86 + .26 * (1 - d))[..., None]; alb[ix] = alb[ix] * (1 - a) + col * shade * a; h[ix] += m * lift
    for _ in range(int((9000 if top else 14000) * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.6, 5.0 if top else 6.5), lambda ix, m, d, col=cols[rng.integers(5)] * rng.uniform(.92, 1.08): grain(ix, m, d, col, rng.uniform(.3, .9)))
    def pit(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.7, 1.6) * c; alb[ix] *= (1 - .45 * m * c)[..., None]
    for _ in range(int((400 if top else 650) * K)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2, 7), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .12, 1.0), np.clip(.9 + .05 * pnoise(rng, N, .6), .7, 1)

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
                scene.cycles.device = 'GPU'; print('[th] Cycles device:', kind); return
    except Exception as e: print('[th] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()
NS = 512 if QUICK else 1024
def textured(name, maps, nstr, spec=.35):
    a, n, r = maps
    ia = save_img(name + '_a', a, 'sRGB'); inn = save_img(name + '_n', n, 'Non-Color'); ir = save_img(name + '_r', r, 'Non-Color')
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N_, L_ = nt.nodes, nt.links; Pr = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img):
        t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t
    L_.new(tex(ia).outputs['Color'], Pr.inputs['Base Color']); L_.new(tex(ir).outputs['Color'], Pr.inputs['Roughness'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L_.new(tex(inn).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], Pr.inputs['Normal'])
    try: Pr.inputs['Specular IOR Level'].default_value = spec
    except Exception: pass
    return m
def plain(name, col, rough, metal=0.0):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal; return m

def smooth_profile(pts, step=.5):
    """pts: [(x, y_units)] every 10 units -> dense heights (mm above the base: 180 - y) with a Catmull-Rom curve"""
    xs = np.array([p[0] for p in pts]); hs = 180.0 - np.array([p[1] for p in pts]); out_x = np.arange(X0, X1 + 1e-6, step); out_h = np.empty_like(out_x)
    for k, x in enumerate(out_x):
        i = min(len(xs) - 2, max(0, int((x - X0) // 10))); t = (x - xs[i]) / (xs[i + 1] - xs[i])
        p0, p1, p2, p3 = hs[max(0, i - 1)], hs[i], hs[i + 1], hs[min(len(hs) - 1, i + 2)]
        out_h[k] = .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
    return out_x, out_h

def prism(name, xs, bot, top, mat, tile, inset=0.0):
    """a slab between two height curves, 80 mm deep (y from -D/2 to +D/2, front = -y); builds the front, back, top and the two ends (no bottom: it sits inside what is below)"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); n = len(xs); y0, y1 = -D / 2 - inset, D / 2 + inset
    def V(x, y, h): return bm.verts.new(Vector((x * S, y * S, h * S)))
    fb = [V(xs[i], y0, bot[i]) for i in range(n)]; ft = [V(xs[i], y0, top[i]) for i in range(n)]
    bb = [V(xs[i], y1, bot[i]) for i in range(n)]; bt = [V(xs[i], y1, top[i]) for i in range(n)]
    for i in range(n - 1):
        bm.faces.new((fb[i], fb[i + 1], ft[i + 1], ft[i]))              # front (faces -y)
        bm.faces.new((bb[i + 1], bb[i], bt[i], bt[i + 1]))              # back
        bm.faces.new((ft[i], ft[i + 1], bt[i + 1], bt[i]))              # top
    bm.faces.new((fb[0], ft[0], bt[0], bb[0])); bm.faces.new((fb[-1], bb[-1], bt[-1], ft[-1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        nrm = f.normal; ax = max(range(3), key=lambda i: abs(nrm[i]))
        for lp in f.loops:
            c = lp.vert.co / S; u, v = ((c.x, c.z) if ax == 1 else ((c.x, c.y) if ax == 2 else (c.y, c.z))); lp[uvl].uv = (u / tile, v / tile)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob
def box(name, x0, x1, y0, y1, z0, z1, mat, bevel=.4):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(Vector(((x0 + x1) / 2 * S, (y0 + y1) / 2 * S, (z0 + z1) / 2 * S))) @ Matrix.Diagonal(((x1 - x0) * S, (y1 - y0) * S, (z1 - z0) * S, 1)))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel * S, segments=2, affect='EDGES', profile=.6)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def build(view):
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    k = VIEWS.index(view); pr = PROF['v%d' % k]
    MB = textured('Block', block_maps(NS), 1.8, .35); MPs = textured('PlasterSection', plaster_maps(NS, False), 1.6, .3); MPt = textured('PlasterTop', plaster_maps(NS, True), 1.3, .3)
    GM = plain('Screed', (.86, .87, .89), .32, 1.0)
    xs, bgh = smooth_profile(pr['bgl']); _, tph = smooth_profile(pr['tpl'])
    guides = view != 'unev'
    # background: everything under its wavy top, one prism from the floor
    prism('Background', xs, np.zeros_like(xs), bgh, MB, 120.0)
    # plaster: between the wall's top and the plaster's top; its foot is sunk 0.2 mm into the wall and it stands 0.06 mm proud front and back, so nothing shares a plane with the block
    prism('Plaster', xs, bgh - .2, tph, MPs, 120.0, inset=.06)
    # the top face of the plaster is the trowelled one: a thin cap with the top material
    cap = prism('PlasterTop', xs, tph - .05, tph + .02, MPt, 120.0, inset=.06)
    if guides:
        plane = 180.0 - pr['tpl'][0][1]
        for gx in (X0 + .0, X1 - 6.0):
            box('Guide', gx, gx + 6.0, -D / 2 - 3, D / 2 + 3, 14, plane + 7.0, GM, .5)
    # floor: shadow catcher
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=2.0); fme = bpy.data.meshes.new('Floor'); bm.to_mesh(fme); bm.free()
    fl = bpy.data.objects.new('Floor', fme); scene.collection.objects.link(fl); fl.location = Vector((210 * S, 0, -.02 * S)); fl.is_shadow_catcher = True
    def area(name, loc, w, h, energy, color, look):
        ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
        o = bpy.data.objects.new(name, ld); scene.collection.objects.link(o); o.location = Vector(loc) * S; o.rotation_euler = ((Vector(look) * S) - o.location).to_track_quat('-Z', 'Y').to_euler()
    area('Key', (-260, -520, 520), .55, .45, 150 * LK, (1.0, .985, .965), (210, 0, 50)); area('Fill', (700, -420, 300), 1.2, .9, 30 * LK, (.95, .97, 1.0), (210, 0, 50)); area('Top', (210, -80, 900), 1.2, .9, 22 * LK, (1, 1, 1), (210, 0, 50))
    wd = bpy.data.worlds.new('W'); scene.world = wd
    try: wd.use_nodes = True
    except Exception: pass
    bg = next(n for n in wd.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.93, .93, .94, 1); bg.inputs['Strength'].default_value = .3
    try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception: scene.view_settings.view_transform = 'AgX'
    scene.cycles.use_denoising = True; scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'
    PITCH = math.radians(float(os.environ.get('PITCH', '13'))); cp, sp = math.cos(PITCH), math.sin(PITCH)
    FWm = 440.0; AR = 1640 / 600; FHm = FWm / AR
    cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = FWm * S; cam.clip_start = .05; cam.clip_end = 30
    co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
    T = Vector((210 * S, 0, float(os.environ.get('TZ', '58')) * S)); co.location = T + Vector((0, -3000 * cp, 3000 * sp)) * S; co.rotation_euler = (math.radians(90) - PITCH, 0, 0)
    W = 820 if QUICK else 1640; scene.render.resolution_x = W; scene.render.resolution_y = int(W / AR); scene.render.resolution_percentage = 100
    scene.cycles.samples = 64 if QUICK else 320
    scene.render.filepath = os.path.join(OUT, view + '.png'); bpy.ops.render.render(write_still=True); print('[th] rendered', view)
    def pr_(x, h): v = world_to_camera_view(scene, co, Vector((x * S, -D / 2 * S, h * S))); return [round(v.x, 4), round(1 - v.y, 4)]
    return {'plane': [pr_(X0, 180 - pr['tpl'][0][1]), pr_(X1, 180 - pr['tpl'][0][1])], 'floor': pr_(210, 0)}

lays = {}
for v in (VIEWS if VIEW == 'all' else [VIEW]): lays[v] = build(v)
lp = os.path.join(OUT, 'layout.json'); old = json.load(open(lp)) if os.path.exists(lp) else {}; old.update(lays); json.dump(old, open(lp, 'w'), indent=1)
print('[th] done')
