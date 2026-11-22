"""OM GROUP - tracked material-handling excavator with a hydraulic stone grapple (Construction Boulders page, "Handling" figure).

Builds the whole machine in Blender, headless:
  blender -b --factory-startup -P scripts/excavator3d/build-excavator.py -- <repo root>

Output
  assets/3d/hydraulic-grapple-machine.glb          the machine (PBR materials, named pivots, hydraulic cylinders with sliding rods)
  assets/3d/hydraulic-grapple-machine.json         constants the web scene mirrors (pivots, link lengths, cylinder anchors and ranges)
  _review/excavator3d/hydraulic-grapple-machine.blend   source

Units are metres. All helpers take three.js-style coordinates (x forward, y up, z toward the viewer) and convert to Blender (x, -z, y);
the glTF exporter converts back. Every moving part is an Empty at its real pivot, rest pose = all rotations zero:
  Turret (swing axis) > Boom (pin) > Stick (pin) > Grapple (pin) > JawL / JawR (hinges)
Hydraulic cylinders are an Empty at the barrel pin (Cyl_*) with a Barrel and a Rod child, plus an anchor Empty (Tip_*) on the part the rod pushes on;
the web scene aims each Cyl_* at its Tip_* and slides the rod, so the rods really move in and out of the barrels.
The kinematics (boom / stick chord lengths, pivot, tip hang) are the constants in the KIN block below; bldequip.js uses the same numbers.
"""
import bpy, bmesh, math, json, os, sys
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd())
OUT = os.path.join(ROOT, '_review', 'excavator3d'); TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True); os.makedirs(os.path.join(ROOT, 'assets', '3d'), exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'hydraulic-grapple-machine.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

def V(x, y, z): return Vector((x, -z, y))           # three.js -> blender

# ================================================================ KINEMATICS (mirrored in assets/application-s3d-bldequip.js)
TY = 1.25                       # swing axis: height of the turret deck above the ground
BP = (1.5, 0.9, -0.7)           # boom foot pin, turret frame (x forward, y up, z toward the viewer)
BL, SL = 4.9, 3.0               # boom and stick chord (pin to pin)
HG = 2.3                        # stick tip pin to the bottom of the grapple tines
ZN = 0.52                       # near-side offset of the boom cylinders from the boom centre plane

def fk(al, be, pt, frame):
    """world (x, y) in the swing plane of a point given in the 'boom' | 'stick' | 'grapple' frame; poses as in the scene: boom al, stick be (absolute)"""
    ca, sa = math.cos(al), math.sin(al); cb, sb = math.cos(be), math.sin(be)
    bp = np.array([BP[0], TY + BP[1]]); st = bp + np.array([ca * BL, sa * BL]); gr = st + np.array([cb * SL, sb * SL])
    if frame == 'turret': return np.array([pt[0], TY + pt[1]])
    if frame == 'boom': return bp + np.array([ca * pt[0] - sa * pt[1], sa * pt[0] + ca * pt[1]])
    if frame == 'stick': return st + np.array([cb * pt[0] - sb * pt[1], sb * pt[0] + cb * pt[1]])
    return gr + np.array(pt)   # grapple frame stays vertical

def solve(tx, ty):
    ox = tx - BP[0]; gy = ty + HG - (TY + BP[1])
    D = min(max(math.hypot(ox, gy), abs(BL - SL) + .2), BL + SL - .05); phi = math.atan2(gy, ox)
    dl = math.acos(max(-1, min(1, (BL * BL + D * D - SL * SL) / (2 * BL * D)))); al = phi + dl
    ex, ey = ox - BL * math.cos(al), gy - BL * math.sin(al); return al, math.atan2(ey, ex)

# ================================================================ textures (numpy)
def pnoise(rng, N, beta):
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1; F *= f ** (-beta); F[0, 0] = 0
    o = np.fft.irfft2(F, s=(N, N)); return (o - o.mean()) / (o.std() + 1e-9)
def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2; dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2
    n = np.dstack([-dx * strength, -dy * strength, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True); return n * .5 + .5
def save_img(name, arr, cs):
    N = arr.shape[0]
    if arr.ndim == 2: arr = np.dstack([arr, arr, arr])
    rgba = np.ones((N, arr.shape[1], 4), dtype=np.float32); rgba[..., :3] = arr
    img = bpy.data.images.new(name, arr.shape[1], N, alpha=False); img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'; img.save(); img.colorspace_settings.name = cs; return img
rng0 = np.random.default_rng(5)
h_sat = .5 * pnoise(rng0, 512, .12) + .35 * pnoise(rng0, 512, .5) + .15 * pnoise(rng0, 512, 1.1)
for _ in range(40):                                           # hairline scratches only break up the highlights
    a = rng0.uniform(0, np.pi); Ln = rng0.uniform(.08, .3) * 512; x0, y0 = rng0.uniform(0, 512, 2); t = np.linspace(0, Ln, int(Ln) * 2)
    h_sat[(y0 + t * np.sin(a)).astype(int) % 512, (x0 + t * np.cos(a)).astype(int) % 512] -= 1.1
IMG_N = save_img('satin_normal', normal_from_height(h_sat * .02, 1.0), 'Non-Color')
h_rub = .6 * pnoise(rng0, 512, .3) + .4 * pnoise(rng0, 512, 1.0)
IMG_RN = save_img('coarse_normal', normal_from_height(h_rub * .06, 1.0), 'Non-Color')
def rough_img(name, mean, amp): return save_img('r_' + name, np.clip(mean + amp * h_sat / (np.abs(h_sat).max() + 1e-9), .02, 1), 'Non-Color')

# ================================================================ materials
def pbr(name, color, metal, rough, nrm=None, nstr=.35, rimg=None, alpha=None, coat=0.0, opacity=None):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; N, L = nt.nodes, nt.links; P = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    if isinstance(color, tuple): P.inputs['Base Color'].default_value = (*color, 1)
    P.inputs['Metallic'].default_value = metal; P.inputs['Roughness'].default_value = rough
    if coat:
        try: P.inputs['Coat Weight'].default_value = coat; P.inputs['Coat Roughness'].default_value = .12
        except Exception: pass
    uv = N.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(img):
        t = N.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Linear'; L.new(uv.outputs['UV'], t.inputs['Vector']); return t
    if not isinstance(color, tuple):
        t = tex(color); L.new(t.outputs['Color'], P.inputs['Base Color'])
        if alpha: L.new(t.outputs['Alpha'], P.inputs['Alpha'])
    if alpha or opacity is not None:
        if opacity is not None: P.inputs['Alpha'].default_value = opacity
        for k, v in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
            try: setattr(m, k, v)
            except Exception: pass
    if rimg is not None: L.new(tex(rimg).outputs['Color'], P.inputs['Roughness'])
    if nrm is not None:
        nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L.new(tex(nrm).outputs['Color'], nm.inputs['Color']); L.new(nm.outputs['Normal'], P.inputs['Normal'])
    return m
def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]; return tuple(((x + .055) / 1.055) ** 2.4 if x > .04045 else x / 12.92 for x in c)
YEL = tuple(c * .95 for c in srgb('#EE9E00'))
LOGO = bpy.data.images.load(os.path.join(ROOT, 'assets', 'om-group-machine-logo.png')); LOGO.colorspace_settings.name = 'sRGB'
MAT = {
    'yellow': pbr('PaintYellow', YEL, 0.0, .40, IMG_N, .25, rough_img('yellow', .40, .05), coat=.35),
    'yellowD': pbr('PaintYellowWorn', tuple(c * .8 for c in YEL), 0.0, .52, IMG_N, .3, rough_img('yellowd', .52, .08)),
    'graphite': pbr('GraphiteSteel', (.045, .048, .054), .55, .46, IMG_N, .45, rough_img('graphite', .46, .07)),
    'steel': pbr('DarkSteel', (.20, .205, .215), .9, .42, IMG_N, .5, rough_img('steel', .42, .09)),
    'trackSteel': pbr('TrackSteel', (.085, .088, .092), .85, .5, IMG_RN, .9, rough_img('track', .5, .12)),
    'trackWorn': pbr('TrackSteelWorn', (.34, .335, .32), 1.0, .36, IMG_RN, .6, rough_img('trackw', .36, .1)),
    'machined': pbr('MachinedSteel', (.60, .62, .65), 1.0, .28, IMG_N, .3, rough_img('machined', .28, .05)),
    'chrome': pbr('ChromeRod', (.90, .91, .93), 1.0, .06),
    'rubber': pbr('HoseRubber', (.016, .016, .018), 0.0, .62, IMG_RN, .5),
    'glass': pbr('CabGlass', (.025, .034, .042), 0.0, .04, opacity=.55),
    'seat': pbr('SeatFabric', (.03, .032, .036), 0.0, .85, IMG_RN, .5),
    'white': pbr('DecalWhite', (.82, .82, .80), 0.0, .5, IMG_N, .1),
    'logo': pbr('OMGroupLogo', LOGO, 0, .5, alpha=True),
    'amber': pbr('BeaconAmber', (.9, .38, .02), 0.0, .2),
    'lamp': pbr('LampWhite', (.9, .9, .85), 0.0, .1),
}

# ================================================================ mesh helpers
def new_obj(name, bm, mat, parent=None, loc=(0, 0, 0), bevel=0.0, bev_seg=2, angle=40, uv=True, tile=.12):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    if mat is not None: me.materials.append(mat)
    ob.location = V(*loc); bpy.context.view_layer.objects.active = ob
    for p in me.polygons: p.use_smooth = True
    if bevel > 0:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = bev_seg; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(angle); bv.profile = .6
        try: bv.harden_normals = True
        except Exception: pass
        bpy.ops.object.modifier_apply(modifier=bv.name)
        wn = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 100; bpy.ops.object.modifier_apply(modifier=wn.name)
    if uv: box_uv(ob, tile)
    if parent: ob.parent = parent
    return ob
def box_uv(ob, tile):
    me = ob.data; me.uv_layers.new(name='UVMap'); bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv['UVMap']
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co + ob.location
            u, v = (c.x, c.y) if ax == 2 else (c.x, c.z) if ax == 1 else (c.y, c.z)
            lp[uvl].uv = (u / tile, v / tile)
    bm.to_mesh(me); bm.free()
def empty(name, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); scene.collection.objects.link(e); e.location = V(*loc)
    if parent: e.parent = parent
    return e
def Rz(a): return Matrix.Rotation(a, 4, Vector((0, -1, 0)))     # rotation about the three.js z axis
def add_box(bm, c, s, rot=None):
    m = Matrix.Translation(V(*c))
    if rot is not None: m = m @ rot
    bmesh.ops.create_cube(bm, size=1.0, matrix=m @ Matrix.Diagonal((s[0], s[2], s[1], 1)))
def add_cyl(bm, c, r, h, seg=32, r2=None, axis='y'):
    m = Matrix.Translation(V(*c))
    if axis == 'z': m = m @ Matrix.Rotation(math.radians(90), 4, 'X')
    if axis == 'x': m = m @ Matrix.Rotation(math.radians(90), 4, 'Y')
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=(r if r2 is None else r2), depth=h, matrix=m)
def cyl_between(bm, p0, p1, r, seg=16, r2=None):
    a, b = V(*p0), V(*p1); d = b - a; m = Matrix.Translation((a + b) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=(r if r2 is None else r2), depth=d.length, matrix=m)
