"""OM GROUP - aggregate compression testing machine (6mm aggregates page, paver section).

Builds the whole asset in Blender, headless:
  blender -b --factory-startup -P scripts/machine3d/build-compression-machine.py -- <repo root> [--quick]

Output
  assets/3d/aggregate-compression-machine.glb     the machine (PBR materials, named nodes, instanced stones)
  _review/machine3d/*.png                         Cycles stills: poster, studio background, floor shadow
  _review/machine3d/aggregate-compression-machine.blend   source
  _review/machine3d/meta.json                     placements/constants the web component mirrors

Units are metres. Blender axes: X right, -Y toward the viewer, Z up. glTF/three.js (+Y up) maps (x,y,z) -> (x, z, -y).
All helpers below take three.js-style coordinates (x right, y up, z toward the viewer) and convert.

Camera: orthographic, pitched down 7 degrees (a product-photography long lens). A feature seen on the reference
picture at pixel (px, py) maps to a point of the model through ref_xy(); the proportions follow the approved
reference picture 1754 x 897 px (the numbers in the build code are reference pixels).
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd())
QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'machine3d'); TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True); os.makedirs(os.path.join(ROOT, 'assets', '3d'), exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'aggregate-compression-machine.glb')

# ---------------------------------------------------------------- reference picture -> metres
TH = math.radians(7.0)               # camera pitch
SIN, COS = math.sin(TH), math.cos(TH)
FLOORPX = 808.0                      # picture row of the floor line at z = 0
PXW, PXH = 1754.0, 897.0
def ref_x(px): return (px - 851.5) / 1000.0
def ref_y(py, z):                    # true height of a feature whose front face (at depth z) sits at picture row py
    return ((FLOORPX - py) / 1000.0 + z * SIN) / COS
def box_px(x0, x1, y0, y1, zf):      # a screen rectangle on a front face at depth zf -> (x0, x1, ymin, ymax)
    return ref_x(x0), ref_x(x1), ref_y(y1, zf), ref_y(y0, zf)

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
                scene.cycles.device = 'GPU'; print('[machine3d] Cycles device:', kind); return
    except Exception as e: print('[machine3d] GPU setup failed', e)
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
    """Fine bead-blasted grain for the painted/graphite/steel parts: isotropic, tiny, never directional."""
    rng = np.random.default_rng(seed)
    h = 0.5 * pnoise(rng, N, .12) + 0.35 * pnoise(rng, N, .5) + 0.15 * pnoise(rng, N, 1.1)
    # a few shallow, hairline scratches (periodic), almost invisible: they only break up the highlights
    for _ in range(26):
        a = rng.uniform(0, np.pi); L = rng.uniform(.1, .3) * N; x0, y0 = rng.uniform(0, N, 2)
        t = np.linspace(0, L, int(L) * 2); xs = (x0 + t * np.cos(a)).astype(int) % N; ys = (y0 + t * np.sin(a)).astype(int) % N; h[ys, xs] -= 1.1
    nrm = normal_from_height(h * 0.02, 1.0, 1.0)
    return nrm, h

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
    alb = np.clip(alb, 0, 1); nrm = normal_from_height(h * .075, 1.0, 1.0)
    return alb, nrm, np.clip(.86 + .06 * pnoise(rng, N, .6), .6, 1)

nrm_satin, h_satin = satin_maps()
img_satin_n = save_img('satin_normal', nrm_satin, 'Non-Color')
rock_alb, rock_nrm, rock_rgh = rock_maps()
img_rock_a = save_img('rock_albedo', rock_alb, 'sRGB'); img_rock_n = save_img('rock_normal', rock_nrm, 'Non-Color'); img_rock_r = save_img('rock_roughness', rock_rgh, 'Non-Color')

# ---------------------------------------------------------------- materials
def gltf_output_group():
    g = bpy.data.node_groups.get('glTF Material Output')
    if g: return g
    g = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree'); g.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat'); g.nodes.new('NodeGroupInput'); return g

def pbr(name, color, metal, rough, nrm=None, nstr=0.35, rimg=None, alpha=None, emit=None):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N, L = nt.nodes, nt.links; P = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    if isinstance(color, tuple): P.inputs['Base Color'].default_value = (*color, 1)
    P.inputs['Metallic'].default_value = metal; P.inputs['Roughness'].default_value = rough
    uv = N.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img, cs='Non-Color'):
        t = N.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Linear'; L.new(uv.outputs['UV'], t.inputs['Vector']); return t
    if not isinstance(color, tuple):
        t = tex(color); L.new(t.outputs['Color'], P.inputs['Base Color'])
        if alpha:
            L.new(t.outputs['Alpha'], P.inputs['Alpha'])
            for k, v in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
                try: setattr(m, k, v)
                except Exception: pass
    if rimg is not None: L.new(tex(rimg).outputs['Color'], P.inputs['Roughness'])
    if nrm is not None:
        nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L.new(tex(nrm).outputs['Color'], nm.inputs['Color']); L.new(nm.outputs['Normal'], P.inputs['Normal'])
    if emit is not None:
        L.new(tex(emit).outputs['Color'], P.inputs['Emission Color']); P.inputs['Emission Strength'].default_value = 1.0
    return m

def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]; return tuple(((x + .055) / 1.055) ** 2.4 if x > .04045 else x / 12.92 for x in c)

def rimg(name, mean, amp): return save_img('r_' + name, rough_map(h_satin, mean, amp), 'Non-Color')
MAT = {
    'graphite': pbr('GraphiteSteel', (.075, .08, .09), .55, .42, img_satin_n, .5, rimg('graphite', .40, .07)),
    'stainless': pbr('StainlessSteel', (.80, .81, .83), 1.0, .10, img_satin_n, .15, rimg('stainless', .10, .025)),
    'chrome': pbr('ChromeSteel', (.90, .91, .93), 1.0, .07, None, 0, None),
    'machined': pbr('MachinedSteel', (.60, .62, .65), 1.0, .30, img_satin_n, .35, rimg('machined', .30, .05)),
    'chamber': pbr('ChamberSteel', (.20, .21, .23), .7, .38, img_satin_n, .5, rimg('chamber', .36, .06)),
    'rear': pbr('RearPlate', (.03, .031, .034), .5, .6, img_satin_n, .4, rimg('rear', .6, .05)),
    'orange': pbr('PlatenOrange', tuple(c * .82 for c in srgb('#FF5E29')), 0.0, .5, img_satin_n, .2, rimg('orange', .5, .04)),
    'spring': pbr('SpringSteel', (.04, .04, .045), 1.0, .30, img_satin_n, .3, rimg('spring', .30, .05)),
    'stone': pbr('FracturedStone', img_rock_a, 0.0, .88, img_rock_n, .9, img_rock_r),
    'console': pbr('ConsolePaint', (.43, .44, .45), .12, .5, img_satin_n, .25, rimg('console', .48, .05)),
    'green': pbr('ButtonGreen', (.02, .42, .08), 0, .28), 'red': pbr('ButtonRed', (.62, .02, .02), 0, .28),
    'yellow': pbr('ButtonYellow', (.9, .62, 0), 0, .34), 'white': pbr('ButtonWhite', (.85, .85, .83), 0, .36),
    'cable': pbr('CableBlack', (.02, .02, .022), 0, .55),
}
LOGO_IMG = bpy.data.images.load(os.path.join(ROOT, 'assets', 'om-group-machine-logo.png')); LOGO_IMG.colorspace_settings.name = 'sRGB'
SCREEN_IMG = None   # set below once the screen artwork exists
MAT['logo'] = pbr('OMGroupLogo', LOGO_IMG, 0, .55, alpha=True)

# ---------------------------------------------------------------- mesh helpers (three.js coordinates)
objs = []
def new_obj(name, bm, mat, parent=None, loc=(0, 0, 0), bevel=0.0, bev_seg=2, angle=40, uv=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    if mat is not None: me.materials.append(mat)
    ob.location = V(*loc)
    bpy.context.view_layer.objects.active = ob
    for p in me.polygons: p.use_smooth = True
    if bevel > 0:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = bev_seg; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(angle); bv.profile = .6
        try: bv.harden_normals = True
        except Exception: pass
        bpy.ops.object.modifier_apply(modifier=bv.name)
        wn = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 100; bpy.ops.object.modifier_apply(modifier=wn.name)
    if uv: box_uv(ob)
    if parent: ob.parent = parent
    objs.append(ob); return ob

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
def hexbolt(bm, x, y, z, r=.0062, h=.005, axis='z'): add_cyl(bm, (x, y, z), r, h, seg=6, axis=axis)

def Rx(a): return Matrix.Rotation(a, 4, 'X')

# ================================================================ THE MACHINE
root = empty('AggregateCompressionTestingMachine')
FZ = 0.07                                               # top beam half depth
# ---------------- MainFrame
frame = empty('MainFrame', root)
x0, x1, y0, y1 = box_px(285, 1418, 42, 108, FZ)
bm = bmesh.new(); add_box(bm, ((x0 + x1) / 2, (y0 + y1) / 2, 0), (x1 - x0, y1 - y0, 2 * FZ))
new_obj('TopCrossBeam', bm, MAT['graphite'], frame, bevel=.004)
bm = bmesh.new()
for sx in (-1, 1):                                      # end-plate bolts on the front of the beam
    for dy in (-.019, .019):
        hexbolt(bm, sx * (x1 - .026), (y0 + y1) / 2 + dy, FZ + .002)
        hexbolt(bm, sx * (x1 - .054), (y0 + y1) / 2 + dy, FZ + .002)
new_obj('BeamFasteners', bm, MAT['stainless'], frame, bevel=.0008, bev_seg=1)
beam_bot, beam_top = y0, y1
COLX = {'Left': ref_x(347), 'Right': ref_x(1354)}
y_col_bot = .032
for side, cx in COLX.items():
    bm = bmesh.new(); add_cyl(bm, (cx, (y_col_bot + beam_bot) / 2, 0), .041, beam_bot - y_col_bot, 72)
    new_obj(side + 'SupportColumn', bm, MAT['stainless'], frame, bevel=.0014, bev_seg=2)
    bm = bmesh.new()                                     # mounting collar under the beam, cap and bolt on top, base collar
    add_cyl(bm, (cx, beam_bot - .008, 0), .054, .016, 72); add_cyl(bm, (cx, beam_top + .007, 0), .034, .014, 72)
    add_cyl(bm, (cx, beam_top + .0185, 0), .0155, .009, 6); add_cyl(bm, (cx, y_col_bot + .008, 0), .060, .016, 72)
    new_obj(side + 'ColumnCollars', bm, MAT['machined'], frame, bevel=.0013, bev_seg=2)
# ---------------- Foundation: column mounting plates, base plate, spring seats
found = empty('Foundation', root)
bm = bmesh.new()
for cx in COLX.values():
    add_box(bm, (cx, .016, .005), (.15, .032, .23))
new_obj('ColumnMountPlates', bm, MAT['machined'], found, bevel=.0025)
bm = bmesh.new()
for cx in COLX.values():
    for ax in (-1, 1):
        for az in (-1, 1): hexbolt(bm, cx + ax * .055, .0335, .005 + az * .085, r=.0085, h=.005, axis='y')
new_obj('MountPlateBolts', bm, MAT['stainless'], found, bevel=.0008, bev_seg=1)
x0, x1, y0, y1 = box_px(415, 1285, 805, 822, .18)
bm = bmesh.new(); add_box(bm, ((x0 + x1) / 2, .006, 0), (x1 - x0, .012, .36))
new_obj('FoundationPlate', bm, MAT['machined'], found, bevel=.0025)
SPRX = [-.358, -.130, .134, .358]
bm = bmesh.new()
for sx in SPRX: add_cyl(bm, (sx, .017, 0), .043, .010, 56)
new_obj('SpringSeats', bm, MAT['stainless'], found, bevel=.0012)

# ---------------- LowerPlatform + AggregateChamber (+ stones) move together on the springs
chassis = empty('ChamberAssembly', root)
plat = empty('LowerPlatformGroup', chassis)
x0, x1, y0, y1 = box_px(411, 1290, 682, 742, .17)
bm = bmesh.new(); add_box(bm, ((x0 + x1) / 2, (y0 + y1) / 2, 0), (x1 - x0, y1 - y0, .34))
PLAT_BOT, PLAT_TOP = y0, y1
new_obj('LowerPlatform', bm, MAT['graphite'], plat, bevel=.004)
xa, xb, ya, yb = box_px(430, 1275, 670, 682, .17)
bm = bmesh.new(); add_box(bm, ((xa + xb) / 2, (ya + yb) / 2, 0), (xb - xa, yb - ya, .335)); new_obj('PlatformTopBar', bm, MAT['stainless'], plat, bevel=.0022)
BAR_TOP = yb
bm = bmesh.new()
for sx in SPRX: add_cyl(bm, (sx, PLAT_BOT - .0045, 0), .043, .011, 56)
new_obj('PlatformSpringCaps', bm, MAT['stainless'], plat, bevel=.0012)

chamber = empty('AggregateChamber', chassis)
CZ0, CZF = -.15, .15                                   # chamber depth (rear plate to the open front)
ys0, ys1 = box_px(466, 1250, 272, 668, .16)[2:]
xs0, xs1 = -.388, .388
IN_L, IN_R = -.320, .320                                   # inside faces (stone area)
BED_BOT = box_px(540, 1172, 292, 648, .14)[2]; BED_TOP = box_px(540, 1172, 292, 648, .14)[3]
CH_TOP = ys1
shelf_top = BED_BOT
bm = bmesh.new(); add_box(bm, ((xs0 + xs1) / 2, (BAR_TOP + shelf_top) / 2, 0), (xs1 - xs0, shelf_top - BAR_TOP, .31)); new_obj('ChamberFloor', bm, MAT['chamber'], chamber, bevel=.0025)
bm = bmesh.new(); add_box(bm, (xs0 + (IN_L - xs0) / 2, (shelf_top + CH_TOP) / 2, 0), (IN_L - xs0, CH_TOP - shelf_top, .31))
new_obj('ChamberSidePlateLeft', bm, MAT['graphite'], chamber, bevel=.003)
bm = bmesh.new(); add_box(bm, (IN_R + (xs1 - IN_R) / 2, (shelf_top + CH_TOP) / 2, 0), (xs1 - IN_R, CH_TOP - shelf_top, .31))
new_obj('ChamberSidePlateRight', bm, MAT['graphite'], chamber, bevel=.003)
bm = bmesh.new(); add_box(bm, ((IN_L + IN_R) / 2, (shelf_top + CH_TOP) / 2, CZ0 - .006), (IN_R - IN_L + .004, CH_TOP - shelf_top, .012)); new_obj('ChamberRearPlate', bm, MAT['rear'], chamber, bevel=.002)
bm = bmesh.new()
for xx, w in ((xs0 + (IN_L - xs0) / 2, 1), (IN_R + (xs1 - IN_R) / 2, 1)):
    for yy in (CH_TOP - .02, shelf_top + .02, (CH_TOP + shelf_top) / 2):
        hexbolt(bm, xx, yy, CZF + .0025, r=.0075, h=.006)
new_obj('ChamberBolts', bm, MAT['stainless'], chamber, bevel=.0008, bev_seg=1)

# ---------------- aggregate: ten fractured base stones, deterministic gravity packing, instanced
def make_rock(seed):
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
    for v in bm.verts: v.co /= rm * 1.14                    # mean radius ~ .88, so the instance scale ~ the stone's radius
    for f in bm.faces: f.smooth = False
    me = bpy.data.meshes.new('rock_%02d' % seed); bm.to_mesh(me); bm.free(); me.materials.append(MAT['stone'])
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co
            u, v = (c.x, c.y) if ax == 2 else ((c.x, c.z) if ax == 1 else (c.y, c.z)); lp[uvl].uv = (u * .55 + (.13 * f.index) % 1, v * .55 + .31 * (f.index % 7) / 7)
    b2.to_mesh(me); b2.free(); return me
ROCKS = [make_rock(s) for s in range(1, 11)]

def pack_stones(seed=21):
    rng = random.Random(seed); placed = []             # (x, y, z, r)
    floor, top = BED_BOT, BED_TOP - .002; xl, xr = IN_L, IN_R; zf, zb = CZF - .004, CZ0 + .002
    radii = [.0335] * 2 + [.0295] * 3 + [.026] * 4 + [.0225] * 4 + [.019] * 3 + [.0155] * 1
    def sample_r(): return rng.choice(radii) * rng.uniform(.92, 1.1)
    # layer A: the visible front layer, a 2D packing against the open front; of several random drops the lowest wins, so voids fill first
    fails = 0
    while fails < 240:
        best = None
        for _ in range(14):
            r = sample_r(); x = rng.uniform(xl + r, xr - r); y = floor + r; zc = zf - r * .62
            for (px, py, pz, pr) in placed:
                if abs(pz - zc) > .02: continue
                dx = px - x; m = pr + r - .0004
                if abs(dx) < m: y = max(y, py + math.sqrt(m * m - dx * dx))
            if y + r <= top and (best is None or y < best[1]): best = (x, y, zc + rng.uniform(-.003, .003), r)
        if best is None: fails += 1; continue
        placed.append(best); fails = 0
    nfront = len(placed)
    # layers behind: the same rule in 3D
    fails = 0
    while fails < 400:
        best = None
        for _ in range(8):
            r = sample_r() * 1.05; x = rng.uniform(xl + r, xr - r); z = rng.uniform(zb + r, zf - r * 1.9); y = floor + r
            for (px, py, pz, pr) in placed:
                d2 = (px - x) ** 2 + (pz - z) ** 2; m = pr + r - .0006
                if d2 < m * m: y = max(y, py + math.sqrt(m * m - d2))
            if y + r <= top and (best is None or y < best[1]): best = (x, y, z, r)
        if best is None: fails += 1; continue
        placed.append(best); fails = 0
    print('[machine3d] stones:', len(placed), '(front layer', nfront, ')'); return placed

STONES = pack_stones()
agg = empty('AggregateStones', chamber)
rng = random.Random(5); inst = []
for i, (x, y, z, r) in enumerate(STONES):
    ob = bpy.data.objects.new('s%03d' % i, ROCKS[i % len(ROCKS)]); scene.collection.objects.link(ob); ob.parent = agg
    ob.location = V(x, y, z); ob.rotation_euler = (rng.uniform(0, 6.28), rng.uniform(0, 6.28), rng.uniform(0, 6.28)); ob.scale = (r * 1.0,) * 3
    ob['tone'] = rng.random(); inst.append(ob)

# ---------------- Springs (real helices; origin on the lower seat so the web scene can compress them)
def helix(name, mat, R, rw, turns, h, parent, x, seg=14, per=44):
    bm = bmesh.new(); n = int(turns * per); rings = []
    for i in range(n + 1):
        t = 2 * math.pi * turns * i / n; zc = h * i / n
        T = Vector((-R * math.sin(t), R * math.cos(t), h / (2 * math.pi * turns))).normalized(); rad = Vector((math.cos(t), math.sin(t), 0))
        n1 = (rad - T * rad.dot(T)).normalized(); n2 = T.cross(n1)
        c = Vector((R * math.cos(t), R * math.sin(t), zc)); ring = []
        for j in range(seg):
            a = 2 * math.pi * j / seg; ring.append(bm.verts.new(c + rw * (math.cos(a) * n1 + math.sin(a) * n2)))
        rings.append(ring)
    for i in range(n):
        for j in range(seg): bm.faces.new((rings[i][j], rings[i][(j + 1) % seg], rings[i + 1][(j + 1) % seg], rings[i + 1][j]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); ob.location = V(x, 0, 0); ob.parent = parent
    me.uv_layers.new(name='UVMap'); b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap']
    for f in b2.faces:
        for lp in f.loops: lp[uvl].uv = (lp.vert.co.z * 8, math.atan2(lp.vert.co.y, lp.vert.co.x) * 2)
    b2.to_mesh(me); b2.free(); objs.append(ob); return ob
SPR_BOT, SPR_TOP = .022, PLAT_BOT - .010
springs = empty('Springs', root)
for i, sx in enumerate(SPRX):
    sp = helix('Spring_%02d' % (i + 1), MAT['spring'], .0305, .0066, 4.5, SPR_TOP - SPR_BOT, springs, sx); sp.location = V(sx, SPR_BOT, 0)

# ---------------- PressAssembly: hydraulic cylinder (fixed), piston + platen (moves)
hyd = empty('HydraulicCylinder', root)
def hy(y0p, y1p): return ((FLOORPX - y0p) / 1000.0 / COS, (FLOORPX - y1p) / 1000.0 / COS)
H_FL, H_BODY, H_GLAND = hy(108, 120), hy(120, 156), hy(156, 170)
bm = bmesh.new(); add_cyl(bm, (0, beam_bot - .006, 0), .074, .013, 72); new_obj('CylinderFlange', bm, MAT['machined'], hyd, bevel=.0015)
y_top_c = beam_bot - .012; y_bot_c = (FLOORPX - 156) / 1000.0 / COS
bm = bmesh.new(); add_cyl(bm, (0, (y_top_c + y_bot_c) / 2, 0), .066, y_top_c - y_bot_c, 72)
for yy in (.673, .662): add_cyl(bm, (0, yy, 0), .0685, .0045, 72)
new_obj('CylinderBody', bm, MAT['graphite'], hyd, bevel=.0012)
y_gl0 = y_bot_c - .014
bm = bmesh.new(); add_cyl(bm, (0, (y_bot_c + y_gl0) / 2, 0), .071, y_bot_c - y_gl0, 72); new_obj('CylinderGland', bm, MAT['machined'], hyd, bevel=.0012)

press = empty('PressAssembly', root)
piston = empty('PistonAssembly', press)
y_sh0 = y_gl0 - .016
ROD_TOP = y_gl0 + .06
bm = bmesh.new(); add_cyl(bm, (0, (ROD_TOP + y_sh0 - .003) / 2, 0), .052, ROD_TOP - y_sh0 + .003, 64); new_obj('PistonShaft', bm, MAT['chrome'], piston, bevel=.001)
PLATEN_TOP = (FLOORPX - 235.5) / 1000.0 / COS                  # top face of the orange plate (mid depth of the strip in the picture)
fl2 = PLATEN_TOP + .003
bm = bmesh.new(); add_cyl(bm, (0, (y_sh0 + fl2 + .018) / 2 - .002, 0), .078, y_sh0 - fl2 - .018 + .004, 72); add_cyl(bm, (0, fl2 + .009, 0), .090, .018, 72)
new_obj('PistonFlange', bm, MAT['machined'], piston, bevel=.0016)
bm = bmesh.new(); add_cyl(bm, (0, fl2 + .0215, 0), .0125, .006, 6)
platen = empty('CompressionPlaten', press)
PX0, PX1 = -.3135, .3135
bm = bmesh.new(); add_box(bm, (0, PLATEN_TOP - .006, 0), (PX1 - PX0, .012, .30)); new_obj('PlatenTopPlate', bm, MAT['orange'], platen, bevel=.0024)
bm = bmesh.new(); add_box(bm, (0, PLATEN_TOP - .02, 0), (PX1 - PX0 - .012, .016, .29)); new_obj('PlatenBody', bm, MAT['graphite'], platen, bevel=.0025)
PL_BOT = PLATEN_TOP - .028 - .008
bm = bmesh.new(); add_box(bm, (0, PLATEN_TOP - .032, 0), (PX1 - PX0 - .024, .008, .28)); new_obj('PlatenPressFace', bm, MAT['stainless'], platen, bevel=.0012)
PLATEN_BOTTOM = PLATEN_TOP - .036

# ---------------- ControlConsole (stand-alone cabinet, right of the machine)
cons = empty('ControlConsole', root)
CX0, CX1 = ref_x(1425), ref_x(1700); CXC = (CX0 + CX1) / 2; CW = CX1 - CX0
CZF2, CZB2 = .17, -.07; CH = (((FLOORPX - 458) / 1000.0) + (CZF2 - .045) * SIN) / COS
Y_PL = .030; Y_BRK = .235
def prism(name, prof, x0, x1, mat, parent, bevel):
    bm = bmesh.new(); a = [bm.verts.new(V(x0, y, z)) for (z, y) in prof]; b = [bm.verts.new(V(x1, y, z)) for (z, y) in prof]; n = len(prof)
    bm.faces.new(a[::-1]); bm.faces.new(b)
    for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return new_obj(name, bm, mat, parent, bevel=bevel)
prism('ConsoleBody', [(CZB2, Y_PL), (CZF2, Y_PL), (CZF2, Y_BRK), (CZF2 - .045, CH), (CZB2, CH)], CX0, CX1, MAT['console'], cons, .007)
prism('ConsolePlinth', [(CZB2 - .004, 0), (CZF2 + .004, 0), (CZF2 + .004, Y_PL), (CZB2 - .004, Y_PL)], CX0 - .004, CX1 + .004, MAT['graphite'], cons, .003)
ANG = math.atan2(.045, CH - Y_BRK)                     # the interface face leans back by this angle
mid_y, mid_z = (Y_BRK + CH) / 2, CZF2 - .0225; nrm_v = Vector((0, math.sin(ANG), math.cos(ANG))); face_len = math.hypot(.045, CH - Y_BRK)
SCR_C = (ref_x(1540), mid_y - .004, mid_z)
rot = Rx(-ANG)
bm = bmesh.new(); add_box(bm, (SCR_C[0], SCR_C[1] + nrm_v.y * .002, SCR_C[2] + nrm_v.z * .002), (.222, .146, .006), rot)
new_obj('TouchscreenBezel', bm, MAT['graphite'], cons, bevel=.003)
# the glass: a quad with the screen artwork (the web scene replaces the map with a live canvas)
bm = bmesh.new(); gw, gh = .200, .122; off = nrm_v * .0066; cc = Vector(SCR_C) + Vector((0, off.y, off.z))
up = Vector((0, math.cos(ANG), -math.sin(ANG))); rt = Vector((1, 0, 0))
qv = [bm.verts.new(V(*(cc + rt * sx * gw / 2 + up * sy * gh / 2))) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
fq = bm.faces.new(qv); uvl = bm.loops.layers.uv.new('UVMap')
for lp, uv in zip(fq.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[uvl].uv = uv
fq.smooth = True
screen_ob = new_obj('Touchscreen', bm, None, cons, uv=False)
screen_ob.data.uv_layers.active = screen_ob.data.uv_layers['UVMap']
# decal: OM GROUP mark + wordmark on the front panel
bm = bmesh.new(); lw = .092; lh = lw * 534 / 787; lc = (ref_x(1528), .0945, CZF2 + .0007)
qv = [bm.verts.new(V(lc[0] + sx * lw / 2, lc[1] + sy * lh / 2, lc[2])) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
fq = bm.faces.new(qv); uvl = bm.loops.layers.uv.new('UVMap')
for lp, uv in zip(fq.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[uvl].uv = uv
logo_ob = new_obj('OMGroupBranding', bm, MAT['logo'], cons, uv=False)
# buttons (real geometry): white bezel ring + coloured cap + pictogram
def button(name, x, y, capmat, icon):
    g = empty(name, cons)
    bm = bmesh.new(); add_cyl(bm, (x, y, CZF2 + .004), .0225, .008, 48, axis='z'); new_obj(name + 'Ring', bm, MAT['white'], g, bevel=.0012)
    bm = bmesh.new(); add_cyl(bm, (x, y, CZF2 + .0085), .0175, .009, 48, axis='z'); new_obj(name + 'Cap', bm, capmat, g, bevel=.0016, bev_seg=2)
    bm = bmesh.new(); zz = CZF2 + .0135
    if icon == 'play': pts = [(x - .0055, y - .0075), (x - .0055, y + .0075), (x + .0085, y)]
    else: pts = [(x - .0065, y - .0065), (x + .0065, y - .0065), (x + .0065, y + .0065), (x - .0065, y + .0065)]
    vs = [bm.verts.new(V(px, py, zz)) for px, py in pts]; bm.faces.new(vs); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    new_obj(name + 'Icon', bm, MAT['white'], g)
    return g
button('StartButton', ref_x(1483), .186, MAT['green'], 'play'); button('StopButton', ref_x(1561), .186, MAT['red'], 'stop')
es = empty('EmergencyStop', cons); ex, ey = ref_x(1680), .1745
bm = bmesh.new(); add_cyl(bm, (ex, ey, CZF2 + .0045), .0285, .009, 56, axis='z'); new_obj('EStopCollar', bm, MAT['yellow'], es, bevel=.0014)
bm = bmesh.new(); add_cyl(bm, (ex, ey, CZF2 + .016), .0185, .014, 48, axis='z'); new_obj('EStopStem', bm, MAT['stainless'], es)
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0, matrix=Matrix.Translation(V(ex, ey, CZF2 + .0225)) @ Rx(math.radians(90)) @ Matrix.Diagonal((.0265, .0265, .0145, 1)))
bmesh.ops.delete(bm, geom=[v for v in bm.verts if (v.co.y - V(ex, ey, CZF2 + .0225).y) > .0001], context='VERTS')
new_obj('EStopHead', bm, MAT['red'], es, bevel=0)
# ---------------- CorrugatedCable (a real corrugated tube swept along a smooth path)
def catmull(pts, per=60):
    out = []
    P = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(per):
            t = k / per; out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1]); return out
CZC = .085
cx_cab = ref_x(1408)
path = catmull([Vector(p) for p in [(CX0 + .03, .33, CZC), (CX0 - .004, .333, CZC), (cx_cab + .012, .328, CZC), (cx_cab, .30, CZC), (cx_cab, .26, CZC), (cx_cab, .16, CZC), (cx_cab - .002, .112, CZC - .004),
                                       (COLX['Right'] + .052, .1, CZC - .045), (COLX['Right'] + .042, .093, .03)]], 40)
def corrugated(pts, r0=.0098, amp=.0017, pitch=.0072, seg=22):
    bm = bmesh.new(); dens = [pts[0]]
    for p in pts[1:]:
        if (p - dens[-1]).length > .0014: dens.append(p)
    pts = dens; n = len(pts); s = 0; rings = []; prev_n1 = None
    for i, p in enumerate(pts):
        T = ((pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)])).normalized()
        if i: s += (p - pts[i - 1]).length
        if prev_n1 is None:
            ref = Vector((0, 0, 1)) if abs(T.z) < .9 else Vector((1, 0, 0)); n1 = (ref - T * ref.dot(T)).normalized()
        else: n1 = (prev_n1 - T * prev_n1.dot(T)).normalized()
        prev_n1 = n1; n2 = T.cross(n1); ph = (s / pitch) % 1.0; tri = abs(ph - .5) * 2; k = tri * tri * (3 - 2 * tri)
        rr = r0 + amp * k; rings.append([bm.verts.new(p + rr * (math.cos(2 * math.pi * j / seg) * n1 + math.sin(2 * math.pi * j / seg) * n2)) for j in range(seg)])
    for i in range(n - 1):
        for j in range(seg): bm.faces.new((rings[i][j], rings[i][(j + 1) % seg], rings[i + 1][(j + 1) % seg], rings[i + 1][j]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm
bmc = corrugated([V(p.x, p.y, p.z) for p in path])
cable = new_obj('CorrugatedCable', bmc, MAT['cable'], root)
bm = bmesh.new(); add_cyl(bm, (COLX['Right'] + .0425, .093, .03), .017, .012, 40, axis='x'); new_obj('CableGland', bm, MAT['machined'], root, bevel=.0012)
bm = bmesh.new(); add_cyl(bm, (CX0 - .002, .329, CZC), .0155, .008, 40, axis='x'); new_obj('CableGlandConsole', bm, MAT['machined'], root, bevel=.0012)

# ---------------- screen artwork (replaced live on the web by a CanvasTexture)
SCR_PNG = os.path.join(ROOT, '_review', 'machine3d', 'screen.png')
if not os.path.exists(SCR_PNG):
    raise SystemExit('screen.png missing: run  node scripts/machine3d/make-screen.js  first')
SCREEN_IMG = bpy.data.images.load(SCR_PNG); SCREEN_IMG.colorspace_settings.name = 'sRGB'
sm = pbr('ScreenGlass', (.01, .012, .015), 0, .12, emit=SCREEN_IMG)
sm.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 1.0
for n in sm.node_tree.nodes:
    if n.type == 'TEX_IMAGE': n.image = SCREEN_IMG
screen_ob.data.materials.append(sm)

# ================================================================ studio (render only: not exported)
def cyclorama():
    zf, zb, R, H, W = 3.0, -.62, .55, 5.0, 14.0
    prof = [(zf, 0.0), (zb + R, 0.0)] + [(zb + R - R * math.sin(math.radians(a)), R - R * math.cos(math.radians(a))) for a in range(6, 91, 6)] + [(zb, H)]
    bm = bmesh.new(); a = [bm.verts.new(V(-W / 2, y, z)) for (z, y) in prof]; b = [bm.verts.new(V(W / 2, y, z)) for (z, y) in prof]
    for i in range(len(prof) - 1): bm.faces.new((a[i], b[i], b[i + 1], a[i + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); me = bpy.data.meshes.new('Cyc'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new('Cyc', me); scene.collection.objects.link(ob); return ob
cyc = cyclorama()
cm = bpy.data.materials.new('Cyc')
try: cm.use_nodes = True
except Exception: pass
cp = next(n for n in cm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); cp.inputs['Base Color'].default_value = (.66, .655, .65, 1); cp.inputs['Roughness'].default_value = .2
try: cp.inputs['Specular IOR Level'].default_value = .5
except Exception: pass
try:
    cp.inputs['Emission Color'].default_value = (.9, .9, .9, 1); cp.inputs['Emission Strength'].default_value = float(os.environ.get('EK', '0.6'))
except Exception as e: print('[machine3d] emission', e)
cyc.data.materials.append(cm)
fm = bpy.data.materials.new('CycFloor')
try: fm.use_nodes = True
except Exception: pass
fp = next(n for n in fm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); fp.inputs['Base Color'].default_value = (.30, .30, .305, 1); fp.inputs['Roughness'].default_value = float(os.environ.get('FR', '0.34'))
try: fp.inputs['Specular IOR Level'].default_value = float(os.environ.get('FS', '0.28'))
except Exception: pass
try: fp.inputs['Emission Color'].default_value = (.9, .9, .9, 1); fp.inputs['Emission Strength'].default_value = float(os.environ.get('FE', '0'))
except Exception: pass
cyc.data.materials.append(fm)
for p in cyc.data.polygons:
    p.material_index = 1 if p.center.y < .07 else 0   # blender -y is toward the viewer: the flat floor is everything in front of where the curve starts
def area(name, loc, w, h, energy, color=(1, 1, 1), look=(0, .3, 0), shadow=True):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = w; ld.size_y = h; ld.energy = energy; ld.color = color
    try: ld.use_shadow = shadow
    except Exception: pass
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = V(*loc)
    ob.rotation_euler = (V(*look) - ob.location).to_track_quat('-Z', 'Y').to_euler(); return ob
LK = float(os.environ.get('LK', '0.15'))
area('Key', (-1.5, 2.5, 2.3), .9, .7, 560 * LK, (1.0, .985, .965))
area('Fill', (2.6, 1.3, 2.2), 1.5, 1.0, 85 * LK, (.97, .98, 1.0), shadow=False)
area('Rim', (.3, 2.1, -1.4), 2.4, .5, 200 * LK, shadow=False)
area('StripL', (-1.35, .45, 1.9), .16, 1.5, 110 * LK, (1, 1, 1), shadow=False)
area('StripR', (1.5, .45, 1.9), .16, 1.5, 110 * LK, (1, 1, 1), shadow=False)
area('Top', (0, 2.6, .35), 1.6, .6, 70 * LK, shadow=False)
world = bpy.data.worlds.new('Studio'); scene.world = world
try: world.use_nodes = True
except Exception: pass
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.82, .82, .83, 1); bg.inputs['Strength'].default_value = float(os.environ.get('WK', '0.02'))
VT = os.environ.get('VT', 'Khronos PBR Neutral')
try: scene.view_settings.view_transform = VT
except Exception as e:
    print('[machine3d] view transform', e); scene.view_settings.view_transform = 'AgX'
if VT == 'AgX':
    try: scene.view_settings.look = 'AgX - High Contrast'
    except Exception: pass
scene.view_settings.exposure = float(os.environ.get('EXP', '0'))
scene.cycles.use_denoising = True

# ---------------- camera + renders
CAMC = Vector((.0255, ref_y(448.5, 0) , 0))
cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = PXW / 1000.0; cam.clip_start = .1; cam.clip_end = 40
cam_ob = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(cam_ob)
CAMY = (FLOORPX - 448.5) / 1000.0 / COS
cam_ob.location = V(.0255, CAMY + 8 * SIN, 8 * COS); cam_ob.rotation_euler = (math.radians(90) - TH, 0, 0); scene.camera = cam_ob
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'
scene.render.resolution_percentage = 100

machine_objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in ('Cyc',)]
def render(path, w, samples):
    scene.render.resolution_x = w; scene.render.resolution_y = int(round(w * PXH / PXW)); scene.cycles.samples = samples
    scene.render.filepath = path; bpy.ops.render.render(write_still=True)

# ---------------- export first (machine only)
def sel_tree(o):
    o.select_set(True)
    for c in o.children: sel_tree(c)
bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
            export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_gpu_instances=True,
            export_image_format='WEBP', export_image_quality=82)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[machine3d] gltf option retry', e)
print('[machine3d] GLB', os.path.getsize(GLB), 'bytes')

# stills: render-only stone material (adds a per-instance tone, which the web scene reproduces with instance colours)
rm = pbr('FracturedStoneRender', img_rock_a, 0.0, .88, img_rock_n, .9, img_rock_r)
rn = rm.node_tree.nodes; rl = rm.node_tree.links; rp = next(n for n in rn if n.type == 'BSDF_PRINCIPLED')
src = next(l.from_node for l in rm.node_tree.links if l.to_socket == rp.inputs['Base Color'])
oi = rn.new('ShaderNodeObjectInfo'); mx = rn.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
mp = rn.new('ShaderNodeMapRange'); mp.inputs['From Min'].default_value = 0; mp.inputs['From Max'].default_value = 1; mp.inputs['To Min'].default_value = .68; mp.inputs['To Max'].default_value = 1.18
rl.new(oi.outputs['Random'], mp.inputs['Value']); rl.new(src.outputs['Color'], mx.inputs[6]); rl.new(mp.outputs['Result'], mx.inputs[7]); rl.new(mx.outputs[2], rp.inputs['Base Color'])
for me in ROCKS: me.materials[0] = rm
for o in inst: o.hide_render = False
W_POSTER = 1200 if QUICK else 2400
for o in machine_objs: o.hide_render = True
for o in inst: o.hide_render = True
render(os.path.join(OUT, 'studio-bg.png'), 1200, 48 if QUICK else 160)
for o in machine_objs: o.hide_render = False
for o in inst: o.hide_render = False
render(os.path.join(OUT, 'poster.png'), W_POSTER, 96 if QUICK else 420)
print('[machine3d] poster rendered')
# contact shadow: top-down ortho shadow catcher; the machine stays invisible to the camera but still casts
cyc.is_shadow_catcher = True; scene.render.film_transparent = True; scene.render.image_settings.color_mode = 'RGBA'
SH_C, SH_W, SH_D = (.07, .0), 2.0, .95
tc = bpy.data.cameras.new('Top'); tc.type = 'ORTHO'; tc.ortho_scale = SH_W; tco = bpy.data.objects.new('Top', tc); scene.collection.objects.link(tco)
tco.location = V(SH_C[0], 3.0, SH_C[1]); tco.rotation_euler = (0, 0, 0); scene.camera = tco
for o in machine_objs: o.visible_camera = False
for o in inst: o.visible_camera = False
scene.render.resolution_x = 1024; scene.render.resolution_y = int(1024 * SH_D / SH_W); scene.cycles.samples = 64 if QUICK else 256
scene.render.filepath = os.path.join(OUT, 'shadow.png'); bpy.ops.render.render(write_still=True)
print('[machine3d] shadow rendered')

meta = {'frame': {'w': PXW, 'h': PXH, 'pitch': 7.0, 'cam': [.0255, CAMY + 8 * SIN, 8 * COS], 'scale': PXW / 1000.0},
        'shadow': {'c': SH_C, 'w': SH_W, 'd': SH_D}, 'platen': {'top': PLATEN_TOP, 'bottom': PLATEN_BOTTOM}, 'bed': {'bot': BED_BOT, 'top': BED_TOP, 'l': IN_L, 'r': IN_R},
        'springs': {'bot': SPR_BOT, 'top': SPR_TOP}, 'stones': len(STONES), 'screen': {'center': SCR_C}}
with open(os.path.join(OUT, 'meta.json'), 'w') as fh: json.dump(meta, fh, indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'aggregate-compression-machine.blend'))
print('[machine3d] done')
