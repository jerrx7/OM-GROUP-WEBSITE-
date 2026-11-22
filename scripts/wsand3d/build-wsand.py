"""OM GROUP - Washed Sand page, "Two Different Processing Functions": two Blender stills (washing, screening).

  VIEW=wash|screen|all blender -b --factory-startup -P scripts/wsand3d/build-wsand.py -- <repo root> [--quick]

  _review/wsand3d/wash.png    a steel washing trough with a clear front panel: wet sand heap, spray jets from a header pipe, silty water that thickens toward
                              the overflow lip, and the cloudy overflow stream falling into a sump.
  _review/wsand3d/screen.png  a two-deck vibrating screen (woven-wire decks, alpha-cut apertures: 32 mm top, 12 mm lower): the coarse stones ride on the top deck and leave
                              as a pile, the mid stones ride on the lower deck, the fines fall through both decks onto a sand heap under the machine.
  _review/wsand3d/layout.json normalised anchor points in each frame (used for the page overlay).
Transparent background with a soft floor shadow. Frame 1.37 : 1 (the page's panel ratio). 1 unit = 1 m. Nothing here is to scale of any real plant.
"""
import bpy, bmesh, math, os, sys, random, json
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'wsand3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
VIEW = os.environ.get('VIEW', 'all'); LK = float(os.environ.get('LK', '0.42')); WK = float(os.environ.get('WK', '0.30'))

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
                scene.cycles.device = 'GPU'; print('[wsand] Cycles device:', kind); return
    except Exception as e: print('[wsand] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()
def V(x, y, z): return Vector((x, -z, y))          # x right, y up, z toward the viewer  ->  blender

# ------------------------------------------------------------------ texture maths
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
NS = 512 if QUICK else 1024

def stone_maps(N=1024, seed=5):
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.34, .335, .33)
    alb *= (1 + .16 * pnoise(rng, N, 1.2) + .09 * pnoise(rng, N, .5))[..., None]; alb *= (1 + .26 * pnoise(rng, N, .12))[..., None]
    h = .5 * pnoise(rng, N, 1.0) + .35 * pnoise(rng, N, .3) + .15 * pnoise(rng, N, 0.05)
    def fleck(ix, m, d, col, lift):
        a = (m * .92)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift * np.sqrt(np.clip(1 - d * d, 0, 1))
    for _ in range(int(2800 * K)):
        r = rng.uniform(1.0, 3.4) * (1.7 if rng.random() < .05 else 1); g = rng.uniform(.46, .76)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g * .99, g * .96]), rng.uniform(.2, .5)))
    for _ in range(int(2400 * K)):
        r = rng.uniform(1.4, 4.6); g = rng.uniform(.04, .12)
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g, g * 1.05]), rng.uniform(.05, .25)))
    for _ in range(int(900 * K)):
        def pit(ix, m, d): h[ix] -= m * rng.uniform(.6, 1.2) * np.sqrt(np.clip(1 - d * d, 0, 1)); alb[ix] *= (1 - .38 * m)[..., None]
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2.5, 8), pit)
    return np.clip(alb, 0, 1), normal_from_height(h * .09, 1.0), np.clip(.58 + .08 * pnoise(rng, N, .6), .35, .9)

def sand_maps(N=1024, seed=15, dark=1.0):
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.27, .25, .22)
    alb *= (1 + .10 * pnoise(rng, N, 1.0) + .06 * pnoise(rng, N, .4))[..., None]; alb *= (1 + .08 * pnoise(rng, N, .12))[..., None]
    h = .5 * pnoise(rng, N, .8) + .3 * pnoise(rng, N, 1.6)
    cols = [np.array(c) for c in ((.74, .69, .60), (.36, .34, .31), (.13, .12, .12), (.60, .49, .36), (.48, .44, .38), (.82, .77, .68), (.30, .26, .21))]
    def grain(ix, m, d, col, lift):
        a = (m * .95)[..., None]; shade = (.82 + .3 * (1 - d))[..., None]; alb[ix] = alb[ix] * (1 - a) + col * shade * a; h[ix] += m * lift
    for _ in range(int(26000 * K)):
        col = cols[rng.integers(len(cols))] * rng.uniform(.9, 1.1)
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2.2, 6.5), lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(.3, 1.0)))
    return np.clip(alb * (dark if np.ndim(dark) == 0 else dark[None, None, :]), 0, 1), normal_from_height(h * .16, 1.0), np.clip(.86 + .06 * pnoise(rng, N, .6), .6, 1)

