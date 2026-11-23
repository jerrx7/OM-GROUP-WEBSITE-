"""OM GROUP - Hot Mix Asphalt page: pavement cut-aways as Blender Cycles stills (aggregate shown as angular stone in black binder).
  blender -b --factory-startup -P scripts/hma3d/build-cutaways.py -- <repo root> [--quick|--half]      (ONLY=rut,prime env var renders a subset)
Keys:  defects  rut fat the rav ble str seg pot          ("Common pavement defects" cards)
       layers   prime tack                              ("Prime coat and tack coat" cards)
                cf0 cf1 cf2                             ("The cut face of the mat, stage by stage": after paver / intermediate / finish rolling)
Out: _review/hma3d/def-<key>.png (RGBA, shadow catcher) + def-<key>-anchors.json (annotation anchors, 0-1 of the frame).
Each still is a block of pavement cut so the front face shows the section.  Defects are modelled in the geometry (displaced height field + grooves) and in the material
(stone/binder texture), not painted on.  Arrows, dashes, pills and titles are drawn on top in HTML/SVG from the anchors (scripts/hma3d/def-figs.js, layer-figs.js).
NOTE: this file replaced an earlier scripts/hma3d/build-defects.py that another session has since overwritten with a different implementation."""
import os, zlib
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'common.py'), encoding='utf8').read())

W, H = 2000, 1000
DEFECTS = ['rut', 'fat', 'the', 'rav', 'ble', 'str', 'seg', 'pot']
LAYERS = ['prime', 'tack', 'cf0', 'cf1', 'cf2']
ONLY = [k for k in os.environ.get('ONLY', '').split(',') if k] or DEFECTS + LAYERS
SX, SD = 1.0, .30                       # block width (x) and depth (y), metres
ZS, ZB, ZA = .085, .185, .31            # subgrade top, base top, asphalt top
NX, NY, NZ = 500, 150, 44

def sm(a, b, x):
    t = min(1., max(0., (x - a) / (b - a))); return t * t * (3 - 2 * t)
def gs(x, c, s): return math.exp(-((x - c) / s) ** 2)
def nz(x, y, s, o=0.): return noise.noise(Vector((x * s + o, y * s + o * 1.7, o * .3)))

# ------------------------------------------------------------------ materials
def _nodes(m):
    m.use_nodes = True; nt = m.node_tree; return nt, nt.nodes, nt.links, nt.nodes['Principled BSDF']
def _attr(N, name):
    a = N.new('ShaderNodeAttribute'); a.attribute_name = name; a.attribute_type = 'GEOMETRY'; return a.outputs['Fac']
def _mr(N, L, src, a, b, c, d, smooth=False, clamp=True):
    r = N.new('ShaderNodeMapRange'); r.clamp = clamp; r.interpolation_type = 'SMOOTHSTEP' if smooth else 'LINEAR'
    r.inputs['From Min'].default_value = a; r.inputs['From Max'].default_value = b; r.inputs['To Min'].default_value = c; r.inputs['To Max'].default_value = d
    if src is not None: L.new(src, r.inputs['Value'])
    return r.outputs['Result']
def _math(N, L, op, a, b):
    n = N.new('ShaderNodeMath'); n.operation = op
    for i, v in enumerate((a, b)):
        if isinstance(v, (int, float)): n.inputs[i].default_value = v
        else: L.new(v, n.inputs[i])
    return n.outputs['Value']
def _mix(N, L, fac, a, b):
    n = N.new('ShaderNodeMix'); n.data_type = 'RGBA'
    for k, v in (('Factor', fac), ('A', a), ('B', b)):
        if isinstance(v, (tuple, list)): n.inputs[k].default_value = (*v[:3], 1)
        elif isinstance(v, float): n.inputs[k].default_value = v
        else: L.new(v, n.inputs[k])
    return n.outputs['Result']
def _ramp(N, L, fac, stops):
    cr = N.new('ShaderNodeValToRGB'); e = cr.color_ramp.elements
    while len(e) < len(stops): e.new(.5)
    for el, (p, c) in zip(e, stops): el.position = p; el.color = (*c, 1)
    L.new(fac, cr.inputs['Fac']); return cr.outputs['Color']
