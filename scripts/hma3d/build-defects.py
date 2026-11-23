"""OM GROUP - Hot Mix Asphalt page: the eight "common pavement defects" as Blender Cycles stills (a cut block of real pavement for each).

  blender -b --factory-startup -P scripts/hma3d/build-defects.py -- <repo root> [rut fat the rav ble str seg pot] [--quick|--half]
Out: _review/hma3d/defect-<key>.png (RGBA, contact shadow on a shadow catcher) + defect-anchors.json (label anchors, 0-1 of the frame; labels are HTML on the page).
Each block is a general, simplified cross-section: surface course (stone chips in black binder), granular base, subgrade. The vertical scale is exaggerated (not to scale), as the page says.
Everything is built here: layers as height-field solids (so a rut, a pit, a pothole is real geometry in the surface AND on the cut face), real stones set into the cut face, a stone-chip
surface shader driven by per-vertex masks, crack ribbons, loose stones, water. No product, plant, grade, thickness or test value is implied. Run export-defects.js afterwards."""
import os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'common.py'), encoding='utf8').read())
KEYS = [a for a in argv[1:] if not a.startswith('--')] or ['rut', 'fat', 'the', 'rav', 'ble', 'str', 'seg', 'pot']
RW, RH = 1500, 1000
W, D = 1.8, .9                     # block width (x), depth (y, away from the camera)
TA, TB, TS = .15, .16, .2          # surface course, granular base, subgrade (exaggerated thickness)
ZB1, ZB2, ZB3 = -TA, -TA - TB, -TA - TB - TS
ss = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(min(1, max(0, (x - a) / (b - a))))
gauss = lambda x, m, s: math.exp(-((x - m) / s) ** 2)

# ---------------------------------------------------------------- node helpers
def mk(nt, typ, **kw):
    n = nt.nodes.new(typ)
    for k, v in kw.items(): setattr(n, k, v)
    return n
def lk(nt, a, b): nt.links.new(a, b)
def mixf(nt, fac, a, b):
    n = mk(nt, 'ShaderNodeMix', data_type='FLOAT'); lk(nt, fac, n.inputs[0])
    for i, v in ((2, a), (3, b)):
        if hasattr(v, 'node'): lk(nt, v, n.inputs[i])
        else: n.inputs[i].default_value = v
    return n.outputs[0]
def mixc(nt, fac, a, b):
    n = mk(nt, 'ShaderNodeMix', data_type='RGBA'); lk(nt, fac, n.inputs[0])
    for i, v in ((6, a), (7, b)):
        if hasattr(v, 'node'): lk(nt, v, n.inputs[i])
        else: n.inputs[i].default_value = (*v, 1)
    return n.outputs[2]
def math_(nt, op, a, b=None, clamp=False):
    n = mk(nt, 'ShaderNodeMath', operation=op, use_clamp=clamp)
    for i, v in ((0, a), (1, b)):
        if v is None: continue
        if hasattr(v, 'node'): lk(nt, v, n.inputs[i])
        else: n.inputs[i].default_value = v
    return n.outputs[0]