def wire_maps(cells=8, N=1024, wire=.14, seed=2):
    """plain-weave galvanised wire cloth: one tile = cells x cells apertures. returns albedo, normal, roughness, alpha (apertures are see-through)"""
    rng = np.random.default_rng(seed); p = N / cells; y, x = np.mgrid[0:N, 0:N].astype(np.float64)
    fx = (x % p) / p - .5; fy = (y % p) / p - .5; w = wire / 2
    cellx = (x // p).astype(int); celly = (y // p).astype(int); over = ((cellx + celly) % 2 == 0)
    dh = np.clip(1 - np.abs(fx) / w, 0, 1); dv = np.clip(1 - np.abs(fy) / w, 0, 1)           # vertical wire runs along y at the cell centre line in x ; horizontal wire along x
    prof = lambda t: np.sqrt(np.clip(1 - (1 - t) ** 2, 0, 1))
    hv = prof(dh); hh = prof(dv)                                                              # a round wire cross-section
    along_v = .35 * np.cos(fy * 2 * math.pi) ; along_h = .35 * np.cos(fx * 2 * math.pi)       # crimp: the wire rides up and over
    zv = np.where(hv > 0, hv * .5 + np.where(over, 1, -1) * along_v * .5, -9); zh = np.where(hh > 0, hh * .5 + np.where(over, -1, 1) * along_h * .5, -9)
    h = np.maximum(zv, zh); cov = np.maximum(hv > 0, hh > 0); h = np.where(cov, h, -.5)
    alpha = np.clip(np.maximum(dh, dv) * 6, 0, 1)
    g = .62 + .12 * pnoise(rng, N, .9) + .05 * pnoise(rng, N, .3); g = np.clip(g, .35, .9)
    alb = np.dstack([g * .97, g * 1.0, g * 1.03]) * (1 - .22 * (1 - np.clip(np.maximum(hv, hh), 0, 1))[..., None])
    rgh = np.clip(.38 + .1 * pnoise(rng, N, .8), .2, .7)
    return np.clip(alb, 0, 1), normal_from_height(h * 3.2, 1.0), rgh, alpha

def mat_pbr(name, maps, nstr=1.0, spec=.5, metal=0.0, alpha=None, tint=False):
    a, n, r = maps[:3]
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
        oi = N_.new('ShaderNodeObjectInfo'); mp = N_.new('ShaderNodeMapRange'); mp.inputs['To Min'].default_value = .55; mp.inputs['To Max'].default_value = 1.15; L_.new(oi.outputs['Random'], mp.inputs['Value'])
        mt = N_.new('ShaderNodeMix'); mt.data_type = 'RGBA'; mt.blend_type = 'MULTIPLY'; mt.inputs['Factor'].default_value = 1.0
        L_.new(col, mt.inputs[6]); L_.new(mp.outputs['Result'], mt.inputs[7]); col = mt.outputs[2]
    L_.new(col, P.inputs['Base Color']); L_.new(tex(imgs[2]).outputs['Color'], P.inputs['Roughness'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L_.new(tex(imgs[1]).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], P.inputs['Normal'])
    try: P.inputs['Specular IOR Level'].default_value = spec
    except Exception: pass
    P.inputs['Metallic'].default_value = metal
    if alpha is not None:
        ai = save_img(name + '_al', alpha, 'Non-Color'); L_.new(tex(ai).outputs['Color'], P.inputs['Alpha'])
    return m

def mat_plain(name, col, rough=.5, metal=0.0, bump=0.0, spec=.5):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; P = next(x for x in nt.nodes if x.type == 'BSDF_PRINCIPLED')
    P.inputs['Base Color'].default_value = (*col, 1); P.inputs['Roughness'].default_value = rough; P.inputs['Metallic'].default_value = metal
    try: P.inputs['Specular IOR Level'].default_value = spec
    except Exception: pass
    if bump > 0:                                      # fine procedural grain so painted / galvanised steel is not a flat colour
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 900; nz.inputs['Detail'].default_value = 6
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = .0008
        nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], P.inputs['Normal'])
        nz2 = nt.nodes.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 7; nz2.inputs['Detail'].default_value = 3
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = .35
        mx.inputs[6].default_value = (*col, 1); nt.links.new(nz2.outputs['Fac'], mx.inputs[7]); nt.links.new(mx.outputs[2], P.inputs['Base Color'])
    return m

# ------------------------------------------------------------------ geometry helpers
def finish(ob, mat, smooth=True, bevel=0.0):
    if mat is not None: ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = smooth
    if bevel > 0:
        md = ob.modifiers.new('bv', 'BEVEL'); md.width = bevel; md.segments = 2; md.limit_method = 'ANGLE'
    return ob
def new_obj(name, me): ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); return ob
def box(name, x0, x1, y0, y1, z0, z1, mat, bevel=.0015, smooth=False):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((x0 if v.co.x < 0 else x1, -(z0 if v.co.y > 0 else z1) if False else (-z1 if v.co.y < 0 else -z0), y0 if v.co.z < 0 else y1))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me)
    me.uv_layers.new(name='UVMap'); return finish(ob, mat, smooth, bevel)
def cyl(name, p0, p1, r, mat, seg=24, r1=None, smooth=True):
    a = V(*p0); b = V(*p1); d = b - a; bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=(r if r1 is None else r1), depth=d.length)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me)
    ob.location = (a + b) / 2; ob.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); me.uv_layers.new(name='UVMap'); return finish(ob, mat, smooth)
def sphere(name, c, r, mat, sub=2, sc=(1, 1, 1)):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me); ob.location = V(*c); ob.scale = sc; return finish(ob, mat, True)

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
    except Exception as ex: print('[wsand] bevel', ex)
    for f in bm.faces: f.smooth = False
    return bm

def rock_mesh(seed, mat, name):
    """a unit rock (mean dimension 1) centred on its own centroid, box-projected UVs"""
    bm = make_rock(seed)
    c = sum((v.co for v in bm.verts), Vector()) / len(bm.verts)
    for v in bm.verts: v.co -= c
    dims = sorted([max(v.co[i] for v in bm.verts) - min(v.co[i] for v in bm.verts) for i in range(3)]); s = 3 / sum(dims)
    for v in bm.verts: v.co *= s
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c2 = lp.vert.co * 1.0; u, v = (c2.x, c2.y) if ax == 2 else ((c2.x, c2.z) if ax == 1 else (c2.y, c2.z))
            lp[uvl].uv = (u * .55 + (.137 * f.index) % 1, v * .55 + .31 * (f.index % 7) / 7)
    b2.to_mesh(me); b2.free()
    for p in me.polygons: p.use_smooth = False
    return me

def heap(name, cx, cz, Rb, H, mat, uvs, n=300, seed=3, base=0.0, wob=.09):
    """a displaced-grid heap of loose material: ragged skirt, softly rounded apex, fine ripple. centre (cx, cz), base radius Rb, height H (metres)"""
    rng = np.random.default_rng(seed); ext = Rb * 1.28
    nz = pnoise(rng, 512, 2.4)[:n + 1, :n + 1]; nz2 = pnoise(rng, 512, 1.6)[:n + 1, :n + 1]
    ph = [rng.uniform(0, 6.3) for _ in range(6)]; bm = bmesh.new(); grid = {}
    for i in range(n + 1):
        for j in range(n + 1):
            x = -ext + 2 * ext * i / n; z = -ext + 2 * ext * j / n
            th = math.atan2(z, x); Re = Rb * (1 + wob * math.sin(2 * th + ph[0]) + .66 * wob * math.sin(3 * th + ph[1]) + .44 * wob * math.sin(5 * th + ph[2]))
            r = math.hypot(x, z); t = max(0.0, 1 - (math.sqrt(r * r + (Rb * .12) ** 2) - Rb * .12) / Re)
            h = H * (t ** 1.05) * (1 + .06 * nz2[i, j] * (1 - t * .3)) + H * .012 * nz[i, j] * min(1, t * 6) * min(1.0, (1 - t) * 3) * (1 if t > 0 else 0)
            grid[(i, j)] = bm.verts.new(V(cx + x, base + max(0.0, h), cz + z))
    for i in range(n):
        for j in range(n):
            vs = [grid[(i, j)], grid[(i + 1, j)], grid[(i + 1, j + 1)], grid[(i, j + 1)]]
            if max(v.co.z for v in vs) <= base + 1e-9: continue
            bm.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me)
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat); me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        for lp in f.loops: c = lp.vert.co; lp[uvl].uv = ((c.x - cx) / uvs, (-c.y - cz) / uvs + c.z * .0)
    b2.to_mesh(me); b2.free(); return ob