def hexbolt(bm, x, y, z, r=.03, h=.025, axis='z'): add_cyl(bm, (x, y, z), r, h, seg=6, axis=axis)
def prism(bm, prof, z0, z1):
    """extrude an (x, y) profile (three.js coordinates) between two z planes"""
    a = [bm.verts.new(V(x, y, z0)) for (x, y) in prof]; b = [bm.verts.new(V(x, y, z1)) for (x, y) in prof]; n = len(prof)
    bm.faces.new(a[::-1]); bm.faces.new(b)
    for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
def quad(bm, c, w, h, z=None, normal='z'):
    p = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    vs = [bm.verts.new(V(c[0] + sx * w / 2, c[1] + sy * h / 2, c[2]) if normal == 'z' else V(c[0], c[1] + sy * h / 2, c[2] + sx * w / 2)) for sx, sy in p]
    f = bm.faces.new(vs); uvl = bm.loops.layers.uv.new('UVMap')
    for lp, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[uvl].uv = uv
    return f
def decal(name, mat, parent, c, w, side=+1, rot=0.0, plane='z'):
    """a flat logo quad facing +z (side = +1) / -z, or -x (plane = 'x', seen from behind), rotated by rot about its own centre (swing-plane angle)"""
    h = w * 534 / 787; bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); vs = []; uvs = []
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        x, y = sx * w / 2, sy * h / 2; xr, yr = x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)
        vs.append(bm.verts.new(V(c[0] + xr, c[1] + yr, c[2]) if plane == 'z' else V(c[0], c[1] + yr, c[2] + xr)))
        uvs.append(((sx + 1) / 2 if side > 0 else (1 - sx) / 2, (sy + 1) / 2))
    f = bm.faces.new(vs)
    for lp, uv in zip(f.loops, uvs): lp[uvl].uv = uv
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm, mat, parent, uv=False)
def catmull(pts, per=14):
    out = []; P = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(per):
            t = k / per; out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1]); return out
