"""OM GROUP - concrete frame with member sections (20mm aggregates page, "Slab, Beam, Column, Foundation and Footing").

  blender -b --factory-startup -P scripts/frame3d/build-frame.py -- <repo root> [--quick]          (env MODE = frame | sections | all (default all))

Output (RGBA, transparent background): _review/frame3d/frame.png        the frame: slab with rebar stubs, beam, three columns, tied footings on a pebbly soil bank
                                        _review/frame3d/sec-<member>.png  the five cross-sections shown in the card (slab, beam, column, footing, foundation)
Frame: the page's figure frame (viewBox 0 20 800 430, 1 unit = 1 viewBox unit = 1 mm of model), orthographic camera pitched down 11 degrees, model y = up with the
ground at the foot of the columns. Sections: a concrete cut face with the bars seen end-on and the stirrup, 1.8 px per unit on a 700 x 560 canvas.
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv; MODE = os.environ.get('MODE', 'all')
OUT = os.path.join(ROOT, '_review', 'frame3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
U = 0.001

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
                scene.cycles.device = 'GPU'; print('[frame] Cycles device:', kind); return
    except Exception as e: print('[frame] GPU setup failed', e)
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

def stamp_fn(rng, N):
    def stamp(cx, cy, r, fn):
        R = int(math.ceil(r * 1.4 + 2)); xs = np.arange(int(cx) - R, int(cx) + R + 1); ys = np.arange(int(cy) - R, int(cy) + R + 1)
        X, Y = np.meshgrid(xs + .5 - cx, ys + .5 - cy); a = rng.uniform(0, 3.14); u = X * math.cos(a) + Y * math.sin(a); v = (-X * math.sin(a) + Y * math.cos(a)) * rng.uniform(.7, 1.4)
        th = np.arctan2(v, u); rr = r * (1 + .25 * np.sin(2 * th + rng.uniform(0, 6.3)) + .15 * np.sin(3 * th + rng.uniform(0, 6.3)))
        d = np.sqrt(u * u + v * v) / rr; m = np.clip((1 - d) * rr / 1.0, 0, 1)
        if m.max() > 0: fn(np.ix_(ys % N, xs % N), m, np.clip(d, 0, 1))
    return stamp

def concrete_maps(N=1024, seed=21):
    """Cast concrete: pale grey cement paste with soft tonal mottling, a fine sand grain, scattered air pores (dark pits with a lit rim), a few small
    aggregate flecks showing at the surface, and very faint shuttering-bleed streaks. Periodic."""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.40, .395, .382)
    alb *= (1 + .10 * pnoise(rng, N, 1.1) + .05 * pnoise(rng, N, .45))[..., None]
    alb *= (1 + .13 * pnoise(rng, N, .15))[..., None]
    streak = pnoise(rng, N, .9); streak = np.apply_along_axis(lambda r: np.convolve(np.r_[r[-30:], r, r[:30]], np.ones(61) / 61, mode='valid')[:N], 0, streak)
    alb *= (1 + .05 * streak)[..., None]
    h = .45 * pnoise(rng, N, .7) + .30 * pnoise(rng, N, .25) + .25 * pnoise(rng, N, 1.4)
    k = .4 if QUICK else 1.0
    def pore(ix, m, d):
        c = np.sqrt(np.clip(1 - d * d, 0, 1)); h[ix] -= m * rng.uniform(.8, 1.6) * c; alb[ix] *= (1 - .42 * m * c)[..., None]
    for _ in range(int(2600 * k)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.0, 3.6), pore)
    for _ in range(int(140 * k)): stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(4, 9), pore)
    def fleck(ix, m, d, col):
        a = (m * .8)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * .25
    for _ in range(int(380 * k)):
        g = rng.uniform(.26, .50); stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.0, 2.6), lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g * .98, g * .96])))
    return np.clip(alb, 0, 1), normal_from_height(h * .07, 1.0), np.clip(.80 + .08 * pnoise(rng, N, .6), .55, .95)

def soil_maps(N=1024, seed=31):
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = (.17, .105, .066)
    alb *= (1 + .22 * pnoise(rng, N, 1.0) + .10 * pnoise(rng, N, .4))[..., None]; alb *= (1 + .20 * pnoise(rng, N, .12))[..., None]
    h = .5 * pnoise(rng, N, .9) + .35 * pnoise(rng, N, .35) + .3 * pnoise(rng, N, 1.5)
    k = .4 if QUICK else 1.0
    def grain(ix, m, d, col, lift):
        a = (m * .9)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift
    for _ in range(int(5200 * k)):
        c = rng.choice([0, 1, 2]); col = [np.array([.40, .22, .12]), np.array([.14, .065, .03]), np.array([.46, .40, .34])][c]
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.0, 3.6), lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(.2, .6)))
    return np.clip(alb, 0, 1), normal_from_height(h * .12, 1.0), np.clip(.88 + .06 * pnoise(rng, N, .6), .6, 1)

NS = 512 if QUICK else 1024
ca, cn, cr = concrete_maps(NS); sa, sn, sr = soil_maps(NS)
IMG = {k: save_img(k, v, 'sRGB' if k.endswith('_a') else 'Non-Color') for k, v in (('conc_a', ca), ('conc_n', cn), ('conc_r', cr), ('soil_a', sa), ('soil_n', sn), ('soil_r', sr))}

def textured(name, a, n, r, nstr=1.0, tint=None):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N_, L_ = nt.nodes, nt.links; P = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img):
        t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t
    ta = tex(a); col = ta.outputs['Color']
    if tint is not None:
        oi = N_.new('ShaderNodeObjectInfo'); mp = N_.new('ShaderNodeMapRange'); mp.inputs['To Min'].default_value = .55; mp.inputs['To Max'].default_value = 1.2; L_.new(oi.outputs['Random'], mp.inputs['Value'])
        mx = N_.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0; mx.inputs[7].default_value = (*tint, 1)
        mx2 = N_.new('ShaderNodeMix'); mx2.data_type = 'RGBA'; mx2.blend_type = 'MULTIPLY'; mx2.inputs['Factor'].default_value = 1.0
        L_.new(col, mx.inputs[6]); L_.new(mx.outputs[2], mx2.inputs[6]); L_.new(mp.outputs['Result'], mx2.inputs[7]); col = mx2.outputs[2]
    L_.new(col, P.inputs['Base Color']); L_.new(tex(r).outputs['Color'], P.inputs['Roughness'])
    nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L_.new(tex(n).outputs['Color'], nm.inputs['Color']); L_.new(nm.outputs['Normal'], P.inputs['Normal'])
    try: P.inputs['Specular IOR Level'].default_value = .35
    except Exception: pass
    return m
CONC = textured('Concrete', IMG['conc_a'], IMG['conc_n'], IMG['conc_r'], 1.0)
SOIL = textured('Soil', IMG['soil_a'], IMG['soil_n'], IMG['soil_r'], 1.0)
PEB = textured('Pebble', IMG['conc_a'], IMG['conc_n'], IMG['conc_r'], 1.4, tint=(1.05, .86, .66))
def steel_mat(name, col, rough):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Metallic'].default_value = .35; p.inputs['Roughness'].default_value = rough; return m
RUST = steel_mat('Rebar', (.22, .085, .04), .62)
STIR = steel_mat('Stirrup', (.28, .11, .05), .55)

# ---------------------------------------------------------------- helpers
def box_uv(ob, tile=0.14):
    me = ob.data; me.uv_layers.new(name='UVMap'); bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv['UVMap']
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co + ob.location
            u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z)); lp[uvl].uv = (u / tile, v / tile)
    bm.to_mesh(me); bm.free()
def finish(ob, mat, bevel=0.0, smooth=True, uv=True, seg=2):
    bpy.context.view_layer.objects.active = ob
    if mat is not None: ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = smooth
    if bevel > 0:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel * U; bv.segments = seg; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(35); bv.profile = .6
        bpy.ops.object.modifier_apply(modifier=bv.name)
        wn = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 100; bpy.ops.object.modifier_apply(modifier=wn.name)
    if uv: box_uv(ob)
    return ob
def block(name, x0, x1, y0, y1, z0, z1, mat=None, bevel=1.2):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal(((x1 - x0) * U, (z1 - z0) * U, (y1 - y0) * U, 1)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return finish(ob, mat or CONC, bevel)
def cyl(name, x, y, z, r, h, axis='y', mat=None, seg=24, bevel=0.0, r2=None):
    bm = bmesh.new(); m = Matrix.Translation(V(x, y, z))
    if axis == 'z': m = m @ Matrix.Rotation(math.radians(90), 4, 'X')
    if axis == 'x': m = m @ Matrix.Rotation(math.radians(90), 4, 'Y')
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r * U, radius2=(r if r2 is None else r2) * U, depth=h * U, matrix=m)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return finish(ob, mat or RUST, bevel, uv=False)
def ribbed(name, x0, x1, y, z, R, mat=None, amp=.35, pitch=7.0, seg=14):
    """a deformed bar along x"""
    n = int((x1 - x0) / 1.2); bm = bmesh.new(); cols = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n; ring = []
        for k in range(seg):
            th = 2 * math.pi * k / seg; r = R + amp * max(0.0, math.cos(2 * math.pi * x / pitch - 2 * th)) ** 1.5
            ring.append(bm.verts.new(V(x, y + r * math.cos(th), z + r * math.sin(th))))
        cols.append(ring)
    for i in range(n):
        for k in range(seg): bm.faces.new((cols[i][k], cols[i][(k + 1) % seg], cols[i + 1][(k + 1) % seg], cols[i + 1][k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); return finish(ob, mat or RUST, 0, uv=False)
def rrect_curve(name, w, h, rad, z, cx=0, cy=0, tube=1.5, mat=None):
    """a stirrup: a rounded-rectangle tube lying in the xy plane at depth z"""
    pts = []
    def arc(ccx, ccy, a0):
        for k in range(7): a = math.radians(a0 + 90 * k / 6); pts.append((ccx + rad * math.cos(a), ccy + rad * math.sin(a)))
    hw, hh = w / 2 - rad, h / 2 - rad
    arc(cx + hw, cy + hh, 0); arc(cx - hw, cy + hh, 90); arc(cx - hw, cy - hh, 180); arc(cx + hw, cy - hh, 270)
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, (x, y) in enumerate(pts): sp.points[i].co = (*V(x, y, z), 1)
    sp.use_cyclic_u = True; cu.bevel_depth = tube * U; cu.bevel_resolution = 3
    ob = bpy.data.objects.new(name, cu); scene.collection.objects.link(ob); ob.data.materials.append(mat or STIR); return ob

def make_rock(seed, prefix='rk'):
    rng = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    sx, sy, sz = rng.uniform(1.0, 1.3), rng.uniform(.65, .95), rng.uniform(.85, 1.15); planes = []
    for _ in range(rng.randint(10, 14)):
        n = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized(); planes.append((n, rng.uniform(.5, .74)))
    for v in bm.verts:
        p = v.co.copy()
        for n, off in planes:
            d = p.dot(n) - off
            if d > 0: p -= n * d
        v.co = Vector((p.x * sx, p.y * sy, p.z * sz))
    rm = math.sqrt(sum(v.co.length_squared for v in bm.verts) / len(bm.verts))
    for v in bm.verts: v.co /= rm * 1.12
    for f in bm.faces: f.smooth = False
    me = bpy.data.meshes.new('%s_%d' % (prefix, seed)); bm.to_mesh(me); bm.free(); me.materials.append(PEB)
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co; u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z)); lp[uvl].uv = (u * .36 + (.137 * f.index) % 1, v * .36 + .3 * (f.index % 7) / 7)
    b2.to_mesh(me); b2.free(); return me

def area(name, loc, w, h, energy, color=(1, 1, 1), look=(270, 150, -40)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = V(*loc); ob.rotation_euler = (V(*look) - ob.location).to_track_quat('-Z', 'Y').to_euler(); return ob
def common(lk, wk):
    area('Key', (-500, 900, 700), .9, .7, 150 * lk, (1.0, .985, .965))
    area('Fill', (1100, 400, 800), 1.4, 1.0, 40 * lk, (.95, .97, 1.0))
    area('Top', (270, 1100, 100), 1.6, 1.2, 28 * lk)
    world = bpy.data.worlds.new('W'); scene.world = world
    try: world.use_nodes = True
    except Exception: pass
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.93, .93, .94, 1); bg.inputs['Strength'].default_value = wk
    try: scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception: scene.view_settings.view_transform = 'AgX'
    scene.cycles.use_denoising = True; scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'; scene.render.resolution_percentage = 100

def clear():
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)

# ================================================================ the frame
def build_frame():
    LK = float(os.environ.get('LK', '0.5')); WK = float(os.environ.get('WK', '0.30'))
    cx = [100, 270, 440]; ZC = -26                         # column centres, and the depth centre of the columns / pads
    # footings and tie beams, then columns, beam, slab (heights above the ground line y = 0)
    for i, x in enumerate(cx): block('Footing%d' % i, x - 50, x + 50, -30, 6, ZC - 50, ZC + 50, bevel=1.6)
    for i, x in enumerate(cx): block('Column%d' % i, x - 16, x + 16, 6, 196, ZC - 16, ZC + 16, bevel=1.4)      # the columns stand straight on the footings (no tie beams: they read as stray blocks)
    block('Beam', 64, 476, 196, 236, -104, -6, bevel=1.6)
    block('Slab', 40, 500, 236, 264, -116, 4, bevel=1.8)
    # rebar stubs standing out of the slab (a pair at each column)
    for x in cx:
        for dx in (-8, 8): ribbed('Stub', 0, 1, 0, 0, 1) if False else cyl('Stub', x + dx, 264 + 22, -60, 2.3, 44, mat=RUST, seg=14, bevel=0)
    # soil bank with pebbles
    n = 90; bm = bmesh.new(); X0, X1, Z0, Z1, SY = -60, 600, -140, 640, -12
    rng = np.random.default_rng(3); H = np.zeros((n + 1, n + 1)); H += 2.6 * pnoise(rng, 128, 1.2)[:n + 1, :n + 1]
    verts = [[bm.verts.new(V(X0 + (X1 - X0) * i / n, SY + H[i, j] + 2.0 * math.sin(i * .17) * math.cos(j * .13), Z1 - (Z1 - Z0) * j / n)) for j in range(n + 1)] for i in range(n + 1)]
    for i in range(n):
        for j in range(n): bm.faces.new((verts[i][j], verts[i + 1][j], verts[i + 1][j + 1], verts[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('Soil'); bm.to_mesh(me); bm.free(); soil = bpy.data.objects.new('Soil', me); scene.collection.objects.link(soil); finish(soil, SOIL, 0)
    rocks = [make_rock(s) for s in range(90, 100)]; rr = random.Random(5)
    for i in range(720):
        x = rr.uniform(X0 + 10, X1 - 10); z = rr.uniform(Z0 + 10, 420)
        if abs(((x - 100) % 170) - 85) > 85 - 3: pass
        r = rr.choice([1.4, 1.8, 2.2, 2.8, 3.6, 4.6]) * rr.uniform(.8, 1.2)
        ob = bpy.data.objects.new('p%03d' % i, rocks[i % len(rocks)]); scene.collection.objects.link(ob)
        ob.location = V(x, SY + r * .45 + 1.0, z); ob.rotation_euler = (rr.uniform(0, 6.28), rr.uniform(0, 6.28), rr.uniform(0, 6.28)); ob.scale = (r * U,) * 3
    common(LK, WK)
    PITCH = math.radians(11.0); cp, sp = math.cos(PITCH), math.sin(PITCH)
    cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = 800 * U; cam.clip_start = .05; cam.clip_end = 30
    co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
    Ty = (360 - 235) / cp                                  # model (y = 0, z = 0) lands on viewBox row 360 (the old ground line); frame centre row = 20 + 430 / 2
    co.location = V(400, Ty + 9000 * sp, 9000 * cp); co.rotation_euler = (math.radians(90) - PITCH, 0, 0)
    W = 1100 if QUICK else 2400; scene.render.resolution_x = W; scene.render.resolution_y = int(W * 430 / 800)
    scene.cycles.samples = 64 if QUICK else 320
    scene.render.filepath = os.path.join(OUT, 'frame.png'); bpy.ops.render.render(write_still=True)
    print('[frame] frame done')

# ================================================================ the sections
def build_section(k):
    clear()
    D = 30
    def bar(x, y, r): return cyl('b', x, y, -D / 2 + 2, r, D + 4, axis='z', mat=RUST, seg=24, bevel=0.0)
    def rect(x0, x1, y0, y1): return block('c', x0, x1, y0, y1, -D, 0, bevel=1.6)
    if k == 'slab':
        rect(-180, 180, -42, 42)
        for i in range(-4, 5):
            bar(i * 40, -26, 5.5)
            if i % 2 == 0 and i < 4: bar(i * 40 + 20, 26, 4.4)
    elif k == 'beam':
        rect(-75, 75, -125, 125); rrect_curve('stir', 124, 224, 12, 1.0, tube=2.2)
        for x in (-45, 0, 45): bar(x, -97, 5.5)
        for x in (-50, 50): bar(x, 97, 5.0)
    elif k == 'column':
        rect(-95, 95, -95, 95); rrect_curve('stir', 160, 160, 9, 1.0, tube=2.2)
        for p in ((-66, -66), (66, -66), (-66, 66), (66, 66), (0, -66), (0, 66), (-66, 0), (66, 0)): bar(p[0], p[1], 6.5)
    elif k == 'footing':
        rect(-120, 120, -34, 34); rect(-20, 20, 34, 70)
        for f in range(-5, 6): bar(f * 20, -24, 3.6)
        for x in (-12, -4, 4, 12): cyl('d', x, 20, -D / 2 + 2, 1.8, 92, axis='y', mat=RUST, seg=10)
    else:
        rect(-125, 125, -30, 22); rect(-125, -79, 22, 52); rect(79, 125, 22, 52); rect(-20, 20, 22, 70)
        for g in range(-5, 6): bar(g * 22, -20, 3.6)
    common(float(os.environ.get('LK', '0.5')), float(os.environ.get('WK', '0.30')))
    PITCH = math.radians(8.0); cp, sp = math.cos(PITCH), math.sin(PITCH)
    cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = 700 / 1.8 * U; cam.clip_start = .05; cam.clip_end = 30
    co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
    co.location = V(0, 9000 * sp, 9000 * cp); co.rotation_euler = (math.radians(90) - PITCH, 0, 0)
    W = 700 if QUICK else 1400; scene.render.resolution_x = W; scene.render.resolution_y = int(W * 560 / 700)
    scene.cycles.samples = 48 if QUICK else 256
    scene.render.filepath = os.path.join(OUT, 'sec-%s.png' % k); bpy.ops.render.render(write_still=True)
    print('[frame] section', k)

if MODE in ('frame', 'all'): build_frame()
if MODE in ('sections', 'all'):
    for k in ('slab', 'beam', 'column', 'footing', 'foundation'): build_section(k)
print('[frame] done')
