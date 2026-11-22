"""OM GROUP - "Single-sized vs graded 12.5 mm" sample trays (12.5mm aggregates page, grade lab).

  blender -b --factory-startup -P scripts/stonepile3d/build-trays.py -- <repo root> [--quick]

Output: _review/stonepile3d/trays.png  (RGBA, transparent background, soft contact shadows only)
Two white enamel trays of fractured crushed stone, seen from above-front. Left: single-sized, a narrow band of particle sizes. Right: graded, a
wide spread from fine to coarse. The frame is the page's figure frame (viewBox 0 20 1000 520, 1 unit = 1 viewBox unit), so the page's SVG overlay
(highlight rings, captions) lines up with it. Stones are placed by deterministic gravity packing (lowest of several random drops wins, so voids fill first).
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'stonepile3d'); TEX = os.path.join(OUT, 'tex-trays'); os.makedirs(TEX, exist_ok=True)
U = 0.001                                           # one figure unit in metres

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
                scene.cycles.device = 'GPU'; print('[trays] Cycles device:', kind); return
    except Exception as e: print('[trays] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()
def V(x, y, z): return Vector((x * U, -z * U, y * U))     # figure units (x right, y up, z toward the viewer) -> blender metres

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

def stone_maps(N=1024, seed=15):
    """Medium-grey crushed granite: a lighter matrix than the pile card, bright quartz / feldspar specks, dark biotite flecks, weathered tone patches."""
    rng = np.random.default_rng(seed)
    alb = np.empty((N, N, 3)); alb[:] = (.46, .465, .48)
    alb *= (1 + .15 * pnoise(rng, N, 1.2) + .08 * pnoise(rng, N, .5))[..., None]
    alb *= (1 + .24 * pnoise(rng, N, .12))[..., None]
    h = .5 * pnoise(rng, N, 1.0) + .35 * pnoise(rng, N, .3) + .15 * pnoise(rng, N, 0.05)
    k = .4 if QUICK else 1.0
    def stamp(cx, cy, r, fn):
        R = int(math.ceil(r * 1.4 + 2)); xs = np.arange(int(cx) - R, int(cx) + R + 1); ys = np.arange(int(cy) - R, int(cy) + R + 1)
        X, Y = np.meshgrid(xs + .5 - cx, ys + .5 - cy); a = rng.uniform(0, 3.14); u = X * math.cos(a) + Y * math.sin(a); v = (-X * math.sin(a) + Y * math.cos(a)) * rng.uniform(.65, 1.5)
        th = np.arctan2(v, u); rr = r * (1 + .25 * np.sin(2 * th + rng.uniform(0, 6.3)) + .15 * np.sin(3 * th + rng.uniform(0, 6.3)))
        d = np.sqrt(u * u + v * v) / rr; m = np.clip((1 - d) * rr / 1.0, 0, 1)
        if m.max() > 0: fn(np.ix_(ys % N, xs % N), m, np.clip(d, 0, 1))
    def fleck(ix, m, d, col, lift):
        a = (m * .92)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift * np.sqrt(np.clip(1 - d * d, 0, 1))
    for _ in range(int(3400 * k)):
        r = rng.uniform(1.0, 3.4) * (1.7 if rng.random() < .05 else 1); g = rng.uniform(.58, .88)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g * .99, g * .98]), rng.uniform(.2, .5)))
    for _ in range(int(2600 * k)):
        r = rng.uniform(1.4, 4.4); g = rng.uniform(.05, .14)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g, g * 1.05]), rng.uniform(.05, .25)))
    for _ in range(int(900 * k)):
        r = rng.uniform(2.5, 8)
        def pit(ix, m, d): h[ix] -= m * rng.uniform(.6, 1.2) * np.sqrt(np.clip(1 - d * d, 0, 1)); alb[ix] *= (1 - .36 * m)[..., None]
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .09, 1.0), np.clip(.60 + .08 * pnoise(rng, N, .6), .35, .9)

alb, nrm, rgh = stone_maps(512 if QUICK else 1024)
img_a = save_img('stone_albedo', alb, 'sRGB'); img_n = save_img('stone_normal', nrm, 'Non-Color'); img_r = save_img('stone_rough', rgh, 'Non-Color')

# ---------------------------------------------------------------- materials
m = bpy.data.materials.new('Stone')
try: m.use_nodes = True
except Exception: pass
nt = m.node_tree; N_, L_ = nt.nodes, nt.links; P = next(n for n in N_ if n.type == 'BSDF_PRINCIPLED')
uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
def tex(img):
    t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t
ta = tex(img_a); tn = tex(img_n); tr = tex(img_r)
oi = N_.new('ShaderNodeObjectInfo'); mp = N_.new('ShaderNodeMapRange'); mp.inputs['To Min'].default_value = .50; mp.inputs['To Max'].default_value = 1.12; L_.new(oi.outputs['Random'], mp.inputs['Value'])
mt = N_.new('ShaderNodeMix'); mt.data_type = 'RGBA'; mt.blend_type = 'MULTIPLY'; mt.inputs['Factor'].default_value = 1.0; L_.new(ta.outputs['Color'], mt.inputs[6]); L_.new(mp.outputs['Result'], mt.inputs[7])
L_.new(mt.outputs[2], P.inputs['Base Color']); L_.new(tr.outputs['Color'], P.inputs['Roughness'])
nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.1; L_.new(tn.outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], P.inputs['Normal'])
try: P.inputs['Specular IOR Level'].default_value = .5
except Exception: pass
STONE = m

def simple(name, color, rough, spec=.5):
    mm = bpy.data.materials.new(name)
    try: mm.use_nodes = True
    except Exception: pass
    p = next(n for n in mm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Roughness'].default_value = rough
    try: p.inputs['Specular IOR Level'].default_value = spec
    except Exception: pass
    return mm
ENAMEL = simple('Enamel', (.72, .71, .68), .30, .6); FLOOR = simple('TrayFloor', (.74, .73, .70), .55, .4)

# ---------------------------------------------------------------- stones
def make_rock(seed):
    rng = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    sx, sy, sz = rng.uniform(1.0, 1.25), rng.uniform(.68, .95), rng.uniform(.85, 1.15)
    planes = []
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
    except Exception as ex: print('[trays] bevel', ex)
    for f in bm.faces: f.smooth = False
    me = bpy.data.meshes.new('rock_%d' % seed); bm.to_mesh(me); bm.free(); me.materials.append(STONE)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co; u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z))
            lp[uvl].uv = (u * .36 + (.137 * f.index) % 1, v * .36 + .31 * (f.index % 7) / 7)
    b2.to_mesh(me); b2.free(); return me
ROCKS = [make_rock(s) for s in range(60, 74)]

# ---------------------------------------------------------------- trays: plan 440 x 388, wall 22, centres at x = -240 and +240 (figure units)
TW, TD, WALL, TH_ = 440.0, 388.0, 22.0, 9.0          # inner width, depth, wall height, wall thickness
CENTRES = (-240.0, 240.0)
def tray(cx, name):
    bm = bmesh.new()
    def box(c, s):
        bmesh.ops.create_cube(bm, size=1.0, matrix=__import__('mathutils').Matrix.Translation(V(*c)) @ __import__('mathutils').Matrix.Diagonal((s[0] * U, s[2] * U, s[1] * U, 1)))
    ow, od = TW + 2 * TH_, TD + 2 * TH_
    box((cx, -3, -TD / 2), (ow, 6, od))                                   # base slab
    box((cx, WALL / 2, -TD - TH_ / 2), (ow, WALL, TH_))                   # back wall
    box((cx, WALL / 2, TH_ / 2), (ow, WALL, TH_))                         # front wall (z from 0 to +TH_)
    box((cx - TW / 2 - TH_ / 2, WALL / 2, -TD / 2), (TH_, WALL, TD))      # left wall
    box((cx + TW / 2 + TH_ / 2, WALL / 2, -TD / 2), (TH_, WALL, TD))      # right wall
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); me.materials.append(ENAMEL)
    for p in me.polygons: p.use_smooth = False
    bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = 2.2 * U; bv.segments = 3; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(30)
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier=bv.name)
    for p in me.polygons: p.use_smooth = True
    # the inner floor (a slightly different tone so the tray reads as a dish)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); me2 = bpy.data.meshes.new(name + 'Floor'); bm.to_mesh(me2); bm.free()
    fl = bpy.data.objects.new(name + 'Floor', me2); scene.collection.objects.link(fl); fl.location = V(cx, .15, -TD / 2); fl.scale = (TW * U, TD * U, 1); me2.materials.append(FLOOR)
    return ob
tray(CENTRES[0], 'TrayA'); tray(CENTRES[1], 'TrayB')

# ---------------------------------------------------------------- gravity packing in a tray (vectorised)
def pack(cx, radii_fn, count, seed, top):
    rng = random.Random(seed); P = np.zeros((0, 4)); out = []
    xl, xr, zb, zf = cx - TW / 2 + 1, cx + TW / 2 - 1, -TD + 1, -1.0; fails = 0
    while len(out) < count and fails < 220:
        best = None; r = radii_fn(rng)               # the size is drawn once per stone, so coarse stones are not out-competed by the fines for the low spots
        for _ in range(26):
            x = rng.uniform(xl + r * .9, xr - r * .9); z = rng.uniform(zb + r * .9, zf - r * .9); y = r * .86
            if len(P):
                d2 = (P[:, 0] - x) ** 2 + (P[:, 2] - z) ** 2; m_ = (P[:, 3] + r) * .76; hit = d2 < m_ * m_
                if hit.any(): y = max(y, float((P[hit, 1] + np.sqrt(m_[hit] ** 2 - d2[hit])).max()))
            if y + r * .5 <= top and (best is None or y < best[1]): best = (x, y, z, r)
        if best is None: fails += 1; continue
        P = np.vstack([P, best]); out.append(best); fails = 0
    print('[trays] stones', len(out)); return out

def r_single(rng): return rng.choice([13.6, 14.4, 15.2]) * rng.uniform(.95, 1.05)                       # a narrow band of sizes
GR = [6.6] * 4 + [8.6] * 4 + [11.0] * 3 + [14.5] * 3 + [19.0] * 2
def r_graded(rng): return rng.choice(GR) * rng.uniform(.93, 1.07)                                         # fine to coarse
singles = pack(CENTRES[0], r_single, 99999, 3, 40.0)
graded = pack(CENTRES[1], r_graded, 99999, 5, 34.0)

rng = random.Random(11)
for tag, items in (('S', singles), ('G', graded)):
    for i, (x, y, z, r) in enumerate(items):
        ob = bpy.data.objects.new('%s%04d' % (tag, i), ROCKS[(i * 7 + (3 if tag == 'G' else 0)) % len(ROCKS)]); scene.collection.objects.link(ob)
        ob.location = V(x, y - r * .08, z); ob.rotation_euler = (rng.uniform(0, 6.28), rng.uniform(0, 6.28), rng.uniform(0, 6.28)); ob.scale = (r * U,) * 3

# ---------------------------------------------------------------- floor shadow catcher, lights, camera
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3.0); me = bpy.data.meshes.new('Ground'); bm.to_mesh(me); bm.free()
ground = bpy.data.objects.new('Ground', me); scene.collection.objects.link(ground); ground.location = V(0, -6.5, 0); ground.is_shadow_catcher = True
def area(name, loc, w, h, energy, color=(1, 1, 1), look=(0, 0, -190)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = V(*loc); ob.rotation_euler = (V(*look) - ob.location).to_track_quat('-Z', 'Y').to_euler(); return ob
LK = float(os.environ.get('LK', '0.42'))
area('Key', (-700, 900, 300), .35, .28, 120 * LK, (1.0, .985, .965))
area('Fill', (900, 450, 600), 1.2, .8, 22 * LK, (.95, .97, 1.0))
area('Top', (0, 1100, -150), 1.4, 1.0, 14 * LK)
world = bpy.data.worlds.new('W'); scene.world = world
try: world.use_nodes = True
except Exception: pass
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.93, .93, .94, 1); bg.inputs['Strength'].default_value = float(os.environ.get('WK', '0.30'))
try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
except Exception: scene.view_settings.view_transform = 'AgX'
scene.cycles.use_denoising = True; scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'

PITCH = math.radians(60.0); sp, cp = math.sin(PITCH), math.cos(PITCH)
cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = 1000.0 * U; cam.clip_start = .05; cam.clip_end = 20
cam_ob = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(cam_ob); scene.camera = cam_ob
# the front bottom edge of a tray (y = 0, z = 0) lands on figure row 408; the frame centre is row 280 of the viewBox (0 20 1000 520)
Ty = (408 - 280) / cp
camp = Vector((0, Ty + 8000 * sp, 8000 * cp))
cam_ob.location = V(*camp); cam_ob.rotation_euler = (math.radians(90) - PITCH, 0, 0)
W = 1000 if QUICK else 2400
scene.render.resolution_x = W; scene.render.resolution_y = int(W * 520 / 1000); scene.render.resolution_percentage = 100
scene.cycles.samples = 64 if QUICK else 320
scene.render.filepath = os.path.join(OUT, 'trays.png'); bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'trays.blend'))
print('[trays] done')