def surf_mat(name, binder=(.012, .012, .014), lo=.05, hi=.30, expo=.5, rb=.6, rs=.72, sA=42, sB=None, bump=.012, tint=(1, 1, 1.03), dw=0.0, gloss=0.0, grit=.35, pale=0.0, wetdark=0.0):
    """a surface of stone chips in binder: Voronoi cells = chips (the 'wear' mask exposes them more / less, 'seg' blends a second, finer cell size)"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; P = nt.nodes['Principled BSDF']; tc = mk(nt, 'ShaderNodeTexCoord')
    def vor(sc):
        wn = mk(nt, 'ShaderNodeTexNoise'); wn.inputs['Scale'].default_value = sc * .55; wn.inputs['Detail'].default_value = 3; lk(nt, tc.outputs['Object'], wn.inputs['Vector'])
        ctr = mk(nt, 'ShaderNodeVectorMath', operation='SUBTRACT'); lk(nt, wn.outputs['Color'], ctr.inputs[0]); ctr.inputs[1].default_value = (.5, .5, .5)
        sc_ = mk(nt, 'ShaderNodeVectorMath', operation='SCALE'); lk(nt, ctr.outputs[0], sc_.inputs[0]); sc_.inputs['Scale'].default_value = .9 / sc
        ad = mk(nt, 'ShaderNodeVectorMath', operation='ADD'); lk(nt, tc.outputs['Object'], ad.inputs[0]); lk(nt, sc_.outputs[0], ad.inputs[1])
        v = mk(nt, 'ShaderNodeTexVoronoi'); v.inputs['Scale'].default_value = sc; v.inputs['Randomness'].default_value = 1.0; lk(nt, ad.outputs[0], v.inputs['Vector']); return v
    def rch(v): s = mk(nt, 'ShaderNodeSeparateColor'); lk(nt, v.outputs['Color'], s.inputs['Color']); return s.outputs['Red']
    at = lambda nm: mk(nt, 'ShaderNodeAttribute', attribute_name=nm, attribute_type='GEOMETRY').outputs['Fac']
    wear = at('wear'); vA = vor(sA); dist, rnd = vA.outputs['Distance'], rch(vA)
    if sB:
        vB = vor(sB); seg = at('seg'); dist = mixf(nt, seg, dist, vB.outputs['Distance']); rnd = mixf(nt, seg, rnd, rch(vB))
    d2 = math_(nt, 'SUBTRACT', dist, math_(nt, 'MULTIPLY', wear, dw)) if dw else dist
    e0 = .20 + .35 * expo
    M = mk(nt, 'ShaderNodeMapRange', clamp=True); lk(nt, d2, M.inputs['Value']); M.inputs['From Min'].default_value = e0; M.inputs['From Max'].default_value = e0 + .15; M.inputs['To Min'].default_value = 1; M.inputs['To Max'].default_value = 0
    cr = mk(nt, 'ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (*[c * lo for c in tint], 1); cr.color_ramp.elements[1].color = (*[min(1, c * hi) for c in tint], 1); lk(nt, rnd, cr.inputs['Fac'])
    stone = cr.outputs['Color']
    if pale: stone = mixc(nt, math_(nt, 'MULTIPLY', wear, pale), stone, (.62, .6, .56))
    noi = mk(nt, 'ShaderNodeTexNoise'); noi.inputs['Scale'].default_value = 520; noi.inputs['Detail'].default_value = 4; lk(nt, tc.outputs['Object'], noi.inputs['Vector'])
    base = mixc(nt, M.outputs['Result'], binder, stone)
    base = mixc(nt, math_(nt, 'MULTIPLY', noi.outputs['Fac'], grit), base, (.0, .0, .0)) if grit else base
    if wetdark: base = mixc(nt, math_(nt, 'MULTIPLY', wear, wetdark), base, (.01, .012, .016))
    lk(nt, base, P.inputs['Base Color'])
    rg = mixf(nt, M.outputs['Result'], rb, rs)
    if gloss: rg = math_(nt, 'MULTIPLY', rg, math_(nt, 'SUBTRACT', 1.0, math_(nt, 'MULTIPLY', wear, gloss)))
    lk(nt, math_(nt, 'MAXIMUM', rg, .04), P.inputs['Roughness'])
    h = math_(nt, 'ADD', M.outputs['Result'], math_(nt, 'MULTIPLY', noi.outputs['Fac'], .25))
    bp = mk(nt, 'ShaderNodeBump'); bp.inputs['Strength'].default_value = 1.0; bp.inputs['Distance'].default_value = bump; lk(nt, h, bp.inputs['Height']); lk(nt, bp.outputs['Normal'], P.inputs['Normal'])
    if 'Specular IOR Level' in P.inputs: P.inputs['Specular IOR Level'].default_value = .35
    return m

def face_mat(name, kind):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; P = nt.nodes['Principled BSDF']; tc = mk(nt, 'ShaderNodeTexCoord')
    n1 = mk(nt, 'ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = {'a': 360, 'b': 150, 's': 60}[kind]; n1.inputs['Detail'].default_value = 8; lk(nt, tc.outputs['Object'], n1.inputs['Vector'])
    n2 = mk(nt, 'ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = {'a': 12, 'b': 8, 's': 5}[kind]; n2.inputs['Detail'].default_value = 3; lk(nt, tc.outputs['Object'], n2.inputs['Vector'])
    cr = mk(nt, 'ShaderNodeValToRGB')
    if kind == 'a':     # asphalt: black binder, sand-grain speckle
        cr.color_ramp.elements[0].color = (.006, .006, .008, 1); cr.color_ramp.elements[1].color = (.085, .085, .09, 1); cr.color_ramp.elements[0].position = .46; cr.color_ramp.elements[1].position = .72; rough = .62
    elif kind == 'b':   # granular base matrix: grey-tan fines
        cr.color_ramp.elements[0].color = (.12, .115, .105, 1); cr.color_ramp.elements[1].color = (.34, .325, .29, 1); cr.color_ramp.elements[0].position = .3; cr.color_ramp.elements[1].position = .7; rough = .95
    else:               # subgrade soil: laterite brown
        cr.color_ramp.elements[0].color = (.07, .036, .022, 1); cr.color_ramp.elements[1].color = (.23, .125, .08, 1); cr.color_ramp.elements[0].position = .3; cr.color_ramp.elements[1].position = .75; rough = .96
    lk(nt, n1.outputs['Fac'], cr.inputs['Fac']); col = mixc(nt, math_(nt, 'MULTIPLY', n2.outputs['Fac'], .5), cr.outputs['Color'], (.0, .0, .0)) if kind != 'a' else cr.outputs['Color']
    lk(nt, col, P.inputs['Base Color']); P.inputs['Roughness'].default_value = rough
    bp = mk(nt, 'ShaderNodeBump'); bp.inputs['Strength'].default_value = .6; bp.inputs['Distance'].default_value = .004; lk(nt, n1.outputs['Fac'], bp.inputs['Height']); lk(nt, bp.outputs['Normal'], P.inputs['Normal'])
    return m

# ---------------------------------------------------------------- geometry
def solid(name, ft, fb, mtop, mface, maskf=None, nx=240, ny=120):
    """a layer as a height-field solid: top z = ft(x, y), bottom z = fb(x, y), over [0, W] x [0, D]; the front (y = 0) is the cut face"""
    bm = bmesh.new(); xs = [W * i / nx for i in range(nx + 1)]; ys = [D * j / ny for j in range(ny + 1)]
    top = [[bm.verts.new((x, y, ft(x, y))) for x in xs] for y in ys]; bot = [[bm.verts.new((x, y, fb(x, y))) for x in xs] for y in ys]
    F = []
    for j in range(ny):
        for i in range(nx):
            F.append((bm.faces.new((top[j][i], top[j][i + 1], top[j + 1][i + 1], top[j + 1][i])), 0)); F.append((bm.faces.new((bot[j][i], bot[j + 1][i], bot[j + 1][i + 1], bot[j][i + 1])), 0))
    for i in range(nx):
        F.append((bm.faces.new((top[0][i], bot[0][i], bot[0][i + 1], top[0][i + 1])), 1)); F.append((bm.faces.new((top[ny][i], top[ny][i + 1], bot[ny][i + 1], bot[ny][i])), 1))
    for j in range(ny):
        F.append((bm.faces.new((top[j][0], top[j + 1][0], bot[j + 1][0], bot[j][0])), 1)); F.append((bm.faces.new((top[j][nx], bot[j][nx], bot[j + 1][nx], top[j + 1][nx])), 1))
    for f, mi in F: f.material_index = mi
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(mtop); me.materials.append(mface)
    for p in me.polygons: p.use_smooth = p.material_index == 0
    for an in ('wear', 'seg'):
        at = me.attributes.new(an, 'FLOAT', 'POINT'); f = (maskf or {}).get(an)
        at.data.foreach_set('value', [f(v.co.x, v.co.y) if f else 0.0 for v in me.vertices])
    o = bpy.data.objects.new(name, me); link(o); return o

def fill_face(rng, rocks, mat, n, xr, zfn, rr, tries=9000, gap=.74, y_scale=.42, hard=None, depth=0.0):
    """real stones set into the cut face (y = 0): positions from rejection sampling inside the layer, sizes rr = (min, max) (log-uniform)"""
    placed = []; cell = .05; grid = {}
    for _ in range(tries):
        if len(placed) >= n: break
        r = math.exp(rng.uniform(math.log(rr[0]), math.log(rr[1]))); x = rng.uniform(xr[0] + r * .5, xr[1] - r * .5); zlo, zhi = zfn(x); z = rng.uniform(zlo + r * .62, zhi - r * .45)
        if zhi - zlo < r * 1.4: continue
        if hard and not hard(x, z, r): continue
        gx, gz = int(x / cell), int(z / cell); ok = True
        for ax in range(gx - 2, gx + 3):
            for az in range(gz - 2, gz + 3):
                for (px, pz, pr) in grid.get((ax, az), ()):
                    if math.hypot(px - x, pz - z) < (pr + r) * gap: ok = False; break
                if not ok: break
            if not ok: break
        if not ok: continue
        grid.setdefault((gx, gz), []).append((x, z, r)); placed.append((x, z, r))
        o = bpy.data.objects.new('st', rng.choice(rocks)); link(o); o.data.materials.clear(); o.data.materials.append(mat) if not o.data.materials else None
        o.location = (x, r * .1, z); o.rotation_euler = (rng.uniform(-.5, .5), rng.uniform(0, 6.28), rng.uniform(0, 6.28)); o.scale = (r * rng.uniform(1.0, 1.25), r * y_scale, r * rng.uniform(.8, 1.05))
        o.rotation_euler = (rng.uniform(-.35, .35), rng.uniform(0, 6.28), rng.uniform(-.35, .35))   # broad side to the camera, any turn in the plane of the face
    return placed

def crack(pts, radius, m, name='crack'): return tube(name, pts, radius, m)
def jag(rng, p0, p1, amp, step=.02, axis_noise=(0, 1)):
    """a jagged polyline from p0 to p1 (3D), jitter perpendicular in the given axes"""
    n = max(2, int(math.dist(p0, p1) / step)); out = []
    for i in range(n + 1):
        t = i / n; p = [p0[k] + (p1[k] - p0[k]) * t for k in range(3)]
        if 0 < i < n:
            for ax in axis_noise: p[ax] += rng.gauss(0, amp)
        out.append(tuple(p))
    return out

# ---------------------------------------------------------------- scene
def scene(key):
    rng = random.Random({'rut': 3, 'fat': 5, 'the': 7, 'rav': 9, 'ble': 13, 'str': 17, 'seg': 21, 'pot': 25}[key])
    sc = setup_scene(RW, RH, 140); world_studio(.62, (.97, .96, .94), (.74, .73, .72))
    cam = camera((.9, -3.05, .72), (.9, .28, -.2), 62)
    ASPH_F, BASE_F, SOIL_F = face_mat('asph_face', 'a'), face_mat('base_face', 'b'), face_mat('soil_face', 's')
    WATER = mat('water', (.10, .27, .42), 0, .03, spec=1.0, coat=.6); b = WATER.node_tree.nodes['Principled BSDF']
    for k, v in (('Transmission Weight', .45), ('IOR', 1.33)):
        if k in b.inputs: b.inputs[k].default_value = v
    CRACK = mat('crack', (.003, .003, .004), 0, 1.0, spec=0)
    rocks = [make_rock('rk%d' % i, 100 + i, 24, .8, .72, .1) for i in range(7)]
    ST_A = stone_mat('stA', .035, .24, .72, (1, 1.0, 1.03), 120, .55); ST_B = stone_mat('stB', .14, .42, .8, (1.02, 1.0, .94), 80, .6); ST_S = stone_mat('stS', .07, .22, .82, (1.05, 1.0, .95), 60, .5)
    ST_P = stone_mat('stP', .34, .7, .76, (1.04, 1.0, .93), 120, .55)          # pale: uncoated / loose stones
    top = lambda x, y: 0.0; basetop = lambda x, y: ZB1; wear = {}; seg = {}; surf = {}
    anchors = {}; extra = []
    surf_kw = dict(binder=(.009, .009, .011), lo=.035, hi=.2, expo=.42, rb=.62, rs=.74, sA=44)

    # ---- the defect: surface height, masks, extra objects
    if key == 'rut':
        x1, x2, s = .56, 1.30, .19
        top = lambda x, y: -.062 * (gauss(x, x1, s) + gauss(x, x2, s)) + .02 * (gauss(x, x1 - .33, .08) + gauss(x, x2 + .33, .08) + gauss(x, (x1 + x2) / 2, .1)) + .0014 * math.sin(x * 60 + y * 20)
        wear = {'wear': lambda x, y: min(1, gauss(x, x1, .2) + gauss(x, x2, .2))}; surf_kw.update(dw=.07, gloss=.6, expo=.42)
        anchors = {'a': (.56, .55, top(.56, .55))}
    elif key == 'fat':
        surf_kw.update(expo=.45); anchors = {'a': (.74, 0, -.075)}
    elif key == 'the':
        top = lambda x, y: 0.0
        surf_kw.update(expo=.5); anchors = {'a': (.9, .08, 0.0)}
    elif key == 'rav':
        pits = [(rng.uniform(.05, W - .05), rng.uniform(.0, D - .05), rng.uniform(.012, .026)) for _ in range(260)]
        def top(x, y):
            z = 0.0
            for (px, py, pr) in pits:
                d = math.hypot(x - px, y - py)
                if d < pr * 1.4: z -= .011 * (1 - ss(pr * .5, pr * 1.4, d))
            return z
        wear = {'wear': lambda x, y: .5 + .5 * math.sin(x * 9 + y * 6)}; surf_kw.update(expo=.78, dw=.1, lo=.12, hi=.5, rs=.86, bump=.016, grit=.5)
        anchors = {'a': (pits[3][0], pits[3][1], 0.0)}
        for i in range(120):   # loose stones lying on the surface
            extra.append(('loose', rng.uniform(.04, W - .04), rng.uniform(.02, D - .04), rng.uniform(.006, .014)))
    elif key == 'ble':
        wear = {'wear': lambda x, y: .75 + .25 * math.sin(x * 4)}; surf_kw.update(expo=.12, gloss=.88, rb=.16, rs=.3, bump=.004, binder=(.008, .008, .01), dw=-.0)
        top = lambda x, y: .002 * math.sin(x * 38) * math.sin(y * 31) + .004 * (math.sin(x * 7 + y * 3))
        anchors = {'a': (.62, .42, top(.62, .42))}
    elif key == 'str':
        wear = {'wear': lambda x, y: min(1, .15 + .85 * (.5 + .5 * math.sin(x * 11 + y * 7)) * ss(.2, .9, math.sin(x * 3.1 + y * 5.3) * .5 + .5))}
        surf_kw.update(expo=.7, pale=.8, wetdark=.35, dw=.06, lo=.1, hi=.55, bump=.014, rs=.8)
        pits = [(rng.uniform(.05, W - .05), rng.uniform(.0, D - .05), rng.uniform(.01, .02)) for _ in range(150)]
        def top(x, y):
            z = 0.0
            for (px, py, pr) in pits:
                d = math.hypot(x - px, y - py)
                if d < pr * 1.4: z -= .007 * (1 - ss(pr * .5, pr * 1.4, d))
            return z
        anchors = {'a': (.55, 0, ZB1 + .022)}
    elif key == 'seg':
        xs0 = .9; seg = {'seg': lambda x, y: ss(xs0 - .07 + .04 * math.sin(y * 9), xs0 + .07 + .04 * math.sin(y * 9), x)}
        surf_kw.update(sA=22, sB=74, expo=.55, lo=.06, hi=.4, bump=.014)
        anchors = {'a': (.4, 0, -.06), 'b': (1.4, 0, -.06)}
    elif key == 'pot':
        hx, hy, R = .9, .06, .36
        def bowl(x, y):
            a = math.atan2(y - hy, x - hx); rr = R * (1 + .12 * math.sin(a * 3 + 1) + .07 * math.sin(a * 7 + 2) + .04 * math.sin(a * 13)); d = math.hypot(x - hx, y - hy) / rr
            return d
        def top(x, y):
            d = bowl(x, y)
            if d >= 1: return .0
            if d > .86: return -TA * ss(1.0, .86, d) * .92            # the broken lip: steep
            return ZB1 - .045 * (1 - d / .86) ** .8 + .006 * math.sin(x * 40) * math.sin(y * 33)
        basetop = lambda x, y: ZB1 - (.045 * (1 - bowl(x, y) / .86) ** .8 if bowl(x, y) < .86 else 0.0)
        wear = {'wear': lambda x, y: ss(1.02, .85, bowl(x, y))}; surf_kw.update(dw=.12, expo=.55)
        anchors = {'a': (hx, hy + .06, ZB1 - .04)}
    # ---- the layers
    SURF = surf_mat('surf_' + key, **surf_kw)
    asphalt = solid('asphalt', top, basetop, SURF, ASPH_F, {**wear, **seg}, ny=140 if key in ('rav', 'str', 'pot') else 100)
    BASE_TOP = surf_mat('basetop', binder=(.11, .1, .09), lo=.1, hi=.4, expo=.8, rb=.95, rs=.9, sA=26, bump=.02, tint=(1.02, 1.0, .94), grit=.4)
    base = solid('base', basetop if key == 'pot' else (lambda x, y: ZB1), lambda x, y: ZB2, BASE_TOP, BASE_F, nx=240 if key == 'pot' else 8, ny=100 if key == 'pot' else 4)
    sub = solid('sub', lambda x, y: ZB2, lambda x, y: ZB3, BASE_TOP, SOIL_F, nx=8, ny=4)
    # ---- stones set into the cut face
    topf = lambda x: top(x, 0.0); botf = lambda x: basetop(x, 0.0)
    if key == 'seg':
        fill_face(rng, rocks, ST_A, 70, (0, xs0 - .02), lambda x: (botf(x), topf(x)), (.022, .036), gap=.7)
        fill_face(rng, rocks, ST_A, 520, (xs0 + .02, W), lambda x: (botf(x), topf(x)), (.0055, .012), tries=22000, gap=.8)
    else:
        n_a = {'ble': 330, 'rav': 300}.get(key, 340); fill_face(rng, rocks, ST_A, n_a, (0, W), lambda x: (botf(x), topf(x)), (.009, .026), gap=.72)
    fill_face(rng, rocks, ST_B, 150, (0, W), lambda x: (ZB2, basetop(x, 0)), (.016, .042), gap=.7)
    fill_face(rng, rocks, ST_S, 40, (0, W), lambda x: (ZB3, ZB2), (.012, .03), gap=.9)
    if key == 'str':   # pale, stripped stones in the lower half of the surface course + water pockets under them
        for _ in range(26):
            r = rng.uniform(.012, .026); x = rng.uniform(.05, W - .05); z = rng.uniform(ZB1 + r * .8, ZB1 + TA * .55)
            o = bpy.data.objects.new('ps', rng.choice(rocks)); link(o); o.data.materials.append(ST_P); o.location = (x, r * .02, z); o.rotation_euler = (rng.uniform(-.3, .3), rng.uniform(0, 6.28), rng.uniform(-.3, .3)); o.scale = (r * 1.2, r * .5, r * .9)
        for x in (.28, .55, .95, 1.32, 1.6):
            w = sphere('wp', .03, (x, .002, ZB1 + .012), WATER, scale=(1.5, .28, .5), seg=28)
        anchors = {'a': (.55, 0, ZB1 + .014)}
    # ---- cracks
    if key == 'fat':
        for x0 in (.38, .74, 1.12, 1.46):                                   # cracks on the cut face, up from the base
            pts = jag(rng, (x0, -.004, ZB1 - .0), (x0 + rng.uniform(-.06, .06), -.004, -.006), .008, .012, (0, 2)); crack(pts, .0032, CRACK)
            for k in range(2):
                t = rng.uniform(.3, .8); p = pts[int(t * (len(pts) - 1))]; q = (p[0] + rng.choice((-1, 1)) * rng.uniform(.04, .09), -.004, p[2] + rng.uniform(.01, .04)); crack(jag(rng, p, q, .005, .012, (0, 2)), .0024, CRACK)
        rows = [.13, .36, .6, .83]; cols = [.3, .68, 1.06, 1.44]                   # the alligator network on the surface
        for xc in cols: crack(jag(rng, (xc, 0, 0.001), (xc + rng.uniform(-.05, .05), D, 0.001), .012, .02, (0,)), .0042, CRACK)
        for yr in rows:
            for a, bq in zip(cols[:-1], cols[1:]): crack(jag(rng, (a, yr + rng.uniform(-.04, .04), .001), (bq, yr + rng.uniform(-.04, .04), .001), .012, .02, (1,)), .0036, CRACK)
        for xc in (.5, .88, 1.26):
            for yr in (.25, .5, .72): crack(jag(rng, (xc - .12, yr - .1, .001), (xc + .1, yr + .12, .001), .008, .02, (0, 1)), .003, CRACK)
    if key == 'the':
        x0 = .9; pts = jag(rng, (x0, -.004, -.001), (x0 - .01, -.004, -TA + .004), .0055, .01, (0, 2)); crack(pts, .0042, CRACK)
        crack(jag(rng, (x0, 0.0, .001), (x0 + .02, D, .001), .007, .016, (0,)), .0055, CRACK)
        for k in range(3): p = pts[int(rng.uniform(.2, .7) * (len(pts) - 1))]; crack(jag(rng, p, (p[0] + rng.choice((-1, 1)) * .05, -.004, p[2] - rng.uniform(.0, .03)), .004, .01, (0, 2)), .0022, CRACK)
    # ---- loose stones (ravelling), pothole contents
    for (_, x, y, r) in [e for e in extra if e[0] == 'loose']:
        o = bpy.data.objects.new('loose', rng.choice(rocks)); link(o); o.data.materials.append(ST_P if rng.random() < .55 else ST_A); o.location = (x, y, top(x, y) + r * .4); o.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3)); o.scale = (r, r * rng.uniform(.8, 1.1), r * .75)
    if key == 'pot':
        hx, hy = .9, .06
        for i in range(46):   # broken-out lumps and loose stones around the rim and in the bowl
            a = rng.uniform(0, math.pi); rr = rng.uniform(.0, .55) * .36 if i < 22 else rng.uniform(.9, 1.25) * .36; x, y = hx + rr * math.cos(a), hy + rr * math.sin(a); r = rng.uniform(.008, .02)
            o = bpy.data.objects.new('pl', rng.choice(rocks)); link(o); o.data.materials.append(ST_P if rng.random() < .4 else ST_A); o.location = (x, max(y, .02), top(x, y) + r * .5); o.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3)); o.scale = (r, r, r * .8)
        lvl = ZB1 - .018; N = 56; bm = bmesh.new(); c0 = bm.verts.new((hx, .015, lvl)); ring = []
        for k in range(N + 1):
            a = math.pi * k / N; rw = .21 * (1 + .1 * math.sin(a * 5)); ring.append(bm.verts.new((hx + rw * math.cos(a), max(.004, .015 + rw * .95 * math.sin(a)), lvl)))
        for k in range(N): bm.faces.new((c0, ring[k], ring[k + 1]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); wo = from_bm('water', bm, WATER, True)
        for k in range(14): ob = bpy.data.objects.new('ws', rocks[k % 7]); link(ob); ob.data.materials.clear() if False else None; ob.location = (hx + rng.uniform(-.17, .17), rng.uniform(.04, .17), lvl - .008); ob.scale = (rng.uniform(.008, .015),) * 3; ob.rotation_euler = (rng.uniform(0, 6), rng.uniform(0, 6), rng.uniform(0, 6)); ob.data.materials.append(ST_A) if not ob.data.materials else None
    # ---- floor, lights
    shadow_floor(30, ZB3)
    area_light('key', (-2.4, -2.6, 2.7), (.9, .3, -.15), 430, 2.6, (1.0, .96, .9))
    area_light('fill', (3.4, -2.4, 1.2), (.9, .3, -.2), 90, 3.2, (.92, .95, 1.0))
    area_light('rim', (.9, 2.6, 1.8), (.9, .3, -.2), 140, 3.0, (1, 1, 1))
    if key in ('ble',): area_light('glint', (.9, 1.2, 2.4), (.9, .3, -.05), 380, 1.6, (1, 1, 1))
    pts = {k: v for k, v in anchors.items()}
    return sc, cam, pts

anchors_all = {}
fp = os.path.join(OUT, 'defect-anchors.json')
if os.path.exists(fp): anchors_all = json.load(open(fp))
for key in KEYS:
    sc, cam, pts = scene(key)
    anchors_all[key] = project(cam, pts)
    render(os.path.join(OUT, 'defect-%s.png' % key)); print('[defects] rendered', key)
    json.dump(anchors_all, open(fp, 'w'), indent=1)
print('[defects] done')