# ------------------------------------------------------------------ light / world / camera
def area(name, loc, w, h, energy, color=(1, 1, 1), look=(0, .2, 0)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
    ob = new_obj(name, ld); ob.location = V(*loc); ob.rotation_euler = (V(*look) - ob.location).to_track_quat('-Z', 'Y').to_euler(); return ob
def setup_world_render():
    world = bpy.data.worlds.new('W'); scene.world = world
    try: world.use_nodes = True
    except Exception: pass
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.93, .93, .94, 1); bg.inputs['Strength'].default_value = WK
    try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception: scene.view_settings.view_transform = 'AgX'
    scene.cycles.use_denoising = True; scene.render.film_transparent = True
    scene.cycles.max_bounces = 14; scene.cycles.transmission_bounces = 12; scene.cycles.glossy_bounces = 6; scene.cycles.volume_bounces = 3; scene.cycles.transparent_max_bounces = 16
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'
def floor_catcher(cx, cz, s):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=s); me = bpy.data.meshes.new('Floor'); bm.to_mesh(me); bm.free()
    fl = new_obj('Floor', me); fl.location = V(cx, -.0005, cz); fl.is_shadow_catcher = True; return fl
def set_camera(target, az, el, fw, aspect=1.37, ty=0.0):
    cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = fw; cam.clip_start = .05; cam.clip_end = 40
    co = new_obj('Cam', cam); scene.camera = co
    a, e = math.radians(az), math.radians(el); D = 8.0
    pos = (target[0] + D * math.sin(a) * math.cos(e), target[1] + D * math.sin(e), target[2] + D * math.cos(a) * math.cos(e))
    co.location = V(*pos); co.rotation_euler = (V(*target) - co.location).to_track_quat('-Z', 'Y').to_euler()
    W = 1000 if QUICK else int(os.environ.get('W', '1480')); scene.render.resolution_x = W; scene.render.resolution_y = int(W / aspect); scene.render.resolution_percentage = 100
    return co
def project(co, pts):
    bpy.context.view_layer.update(); out = {}
    for k, p in pts.items():
        c = world_to_camera_view(scene, co, V(*p)); out[k] = [round(c.x, 4), round(1 - c.y, 4)]
    return out

