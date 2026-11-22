"""OM GROUP - crushed-stone pile for the "Nominal size" card (10mm aggregates page).

  blender -b --factory-startup -P scripts/stonepile3d/build-pile.py -- <repo root> [--quick]

Output: _review/stonepile3d/pile.png  (RGBA, transparent background, soft contact shadow only)
        _review/stonepile3d/pile-meta.json
A heap of ~26 fractured stones (sharp planar facets, chipped bevelled edges, quartz and biotite specks, blue-grey charcoal tone), dropped
by a deterministic "lowest of several drops, pulled toward the centre" rule so the big stones sit low and the small ones on top.
Units are metres. Camera: orthographic, pitched down 17 degrees, framed to the pile.
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'stonepile3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)

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
                scene.cycles.device = 'GPU'; print('[pile] Cycles device:', kind); return
    except Exception as e: print('[pile] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()
def V(x, y, z): return Vector((x, -z, y))           # three.js-style (y up, z toward the viewer) -> blender

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

def stone_maps(N=1024, seed=5):
    """Fine-grained igneous crushed stone: a dark blue-grey matrix, bright quartz / feldspar specks, near-black biotite flecks, pits and a
    hairline crystalline relief. Periodic, so it tiles."""
    rng = np.random.default_rng(seed)
    alb = np.empty((N, N, 3)); alb[:] = (.30, .31, .335)
    alb *= (1 + .16 * pnoise(rng, N, 1.2) + .09 * pnoise(rng, N, .5))[..., None]
    alb *= (1 + .26 * pnoise(rng, N, .12))[..., None]
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
    for _ in range(int(2800 * k)):                          # quartz / feldspar: bright specks, some large and sparkly
        r = rng.uniform(1.0, 3.4) * (1.7 if rng.random() < .05 else 1); g = rng.uniform(.46, .76)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g * .99, g * .98]), rng.uniform(.2, .5)))
    for _ in range(int(2400 * k)):                          # biotite / hornblende: near-black flecks
        r = rng.uniform(1.4, 4.6); g = rng.uniform(.04, .12)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g, g * 1.05]), rng.uniform(.05, .25)))
    for _ in range(int(900 * k)):                           # pits
        r = rng.uniform(2.5, 8)
        def pit(ix, m, d): h[ix] -= m * rng.uniform(.6, 1.2) * np.sqrt(np.clip(1 - d * d, 0, 1)); alb[ix] *= (1 - .38 * m)[..., None]
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .09, 1.0), np.clip(.58 + .08 * pnoise(rng, N, .6), .35, .9)

alb, nrm, rgh = stone_maps(512 if QUICK else 1024)
img_a = save_img('stone_albedo', alb, 'sRGB'); img_n = save_img('stone_normal', nrm, 'Non-Color'); img_r = save_img('stone_rough', rgh, 'Non-Color')

# ---------------------------------------------------------------- material: texture, per-stone tone, lighter chipped edges
m = bpy.data.materials.new('Stone')
try: m.use_nodes = True
except Exception: pass
nt = m.node_tree; N_, L_ = nt.nodes, nt.links; P = next(n for n in N_ if n.type == 'BSDF_PRINCIPLED')
uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
def tex(img):
    t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t
ta = tex(img_a); tn = tex(img_n); tr = tex(img_r)
oi = N_.new('ShaderNodeObjectInfo'); mp = N_.new('ShaderNodeMapRange'); mp.inputs['To Min'].default_value = .55; mp.inputs['To Max'].default_value = 1.35; L_.new(oi.outputs['Random'], mp.inputs['Value'])
mt = N_.new('ShaderNodeMix'); mt.data_type = 'RGBA'; mt.blend_type = 'MULTIPLY'; mt.inputs['Factor'].default_value = 1.0; L_.new(ta.outputs['Color'], mt.inputs[6]); L_.new(mp.outputs['Result'], mt.inputs[7])
# chipped, worn edges catch the light: pointiness of the (bevelled) mesh lifts the colour
geo = N_.new('ShaderNodeNewGeometry'); ramp = N_.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = .50; ramp.color_ramp.elements[1].position = .62
L_.new(geo.outputs['Pointiness'], ramp.inputs['Fac'])
ew = N_.new('ShaderNodeMix'); ew.data_type = 'RGBA'; ew.blend_type = 'MIX'; ew.inputs[7].default_value = (.78, .79, .82, 1)
L_.new(ramp.outputs['Color'], ew.inputs['Factor']); L_.new(mt.outputs[2], ew.inputs[6]); ew.inputs['Factor'].default_value = 0
# the ramp output is a colour; use its red channel as the factor
sep = N_.new('ShaderNodeSeparateColor'); L_.new(ramp.outputs['Color'], sep.inputs['Color']); L_.new(sep.outputs['Red'], ew.inputs['Factor'])
fac = N_.new('ShaderNodeMath'); fac.operation = 'MULTIPLY'; fac.inputs[1].default_value = float(os.environ.get('EW', '0.0')); L_.new(sep.outputs['Red'], fac.inputs[0]); L_.new(fac.outputs['Value'], ew.inputs['Factor'])
L_.new(ew.outputs[2], P.inputs['Base Color']); L_.new(tr.outputs['Color'], P.inputs['Roughness'])
nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.1; L_.new(tn.outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], P.inputs['Normal'])
P.inputs['Metallic'].default_value = 0.0
try: P.inputs['Specular IOR Level'].default_value = .55
except Exception: pass
MAT = m

# ---------------------------------------------------------------- stones
def make_rock(seed):
    rng = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    sx, sy, sz = rng.uniform(1.0, 1.25), rng.uniform(.70, .95), rng.uniform(.85, 1.15)
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
    except Exception as ex: print('[pile] bevel', ex)
    for f in bm.faces: f.smooth = False
    me = bpy.data.meshes.new('rock_%d' % seed); bm.to_mesh(me); bm.free(); me.materials.append(MAT)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co; u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z))
            lp[uvl].uv = (u * .36 + (.137 * f.index) % 1, v * .36 + .31 * (f.index % 7) / 7)
    b2.to_mesh(me); b2.free(); return me
ROCKS = [make_rock(s) for s in range(40, 52)]

MODE = os.environ.get('MODE', 'pile')          # 'pile' = the heap of the Nominal-size card; 'sieve' = six loose stones lying on a sieve mesh
rng = random.Random(7 if MODE == 'pile' else 19)
radii = [.047] * 2 + [.040] * 3 + [.034] * 5 + [.029] * 7 + [.024] * 6 + [.019] * 3                 # metres: a spread of sizes within one fraction
if MODE == 'sieve': radii = [.034, .031, .028, .026, .024, .021]
radii = [r * rng.uniform(.92, 1.08) for r in radii]; radii.sort(reverse=True)
placed = []
for r in radii:
    best = None
    for _ in range(40):
        x = rng.gauss(0, .07 if MODE == 'pile' else .06); z = rng.gauss(0, .05 if MODE == 'pile' else .034); y = r * .86
        for (px, py, pz, pr) in placed:
            d2 = (px - x) ** 2 + (pz - z) ** 2; m_ = (pr + r) * .86
            if d2 < m_ * m_: y = max(y, py + math.sqrt(m_ * m_ - d2))
        dist = math.hypot(x, z * 1.35); cone = (.125 if MODE == 'pile' else .06) * max(0.0, 1 - dist / .155)      # the angle of repose: a stone may not stand above the cone
        sc = y + 7 * max(0.0, y - r * .86 - cone) + .45 * dist
        if best is None or sc < best[0]: best = (sc, x, y, z)
    placed.append((best[1], best[2], best[3], r))
print('[pile] stones', len(placed))

objs = []
for i, (x, y, z, r) in enumerate(placed):
    ob = bpy.data.objects.new('s%02d' % i, ROCKS[i % len(ROCKS)]); scene.collection.objects.link(ob)
    ob.location = V(x, y - r * .1, z); ob.rotation_euler = (rng.uniform(0, 6.28), rng.uniform(0, 6.28), rng.uniform(0, 6.28)); ob.scale = (r,) * 3; objs.append(ob)

# ---------------------------------------------------------------- floor (shadow catcher), lights, camera
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3.0); me = bpy.data.meshes.new('Floor'); bm.to_mesh(me); bm.free()
floor = bpy.data.objects.new('Floor', me); scene.collection.objects.link(floor); floor.is_shadow_catcher = True
def area(name, loc, w, h, energy, color=(1, 1, 1), look=(0, .05, 0)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = V(*loc); ob.rotation_euler = (V(*look) - ob.location).to_track_quat('-Z', 'Y').to_euler(); return ob
LK = float(os.environ.get('LK', '0.32'))
area('Key', (-.55, .75, .55), .55, .45, 70 * LK, (1.0, .985, .965))
area('Fill', (.8, .35, .7), .9, .6, 16 * LK, (.95, .97, 1.0))
area('Rim', (.2, .5, -.7), 1.0, .3, 22 * LK)
area('Top', (0, 1.0, .1), .9, .5, 14 * LK)
world = bpy.data.worlds.new('W'); scene.world = world
try: world.use_nodes = True
except Exception: pass
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.92, .92, .93, 1); bg.inputs['Strength'].default_value = float(os.environ.get('WK', '0.28'))
try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
except Exception: scene.view_settings.view_transform = 'AgX'
scene.cycles.use_denoising = True; scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'

PITCH = math.radians(17.0)
cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.clip_start = .05; cam.clip_end = 20
cam_ob = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(cam_ob); scene.camera = cam_ob
# frame the pile: view-space extent of every stone (centre +- radius), plus room for the shadow below
sp, cp = math.sin(PITCH), math.cos(PITCH)
us = [(x - r * 1.05, x + r * 1.05) for (x, y, z, r) in placed]; vs = [(y * cp - z * sp - r * 1.05, y * cp - z * sp + r * 1.05) for (x, y, z, r) in placed]
u0, u1 = min(a for a, b in us), max(b for a, b in us); v0, v1 = min(a for a, b in vs) - .018, max(b for a, b in vs)
ASPECT = 2.0 if MODE == 'pile' else 2.7; wU = max((u1 - u0) / .93, (v1 - v0) / .90 * ASPECT); cu, cv = (u0 + u1) / 2, (v0 + v1) / 2
cam.ortho_scale = wU
# camera position: along the view direction from the target point (cu, ., .) at height such that the view-space v of the target is cv
tgt = Vector((cu, 0, 0))
dirv = Vector((0, sp, cp))                                   # three.js: from target toward camera (up and toward the viewer)
camp = tgt + dirv * 6 + Vector((0, 0, 0)); camp.y += (cv / cp) - 0     # shift so the view-space centre lands on cv (v = y cos - z sin)
cam_ob.location = V(camp.x, camp.y, camp.z); cam_ob.rotation_euler = (math.radians(90) - PITCH, 0, 0)
W = 900 if QUICK else 2000
scene.render.resolution_x = W; scene.render.resolution_y = int(W / ASPECT); scene.render.resolution_percentage = 100
scene.cycles.samples = 64 if QUICK else 384
scene.render.filepath = os.path.join(OUT, 'pile.png' if MODE == 'pile' else 'pile-' + MODE + '.png'); bpy.ops.render.render(write_still=True)
json.dump({'aspect': ASPECT, 'wU': wU, 'stones': len(placed)}, open(os.path.join(OUT, 'pile-meta.json'), 'w'))
if MODE == 'pile': bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'pile.blend'))
print('[pile] done')