def tube(bm, pts3, r, seg=10):
    """a round tube swept along a smooth path (three.js coordinates)"""
    pts = catmull([Vector(p) for p in pts3]); n = len(pts); rings = []; prev = None
    for i, p in enumerate(pts):
        T = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        if prev is None:
            ref = Vector((0, 0, 1)) if abs(T.z) < .9 else Vector((1, 0, 0)); n1 = (ref - T * ref.dot(T)).normalized()
        else: n1 = (prev - T * prev.dot(T)).normalized()
        prev = n1; n2 = T.cross(n1)
        rings.append([bm.verts.new(V(*(p + r * (math.cos(2 * math.pi * j / seg) * n1 + math.sin(2 * math.pi * j / seg) * n2)))) for j in range(seg)])
    for i in range(n - 1):
        for j in range(seg): bm.faces.new((rings[i][j], rings[i][(j + 1) % seg], rings[i + 1][(j + 1) % seg], rings[i + 1][j]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
def loft(bm, centre, tops, bots, wids, z0=0.0, n=28):
    """a hollow-section beam along a 2D centre line: tops / bots = half heights each side of the line, wids = width (z), all functions of t in 0..1"""
    rings = []
    for i in range(n + 1):
        t = i / n; cx, cy = centre(t); ax, ay = centre(min(1, t + .004)); bx, by = centre(max(0, t - .004)); d = Vector((ax - bx, ay - by)).normalized(); nx, ny = -d.y, d.x
        ht, hb, w = tops(t), bots(t), wids(t)
        rings.append([bm.verts.new(V(cx + nx * ht, cy + ny * ht, z0 + w / 2)), bm.verts.new(V(cx + nx * ht, cy + ny * ht, z0 - w / 2)),
                      bm.verts.new(V(cx - nx * hb, cy - ny * hb, z0 - w / 2)), bm.verts.new(V(cx - nx * hb, cy - ny * hb, z0 + w / 2))])
    for i in range(n):
        for j in range(4): bm.faces.new((rings[i][j], rings[i][(j + 1) % 4], rings[i + 1][(j + 1) % 4], rings[i + 1][j]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return rings

# ================================================================ THE MACHINE
root = empty('HydraulicGrappleMachine')
under = empty('Undercarriage', root)

# ---------------- crawler tracks: frame, sprocket, idler, rollers and ~50 individual steel shoes on a stadium path
RC, CY, X0, X1 = .53, .55, -2.1, 2.1                 # path radius, hub height, rear (sprocket) and front (idler) hub x
TW = .72                                             # shoe width
LTOT = 2 * (X1 - X0) + 2 * math.pi * RC; NSH = 50; PITCH = LTOT / NSH
def path_at(s):
    s %= LTOT; Ls = X1 - X0; La = math.pi * RC
    if s < Ls: return (X0 + s, CY - RC), 0.0
    s -= Ls
    if s < La: a = -math.pi / 2 + s / RC; return (X1 + RC * math.cos(a), CY + RC * math.sin(a)), a + math.pi / 2
    s -= La
    if s < Ls: return (X1 - s, CY + RC), math.pi
    s -= Ls; a = math.pi / 2 + s / RC; return (X0 + RC * math.cos(a), CY + RC * math.sin(a)), a + math.pi / 2
def track(side, zc):
    g = empty('Track_' + side, under, (0, 0, zc))
    # shoes: plate + two grousers (cleats) outside + link plates and pins inside
    bm = bmesh.new(); bl = bmesh.new(); bp = bmesh.new()
    for i in range(NSH):
        (px, py), th = path_at(i * PITCH + PITCH / 2); nx, ny = math.sin(th), -math.cos(th)            # outward normal
        add_box(bm, (px + nx * .025, py + ny * .025, 0), (PITCH * .955, .05, TW), Rz(th))
        for k in (-.5, .5):                                                                          # grouser cleats
            c = (px + nx * .075 + math.cos(th) * k * PITCH * .5, py + ny * .075 + math.sin(th) * k * PITCH * .5)
            add_box(bm, (c[0], c[1], 0), (.05, .055, TW * .96), Rz(th))
        for zz in (-TW / 2 + .07, TW / 2 - .07):                                                     # link plates
            add_box(bl, (px - nx * .03, py - ny * .03, zz), (PITCH * 1.02, .075, .105), Rz(th))
        (qx, qy), _ = path_at(i * PITCH)
        for zz in (-TW / 2 + .07, TW / 2 - .07): add_cyl(bp, (qx, qy, zz), .034, .13, seg=6, axis='z')
    new_obj('TrackShoes_' + side, bm, MAT['trackSteel'], g, bevel=.006, bev_seg=1, tile=.3)
    new_obj('TrackLinks_' + side, bl, MAT['steel'], g)
    new_obj('TrackPins_' + side, bp, MAT['trackWorn'], g)
    # frame
    bm = bmesh.new(); add_box(bm, (0, .66, 0), (4.1, .46, .42)); add_box(bm, (0, .46, 0), (3.8, .08, .5))
    new_obj('TrackFrame_' + side, bm, MAT['graphite'], g, bevel=.025)
    # sprocket: toothed ring + hub + flanges + bolts
    for nm, hx, hr, nt in (('Sprocket', X0, .5, 17), ('Idler', X1, .47, 0)):
        bm = bmesh.new(); add_cyl(bm, (hx, CY, 0), hr - .02, .2, 40, axis='z')
        for zz in (-.15, .15): add_cyl(bm, (hx, CY, zz), hr + .015, .035, 40, axis='z')
        for k in range(nt):
            a = 2 * math.pi * k / nt; add_box(bm, (hx + math.cos(a) * (hr + .01), CY + math.sin(a) * (hr + .01), 0), (.1, .12, .26), Rz(a + math.pi / 2))
        new_obj(nm + '_' + side, bm, MAT['steel'], g, bevel=.01)
        bm = bmesh.new(); add_cyl(bm, (hx, CY, 0), .2, .42, 28, axis='z'); add_cyl(bm, (hx, CY, .0), .08, .52, 20, axis='z')
        for k in range(8):
            a = 2 * math.pi * k / 8; hexbolt(bm, hx + math.cos(a) * .15, CY + math.sin(a) * .15, .23, r=.022, h=.02); hexbolt(bm, hx + math.cos(a) * .15, CY + math.sin(a) * .15, -.23, r=.022, h=.02)
        new_obj(nm + 'Hub_' + side, bm, MAT['machined'], g, bevel=.006)
    # bottom track rollers and top carrier rollers, each with flanges and a bracket
    bm = bmesh.new(); bb = bmesh.new()
    for x in (-1.5, -.8, -.1, .6, 1.3):
        add_cyl(bm, (x, .255, 0), .2, .2, 20, axis='z')
        for zz in (-.14, .14): add_cyl(bm, (x, .255, zz), .225, .035, 20, axis='z')
        add_box(bb, (x, .42, 0), (.22, .18, .3))
    for x in (-.55, .95):
        add_cyl(bm, (x, .915, 0), .13, .14, 22, axis='z'); add_cyl(bm, (x, .915, 0), .15, .03, 22, axis='z'); add_box(bb, (x, .83, 0), (.16, .16, .3))
    new_obj('TrackRollers_' + side, bm, MAT['steel'], g, bevel=.008); new_obj('RollerBrackets_' + side, bb, MAT['graphite'], g, bevel=.012)
    return g
track('L', 1.55); track('R', -1.55)
# carbody: centre section, side beams to the tracks, swing bearing
bm = bmesh.new(); add_box(bm, (0, .78, 0), (3.9, .56, 2.1)); add_box(bm, (0, .78, 1.28), (3.5, .5, .5)); add_box(bm, (0, .78, -1.28), (3.5, .5, .5))
new_obj('CarBody', bm, MAT['graphite'], under, bevel=.05)
bm = bmesh.new(); add_cyl(bm, (0, 1.12, 0), 1.45, .12, 48); add_cyl(bm, (0, 1.2, 0), 1.3, .06, 48)
for k in range(12): a = 2 * math.pi * k / 12; hexbolt(bm, math.cos(a) * 1.36, 1.24, math.sin(a) * 1.36, r=.03, h=.04, axis='y')
new_obj('SwingBearing', bm, MAT['steel'], under, bevel=.01)

# ---------------- upper structure on the swing axis
turret = empty('Turret', root, (0, TY, 0))
ZW = 1.55
bm = bmesh.new(); add_box(bm, (-.4, .09, 0), (5.7, .18, 2 * ZW)); new_obj('Deck', bm, MAT['graphite'], turret, bevel=.05)
bm = bmesh.new(); prism(bm, [(-2.1, .18), (-2.95, .18), (-3.42, .55), (-3.42, 1.1), (-3.18, 1.52), (-2.1, 1.52)], -ZW, ZW)
new_obj('Counterweight', bm, MAT['graphite'], turret, bevel=.11, bev_seg=3)
bm = bmesh.new(); prism(bm, [(-2.1, .18), (.35, .18), (.35, 1.05), (.05, 1.32), (-.9, 1.5), (-2.1, 1.5)], -ZW + .02, ZW - .02)
new_obj('EngineHousing', bm, MAT['yellow'], turret, bevel=.07, bev_seg=3)
# hood: dark grille panels (top and both sides) with louvre slats, exhaust, filler, seams
bm = bmesh.new(); bs = bmesh.new()
for zs in (1, -1):
    add_box(bm, (-1.05, .86, zs * (ZW - .005)), (1.8, .72, .035))
    for k in range(13): add_box(bs, (-1.85 + k * .135, .86, zs * (ZW + .012)), (.045, .68, .03))
add_box(bm, (-1.35, 1.52, -.55), (1.2, .02, .95)); add_box(bm, (-1.35, 1.52, .45), (1.2, .02, .95))
for k in range(9):
    for zc in (-.55, .45): add_box(bs, (-1.85 + k * .13, 1.535, zc), (.05, .02, .88))
new_obj('HoodGrilles', bm, MAT['rubber'], turret); new_obj('HoodLouvres', bs, MAT['graphite'], turret, bevel=.004, bev_seg=1)
bm = bmesh.new(); add_cyl(bm, (-1.25, 1.85, -1.15), .085, .75, 18); add_cyl(bm, (-1.25, 2.28, -1.15), .12, .03, 18); add_cyl(bm, (-1.25, 1.52, -1.15), .13, .06, 18)
new_obj('ExhaustStack', bm, MAT['graphite'], turret, bevel=.006)
bm = bmesh.new(); add_cyl(bm, (.0, 1.34, .9), .15, .07, 24)
new_obj('FuelCap', bm, MAT['machined'], turret, bevel=.01)
# cab: yellow lower body, tinted glass, pillars, roof, visor, interior
CX0, CX1, CZ0, CZ1, CYB, CYT = .38, 2.3, .15, ZW - .02, .18, 2.55
bm = bmesh.new(); add_box(bm, ((CX0 + CX1) / 2, (CYB + 1.05) / 2, (CZ0 + CZ1) / 2), (CX1 - CX0, 1.05 - CYB, CZ1 - CZ0)); new_obj('CabLower', bm, MAT['yellow'], turret, bevel=.06, bev_seg=3)
bm = bmesh.new(); add_box(bm, ((CX0 + CX1) / 2, 1.8, (CZ0 + CZ1) / 2), (CX1 - CX0 - .12, 1.5, CZ1 - CZ0 - .12)); new_obj('CabGlass', bm, MAT['glass'], turret, bevel=.02)
bm = bmesh.new()
for x in (CX0 + .04, CX1 - .04, 1.25):
    for z in (CZ0 + .04, CZ1 - .04): add_box(bm, (x, 1.8, z), (.09, 1.55, .09))
for z in (CZ0 + .04, CZ1 - .04):
    add_box(bm, ((CX0 + CX1) / 2, 1.07, z), (CX1 - CX0, .09, .09)); add_box(bm, ((CX0 + CX1) / 2, 2.5, z), (CX1 - CX0, .09, .09))
for x in (CX0 + .04, CX1 - .04): add_box(bm, (x, 1.07, (CZ0 + CZ1) / 2), (.09, .09, CZ1 - CZ0)); add_box(bm, (x, 2.5, (CZ0 + CZ1) / 2), (.09, .09, CZ1 - CZ0))
new_obj('CabFrame', bm, MAT['yellow'], turret, bevel=.02)
bm = bmesh.new(); add_box(bm, ((CX0 + CX1) / 2 + .1, 2.62, (CZ0 + CZ1) / 2), (CX1 - CX0 + .35, .11, CZ1 - CZ0 + .14)); new_obj('CabRoof', bm, MAT['yellow'], turret, bevel=.045, bev_seg=3)
bm = bmesh.new(); add_box(bm, (CX1 + .18, 2.5, (CZ0 + CZ1) / 2), (.34, .05, CZ1 - CZ0 - .1), Rz(-.28)); new_obj('CabVisor', bm, MAT['graphite'], turret, bevel=.012)
bm = bmesh.new()                                                       # interior seen through the glass: seat, joystick consoles, floor
add_box(bm, (1.05, .72, .85), (.62, .16, .62)); add_box(bm, (.82, 1.15, .85), (.14, .78, .6)); add_box(bm, (1.05, 1.3, .85), (.56, .14, .5)); add_box(bm, (1.4, .92, .55), (.18, .36, .13)); add_box(bm, (1.4, .92, 1.15), (.18, .36, .13)); add_box(bm, (1.95, 1.0, .85), (.28, .4, .9))
new_obj('CabInterior', bm, MAT['seat'], turret, bevel=.025)
bm = bmesh.new(); add_box(bm, (1.5, 2.7, .55), (.1, .08, .38)); add_box(bm, (1.5, 2.7, 1.15), (.1, .08, .38)); add_cyl(bm, (.7, 2.77, 1.35), .11, .1, 20)
new_obj('RoofLights', bm, MAT['lamp'], turret, bevel=.012)
bm = bmesh.new(); add_cyl(bm, (.7, 2.77, 1.35), .1, .13, 20); new_obj('Beacon', bm, MAT['amber'], turret, bevel=.01)
bm = bmesh.new(); add_box(bm, (CX1 + .04, 1.2, .98), (.04, .045, 1.0)); add_box(bm, (CX1 + .02, 1.95, .98), (.025, .9, .025), Rz(.0))      # wiper arm
add_box(bm, (CX1 + .075, 1.55, .28), (.04, .5, .04)); add_box(bm, (CX1 + .12, 1.9, .2), (.05, .22, .12))
new_obj('Wiper', bm, MAT['rubber'], turret, bevel=.004, bev_seg=1)
bm = bmesh.new(); add_box(bm, (CX0 + .2, 1.7, CZ1 + .05), (.5, .06, .06)); add_box(bm, (CX0 + .2, 1.5, CZ1 + .12), (.05, .38, .09)); new_obj('Door_Handle_Mirror', bm, MAT['graphite'], turret, bevel=.01)
# walkway steps, handrail, tool box
bm = bmesh.new(); add_box(bm, (1.25, .0, ZW + .13), (1.3, .05, .3)); add_box(bm, (1.25, -.3, ZW + .13), (1.3, .05, .3))
new_obj('AccessSteps', bm, MAT['graphite'], turret, bevel=.01)
bm = bmesh.new(); tube(bm, [(.38, 1.2, 1.62), (-.4, 1.65, 1.62), (-1.6, 1.8, 1.55)], .028, 8)
for x in (.2, -.6, -1.4): cyl_between(bm, (x, 1.1, 1.6), (x - .05, 1.62, 1.6), .028, 8)
new_obj('Handrail', bm, MAT['graphite'], turret)
# boom foot brackets and pin
BZ0, BZ1 = BP[2] + .53, BP[2] - .53
bm = bmesh.new()
for zz in (BZ0, BZ1): prism(bm, [(1.0, .18), (1.95, .18), (1.95, .85), (1.75, 1.18), (1.5, 1.27), (1.25, 1.18), (1.0, .85)], zz - .045, zz + .045)
add_box(bm, (1.5, .55, BP[2]), (.9, .12, 1.1)); new_obj('BoomFootBrackets', bm, MAT['yellow'], turret, bevel=.025)
bm = bmesh.new(); add_cyl(bm, (BP[0], BP[1], BP[2]), .115, 1.26, 28, axis='z'); add_cyl(bm, (BP[0], BP[1], BP[2] + .66), .15, .05, 28, axis='z'); add_cyl(bm, (BP[0], BP[1], BP[2] - .66), .15, .05, 28, axis='z')
new_obj('BoomFootPin', bm, MAT['machined'], turret, bevel=.008)

# ---------------- OM GROUP logo on the machine (the original asset), near side and rear, on plates that suit the colour
decal('Logo_Counterweight_Side', MAT['logo'], turret, (-2.78, .86, ZW + .006), 1.05)
decal('Logo_Counterweight_SideFar', MAT['logo'], turret, (-2.78, .86, -ZW - .006), 1.05, side=-1)
decal('Logo_Counterweight_Rear', MAT['logo'], turret, (-3.43, .83, 0), .8, plane='x')   # the dark counterweight carries the orange logo directly

# ---------------- boom (banana beam), lugs, hoses, plate with the logo
boom = empty('Boom', turret, BP)
bz = lambda t: ((2 * t * (1 - t)) * 2.45 + t * t * 4.9, (2 * t * (1 - t)) * 1.5)        # quadratic bezier (0,0) -(2.45, 1.5)-> (4.9, 0): the boom bulges upward
def bpt(t): return bz(t)
def bnorm(t):
    a, b = bz(min(1, t + .003)), bz(max(0, t - .003)); d = Vector((a[0] - b[0], a[1] - b[1])).normalized(); return Vector((-d.y, d.x))
bt = lambda t: .62 + .1 * math.sin(math.pi * t) - .2 * t
bb = lambda t: .58 + .02 * math.sin(math.pi * t) - .22 * t
bw = lambda t: 1.0 - .26 * t
bm = bmesh.new(); loft(bm, bpt, bt, bb, bw, 0.0, 30); new_obj('BoomBeam', bm, MAT['yellow'], boom, bevel=.05, bev_seg=3)
bm = bmesh.new(); add_cyl(bm, (0, 0, 0), .26, .96, 32, axis='z'); add_cyl(bm, (BL, 0, 0), .22, .78, 32, axis='z')
new_obj('BoomBosses', bm, MAT['yellow'], boom, bevel=.02)
bm = bmesh.new(); add_cyl(bm, (0, 0, 0), .115, 1.2, 28, axis='z'); add_cyl(bm, (BL, 0, 0), .105, 1.1, 28, axis='z'); new_obj('BoomPins', bm, MAT['machined'], boom, bevel=.006)
# cylinder lugs: boom cylinders (underside, both sides) and the stick cylinder (top centre)
def lug(bm, t, side, off, zc, w=.1, h=.34):
    c = Vector(bz(t)) + bnorm(t) * side * (bt(t) if side > 0 else bb(t)); p = c + bnorm(t) * side * off
    for zz in (zc - .09, zc + .09): add_box(bm, (c.x + bnorm(t).x * side * off / 2, c.y + bnorm(t).y * side * off / 2, zz), (.11, off + .02, .035), Rz(math.atan2(bnorm(t).y, bnorm(t).x) - math.pi / 2))
    return (p.x, p.y)
bm = bmesh.new()
LB_T = .35; LS_T = .60
BA = [lug(bm, LB_T, +1, .2, ZN), lug(bm, LB_T, +1, .2, -ZN)]
SA = lug(bm, LS_T, +1, .34, 0.0)
new_obj('BoomLugs', bm, MAT['yellow'], boom, bevel=.01)
bm = bmesh.new()
for (x, y), z in ((BA[0], ZN), (BA[1], -ZN), (SA, 0.0)): add_cyl(bm, (x, y, z), .06, .3, 18, axis='z')
new_obj('BoomLugPins', bm, MAT['machined'], boom)
# stiffener beads and weld seams along the beam
bm = bmesh.new()
for t in (.18, .36, .54, .72):
    c = Vector(bz(t)); n = bnorm(t); for_z = bw(t) / 2 + .004
    for zz in (for_z, -for_z): add_box(bm, (c.x + n.x * (bt(t) - .12), c.y + n.y * (bt(t) - .12), zz), (.05, .1, .012), Rz(math.atan2(n.y, n.x) - math.pi / 2))
new_obj('BoomRibs', bm, MAT['yellowD'], boom, bevel=.004, bev_seg=1)
# hoses along the top of the boom (a pair), clamps, with a loop at the elbow
bm = bmesh.new()
for k, (dz, dn) in enumerate(((.13, .1), (-.13, .1))):
    pts = []
    for t in (.04, .2, .4, .6, .8, .93):
        c = Vector(bz(t)) + bnorm(t) * (bt(t) + dn + (.02 if t > .5 else 0)); pts.append((c.x, c.y, dz))
    pts += [(BL - .05, .5, dz * 1.4), (BL + .3, .25, dz * 1.4)]
    tube(bm, pts, .034, 10)
new_obj('BoomHoses', bm, MAT['rubber'], boom)
bm = bmesh.new()
for t in (.2, .45, .75):
    c = Vector(bz(t)) + bnorm(t) * (bt(t) + .06)
    add_box(bm, (c.x, c.y, 0), (.09, .06, .42), Rz(math.atan2(bnorm(t).y, bnorm(t).x) - math.pi / 2))
new_obj('HoseClamps', bm, MAT['graphite'], boom, bevel=.008)
# white plate + logo on the near side of the boom (flat, following the beam at t = .42)
tt = .42; c = Vector(bz(tt)); dd = Vector(bz(tt + .004)) - Vector(bz(tt - .004)); ang = math.atan2(dd.y, dd.x)
bm = bmesh.new(); add_box(bm, (c.x, c.y, bw(tt) / 2 + .004), (1.2, .84, .008), Rz(ang)); new_obj('BoomNamePlate', bm, MAT['white'], boom, bevel=.01)
decal('Logo_Boom', MAT['logo'], boom, (c.x, c.y, bw(tt) / 2 + .0095), 1.04, rot=ang)

# ---------------- stick (tapered beam, curved), root ears for the stick cylinder, hoses, grapple tilt lugs
stick = empty('Stick', boom, (BL, 0, 0))
sz = lambda t: (2 * t * (1 - t) * 1.5 + t * t * SL, -2 * t * (1 - t) * .55)
st_t = lambda t: .46 - .1 * t + .1 * math.sin(math.pi * t) * .6
st_b = lambda t: .5 - .16 * t
st_w = lambda t: .72 - .14 * t
bm = bmesh.new(); loft(bm, sz, st_t, st_b, st_w, 0.0, 22); new_obj('StickBeam', bm, MAT['yellow'], stick, bevel=.045, bev_seg=3)
bm = bmesh.new(); add_cyl(bm, (0, 0, 0), .23, .6, 32, axis='z'); add_cyl(bm, (SL, 0, 0), .18, .5, 32, axis='z'); new_obj('StickBosses', bm, MAT['yellow'], stick, bevel=.02)
bm = bmesh.new(); add_cyl(bm, (SL, 0, 0), .095, .95, 28, axis='z'); new_obj('StickTipPin', bm, MAT['machined'], stick, bevel=.006)
# ears above the root for the stick cylinder pin; they sit at stick-frame (.55, .88)
SB = (.5, .86)
bm = bmesh.new()
for zz in (-.1, .1): prism(bm, [(.2, .22), (.85, .3), (.78, .5), (.58, .98), (.42, .98), (.28, .6)], zz - .028, zz + .028)
new_obj('StickEars', bm, MAT['yellow'], stick, bevel=.012)
bm = bmesh.new(); add_cyl(bm, (SB[0], SB[1], 0), .06, .3, 18, axis='z'); new_obj('StickEarPin', bm, MAT['machined'], stick)
# grapple tilt cylinder: lug on the top of the stick (A) and an ear on the grapple bracket (B, in the grapple frame)
tp = Vector(sz(.58)); tn = Vector(sz(.59)) - Vector(sz(.57)); tn = Vector((-tn.y, tn.x)).normalized(); TA = (tp.x + tn.x * (st_t(.58) + .2), tp.y + tn.y * (st_t(.58) + .2))
bm = bmesh.new()
for zz in (-.1, .1): add_box(bm, ((tp.x + TA[0]) / 2, (tp.y + TA[1]) / 2, zz), (.12, .28, .035), Rz(math.atan2(tn.y, tn.x) - math.pi / 2))
new_obj('StickTiltLugs', bm, MAT['yellow'], stick, bevel=.01)
bm = bmesh.new(); add_cyl(bm, (TA[0], TA[1], 0), .055, .3, 18, axis='z'); new_obj('StickTiltPin', bm, MAT['machined'], stick)
bm = bmesh.new()
for dz in (.11, -.11):
    pts = [(.15, .45, dz), (.8, .55, dz), (1.6, .47, dz * 1.2), (2.4, .12, dz * 1.4), (SL - .05, -.15, dz * 1.5), (SL + .1, -.45, dz * 1.4)]
    tube(bm, pts, .03, 10)
new_obj('StickHoses', bm, MAT['rubber'], stick)
bm = bmesh.new()
for x, y in ((.7, .5), (1.8, .44)): add_box(bm, (x, y, 0), (.08, .06, .34), Rz(-.1))
new_obj('StickClamps', bm, MAT['graphite'], stick, bevel=.008)
# white plate + logo on the stick
tt = .36; c = Vector(sz(tt)); dd = Vector(sz(tt + .004)) - Vector(sz(tt - .004)); ang = math.atan2(dd.y, dd.x)
bm = bmesh.new(); add_box(bm, (c.x, c.y, st_w(tt) / 2 + .004), (.8, .58, .008), Rz(ang)); new_obj('StickNamePlate', bm, MAT['white'], stick, bevel=.008)
decal('Logo_Stick', MAT['logo'], stick, (c.x, c.y, st_w(tt) / 2 + .0095), .68, rot=ang)

# ---------------- grapple: hanger, rotator, head, two jaws of three curved tines each, hinge pins
gr = empty('Grapple', stick, (SL, 0, 0))
bm = bmesh.new()
for zz in (-.2, .2): prism(bm, [(-.3, -.52), (-.34, -.12), (-.2, .14), (.2, .14), (.34, -.12), (.3, -.52)], zz - .04, zz + .04)
add_box(bm, (0, -.5, 0), (.62, .06, .5)); new_obj('GrappleHanger', bm, MAT['graphite'], gr, bevel=.018)
bm = bmesh.new(); add_cyl(bm, (0, 0, 0), .105, .52, 24, axis='z'); new_obj('GrappleHangerPin', bm, MAT['machined'], gr, bevel=.005)
GB = (-.42, .06)                                                         # ear for the tilt cylinder
bm = bmesh.new()
for zz in (-.1, .1): prism(bm, [(-.2, -.25), (-.55, -.05), (-.56, .14), (-.34, .16), (-.12, .0)], zz - .03, zz + .03)
new_obj('GrappleTiltEar', bm, MAT['graphite'], gr, bevel=.01)
bm = bmesh.new(); add_cyl(bm, (GB[0], GB[1], 0), .05, .3, 18, axis='z'); new_obj('GrappleTiltPin', bm, MAT['machined'], gr)
bm = bmesh.new(); add_cyl(bm, (0, -.7, 0), .3, .34, 36); new_obj('Rotator', bm, MAT['graphite'], gr, bevel=.02)
bm = bmesh.new(); add_cyl(bm, (0, -.89, 0), .335, .06, 36)
for k in range(16): a = 2 * math.pi * k / 16; hexbolt(bm, math.cos(a) * .27, -.915, math.sin(a) * .27, r=.02, h=.025, axis='y')
new_obj('RotatorRing', bm, MAT['machined'], gr, bevel=.008)
bm = bmesh.new(); add_box(bm, (0, -1.12, 0), (1.05, .42, 1.04)); new_obj('GrappleHead', bm, MAT['graphite'], gr, bevel=.05, bev_seg=3)
bm = bmesh.new()
for sx in (-1, 1):
    for zz in (-.36, 0.0, .36): add_box(bm, (sx * .6, -1.0, zz), (.2, .3, .16))
    add_cyl(bm, (sx * .56, -1.02, 0), .1, 1.12, 24, axis='z')
new_obj('JawHinges', bm, MAT['steel'], gr, bevel=.01)
bm = bmesh.new(); tube(bm, [(.0, -.52, .18), (.2, -.6, .4), (.42, -.78, .52)], .026, 8); tube(bm, [(.0, -.52, -.18), (-.2, -.6, -.4), (-.42, -.78, -.52)], .026, 8)
tube(bm, [(.05, -.5, -.12), (.25, -.62, -.3), (.42, -.8, -.46)], .026, 8); tube(bm, [(-.05, -.5, .12), (-.25, -.62, .3), (-.42, -.8, .46)], .026, 8)
new_obj('GrappleHoses', bm, MAT['rubber'], gr)
bm = bmesh.new()
for zz in (-.4, .4): hexbolt(bm, 0, -.95, zz, r=.04, h=.04, axis='y')
add_cyl(bm, (0, -.92, 0), .12, .04, 18)
new_obj('GrappleDetails', bm, MAT['machined'], gr)

def jaw(side):
    """side = +1 (right, +x) or -1; hinge at (side*.56, -1.02); local x outward; tines curve out, down and back in around the stone"""
    h = empty('Jaw' + ('R' if side > 0 else 'L'), gr, (side * .56, -1.02, 0))
    cl = [(.04, 0), (.2, -.1), (.3, -.42), (.28, -.82), (.12, -1.13), (-.12, -1.27)]   # tine centre line (jaw-local, outward positive)
    pts = catmull([Vector((x, y, 0)) for x, y in cl], 16)
    def cur(t):
        f = min(max(t, 0), 1) * (len(pts) - 1); i = min(int(f), len(pts) - 2); a = pts[i].lerp(pts[i + 1], f - i); return (a.x * side, a.y)
    bm = bmesh.new()
    for zz in (-.38, 0.0, .38):
        loft(bm, cur, lambda t: .075 - .035 * t, lambda t: .075 - .035 * t, lambda t: .16 - .06 * t, zz, 22)
    new_obj('JawTines_' + ('R' if side > 0 else 'L'), bm, MAT['graphite'], h, bevel=.016, bev_seg=2)
    bm = bmesh.new(); add_box(bm, (side * .1, -.02, 0), (.24, .2, 1.02)); add_cyl(bm, (0, 0, 0), .1, 1.0, 24, axis='z')
    new_obj('JawCrossbar_' + ('R' if side > 0 else 'L'), bm, MAT['steel'], h, bevel=.015)
    bm = bmesh.new()                                                                                   # wear tips on the tines
    for zz in (-.38, 0.0, .38):
        end = cur(1.0); add_box(bm, (end[0] + side * .01, end[1] - .005, zz), (.1, .09, .14))
    new_obj('JawTips_' + ('R' if side > 0 else 'L'), bm, MAT['trackWorn'], h, bevel=.008)
    return h
jl, jr = jaw(-1), jaw(+1)
# the jaw cylinders' anchors: (head, in the grapple frame) and (jaw, in the jaw frame)
JA = {'L': (-.3, -.89), 'R': (.3, -.89)}; JB = {'L': (-.28, .16), 'R': (.28, .16)}
tipg = empty('GrappleTip', gr, (0, -HG, 0))

# ---------------- hydraulic cylinders: barrel (graphite, with a base eye and a gland), chrome rod with a head eye; sized from the pose ranges
POSES = []
for tx in np.linspace(5.4, 8.8, 9):
    for ty in np.linspace(.6, 5.4, 12):
        al, be = solve(tx, ty); POSES.append((al, be))
def rng_of(fa, pa, fb, pb, stick_open=None):
    ds = [float(np.linalg.norm(fk(al, be, pa, fa) - fk(al, be, pb, fb))) for al, be in POSES]; return min(ds), max(ds)
CYLS = {}
def cylinder(name, parent, a_loc, tip_parent, b_loc, dmin, dmax, rb, rr, z=0.0, zb=None):
    """Empty `name` at the barrel pin (a_loc, in parent), with Barrel + Rod children; `Tip_<name>` marks the rod pin on tip_parent"""
    Lr = dmin - .03; Lb = max(dmax - dmin + .3, .56 * dmin); Lb = min(Lb, dmin - .14)
    e = empty(name, parent, (a_loc[0], a_loc[1], z)); t = empty('Tip_' + name, tip_parent, (b_loc[0], b_loc[1], z if zb is None else zb))
    bm = bmesh.new(); add_cyl(bm, (0, 0, 0), rb * .85, rb * 1.7, 22, axis='z'); cyl_between(bm, (rb * .6, 0, 0), (Lb, 0, 0), rb, 28)
    cyl_between(bm, (Lb - .05, 0, 0), (Lb + .0, 0, 0), rb * 1.18, 28); cyl_between(bm, (rb * .8, 0, 0), (rb * 1.5, 0, 0), rb * 1.16, 28)
    add_box(bm, (Lb * .45, rb * .95, 0), (.18, .09, .1))
    new_obj(name + '_Barrel', bm, MAT['graphite'], e, bevel=.01)
    e['Lr'] = float(Lr); e['Lb'] = float(Lb)       # exported as glTF extras: the web scene slides the rod by (distance - Lr)
    r = empty(name + '_Rod', e, (0, 0, 0))
    bm = bmesh.new(); cyl_between(bm, (0, 0, 0), (Lr - rr * 1.6, 0, 0), rr, 24); new_obj(name + '_RodShaft', bm, MAT['chrome'], r)
    bm = bmesh.new(); add_cyl(bm, (Lr - .0, 0, 0), rr * 1.4, rr * 3.0, 20, axis='z'); cyl_between(bm, (Lr - rr * 1.7, 0, 0), (Lr - rr * .6, 0, 0), rr * 1.3, 20)
    new_obj(name + '_RodEye', bm, MAT['machined'], r, bevel=.008)
    CYLS[name] = {'dmin': dmin, 'dmax': dmax, 'Lb': Lb, 'Lr': Lr}
    return e
# boom cylinders: turret anchor (near and far) -> boom underside lug
TB = (.6, .75)
dmin, dmax = rng_of('turret', (TB[0], TB[1]), 'boom', BA[0])
for nm, z, zb in (('Cyl_Boom_A', BP[2] + ZN, ZN), ('Cyl_Boom_B', BP[2] - ZN, -ZN)):
    cylinder(nm, turret, TB, boom, BA[0], dmin, dmax, .13, .07, z, zb)
bm = bmesh.new()
for zz in (BP[2] + ZN, BP[2] - ZN): add_box(bm, (TB[0] - .02, (.18 + TB[1]) / 2 - .05, zz), (.36, TB[1] - .18 + .1, .2)); add_cyl(bm, (TB[0], TB[1], zz), .1, .3, 18, axis='z')
new_obj('BoomCylinderMounts', bm, MAT['yellow'], turret, bevel=.015)
# stick cylinder: boom top lug -> stick ear
dmin, dmax = rng_of('boom', SA, 'stick', SB); cylinder('Cyl_Stick', boom, SA, stick, SB, dmin, dmax, .115, .065, 0.0)
# grapple tilt cylinder: stick lug -> grapple ear
dmin, dmax = rng_of('stick', TA, 'grapple', GB); cylinder('Cyl_Tilt', stick, TA, gr, GB, dmin, dmax, .085, .05, 0.0)
print('[excavator3d] cylinder ranges', {k: (round(v['dmin'], 2), round(v['dmax'], 2), round(v['Lb'], 2), round(v['Lr'], 2)) for k, v in CYLS.items()})
# jaw cylinders: head (grapple frame) -> jaw lug; their length depends only on the jaw angle (0 .. 38 deg open)
for s in ('L', 'R'):
    jf = jl if s == 'L' else jr; ds = []
    for ang in np.linspace(0, math.radians(38), 12):
        sg = 1 if s == 'R' else -1; ca, sa = math.cos(ang * sg), math.sin(ang * sg)
        hx, hy = sg * .56, -1.02; bx, by = hx + ca * JB[s][0] - sa * JB[s][1], hy + sa * JB[s][0] + ca * JB[s][1]
        ds.append(math.hypot(bx - JA[s][0], by - JA[s][1]))
    cylinder('Cyl_Jaw' + s, gr, JA[s], jf, JB[s], min(ds), max(ds), .055, .035, 0.0)
    bm = bmesh.new(); add_box(bm, (JA[s][0], JA[s][1], 0), (.14, .14, .3)); new_obj('JawCylMount_' + s, bm, MAT['steel'], gr, bevel=.01)
    # jaw lug (in the jaw frame)
    bm = bmesh.new(); add_box(bm, (JB[s][0], JB[s][1], 0), (.12, .12, .3)); new_obj('JawLug_' + s, bm, MAT['steel'], jf, bevel=.01)

# ---------------- export
def sel_tree(o):
    o.select_set(True)
    for c in o.children: sel_tree(c)
bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
            export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=82)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[excavator3d] gltf option retry', e)
print('[excavator3d] GLB', os.path.getsize(GLB), 'bytes')
meta = {'TY': TY, 'BP': BP, 'BL': BL, 'SL': SL, 'HG': HG, 'cyl': CYLS, 'anchors': {'turretBoom': TB, 'boomLugBoom': BA[0], 'boomLugStick': SA, 'stickEar': SB, 'tiltA': TA, 'tiltB': GB}}
with open(os.path.join(ROOT, 'assets', '3d', 'hydraulic-grapple-machine.json'), 'w') as fh: json.dump(meta, fh, indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'hydraulic-grapple-machine.blend'))
print('[excavator3d] done')