# =========================================================================================== WASHING
def build_wash():
    SANDW = mat_pbr('SandWet', sand_maps(NS, 15, np.array([.85, .64, .42])), 1.3, .45)
    try: SANDW.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .55
    except Exception: pass
    BODY = mat_plain('Body', (.12, .15, .19), .46, .35, .25)
    INNER = mat_plain('Inner', (.36, .35, .33), .5, .25, .3)
    STEEL = mat_plain('Steel', (.62, .64, .66), .33, 1.0, .35)
    DARK = mat_plain('Dark', (.04, .045, .05), .55, .0, .1)
    # tank: steel U-body with a clear front panel
    tx0, tx1, tz0, tz1, ty0, ty1 = -.32, .32, -.17, .17, .09, .405; t = .014
    box('Base', tx0 - .03, tx1 + .03, .05, ty0 + .006, tz0 - .03, tz1 + .03, BODY, .003)
    for sx in (-1, 1):
        for sz in (-1, 1): box('Leg', sx * .27 - .022 + .0, sx * .27 + .022, 0, .06, sz * .11 - .022, sz * .11 + .022, STEEL, .002)
    box('Floor', tx0, tx1, ty0, ty0 + t, tz0, tz1, INNER, .002)
    box('Back', tx0, tx1, ty0, ty1, tz0, tz0 + t, INNER, .002)
    box('Left', tx0, tx0 + t, ty0, ty1, tz0, tz1, INNER, .002)
    LIP = .335                                                                     # overflow lip height; the right wall is notched below the water line over the middle third
    box('RightLo', tx1 - t, tx1, ty0, LIP, tz0, tz1, INNER, .002)
    for s in (-1, 1): box('RightSide', tx1 - t, tx1, LIP, ty1, s * .1 - (0 if s > 0 else 0) + (0 if s > 0 else -.07), s * .1 + (.07 if s > 0 else 0), INNER, .002)
    box('Spout', tx1, tx1 + .075, LIP - .008, LIP, -.1, .1, STEEL, .001)
    for s in (-1, 1): box('SpoutSide', tx1, tx1 + .075, LIP - .008, LIP + .03, s * .1 - .006 if s > 0 else -.1, s * .1 + .006 if s < 0 else .1, STEEL, .001)
    # steel front frame (open, so the clear panel shows the sand and water)
    fz = tz1 + .012
    for nm, a, b, c, d in (('Fbot', tx0 - .016, tx1 + .016, ty0 - .008, ty0 + .045), ('Fl', tx0 - .016, tx0 + .035, ty0, ty1), ('Fr', tx1 - .035, tx1 + .016, ty0, LIP - .01)):
        box(nm, a, b, c, d, tz1, fz + .004, BODY, .002)
    
    for i, (bx, by) in enumerate([(tx0 + .018, ty0 + .022), (tx1 - .02, ty0 + .022), (tx0 + .018, ty1 - .012), (tx1 - .02, ty1 - .012), (tx0 + .018, .27), (tx1 - .02, .43)]):
        cyl('Bolt%d' % i, (bx, by, fz + .004), (bx, by, fz + .011), .0055, STEEL, 10)
    GL = bpy.data.materials.new('Glass'); GL.use_nodes = True; nt0 = GL.node_tree
    for n in list(nt0.nodes): nt0.nodes.remove(n)
    o0 = nt0.nodes.new('ShaderNodeOutputMaterial'); t0 = nt0.nodes.new('ShaderNodeBsdfTransparent'); g0 = nt0.nodes.new('ShaderNodeBsdfGlossy'); g0.inputs['Roughness'].default_value = .0
    f0 = nt0.nodes.new('ShaderNodeFresnel'); f0.inputs['IOR'].default_value = 1.5; m0 = nt0.nodes.new('ShaderNodeMixShader')
    nt0.links.new(f0.outputs['Fac'], m0.inputs['Fac']); nt0.links.new(t0.outputs['BSDF'], m0.inputs[1]); nt0.links.new(g0.outputs['BSDF'], m0.inputs[2]); nt0.links.new(m0.outputs['Shader'], o0.inputs['Surface'])
    gl_ = box('Glass', tx0 + .03, tx1 - .03, ty0 + .04, ty1 - .004, tz1 - .0, tz1 + .007, GL, .0, False); gl_.visible_shadow = False
    # water (silty, thickening toward the overflow): a displaced closed box + a volume
    WL = LIP - .004
    wb = bmesh.new(); bmesh.ops.create_cube(wb, size=1.0)
    bmesh.ops.subdivide_edges(wb, edges=wb.edges, cuts=70, use_grid_fill=True)
    wx0, wx1, wz0, wz1, wy0 = tx0 + t, tx1 - t, tz0 + t, tz1 - .002, ty0 + t
    jx = [-.285, -.215, -.145, -.075, -.005, .065]
    for v in wb.verts:
        ux, uy, uz = v.co.x + .5, v.co.y + .5, v.co.z + .5
        x = wx0 + (wx1 - wx0) * ux; z = wz0 + (wz1 - wz0) * uy; y = wy0 + (WL - wy0) * uz
        if uz > .999:
            y += .0006 * math.sin(x * 70 + z * 30) * .5 + .0004 * math.sin(x * 130 - z * 90)
            for jxx in jx: rr = math.hypot(x - (jxx + .0), z); y += .0009 * math.sin(rr * 330) * math.exp(-rr * 22)
        v.co = Vector((x, -z, y))
    wme = bpy.data.meshes.new('Water'); wb.to_mesh(wme); wb.free(); water = new_obj('Water', wme)
    for p in wme.polygons: p.use_smooth = p.normal.z > .5 if False else (abs(p.normal[2]) > .5)
    wm = bpy.data.materials.new('WaterM'); wm.use_nodes = True; nt = wm.node_tree; N_, L_ = nt.nodes, nt.links
    for n in list(N_): N_.remove(n)
    out = N_.new('ShaderNodeOutputMaterial'); tr = N_.new('ShaderNodeBsdfTransparent'); gs = N_.new('ShaderNodeBsdfGlossy'); gs.inputs['Roughness'].default_value = .03
    fr = N_.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.333; mxs = N_.new('ShaderNodeMixShader')
    fmul = N_.new('ShaderNodeMath'); fmul.operation = 'MULTIPLY'; fmul.use_clamp = True; fmul.inputs[1].default_value = 3.2; L_.new(fr.outputs['Fac'], fmul.inputs[0]); L_.new(fmul.outputs['Value'], mxs.inputs['Fac']); L_.new(tr.outputs['BSDF'], mxs.inputs[1]); L_.new(gs.outputs['BSDF'], mxs.inputs[2]); L_.new(mxs.outputs['Shader'], out.inputs['Surface'])
    tc = N_.new('ShaderNodeTexCoord'); sp = N_.new('ShaderNodeSeparateXYZ'); L_.new(tc.outputs['Object'], sp.inputs['Vector'])
    mp = N_.new('ShaderNodeMapRange'); mp.inputs['From Min'].default_value = -.28; mp.inputs['From Max'].default_value = .28; mp.inputs['To Min'].default_value = .7; mp.inputs['To Max'].default_value = 9.5
    L_.new(sp.outputs['X'], mp.inputs['Value'])
    ab = N_.new('ShaderNodeVolumeAbsorption'); ab.inputs['Color'].default_value = (.78, .62, .38, 1); L_.new(mp.outputs['Result'], ab.inputs['Density'])
    sc = N_.new('ShaderNodeVolumeScatter'); sc.inputs['Color'].default_value = (.80, .70, .50, 1); sc.inputs['Anisotropy'].default_value = .3
    m2 = N_.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'; m2.inputs[1].default_value = .45; L_.new(mp.outputs['Result'], m2.inputs[0]); L_.new(m2.outputs['Value'], sc.inputs['Density'])
    ad = N_.new('ShaderNodeAddShader'); L_.new(ab.outputs['Volume'], ad.inputs[0]); L_.new(sc.outputs['Volume'], ad.inputs[1]); L_.new(ad.outputs['Shader'], out.inputs['Volume'])
    water.data.materials.append(wm)
    water.location = V(0, 0, 0)
    # the heap: wet sand piled on the floor of the tank, peaking above the water line where the jets land
    hx = .05
    BX0 = tx0 + t; BRUN = .34; BH = .272; yb0 = ty0 + t - .002
    nb = 340 if not QUICK else 200; rng_b = np.random.default_rng(6); nzb = pnoise(rng_b, 512, 2.2)[:nb + 1, :nb + 1]; nzc = pnoise(rng_b, 512, 1.4)[:nb + 1, :nb + 1]
    bb = bmesh.new(); gridb = {}
    for i in range(nb + 1):
        for j in range(nb + 1):
            x = BX0 + (BRUN * 1.12) * i / nb; z = (tz0 + t + .001) + (tz1 - t - .001 - (tz0 + t + .001)) * j / nb
            u = (x - BX0) / BRUN; edge = min(1.0, (min(z - (tz0 + t), (tz1 - .002) - z)) / .03)
            prof = max(0.0, 1 - max(0.0, u - .0) ** 1.0) ** 1.18 if u < 1 else 0.0
            toe = prof * (1 + .05 * nzc[i, j]) + .018 * nzb[i, j] * min(1.0, prof * 8)
            h = BH * max(0.0, toe) * (.86 + .14 * edge) + 0.0
            for jxx in jx:       # shallow wash rills where the jets land
                h -= .012 * math.exp(-((x - jxx) / .028) ** 2) * math.exp(-((z) / .02) ** 2) * (1 if x < .0 else .4)
            gridb[(i, j)] = bb.verts.new(V(x, yb0 + max(0.0, h), z))
    for i in range(nb):
        for j in range(nb):
            vs = [gridb[(i, j)], gridb[(i + 1, j)], gridb[(i + 1, j + 1)], gridb[(i, j + 1)]]
            if max(v.co.z for v in vs) <= yb0 + 1e-9: continue
            bb.faces.new(vs)
    bmesh.ops.recalc_face_normals(bb, faces=bb.faces)
    bme = bpy.data.meshes.new('Bank'); bb.to_mesh(bme); bb.free(); bo = new_obj('Bank', bme)
    for p in bme.polygons: p.use_smooth = True
    bme.materials.append(SANDW); bme.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(bme); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        for lp in f.loops: cc = lp.vert.co; lp[uvl].uv = (cc.x / .10, -cc.y / .10)
    b2.to_mesh(bme); b2.free()
    # grains and gravel rolled to the foot of the heap, and suspended fines drifting toward the lip
    rr = random.Random(5); GR = mat_plain('Grain', (.3, .26, .2), .85); FNm = mat_plain('Fine', (.62, .5, .33), .9)
    gm = bmesh.new(); bmesh.ops.create_icosphere(gm, subdivisions=1, radius=1.0); gme = bpy.data.meshes.new('grain'); gm.to_mesh(gme); gm.free(); gme.materials.append(GR)
    for p in gme.polygons: p.use_smooth = False
    fme = bpy.data.meshes.new('fine'); fm = bmesh.new(); bmesh.ops.create_icosphere(fm, subdivisions=1, radius=1.0); fm.to_mesh(fme); fm.free(); fme.materials.append(FNm)
    for k in range(120 if not QUICK else 40):
        x = rr.uniform(.0, .22); z = rr.uniform(tz0 + t + .01, tz1 - .014); r = rr.uniform(.0016, .0036)
        if abs(z) > tz1 - t - .01 or x < tx0 + t + .006 or x > tx1 - t - .006: continue
        g = new_obj('g%03d' % k, gme); g.location = V(x, ty0 + t + r * .6, z); g.scale = (r, r * rr.uniform(.7, 1), r * rr.uniform(.8, 1.1)); g.rotation_euler = (rr.uniform(0, 6), rr.uniform(0, 6), rr.uniform(0, 6))
    for k in range(520 if not QUICK else 120):
        u = rr.random() ** .7; x = tx0 + .06 + (tx1 - tx0 - .09) * (.25 + .75 * u) if rr.random() < .85 else rr.uniform(tx0 + .04, tx1 - .04)
        y = rr.uniform(ty0 + .04, WL - .006); z = rr.uniform(tz0 + .03, tz1 - .03)
        if y < yb0 + BH * max(0, 1 - (x - BX0) / BRUN) ** 1.18 + .006: continue
        r = rr.uniform(.0009, .0022); f = new_obj('f%03d' % k, fme); f.location = V(x, y, z); f.scale = (r, r, r)
    # header pipe, riser and the six spray nozzles
    PY = .60
    cyl('Riser', (-.38, 0, -.0), (-.38, PY, -.0), .0135, STEEL, 24); sphere('Elbow', (-.38, PY, 0), .0135, STEEL, 3)
    cyl('Header', (-.38, PY, 0), (.06, PY, 0), .0135, STEEL, 24); cyl('Cap', (.06, PY, 0), (.072, PY, 0), .0155, STEEL, 24)
    for sx in (-.38, .06): cyl('Flange', (sx, PY - .012, 0), (sx, PY + .012, 0), .019, STEEL, 24) if sx != -.38 else None
    cyl('Foot', (-.38, 0, 0), (-.38, .008, 0), .035, STEEL, 24)
    SPR = bpy.data.materials.new('Spray'); SPR.use_nodes = True; sp_ = next(x for x in SPR.node_tree.nodes if x.type == 'BSDF_PRINCIPLED')
    sp_.inputs['Base Color'].default_value = (.92, .96, 1.0, 1); sp_.inputs['Roughness'].default_value = .08; sp_.inputs['IOR'].default_value = 1.33
    try: sp_.inputs['Transmission Weight'].default_value = .88
    except Exception: pass
    for i, x in enumerate(jx):
        cyl('Nz%d' % i, (x, PY - .01, 0), (x, PY - .036, 0), .0075, STEEL, 16)
        yl = max(LIP - .004, yb0 + BH * max(0, 1 - (x - BX0) / BRUN) ** 1.18) + .002
        cyl('Jet%d' % i, (x, PY - .036, 0), (x + .008 * math.sin(i * 1.3), yl, 0), .0036, SPR, 12, r1=.0042)
        sphere('Spl%d' % i, (x + .004, yl, 0), .007, SPR, 2, (1.4, .8, 1.0))
        for q in range(7):
            ang = rr.uniform(0, 6.283); rad = rr.uniform(.012, .035); sphere('Dp%d_%d' % (i, q), (x + rad * math.cos(ang), yl + rr.uniform(.004, .03), rad * math.sin(ang) * .7), rr.uniform(.0016, .003), SPR, 1)
    # overflow stream falling into the sump
    sx0 = tx1 + .066
    cx = lambda s: sx0 + s
    SUMP_X = tx1 + .17; sump_y = .074
    sbody = mat_plain('SumpBody', (.12, .15, .19), .5, .35, .25)
    box('SumpFloor', SUMP_X - .02, SUMP_X + .27, 0.0, .012, -.2, .2, sbody, .002)
    box('SumpF', SUMP_X - .02, SUMP_X + .27, 0.0, .085, .2 - .012, .2, sbody, .002); box('SumpB', SUMP_X - .02, SUMP_X + .27, 0.0, .085, -.2, -.2 + .012, sbody, .002)
    box('SumpL', SUMP_X - .02, SUMP_X - .008, 0.0, .085, -.2, .2, sbody, .002); box('SumpR', SUMP_X + .258, SUMP_X + .27, 0.0, .085, -.2, .2, sbody, .002)
    mud = mat_plain('Mud', (.30, .22, .12), .07, 0, 0)
    mb = bmesh.new(); bmesh.ops.create_grid(mb, x_segments=60, y_segments=60, size=1.0)
    for v in mb.verts:
        x = SUMP_X - .008 + (v.co.x + 1) / 2 * .266; z = v.co.y * .185; rr2 = math.hypot(x - (SUMP_X + .115), z)
        v.co = Vector((x, -z, .060 + .0007 * math.sin(rr2 * 260) * math.exp(-rr2 * 10) + .0002 * math.sin(x * 190 + z * 80)))
    mme = bpy.data.meshes.new('MudS'); mb.to_mesh(mme); mb.free(); mo = new_obj('MudS', mme); mme.materials.append(mud)
    for p in mme.polygons: p.use_smooth = True
    # stream ribbon: parabola from the lip; cloudy silty water
    ST = bpy.data.materials.new('StreamM'); ST.use_nodes = True; nt2 = ST.node_tree
    for n in list(nt2.nodes): nt2.nodes.remove(n)
    o2 = nt2.nodes.new('ShaderNodeOutputMaterial'); p2 = nt2.nodes.new('ShaderNodeBsdfPrincipled'); p2.inputs['Base Color'].default_value = (.52, .40, .24, 1); p2.inputs['Roughness'].default_value = .06; p2.inputs['IOR'].default_value = 1.333
    try: p2.inputs['Transmission Weight'].default_value = .35
    except Exception: pass
    tcx = nt2.nodes.new('ShaderNodeTexCoord'); mpn = nt2.nodes.new('ShaderNodeMapping'); mpn.inputs['Scale'].default_value = (90, 14, 14); nzs = nt2.nodes.new('ShaderNodeTexNoise'); nzs.inputs['Scale'].default_value = 1.0; nzs.inputs['Detail'].default_value = 8
    bps = nt2.nodes.new('ShaderNodeBump'); bps.inputs['Strength'].default_value = .5; bps.inputs['Distance'].default_value = .004
    nt2.links.new(tcx.outputs['Object'], mpn.inputs['Vector']); nt2.links.new(mpn.outputs['Vector'], nzs.inputs['Vector']); nt2.links.new(nzs.outputs['Fac'], bps.inputs['Height']); nt2.links.new(bps.outputs['Normal'], p2.inputs['Normal'])
    nt2.links.new(p2.outputs['BSDF'], o2.inputs['Surface'])
    ab2 = nt2.nodes.new('ShaderNodeVolumeAbsorption'); ab2.inputs['Color'].default_value = (.72, .58, .36, 1); ab2.inputs['Density'].default_value = 60; nt2.links.new(ab2.outputs['Volume'], o2.inputs['Volume'])
    NS_, NA = 70, 14; rb = bmesh.new(); rows = []
    x_lip = tx1 + .066; y_lip = LIP - .004; kfall = 7.8
    for i in range(NS_ + 1):
        s = i / NS_; x = x_lip + s * (SUMP_X + .12 - x_lip); dx = x - x_lip; y = y_lip - kfall * dx * dx
        if y < .062: y = .062
        w = .20 - .06 * s; th = .02 - .012 * s
        ring = []
        for j in range(NA):
            a = 2 * math.pi * j / NA; xx = x + .5 * th * math.cos(a) * .35; yy = y + .5 * th * math.sin(a); zz = .5 * w * math.cos(a) * 0 + (.5 * w) * math.copysign(abs(math.cos(a)) ** .35, math.cos(a))
            ring.append(rb.verts.new(V(xx, yy, zz)))
        rows.append(ring)
    for i in range(NS_):
        for j in range(NA): rb.faces.new([rows[i][j], rows[i][(j + 1) % NA], rows[i + 1][(j + 1) % NA], rows[i + 1][j]])
    bmesh.ops.recalc_face_normals(rb, faces=rb.faces)
    rme = bpy.data.meshes.new('Stream'); rb.to_mesh(rme); rb.free(); ro = new_obj('Stream', rme); rme.materials.append(ST)
    for p in rme.polygons: p.use_smooth = True
    FOAM = mat_plain('Foam', (.66, .58, .44), .85)
    for q in range(12):
        a_ = rr.uniform(0, 6.283); r_ = rr.uniform(0, .05) ** 1.0; sphere('Fm%d' % q, (SUMP_X + .12 + r_ * math.cos(a_) * 1.2, .063 + rr.uniform(0, .004), r_ * math.sin(a_) * .9), rr.uniform(.0014, .0028), FOAM, 1, (1, .5, 1))
    for q in range(26):
        a_ = rr.uniform(-1.1, 1.1); d_ = rr.uniform(.015, .06); sphere('Sp%d' % q, (SUMP_X + .10 + d_ * math.cos(a_), .07 + rr.uniform(.005, .05), d_ * math.sin(a_) * .8), rr.uniform(.0018, .0034), SPR, 1)
    # frame
    floor_catcher(.15, 0, 5.0)
    area('Key', (-.9, 1.5, 1.1), .75, .55, 210 * LK, (1.0, .985, .965), (.1, .3, 0)); area('Fill', (1.6, .8, 1.3), 1.4, 1.0, 40 * LK, (.95, .97, 1.0), (.1, .3, 0))
    area('Top', (0, 2.0, .2), 1.6, 1.2, 30 * LK, (1, 1, 1), (.1, .3, 0)); area('Back', (.4, .9, -1.4), 1.8, 1.0, 45 * LK, (1, 1, 1), (.1, .3, 0))
    for o in bpy.data.objects:
        if o.type == 'LIGHT' and o.name != 'Key': o.visible_glossy = False
    setup_world_render()
    co = set_camera((.19, .33, 0.0), float(os.environ.get('AZ', '22')), float(os.environ.get('EL', '27')), float(os.environ.get('FW', '1.36')))
    anchors = project(co, {'lip': (tx1 + .03, LIP, 0), 'stream': (SUMP_X + .0, .22, 0), 'sump': (SUMP_X + .12, .07, .0), 'tank': (-.1, .25, tz1), 'jets': (-.14, .55, 0), 'tl': (tx0, ty1, tz1), 'water': (.15, .31, tz1)})
    return anchors

