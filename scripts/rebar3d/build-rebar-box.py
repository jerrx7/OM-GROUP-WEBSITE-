"""OM GROUP - "aggregate between reinforcement bars" box (10mm aggregates page, rebar lab).

Builds the whole asset in Blender, headless:
  blender -b --factory-startup -P scripts/rebar3d/build-rebar-box.py -- <repo root> [--quick]

Output
  assets/3d/rebar-box.glb                    the box (PBR materials, named nodes, instanced stones)
  _review/rebar3d/*.png                      Cycles stills: poster, studio background, floor shadow
  _review/rebar3d/rebar-box.blend            source
  _review/rebar3d/meta.json                  constants the web component mirrors

Units are metres. Blender axes: X right, -Y toward the viewer, Z up. glTF/three.js (+Y up) maps (x,y,z) -> (x, z, -y).
Helpers take three.js-style coordinates (x right, y up, z toward the viewer) and convert.

Camera: orthographic, pitched down 5 degrees. The composition follows the approved reference picture (1536 x 1024); the numbers in the
build code are reference pixels, converted by ref_x() / ref_y(). The frame is the reference's card: x 35..1500, y 65..968.
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd())
QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'rebar3d'); TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True); os.makedirs(os.path.join(ROOT, 'assets', '3d'), exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'rebar-box.glb')

# ---------------------------------------------------------------- reference picture -> metres
TH = math.radians(5.0)               # camera pitch
SIN, COS = math.sin(TH), math.cos(TH)
FLOORPX = 912.0                      # picture row of the floor line at z = 0
FX0, FY0, PXW, PXH = 35.0, 65.0, 1465.0, 903.0    # the card: left, top, width, height in reference pixels
CX, CY = FX0 + PXW / 2, FY0 + PXH / 2
def ref_x(px): return (px - CX) / 1000.0
def ref_y(py, z):                    # true height of a feature whose front face (at depth z) sits at picture row py
    return ((FLOORPX - py) / 1000.0 + z * SIN) / COS
def pxw(w): return w / 1000.0

# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'; scene.render.engine = 'CYCLES'

def gpu_on():
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
            try: prefs.compute_device_type = kind
            except Exception: continue
            prefs.get_devices()
            devs = [d for d in prefs.devices if d.type == kind]
            if devs:
                for d in prefs.devices: d.use = d.type == kind
                scene.cycles.device = 'GPU'; print('[rebar3d] Cycles device:', kind); return
    except Exception as e: print('[rebar3d] GPU setup failed', e)
    scene.cycles.device = 'CPU'
gpu_on()

def V(x, y, z): return Vector((x, -z, y))           # three.js -> blender

# ---------------------------------------------------------------- textures (numpy, periodic)
def pnoise(rng, N, beta):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1; F *= f ** (-beta); F[0, 0] = 0
    o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)

def normal_from_height(h, px_mm, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / (2 * (1 / px_mm)); dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / (2 * (1 / px_mm))
    n = np.dstack([-dx * strength, -dy * strength, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5

def save_img(name, arr, cs):
    N = arr.shape[0]
    if arr.ndim == 2: arr = np.dstack([arr, arr, arr])
    rgba = np.ones((N, arr.shape[1], 4), dtype=np.float32); rgba[..., :3] = arr
    img = bpy.data.images.new(name, arr.shape[1], N, alpha=False); img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'; img.save(); img.colorspace_settings.name = cs
    return img

def stamp_fn(rng, N):
    def stamp(cx, cy, r, aspect, ang, fn):
        R = int(math.ceil(r * max(aspect, 1 / aspect) * 1.3 + 2))
        xs = np.arange(int(cx) - R, int(cx) + R + 1); ys = np.arange(int(cy) - R, int(cy) + R + 1)
        X, Y = np.meshgrid(xs + .5 - cx, ys + .5 - cy); ca, sa = math.cos(ang), math.sin(ang)
        u = X * ca + Y * sa; v = (-X * sa + Y * ca) * aspect; th = np.arctan2(v, u); ph = rng.uniform(0, 6.3, 2)
        rr = r * (1 + .22 * (.6 * np.sin(2 * th + ph[0]) + .4 * np.sin(3 * th + ph[1])))
        d = np.sqrt(u * u + v * v) / rr; m = np.clip((1 - d) * rr / 1.1, 0, 1)
        if m.max() > 0: fn(np.ix_(ys % N, xs % N), m, np.clip(d, 0, 1))
    return stamp

def satin_maps(N=512, seed=3):
    """Fine bead-blasted grain for the painted / graphite / steel parts: isotropic, tiny, never directional."""
    rng = np.random.default_rng(seed)
    h = 0.5 * pnoise(rng, N, .12) + 0.35 * pnoise(rng, N, .5) + 0.15 * pnoise(rng, N, 1.1)
    for _ in range(26):
        a = rng.uniform(0, np.pi); L = rng.uniform(.1, .3) * N; x0, y0 = rng.uniform(0, N, 2)
        t = np.linspace(0, L, int(L) * 2); xs = (x0 + t * np.cos(a)).astype(int) % N; ys = (y0 + t * np.sin(a)).astype(int) % N; h[ys, xs] -= 1.1
    return normal_from_height(h * 0.02, 1.0, 1.0), h

def brushed_maps(N=512, seed=9):
    """Fine horizontal brushing for the stainless funnel."""
    rng = np.random.default_rng(seed)
    w = rng.standard_normal((N, N)); k = np.exp(-np.linspace(-3, 3, 41) ** 2); k /= k.sum()
    h = np.apply_along_axis(lambda r: np.convolve(np.r_[r[-20:], r, r[:20]], k, mode='valid'), 1, w)[:, :N]
    h = (h - h.mean()) / (h.std() + 1e-9)
    return normal_from_height(h * 0.05, 1.0, 1.0), h

def rough_map(h, mean, amp):
    return np.clip(mean + amp * (h / (np.abs(h).max() + 1e-9)), 0.02, 1.0)

def rock_maps(N=512, seed=11):
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    base = np.array([.50, .50, .495])
    alb = np.empty((N, N, 3)); alb[:] = base
    alb *= (1 + .10 * pnoise(rng, N, 1.3) + .06 * pnoise(rng, N, .6))[..., None]
    alb *= (1 + .07 * pnoise(rng, N, .15))[..., None]
    h = .5 * pnoise(rng, N, 1.1) + .35 * pnoise(rng, N, .35) + .2 * pnoise(rng, N, 0.05)
    k = .35 if QUICK else 1.0
    def fleck(ix, m, d, col, lift):
        a = (m * .8)[..., None]; alb[ix] = alb[ix] * (1 - a) + col * a; h[ix] += m * lift * np.sqrt(np.clip(1 - d * d, 0, 1))
    for _ in range(int(5200 * k)):                           # mineral grain: light quartz-ish and dark biotite-ish flecks
        r = rng.uniform(1.4, 4.6); g = rng.choice([rng.uniform(.62, .84), rng.uniform(.08, .2), rng.uniform(.4, .52)], p=[.3, .3, .4])
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, rng.uniform(.7, 1.4), rng.uniform(0, 3.14), lambda ix, m, d, g=g: fleck(ix, m, d, np.array([g, g * .99, g * .97]), rng.uniform(.1, .4)))
    for _ in range(int(900 * k)):                            # pits
        r = rng.uniform(2.5, 9)
        def pit(ix, m, d): h[ix] -= m * rng.uniform(.5, 1.1) * np.sqrt(np.clip(1 - d * d, 0, 1)); alb[ix] *= (1 - .3 * m)[..., None]
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, rng.uniform(.7, 1.5), rng.uniform(0, 3.14), pit)
    alb = np.clip(alb, 0, 1); nrm = normal_from_height(h * .085, 1.0, 1.0)
    return alb, nrm, np.clip(.86 + .06 * pnoise(rng, N, .6), .6, 1)

def grid_tex(N=128):
    """One cell of the faint drafting grid (the wall of the studio): hairline on the left and bottom edge."""
    a = np.empty((N, N, 3)); a[:] = (0.965, 0.952, 0.930)
    ln = (0.872, 0.857, 0.826)
    a[:, :6] = ln; a[-6:, :] = ln
    return a

nrm_satin, h_satin = satin_maps()
img_satin_n = save_img('satin_normal', nrm_satin, 'Non-Color')
nrm_brush, h_brush = brushed_maps()
img_brush_n = save_img('brush_normal', nrm_brush, 'Non-Color')
rock_alb, rock_nrm, rock_rgh = rock_maps()
img_rock_a = save_img('rock_albedo', rock_alb, 'sRGB'); img_rock_n = save_img('rock_normal', rock_nrm, 'Non-Color'); img_rock_r = save_img('rock_roughness', rock_rgh, 'Non-Color')
img_grid = save_img('grid', grid_tex(), 'sRGB')

# ---------------------------------------------------------------- materials
def pbr(name, color, metal, rough, nrm=None, nstr=0.35, rimg=None, alpha=None, emit=None):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N, L = nt.nodes, nt.links; P = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    if isinstance(color, tuple): P.inputs['Base Color'].default_value = (*color, 1)
    P.inputs['Metallic'].default_value = metal; P.inputs['Roughness'].default_value = rough
    uv = N.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img):
        t = N.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Linear'; L.new(uv.outputs['UV'], t.inputs['Vector']); return t
    if not isinstance(color, tuple):
        t = tex(color); L.new(t.outputs['Color'], P.inputs['Base Color'])
    if rimg is not None: L.new(tex(rimg).outputs['Color'], P.inputs['Roughness'])
    if nrm is not None:
        nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L.new(tex(nrm).outputs['Color'], nm.inputs['Color']); L.new(nm.outputs['Normal'], P.inputs['Normal'])
    return m

def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]; return tuple(((x + .055) / 1.055) ** 2.4 if x > .04045 else x / 12.92 for x in c)

def rimg(name, mean, amp, h=None): return save_img('r_' + name, rough_map(h_satin if h is None else h, mean, amp), 'Non-Color')
MAT = {
    'post': pbr('PostSteel', (.30, .31, .335), .9, .36, img_satin_n, .4, rimg('post', .36, .07)),
    'postin': pbr('PostInner', (.085, .09, .10), .6, .42, img_satin_n, .5, rimg('postin', .42, .06)),
    'graphite': pbr('GraphiteSteel', (.075, .08, .09), .55, .42, img_satin_n, .5, rimg('graphite', .40, .07)),
    'rear': pbr('RearPlate', (.085, .09, .10), .4, .55, img_satin_n, .4, rimg('rear', .6, .05)),
    'stainless': pbr('StainlessSteel', (.86, .87, .89), 1.0, .30, img_brush_n, .45, rimg('stainless', .30, .08, h_brush)),
    'machined': pbr('MachinedSteel', (.62, .64, .67), 1.0, .30, img_satin_n, .35, rimg('machined', .30, .05)),
    'chrome': pbr('ChromeSteel', (.90, .91, .93), 1.0, .07, None, 0, None),
    'orange': pbr('LidOrange', tuple(c * .64 for c in srgb('#F65A0A')), 0.0, .5, img_satin_n, .2, rimg('orange', .5, .04)),
    'rebar': pbr('RebarSteel', (.20, .19, .185), 1.0, .40, img_satin_n, .5, rimg('rebar', .42, .08)),
    'stone': pbr('FracturedStone', img_rock_a, 0.0, .88, img_rock_n, 1.0, img_rock_r),
}

# ---------------------------------------------------------------- mesh helpers (three.js coordinates)
objs = []
def box_uv(ob, tile=0.12):
    me = ob.data; me.uv_layers.new(name='UVMap'); bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv['UVMap']
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co + ob.location
            if ax == 2: u, v = c.x, c.y
            elif ax == 1: u, v = c.x, c.z
            else: u, v = c.y, c.z
            lp[uvl].uv = (u / tile, v / tile)
    bm.to_mesh(me); bm.free()

def new_obj(name, bm, mat, parent=None, loc=(0, 0, 0), bevel=0.0, bev_seg=2, angle=40, uv=True, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    if mat is not None: me.materials.append(mat)
    ob.location = V(*loc)
    bpy.context.view_layer.objects.active = ob
    for p in me.polygons: p.use_smooth = smooth
    if bevel > 0:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = bev_seg; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(angle); bv.profile = .6
        try: bv.harden_normals = True
        except Exception: pass
        bpy.ops.object.modifier_apply(modifier=bv.name)
        wn = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 100; bpy.ops.object.modifier_apply(modifier=wn.name)
    if uv: box_uv(ob)
    if parent: ob.parent = parent
    objs.append(ob); return ob

def empty(name, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); scene.collection.objects.link(e); e.location = V(*loc)
    if parent: e.parent = parent
    return e

def add_box(bm, c, s, rot=None):
    m = Matrix.Translation(V(*c))
    if rot is not None: m = m @ rot
    bmesh.ops.create_cube(bm, size=1.0, matrix=m @ Matrix.Diagonal((s[0], s[2], s[1], 1)))
def add_cyl(bm, c, r, h, seg=64, r2=None, axis='y'):
    m = Matrix.Translation(V(*c))
    if axis == 'z': m = m @ Matrix.Rotation(math.radians(90), 4, 'X')    # three +z (toward the viewer)
    if axis == 'x': m = m @ Matrix.Rotation(math.radians(90), 4, 'Y')
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=(r if r2 is None else r2), depth=h, matrix=m)
def hexbolt(bm, x, y, z, r=.0075, h=.006, axis='z'): add_cyl(bm, (x, y, z), r, h, seg=6, axis=axis)

def lathe(bm, prof, seg=112, c=(0, 0)):
    """revolve a profile [(radius, y)] about the vertical axis through (c[0], c[1]) (x, z), top to bottom"""
    rings = []
    for (r, y) in prof:
        rings.append([bm.verts.new(V(c[0] + r * math.cos(2 * math.pi * k / seg), y, c[1] + r * math.sin(2 * math.pi * k / seg))) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

def ribbed_bar(bm, x0, x1, y, z, R, amp=.0028, pitch=.021, seg=22):
    """a deformed reinforcing bar along x: diagonal ribs on both sides, as on real rebar"""
    n = int((x1 - x0) / .0016); cols = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n; ring = []
        for k in range(seg):
            th = 2 * math.pi * k / seg
            rib = max(0.0, math.cos(2 * math.pi * x / pitch - 2 * th)) ** 1.5
            long = max(0.0, math.cos(th * 2)) ** 14                          # the two longitudinal ribs
            r = R + amp * rib * (1 if (k % 1 == 0) else 1) + amp * .8 * long
            ring.append(bm.verts.new(V(x, y + r * math.cos(th), z + r * math.sin(th))))
        cols.append(ring)
    for i in range(n):
        for k in range(seg): bm.faces.new((cols[i][k], cols[i][(k + 1) % seg], cols[i + 1][(k + 1) % seg], cols[i + 1][k]))
    c0 = bm.verts.new(V(x0, y, z)); c1 = bm.verts.new(V(x1, y, z))
    for k in range(seg):
        bm.faces.new((c0, cols[0][(k + 1) % seg], cols[0][k])); bm.faces.new((c1, cols[-1][k], cols[-1][(k + 1) % seg]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

# ================================================================ THE BOX
root = empty('RebarBox')
housing = empty('Housing', root)
D = .42                                               # depth of the box (z 0 .. -D)
L_, R_ = ref_x(310), ref_x(945)                       # inner faces of the posts
CXI = (L_ + R_) / 2; WI = R_ - L_                     # centre and clear width of the inside
Y_FLOOR = ref_y(822, 0)                               # inside floor
Y_BASE0 = ref_y(845, 0)                               # underside of the base frame
Y_LINT0, Y_LINT1 = ref_y(310, 0), ref_y(296, 0)       # lintel
Y_POST = ref_y(258, 0)                                # top of the posts
Y_CEIL = Y_LINT0 - .002                               # inside ceiling
Z_BACK = -.40                                         # the back panel
print('[rebar3d] inside width', WI, 'height', Y_CEIL - Y_FLOOR)

# ---- posts: an outer light strip and a darker inner strip, hex bolts on the join
for side, xo, xi in ((-1, ref_x(243), ref_x(310)), (1, ref_x(1015), ref_x(945))):
    xa, xb = min(xo, xi), max(xo, xi); xj = ref_x(272) if side < 0 else ref_x(985)
    xs = (xa + xj) / 2 if side < 0 else (xj + xb) / 2          # outer strip lies between the outer edge and the join line
    xo0, xo1 = (xa, xj) if side < 0 else (xj, xb)
    xi0, xi1 = (xj, xb) if side < 0 else (xa, xj)
    ym = (Y_BASE0 + Y_POST) / 2; H = Y_POST - Y_BASE0
    bm = bmesh.new(); add_box(bm, ((xo0 + xo1) / 2, ym, -D / 2), (xo1 - xo0, H, D)); new_obj('PostOuter' + ('L' if side < 0 else 'R'), bm, MAT['post'], housing, bevel=.0022, bev_seg=2)
    bm = bmesh.new(); add_box(bm, ((xi0 + xi1) / 2, ym - .008, -.020), (xi1 - xi0, H - .016, .034)); new_obj('PostInner' + ('L' if side < 0 else 'R'), bm, MAT['postin'], housing, bevel=.0018, bev_seg=2)
    bm = bmesh.new()
    for yb in (ref_y(303, 0), ref_y(812, 0)): hexbolt(bm, xj, yb, .003, r=.0082, h=.007)
    new_obj('PostBolts' + ('L' if side < 0 else 'R'), bm, MAT['chrome'], housing, bevel=.0008, bev_seg=1)
    bm = bmesh.new(); add_box(bm, ((xa + xb) / 2, Y_POST - .0095, -D / 2 - .004), (xb - xa + .004, .019, D + .012)); new_obj('PostCap' + ('L' if side < 0 else 'R'), bm, MAT['graphite'], housing, bevel=.003, bev_seg=2)

# ---- lintel, ceiling, back panel, floor, base frame
bm = bmesh.new(); add_box(bm, (CXI, (Y_LINT0 + Y_LINT1) / 2, -.018), (WI + .004, Y_LINT1 - Y_LINT0, .040)); new_obj('Lintel', bm, MAT['graphite'], housing, bevel=.0018)
bm = bmesh.new(); add_box(bm, (CXI, Y_CEIL + .006, -D / 2 - .005), (WI + .004, .012, D - .01)); new_obj('Ceiling', bm, MAT['rear'], housing, bevel=.001)
bm = bmesh.new(); add_box(bm, (CXI, (Y_FLOOR + Y_CEIL) / 2, Z_BACK - .01), (WI + .004, Y_CEIL - Y_FLOOR, .02)); new_obj('BackPanel', bm, MAT['rear'], housing, bevel=.001)
bm = bmesh.new(); add_box(bm, (CXI, Y_FLOOR - .005, -D / 2 - .005), (WI + .004, .010, D - .02)); new_obj('InnerFloor', bm, MAT['graphite'], housing, bevel=.001)
bm = bmesh.new(); add_box(bm, ((ref_x(243) + ref_x(1015)) / 2, (Y_BASE0 + Y_FLOOR) / 2 - .002, -.030), (ref_x(1015) - ref_x(243), Y_FLOOR - Y_BASE0 + .004, .060)); new_obj('BaseRail', bm, MAT['graphite'], housing, bevel=.0024, bev_seg=2)
bm = bmesh.new(); add_box(bm, ((ref_x(243) + ref_x(1015)) / 2, Y_BASE0 + .004, -D / 2), (ref_x(1015) - ref_x(243) - .01, .008, D - .02)); new_obj('BasePlate', bm, MAT['rear'], housing, bevel=.001)
# chrome bolt heads on the back panel
bm = bmesh.new(); bolt_y = ref_y(365, Z_BACK)
for px in (CXI - .145 + .006, CXI - .005 + .006, CXI + .117 + .006): add_cyl(bm, (px, bolt_y, Z_BACK + .0035), .0145, .007, seg=40, axis='z')
new_obj('BackBolts', bm, MAT['chrome'], housing, bevel=.0016, bev_seg=2)
# feet
bm = bmesh.new()
for (fx, fz) in ((-.441, -.070), (.164, -.070), (-.388, -.350), (.099, -.350)):
    add_cyl(bm, (fx, .030, fz), .044, .060, seg=56, r2=.047)
new_obj('Feet', bm, MAT['machined'], housing, bevel=.0014, bev_seg=2)
bm = bmesh.new()
for (fx, fz) in ((-.441, -.070), (.164, -.070), (-.388, -.350), (.099, -.350)): add_cyl(bm, (fx, .007, fz), .052, .014, seg=56)
new_obj('FeetFlange', bm, MAT['postin'], housing, bevel=.0014, bev_seg=2)

# ---- funnel: orange lid, brushed stainless cone, neck
funnel = empty('Funnel', root); FC = (CXI, -.21)
Y_LID1, Y_LID0 = ref_y(105, FC[1]), ref_y(138, FC[1]); Y_CONE1 = ref_y(265, FC[1]); Y_NECK = ref_y(296, FC[1])
bm = bmesh.new(); add_cyl(bm, (FC[0], (Y_LID0 + Y_LID1) / 2, FC[1]), .183, Y_LID1 - Y_LID0, seg=96)
new_obj('FunnelLid', bm, MAT['orange'], funnel, bevel=.0032, bev_seg=3)
bm = bmesh.new(); lathe(bm, [(.1685, Y_LID0 + .001), (.1685, Y_LID0 - .004), (.0800, Y_CONE1 + .0025), (.0775, Y_CONE1), (.0775, Y_NECK)], seg=112, c=FC)
new_obj('FunnelCone', bm, MAT['stainless'], funnel, bevel=0, uv=False)
# cylindrical uv for the brushed grain (u around, v along)
ob = objs[-1]; me = ob.data; me.uv_layers.new(name='UVMap'); bm2 = bmesh.new(); bm2.from_mesh(me); uvl = bm2.loops.layers.uv['UVMap']
for f in bm2.faces:
    for lp in f.loops:
        c = lp.vert.co; lp[uvl].uv = (math.atan2(c.y, c.x) / (2 * math.pi) * 6.0, c.z * 9.0)
bm2.to_mesh(me); bm2.free()
bm = bmesh.new(); add_cyl(bm, (FC[0], Y_NECK + .003, FC[1]), .0815, .006, seg=96)
new_obj('FunnelCollar', bm, MAT['machined'], funnel, bevel=.0012)

# ---- reinforcement: three transverse bars seen end-on, a ribbed longitudinal bar under them, a second lighter row below
rebar = empty('Reinforcement', root)
BX = [ref_x(397), ref_x(633), ref_x(860)]; RB = .034; BY = ref_y(462, -.02)
Z_F, Z_B = -.022, Z_BACK + .002
bm = bmesh.new()
for bx in BX: add_cyl(bm, (bx, BY, (Z_F + Z_B) / 2), RB, Z_F - Z_B, seg=56, axis='z')
new_obj('BarsTransverse', bm, MAT['rebar'], rebar, bevel=.0016, bev_seg=2)
bm = bmesh.new()
for bx in BX:
    add_cyl(bm, (bx, BY, Z_F + .0012), RB - .0035, .0028, seg=56, axis='z')       # the bright cut face
new_obj('BarFaces', bm, MAT['machined'], rebar, bevel=.0007, bev_seg=1)
bm = bmesh.new()
for bx in BX: add_cyl(bm, (bx, BY, Z_F + .0042), .0112, .0052, seg=40, r2=.0085, axis='z')     # centre boss
new_obj('BarBosses', bm, MAT['chrome'], rebar, bevel=.0008, bev_seg=2)
YL = BY - RB + .004; bm = bmesh.new(); ribbed_bar(bm, L_ + .004, R_ - .004, YL, -.20, .0205)
new_obj('BarLongitudinal', bm, MAT['rebar'], rebar, uv=False, smooth=True)
YL2 = ref_y(613, -.20)
bm = bmesh.new(); ribbed_bar(bm, L_ + .004, R_ - .004, YL2, -.20, .0125, amp=.0018, pitch=.015, seg=18)
new_obj('RailLower', bm, MAT['rebar'], rebar, uv=False)
PX2 = [ref_x(388 + k * 111.5) for k in range(5)]; PY2 = ref_y(596, -.02)
bm = bmesh.new()
for bx in PX2: add_cyl(bm, (bx, PY2, (Z_F + Z_B) / 2), .0105, Z_F - Z_B, seg=32, axis='z')
new_obj('PinsLower', bm, MAT['rebar'], rebar, bevel=.0010, bev_seg=1)
bm = bmesh.new()
for bx in PX2: add_cyl(bm, (bx, PY2, Z_F + .001), .0088, .0026, seg=32, axis='z')
new_obj('PinFaces', bm, MAT['machined'], rebar, bevel=.0005, bev_seg=1)

# ================================================================ aggregate: three layers, deterministic, instanced
def make_rock(prefix, seed, sharp=1.0):
    rng = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    sx, sy, sz = rng.uniform(.95, 1.4), rng.uniform(.62, .95), rng.uniform(.8, 1.2)
    planes = []
    for _ in range(rng.randint(12, 16)):
        n = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized(); planes.append((n, rng.uniform(.5, .76)))
    s1, s2, s3 = rng.uniform(0, 9), rng.uniform(0, 9), rng.uniform(0, 9)
    for v in bm.verts:
        p = v.co.copy(); p *= 1 + .07 * math.sin(p.x * 3.1 + s1) * math.cos(p.y * 2.6 + s2) + .05 * math.sin(p.z * 4.3 + s3)
        for n, off in planes:
            d = p.dot(n) - off
            if d > 0: p -= n * d
        v.co = Vector((p.x * sx, p.y * sy, p.z * sz))
    rm = math.sqrt(sum(v.co.length_squared for v in bm.verts) / len(bm.verts))
    for v in bm.verts: v.co /= rm * 1.14
    for f in bm.faces: f.smooth = False
    me = bpy.data.meshes.new('%s_%02d' % (prefix, seed)); bm.to_mesh(me); bm.free(); me.materials.append(MAT['stone'])
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co
            u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z)); lp[uvl].uv = (u * .55 + (.13 * f.index) % 1, v * .55 + .31 * (f.index % 7) / 7)
    b2.to_mesh(me); b2.free(); return me

ROCK_T = [make_rock('rockT', s) for s in (3, 4, 7, 8, 11)]       # large, resting on the bars (cool grey)
ROCK_M = [make_rock('rockM', s) for s in (13, 14, 17, 18)]       # large, resting on the lower row (warmer)
ROCK_B = [make_rock('rockB', s) for s in range(21, 29)]          # the 10 mm bed

def place(layer, meshes, parent, items, seed):
    rng = random.Random(seed); out = []
    for i, (x, y, z, r) in enumerate(items):
        ob = bpy.data.objects.new('s%s%03d' % (layer, i), meshes[i % len(meshes)]); scene.collection.objects.link(ob); ob.parent = parent
        ob.location = V(x, y, z); ob.rotation_euler = (rng.uniform(0, 6.28), rng.uniform(0, 6.28), rng.uniform(0, 6.28)); ob.scale = (r,) * 3; out.append(ob)
    return out

def on_bars(px_row_centre_list, zs, bars_px, layer_rng):
    pass

# ---- top layer: large stones resting on the first row of bars (hand placed on the reference: x px, centre row px, radius px, depth)
yT = lambda row: ref_y(row, -.06)
TOP = [(368, 392, 38, -.060), (350, 440, 24, -.045), (472, 425, 42, -.060), (550, 428, 28, -.055), (622, 417, 45, -.062), (712, 421, 42, -.060), (798, 419, 44, -.060), (885, 410, 27, -.050),
       (418, 408, 34, -.175), (518, 396, 34, -.185), (668, 394, 38, -.180), (845, 398, 36, -.175), (590, 390, 28, -.250), (748, 392, 30, -.255), (480, 392, 30, -.265), (905, 398, 28, -.245),
       (372, 410, 30, -.28), (815, 392, 28, -.31), (650, 380, 26, -.33)]
top_items = [(ref_x(px), yT(row), z, pxw(r)) for (px, row, r, z) in TOP]
# ---- middle layer
MID = [(352, 548, 28, -.050), (452, 552, 45, -.060), (560, 570, 32, -.055), (655, 548, 50, -.062), (770, 545, 60, -.065), (880, 568, 36, -.050),
       (505, 540, 34, -.18), (710, 535, 40, -.18), (835, 540, 36, -.19), (400, 535, 30, -.19), (600, 530, 34, -.28), (760, 528, 38, -.30), (470, 530, 30, -.30)]
mid_items = [(ref_x(px), yT(row), z, pxw(r)) for (px, row, r, z) in MID]

# ---- bottom bed: gravity packing in a box, the 10 mm fraction
def pack_bed(seed=21):
    rng = random.Random(seed); placed = []
    floor, top = Y_FLOOR, ref_y(627, -.05); xl, xr = L_ + .003, R_ - .003; zf, zb = -.030, -.200
    radii = [.0275] * 3 + [.0255] * 4 + [.0235] * 4 + [.0215] * 3 + [.0195] * 2 + [.0175] * 1
    def sample_r(): return rng.choice(radii) * rng.uniform(.92, 1.1)
    fails = 0
    while fails < 420:                                    # the visible front layer: lowest of several random drops wins, so voids fill first
        best = None
        for _ in range(16):
            r = sample_r(); x = rng.uniform(xl + r, xr - r); y = floor + r * .92; zc = zf - r * .62
            for (px, py, pz, pr) in placed:
                if abs(pz - zc) > .02: continue
                dx = px - x; m = pr + r - .0016
                if abs(dx) < m: y = max(y, py + math.sqrt(m * m - dx * dx))
            if y + r <= top and (best is None or y < best[1]): best = (x, y, zc + rng.uniform(-.003, .003), r)
        if best is None: fails += 1; continue
        placed.append(best); fails = 0
    nfront = len(placed); fails = 0
    while fails < 500:                                    # layers behind
        best = None
        for _ in range(8):
            r = sample_r() * 1.05; x = rng.uniform(xl + r, xr - r); z = rng.uniform(zb + r, zf - r * 1.9); y = floor + r * .92
            for (px, py, pz, pr) in placed:
                d2 = (px - x) ** 2 + (pz - z) ** 2; m = pr + r - .0006
                if d2 < m * m: y = max(y, py + math.sqrt(m * m - d2))
            if y + r <= top and (best is None or y < best[1]): best = (x, y, z, r)
        if best is None: fails += 1; continue
        placed.append(best); fails = 0
    print('[rebar3d] bed stones:', len(placed), '(front layer', nfront, ')'); return placed
bed_items = pack_bed()

agg_t = empty('AggregateTop', root); agg_m = empty('AggregateMid', root); agg_b = empty('AggregateBottom', root)
inst_t = place('T', ROCK_T, agg_t, top_items, 31); inst_m = place('M', ROCK_M, agg_m, mid_items, 32); inst_b = place('B', ROCK_B, agg_b, bed_items, 33)
inst = inst_t + inst_m + inst_b
print('[rebar3d] stones: top', len(inst_t), 'mid', len(inst_m), 'bottom', len(inst_b))

# ================================================================ studio (render only: not exported)
def cyclorama():
    zf, zb, R, H, W, TILE = 3.0, -.85, .40, 5.0, 14.0, .035
    prof = [(zf, 0.0), (zb + R, 0.0)] + [(zb + R - R * math.sin(math.radians(a)), R - R * math.cos(math.radians(a))) for a in range(6, 91, 6)] + [(zb, H)]
    s = [0.0]
    for i in range(1, len(prof)): s.append(s[-1] + math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]))
    bm = bmesh.new(); a = [bm.verts.new(V(-W / 2, y, z)) for (z, y) in prof]; b = [bm.verts.new(V(W / 2, y, z)) for (z, y) in prof]
    for i in range(len(prof) - 1): bm.faces.new((a[i], b[i], b[i + 1], a[i + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); me = bpy.data.meshes.new('Cyc'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.uv_layers.new(name='UVMap'); uv = me.uv_layers['UVMap'].data; n = len(prof)
    for p in me.polygons:
        for li in p.loop_indices:
            vi = me.loops[li].vertex_index; side, row = (0, vi) if vi < n else (1, vi - n)
            uv[li].uv = ((-W / 2 if side == 0 else W / 2) / TILE, s[row] / TILE)
    ob = bpy.data.objects.new('Cyc', me); scene.collection.objects.link(ob); return ob
cyc = cyclorama()
cm = bpy.data.materials.new('CycWall')
try: cm.use_nodes = True
except Exception: pass
cn, cl = cm.node_tree.nodes, cm.node_tree.links; cp = next(n for n in cn if n.type == 'BSDF_PRINCIPLED')
gt = cn.new('ShaderNodeTexImage'); gt.image = img_grid; gt.interpolation = 'Linear'; guv = cn.new('ShaderNodeUVMap'); guv.uv_map = 'UVMap'; cl.new(guv.outputs['UV'], gt.inputs['Vector'])
cl.new(gt.outputs['Color'], cp.inputs['Base Color']); cp.inputs['Roughness'].default_value = .85
try:
    cl.new(gt.outputs['Color'], cp.inputs['Emission Color']); cp.inputs['Emission Strength'].default_value = float(os.environ.get('EK', '0.55'))
except Exception as e: print('[rebar3d] emission', e)
cyc.data.materials.append(cm)
fm = bpy.data.materials.new('CycFloor')
try: fm.use_nodes = True
except Exception: pass
fp = next(n for n in fm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); fp.inputs['Base Color'].default_value = (.80, .79, .77, 1); fp.inputs['Roughness'].default_value = float(os.environ.get('FR', '0.12'))
try: fp.inputs['Specular IOR Level'].default_value = float(os.environ.get('FS', '0.5'))
except Exception: pass
try: fp.inputs['Emission Color'].default_value = (.93, .92, .90, 1); fp.inputs['Emission Strength'].default_value = float(os.environ.get('FE', '0.16'))
except Exception: pass
cyc.data.materials.append(fm)
for p in cyc.data.polygons: p.material_index = 1 if p.center.y < .07 else 0

def area(name, loc, w, h, energy, color=(1, 1, 1), look=(0, .3, 0), shadow=True):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
    try: ld.use_shadow = shadow
    except Exception: pass
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = V(*loc)
    ob.rotation_euler = (V(*look) - ob.location).to_track_quat('-Z', 'Y').to_euler(); return ob
LK = float(os.environ.get('LK', '0.15'))
LOOK = (CXI, .34, -.2)
area('Key', (CXI - 1.5, 2.5, 2.3), .9, .7, 560 * LK, (1.0, .985, .965), LOOK)
area('Fill', (CXI + 2.6, 1.3, 2.2), 1.5, 1.0, 85 * LK, (.97, .98, 1.0), LOOK, shadow=False)
area('Rim', (CXI + .3, 2.1, -1.4), 2.4, .5, 200 * LK, look=LOOK, shadow=False)
area('StripL', (CXI - 1.35, .45, 1.9), .16, 1.5, 110 * LK, (1, 1, 1), LOOK, shadow=False)
area('StripR', (CXI + 1.5, .45, 1.9), .16, 1.5, 110 * LK, (1, 1, 1), LOOK, shadow=False)
area('Top', (CXI, 2.6, .35), 1.6, .6, 70 * LK, look=LOOK, shadow=False)
def card(name, loc, w, h, strength, look):
    """an emissive card behind the camera: invisible to the camera, but flat steel faces and the floor reflect it (a front softbox)"""
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); ob.location = V(*loc); ob.scale = (w, h, 1)
    ob.rotation_euler = (V(*look) - ob.location).to_track_quat('Z', 'Y').to_euler()
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nn = m.node_tree.nodes; nn.clear(); em = nn.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = strength; em.inputs['Color'].default_value = (1, .99, .975, 1)
    out = nn.new('ShaderNodeOutputMaterial'); m.node_tree.links.new(em.outputs['Emission'], out.inputs['Surface']); me.materials.append(m)
    ob.visible_camera = False; ob.visible_shadow = False; return ob
CARDS = [card('FrontCard', (CXI, .55, 4.0), 5.0, 2.4, float(os.environ.get('CK', '1.6')), (CXI, .4, 0)),
         card('FrontLow', (CXI, .05, 2.2), 3.4, .5, float(os.environ.get('CL', '1.0')), (CXI, .2, 0))]
world = bpy.data.worlds.new('Studio'); scene.world = world
try: world.use_nodes = True
except Exception: pass
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.9, .9, .9, 1); bg.inputs['Strength'].default_value = float(os.environ.get('WK', '0.30'))
VT = os.environ.get('VT', 'Khronos PBR Neutral')
try: scene.view_settings.view_transform = VT
except Exception as e:
    print('[rebar3d] view transform', e); scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = float(os.environ.get('EXP', '0'))
scene.cycles.use_denoising = True

# ---------------- camera + renders
cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = PXW / 1000.0; cam.clip_start = .1; cam.clip_end = 40
cam_ob = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(cam_ob)
CAMY = (FLOORPX - CY) / 1000.0 / COS
cam_ob.location = V(0.0, CAMY + 8 * SIN, 8 * COS); cam_ob.rotation_euler = (math.radians(90) - TH, 0, 0); scene.camera = cam_ob
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'
scene.render.resolution_percentage = 100

box_objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in ('Cyc',)]
def render(path, w, samples):
    scene.render.resolution_x = w; scene.render.resolution_y = int(round(w * PXH / PXW)); scene.cycles.samples = samples
    scene.render.filepath = path; bpy.ops.render.render(write_still=True)

# ---------------- export first (the box only)
def sel_tree(o):
    o.select_set(True)
    for c in o.children: sel_tree(c)
bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
            export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_gpu_instances=True,
            export_image_format='WEBP', export_image_quality=82)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[rebar3d] gltf option retry', e)
print('[rebar3d] GLB', os.path.getsize(GLB), 'bytes')

# stills: render-only stone material per layer (a tint and a per-instance tone, which the web scene reproduces with instance colours)
def render_stone(name, tint):
    rm = pbr(name, img_rock_a, 0.0, .88, img_rock_n, 1.0, img_rock_r)
    rn = rm.node_tree.nodes; rl = rm.node_tree.links; rp = next(n for n in rn if n.type == 'BSDF_PRINCIPLED')
    src = next(l.from_node for l in rm.node_tree.links if l.to_socket == rp.inputs['Base Color'])
    oi = rn.new('ShaderNodeObjectInfo'); mx = rn.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
    mp = rn.new('ShaderNodeMapRange'); mp.inputs['From Min'].default_value = 0; mp.inputs['From Max'].default_value = 1; mp.inputs['To Min'].default_value = .68; mp.inputs['To Max'].default_value = 1.18
    mt = rn.new('ShaderNodeMix'); mt.data_type = 'RGBA'; mt.blend_type = 'MULTIPLY'; mt.inputs['Factor'].default_value = 1.0; mt.inputs[7].default_value = (*tint, 1)
    rl.new(oi.outputs['Random'], mp.inputs['Value']); rl.new(src.outputs['Color'], mx.inputs[6]); rl.new(mp.outputs['Result'], mx.inputs[7])
    rl.new(mx.outputs[2], mt.inputs[6]); rl.new(mt.outputs[2], rp.inputs['Base Color']); return rm
TINT = {'T': (.88, .94, 1.08), 'M': (1.07, .99, .90), 'B': (.90, .93, .98)}
for key, ms in (('T', ROCK_T), ('M', ROCK_M), ('B', ROCK_B)):
    rmat = render_stone('StoneRender' + key, TINT[key])
    for me in ms: me.materials[0] = rmat
W_POSTER = 1200 if QUICK else 2400
for o in box_objs: o.hide_render = True
for o in inst: o.hide_render = True
render(os.path.join(OUT, 'studio-bg.png'), 1200, 48 if QUICK else 160)
for o in box_objs: o.hide_render = False
for o in inst: o.hide_render = False
render(os.path.join(OUT, 'poster.png'), W_POSTER, 96 if QUICK else 420)
print('[rebar3d] poster rendered')
# contact shadow: top-down ortho shadow catcher; the box stays invisible to the camera but still casts
for c_ in CARDS: c_.hide_render = True          # the front softbox cards only light the stills; they must not cast into the shadow pass
cyc.is_shadow_catcher = True; scene.render.film_transparent = True; scene.render.image_settings.color_mode = 'RGBA'
SH_C, SH_W, SH_D = (CXI, -.21), 1.3, .9
tc = bpy.data.cameras.new('Top'); tc.type = 'ORTHO'; tc.ortho_scale = SH_W; tco = bpy.data.objects.new('Top', tc); scene.collection.objects.link(tco)
tco.location = V(SH_C[0], 3.0, SH_C[1]); tco.rotation_euler = (0, 0, 0); scene.camera = tco
for o in box_objs: o.visible_camera = False
for o in inst: o.visible_camera = False
scene.render.resolution_x = 1024; scene.render.resolution_y = int(1024 * SH_D / SH_W); scene.cycles.samples = 64 if QUICK else 256
scene.render.filepath = os.path.join(OUT, 'shadow.png'); bpy.ops.render.render(write_still=True)
print('[rebar3d] shadow rendered')

meta = {'frame': {'x0': FX0, 'y0': FY0, 'w': PXW, 'h': PXH, 'pitch': 5.0, 'cam': [0.0, CAMY + 8 * SIN, 8 * COS], 'scale': PXW / 1000.0},
        'shadow': {'c': list(SH_C), 'w': SH_W, 'd': SH_D}, 'inside': {'l': L_, 'r': R_, 'floor': Y_FLOOR, 'ceil': Y_CEIL, 'back': Z_BACK},
        'funnel': {'x': FC[0], 'z': FC[1], 'exitY': Y_NECK},
        'stones': {'top': len(inst_t), 'mid': len(inst_m), 'bottom': len(inst_b)}}
with open(os.path.join(OUT, 'meta.json'), 'w') as fh: json.dump(meta, fh, indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'rebar-box.blend'))
print('[rebar3d] done')