def _warped(N, L, tc, scale, off, warp):
    mp = N.new('ShaderNodeMapping'); mp.inputs['Location'].default_value = off; L.new(tc.outputs['Object'], mp.inputs['Vector'])
    nzn = N.new('ShaderNodeTexNoise'); nzn.inputs['Scale'].default_value = scale * .55; nzn.inputs['Detail'].default_value = 3; L.new(mp.outputs['Vector'], nzn.inputs['Vector'])
    vs = N.new('ShaderNodeVectorMath'); vs.operation = 'SUBTRACT'; L.new(nzn.outputs['Color'], vs.inputs[0]); vs.inputs[1].default_value = (.5, .5, .5)
    vk = N.new('ShaderNodeVectorMath'); vk.operation = 'SCALE'; L.new(vs.outputs['Vector'], vk.inputs[0]); vk.inputs['Scale'].default_value = warp / max(scale, 1)
    va = N.new('ShaderNodeVectorMath'); va.operation = 'ADD'; L.new(mp.outputs['Vector'], va.inputs[0]); L.new(vk.outputs['Vector'], va.inputs[1])
    return va.outputs['Vector']
def _stones(N, L, tc, scale, rmin, rmax, soft, off, stops, gap=.07, warp=.34):
    """aggregate particles: warped Voronoi cells, each trimmed to a per-cell radius and separated from its neighbours by a thin binder gap
    (distance-to-edge), so the cut face reads as angular stones in black binder.  returns (coverage mask, per-stone colour, dome height)"""
    vec = _warped(N, L, tc, scale, off, warp)
    v = N.new('ShaderNodeTexVoronoi'); v.voronoi_dimensions = '3D'; v.feature = 'F1'; v.distance = 'EUCLIDEAN'
    v.inputs['Scale'].default_value = scale; v.inputs['Randomness'].default_value = 1.; L.new(vec, v.inputs['Vector'])
    e = N.new('ShaderNodeTexVoronoi'); e.voronoi_dimensions = '3D'; e.feature = 'DISTANCE_TO_EDGE'
    e.inputs['Scale'].default_value = scale; e.inputs['Randomness'].default_value = 1.; L.new(vec, e.inputs['Vector'])
    sp = N.new('ShaderNodeSeparateColor'); L.new(v.outputs['Color'], sp.inputs['Color'])
    thr = _mr(N, L, sp.outputs['Red'], 0, 1, rmin, rmax)
    sub = _math(N, L, 'SUBTRACT', thr, v.outputs['Distance'])
    gp = _mr(N, L, sp.outputs['Blue'], 0, 1, gap * .6, gap * 1.5)
    esub = _math(N, L, 'SUBTRACT', e.outputs['Distance'], gp)
    mask = _math(N, L, 'MINIMUM', _mr(N, L, sub, 0, soft, 0, 1, smooth=True), _mr(N, L, esub, 0, soft * .8, 0, 1, smooth=True))
    dome = _math(N, L, 'MINIMUM', _mr(N, L, sub, 0, .30, 0, 1, smooth=True), _mr(N, L, esub, 0, .12, 0, 1, smooth=True))
    return mask, _ramp(N, L, sp.outputs['Green'], stops), dome

BIG = [(0, (.035, .035, .04)), (.30, (.07, .07, .075)), (.62, (.135, .13, .125)), (.88, (.22, .21, .195)), (1, (.30, .285, .26))]
FINE = [(0, (.025, .025, .03)), (.6, (.07, .07, .075)), (1, (.19, .185, .175))]
FSEG = [(0, (.03, .03, .034)), (.5, (.075, .075, .08)), (1, (.17, .165, .16))]
DARK = [(0, (.015, .015, .017)), (.5, (.035, .035, .04)), (1, (.08, .08, .085))]