# =========================================================================================== SCREENING
def build_screen():
    STONE = mat_pbr('Stone', stone_maps(NS), 1.1, .55, tint=True)
    SAND = mat_pbr('Sand', sand_maps(NS, 15, 1.0), 1.3, .35)
    cell1 = .036; cell2 = .0144
    DECK1 = mat_pbr('Deck1', wire_maps(8, 1024, .11, 3), 1.6, .6, 1.0, alpha=wire_maps(8, 1024, .11, 3)[3])
    DECK2 = mat_pbr('Deck2', wire_maps(8, 1024, .13, 4), 1.6, .6, 1.0, alpha=wire_maps(8, 1024, .13, 4)[3])
    BODY = mat_plain('Body', (.10, .13, .17), .46, .35, .25)
    STEEL = mat_plain('Steel', (.62, .64, .66), .33, 1.0, .35)
    ORG = mat_plain('Orange', (.80, .26, .07), .42, .1, .1)
    th = math.radians(12.0); c, s = math.cos(th), math.sin(th)
    def frame(o, ax=1):
        """deck-local -> world (blender) matrix: local x down the deck, y across (blender +Y = -z), local z = deck normal"""
        sb = V(c, -s, 0); nb = V(s, c, 0); yb = Vector((0, 1, 0))
        M = Matrix(((sb.x, yb.x, nb.x, V(*o).x), (sb.y, yb.y, nb.y, V(*o).y), (sb.z, yb.z, nb.z, V(*o).z), (0, 0, 0, 1))); return M
    def deck(name, o, L, W, mat, cell):
        M = frame(o); bm = bmesh.new(); gv = []
        for (x, y) in ((0, -W / 2), (L, -W / 2), (L, W / 2), (0, W / 2)): gv.append(bm.verts.new(Vector((x, y, 0))))
        f = bm.faces.new(gv); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
        for fc in b2.faces:
            for lp in fc.loops: lp[uvl].uv = (lp.vert.co.x / (cell * 8), lp.vert.co.y / (cell * 8))
        b2.to_mesh(me); b2.free(); ob = new_obj(name, me); ob.matrix_world = M; me.materials.append(mat)
        sm = ob.modifiers.new('sol', 'SOLIDIFY'); sm.thickness = .0035; sm.offset = 0
        return ob
    def lbox(name, o, x0, x1, y0, y1, z0, z1, mat, bevel=.0015):
        """a box in deck-local coords"""
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts: v.co = Vector((x0 if v.co.x < 0 else x1, y0 if v.co.y < 0 else y1, z0 if v.co.z < 0 else z1))
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me); ob.matrix_world = frame(o); me.uv_layers.new(name='UVMap'); return finish(ob, mat, False, bevel)
    O1 = (-.32, .76, 0); L1 = .80; W = .46          # top deck: 32 mm apertures
    O2 = (-.46, .46, 0); L2 = .78                    # lower deck: 12 mm apertures
    def local_pt(o, sx, ty, nz): return Vector(V(*o)) + Vector((c * sx, 0, 0)) + Vector((0, 0, -s * sx)) + Vector((s * nz, 0, c * nz)) + Vector((0, ty, 0))
    deck('Deck1', O1, L1, W, DECK1, cell1); deck('Deck2', O2, L2, W, DECK2, cell2)
    # machine body: side plates, cross tubes, legs with coil springs, feed box
    for (o, L, hh) in ((O1, L1, .085), (O2, L2, .085)):
        for sgn in (-1, 1):
            lbox('Side', o, -.03, L + .01, sgn * (W / 2 + .004) - (.012 if sgn < 0 else 0), sgn * (W / 2 + .004) + (.012 if sgn > 0 else 0), -.06, (.026 if sgn < 0 else .10), BODY, .002)
        for xx in (.0, L * .35, L * .7, L):
            lbox('Cross', o, xx - .018, xx + .018, -W / 2, W / 2, -.044, -.02, BODY, .0015)
    def post(x, y0, y1, z):
        box('Leg', x - .02, x + .02, y0, y1, z - .02, z + .02, BODY, .002)
    for (px, py, hy) in ((-.40, .58, 0), (-.34, .58, 0)):
        pass
    def spring(x, z, y0, y1):
        pts = []; n = 8
        helix = bpy.data.curves.new('sp', 'CURVE'); helix.dimensions = '3D'; sp_ = helix.splines.new('POLY'); sp_.points.add(n * 14 - 1)
        for i in range(n * 14):
            t_ = i / (n * 14 - 1); a = 2 * math.pi * n * t_; r = .028
            sp_.points[i].co = (*V(x + r * math.cos(a), y0 + (y1 - y0) * t_, z + r * math.sin(a)), 1)
        helix.bevel_depth = .0035; helix.bevel_resolution = 2; ob = new_obj('Spring', helix); ob.data.materials.append(STEEL)
    legs = [(-.42, -.2), (-.42, .2), (.22, -.2), (.22, .2)]
    for (lx, lz) in legs:
        box('Foot', lx - .045, lx + .045, 0, .012, lz - .045, lz + .045, STEEL, .002)
        spring(lx, lz, .012, .14); box('Post', lx - .018, lx + .018, .14, .38, lz - .018, lz + .018, BODY, .002)
    for lz in (-.2, .2): box('Rail', -.45, .25, .37, .40, lz - .02, lz + .02, BODY, .002)
    box('RailX', -.43, -.40, .37, .40, -.22, .22, BODY, .002); box('RailX2', .20, .23, .37, .40, -.22, .22, BODY, .002)
    box('Plate', -.45, .25, .506, .52, -.19, .19, ORG, .001) if False else None
    # orange brand band on the front side plates
    for o, L in ((O1, L1), (O2, L2)):
        lbox('Band', o, .02, L - .02, W / 2 + .0165, W / 2 + .0185, -.02, .02, ORG, .0003)
    # feed chute (left), a slanted steel plate with side walls
    lbox('FeedPlate', (-.50, .86, 0), -.14, .05, -W / 2 + .02, W / 2 - .02, -.004, .0, STEEL, .001)
    for sgn in (-1, 1): lbox('FeedSide', (-.50, .86, 0), -.14, .05, sgn * (W / 2 - .02) - (.008 if sgn < 0 else 0), sgn * (W / 2 - .02) + (.008 if sgn > 0 else 0), 0, .07, BODY, .0015)
    # rocks: unit meshes (middle dimension 1), sized by scaling
    rmeshes = [rock_mesh(sd, STONE, 'r%d' % sd) for sd in (41, 43, 47, 50, 52, 55, 58, 61)]
    GR = mat_plain('Grain', (.3, .26, .2), .85)
    rr = random.Random(11); count = [0]
    def rock(pos_mat, size, yaw=None, tilt=None, rot=None):
        me = rmeshes[rr.randrange(len(rmeshes))]; count[0] += 1; ob = new_obj('rk%d' % count[0], me)
        sc_ = Matrix.Diagonal((size * rr.uniform(.88, 1.12), size * rr.uniform(.8, 1.1), size * rr.uniform(.8, 1.0), 1)) if False else None
        R = rot if rot is not None else Matrix.Rotation(rr.uniform(0, 6.283), 4, 'X') @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Y') @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Z')
        ob.matrix_world = pos_mat @ R; ob.scale = (size * rr.uniform(.9, 1.1), size * rr.uniform(.85, 1.1), size * rr.uniform(.85, 1.05)); ob.matrix_world = pos_mat @ R @ Matrix.Diagonal((ob.scale[0], ob.scale[1], ob.scale[2], 1)); return ob
    def at(o, sx, ty, nz): return Matrix.Translation(local_pt(o, sx, ty, nz))
    def deck_rot(): return frame((0, 0, 0)).to_3x3().to_4x4()
    def flat_rock(o, sx, ty, size):
        # a rock lying on the deck: random yaw around the deck normal, half its height above the wire
        yaw = Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Z'); tilt = Matrix.Rotation(rr.uniform(-.35, .35), 4, 'X') @ Matrix.Rotation(rr.uniform(-.35, .35), 4, 'Y')
        base = frame(o); loc = Matrix.Translation(Vector((sx, ty, size * .38 + .0035)))
        me = rmeshes[rr.randrange(len(rmeshes))]; count[0] += 1; ob = new_obj('rk%d' % count[0], me)
        sz = (size * rr.uniform(.92, 1.15), size * rr.uniform(.8, 1.0), size * rr.uniform(.72, .95))
        ob.matrix_world = base @ loc @ yaw @ tilt @ Matrix.Diagonal((*sz, 1)); return ob
    # top deck: the coarse stones (about 40-55 mm) - dense near the feed, thinning to the end; a few small ones riding along with them
    for k in range(17):
        sx = rr.uniform(.04, L1 - .05); ty = rr.uniform(-W / 2 + .045, W / 2 - .045)
        if rr.random() < .55: sx = rr.uniform(.04, .30)
        flat_rock(O1, sx, ty, rr.uniform(.046, .066))
    for k in range(10): flat_rock(O1, rr.uniform(.02, .26), rr.uniform(-W / 2 + .03, W / 2 - .03), rr.uniform(.014, .022))       # mid / small material that has not yet found an opening
    # lower deck: mid stones (14-22 mm) that went through the top deck
    for k in range(46):
        sx = rr.uniform(.05, L2 - .04) if rr.random() > .35 else rr.uniform(.05, .35); ty = rr.uniform(-W / 2 + .03, W / 2 - .03)
        flat_rock(O2, sx, ty, rr.uniform(.019, .027))
    # feed chute: the mixed feed
    for k in range(20): flat_rock((-.50, .86, 0), rr.uniform(-.12, .04), rr.uniform(-.17, .17), rr.choice([.045, .02, .016, .035]) * rr.uniform(.9, 1.1))
    # discharge piles on the floor: coarse (off the end of the top deck), mid (off the lower deck)
    def pile(name, cx, cz, R, size, n_, hmax):
        for k in range(n_):
            a = rr.uniform(0, 6.283); d = R * math.sqrt(rr.random()); z_ = hmax * (1 - d / R) ** 1.1 * rr.uniform(.8, 1.0)
            x = cx + d * math.cos(a) * 1.0; zz = cz + d * math.sin(a) * .9
            me = rmeshes[rr.randrange(len(rmeshes))]; count[0] += 1; ob = new_obj('pk%d' % count[0], me)
            R4 = Matrix.Rotation(rr.uniform(0, 6.283), 4, 'X') @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Y') @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Z')
            sz = size * rr.uniform(.8, 1.2); ob.matrix_world = Matrix.Translation(V(x, size * .35 + z_, zz)) @ R4 @ Matrix.Diagonal((sz, sz * rr.uniform(.8, 1), sz * rr.uniform(.75, .95), 1))
    cx1 = O1[0] + c * L1 + .115; cx2 = O2[0] + c * L2 + .07
    heap('CoarseBase', cx1, 0.0, .14, .075, STONE, .12, n=70, seed=7)
    pile('coarse', cx1, 0.0, .13, .054, 62, .105)
    heap('MidBase', cx2, 0.0, .15, .07, STONE, .12, n=70, seed=8)
    pile('mid', cx2, 0.0, .14, .024, 520, .085)
    # fines: a sand heap under the machine, between the legs, and a veil of grains falling through the lower deck
    fcx = -.10
    heap('Fines', fcx, 0.0, .24, .17, SAND, .12, n=300 if not QUICK else 180, seed=3, wob=.1)
    gm = bmesh.new(); bmesh.ops.create_icosphere(gm, subdivisions=1, radius=1.0); gme = bpy.data.meshes.new('grain'); gm.to_mesh(gme); gm.free(); gme.materials.append(GR)
    for p in gme.polygons: p.use_smooth = False
    for k in range(260 if not QUICK else 80):
        a = rr.uniform(0, 6.283); d = .24 * (1.0 + abs(rr.gauss(0, .2))); x = fcx + d * math.cos(a); z = d * math.sin(a) * .9; r = rr.uniform(.0016, .0034)
        g = new_obj('g%03d' % k, gme); g.location = V(x, r * .6, z); g.scale = (r, r * rr.uniform(.7, 1), r * rr.uniform(.8, 1.1)); g.rotation_euler = (rr.uniform(0, 6), rr.uniform(0, 6), rr.uniform(0, 6))
    for k in range(120):       # falling fines under the lower deck
        sx = rr.uniform(.1, .5); ty = rr.uniform(-W / 2 + .03, W / 2 - .03); p = local_pt(O2, sx, ty, -.01); drop = rr.uniform(.02, .24); r = rr.uniform(.0012, .0026)
        g = new_obj('fl%03d' % k, gme); g.location = p + Vector((0, 0, -drop)); g.scale = (r, r, r); g.rotation_euler = (rr.uniform(0, 6), rr.uniform(0, 6), rr.uniform(0, 6))
    for k in range(7):         # mid stones tumbling through the top-deck apertures onto the lower deck
        sx = rr.uniform(.2, .55); ty = rr.uniform(-W / 2 + .06, W / 2 - .06); p = local_pt(O1, sx, ty, -.02); drop = rr.uniform(.05, .20)
        me = rmeshes[rr.randrange(len(rmeshes))]; ob = new_obj('fall%d' % k, me); sz = rr.uniform(.013, .019)
        ob.matrix_world = Matrix.Translation(p + Vector((0, 0, -drop))) @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'X') @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Y') @ Matrix.Diagonal((sz, sz * .9, sz * .85, 1))
    floor_catcher(.1, 0, 5.0)
    area('Key', (-.9, 1.6, 1.1), .75, .55, 210 * LK, (1.0, .985, .965), (.1, .4, 0)); area('Fill', (1.7, .9, 1.3), 1.4, 1.0, 38 * LK, (.95, .97, 1.0), (.1, .4, 0))
    area('Top', (0, 2.1, .2), 1.6, 1.2, 34 * LK, (1, 1, 1), (.1, .4, 0)); area('Back', (.4, 1.0, -1.4), 1.8, 1.0, 40 * LK, (1, 1, 1), (.1, .4, 0)); area('Low', (.6, .25, 1.6), 1.6, .9, 70 * LK, (1, .98, .95), (.1, .2, 0))
    for o in bpy.data.objects:
        if o.type == 'LIGHT' and o.name != 'Key': o.visible_glossy = False
    setup_world_render()
    co = set_camera((.10, .38, 0.0), float(os.environ.get('AZ', '-22')), float(os.environ.get('EL', '22')), float(os.environ.get('FW', '1.72')))
    d1 = local_pt(O1, L1, 0, 0); d2 = local_pt(O2, L2, 0, 0)
    def blw(v): return (v.x, v.z, -v.y)        # blender -> my xyz
    anchors = project(co, {'coarse': (cx1, .09, 0), 'mid': (cx2, .08, 0), 'fines': (fcx, .12, .24), 'top_end': blw(d1), 'low_end': blw(d2), 'feed': (-.55, .90, 0)})
    return anchors

# ------------------------------------------------------------------ run
if VIEW in ('wash', 'all') or VIEW == 'screen':
    pass
lay_path = os.path.join(OUT, 'layout.json')
lay = json.load(open(lay_path)) if os.path.exists(lay_path) else {}
if VIEW == 'wash': anchors = build_wash(); name = 'wash'
elif VIEW == 'screen': anchors = build_screen(); name = 'screen'
else: raise SystemExit('run once per VIEW=wash or VIEW=screen')
lay[name] = anchors; json.dump(lay, open(lay_path, 'w'), indent=1)
scene.cycles.samples = int(os.environ.get('SAMPLES', '48' if QUICK else '420'))
scene.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True)
print('[wsand] done', name, anchors)
