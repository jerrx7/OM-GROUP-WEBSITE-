"""Shared Blender helpers for the OM GROUP machine models (sliced from build-excavator.py): three.js-axes mesh builders, PBR materials, procedural textures.
exec() this after bpy, scene, ROOT, TEX are defined."""
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