def asphalt_mat(variant):
    m = bpy.data.materials.new('asph_' + variant); nt, N, L, b = _nodes(m); tc = N.new('ShaderNodeTexCoord')
    ck, g = _attr(N, 'ck'), _attr(N, 'g')
    def compose(big, fine, bind=(.007, .007, .008), bigc=BIG, finec=FINE, rough=(.80, .50), gap=.07):
        bm_, bc, bd = _stones(N, L, tc, big[0], big[1], big[2], .06, (3.1, 1.3, 7.7), bigc, gap)
        fm_, fc, fd = _stones(N, L, tc, fine[0], fine[1], fine[2], .07, (9.3, 5.1, 2.2), finec, gap)
        col = _mix(N, L, fm_, bind, fc); col = _mix(N, L, bm_, col, bc)
        h = _math(N, L, 'ADD', bd, _math(N, L, 'MULTIPLY', fd, .30))
        r = _mr(N, L, _math(N, L, 'MAXIMUM', bm_, _math(N, L, 'MULTIPLY', fm_, .6)), 0, 1, rough[0], rough[1])
        return col, h, r, bm_
    if variant == 'seg':
        c1, h1, r1, _ = compose((27, .50, .74), (95, .16, .32), (.010, .009, .008))
        c2, h2, r2, _ = compose((105, .46, .72), (230, .36, .62), (.006, .006, .008), FSEG, FSEG)
        col = _mix(N, L, g, c1, c2); h = _mix(N, L, g, h1, h2); rough = _mix(N, L, g, r1, r2)
    elif variant == 'ble':
        col, h, rough, bm_ = compose((52, .34, .52), (170, .16, .30), (.003, .003, .004), DARK, DARK, (.35, .20))
    elif variant == 'rav':
        col, h, rough, bm_ = compose((52, .52, .76), (170, .26, .52), (.012, .011, .011))
        col = _mix(N, L, _math(N, L, 'MULTIPLY', g, .9), col, (.005, .005, .006))
    elif variant in ('cf0', 'cf1', 'cf2'):       # mat after the paver / intermediate / finish rolling: the binder gaps close up as the stones settle
        P = {'cf0': ((40, .44, .66), (130, .20, .38), .16), 'cf1': ((40, .48, .72), (130, .24, .44), .10), 'cf2': ((40, .56, .82), (130, .32, .56), .05)}[variant]
        col, h, rough, bm_ = compose(P[0], P[1], (.006, .006, .007), gap=P[2])
    else:
        col, h, rough, bm_ = compose((52, .50, .74), (170, .24, .48))
        if variant == 'str':
            pale = _ramp(N, L, g, [(0, (.30, .29, .27)), (1, (.66, .63, .57))])
            col = _mix(N, L, _math(N, L, 'MULTIPLY', g, bm_), col, pale)
            col = _mix(N, L, _math(N, L, 'MULTIPLY', g, .55), col, (.13, .11, .09))
    col = _mix(N, L, ck, col, (.003, .003, .003))
    L.new(col, b.inputs['Base Color'])
    if variant == 'ble':
        L.new(_mr(N, L, g, 0, 1, 1., .03), b.inputs['Roughness'])
        L.new(_mr(N, L, g, 0, 1, 0., .85), b.inputs['Coat Weight']); b.inputs['Coat Roughness'].default_value = .04
    else: L.new(rough, b.inputs['Roughness'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .9 if variant != 'ble' else .10; bp.inputs['Distance'].default_value = .0035
    L.new(h, bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal']); return m

def base_mat(prime=False):
    m = bpy.data.materials.new('base'); nt, N, L, b = _nodes(m); tc = N.new('ShaderNodeTexCoord'); g = _attr(N, 'g')
    bm1, bc1, bd1 = _stones(N, L, tc, 64, .40, .60, .08, (1.7, 4.2, 8.8), [(0, (.16, .15, .135)), (.5, (.26, .25, .23)), (1, (.42, .40, .37))])
    bm2, bc2, bd2 = _stones(N, L, tc, 190, .22, .52, .10, (6.1, .4, 3.3), [(0, (.16, .14, .12)), (1, (.42, .39, .34))])
    col = _mix(N, L, bm2, (.21, .19, .16), bc2); col = _mix(N, L, bm1, col, bc1)
    col = _mix(N, L, _math(N, L, 'MULTIPLY', g, .96 if prime else .7), col, (.012, .011, .01) if prime else (.05, .045, .04))
    L.new(col, b.inputs['Base Color'])
    L.new(_mr(N, L, g, 0, 1, .86, .82 if prime else .2), b.inputs['Roughness'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .5; bp.inputs['Distance'].default_value = .003
    L.new(_math(N, L, 'ADD', bd1, _math(N, L, 'MULTIPLY', bm2, .3)), bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal']); return m

def soil_mat():
    m = bpy.data.materials.new('soil'); nt, N, L, b = _nodes(m); tc = N.new('ShaderNodeTexCoord')
    n = N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 26; n.inputs['Detail'].default_value = 9; L.new(tc.outputs['Object'], n.inputs['Vector'])
    base = _ramp(N, L, n.outputs['Fac'], [(.25, (.055, .026, .016)), (.55, (.115, .052, .030)), (.8, (.20, .10, .055))])
    pm, pc, pd = _stones(N, L, tc, 120, .22, .46, .12, (2.2, 7.1, 1.4), [(0, (.20, .16, .12)), (1, (.46, .40, .32))])
    col = _mix(N, L, _math(N, L, 'MULTIPLY', pm, .8), base, pc)
    L.new(col, b.inputs['Base Color']); b.inputs['Roughness'].default_value = .94
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .7; bp.inputs['Distance'].default_value = .003
    n2 = N.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 140; n2.inputs['Detail'].default_value = 8; L.new(tc.outputs['Object'], n2.inputs['Vector'])
    L.new(_math(N, L, 'ADD', n2.outputs['Fac'], pm), bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal']); return m

def water_mat():
    m = bpy.data.materials.new('water'); nt, N, L, b = _nodes(m)
    b.inputs['Base Color'].default_value = (.42, .70, .98, 1); b.inputs['Roughness'].default_value = .02
    b.inputs['Transmission Weight'].default_value = .93; b.inputs['IOR'].default_value = 1.33; return m

# ------------------------------------------------------------------ layered block
def build_layer(name, m, zbot, ztop, top=None, front=None, skip_top=None, skip_front=None, side=True, xmin=None):
    """watertight-enough block: top height-field grid + front wall grid + side walls.  top(x,y)->(ck,g), front(x,z)->(groove depth m, ck, g).
    xmin: the layer starts at this x instead of the left edge (its end face is built and faces the camera when xmin > 0)"""
    x0 = -SX / 2 if xmin is None else xmin
    xs = [x0 + (SX / 2 - x0) * i / NX for i in range(NX + 1)]; ys = [SD * j / NY for j in range(NY + 1)]
    bm = bmesh.new(); lck = bm.verts.layers.float.new('ck'); lg = bm.verts.layers.float.new('g')
    T = []
    for j, y in enumerate(ys):
        row = []
        for i, x in enumerate(xs):
            v = bm.verts.new((x, y, ztop(x, y)))
            if top: v[lck], v[lg] = top(x, y)[:2]
            row.append(v)
        T.append(row)
    for j in range(NY):
        for i in range(NX):
            if skip_top and skip_top((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2): continue
            bm.faces.new((T[j][i], T[j][i + 1], T[j + 1][i + 1], T[j + 1][i]))
    Wl = []
    for k in range(NZ + 1):
        row = []
        for i, x in enumerate(xs):
            if k == NZ: row.append(T[0][i]); continue
            z0, z1 = zbot(x, 0.), ztop(x, 0.); z = z0 + (z1 - z0) * k / NZ
            gd, ck_, g_ = front(x, z) if front else (0., 0., 0.)
            v = bm.verts.new((x, gd, z)); v[lck] = ck_; v[lg] = g_; row.append(v)
        Wl.append(row)
    for k in range(NZ):
        for i in range(NX):
            if skip_front and skip_front((xs[i] + xs[i + 1]) / 2): continue
            bm.faces.new((Wl[k][i], Wl[k][i + 1], Wl[k + 1][i + 1], Wl[k + 1][i]))
    if side:
        for xi, flip in ((0, True), (NX, False)):
            col = []
            for k in range(NZ + 1):
                col.append([bm.verts.new((xs[xi], y, zbot(xs[xi], y) + (ztop(xs[xi], y) - zbot(xs[xi], y)) * k / NZ)) for y in ys[::3]] if k < NZ else [T[j][xi] for j in range(0, NY + 1, 3)])
            for k in range(NZ):
                for j in range(len(col[0]) - 1):
                    q = (col[k][j], col[k][j + 1], col[k + 1][j + 1], col[k + 1][j]); bm.faces.new(q[::-1] if flip else q)
    return from_bm(name, bm, m, True)

# ------------------------------------------------------------------ defect specs
def spec_base():
    return dict(zb=lambda x, y: ZB, ha=lambda x, y: ZA + .0007 * nz(x, y, 30), top=None, front=None, skip_top=None, skip_front=None, variant='std', base_g=None, extra=None, anchors=lambda: {})

def S_rut():
    s = spec_base(); xr = (-.23, .23)
    s['zb'] = lambda x, y: ZB - .008 * sum(gs(x, c, .15) for c in xr)
    def ha(x, y):
        z = ZA + .0008 * nz(x, y, 30)
        for c in xr: z -= .03 * gs(x, c, .115); z += .006 * gs(abs(x - c), .19, .045)
        return z + .008 * gs(x, 0, .12)
    s['ha'] = ha
    def anchors():
        a = {'edge%02d' % i: (-.5 + i / 59, 0., ha(-.5 + i / 59, 0.) + .001) for i in range(60)}
        for n, c in (('r1', xr[0]), ('r2', xr[1])): a[n + 's'] = (c, .12, ZA + .115); a[n + 'e'] = (c, .12, ha(c, .12) + .006)
        return a
    s['anchors'] = anchors; return s

def _crack_front(xc, zt, zend, w0, depth):
    def f(x, z):
        if z > zt or z < zend: return (0., 0., 0.)
        t = (z - zend) / (zt - zend); w = w0 * (t ** .55) + .0007
        dx = abs(x - xc(z))
        if dx >= w: return (0., 0., 0.)
        k = 1 - dx / w; return (depth * k ** .7, min(1., k * 2.2), 0.)
    return f

def S_fat():
    s = spec_base()
    def net(x, y):
        wx = .35 * nz(x, y, 5, 1.3); wy = .35 * nz(x, y, 5, 7.9); d = noise.voronoi(Vector((x * 9 + wx, y * 9 + wy, .5)))[0]
        e = d[1] - d[0]; w = .035 + .085 * sm(-.25, .6, nz(x, y, 9, 4.4)) * (.55 + .45 * gs(x, 0, .5))
        return 1 - sm(0, w, e)
    s['top'] = lambda x, y: (min(1., net(x, y) * 1.6), 0.)
    base_ha = s['ha']; s['ha'] = lambda x, y: base_ha(x, y) - .0048 * net(x, y)
    cracks = [(-.40, .85, 5), (-.13, 1.0, 9), (.14, .72, 13), (.41, .95, 17)]
    fl = []
    for x0, frac, sd in cracks:
        xc = (lambda x0, sd: (lambda z: x0 + .022 * nz(z, 0, 17, sd) + .008 * nz(z, 0, 41, sd + 1)))(x0, sd)
        fl.append((xc, _crack_front(xc, ZB + frac * (ZA - ZB), ZB - .004, .0062, .0065)))
    def front(x, z):
        for xc, f in fl:
            r = f(x, z)
            if r[1] > 0: return r
        return (0., 0., 0.)
    s['front'] = front
    def anchors():
        a = {}
        for n, (xc, _) in enumerate(fl):
            for i in range(14):
                z = ZB + .01 + (ZA - ZB) * .8 * i / 13 * (cracks[n][1]); a['c%d_%02d' % (n, i)] = (xc(z), 0., z)
        return a
    s['anchors'] = anchors; return s

def S_the():
    s = spec_base(); x0 = .02
    xc = lambda u: x0 + .016 * nz(u, 0, 15, 3) + .010 * nz(u, 0, 38, 6)
    depth_z = ZB + .30 * (ZA - ZB)
    def wtop(y): return .0058 - .0020 * (y / SD)
    def top(x, y): dx = abs(x - xc(y)); w = wtop(y); return (min(1., (1 - dx / w) * 2.2) if dx < w else 0., 0.)
    s['top'] = top
    base_ha = s['ha']
    def ha(x, y):
        dx = abs(x - xc(y)); w = wtop(y); return base_ha(x, y) - (.012 * (1 - dx / w) ** .7 if dx < w else 0.)
    s['ha'] = ha
    ff = _crack_front(lambda z: xc(-(ZA - z)), ZA, depth_z, .0058, .010)
    s['front'] = lambda x, z: ff(x, z)
    def anchors():
        a = {'k%02d' % i: (xc(-(ZA - z)), 0., z) for i, z in enumerate([ZA - .002 - (ZA - depth_z) * i / 11 for i in range(12)])}
        a.update({'al_s': (x0 - .045, .0, ZA + .075), 'al_e': (x0 - .27, .0, ZA + .075), 'ar_s': (x0 + .045, .0, ZA + .075), 'ar_e': (x0 + .27, .0, ZA + .075)})
        return a
    s['anchors'] = anchors; return s

def S_rav():
    s = spec_base(); rr = random.Random(9); pits = []
    for i in range(190):
        near = i < 70
        pits.append((rr.uniform(-.5, .5), rr.uniform(0, .02) if near else rr.uniform(.02, SD), rr.uniform(.0055, .0135), rr.uniform(.005, .0105)))
    def pit(x, y):
        v = 0.
        for px, py, pr, pd in pits:
            if abs(x - px) < pr * 1.2 and abs(y - py) < pr * 1.2:
                d = math.hypot(x - px, y - py) / pr
                if d < 1: v = max(v, (1 - d * d) ** .8 * pd / .0095)
        return v
    s['pit'] = pit
    s['ha'] = lambda x, y: ZA + .0026 * nz(x, y, 55, 2) + .0012 * nz(x, y, 22) - .0105 * pit(x, y)
    s['top'] = lambda x, y: (0., min(1., pit(x, y) * 1.7))
    s['front'] = None
    s['variant'] = 'rav'
    def extra():
        stM = stone_mat('loose', .05, .30, .55, (1, 1, 1.02), 90, .5); rocks = [make_rock('lr%d' % i, 70 + i) for i in range(6)]
        for i in range(30):
            x = rr.uniform(-.46, .46); y = rr.uniform(.0, SD - .02); r = rr.uniform(.0085, .0165); air = i < 18
            z = s['ha'](x, y) + r * .5 + (rr.uniform(.012, .075) if air else 0.)
            o = bpy.data.objects.new('ls%d' % i, rr.choice(rocks)); link(o); o.data.materials.clear(); o.data.materials.append(stM)
            o.location = (x, y, z); o.rotation_euler = (rr.uniform(0, 6.3), rr.uniform(0, 6.3), rr.uniform(0, 6.3)); o.scale = (r, r * rr.uniform(.8, 1.1), r * rr.uniform(.7, 1.0))
    s['extra'] = extra
    s['anchors'] = lambda: {'edge%02d' % i: (-.5 + i / 79, 0., s['ha'](-.5 + i / 79, 0.) + .0015) for i in range(80)}
    return s

def S_ble():
    s = spec_base(); s['variant'] = 'ble'
    s['ha'] = lambda x, y: ZA + .0011 * nz(x, y, 6, 3) + .0005 * nz(x, y, 14)
    s['top'] = lambda x, y: (0., 1.)
    s['front'] = lambda x, z: (0., 0., sm(ZA - .014, ZA - .006, z))
    return s

def S_str():
    s = spec_base(); s['variant'] = 'str'
    xs_ = (-.36, -.12, .13, .37); zc = ZB + .046; rx, rz = .060, .034
    def front(x, z):
        v = 0.
        for c in xs_: v = max(v, 1 - sm(.55, 1.05, math.hypot((x - c) / rx, (z - zc) / rz) + .12 * nz(x, z, 40)))
        return (0., 0., v)
    s['front'] = front
    def extra():
        wm = water_mat()
        for c in xs_: sphere('wl', 1., (c, .0012, ZB + .0045), wm, scale=(rx * .85, .0065, .0125), seg=48)
    s['extra'] = extra
    s['anchors'] = lambda: {'e%d' % i: (c, 0., zc) for i, c in enumerate(xs_)} | {'ex': (xs_[0] + rx * 1.35, 0., zc), 'ez': (xs_[0], 0., zc + rz * 1.35)}
    return s

def S_seg():
    s = spec_base(); s['variant'] = 'seg'
    gx = lambda x, y: sm(-.035, .035, x + .02 * nz(y, 0, 9, 2) + .012 * nz(y, 0, 31, 5))
    s['ha'] = lambda x, y: ZA + (1 - gx(x, y)) * (.0042 * nz(x, y, 36, 1) + .0022 * nz(x, y, 90)) + gx(x, y) * .0006 * nz(x, y, 60)
    s['top'] = lambda x, y: (0., gx(x, y))
    s['front'] = lambda x, z: (0., 0., gx(x, 0.))
    s['anchors'] = lambda: {'d0': (0., 0., ZA + .058), 'd1': (0., 0., ZB + .004), 'l': (-.30, 0., ZA + .075), 'r': (.30, 0., ZA + .075)}
    return s

def S_pot():
    s = spec_base(); cx, cy, rx, ry, dep = .02, .0, .27, .21, .052
    def d_(x, y): return math.hypot((x - cx) / rx, (y - cy) / ry) * (1 + .09 * nz(x, y, 11, 2) + .04 * nz(x, y, 29, 7))
    def floor(x, y):
        d = d_(x, y)
        return ZB - dep * (1 - d * d) ** .7 + .003 * nz(x, y, 45, 3) if d < 1 else ZB
    s['zb'] = floor
    base_ha = s['ha']
    def ha(x, y):
        d = d_(x, y); f = floor(x, y)
        if d < 1: return f + .0003
        return f + (base_ha(x, y) - f) * sm(1., 1.1, d) - (.004 * nz(x, y, 60) if d < 1.25 else 0.)
    s['ha'] = ha
    s['skip_top'] = lambda x, y: d_(x, y) < .995
    s['skip_front'] = lambda x: d_(x, 0.) < .995
    s['base_g'] = lambda x, y: (0., sm(1.12, .9, d_(x, y)))
    zw = ZB - .016
    def extra():
        wm = water_mat(); bm = bmesh.new(); xs = [-SX / 2 + SX * i / 250 for i in range(251)]; ys = [SD * j / 75 for j in range(76)]
        V = {}
        for j, y in enumerate(ys):
            for i, x in enumerate(xs):
                if floor(x, y) < zw: V[i, j] = bm.verts.new((x, y, zw))
        for j in range(75):
            for i in range(250):
                q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                if all(k in V for k in q): bm.faces.new([V[k] for k in q])
        for i in range(250):
            if (i, 0) in V and (i + 1, 0) in V:
                a = bm.verts.new((xs[i], 0., floor(xs[i], 0.))); b = bm.verts.new((xs[i + 1], 0., floor(xs[i + 1], 0.)))
                bm.faces.new((a, b, V[i + 1, 0], V[i, 0]))
        from_bm('water', bm, wm, True)
    s['extra'] = extra
    s['anchors'] = lambda: {'as': (cx, .09, ZA + .125), 'ae': (cx, .09, zw + .01)}
    return s

SPECS = dict(rut=S_rut, fat=S_fat, the=S_the, rav=S_rav, ble=S_ble, str=S_str, seg=S_seg, pot=S_pot)

# ------------------------------------------------------------------ stage: camera + lights
def stage(tgt, el_deg, dist, kw=.4, lens=68):
    sc = bpy.context.scene; el = math.radians(el_deg)
    co = camera((tgt[0], tgt[1] - dist * math.cos(el), tgt[2] + dist * math.sin(el)), tgt, lens, shift=(0, .035))
    area_light('key', (-1.9, -2.0, 2.3), (0, .12, .15), 170, 2.0, (1, .97, .93))
    area_light('fill', (2.2, -2.0, 1.3), (0, .12, .15), 55, 2.6, (.93, .96, 1.))
    area_light('top', (.1, .25, 2.8), (0, .12, .15), 90, 2.6)
    area_light('back', (0., 2.6, 1.7), (0, .12, .15), 70 * kw, 2.8, (1, 1, 1))
    return co
def finish(key, co, pts):
    an = project(co, pts); json.dump(an, open(os.path.join(OUT, 'def-%s-anchors.json' % key), 'w'))
    if not os.environ.get('NORENDER'): render(os.path.join(OUT, 'def-%s.png' % key)); print('[cutaways] rendered', key)

# ------------------------------------------------------------------ defects
def render_defect(key):
    setup_scene(W, H, 220); world_studio(.32, (1, .99, .97), (.55, .55, .57))
    sp = SPECS[key](); shadow_floor(14)
    asph = asphalt_mat(sp['variant']); bas = base_mat(); soil = soil_mat()
    build_layer('soil', soil, lambda x, y: 0., lambda x, y: ZS + .0012 * nz(x, y, 22, 5))
    gb = sp['base_g']
    build_layer('base', bas, lambda x, y: ZS, sp['zb'], top=gb if gb else (lambda x, y: (0., 0.)))
    build_layer('asph', asph, sp['zb'], sp['ha'], top=sp['top'], front=sp['front'], skip_top=sp['skip_top'], skip_front=sp['skip_front'])
    if sp['extra']: sp['extra']()
    co = stage((0., SD * .45, .165), 25, 2.35, 1.0 if key in ('ble', 'pot') else .4)
    finish(key, co, sp['anchors']())

# ------------------------------------------------------------------ layers: prime coat, tack coat, cut faces of the mat
def render_prime():
    """prepared granular base over subgrade; a thin black bituminous film soaked into the top of the granular surface (no Hot Mix layer)"""
    setup_scene(W, H, 220); world_studio(.32, (1, .99, .97), (.55, .55, .57)); shadow_floor(14)
    ZS_, ZT = .09, .25; soil = soil_mat(); bas = base_mat(prime=True)
    build_layer('soil', soil, lambda x, y: 0., lambda x, y: ZS_ + .0012 * nz(x, y, 22, 5))
    build_layer('base', bas, lambda x, y: ZS_, lambda x, y: ZT + .0016 * nz(x, y, 40, 2) + .0008 * nz(x, y, 110),
                top=lambda x, y: (0., .94), front=lambda x, z: (0., 0., sm(ZT - .04, ZT - .012, z)))
    co = stage((0., SD * .45, .14), 25, 2.35)
    pts = {'pb': (-.475, 0., (ZS_ + ZT) / 2 - .01), 'ps': (-.475, 0., ZS_ / 2)}
    for i in range(5): x = -.34 + .17 * i; pts['a%ds' % i] = (x, .15, ZT + .13); pts['a%de' % i] = (x, .15, ZT + .012)
    finish('prime', co, pts)

def render_tack():
    """base course, an existing (aged, clean) bituminous layer with the thin glossy tack film on it, and the new layer being laid over it from the right"""
    setup_scene(W, H, 220); world_studio(.32, (1, .99, .97), (.55, .55, .57)); shadow_floor(14)
    Z1, Z2, Z3 = .08, .16, .24; XN = .10; bas = base_mat(); old = asphalt_mat('ble'); new = asphalt_mat('std')
    build_layer('base', bas, lambda x, y: 0., lambda x, y: Z1)
    build_layer('old', old, lambda x, y: Z1, lambda x, y: Z2, top=lambda x, y: (0., 1.), front=lambda x, z: (0., 0., sm(Z2 - .007, Z2 - .0015, z)))
    build_layer('new', new, lambda x, y: Z2, lambda x, y: Z3 + .0008 * nz(x, y, 30), xmin=XN)
    co = stage((0., SD * .45, .125), 25, 2.2, .6)
    pts = {'pb': (-.475, 0., Z1 / 2), 'po': (-.475, 0., (Z1 + Z2) / 2), 'pn': (XN + .02, 0., (Z2 + Z3) / 2)}
    for i in range(40): x = -.5 + i / 39; pts['t%02d' % i] = (x, 0., Z2)
    finish('tack', co, pts)

def render_cf(i):
    """a close block of the mat: after the paver (loose, bulked) / intermediate rolling / finish rolling (dense, thinner)"""
    global SX, SD
    SX, SD = .5, .25
    try:
        setup_scene(W, H, 220); world_studio(.32, (1, .99, .97), (.55, .55, .57)); shadow_floor(14)
        t = (.118, .107, .097)[i]; Zb = .045; bas = base_mat(); asph = asphalt_mat('cf%d' % i); amp = (.0042, .0022, .0008)[i]
        build_layer('base', bas, lambda x, y: 0., lambda x, y: Zb)
        build_layer('asph', asph, lambda x, y: Zb, lambda x, y: Zb + t + amp * nz(x, y, 60, 3) + amp * .5 * nz(x, y, 130))
        co = stage((0., SD * .42, .052), 17, 1.40)
        finish('cf%d' % i, co, {'top': (0., 0., Zb + t)})
    finally:
        SX, SD = 1.0, .30

for k in ONLY:
    if k in SPECS: render_defect(k)
    elif k == 'prime': render_prime()
    elif k == 'tack': render_tack()
    elif k in ('cf0', 'cf1', 'cf2'): render_cf(int(k[2]))
